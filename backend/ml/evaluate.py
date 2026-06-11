"""
ToxiGuard AI — Model Evaluation Suite
======================================
Comprehensive evaluation: F1, AUC-ROC, confusion matrices, threshold analysis.

Usage:
    python -m ml.evaluate --model_path ml/models/toxiguard-deberta
"""

import os, json, argparse
import numpy as np
import pandas as pd
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from sklearn.metrics import (
    f1_score, precision_score, recall_score, roc_auc_score,
    classification_report, confusion_matrix, average_precision_score,
)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DEFAULT_MODEL = os.path.join(os.path.dirname(__file__), "models", "toxiguard-deberta")
LABEL_COLUMNS = ["toxic","severe_toxic","obscene","threat","insult","identity_hate"]
MAX_LENGTH = 256

def predict_batch(texts, model, tokenizer, batch_size=32, device="cpu"):
    model.eval(); model.to(device); all_probs = []
    for i in range(0, len(texts), batch_size):
        enc = tokenizer(list(texts[i:i+batch_size]), truncation=True,
                       padding="max_length", max_length=MAX_LENGTH, return_tensors="pt").to(device)
        with torch.no_grad():
            all_probs.append(torch.sigmoid(model(**enc).logits).cpu().numpy())
    return np.vstack(all_probs)

def evaluate(args):
    print("=" * 60 + "\n📊 ToxiGuard AI — Model Evaluation\n" + "=" * 60)
    tokenizer = AutoTokenizer.from_pretrained(args.model_path)
    model = AutoModelForSequenceClassification.from_pretrained(args.model_path)
    device = "cuda" if torch.cuda.is_available() else "cpu"

    train_df = pd.read_csv(os.path.join(DATA_DIR, "train.csv"))
    from sklearn.model_selection import train_test_split
    _, test_df = train_test_split(train_df, test_size=0.1, random_state=42)
    texts = test_df["comment_text"].fillna("").values
    labels = test_df[LABEL_COLUMNS].values.astype(float)

    probs = predict_batch(texts, model, tokenizer, device=device)
    preds = (probs >= 0.5).astype(int)

    results = {"f1_macro": round(f1_score(labels, preds, average="macro", zero_division=0), 4),
               "auc_roc": round(roc_auc_score(labels, probs, average="macro"), 4)}

    print(classification_report(labels, preds, target_names=LABEL_COLUMNS, zero_division=0))

    for i, col in enumerate(LABEL_COLUMNS):
        cm = confusion_matrix(labels[:,i], preds[:,i])
        tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0,0,0,0)
        print(f"  {col}: TP={tp} FP={fp} FN={fn} TN={tn}")

    out = os.path.join(args.model_path, "evaluation_results.json")
    with open(out, "w") as f: json.dump(results, f, indent=2)
    print(f"\n✅ Saved to {out}")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--model_path", default=DEFAULT_MODEL)
    evaluate(p.parse_args())
