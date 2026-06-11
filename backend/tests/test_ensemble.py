"""
ToxiGuard AI — Ensemble Scoring Tests
======================================
Tests the three-layer weighted ensemble scoring logic and threshold boundaries.
"""

from app.routes.moderation import compute_ensemble_score
from app.core.config import settings

# 1. Test transformer path weights: ML (50%), LLM (35%), Rules (15%)
def test_ensemble_transformer_full_pipeline():
    # Model type starting with "transformer"
    # rules_triggered=True, severity="moderate" -> score = 0.55
    # ml_probability=0.70
    # llm_toxic=True, confidence=0.80 -> score = 0.80
    # Weighted score: (0.15 * 0.55) + (0.50 * 0.70) + (0.35 * 0.80) = 0.0825 + 0.35 + 0.28 = 0.7125 -> 0.713
    is_toxic, confidence = compute_ensemble_score(
        rules_triggered=True,
        rules_severity="moderate",
        ml_probability=0.70,
        llm_toxic=True,
        llm_confidence=0.80,
        model_type="transformer_onnx",
    )
    assert is_toxic is True
    assert confidence == 0.712

# 2. Test ensemble score when LLM is clean (scores low but has high confidence)
def test_ensemble_transformer_llm_clean():
    # LLM says clean (toxic=False) with 0.95 confidence
    # llm_score = (1.0 - 0.95) * 0.1 = 0.005
    # rules_triggered=False -> rule_score = 0.0
    # ml_probability = 0.60
    # Weighted score: (0.15 * 0.0) + (0.50 * 0.60) + (0.35 * 0.005) = 0.30 + 0.00175 = 0.30175 -> 0.302
    is_toxic, confidence = compute_ensemble_score(
        rules_triggered=False,
        rules_severity="low",
        ml_probability=0.60,
        llm_toxic=False,
        llm_confidence=0.95,
        model_type="transformer_onnx",
    )
    # 0.302 is below threshold 0.45
    assert is_toxic is False
    assert confidence == 0.302

# 3. Test LLM not called (weight redistribution): ML gets 75% of LLM, Rules get 25% of LLM
def test_ensemble_llm_not_called():
    # When LLM is not called, llm_confidence=0.0 and llm_toxic=False
    # Rules weight: 0.15 + (0.35 * 0.25) = 0.15 + 0.0875 = 0.2375
    # ML weight: 0.50 + (0.35 * 0.75) = 0.50 + 0.2625 = 0.7625
    # Total weight = 1.0
    # Rules triggered=True, high -> score = 0.85
    # ML prob = 0.40
    # Weighted score: (0.2375 * 0.85) + (0.7625 * 0.40) = 0.201875 + 0.305 = 0.506875 -> 0.507
    is_toxic, confidence = compute_ensemble_score(
        rules_triggered=True,
        rules_severity="high",
        ml_probability=0.40,
        llm_toxic=False,
        llm_confidence=0.0,
        model_type="transformer_onnx",
    )
    assert is_toxic is True
    assert confidence == 0.507

# 4. Test hard override for critical rule
def test_ensemble_critical_override():
    # Even if ML and LLM score very low, critical rule forces toxic=True and min confidence=0.90
    is_toxic, confidence = compute_ensemble_score(
        rules_triggered=True,
        rules_severity="critical",
        ml_probability=0.05,
        llm_toxic=False,
        llm_confidence=0.0,
        model_type="transformer_onnx",
    )
    assert is_toxic is True
    assert confidence >= 0.90

# 5. Test threshold boundary cases (settings.ensemble_threshold = 0.45)
def test_ensemble_threshold_boundary():
    # Exactly at/above threshold
    is_toxic_above, conf_above = compute_ensemble_score(
        rules_triggered=True,
        rules_severity="high",  # 0.85
        ml_probability=0.32,
        llm_toxic=False,
        llm_confidence=0.0,
        model_type="transformer_onnx",
    )
    # score: 0.2375 * 0.85 + 0.7625 * 0.32 = 0.201875 + 0.244 = 0.445875 -> 0.446 (which is >= 0.45 settings.ensemble_threshold)
    # Wait, 0.446 is >= 0.45 ? No, 0.446 is < 0.45. Let's calculate exactly.
    # Let's adjust ml_probability to make it exactly 0.45.
    # We want 0.2375 * 0.85 + 0.7625 * x = 0.45
    # 0.201875 + 0.7625 * x = 0.45 -> 0.7625 * x = 0.248125 -> x = 0.3254
    # So if x = 0.33, score is 0.201875 + 0.251625 = 0.4535 -> 0.454.
    # If x = 0.32, score is 0.446.
    is_toxic_above, conf_above = compute_ensemble_score(
        rules_triggered=True,
        rules_severity="high",
        ml_probability=0.33,
        llm_toxic=False,
        llm_confidence=0.0,
        model_type="transformer_onnx",
    )
    assert is_toxic_above is True
    assert conf_above == 0.454

    is_toxic_below, conf_below = compute_ensemble_score(
        rules_triggered=True,
        rules_severity="high",
        ml_probability=0.32,
        llm_toxic=False,
        llm_confidence=0.0,
        model_type="transformer_onnx",
    )
    assert is_toxic_below is False
    assert conf_below == 0.446
