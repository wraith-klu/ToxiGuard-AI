import os
import json
import re
from dotenv import load_dotenv
from openai import OpenAI

# =====================================================
# LOAD ENVIRONMENT
# =====================================================
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_PATH)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv(
    "OPENROUTER_MODEL",
    "xiaomi/mimo-v2-flash:free"
)

if not OPENROUTER_API_KEY:
    raise RuntimeError("OPENROUTER_API_KEY not found in environment")

# =====================================================
# OPENROUTER CLIENT
# =====================================================
client = OpenAI(
    api_key=OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
    timeout=15.0
)

# =====================================================
# INTERNAL HELPERS
# =====================================================

def _extract_json(text: str) -> dict:
    """
    Safely extract JSON from LLM response.
    Handles accidental markdown or extra text.
    """
    try:
        return json.loads(text)
    except Exception:
        pass

    # Try extracting JSON block
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            pass

    return {}


# =====================================================
# MAIN API
# =====================================================

def analyze_toxicity_llm(text: str) -> dict:
    """
    Uses LLM to analyze toxicity and intent.
    Returns normalized structured output.
    """

    prompt = f"""
You are a strict content moderation system.

Analyze the text below and respond ONLY with valid JSON:

{{
  "toxic": true or false,
  "severity": "low" or "medium" or "high",
  "reason": "short explanation",
  "confidence": number between 0 and 1
}}

Text:
{text}
""".strip()

    try:
        response = client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=200
        )

        raw_text = response.choices[0].message.content.strip()
        parsed = _extract_json(raw_text)

        # Normalize output
        return {
            "toxic": bool(parsed.get("toxic", False)),
            "severity": parsed.get("severity", "low"),
            "reason": parsed.get("reason", "Unspecified"),
            "confidence": float(parsed.get("confidence", 0.0))
        }

    except Exception as e:
        print("⚠️ LLM Error:", e)

        # Fail-safe fallback
        return {
            "toxic": False,
            "severity": "low",
            "reason": "LLM unavailable",
            "confidence": 0.0
        }
