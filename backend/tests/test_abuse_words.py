"""
ToxiGuard AI — Abuse Words Tests
=================================
Unit tests for the rule-based keyword/phrase engine and severity lookups.
"""

from utils.abuse_words import (
    detect_abusive_tokens,
    get_abuse_severity,
    get_word_severity,
    suggestions,
    CRITICAL_WORDS,
    HIGH_WORDS,
    MODERATE_WORDS,
)

# 1. Test critical words detection
def test_detect_critical_words():
    # 'madarchod' is critical
    text = "you are a madarchod"
    detected = detect_abusive_tokens(text)
    assert "madarchod" in detected
    assert get_abuse_severity(detected) == "critical"

# 2. Test high severity words detection
def test_detect_high_words():
    # 'bitch' is high
    text = "what a stupid bitch"
    detected = detect_abusive_tokens(text)
    assert "bitch" in detected
    assert "stupid" in detected  # moderate word
    assert get_abuse_severity(detected) == "high"  # high takes precedence over moderate

# 3. Test moderate words and phrase matching
def test_detect_moderate_and_phrases():
    text = "shut up and go to hell"
    detected = detect_abusive_tokens(text)
    assert "shut up" in detected
    assert "go to hell" in detected
    assert get_abuse_severity(detected) == "moderate"

# 4. Test word boundary matching (no false positives)
def test_word_boundaries():
    # 'lund' is high, but 'blunder' should not trigger it.
    # 'ass' is in high, but 'class' or 'grass' should not trigger.
    text1 = "this was a major blunder in our class"
    assert len(detect_abusive_tokens(text1)) == 0

    text2 = "he is a lodu lund"
    detected = detect_abusive_tokens(text2)
    assert "lodu" in detected
    assert "lund" in detected

# 5. Test word severity lookup helper
def test_get_word_severity():
    assert get_word_severity("madarchod") == "critical"
    assert get_word_severity("fuck") == "high"
    assert get_word_severity("idiot") == "moderate"
    assert get_word_severity("hello") == "unknown"
    assert get_word_severity("FUCK") == "high"  # Case-insensitive

# 6. Test suggestions mapping
def test_suggestions_mapping():
    assert "idiot" in suggestions
    assert "fuck" in suggestions
    assert suggestions["idiot"] == "Try saying 'misinformed' or 'confused'."
    assert suggestions.get("nonexistent") is None
