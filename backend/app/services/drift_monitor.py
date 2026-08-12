"""
ToxiGuard AI — Data Drift Detection & Model Monitoring Service
===============================================================
Tracks prediction confidence distributions over time.
Detects when the model's behavior shifts (new slang, distribution change).

Algorithm:
  - Maintain rolling window of last N confidence scores from PredictionLog DB
  - Compute mean, stddev, and toxic rate
  - Compare current window to a baseline (first 100 predictions or configured)
  - Alert if mean confidence drifts > DRIFT_THRESHOLD standard deviations
  - KL-divergence computed via histogram binning (no scipy needed)

Usage:
    from app.services.drift_monitor import DriftMonitor
    monitor = DriftMonitor()
    monitor.log_prediction(db, confidence=0.87, toxic=True, ...)
    stats = monitor.get_stats(db)
"""

from __future__ import annotations

import hashlib
import math
from datetime import datetime, timedelta
from typing import Optional
from collections import deque

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.logger import logger
from models import PredictionLog

# ──────────────────────────────────────────────────────────────────────────────
# CONFIG
# ──────────────────────────────────────────────────────────────────────────────

WINDOW_SIZE = 500          # Rolling window for stats
DRIFT_THRESHOLD = 0.15     # Alert if mean confidence shifts by this much
BASELINE_MIN = 50          # Need at least this many predictions before drift detection
BINS = 10                  # Histogram bins for KL-divergence


# ──────────────────────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────────────────────

def _mean(vals: list[float]) -> float:
    return sum(vals) / len(vals) if vals else 0.0


def _stddev(vals: list[float]) -> float:
    if len(vals) < 2:
        return 0.0
    m = _mean(vals)
    variance = sum((x - m) ** 2 for x in vals) / len(vals)
    return math.sqrt(variance)


def _histogram(vals: list[float], bins: int = BINS) -> list[float]:
    """Normalised histogram (probability distribution) over [0, 1]."""
    if not vals:
        return [0.0] * bins
    counts = [0] * bins
    for v in vals:
        idx = min(int(v * bins), bins - 1)
        counts[idx] += 1
    total = sum(counts)
    return [c / total for c in counts]


def _kl_divergence(p: list[float], q: list[float], eps: float = 1e-10) -> float:
    """KL divergence D(P||Q) — measures distribution shift."""
    kl = 0.0
    for pi, qi in zip(p, q):
        pi = max(pi, eps)
        qi = max(qi, eps)
        kl += pi * math.log(pi / qi)
    return round(kl, 4)


# ──────────────────────────────────────────────────────────────────────────────
# DRIFT MONITOR
# ──────────────────────────────────────────────────────────────────────────────

class DriftMonitor:
    """
    Singleton service for monitoring model confidence drift.
    Uses DB as persistent store; in-memory cache for speed.
    """

    def __init__(self) -> None:
        self._baseline: Optional[list[float]] = None  # First BASELINE_MIN scores
        self._baseline_hist: Optional[list[float]] = None

    # ── LOGGING ───────────────────────────────────────────────────────────────

    def log_prediction(
        self,
        db: Session,
        *,
        user_id: Optional[int],
        input_text: str,
        confidence: float,
        toxic: bool,
        severity: str,
        source: str,
    ) -> None:
        """Write one prediction event to DB. Called inside every /predict handler."""
        try:
            text_hash = hashlib.sha256(input_text.encode()).hexdigest()[:16]
            log = PredictionLog(
                user_id=user_id,
                text_hash=text_hash,
                text_length=len(input_text),
                confidence=round(confidence, 4),
                toxic=toxic,
                severity=severity,
                source=source,
            )
            db.add(log)
            db.commit()
        except Exception as exc:
            logger.warning(f"[DriftMonitor] Failed to log prediction: {exc}")
            db.rollback()

    # ── STATS ─────────────────────────────────────────────────────────────────

    def get_stats(self, db: Session) -> dict:
        """
        Compute current monitoring stats from the rolling window.

        Returns:
            {
                "total_predictions": int,
                "window_size": int,
                "mean_confidence": float,
                "stddev_confidence": float,
                "toxic_rate": float,          # 0.0–1.0
                "drift_detected": bool,
                "drift_score": float,         # KL divergence from baseline
                "alert": str | None,
                "severity_breakdown": {"low": int, "medium": int, "high": int},
                "hourly_volume": list[dict],  # last 24h request counts
            }
        """
        try:
            # Total count
            total = db.query(func.count(PredictionLog.id)).scalar() or 0

            # Rolling window — last WINDOW_SIZE entries
            recent = (
                db.query(PredictionLog)
                .order_by(PredictionLog.timestamp.desc())
                .limit(WINDOW_SIZE)
                .all()
            )

            if not recent:
                return self._empty_stats()

            confidences = [r.confidence for r in recent]
            toxic_flags = [r.toxic for r in recent]

            mean_conf = round(_mean(confidences), 4)
            std_conf = round(_stddev(confidences), 4)
            toxic_rate = round(sum(toxic_flags) / len(toxic_flags), 4)

            # Severity breakdown
            sev_counts = {"low": 0, "medium": 0, "high": 0}
            for r in recent:
                sev = r.severity or "low"
                sev_counts[sev] = sev_counts.get(sev, 0) + 1

            # Drift detection
            drift_score = 0.0
            drift_detected = False
            alert = None

            if total >= BASELINE_MIN:
                # Baseline: oldest BASELINE_MIN entries
                baseline_rows = (
                    db.query(PredictionLog.confidence)
                    .order_by(PredictionLog.timestamp.asc())
                    .limit(BASELINE_MIN)
                    .all()
                )
                baseline_vals = [r.confidence for r in baseline_rows]
                baseline_hist = _histogram(baseline_vals)
                current_hist = _histogram(confidences)
                drift_score = _kl_divergence(current_hist, baseline_hist)
                drift_detected = drift_score > 0.3  # KL threshold

                if drift_detected:
                    alert = (
                        f"⚠️ Drift detected! KL-divergence={drift_score:.3f} "
                        f"(current mean={mean_conf:.3f} vs baseline mean={round(_mean(baseline_vals), 3)})"
                    )

            # Hourly volume (last 24h)
            hourly = self._get_hourly_volume(db)

            return {
                "total_predictions": total,
                "window_size": len(recent),
                "mean_confidence": mean_conf,
                "stddev_confidence": std_conf,
                "toxic_rate": toxic_rate,
                "drift_detected": drift_detected,
                "drift_score": round(drift_score, 4),
                "alert": alert,
                "severity_breakdown": sev_counts,
                "hourly_volume": hourly,
                "baseline_size": min(total, BASELINE_MIN),
            }

        except Exception as exc:
            logger.error(f"[DriftMonitor] get_stats failed: {exc}")
            return self._empty_stats()

    def get_drift_series(self, db: Session, limit: int = 200) -> list[dict]:
        """
        Return time-series of confidence scores for the drift trend chart.
        Returns last `limit` predictions ordered by time.
        """
        try:
            rows = (
                db.query(PredictionLog)
                .order_by(PredictionLog.timestamp.desc())
                .limit(limit)
                .all()
            )
            rows.reverse()
            return [
                {
                    "time": r.timestamp.strftime("%H:%M"),
                    "confidence": round(r.confidence, 3),
                    "toxic": r.toxic,
                    "severity": r.severity,
                }
                for r in rows
            ]
        except Exception as exc:
            logger.error(f"[DriftMonitor] get_drift_series failed: {exc}")
            return []

    def _get_hourly_volume(self, db: Session) -> list[dict]:
        """Count predictions per hour for the last 24 hours."""
        try:
            since = datetime.utcnow() - timedelta(hours=24)
            rows = (
                db.query(PredictionLog)
                .filter(PredictionLog.timestamp >= since)
                .order_by(PredictionLog.timestamp.asc())
                .all()
            )
            # Bucket by hour
            buckets: dict[str, dict] = {}
            for r in rows:
                key = r.timestamp.strftime("%H:00")
                if key not in buckets:
                    buckets[key] = {"hour": key, "count": 0, "toxic_count": 0}
                buckets[key]["count"] += 1
                if r.toxic:
                    buckets[key]["toxic_count"] += 1
            return list(buckets.values())
        except Exception:
            return []

    def _empty_stats(self) -> dict:
        return {
            "total_predictions": 0,
            "window_size": 0,
            "mean_confidence": 0.0,
            "stddev_confidence": 0.0,
            "toxic_rate": 0.0,
            "drift_detected": False,
            "drift_score": 0.0,
            "alert": None,
            "severity_breakdown": {"low": 0, "medium": 0, "high": 0},
            "hourly_volume": [],
            "baseline_size": 0,
        }


# Module-level singleton
drift_monitor = DriftMonitor()
