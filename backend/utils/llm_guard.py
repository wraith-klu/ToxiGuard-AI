import os
import json
import re
import time
from threading import Lock
from dotenv import load_dotenv
from openai import OpenAI

# =====================================================
# LOAD ENVIRONMENT
# =====================================================

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_PATH)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Default model (free tier)
OPENROUTER_MODEL = os.getenv(
    "OPENROUTER_MODEL",
    "arcee-ai/trinity-large-preview:free"
)

if not OPENROUTER_API_KEY:
    raise RuntimeError("OPENROUTER_API_KEY not found in environment")

# =====================================================
# OPENROUTER CLIENT
# =====================================================

client = OpenAI(
    api_key=OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
    timeout=20.0
)

# =====================================================
# THROTTLING + CACHE CONFIG
# =====================================================

LLM_COOLDOWN = 5   # seconds (increase if still rate-limited)

_last_llm_time = 0.0
_last_prompt = None
_last_llm_result = None
_llm_lock = Lock()

# =====================================================
# INTERNAL HELPERS
# =====================================================

def _extract_json(text: str) -> dict:
    """
    Safely extract JSON from LLM response.
    Handles accidental extra text.
    """
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

# =====================================================
# PROMPT (FORCED EXPLANATION)
# =====================================================

SYSTEM_PROMPT = """
You are an AI content moderation engine.

Your task:
1. Detect whether the user text contains any of the following:
   - abusive language
   - sexual or explicit content
   - harassment or bullying
   - hate speech
   - threats or violence
   - harmful or unsafe intent

2. If toxic = true:
   - Clearly explain WHY the text was detected.
   - Mention the exact word(s) or phrase(s) responsible.
   - Explain the potential harm or risk.

3. If toxic = false:
   - Briefly explain why the content is safe.

Return ONLY valid JSON in this exact schema:

{
  "toxic": true or false,
  "confidence": 0.0 to 1.0,
  "severity": "low" | "medium" | "high",
  "category": ["category names"],
  "detected_phrases": ["exact words or phrases"],
  "explanation": "One or two clear sentences explaining the decision"
}

Rules:
- No markdown.
- No extra text outside JSON.
- Explanation must be meaningful and specific.
""".strip()

# =====================================================
# MODEL CAPABILITY CHECK
# =====================================================

def _supports_system_role(model: str) -> bool:
    """
    Gemma models do NOT support system role.
    LLaMA / Qwen / Mistral DO support it.
    """
    model = model.lower()
    if "gemma" in model:
        return False
    return True

# =====================================================
# MAIN API (THROTTLED + CACHED)
# =====================================================

def analyze_toxicity_llm(text: str) -> dict:
    """
    Uses LLM to analyze toxicity with explainability.
    Throttled + cached to prevent rate limits.
    """

    global _last_llm_time, _last_prompt, _last_llm_result

    now = time.time()

    # ---------------- Fast cache hit ----------------
    with _llm_lock:
        if text == _last_prompt and _last_llm_result:
            return _last_llm_result

        # ---------------- Throttle window ----------------
        if now - _last_llm_time < LLM_COOLDOWN:
            return {
                "toxic": False,
                "confidence": 0.0,
                "severity": "low",
                "category": [],
                "detected_phrases": [],
                "explanation": "LLM throttled to prevent rate limit"
            }

    try:
        # ---------------- Build Messages Safely ----------------

        if _supports_system_role(OPENROUTER_MODEL):
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text}
            ]
        else:
            merged_prompt = f"{SYSTEM_PROMPT}\n\nUSER_TEXT:\n{text}"
            messages = [
                {"role": "user", "content": merged_prompt}
            ]

        # ---------------- LLM Call ----------------

        response = client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=messages,
            temperature=0.2,
            max_tokens=350
        )

        raw_text = response.choices[0].message.content.strip()
        parsed = _extract_json(raw_text)

        explanation = str(parsed.get("explanation", "")).strip()
        if len(explanation) < 20:
            explanation = "LLM did not provide a sufficient explanation."

        result = {
            "toxic": bool(parsed.get("toxic", False)),
            "confidence": float(parsed.get("confidence", 0.0)),
            "severity": parsed.get("severity", "low"),
            "category": parsed.get("category", []),
            "detected_phrases": parsed.get("detected_phrases", []),
            "explanation": explanation
        }

        # ---------------- Update cache safely ----------------
        with _llm_lock:
            _last_llm_time = time.time()
            _last_prompt = text
            _last_llm_result = result

        return result

    except Exception as e:
        print("⚠️ LLM Error:", e)

        return {
            "toxic": False,
            "confidence": 0.0,
            "severity": "low",
            "category": [],
            "detected_phrases": [],
            "explanation": "LLM unavailable or parsing failed"
        }
