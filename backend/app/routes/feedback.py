"""
ToxiGuard AI — Active Learning Feedback Loop
=============================================
Endpoints for collecting user corrections to model predictions.

POST /feedback          — Submit a false positive or false negative correction
GET  /feedback/queue    — View unreviewed samples (for retraining queue)
GET  /feedback/stats    — Aggregate feedback counts and accuracy signals

Design:
  - Every flagged prediction is stored with original text + user's correction
  - `feedback_type` is computed automatically: "false_positive" or "false_negative"
  - `reviewed` flag allows admins to mark samples as processed
  - This is the standard Active Learning data pipeline used in production ML systems
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.routes.auth import get_api_user
from app.core.limiter import limiter
from app.core.logger import logger
from models import User, FeedbackSample
from database import get_db
from app.services.calibration import calibration_service

router = APIRouter()


# ──────────────────────────────────────────────────────────────────────────────
# SCHEMA
# ──────────────────────────────────────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    input_text: str
    predicted_toxic: bool       # What the model said
    correct_label: bool         # What the user says is correct
    confidence_at_time: Optional[float] = None
    notes: Optional[str] = None
    abusive_words: Optional[str] = None
    explanation: Optional[str] = None


# ──────────────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/feedback", tags=["Active Learning"])
@limiter.limit("10/minute")
def submit_feedback(
    request: Request,
    req: FeedbackRequest = Body(...),
    user: User = Depends(get_api_user),
    db: Session = Depends(get_db),
):
    """
    Submit a prediction correction for active learning.

    - If model said TOXIC but it's not → false_positive
    - If model said SAFE but it is toxic → false_negative
    """
    text = req.input_text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="input_text cannot be empty")

    if len(text) > 2000:
        raise HTTPException(status_code=400, detail="Text too long (max 2000 chars)")

    # Auto-determine feedback type
    if req.predicted_toxic and not req.correct_label:
        feedback_type = "false_positive"
    elif not req.predicted_toxic and req.correct_label:
        feedback_type = "false_negative"
    else:
        # Model was correct — user is confirming; still log for confidence calibration
        feedback_type = "confirmed_correct"

    sample = FeedbackSample(
        user_id=user.id,
        input_text=text,
        predicted_toxic=req.predicted_toxic,
        correct_label=req.correct_label,
        feedback_type=feedback_type,
        confidence_at_time=req.confidence_at_time,
        notes=req.notes,
        abusive_words=req.abusive_words,
        explanation=req.explanation,
        reviewed=False,
    )
    db.add(sample)
    db.commit()
    db.refresh(sample)

    # Apply adaptive threshold calibration in real-time
    calibration_result = calibration_service.apply_feedback(
        feedback_type,
        req.confidence_at_time
    )

    # Save to dynamic hot-patches blocklist/allowlist for instant update
    from app.services.overrides import override_service
    override_service.add_override(feedback_type, text)

    logger.info(
        f"[/feedback] user={user.email} | type={feedback_type} | len={len(text)} | threshold adjusted: {calibration_result.get('old_threshold')} -> {calibration_result.get('new_threshold')}"
    )

    return {
        "id": sample.id,
        "feedback_type": feedback_type,
        "message": "Feedback recorded. Thank you for improving ToxiGuard AI!",
        "queued_for_review": True,
        "calibration": calibration_result,
    }


@router.get("/feedback/stats", tags=["Active Learning"])
@limiter.limit("20/minute")
def get_feedback_stats(
    request: Request,
    user: User = Depends(get_api_user),
    db: Session = Depends(get_db),
):
    """
    Aggregate feedback statistics for the active learning dashboard.

    Returns counts by type, overall accuracy signal, and review status.
    """
    total = db.query(func.count(FeedbackSample.id)).scalar() or 0
    fp = db.query(func.count(FeedbackSample.id)).filter(
        FeedbackSample.feedback_type == "false_positive"
    ).scalar() or 0
    fn = db.query(func.count(FeedbackSample.id)).filter(
        FeedbackSample.feedback_type == "false_negative"
    ).scalar() or 0
    confirmed = db.query(func.count(FeedbackSample.id)).filter(
        FeedbackSample.feedback_type == "confirmed_correct"
    ).scalar() or 0
    unreviewed = db.query(func.count(FeedbackSample.id)).filter(
        FeedbackSample.reviewed == False
    ).scalar() or 0

    # Error rate signal: (FP + FN) / total corrections
    correction_total = fp + fn
    error_rate = round(correction_total / total, 4) if total > 0 else 0.0

    # Precision signal: what fraction of flagged-as-toxic were actually toxic
    # FP = flagged toxic, wasn't; confirmed = flagged toxic, was toxic
    # (approximate from feedback alone, not full prediction volume)
    precision_approx = None
    if (fp + confirmed) > 0:
        precision_approx = round(confirmed / (fp + confirmed), 4)

    return {
        "total_feedback": total,
        "false_positives": fp,
        "false_negatives": fn,
        "confirmed_correct": confirmed,
        "unreviewed_count": unreviewed,
        "error_rate_signal": error_rate,
        "precision_approx": precision_approx,
        "retraining_recommended": correction_total >= 50,
    }


@router.get("/feedback/queue", tags=["Active Learning"])
@limiter.limit("10/minute")
def get_feedback_queue(
    request: Request,
    limit: int = 20,
    feedback_type: Optional[str] = None,
    user: User = Depends(get_api_user),
    db: Session = Depends(get_db),
):
    """
    View the active learning queue — unreviewed correction samples.

    Use `feedback_type` to filter: false_positive | false_negative | confirmed_correct
    """
    limit = min(limit, 100)

    query = db.query(FeedbackSample).filter(FeedbackSample.reviewed == False)

    if feedback_type:
        query = query.filter(FeedbackSample.feedback_type == feedback_type)

    samples = query.order_by(FeedbackSample.created_at.desc()).limit(limit).all()

    return {
        "count": len(samples),
        "samples": [
            {
                "id": s.id,
                "input_text": s.input_text[:200] + ("..." if len(s.input_text) > 200 else ""),
                "predicted_toxic": s.predicted_toxic,
                "correct_label": s.correct_label,
                "feedback_type": s.feedback_type,
                "confidence_at_time": s.confidence_at_time,
                "notes": s.notes,
                "created_at": s.created_at.isoformat(),
            }
            for s in samples
        ],
    }


@router.post("/feedback/retrain", tags=["Active Learning"])
@limiter.limit("5/minute")
def trigger_retraining(
    request: Request,
    user: User = Depends(get_api_user),
    db: Session = Depends(get_db),
):
    """
    Trigger manual model retraining on feedback queue.
    Appends corrections to data/sample_data.csv, retrains TF-IDF model,
    saves new joblib checkpoint, and hot-reloads prediction service.
    """
    logger.info(f"[/feedback/retrain] triggered by admin/user: {user.email}")
    try:
        from app.services.retrainer import retrain_model
        result = retrain_model(db)
        return result
    except Exception as exc:
        logger.error(f"[/feedback/retrain] Retraining failed: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Retraining failed: {str(exc)}"
        )
