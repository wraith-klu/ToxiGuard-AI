"""
ToxiGuard AI — Adaptive Threshold Calibration Service
=======================================================
Adjusts the toxicity decision threshold in real-time based on user feedback.
No full model retrain required — works by tuning the confidence cutoff.

Algorithm:
  - Maintain a sliding window of recent feedback (FP vs FN counts)
  - False Positive (FP): model too aggressive → raise threshold slightly
  - False Negative (FN): model too lenient  → lower threshold slightly
  - Step size = CALIBRATION_STEP (default 0.01) per correction
  - Threshold is clamped to [MIN_THRESHOLD, MAX_THRESHOLD]
  - Persisted to calibration.json so it survives server restarts

This is called "online threshold calibration" — used in production at
scale where full retrains are expensive (Meta, Google CSAM detection, etc.)

Usage:
    from app.services.calibration import calibration_service
    calibration_service.apply_feedback("false_positive", confidence=0.72)
    threshold = calibration_service.get_threshold()
"""

from __future__ import annotations

import os
import json
import threading
from datetime import datetime
from typing import Optional

from app.core.logger import logger


# ──────────────────────────────────────────────────────────────────────────────
# CONFIG
# ──────────────────────────────────────────────────────────────────────────────

DEFAULT_THRESHOLD = 0.50
MIN_THRESHOLD     = 0.30   # Never go below this — too many FN
MAX_THRESHOLD     = 0.75   # Never go above this — too many FP
CALIBRATION_STEP  = 0.01   # Threshold shift per single correction

# Path to persist threshold across restarts
_CALIBRATION_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "data", "calibration.json"
)


# ──────────────────────────────────────────────────────────────────────────────
# SERVICE
# ──────────────────────────────────────────────────────────────────────────────

class AdaptiveCalibrationService:
    """
    Online threshold calibration from user feedback.
    Thread-safe for concurrent FastAPI requests.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._threshold: float = DEFAULT_THRESHOLD
        self._fp_count: int = 0        # Lifetime FP corrections
        self._fn_count: int = 0        # Lifetime FN corrections
        self._total_adjustments: int = 0
        self._history: list[dict] = [] # Last 20 adjustments
        self._last_updated: Optional[str] = None
        self._load()

    # ── PERSISTENCE ───────────────────────────────────────────────────────────

    def _load(self) -> None:
        """Load calibration state from disk (survives restarts)."""
        try:
            if os.path.exists(_CALIBRATION_FILE):
                with open(_CALIBRATION_FILE, "r") as f:
                    data = json.load(f)
                self._threshold = float(data.get("threshold", DEFAULT_THRESHOLD))
                self._fp_count = int(data.get("fp_count", 0))
                self._fn_count = int(data.get("fn_count", 0))
                self._total_adjustments = int(data.get("total_adjustments", 0))
                self._history = data.get("history", [])[-20:]
                logger.info(
                    f"[Calibration] Loaded threshold={self._threshold:.3f} "
                    f"(FP={self._fp_count}, FN={self._fn_count})"
                )
        except Exception as exc:
            logger.warning(f"[Calibration] Could not load calibration file: {exc}")

    def _save(self) -> None:
        """Persist calibration state to disk."""
        try:
            os.makedirs(os.path.dirname(_CALIBRATION_FILE), exist_ok=True)
            with open(_CALIBRATION_FILE, "w") as f:
                json.dump({
                    "threshold": self._threshold,
                    "fp_count": self._fp_count,
                    "fn_count": self._fn_count,
                    "total_adjustments": self._total_adjustments,
                    "history": self._history[-20:],
                    "last_updated": self._last_updated,
                }, f, indent=2)
        except Exception as exc:
            logger.warning(f"[Calibration] Could not save calibration: {exc}")

    # ── CORE ──────────────────────────────────────────────────────────────────

    def apply_feedback(
        self,
        feedback_type: str,
        confidence_at_time: Optional[float] = None,
    ) -> dict:
        """
        Adjust threshold based on one feedback event.

        Args:
            feedback_type: "false_positive" | "false_negative" | "confirmed_correct"
            confidence_at_time: The model's confidence when this prediction was made.

        Returns:
            {"old_threshold": float, "new_threshold": float, "direction": str}
        """
        with self._lock:
            old = self._threshold

            if feedback_type == "false_positive":
                # Model was too aggressive: raise threshold (harder to trigger toxic)
                self._threshold = min(
                    MAX_THRESHOLD,
                    self._threshold + CALIBRATION_STEP
                )
                self._fp_count += 1
                direction = "raised"

            elif feedback_type == "false_negative":
                # Model was too lenient: lower threshold (easier to trigger toxic)
                self._threshold = max(
                    MIN_THRESHOLD,
                    self._threshold - CALIBRATION_STEP
                )
                self._fn_count += 1
                direction = "lowered"

            else:
                # Confirmed correct — no threshold change
                direction = "unchanged"

            self._total_adjustments += 1
            self._last_updated = datetime.utcnow().isoformat()

            event = {
                "ts": self._last_updated,
                "type": feedback_type,
                "old": round(old, 3),
                "new": round(self._threshold, 3),
                "confidence_at_time": confidence_at_time,
            }
            self._history.append(event)
            self._history = self._history[-20:]

            self._save()

            logger.info(
                f"[Calibration] {feedback_type} → threshold {old:.3f} → "
                f"{self._threshold:.3f} ({direction})"
            )

            return {
                "old_threshold": round(old, 3),
                "new_threshold": round(self._threshold, 3),
                "direction": direction,
                "fp_count": self._fp_count,
                "fn_count": self._fn_count,
            }

    def get_threshold(self) -> float:
        """Get the current calibrated threshold."""
        with self._lock:
            return self._threshold

    def get_status(self) -> dict:
        """Return full calibration status for the monitoring dashboard."""
        with self._lock:
            return {
                "current_threshold": round(self._threshold, 4),
                "default_threshold": DEFAULT_THRESHOLD,
                "shift_from_default": round(self._threshold - DEFAULT_THRESHOLD, 4),
                "fp_corrections": self._fp_count,
                "fn_corrections": self._fn_count,
                "total_adjustments": self._total_adjustments,
                "last_updated": self._last_updated,
                "history": self._history[-10:],
                "bounds": {"min": MIN_THRESHOLD, "max": MAX_THRESHOLD},
                "step_size": CALIBRATION_STEP,
            }

    def reset(self) -> None:
        """Reset threshold to default (admin action)."""
        with self._lock:
            self._threshold = DEFAULT_THRESHOLD
            self._fp_count = 0
            self._fn_count = 0
            self._total_adjustments = 0
            self._history = []
            self._save()
            logger.info("[Calibration] Threshold reset to default")


# Module-level singleton
calibration_service = AdaptiveCalibrationService()
