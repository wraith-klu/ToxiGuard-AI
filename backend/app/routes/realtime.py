"""
ToxiGuard AI — Real-Time Chat Moderation
==========================================
POST /chat/moderate — Authenticated, rate-limited, fast chat moderation.

Uses DeBERTa + rule engine for fast decision.
Calls LLM only when toxicity is confirmed (no wasted tokens on clean messages).
"""

from fastapi import APIRouter, Depends, Request, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.routes.auth import get_api_user
from app.core.limiter import limiter
from app.core.logger import logger
from app.core.config import settings

from utils.preprocessing import preprocess_for_rules, preprocess_for_model
from utils.abuse_words import detect_abusive_tokens, get_abuse_severity
from utils.llm_guard import analyze_toxicity_llm
from app.services.model_service import model_service

from app.services.calibration import calibration_service

from models import User
from database import get_db

router = APIRouter()


# ──────────────────────────────────────────────────────────────────────────────
# SCHEMA
# ──────────────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str


# ──────────────────────────────────────────────────────────────────────────────
# ENDPOINT
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/chat/moderate")
@limiter.limit("30/minute")
def moderate_chat(
    request: Request,
    req: ChatRequest = Body(...),
    user: User = Depends(get_api_user),
    db: Session = Depends(get_db),
):
    """
    Real-time chat message moderation.

    Decision flow:
        1. Rule engine — instant check for known slurs
        2. DeBERTa — ML probability score
        3. LLM — called only when content is flagged (avoids wasted tokens)
    """
    text = req.message.strip()
    if not text:
        return {"error": "Empty message"}

    rule_text = preprocess_for_rules(text)
    model_text = preprocess_for_model(text)

    # Track last activity for analytics
    user.last_used = datetime.utcnow()
    db.commit()

    # ── RULE ENGINE ───────────────────────────────────────────────────────────
    abusive_hits = detect_abusive_tokens(rule_text)
    rules_triggered = len(abusive_hits) > 0
    rules_severity = get_abuse_severity(abusive_hits) if rules_triggered else "low"

    # ── DeBERTa ───────────────────────────────────────────────────────────────
    ml_result = model_service.predict(model_text)
    ml_score = 0.0
    ml_categories: list[str] = []
    if ml_result:
        ml_score = float(ml_result.get("toxicity_probability", 0.0))
        ml_categories = [str(c).lower() for c in ml_result.get("detected_categories", [])]

    # ── FAST DECISION ─────────────────────────────────────────────────────────
    # Threshold — dynamically adjusted based on feedback calibration
    toxic = rules_triggered or ml_score >= calibration_service.get_threshold()

    # Critical rule always overrides
    if rules_triggered and rules_severity == "critical":
        toxic = True

    # ── CONFIDENCE ────────────────────────────────────────────────────────────
    confidence = ml_score
    if rules_triggered:
        rule_boost = {"critical": 0.95, "high": 0.85, "moderate": 0.65}.get(rules_severity, 0.6)
        confidence = max(confidence, rule_boost)

    # ── SEVERITY ──────────────────────────────────────────────────────────────
    if confidence >= settings.severity_high:
        severity = "high"
    elif confidence >= settings.severity_medium:
        severity = "medium"
    else:
        severity = "low"

    # ── LLM (only if toxic and text is meaningful) ────────────────────────────
    explanation = "Message appears safe."
    if toxic and len(text) > 10:
        try:
            llm = analyze_toxicity_llm(text)
            explanation = llm.get("explanation", "Toxic content detected.")
        except Exception as exc:
            logger.warning(f"[/chat/moderate] LLM failed: {exc}")
            explanation = "Toxic content detected (explanation unavailable)."

    # ── DETECTED CATEGORIES ───────────────────────────────────────────────────
    all_categories = list(set(ml_categories + abusive_hits))

    logger.info(
        f"[/chat/moderate] user={user.email} | toxic={toxic} | "
        f"ml={ml_score:.3f} | rules={rules_triggered}"
    )

    return {
        "message": text,
        "toxic": toxic,
        "confidence": round(confidence, 3),
        "severity": severity,
        "abusive_words": abusive_hits,
        "detected_categories": all_categories,
        "rules": {"triggered": rules_triggered, "severity": rules_severity},
        "explanation": explanation,
        "model_info": model_service.status,
    }