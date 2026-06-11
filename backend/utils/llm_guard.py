import os
import json
import re
import hashlib
from collections import OrderedDict
from threading import Lock
from dotenv import load_dotenv
from openai import OpenAI

from app.core.logger import logger

# LOAD ENVIRONMENT
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_PATH)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

OPENROUTER_MODEL = os.getenv(
    "OPENROUTER_MODEL",
    "liquid/lfm-2.5-1.2b-thinking:free"
)

# Optional fallback model (used when primary model fails or times out)
OPENROUTER_FALLBACK_MODEL = os.getenv(
    "OPENROUTER_FALLBACK_MODEL",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
)

if not OPENROUTER_API_KEY:
    raise RuntimeError("OPENROUTER_API_KEY not found in environment")

# OPENROUTER CLIENT

client = OpenAI(
    api_key=OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
    timeout=20.0
)

# LRU CACHE (replaces naive cooldown)

_CACHE_MAX_SIZE = 128
_cache: OrderedDict = OrderedDict()
_cache_lock = Lock()


def _cache_key(text: str) -> str:
    """Generate a short hash key for cache lookup."""
    return hashlib.sha256(text.strip().lower().encode()).hexdigest()[:16]


def _cache_get(key: str) -> dict | None:
    """Thread-safe LRU cache get."""
    with _cache_lock:
        if key in _cache:
            _cache.move_to_end(key)
            return _cache[key]
    return None


def _cache_set(key: str, value: dict):
    """Thread-safe LRU cache set with eviction."""
    with _cache_lock:
        _cache[key] = value
        _cache.move_to_end(key)
        while len(_cache) > _CACHE_MAX_SIZE:
            _cache.popitem(last=False)


# SAFE JSON EXTRACTION

def _extract_json(text: str) -> dict:
    """Safely extract JSON from LLM response, handling extra text."""
    try:
        return json.loads(text)
    except Exception:
        pass

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            pass

    return {}

# STRICT MODERATION PROMPT

SYSTEM_PROMPT = """
You are an advanced AI content moderation system.

Your task is to deeply analyze the input text and explain the reasoning.

Return ONLY valid JSON with this schema:

{
  "toxic": true,
  "confidence": 0.95,
  "severity": "high",
  "category": "hate",
  "detected_phrases": ["example word"],
  "explanation": "Clear explanation of the toxicity..."
}

Field requirements:
- "toxic": boolean (true/false)
- "confidence": float between 0.0 and 1.0
- "severity": string ("low", "medium", or "high")
- "category": string (must be one of the allowed categories)
- "detected_phrases": array of exact abusive words/phrases found
- "explanation": 2-4 clear sentences explaining why the content is toxic or safe

Rules:
- Explanation MUST clearly explain WHY the content is toxic or safe
- Mention specific words or phrases responsible
- Explain the intent or meaning (insult, sexual, threat, etc.)
- Describe potential harm or impact
- Use natural human-like reasoning (not robotic)
- Consider CONTEXT: "I hate rainy days" is NOT toxic. "I hate you, die" IS toxic.
- Words like "hate", "kill", "die" are only toxic when directed at people with harmful intent

Allowed categories:
sexual, abusive, harassment, hate, threat, violence, self_harm, spam, toxic, safe

Return ONLY JSON. No extra text.
""".strip()

# VALID CATEGORIES

VALID_CATEGORIES = {
    "sexual", "abusive", "harassment", "hate",
    "threat", "violence", "self_harm",
    "spam", "toxic", "safe"
}

# DEFAULT SAFE RESPONSE

DEFAULT_SAFE_RESPONSE = {
    "toxic": False,
    "confidence": 0.0,
    "severity": "low",
    "category": "safe",
    "detected_phrases": [],
    "explanation": "LLM unavailable or parsing failed"
}

# MAIN FUNCTION

def analyze_toxicity_llm(text: str) -> dict:
    """
    Uses LLM to analyze toxicity with explainability.
    Results are cached (LRU, 128 entries) to prevent redundant calls.
    Tries the primary model first, then falls back to a secondary model on failure.
    """

    # ---------- CACHE CHECK ----------
    key = _cache_key(text)
    cached = _cache_get(key)
    if cached is not None:
        return cached

    try:
        # ---------- BUILD PROMPT ----------
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text}
        ]

        # ---------- CALL MODEL ----------
        # Try primary model first
        try:
            response = client.chat.completions.create(
                model=OPENROUTER_MODEL,
                messages=messages,
                temperature=0.4,
                max_tokens=2048
            )
        except Exception as primary_err:
            logger.warning(f"[LLM] Primary model error: {primary_err} — trying fallback")
            # Fallback to secondary model
            response = client.chat.completions.create(
                model=OPENROUTER_FALLBACK_MODEL,
                messages=messages,
                temperature=0.5,
                max_tokens=2048
            )

        content = response.choices[0].message.content
        raw_text = (content or "").strip()
        parsed = _extract_json(raw_text)

        # ---------- VALIDATE EXPLANATION ----------
        explanation = str(parsed.get("explanation", "")).strip()
        if len(explanation) < 20:
            if parsed.get("detected_phrases"):
                explanation = (
                    f"The content contains potentially harmful language such as "
                    f"{', '.join(parsed.get('detected_phrases'))}. "
                    f"This indicates {parsed.get('category', 'toxic')} behavior "
                    f"which may negatively affect individuals or communities."
                )
            else:
                explanation = (
                    "The content appears to be safe with no strong "
                    "indicators of harmful or abusive intent."
                )

        # ---------- VALIDATE CATEGORY ----------
        cat = str(parsed.get("category", "safe")).lower()
        if cat not in VALID_CATEGORIES:
            cat = "toxic"

        is_toxic = bool(parsed.get("toxic", False))
        
        try:
            conf = float(parsed.get("confidence", 0.0))
        except (ValueError, TypeError):
            conf = 0.0
            
        # Handle cases where model outputs percentages (e.g. 95 instead of 0.95)
        if conf > 1.0:
            conf = conf / 100.0
            
        # Ensure confidence aligns with the toxic flag if the LLM hallucinated a 0 or missed the key
        if is_toxic and conf < 0.5:
            conf = 0.85

        result = {
            "toxic": is_toxic,
            "confidence": conf,
            "severity": parsed.get("severity", "low"),
            "category": cat,
            "detected_phrases": parsed.get("detected_phrases", []),
            "explanation": explanation
        }

        # ---------- CACHE RESULT ----------
        _cache_set(key, result)

        return result

    except Exception as e:
        logger.error(f"[LLM] Analysis failed: {e}")
        return DEFAULT_SAFE_RESPONSE