"""
ToxiGuard AI — XAI Attribution Engine (Perturbation-Based)
============================================================
Computes per-word importance scores using Leave-One-Out (LOO) perturbation.
Works with ONNX-only model dirs — no PyTorch weights required.

Algorithm:
  1. Get baseline confidence score for the full text
  2. For each word, mask it out (replace with [MASK]-equivalent)
  3. Re-run inference on masked text
  4. Attribution score = baseline_confidence - masked_confidence
     → Positive = word increased toxicity (important)
     → Negative = word actually reduced toxicity
  5. Normalise scores to [0, 1]

Why perturbation over attention?
  - Works with ONNX (no PyTorch needed)
  - Model-agnostic — works with any classifier
  - More faithful: attention ≠ importance (known research finding, Jain & Wallace 2019)
  - This is the method used in production ML (Google, Meta content moderation)

Usage:
    from ml.explainability import get_explainer
    explainer = get_explainer(model_dir)
    result = explainer.explain("you are an idiot")
    # {"tokens": [{"token": "you", "score": 0.02, ...}, ...], "top_tokens": [...]}
"""

from __future__ import annotations

import re
import numpy as np
from typing import Optional

from app.core.logger import logger


# ──────────────────────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────────────────────

def _sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-x))


def _tokenize_words(text: str) -> list[str]:
    """Split text into words preserving order. Handles punctuation."""
    return re.findall(r"\S+", text)


def _mask_word(words: list[str], idx: int, mask: str = "") -> str:
    """Return text with word at idx replaced by mask (or removed)."""
    masked = words[:idx] + ([mask] if mask else []) + words[idx + 1:]
    return " ".join(masked).strip() or "."   # fallback so tokenizer doesn't choke


# ──────────────────────────────────────────────────────────────────────────────
# EXPLAINER
# ──────────────────────────────────────────────────────────────────────────────

class PerturbationExplainer:
    """
    Leave-One-Out attribution using the ONNX inference session directly.
    No PyTorch weights required.
    """

    def __init__(self, model_dir: str) -> None:
        self.model_dir = model_dir
        self.session = None
        self.tokenizer = None
        self._onnx_input_names: list[str] = []
        self._loaded = False
        self._load()

    def _load(self) -> None:
        import os
        onnx_path = os.path.join(self.model_dir, "model.onnx")

        try:
            import onnxruntime as ort
            from transformers import AutoTokenizer

            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_dir, use_fast=True
            )
            self.session = ort.InferenceSession(
                onnx_path,
                providers=["CPUExecutionProvider"],
            )
            self._onnx_input_names = [
                inp.name for inp in self.session.get_inputs()
            ]
            self._loaded = True
            logger.info("[XAI] PerturbationExplainer loaded (ONNX)")
        except Exception as exc:
            logger.warning(f"[XAI] PerturbationExplainer load failed: {exc}")
            self._loaded = False

    @property
    def is_ready(self) -> bool:
        return self._loaded

    def _infer(self, text: str) -> float:
        """Run ONNX inference and return max toxicity probability."""
        encoding = self.tokenizer(
            text,
            truncation=True,
            padding="max_length",
            max_length=128,
            return_tensors="np",
        )
        inputs = {
            name: encoding[name].astype(np.int64)
            for name in self._onnx_input_names
            if name in encoding
        }
        logits: np.ndarray = self.session.run(None, inputs)[0]
        probs = _sigmoid(logits)[0]          # shape: (num_labels,)
        return float(np.max(probs))

    def explain(self, text: str, max_words: int = 30) -> Optional[dict]:
        """
        LOO attribution — score each word by how much removing it
        changes the toxicity confidence.

        Args:
            text:      Raw input text.
            max_words: Limit words to analyze (keeps latency ~1-2s for long texts).

        Returns:
            {
                "tokens": [{"token": str, "score": float, "is_special": bool}],
                "top_tokens": [{"token": str, "score": float}],
                "method": "leave_one_out_perturbation",
                "num_tokens": int,
                "baseline_confidence": float,
            }
        """
        if not self.is_ready:
            return None

        text = text.strip()
        if not text:
            return None

        try:
            words = _tokenize_words(text)

            # Cap at max_words to keep latency manageable
            if len(words) > max_words:
                words = words[:max_words]

            # Step 1: baseline confidence
            baseline = self._infer(text)

            # Step 2: LOO — remove each word, measure confidence drop
            raw_scores: list[float] = []
            for i in range(len(words)):
                masked_text = _mask_word(words, i)
                masked_conf = self._infer(masked_text)
                # Positive score = removing this word LOWERED toxicity → word is "toxic"
                raw_scores.append(baseline - masked_conf)

            from utils.abuse_words import get_word_severity

            # Step 3: Blend raw ML perturbation score with rule-based severity weights
            clamped: list[float] = []
            for i, word in enumerate(words):
                # Clean punctuation for rule lookups
                clean_word = re.sub(r"[^\w]", "", word.lower())
                severity = get_word_severity(clean_word)
                rule_boost = {"critical": 1.0, "high": 0.85, "moderate": 0.55}.get(severity, 0.0)

                raw_s = max(0.0, raw_scores[i])
                clamped.append(raw_s + rule_boost)

            max_val = max(clamped) if clamped else 0.0

            if max_val > 0:
                normalised = [round(s / max_val, 4) for s in clamped]
            else:
                normalised = [0.0] * len(clamped)

            # Build token list
            tokens = [
                {
                    "token": word,
                    "score": score,
                    "raw_delta": round(raw_scores[i], 4),
                    "is_special": False,
                }
                for i, (word, score) in enumerate(zip(words, normalised))
            ]

            # Top 5 most influential words
            top_tokens = sorted(
                [t for t in tokens if not t["is_special"]],
                key=lambda x: x["score"],
                reverse=True,
            )[:5]

            return {
                "tokens": tokens,
                "top_tokens": top_tokens,
                "method": "leave_one_out_perturbation",
                "num_tokens": len(tokens),
                "baseline_confidence": round(baseline, 4),
            }

        except Exception as exc:
            logger.error(f"[XAI] explain() failed: {exc}")
            return None


# ──────────────────────────────────────────────────────────────────────────────
# MODULE-LEVEL SINGLETON
# ──────────────────────────────────────────────────────────────────────────────

_explainer_instance: Optional[PerturbationExplainer] = None


def get_explainer(model_dir: str) -> PerturbationExplainer:
    global _explainer_instance
    if _explainer_instance is None:
        _explainer_instance = PerturbationExplainer(model_dir)
    return _explainer_instance
