"""
ToxiGuard AI — Abusive Word Detection (Rule Engine)
=====================================================
Words are organised into severity tiers to enable weighted scoring.

Tier structure:
    CRITICAL — Extreme slurs and profanity. Always flagged.
    HIGH     — Strong profanity and direct insults.
    MODERATE — Context-dependent insults; LLM layer handles edge cases.

Design decisions:
    - Obfuscated forms (such as f-word, s-word with symbols) are intentionally EXCLUDED.
      The preprocessing pipeline de-obfuscates text BEFORE rule matching
      (e.g. `$` → `s`, `@` → `a`, `*` → ``), so only canonical
      post-normalised forms are needed here.

    - Ambiguous words (hate, kill, die, annoying) are excluded.
      Context-sensitive cases are delegated to the LLM layer.

    - Hindi/Hinglish coverage included for real-world deployment.
"""

import re
from typing import Optional

# ──────────────────────────────────────────────────────────────────────────────
# SEVERITY TIERS
# ──────────────────────────────────────────────────────────────────────────────

CRITICAL_WORDS: frozenset[str] = frozenset({
    # English — extreme slurs
    "motherfucker", "cunt",
    # Hindi/Hinglish — extreme
    "madarchod", "behenchod", "bhenchod", "bhosdike",
    "chutiya", "chutiye", "gandu", "gaandu",
})

HIGH_WORDS: frozenset[str] = frozenset({
    # English — strong profanity
    "fuck", "fucking", "fucked", "fucker", "fucks",
    "shit", "bullshit", "asshole", "bitch",
    "bastard", "slut", "whore", "dick", "dickhead",
    "prick", "pussy", "scumbag", "cum", "douche",
    # Hindi — strong
    "lund", "lodu", "lawde", "lavde", "randi",
    "kamina", "kaminey", "harami", "haramkhor",
    "bhadwe", "chodu", "kutti", "kutte",
})

MODERATE_WORDS: frozenset[str] = frozenset({
    # English — direct insults
    "idiot", "stupid", "dumb", "moron", "fool",
    "loser", "worthless", "pathetic",
    "jerk", "trash", "degenerate",
    "psycho", "maniac",
    # Multi-word attack phrases (checked as substrings)
    "go die", "drop dead", "go to hell", "burn in hell",
    "you suck", "shut up", "get lost", "nobody cares", "who asked",
    # Hindi — insults
    "pagal", "bewakoof", "nikamma", "nalayak", "bakwas",
    "bakwaas", "ghatiya", "gadha", "ullu", "bhikari",
    "tatti", "andhbhakt", "sala", "saala", "saali",
    "sale", "dalle",
})

# Combined lookup set
ALL_ABUSIVE_WORDS: frozenset[str] = (
    CRITICAL_WORDS | HIGH_WORDS | MODERATE_WORDS
)

# ──────────────────────────────────────────────────────────────────────────────
# SEVERITY LOOKUP
# ──────────────────────────────────────────────────────────────────────────────

_SEVERITY_MAP: dict[str, str] = {}
for _word in CRITICAL_WORDS:
    _SEVERITY_MAP[_word] = "critical"
for _word in HIGH_WORDS:
    _SEVERITY_MAP[_word] = "high"
for _word in MODERATE_WORDS:
    _SEVERITY_MAP[_word] = "moderate"


def get_word_severity(word: str) -> str:
    """Return the severity tier for a single word ('critical'/'high'/'moderate'/'unknown')."""
    return _SEVERITY_MAP.get(word.lower(), "unknown")


# ──────────────────────────────────────────────────────────────────────────────
# SUGGESTED REPLACEMENTS
# ──────────────────────────────────────────────────────────────────────────────

suggestions: dict[str, str] = {
    "idiot":     "Try saying 'misinformed' or 'confused'.",
    "stupid":    "Use 'unwise' or 'not a good idea'.",
    "dumb":      "Try 'not well thought out'.",
    "loser":     "Say 'unlucky' or 'didn't succeed this time'.",
    "pathetic":  "You could say 'disappointing'.",
    "shit":      "Use 'problem' or 'mess'.",
    "fuck":      "Avoid profanity; explain calmly.",
    "bitch":     "Try 'rude behavior' instead.",
    "asshole":   "Describe the action, not the person.",
    "chutiya":   "Avoid insults; express disagreement politely.",
    "gandu":     "Avoid slang; state your concern respectfully.",
    "harami":    "Say 'unethical' or 'wrong behavior'.",
    "pagal":     "Use 'confused' or 'acting oddly'.",
    "bewakoof":  "Say 'mistaken' or 'incorrect'.",
    "madarchod": "Avoid abusive language; stay respectful.",
    "behenchod": "Avoid slurs; express frustration calmly.",
}


# ──────────────────────────────────────────────────────────────────────────────
# DETECTION FUNCTIONS
# ──────────────────────────────────────────────────────────────────────────────

def detect_abusive_tokens(text: str) -> list[str]:
    """
    Detect abusive words and phrases in already-normalised text.

    NOTE: Pass `preprocess_for_rules(raw_text)` output here — the rule
    pipeline lowercases, strips punctuation, and de-obfuscates leet-speak
    before this function runs.

    Returns:
        Sorted list of detected abusive words/phrases (no duplicates).
    """
    if not text:
        return []

    text_lower = text.lower()
    found: set[str] = set()

    for word in ALL_ABUSIVE_WORDS:
        if " " in word:
            # Multi-word phrase: substring match
            if word in text_lower:
                found.add(word)
        else:
            # Single token: word-boundary match to avoid false positives
            pattern = r"\b" + re.escape(word) + r"\b"
            if re.search(pattern, text_lower):
                found.add(word)

    return sorted(found)


def get_abuse_severity(detected_words: list[str]) -> str:
    """
    Return the highest severity level among detected words.

    Returns:
        'critical' | 'high' | 'moderate' | 'low'
    """
    if not detected_words:
        return "low"

    severities = {_SEVERITY_MAP.get(w.lower(), "moderate") for w in detected_words}

    if "critical" in severities:
        return "critical"
    if "high" in severities:
        return "high"
    return "moderate"


__all__ = [
    "CRITICAL_WORDS",
    "HIGH_WORDS",
    "MODERATE_WORDS",
    "ALL_ABUSIVE_WORDS",
    "suggestions",
    "detect_abusive_tokens",
    "get_abuse_severity",
    "get_word_severity",
]
