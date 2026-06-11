# backend/app/services/model_service.py

"""
ToxiGuard AI — Unified Model Service
======================================
Singleton that loads the best available model at startup:

  Priority 1: ONNX Runtime          — ml/models/toxiguard-deberta/model.onnx
  Priority 2: PyTorch transformer   — ml/models/toxiguard-deberta/ (safetensors)
  Priority 3: Legacy TF-IDF + LogReg — abuse_model.joblib (last resort)

Expose `model_service` as the single prediction interface across all routes.
"""

import os
import joblib
from typing import Optional

from app.core.logger import logger
from app.core.config import settings


class ModelService:
    """
    Unified prediction service with automatic model selection.

    Attributes:
        model_type: One of 'transformer_onnx', 'transformer_pytorch',
                    'joblib_legacy', or 'none'.
    """

    _MODEL_LABELS = {
        "transformer_onnx":    "DeBERTa-v3 via ONNX Runtime (production)",
        "transformer_pytorch": "DeBERTa-v3 via PyTorch (fallback)",
        "joblib_legacy":       "TF-IDF + Logistic Regression (legacy)",
        "none":                "No model loaded",
    }

    def __init__(self) -> None:
        self.model_type: str = "none"
        self.transformer = None          # TransformerInference | None
        self.legacy_model = None         # sklearn Pipeline | None
        self.legacy_encoder = None       # LabelEncoder | None

        self._load()

    # ── LOADING ───────────────────────────────────────────────────────────────

    def _load(self) -> None:
        """Load the best available model at startup."""
        transformer_dir = settings.model_dir

        if os.path.isdir(transformer_dir):
            self._try_load_transformer(transformer_dir)

        if self.transformer is None:
            self._try_load_legacy()

        logger.info(
            f"[ModelService] Active model: {self._MODEL_LABELS.get(self.model_type)}"
        )

    def _try_load_transformer(self, model_dir: str) -> None:
        try:
            from ml.inference import TransformerInference
            engine = TransformerInference(model_dir)
            if engine.is_ready:
                self.transformer = engine
                self.model_type = (
                    "transformer_onnx"
                    if engine.backend == "onnx"
                    else "transformer_pytorch"
                )
                logger.info(
                    f"[ModelService] Transformer loaded | backend={engine.backend}"
                )
            else:
                logger.warning(
                    "[ModelService] Transformer directory found but model not ready"
                )
        except Exception as exc:
            logger.warning(f"[ModelService] Transformer load failed: {exc}")

    def _try_load_legacy(self) -> None:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        model_path = os.path.join(base_dir, "abuse_model.joblib")
        encoder_path = os.path.join(base_dir, "label_encoder.joblib")

        try:
            self.legacy_model = joblib.load(model_path)
            self.legacy_encoder = joblib.load(encoder_path)
            self.model_type = "joblib_legacy"
            logger.info("[ModelService] Legacy joblib model loaded")
        except Exception as exc:
            logger.error(f"[ModelService] No model available — {exc}")

    # ── PREDICTION ────────────────────────────────────────────────────────────

    def predict(self, text: str) -> Optional[dict]:
        """
        Unified prediction interface.

        Args:
            text: Model-preprocessed text (unicode-safe, URLs removed).

        Returns:
            {
                "toxic": bool,
                "toxicity_probability": float,
                "labels": {...},          # transformer only
                "severity": str,
                "detected_categories": list,
                "source": str,
            }
            or None if no model is loaded.
        """
        if not text or not text.strip():
            return None

        if self.transformer:
            result = self.transformer.predict(text)
            if result is not None:
                return result
            logger.warning("[ModelService] Transformer returned None — trying legacy")

        if self.legacy_model and self.legacy_encoder:
            return self._predict_legacy(text)

        return None

    def _predict_legacy(self, text: str) -> dict:
        """TF-IDF + Logistic Regression prediction."""
        _TOXIC_LABELS = {
            "abusive", "toxic", "severe_toxic",
            "obscene", "threat", "insult", "identity_hate",
        }
        probs = self.legacy_model.predict_proba([text])[0]
        labels = list(self.legacy_encoder.classes_)

        toxic_probability = max(
            (float(probs[idx]) for idx, lbl in enumerate(labels) if lbl in _TOXIC_LABELS),
            default=0.0,
        )
        predicted_label = self.legacy_encoder.inverse_transform([probs.argmax()])[0]
        label_map = {lbl: round(float(probs[i]), 4) for i, lbl in enumerate(labels)}

        detected = [lbl for lbl in labels if lbl in _TOXIC_LABELS and label_map[lbl] >= 0.4]

        return {
            "toxic": predicted_label in _TOXIC_LABELS or toxic_probability >= 0.4,
            "toxicity_probability": round(toxic_probability, 4),
            "label": predicted_label,
            "labels": label_map,
            "severity": (
                "high" if toxic_probability >= 0.85
                else "medium" if toxic_probability >= 0.60
                else "low"
            ),
            "detected_categories": detected,
            "source": "legacy_ml",
        }

    # ── STATUS ────────────────────────────────────────────────────────────────

    @property
    def status(self) -> dict:
        """Return model status for the /health endpoint."""
        info = {
            "model_type": self.model_type,
            "description": self._MODEL_LABELS.get(self.model_type, "Unknown"),
            "ready": self.model_type != "none",
        }
        if self.transformer:
            info["backend"] = self.transformer.backend
        return info


# Module-level singleton — loaded once at startup
model_service = ModelService()
