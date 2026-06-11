"""
ToxiGuard AI — Text Preprocessing Pipeline
============================================
Two distinct preprocessing pipelines optimised for different consumers:

1. preprocess_for_rules(text) → str
   Aggressive normalisation for the keyword rule engine.
   - Lowercases, strips URLs/emails, de-obfuscates leet-speak
   - Strips punctuation and non-ASCII (ASCII-safe for pattern matching)

2. preprocess_for_model(text) → str
   Light clean for DeBERTa tokenizer.
   - Removes URLs and excessive whitespace
   - Preserves unicode, emojis, and casing
   - DeBERTa's tokenizer handles the rest

3. preprocess(text) → dict   [backward-compatible wrapper]
   Returns {"clean_text": ..., "rule_text": ..., "tokens": [...]}
"""

import re
import string

# ──────────────────────────────────────────────────────────────────────────────
# LEET-SPEAK DE-OBFUSCATION MAP  (rule engine only)
# ──────────────────────────────────────────────────────────────────────────────

_OBFUSCATION_MAP: dict[str, str] = {
    "@": "a",
    "$": "s",
    "0": "o",
    "1": "i",
    "3": "e",
    "4": "a",
    "5": "s",
    "7": "t",
    "*": "",
    "!": "",
    "_": "",
    "-": " ",
}

_URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
_EMAIL_RE = re.compile(r"\S+@\S+\.\S+")
_WHITESPACE_RE = re.compile(r"\s+")


# ──────────────────────────────────────────────────────────────────────────────
# PIPELINE 1 — Rule engine (aggressive, ASCII-safe)
# ──────────────────────────────────────────────────────────────────────────────

def preprocess_for_rules(text: str) -> str:
    """
    Normalise text for the keyword rule engine.

    Steps:
        1. Lowercase + strip
        2. Remove URLs and email addresses
        3. De-obfuscate leet-speak characters (@ → a, $ → s, etc.)
        4. Drop non-ASCII (covers emoji that can't map to leet-speak)
        5. Remove punctuation
        6. Collapse whitespace
    """
    if not text:
        return ""

    text = text.lower().strip()
    text = _URL_RE.sub(" ", text)
    text = _EMAIL_RE.sub(" ", text)

    for char, replacement in _OBFUSCATION_MAP.items():
        text = text.replace(char, replacement)

    # Drop non-ASCII (emoji, exotic unicode)
    text = text.encode("ascii", "ignore").decode()

    # Remove punctuation but keep spaces
    text = text.translate(str.maketrans("", "", string.punctuation))

    text = _WHITESPACE_RE.sub(" ", text).strip()
    return text


# ──────────────────────────────────────────────────────────────────────────────
# PIPELINE 2 — DeBERTa tokenizer (light clean, unicode-safe)
# ──────────────────────────────────────────────────────────────────────────────

def preprocess_for_model(text: str) -> str:
    """
    Light normalisation for DeBERTa.

    DeBERTa's SentencePiece tokenizer handles:
        - Casing (it's uncased internally)
        - Punctuation
        - Unicode and emojis

    We only remove noise that adds no semantic value:
        - URLs
        - Email addresses
        - Excessive whitespace
    """
    if not text:
        return ""

    text = _URL_RE.sub(" [URL] ", text)
    text = _EMAIL_RE.sub(" [EMAIL] ", text)
    text = _WHITESPACE_RE.sub(" ", text).strip()
    return text


# ──────────────────────────────────────────────────────────────────────────────
# BACKWARD-COMPAT WRAPPER
# ──────────────────────────────────────────────────────────────────────────────

def tokenize(text: str) -> list[str]:
    """Split rule-preprocessed text into tokens."""
    if not text:
        return []
    return text.split()


def preprocess(text: str) -> dict:
    """
    Full preprocessing pipeline — backward-compatible wrapper.

    Returns:
        {
            "clean_text":  str  — rule-safe (aggressive, ASCII)
            "model_text":  str  — model-safe (light, unicode)
            "tokens":      list — tokens from clean_text
        }
    """
    rule_text = preprocess_for_rules(text)
    model_text = preprocess_for_model(text)
    return {
        "clean_text": rule_text,   # kept for backward compat
        "model_text": model_text,
        "tokens": tokenize(rule_text),
    }


__all__ = [
    "preprocess",
    "preprocess_for_rules",
    "preprocess_for_model",
    "tokenize",
]
