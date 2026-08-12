"""
ToxiGuard AI — DeBERTa Inference Engine
=========================================
Production-grade inference using ONNX Runtime (primary) with PyTorch fallback.

ONNX Runtime achieves <50ms latency vs ~200ms with raw PyTorch.
DeBERTa-v3-base fine-tuned on Jigsaw multi-label toxic comment dataset.

Label schema (Jigsaw multi-label):
    ["toxic", "severe_toxic", "obscene", "threat", "insult", "identity_hate"]

Usage:
    from ml.inference import TransformerInference
    engine = TransformerInference("ml/models/toxiguard-deberta")
    result  = engine.predict("you are an idiot")
"""

from __future__ import annotations

import os
import numpy as np
from typing import Optional

from app.core.logger import logger

# When True, the PyTorch fallback is disabled entirely.
# Set ONNX_ONLY=true in production (Oracle A1 / Docker) to avoid loading
# the full 2 GB PyTorch package when only model.onnx is present.
_ONNX_ONLY: bool = os.getenv("ONNX_ONLY", "false").lower() in ("1", "true", "yes")

# ──────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ──────────────────────────────────────────────────────────────────────────────

LABEL_COLUMNS: list[str] = [
    "toxic",
    "severe_toxic",
    "obscene",
    "threat",
    "insult",
    "identity_hate",
]

MAX_LENGTH: int = 256

# Sigmoid: σ(x) = 1 / (1 + e^-x) — applied to raw logits
def _sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-x))


# ──────────────────────────────────────────────────────────────────────────────
# INFERENCE ENGINE
# ──────────────────────────────────────────────────────────────────────────────

class TransformerInference:
    """
    ONNX-optimised inference for DeBERTa-v3-base toxicity classifier.

    Load priority:
        1. ONNX model (model.onnx)  — fastest, ~40ms/request
        2. PyTorch model            — fallback, ~200ms/request

    DeBERTa-v3 notes:
        - Uses SentencePiece tokenizer (requires `sentencepiece` package)
        - Does NOT use token_type_ids — excluded from ONNX inputs
        - Multi-label output: sigmoid applied to logits, not softmax
    """

    def __init__(self, model_dir: str) -> None:
        self.model_dir: str = model_dir
        self.onnx_path: str = os.path.join(model_dir, "model.onnx")
        self.label_columns: list[str] = LABEL_COLUMNS

        # Declared upfront to avoid AttributeError on partial load failures
        self.session = None       # onnxruntime.InferenceSession | None
        self.tokenizer = None     # transformers.PreTrainedTokenizerBase | None
        self.pt_model = None      # transformers.AutoModelForSequenceClassification | None
        self._onnx_input_names: list[str] = []

        self._load()

    # ── LOADING ───────────────────────────────────────────────────────────────

    def _load(self) -> None:
        """Load ONNX model (or PyTorch fallback) and tokenizer."""
        self._load_tokenizer()
        self._load_model()

    def _load_tokenizer(self) -> None:
        """Load HuggingFace tokenizer (SentencePiece for DeBERTa-v3)."""
        try:
            from transformers import AutoTokenizer  # type: ignore
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_dir,
                use_fast=True,
            )
            logger.info(f"[ModelLoad] Tokenizer loaded from {self.model_dir}")
        except Exception as exc:
            logger.error(f"[ModelLoad] Tokenizer load FAILED: {exc}")
            self.tokenizer = None

    def _load_model(self) -> None:
        """Attempt ONNX load, fall back to PyTorch (unless ONNX_ONLY=true)."""
        if self._try_load_onnx():
            return
        if _ONNX_ONLY:
            logger.error(
                "[ModelLoad] ONNX load failed and ONNX_ONLY=true — "
                "PyTorch fallback is DISABLED. "
                "Ensure model.onnx exists at: %s",
                self.onnx_path,
            )
            return
        self._try_load_pytorch()

    def _try_load_onnx(self) -> bool:
        """Return True if ONNX model loaded successfully."""
        if not os.path.exists(self.onnx_path):
            logger.info("[ModelLoad] No model.onnx found — will use PyTorch")
            return False
        try:
            import onnxruntime as ort  # type: ignore
            self.session = ort.InferenceSession(
                self.onnx_path,
                providers=["CPUExecutionProvider"],
            )
            # Cache the actual input names from the ONNX graph
            self._onnx_input_names = [inp.name for inp in self.session.get_inputs()]
            logger.info(
                f"[ModelLoad] ONNX model loaded — inputs: {self._onnx_input_names}"
            )
            return True
        except Exception as exc:
            logger.warning(f"[ModelLoad] ONNX load failed ({exc}), trying PyTorch")
            self.session = None
            return False

    def _try_load_pytorch(self) -> None:
        """Load PyTorch model as fallback."""
        try:
            import torch  # type: ignore
            from transformers import AutoModelForSequenceClassification  # type: ignore

            self.pt_model = AutoModelForSequenceClassification.from_pretrained(
                self.model_dir,
                num_labels=len(LABEL_COLUMNS),
            )
            self.pt_model.eval()
            logger.info("[ModelLoad] PyTorch model loaded (ONNX fallback)")
        except Exception as exc:
            logger.error(f"[ModelLoad] PyTorch load also FAILED: {exc}")
            self.pt_model = None

    # ── READINESS ─────────────────────────────────────────────────────────────

    @property
    def is_ready(self) -> bool:
        """True if at least a tokenizer and one model backend are loaded."""
        return self.tokenizer is not None and (
            self.session is not None or self.pt_model is not None
        )

    @property
    def backend(self) -> str:
        if self.session:
            return "onnx"
        if self.pt_model:
            return "pytorch"
        return "none"

    # ── INFERENCE ─────────────────────────────────────────────────────────────

    def predict(self, text: str, threshold: float = 0.5) -> Optional[dict]:
        """
        Run toxicity classification on a single text.

        Args:
            text:      Input text (raw — tokenizer handles normalisation).
            threshold: Probability cutoff for binary label detection.

        Returns:
            {
                "toxic": bool,
                "toxicity_probability": float,   # max across all labels
                "labels": {"toxic": 0.93, ...},  # per-label sigmoid probs
                "severity": "low" | "medium" | "high",
                "detected_categories": ["toxic", "insult"],
                "source": "transformer_onnx" | "transformer_pytorch",
            }
            or None if model is not ready.
        """
        if not self.is_ready:
            logger.warning("[Inference] Model not ready — returning None")
            return None

        if not text or not text.strip():
            return None

        try:
            probs = self._run_inference(text)
        except Exception as exc:
            logger.error(f"[Inference] Runtime error: {exc}")
            return None

        return self._build_result(probs, threshold)

    def _run_inference(self, text: str) -> np.ndarray:
        """Tokenise and run model. Returns sigmoid probabilities array."""
        if self.session:
            return self._infer_onnx(text)
        return self._infer_pytorch(text)

    def _infer_onnx(self, text: str) -> np.ndarray:
        """ONNX Runtime inference path."""
        encoding = self.tokenizer(
            text,
            truncation=True,
            padding="max_length",
            max_length=MAX_LENGTH,
            return_tensors="np",
        )
        # DeBERTa-v3 doesn't use token_type_ids — only pass what ONNX graph expects
        inputs = {
            name: encoding[name].astype(np.int64)
            for name in self._onnx_input_names
            if name in encoding
        }
        logits: np.ndarray = self.session.run(None, inputs)[0]
        return _sigmoid(logits)[0]  # shape: (num_labels,)

    def _infer_pytorch(self, text: str) -> np.ndarray:
        """PyTorch fallback inference path."""
        import torch  # type: ignore

        inputs = self.tokenizer(
            text,
            truncation=True,
            padding="max_length",
            max_length=MAX_LENGTH,
            return_tensors="pt",
        )
        # DeBERTa-v3 doesn't use token_type_ids — remove if present
        inputs.pop("token_type_ids", None)

        with torch.no_grad():
            logits = self.pt_model(**inputs).logits
        return torch.sigmoid(logits).numpy()[0]  # shape: (num_labels,)

    def _build_result(self, probs: np.ndarray, threshold: float) -> dict:
        """Convert raw sigmoid probabilities into a structured result dict."""
        label_scores = {
            col: round(float(probs[i]), 4)
            for i, col in enumerate(self.label_columns)
        }
        detected = [col for col, score in label_scores.items() if score >= threshold]

        # Use max across ALL labels as the top-level toxicity probability
        toxicity_prob = float(np.max(probs))

        if toxicity_prob >= 0.85:
            severity = "high"
        elif toxicity_prob >= 0.60:
            severity = "medium"
        else:
            severity = "low"

        source = (
            "transformer_onnx" if self.session else "transformer_pytorch"
        )

        return {
            "toxic": len(detected) > 0,
            "toxicity_probability": round(toxicity_prob, 4),
            "labels": label_scores,
            "severity": severity,
            "detected_categories": detected,
            "source": source,
        }

    # ── DEBUG ─────────────────────────────────────────────────────────────────

    def __repr__(self) -> str:
        return (
            f"TransformerInference("
            f"backend={self.backend!r}, "
            f"ready={self.is_ready}, "
            f"labels={len(self.label_columns)})"
        )
