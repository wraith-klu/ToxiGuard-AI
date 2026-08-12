"""
ToxiGuard AI — Moderation Routes
==================================
Three prediction endpoints:

  POST /predict/demo   — Public demo (IP rate-limited, no auth, ML only)
  POST /predict/ml     — Extension fast-path (auth, ML only, no LLM)
  POST /predict        — Full pipeline (auth, rules + DeBERTa + LLM)
  POST /analyze-file   — Batch CSV/TXT analysis (auth, ensemble scoring)

Ensemble weighting (transformer model):
    DeBERTa   50% — primary, SOTA accuracy
    LLM       35% — contextual nuance (only called when needed)
    Rules     15% — fast-path for obvious slurs
"""


from collections import Counter

import io
import pandas as pd
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.services.model_service import model_service
from app.routes.auth import get_api_user
from app.core.limiter import limiter
from app.core.logger import logger
from app.core.config import settings

from utils.preprocessing import preprocess_for_rules, preprocess_for_model
from utils.abuse_words import detect_abusive_tokens, get_abuse_severity, suggestions as abuse_suggestions
from utils.sentiment import analyze_sentiment
from utils.llm_guard import analyze_toxicity_llm

from models import User
from database import get_db
from app.services.drift_monitor import drift_monitor
from app.services.calibration import calibration_service

# ──────────────────────────────────────────────────────────────────────────────
# ROUTER
# ──────────────────────────────────────────────────────────────────────────────

router = APIRouter()

PLAN_LIMITS = {
    "free": settings.plan_limit_free,
    "pro":  settings.plan_limit_pro,
}

TOXIC_ML_LABELS = frozenset({
    "abusive", "toxic", "severe_toxic",
    "obscene", "threat", "insult", "identity_hate",
})


# ──────────────────────────────────────────────────────────────────────────────
# SCHEMAS
# ──────────────────────────────────────────────────────────────────────────────

class TextRequest(BaseModel):
    text: str


# ──────────────────────────────────────────────────────────────────────────────
# SHARED HELPERS
# ──────────────────────────────────────────────────────────────────────────────

def _generate_suggestions(words: list[str]) -> dict[str, str]:
    result = {}
    for w in words:
        key = w.lower()
        if key in abuse_suggestions:
            result[w] = abuse_suggestions[key]
        else:
            # Word-specific fallback — more useful than a generic message
            result[w] = f"Consider replacing '{w}' with a more neutral or constructive expression."
    return result


def _build_response(payload: dict) -> dict:
    words = payload.get("abusive_words", [])
    payload["word_frequency"] = dict(Counter(words))
    payload["suggestions"] = _generate_suggestions(words)
    return payload


def _adjust_sentiment(sentiment: dict | None, toxic: bool) -> dict | None:
    if toxic and sentiment:
        sentiment["label"] = "negative"
    return sentiment


def _check_plan_limit(user: User, db: Session) -> None:
    if user.usage_count >= PLAN_LIMITS.get(user.plan, settings.plan_limit_free):
        raise HTTPException(status_code=403, detail="Usage limit exceeded")
    user.usage_count += 1
    user.last_used = datetime.utcnow()
    db.commit()


# ──────────────────────────────────────────────────────────────────────────────
# ML RESULT NORMALISATION
# ──────────────────────────────────────────────────────────────────────────────

def normalize_ml_result(ml_result: dict | None, threshold: float | None = None) -> dict:
    """Normalise raw ML output into a standard toxicity verdict."""
    if threshold is None:
        threshold = calibration_service.get_threshold()
    if not ml_result:
        return {
            "toxic": False,
            "confidence": 0.0,
            "severity": "low",
            "category": "safe",
            "detected_categories": [],
        }

    labels: dict = ml_result.get("labels") or {}
    label: str = str(ml_result.get("label") or "").lower()
    detected_categories: list[str] = [
        str(c).lower() for c in ml_result.get("detected_categories", [])
    ]

    toxic_scores = [
        float(score)
        for cat, score in labels.items()
        if str(cat).lower() in TOXIC_ML_LABELS
    ]
    confidence = max(
        [float(ml_result.get("toxicity_probability", 0.0))] + toxic_scores
    )

    toxic = (
        bool(ml_result.get("toxic"))
        or label in TOXIC_ML_LABELS
        or any(c in TOXIC_ML_LABELS for c in detected_categories)
        or confidence >= threshold
    )

    if confidence >= settings.severity_high:
        severity = "high"
    elif confidence >= settings.severity_medium:
        severity = "medium"
    else:
        severity = "low"

    category = "safe"
    if toxic:
        if detected_categories:
            category = detected_categories[0]
        elif label and label not in ("clean", "safe") and label in TOXIC_ML_LABELS:
            category = label
        else:
            category = "toxic"

    return {
        "toxic": toxic,
        "confidence": round(confidence, 3),
        "severity": severity,
        "category": category,
        "detected_categories": detected_categories,
    }


# ──────────────────────────────────────────────────────────────────────────────
# WEIGHTED ENSEMBLE SCORER
# ──────────────────────────────────────────────────────────────────────────────

def compute_ensemble_score(
    rules_triggered: bool,
    rules_severity: str,
    ml_probability: float,
    llm_toxic: bool,
    llm_confidence: float,
    model_type: str,
) -> tuple[bool, float]:
    """
    Three-layer weighted ensemble scoring.

    Weights (transformer path):
        DeBERTa   50% — primary model, highest accuracy signal
        LLM       35% — contextual understanding, sarcasm detection
        Rules     15% — deterministic, fast, explainable

    When LLM was not called (cost/rate-limit), the 35% is redistributed:
        DeBERTa gets 75%, Rules get 25%.

    Returns:
        (is_toxic: bool, confidence: float)
    """
    # Rule score from severity tier
    rule_score = 0.0
    if rules_triggered:
        rule_score = {"critical": 1.0, "high": 0.85, "moderate": 0.55}.get(
            rules_severity, 0.6
        )

    ml_score = ml_probability

    llm_score = llm_confidence if llm_toxic else (1.0 - llm_confidence) * 0.1

    # Layer weights — DeBERTa is primary, trust it more
    if model_type.startswith("transformer"):
        w_rules, w_ml, w_llm = 0.15, 0.50, 0.35
    else:
        # Legacy ML is less reliable — lean heavily on LLM
        w_rules, w_ml, w_llm = 0.25, 0.15, 0.60

    # LLM not called → redistribute its weight
    llm_was_called = not (llm_confidence == 0.0 and not llm_toxic)
    if not llm_was_called:
        # Redistribute LLM weight proportionally to remaining layers
        w_ml += w_llm * 0.75
        w_rules += w_llm * 0.25
        w_llm = 0.0

    total_weight = w_rules + w_ml + w_llm
    weighted = (
        (w_rules * rule_score + w_ml * ml_score + w_llm * llm_score)
        / total_weight
    )

    # Hard overrides to prevent false negatives from dragging down strong signals:
    # 1. Critical rule always forces high confidence
    if rules_triggered and rules_severity == "critical":
        weighted = max(weighted, 0.90)

    # 2. High rule severity always forces score above threshold
    if rules_triggered and rules_severity == "high":
        current_threshold = calibration_service.get_threshold()
        weighted = max(weighted, current_threshold + 0.05)

    # 3. High-confidence LLM classification (e.g. for multilingual/code-mixed inputs) always forces score above threshold
    if llm_toxic and llm_confidence >= 0.75:
        current_threshold = calibration_service.get_threshold()
        weighted = max(weighted, current_threshold + 0.05)

    is_toxic = weighted >= calibration_service.get_threshold()
    return is_toxic, round(weighted, 3)


# ──────────────────────────────────────────────────────────────────────────────
# PUBLIC DEMO ENDPOINT
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/predict/demo", tags=["Demo"])
@limiter.limit("5/minute")
def predict_demo(request: Request, req: TextRequest = Body(...)):
    """
    Public toxicity check — no auth required.
    IP rate-limited to 5 req/min. Uses ML + rule engine (no LLM).
    Intended for browser extension demo mode.
    """
    text = req.text.strip()
    if not text:
        return {"error": "Empty input"}

    from app.services.overrides import override_service
    override = override_service.check_override(text)
    if override is not None:
        return {
            "toxic": override,
            "confidence": 1.0 if override else 0.0,
            "severity": "high" if override else "low",
            "category": "override" if override else "safe",
            "detected_categories": ["override"] if override else [],
            "abusive_words": [],
            "source": "overrides",
            "demo": True,
            "llm_used": False,
            "model_info": {"type": "dynamic_overrides", "ready": True},
        }

    rule_text = preprocess_for_rules(text)
    model_text = preprocess_for_model(text)

    # Rule engine on normalised text
    abusive_hits = detect_abusive_tokens(rule_text)
    rules_triggered = len(abusive_hits) > 0
    rules_severity = get_abuse_severity(abusive_hits) if rules_triggered else "low"

    # DeBERTa on unicode-safe text
    ml_result = model_service.predict(model_text)
    if not ml_result:
        return {
            "toxic": rules_triggered,
            "confidence": 0.6 if rules_triggered else 0.0,
            "severity": rules_severity if rules_triggered else "low",
            "category": "abusive" if rules_triggered else "safe",
            "detected_categories": abusive_hits,
            "abusive_words": abusive_hits,
            "source": "rules" if rules_triggered else "none",
            "demo": True,
            "llm_used": False,
            "model_info": {"type": model_service.model_type, "ready": False},
        }

    normalized = normalize_ml_result(ml_result, threshold=settings.demo_ml_threshold)

    # Light ensemble for demo: rules + ML only
    if rules_triggered and rules_severity in ("critical", "high"):
        toxic = True
        confidence = max(normalized["confidence"], 0.80)
    else:
        toxic = normalized["toxic"] or rules_triggered
        confidence = normalized["confidence"]

    if confidence >= settings.severity_high:
        severity = "high"
    elif confidence >= settings.severity_medium:
        severity = "medium"
    else:
        severity = "low"

    category = normalized["category"] if toxic else "safe"
    all_detected = list(set(normalized["detected_categories"] + abusive_hits))

    return {
        "toxic": toxic,
        "confidence": round(confidence, 3),
        "severity": severity,
        "category": category,
        "detected_categories": all_detected,
        "abusive_words": abusive_hits,
        "source": "rules" if rules_triggered else ("ml" if toxic else "none"),
        "demo": True,
        "llm_used": False,
        "reason": (
            f"[Demo] Detected {category} content."
            if toxic
            else "[Demo] No toxicity detected."
        ),
        "ml": ml_result,
        "model_info": {
            "type": model_service.model_type,
            "ready": True,
        },
    }


# ──────────────────────────────────────────────────────────────────────────────
# ML-ONLY ENDPOINT (Extension fast-path)
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/predict/ml")
@limiter.limit("120/minute")
def predict_ml_only(
    request: Request,
    req: TextRequest = Body(...),
    user: User = Depends(get_api_user),
    db: Session = Depends(get_db),
):
    """
    Extension-safe prediction — authenticated, ML + rules only.
    Skips LLM to avoid token costs on bulk scans.
    """
    text = req.text.strip()
    if not text:
        return {"error": "Empty input"}

    _check_plan_limit(user, db)
    logger.info(f"[/predict/ml] user={user.email} usage={user.usage_count}")

    from app.services.overrides import override_service
    override = override_service.check_override(text)
    if override is not None:
        return {
            "user": user.email,
            "toxic": override,
            "confidence": 1.0 if override else 0.0,
            "severity": "high" if override else "low",
            "source": "overrides",
            "reason": "Dynamic override applied based on feedback.",
            "abusive_words": [],
            "detected_categories": ["override"] if override else [],
            "sentiment": None,
            "ml": None,
            "llm": None,
            "rules": {"triggered": override, "severity": "high" if override else "low"},
            "llm_used": False,
            "model_info": {"type": "dynamic_overrides", "ready": True},
        }

    rule_text = preprocess_for_rules(text)
    model_text = preprocess_for_model(text)

    abusive_hits = detect_abusive_tokens(rule_text)
    rules_triggered = len(abusive_hits) > 0
    rules_severity = get_abuse_severity(abusive_hits) if rules_triggered else "low"

    ml_result = model_service.predict(model_text)
    if not ml_result:
        raise HTTPException(status_code=503, detail="ML model unavailable")

    normalized = normalize_ml_result(ml_result)

    # Simple rules + ML decision (no LLM)
    is_toxic = normalized["toxic"] or (rules_triggered and rules_severity in ("critical", "high"))
    confidence = normalized["confidence"]
    if rules_triggered and rules_severity == "critical":
        confidence = max(confidence, 0.90)

    if confidence >= settings.severity_high:
        severity = "high"
    elif confidence >= settings.severity_medium:
        severity = "medium"
    else:
        severity = "low"

    payload = {
        "user": user.email,
        "toxic": is_toxic,
        "confidence": round(confidence, 3),
        "severity": severity,
        "source": "rules" if rules_triggered else ("ml" if normalized["toxic"] else "none"),
        "reason": (
            f"ML model flagged as {normalized['category']}."
            if normalized["toxic"]
            else "No toxicity detected by ML model."
        ),
        "abusive_words": abusive_hits,
        "detected_categories": list(set(normalized["detected_categories"] + abusive_hits)),
        "sentiment": None,
        "ml": ml_result,
        "llm": None,
        "rules": {"triggered": rules_triggered, "severity": rules_severity},
        "llm_used": False,
        "model_info": model_service.status,
    }
    return _build_response(payload)


# ──────────────────────────────────────────────────────────────────────────────
# MAIN FULL-PIPELINE ENDPOINT
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/predict")
@limiter.limit("10/minute")
def predict(
    request: Request,
    req: TextRequest = Body(...),
    user: User = Depends(get_api_user),
    db: Session = Depends(get_db),
):
    """
    Full three-layer toxicity analysis:
        1. Rule-based keyword detection
        2. DeBERTa-v3 transformer (ONNX or PyTorch)
        3. LLM contextual analysis (OpenRouter) — triggered selectively
    """
    text = req.text.strip()
    if not text:
        return {"error": "Empty input"}

    _check_plan_limit(user, db)
    logger.info(f"[/predict] user={user.email} usage={user.usage_count}")

    from app.services.overrides import override_service
    override = override_service.check_override(text)
    if override is not None:
        payload = {
            "user": user.email,
            "toxic": override,
            "confidence": 1.0 if override else 0.0,
            "severity": "high" if override else "low",
            "source": "overrides",
            "reason": "Dynamic override applied based on feedback.",
            "abusive_words": [],
            "detected_categories": ["override"] if override else [],
            "sentiment": {"label": "negative" if override else "positive", "polarity": -1.0 if override else 1.0},
            "ml": None,
            "llm": None,
            "rules": {"triggered": override, "severity": "high" if override else "low"},
            "llm_used": False,
            "model_info": {"type": "dynamic_overrides", "ready": True},
        }
        return _build_response(payload)

    # ── PREPROCESS ────────────────────────────────────────────────────────────
    rule_text = preprocess_for_rules(text)
    model_text = preprocess_for_model(text)

    # ── SENTIMENT ─────────────────────────────────────────────────────────────
    sentiment = analyze_sentiment(rule_text)

    # ── RULE ENGINE ───────────────────────────────────────────────────────────
    abusive_hits = detect_abusive_tokens(rule_text)
    rules_triggered = len(abusive_hits) > 0
    rules_severity = get_abuse_severity(abusive_hits) if rules_triggered else "low"

    # ── DeBERTa ML ────────────────────────────────────────────────────────────
    ml_result = model_service.predict(model_text)
    toxic_probability = 0.0
    if ml_result:
        toxic_probability = float(ml_result.get("toxicity_probability", 0.0))

    # ── LLM CALL (selective — saves cost & latency) ────────────────────────
    _DEFAULT_LLM = {
        "toxic": False,
        "confidence": 0.0,
        "category": "safe",
        "detected_phrases": [],
        "explanation": "Analysis based on rule engine and ML model signals.",
    }
    llm_result = _DEFAULT_LLM.copy()

    should_call_llm = len(text) > 10 and (
        rules_triggered or toxic_probability >= settings.ml_trigger_threshold
    )

    if should_call_llm:
        try:
            llm_result = analyze_toxicity_llm(text)
        except Exception as exc:
            logger.warning(f"[/predict] LLM call failed: {exc}")

    llm_toxic = llm_result.get("toxic", False)
    llm_conf = llm_result.get("confidence", 0.0)

    # ── WEIGHTED ENSEMBLE ─────────────────────────────────────────────────────
    toxic, final_confidence = compute_ensemble_score(
        rules_triggered=rules_triggered,
        rules_severity=rules_severity,
        ml_probability=toxic_probability,
        llm_toxic=llm_toxic,
        llm_confidence=llm_conf,
        model_type=model_service.model_type,
    )

    # ── SEVERITY ──────────────────────────────────────────────────────────────
    if final_confidence >= settings.severity_high:
        severity = "high"
    elif final_confidence >= settings.severity_medium:
        severity = "medium"
    else:
        severity = "low"

    # ── SENTIMENT OVERRIDE ────────────────────────────────────────────────────
    sentiment = _adjust_sentiment(sentiment, toxic)

    # ── ABUSIVE WORDS (merge rule + LLM phrases) ──────────────────────────────
    abusive_words = list(set(abusive_hits + llm_result.get("detected_phrases", [])))

    # ── DETECTED CATEGORIES ───────────────────────────────────────────────────
    ml_cats = [str(c).lower() for c in (ml_result or {}).get("detected_categories", [])]
    all_categories = list(set(ml_cats + abusive_hits))

    # ── SOURCE ATTRIBUTION ────────────────────────────────────────────────────
    if llm_toxic:
        source = "llm"
    elif rules_triggered:
        source = "rules"
    elif toxic_probability >= 0.5:
        source = "ml"
    else:
        source = "none"

    # ── EXPLANATION ───────────────────────────────────────────────────────────
    reason = llm_result.get("explanation") or "No explanation available."

    llm_was_used = should_call_llm and (
        llm_result.get("explanation") != _DEFAULT_LLM["explanation"]
    )

    # ── RESPONSE ──────────────────────────────────────────────────────────────
    payload = {
        "user": user.email,
        "toxic": toxic,
        "confidence": final_confidence,
        "severity": severity,
        "source": source,
        "reason": reason,
        "abusive_words": abusive_words,
        "detected_categories": all_categories,
        "sentiment": sentiment,
        "ml": ml_result,
        "llm": llm_result,
        "rules": {"triggered": rules_triggered, "severity": rules_severity},
        "llm_used": llm_was_used,
        "model_info": model_service.status,
    }

    # ── DRIFT MONITORING LOG ──────────────────────────────────────────────────
    try:
        drift_monitor.log_prediction(
            db,
            user_id=user.id,
            input_text=text,
            confidence=final_confidence,
            toxic=toxic,
            severity=severity,
            source=source,
        )
    except Exception as _log_exc:
        logger.warning(f"[/predict] Drift log failed (non-fatal): {_log_exc}")

    return _build_response(payload)


# ──────────────────────────────────────────────────────────────────────────────
# BATCH FILE ANALYSIS
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/analyze-file")
async def analyze_file(
    file: UploadFile = File(...),
    user: User = Depends(get_api_user),
    db: Session = Depends(get_db),
):
    """
    Batch toxicity analysis from CSV or TXT file upload.
    Uses the shared ensemble (rules + ML) — no LLM for batch speed.
    Capped at 50 texts per request.
    """
    try:
        content = await file.read()

        if file.filename and file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
            # Auto-detect text column
            text_col = next(
                (c for c in df.columns if "text" in c.lower() or "comment" in c.lower()),
                df.columns[0],
            )
            texts = df[text_col].fillna("").astype(str).tolist()
        else:
            texts = content.decode("utf-8").splitlines()

        batch = [t for t in texts[:50] if t.strip()]
        results = []
        toxic_count = 0

        for text in batch:
            rule_text = preprocess_for_rules(text)
            model_text = preprocess_for_model(text)

            abusive_hits = detect_abusive_tokens(rule_text)
            rules_triggered = len(abusive_hits) > 0
            rules_severity = get_abuse_severity(abusive_hits) if rules_triggered else "low"

            ml_result = model_service.predict(model_text)
            ml_prob = float(ml_result.get("toxicity_probability", 0.0)) if ml_result else 0.0
            ml_cats = [str(c).lower() for c in (ml_result or {}).get("detected_categories", [])]

            # Shared ensemble (no LLM for batch speed)
            is_toxic, confidence = compute_ensemble_score(
                rules_triggered=rules_triggered,
                rules_severity=rules_severity,
                ml_probability=ml_prob,
                llm_toxic=False,
                llm_confidence=0.0,
                model_type=model_service.model_type,
            )

            if confidence >= settings.severity_high:
                severity = "high"
            elif confidence >= settings.severity_medium:
                severity = "medium"
            else:
                severity = "low"

            if is_toxic:
                toxic_count += 1

            sentiment = analyze_sentiment(rule_text)
            if is_toxic:
                sentiment["label"] = "negative"

            source = "rules" if rules_triggered else ("ml" if ml_prob >= 0.5 else "none")
            all_categories = list(set(ml_cats + abusive_hits))

            results.append({
                "text": text,
                "toxic": is_toxic,
                "confidence": round(confidence, 3),
                "severity": severity,
                "source": source,
                "abusive_words": abusive_hits,
                "detected_categories": all_categories,
                "sentiment": sentiment,
            })

        return {
            "total": len(results),
            "toxic_count": toxic_count,
            "clean_count": len(results) - toxic_count,
            "toxic_rate": round(toxic_count / len(results), 3) if results else 0.0,
            "model_info": model_service.status,
            "results": results,
        }

    except Exception as exc:
        logger.error(f"[/analyze-file] Failed: {exc}")
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(exc)}")
