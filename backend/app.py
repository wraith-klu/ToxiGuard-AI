import os
import joblib
from collections import Counter

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ------------------- Local Imports -------------------
from utils.preprocessing import preprocess
from utils.abuse_words import detect_abusive_tokens
from utils.sentiment import analyze_sentiment
from utils.llm_guard import analyze_toxicity_llm

# =====================================================
# APP INITIALIZATION
# =====================================================

app = FastAPI(
    title="ToxiGuard AI",
    description="Hybrid AI Toxic Content Detection API (Rules + ML + LLM)",
    version="3.0.0"
)

# =====================================================
# CORS CONFIG
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
# SMART SUGGESTION ENGINE
# =====================================================

def generate_suggestions(detected_phrases: list[str]) -> dict:
    """
    Generates safe replacement suggestions for toxic phrases.
    """
    suggestions = {}

    for phrase in detected_phrases:
        p = phrase.lower()

        # Sexual content
        if any(word in p for word in [
            "boob", "breast", "sex", "nude", "squeeze",
            "hot", "sexy", "kiss", "bed"
        ]):
            suggestions[phrase] = (
                "You can express appreciation respectfully without referring to body parts."
            )

        # Harassment / abuse
        elif any(word in p for word in [
            "idiot", "stupid", "hate", "kill",
            "fool", "shut up", "loser"
        ]):
            suggestions[phrase] = (
                "Please express your opinion politely and respectfully."
            )

        # Threats / violence
        elif any(word in p for word in [
            "hit", "beat", "murder", "attack", "destroy"
        ]):
            suggestions[phrase] = (
                "Avoid violent language and communicate calmly."
            )

        # Default fallback
        else:
            suggestions[phrase] = (
                "Consider using respectful and neutral language."
            )

    return suggestions


# =====================================================
# RESPONSE BUILDER
# =====================================================

def build_response(payload: dict):
    abusive_words = payload.get("abusive_words", [])
    freq = dict(Counter(abusive_words))

    payload["word_frequency"] = freq
    payload["suggestions"] = generate_suggestions(abusive_words)

    return payload


# =====================================================
# MAIN ENDPOINT
# =====================================================

@app.post("/predict")
def predict(req: TextRequest):
    text = req.text.strip()

    if not text:
        return build_response({
            "toxic": False,
            "confidence": 0.0,
            "severity": "low",
            "reason": "Empty input",
            "abusive_words": [],
            "sentiment": None,
            "source": "none",
            "rules": None,
            "ml": None,
            "llm": None
        })

    # -------------------------------------------------
    # PREPROCESS
    # -------------------------------------------------
    processed = preprocess(text)
    clean_text = processed["clean_text"]

    sentiment = analyze_sentiment(clean_text)

    # -------------------------------------------------
    # 🧱 RULE ENGINE
    # -------------------------------------------------
    abusive_hits = detect_abusive_tokens(clean_text)

    rules_result = {
        "triggered": len(abusive_hits) > 0,
        "abusive_words": abusive_hits,
        "confidence": 0.95 if abusive_hits else 0.0
    }

    # -------------------------------------------------
    # 🤖 ML ENGINE
    # -------------------------------------------------
    ml_result = None
    toxic_probability = 0.0

    if model and label_encoder:
        try:
            probs = model.predict_proba([clean_text])[0]
            labels = list(label_encoder.classes_)

            if "toxic" in labels:
                toxic_probability = float(probs[labels.index("toxic")])
            else:
                toxic_probability = float(max(probs))

            pred_label = label_encoder.inverse_transform([probs.argmax()])[0]

            ml_result = {
                "label": pred_label,
                "toxicity_probability": round(toxic_probability, 3),
                "all_probabilities": {
                    labels[i]: round(float(probs[i]), 3)
                    for i in range(len(labels))
                }
            }

        except Exception as e:
            print("⚠️ ML prediction error:", e)

    # -------------------------------------------------
    # 🧠 LLM ENGINE
    # -------------------------------------------------
    llm_result = analyze_toxicity_llm(text)

    # -------------------------------------------------
    # 🎯 FINAL DECISION (ENSEMBLE)
    # -------------------------------------------------

    scores = [
        rules_result["confidence"],
        toxic_probability,
        llm_result.get("confidence", 0.0)
    ]

    final_confidence = round(max(scores), 3)
    toxic = final_confidence >= 0.5

    # Severity logic
    if final_confidence > 0.85:
        severity = "high"
    elif final_confidence > 0.6:
        severity = "medium"
    else:
        severity = "low"

    # Combine abusive words from rules + llm
    abusive_words = list(set(
        abusive_hits +
        llm_result.get("detected_phrases", [])
    ))

    reason = (
        f"Rules: {rules_result['triggered']} | "
        f"ML prob: {round(toxic_probability,2)} | "
        f"LLM: {llm_result.get('explanation','')}"
    )

    payload = {
        "toxic": toxic,
        "confidence": final_confidence,
        "severity": severity,
        "reason": reason,
        "abusive_words": abusive_words,
        "sentiment": sentiment,
        "source": "hybrid",
        "rules": rules_result,
        "ml": ml_result,
        "llm": llm_result
    }

    return build_response(payload)
