"""
ToxiGuard AI — Transformer Model Training Pipeline
===================================================
Fine-tunes DeBERTa-v3-base for multi-label toxic comment classification.

Usage:
    python -m ml.train_transformer                           # full training
    python -m ml.train_transformer --epochs 3 --batch_size 16
    python -m ml.train_transformer --sample_size 20000       # quick test run
    python -m ml.train_transformer --export_onnx             # also export to ONNX

Requirements:
    pip install transformers datasets torch accelerate scikit-learn sentencepiece

Output:
    ml/models/toxiguard-deberta/    — HuggingFace model + tokenizer
    ml/models/training_metrics.json — Evaluation metrics
"""

import os
import json
import argparse
import numpy as np
from datetime import datetime

import torch
from torch.utils.data import Dataset

from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    EarlyStoppingCallback,
)

from sklearn.metrics import (
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    classification_report,
)
from sklearn.model_selection import train_test_split

import pandas as pd

# ── CONFIGURATION ──────────────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODEL_OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "models", "toxiguard-deberta")

# Model registry — ranked by accuracy vs speed tradeoff
MODEL_REGISTRY = {
    "deberta-v3-base":  "microsoft/deberta-v3-base",   # default — best accuracy
    "deberta-v3-small": "microsoft/deberta-v3-small",  # faster, slightly lower accuracy
    "roberta-base":     "roberta-base",
    "bert-base":        "bert-base-uncased",
    "distilbert":       "distilbert-base-uncased",
}

# Jigsaw multi-label columns
LABEL_COLUMNS = [
    "toxic",
    "severe_toxic",
    "obscene",
    "threat",
    "insult",
    "identity_hate",
]

MAX_LENGTH = 256


# ── DATASET ────────────────────────────────────────────────────────────────────

class ToxicCommentDataset(Dataset):
    """PyTorch Dataset for multi-label toxic comment classification."""

    def __init__(
        self,
        texts: np.ndarray,
        labels: np.ndarray,
        tokenizer,
        max_length: int = MAX_LENGTH,
    ) -> None:
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self) -> int:
        return len(self.texts)

    def __getitem__(self, idx: int) -> dict:
        text = str(self.texts[idx])
        encoding = self.tokenizer(
            text,
            truncation=True,
            padding="max_length",
            max_length=self.max_length,
            return_tensors="pt",
        )
        item = {
            "input_ids": encoding["input_ids"].squeeze(),
            "attention_mask": encoding["attention_mask"].squeeze(),
            "labels": torch.tensor(self.labels[idx], dtype=torch.float),
        }
        # DeBERTa-v3 does not use token_type_ids — skip if present
        if "token_type_ids" in encoding:
            item["token_type_ids"] = encoding["token_type_ids"].squeeze()
        return item


# ── METRICS ────────────────────────────────────────────────────────────────────

def compute_metrics(eval_pred) -> dict:
    """Compute multi-label classification metrics during training."""
    predictions, labels = eval_pred
    probs = torch.sigmoid(torch.tensor(predictions)).numpy()
    preds = (probs >= 0.5).astype(int)

    f1_macro = f1_score(labels, preds, average="macro", zero_division=0)
    f1_micro = f1_score(labels, preds, average="micro", zero_division=0)
    precision = precision_score(labels, preds, average="macro", zero_division=0)
    recall = recall_score(labels, preds, average="macro", zero_division=0)

    try:
        auc_roc = roc_auc_score(labels, probs, average="macro")
    except ValueError:
        auc_roc = 0.0

    per_class_f1 = f1_score(labels, preds, average=None, zero_division=0)

    metrics = {
        "f1_macro": f1_macro,
        "f1_micro": f1_micro,
        "precision_macro": precision,
        "recall_macro": recall,
        "auc_roc_macro": auc_roc,
    }
    for i, col in enumerate(LABEL_COLUMNS):
        metrics[f"f1_{col}"] = float(per_class_f1[i]) if i < len(per_class_f1) else 0.0

    return metrics


# ── DATA LOADING ───────────────────────────────────────────────────────────────

def load_jigsaw_data(data_dir: str, sample_size: int | None = None):
    """Load Jigsaw Toxic Comment dataset from CSV."""
    train_path = os.path.join(data_dir, "train.csv")
    if not os.path.exists(train_path):
        raise FileNotFoundError(
            f"Training data not found at {train_path}\n"
            f"Download from: https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge"
        )

    print(f"[Data] Loading from {train_path}...")
    df = pd.read_csv(train_path)

    if sample_size and sample_size < len(df):
        print(f"[Data] Sampling {sample_size} rows (full dataset = {len(df)})")
        df = df.sample(n=sample_size, random_state=42)

    texts = df["comment_text"].fillna("").values
    labels = df[LABEL_COLUMNS].values.astype(float)

    print(f"[Data] Loaded {len(df)} samples")
    for col in LABEL_COLUMNS:
        print(f"       {col}: {df[col].sum()} ({df[col].mean()*100:.1f}%)")

    return texts, labels


# ── TRAINING PIPELINE ──────────────────────────────────────────────────────────

def train(args) -> dict:
    """Full DeBERTa fine-tuning pipeline."""
    print("=" * 60)
    print("ToxiGuard AI — DeBERTa Training Pipeline")
    print("=" * 60)

    model_name = MODEL_REGISTRY.get(args.model, args.model)
    print(f"\n[Model] Base: {model_name}")
    print(f"[Device] {'GPU (CUDA)' if torch.cuda.is_available() else 'CPU'}")

    # ── TOKENIZER & MODEL ──────────────────────────────────────────────────
    tokenizer = AutoTokenizer.from_pretrained(model_name, use_fast=True)
    model = AutoModelForSequenceClassification.from_pretrained(
        model_name,
        num_labels=len(LABEL_COLUMNS),
        problem_type="multi_label_classification",
        ignore_mismatched_sizes=True,
    )

    # ── DATA ───────────────────────────────────────────────────────────────
    texts, labels = load_jigsaw_data(DATA_DIR, sample_size=args.sample_size)

    train_texts, val_texts, train_labels, val_labels = train_test_split(
        texts, labels, test_size=0.1, random_state=42, shuffle=True
    )
    print(f"\n[Split] Train: {len(train_texts)} | Val: {len(val_texts)}")

    train_dataset = ToxicCommentDataset(train_texts, train_labels, tokenizer)
    val_dataset = ToxicCommentDataset(val_texts, val_labels, tokenizer)

    # ── TRAINING ARGS ──────────────────────────────────────────────────────
    # NOTE: `eval_strategy` replaces deprecated `evaluation_strat` (HF >= 4.41)
    training_args = TrainingArguments(
        output_dir=MODEL_OUTPUT_DIR,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size * 2,
        learning_rate=args.learning_rate,
        weight_decay=0.01,
        warmup_ratio=0.1,
        eval_strategy="epoch",          # Fixed: was `evaluation_strat` (deprecated)
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1_macro",
        greater_is_better=True,
        logging_dir=os.path.join(MODEL_OUTPUT_DIR, "logs"),
        logging_steps=50,
        save_total_limit=2,
        save_safetensors=True,
        fp16=torch.cuda.is_available(),
        dataloader_num_workers=2,
        report_to=["mlflow"] if args.mlflow else [],
        run_name=f"toxiguard-{args.model}-{datetime.now().strftime('%Y%m%d-%H%M')}",
    )

    # ── TRAINER ────────────────────────────────────────────────────────────
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        compute_metrics=compute_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=2)],
    )

    # ── TRAIN ──────────────────────────────────────────────────────────────
    print(f"\n[Train] Starting — epochs={args.epochs} | batch={args.batch_size} | lr={args.learning_rate}")
    trainer.train()

    # ── EVALUATE ───────────────────────────────────────────────────────────
    print("\n[Eval] Running final evaluation...")
    eval_results = trainer.evaluate()

    print("\n" + "=" * 60)
    print("EVALUATION RESULTS")
    print("=" * 60)
    for key, value in sorted(eval_results.items()):
        if isinstance(value, float):
            print(f"   {key}: {value:.4f}")

    # ── SAVE MODEL ─────────────────────────────────────────────────────────
    print(f"\n[Save] Saving to {MODEL_OUTPUT_DIR}...")
    trainer.save_model(MODEL_OUTPUT_DIR)
    tokenizer.save_pretrained(MODEL_OUTPUT_DIR)

    # Save training metrics JSON
    metrics_path = os.path.join(MODEL_OUTPUT_DIR, "training_metrics.json")
    metrics_data = {
        "model": model_name,
        "trained_at": datetime.now().isoformat(),
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "learning_rate": args.learning_rate,
        "train_samples": len(train_texts),
        "val_samples": len(val_texts),
        "label_columns": LABEL_COLUMNS,
        "metrics": {
            k: round(v, 4) if isinstance(v, float) else v
            for k, v in eval_results.items()
        },
    }
    with open(metrics_path, "w") as f:
        json.dump(metrics_data, f, indent=2)
    print(f"[Save] Metrics saved to {metrics_path}")

    # ── PER-CLASS REPORT ────────────────────────────────────────────────────
    print("\n[Report] Per-class Classification Report:")
    val_preds = trainer.predict(val_dataset)
    probs = torch.sigmoid(torch.tensor(val_preds.predictions)).numpy()
    preds = (probs >= 0.5).astype(int)
    print(classification_report(
        val_labels, preds,
        target_names=LABEL_COLUMNS,
        zero_division=0,
    ))

    # ── ONNX EXPORT (optional) ──────────────────────────────────────────────
    if args.export_onnx:
        print("\n[ONNX] Exporting to ONNX Runtime format...")
        try:
            from ml.export_onnx import export_onnx
            export_onnx(MODEL_OUTPUT_DIR)
        except ImportError as exc:
            print(f"[ONNX] Export skipped — missing packages: {exc}")
            print("       Run: pip install optimum[onnxruntime] onnx")

    print("\n[Done] Training complete!")
    return eval_results

# ── CLI ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="ToxiGuard AI — Fine-tune DeBERTa for toxicity classification"
    )
    parser.add_argument(
        "--model", type=str, default="deberta-v3-base",
        choices=list(MODEL_REGISTRY.keys()),
        help="Base model to fine-tune (default: deberta-v3-base)",
    )
    parser.add_argument("--epochs",        type=int,   default=3,    help="Training epochs")
    parser.add_argument("--batch_size",    type=int,   default=16,   help="Batch size per device")
    parser.add_argument("--learning_rate", type=float, default=2e-5, help="Learning rate")
    parser.add_argument("--sample_size",   type=int,   default=None, help="Dataset size limit (for testing)")
    parser.add_argument("--mlflow",        action="store_true",      help="Enable MLflow tracking")
    parser.add_argument("--export_onnx",   action="store_true",      help="Export to ONNX after training")

    train(parser.parse_args())