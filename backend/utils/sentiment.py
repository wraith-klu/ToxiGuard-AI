"""
ToxiGuard AI — Sentiment Analysis
===================================
Lightweight sentiment scoring using VADER (Valence Aware Dictionary
and sEntiment Reasoner) — optimised for social-media and short texts.

Returns polarity, subjectivity (derived, not hardcoded), label and
all four raw VADER scores for downstream use.
"""

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

_analyzer = SentimentIntensityAnalyzer()


def analyze_sentiment(text: str) -> dict:
    """
    Analyse sentiment of text using VADER.

    Args:
        text: Input string (preferably rule-cleaned, but raw text works too).

    Returns:
        {
            "label":       "positive" | "negative" | "neutral",
            "polarity":    float  — VADER compound score [-1, 1]
            "subjectivity": float — derived from pos+neg proportion [0, 1]
            "confidence":  float  — |compound| score [0, 1]
            "positive":    float  — raw VADER positive score
            "negative":    float  — raw VADER negative score
            "neutral":     float  — raw VADER neutral score
        }
    """
    if not text or not text.strip():
        return {
            "label": "neutral",
            "polarity": 0.0,
            "subjectivity": 0.0,
            "confidence": 0.0,
            "positive": 0.0,
            "negative": 0.0,
            "neutral": 1.0,
        }

    scores = _analyzer.polarity_scores(text)
    compound = scores["compound"]
    pos = scores["pos"]
    neg = scores["neg"]
    neu = scores["neu"]

    # Classify label from compound threshold (VADER's recommended values)
    if compound >= 0.05:
        label = "positive"
    elif compound <= -0.05:
        label = "negative"
    else:
        label = "neutral"

    # Subjectivity: proportion of text that is NOT neutral
    # (pos + neg) out of total rated content; derived from VADER scores
    subjectivity = round(min(pos + neg, 1.0), 3)

    return {
        "label": label,
        "polarity": round(compound, 3),
        "subjectivity": subjectivity,
        "confidence": round(abs(compound), 3),
        "positive": round(pos, 3),
        "negative": round(neg, 3),
        "neutral": round(neu, 3),
    }


__all__ = ["analyze_sentiment"]
