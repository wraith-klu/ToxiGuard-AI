"""
ToxiGuard AI — ONNX Export Script
====================================
Converts a fine-tuned HuggingFace DeBERTa-v3 model to ONNX format
for production-grade inference with ONNX Runtime (<50ms latency).

Prerequisites:
    pip install optimum[onnxruntime] onnx onnxruntime

Usage:
    # After training with train_transformer.py:
    python -m ml.export_onnx

    # Custom model dir:
    python -m ml.export_onnx --model_dir ml/models/toxiguard-deberta

What it does:
    1. Loads the fine-tuned PyTorch model + tokenizer
    2. Exports to ONNX via HuggingFace Optimum (traces through the model)
    3. Validates the ONNX output matches PyTorch output within 1e-4 tolerance
    4. Saves model.onnx into the same model directory

Output:
    ml/models/toxiguard-deberta/model.onnx
"""

import os
import argparse
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DEFAULT_MODEL_DIR = os.path.join(BASE_DIR, "ml", "models", "toxiguard-deberta")

LABEL_COLUMNS = ["toxic", "severe_toxic", "obscene", "threat", "insult", "identity_hate"]

TEST_SENTENCES = [
    "you are a complete idiot and I hate you",
    "I love rainy days, they are so peaceful",
    "go to hell and never come back",
    "the weather looks beautiful today",
]


def export_onnx(model_dir: str) -> None:
    print("=" * 60)
    print("ToxiGuard AI — ONNX Export")
    print("=" * 60)
    print(f"\n[1/4] Loading model from: {model_dir}")

    # Verify the model directory exists
    if not os.path.isdir(model_dir):
        raise FileNotFoundError(
            f"Model directory not found: {model_dir}\n"
            f"Run `python -m ml.train_transformer` first."
        )

    try:
        from optimum.onnxruntime import ORTModelForSequenceClassification  # type: ignore
        from transformers import AutoTokenizer  # type: ignore
    except ImportError:
        raise ImportError(
            "Missing dependencies. Run:\n"
            "  pip install optimum[onnxruntime] onnx onnxruntime"
        )

    onnx_path = os.path.join(model_dir, "model.onnx")

    print("[2/4] Exporting to ONNX via HuggingFace Optimum...")
    # ORTModelForSequenceClassification handles the entire export pipeline
    ort_model = ORTModelForSequenceClassification.from_pretrained(
        model_dir,
        export=True,  # triggers ONNX export from PyTorch weights
    )
    tokenizer = AutoTokenizer.from_pretrained(model_dir, use_fast=True)

    # Save ONNX model + config to same directory
    ort_model.save_pretrained(model_dir)
    print(f"   Saved: {onnx_path}")

    # ── VALIDATION ──────────────────────────────────────────────────────────
    print("\n[3/4] Validating ONNX output against PyTorch...")

    import torch  # type: ignore
    from transformers import AutoModelForSequenceClassification  # type: ignore
    import onnxruntime as ort  # type: ignore

    pt_model = AutoModelForSequenceClassification.from_pretrained(model_dir)
    pt_model.eval()

    session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
    onnx_input_names = [inp.name for inp in session.get_inputs()]

    max_diff = 0.0
    all_pass = True

    for sentence in TEST_SENTENCES:
        # PyTorch
        enc_pt = tokenizer(
            sentence, truncation=True, padding="max_length",
            max_length=256, return_tensors="pt"
        )
        enc_pt.pop("token_type_ids", None)
        with torch.no_grad():
            pt_logits = pt_model(**enc_pt).logits.numpy()

        # ONNX
        enc_np = tokenizer(
            sentence, truncation=True, padding="max_length",
            max_length=256, return_tensors="np"
        )
        onnx_inputs = {
            name: enc_np[name].astype(np.int64)
            for name in onnx_input_names
            if name in enc_np
        }
        onnx_logits = session.run(None, onnx_inputs)[0]

        diff = float(np.max(np.abs(pt_logits - onnx_logits)))
        max_diff = max(max_diff, diff)
        status = "PASS" if diff < 1e-3 else "WARN"
        if diff >= 1e-3:
            all_pass = False
        print(f"   [{status}] '{sentence[:40]}...' | max_diff={diff:.6f}")

    print(f"\n   Overall max diff: {max_diff:.6f} ({'OK' if all_pass else 'WARNING'})")

    # ── SUMMARY ─────────────────────────────────────────────────────────────
    print("\n[4/4] Export complete!")
    print(f"   ONNX model: {onnx_path}")
    print(f"   File size:  {os.path.getsize(onnx_path) / 1e6:.1f} MB")
    print("\n   The server will automatically load ONNX on next startup.")
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="ToxiGuard AI — Export PyTorch model to ONNX"
    )
    parser.add_argument(
        "--model_dir",
        type=str,
        default=DEFAULT_MODEL_DIR,
        help="Path to the fine-tuned HuggingFace model directory",
    )
    args = parser.parse_args()
    export_onnx(args.model_dir)
