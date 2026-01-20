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
    version="2.0.0"
)

# =====================================================
# CORS CONFIG
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # lock in production
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
    sentiment: dict | None,
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
    # RULE-BASED DETECTION
    # -------------------------------------------------

    abusive_hits = detect_abusive_tokens(clean_text)

    rule_triggered = len(abusive_hits) > 0

    # -------------------------------------------------
    # ML MODEL DETECTION
    # -------------------------------------------------

    ml_result = None
    toxic_probability = 0.0
    ml_label = None

    if model and label_encoder:
        try:
            probs = model.predict_proba([clean_text])[0]
            class_labels = list(label_encoder.classes_)

            # ✅ Read probability of TOXIC class explicitly
            if "toxic" in class_labels:
                toxic_index = class_labels.index("toxic")
                toxic_probability = float(probs[toxic_index])
            else:
                toxic_probability = float(max(probs))

            pred_idx = probs.argmax()
            ml_label = label_encoder.inverse_transform([pred_idx])[0]

            ml_result = {
                "label": ml_label,
                "toxicity_probability": round(toxic_probability, 3)
            }

        except Exception as e:
            print("⚠️ ML prediction error:", e)

    # -------------------------------------------------
    # HYBRID DECISION LOGIC (RULE + ML TOGETHER)
    # -------------------------------------------------

    sentiment = analyze_sentiment(clean_text)

    # 🔴 Strong rule hit always toxic
    if rule_triggered:
        combined_confidence = max(0.85, toxic_probability)

        return build_response(
            toxic=True,
            confidence=combined_confidence,
            severity="high" if combined_confidence > 0.9 else "medium",
            reason="Matched abusive keywords",
            abusive_words=abusive_hits,
            sentiment=sentiment,
            source="rules+ml",
            ml=ml_result
        )

    # 🟠 ML detects contextual toxicity (sexual / implicit)
    if toxic_probability >= 0.55:
        return build_response(
            toxic=True,
            confidence=toxic_probability,
            severity="medium" if toxic_probability < 0.8 else "high",
            reason="ML detected contextual toxicity",
            abusive_words=[],
            sentiment=sentiment,
            source="ml",
            ml=ml_result
        )

    # 🟡 LLM fallback only when ML is unsure
    llm_result = analyze_toxicity_llm(text)

    return build_response(
        toxic=llm_result.get("toxic", False),
        confidence=llm_result.get("confidence", 0.4),
        severity=llm_result.get("severity", "low"),
        reason=llm_result.get("reason", "LLM analysis"),
        abusive_words=[],
        sentiment=sentiment,
        source="llm",
        ml=ml_result
    )
