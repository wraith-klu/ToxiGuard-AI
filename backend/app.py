import os
import joblib
from collections import Counter

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ------------------- Local Imports -------------------
from utils.preprocessing import preprocess
from utils.abuse_words import detect_abusive_tokens, suggestions
from utils.sentiment import analyze_sentiment
from utils.llm_guard import analyze_toxicity_llm

# =====================================================
# APP INITIALIZATION
# =====================================================

app = FastAPI(
    title="ToxiGuard AI",
    description="Hybrid AI Toxic Content Detection API",
    version="1.0.0"
)

# =====================================================
# CORS CONFIG (React / Vite)
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
# LOAD ML MODELS
# =====================================================

BASE_DIR = os.path.dirname(__file__)

MODEL_PATH = os.path.join(BASE_DIR, "abuse_model.joblib")
ENCODER_PATH = os.path.join(BASE_DIR, "label_encoder.joblib")

model = None
label_encoder = None

try:
    model = joblib.load(MODEL_PATH)
    label_encoder = joblib.load(ENCODER_PATH)
    print("✅ ML model loaded successfully")
except Exception as e:
    print("⚠️ ML model load failed:", e)

# =====================================================
# REQUEST SCHEMA
# =====================================================

class TextRequest(BaseModel):
    text: str


# =====================================================
# HEALTH CHECK
# =====================================================

@app.get("/")
def health():
    return {"status": "ToxiGuard API running"}


# =====================================================
# INTERNAL RESPONSE BUILDER
# =====================================================

def build_response(
    *,
    toxic: bool,
    confidence: float,
    severity: str,
    reason: str,
    abusive_words: list[str],
    sentiment: dict,
    source: str,
    ml: dict | None = None
):
    freq = dict(Counter(abusive_words))

    return {
        "toxic": toxic,
        "confidence": round(float(confidence), 3),
        "severity": severity,
        "reason": reason,
        "abusive_words": abusive_words,
        "word_frequency": freq,
        "suggestions": {
            w: suggestions.get(w.lower(), "—") for w in abusive_words
        },
        "sentiment": sentiment,
        "source": source,
        "ml": ml
    }


# =====================================================
# MAIN PREDICTION ENDPOINT
# =====================================================

@app.post("/predict")
def predict(req: TextRequest):
    text = req.text.strip()

    if not text:
        return build_response(
            toxic=False,
            confidence=0.0,
            severity="low",
            reason="Empty input",
            abusive_words=[],
            sentiment=None,
            source="none",
            ml=None
        )

    # -------------------------------------------------
    # PREPROCESS
    # -------------------------------------------------

    processed = preprocess(text)
    clean_text = processed["clean_text"]

    # -------------------------------------------------
    # RULE-BASED DETECTION (FAST)
    # -------------------------------------------------

    abusive_hits = detect_abusive_tokens(clean_text)

    if abusive_hits:
        sentiment = analyze_sentiment(clean_text)

        return build_response(
            toxic=True,
            confidence=0.95,
            severity="high",
            reason="Matched abusive keywords",
            abusive_words=abusive_hits,
            sentiment=sentiment,
            source="rules",
            ml=None
        )

    # -------------------------------------------------
    # ML MODEL DETECTION (FAST)
    # -------------------------------------------------

    ml_result = None
    ml_confidence = 0.0
    ml_label = None

    if model and label_encoder:
        try:
            probs = model.predict_proba([clean_text])[0]
            pred_idx = probs.argmax()
            ml_confidence = float(probs[pred_idx])
            ml_label = label_encoder.inverse_transform([pred_idx])[0]

            ml_result = {
                "label": ml_label,
                "confidence": round(ml_confidence, 3)
            }

            # High confidence ML decision
            if ml_label.lower() in ("toxic", "abusive") and ml_confidence > 0.85:
                sentiment = analyze_sentiment(clean_text)

                return build_response(
                    toxic=True,
                    confidence=ml_confidence,
                    severity="medium" if ml_confidence < 0.9 else "high",
                    reason="ML model detected toxicity",
                    abusive_words=[],
                    sentiment=sentiment,
                    source="ml",
                    ml=ml_result
                )

        except Exception as e:
            print("⚠️ ML prediction error:", e)

    # -------------------------------------------------
    # LLM FALLBACK (SMART BUT SLOW)
    # -------------------------------------------------

    llm_result = analyze_toxicity_llm(text)
    sentiment = analyze_sentiment(clean_text)

    return build_response(
        toxic=llm_result.get("toxic", False),
        confidence=llm_result.get("confidence", 0.0),
        severity=llm_result.get("severity", "low"),
        reason=llm_result.get("reason", "LLM analysis"),
        abusive_words=[],
        sentiment=sentiment,
        source="llm",
        ml=ml_result
    )
