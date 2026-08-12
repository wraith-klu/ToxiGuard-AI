"""
ToxiGuard AI — XAI Explain Endpoint
======================================
POST /explain — Token-level attention attribution for toxicity decisions.

Returns per-token importance scores extracted from DeBERTa's last attention layer.
Used to answer: "Why did the model flag this text as toxic?"
"""

from fastapi import APIRouter, Depends, Request, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.routes.auth import get_api_user
from app.core.limiter import limiter
from app.core.config import settings
from app.core.logger import logger
from ml.explainability import get_explainer
from models import User
from database import get_db

router = APIRouter()


class ExplainRequest(BaseModel):
    text: str


@router.post("/explain", tags=["XAI"])
@limiter.limit("20/minute")
def explain_prediction(
    request: Request,
    req: ExplainRequest = Body(...),
    user: User = Depends(get_api_user),
    db: Session = Depends(get_db),
):
    """
    Token-level XAI attribution via DeBERTa attention weights.

    Returns each word's contribution score (0.0 = no influence, 1.0 = highest influence).
    Use this to build token heatmaps in the frontend.

    Response:
        {
            "tokens": [{"token": str, "score": float, "is_special": bool}],
            "top_tokens": [{"token": str, "score": float}],
            "method": "attention_last_layer_mean",
            "num_tokens": int,
            "status": "ok" | "unavailable"
        }
    """
    text = req.text.strip()
    if not text:
        return {"error": "Empty text", "status": "error"}

    logger.info(f"[/explain] user={user.email} | len={len(text)}")

    explainer = get_explainer(settings.model_dir)

    if not explainer.is_ready:
        return {
            "tokens": [],
            "top_tokens": [],
            "method": "unavailable",
            "num_tokens": 0,
            "status": "unavailable",
            "message": "XAI explainer not ready — check backend logs",
        }

    result = explainer.explain(text)

    if result is None:
        return {
            "tokens": [],
            "top_tokens": [],
            "method": "error",
            "num_tokens": 0,
            "status": "error",
            "message": "Attribution failed",
        }

    return {**result, "status": "ok"}
