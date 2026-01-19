import re
import string

# =====================================================
# COMMON NORMALIZATION MAP
# =====================================================

OBFUSCATION_MAP = {
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


# =====================================================
# CLEANING PIPELINE
# =====================================================

def normalize_text(text: str) -> str:
    """
    Normalize text for ML + rule matching.
    """

    if not text:
        return ""

    # Lowercase
    text = text.lower().strip()

    # Replace URLs
    text = re.sub(r"http\S+|www\S+", " ", text)

    # Replace emails
    text = re.sub(r"\S+@\S+", " ", text)

    # De-obfuscate characters
    for k, v in OBFUSCATION_MAP.items():
        text = text.replace(k, v)

    # Remove emojis and non-ascii
    text = text.encode("ascii", "ignore").decode()

    # Remove punctuation (keep spaces)
    text = text.translate(str.maketrans("", "", string.punctuation))

    # Normalize whitespace
    text = re.sub(r"\s+", " ", text).strip()

    return text


# =====================================================
# TOKENIZATION
# =====================================================

def tokenize(text: str) -> list[str]:
    """
    Split text into tokens.
    """
    if not text:
        return []
    return text.split(" ")


# =====================================================
# FULL PIPELINE
# =====================================================

def preprocess(text: str) -> dict:
    """
    Full preprocessing pipeline.
    Returns cleaned text and tokens.
    """

    clean_text = normalize_text(text)
    tokens = tokenize(clean_text)

    return {
        "clean_text": clean_text,
        "tokens": tokens
    }
