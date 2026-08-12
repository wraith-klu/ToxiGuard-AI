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
    "bhadwe", "chodu", "kutti", "kutte", "dogla", "dogle",
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
    # ── CRITICAL ──────────────────────────────────────────────────────────────
    "motherfucker":  "Try 'frustrating person' or describe the specific behavior.",
    "cunt":          "Replace with 'rude person' or state what upset you specifically.",
    "madarchod":     "Express frustration without insults — say what the issue actually is.",
    "behenchod":     "Describe the situation calmly instead of using slurs.",
    "bhenchod":      "Describe the situation calmly instead of using slurs.",
    "bhosdike":      "State your concern directly without abusive language.",
    "chutiya":       "Try 'clueless' or 'not thinking clearly'.",
    "chutiye":       "Try 'clueless' or 'not thinking clearly'.",
    "gandu":         "Say 'irresponsible' or 'acting recklessly'.",
    "gaandu":        "Say 'irresponsible' or 'acting recklessly'.",

    # ── HIGH ──────────────────────────────────────────────────────────────────
    "fuck":          "Say 'I'm really frustrated' or 'this is unacceptable'.",
    "fucking":       "Replace with 'extremely' or 'very' to keep the emphasis.",
    "fucked":        "Try 'ruined', 'broken', or 'messed up'.",
    "fucker":        "Describe the behavior: 'this person acted badly'.",
    "fucks":         "Express the issue: 'nobody cares' → 'nobody seems to notice'.",
    "shit":          "Use 'problem', 'mess', or 'terrible situation'.",
    "bullshit":      "Try 'completely wrong', 'misleading', or 'untrue'.",
    "asshole":       "Describe the action — 'rude', 'inconsiderate', or 'selfish'.",
    "bitch":         "Use 'difficult person' or describe what they did specifically.",
    "bastard":       "Try 'dishonest person' or focus on the behavior, not the person.",
    "slut":          "Avoid this entirely — it's degrading. Describe actions instead.",
    "whore":         "Avoid this entirely — it's dehumanizing. State your concern respectfully.",
    "dick":          "Try 'rude' or 'inconsiderate person'.",
    "dickhead":      "Say 'thoughtless' or 'acting without care'.",
    "prick":         "Use 'irritating' or 'unpleasant to deal with'.",
    "pussy":         "Try 'cowardly' or 'lacking confidence' if that's what you mean.",
    "scumbag":       "Say 'dishonest person' or 'someone who acts badly'.",
    "cum":           "Avoid sexual language in conversation — keep it appropriate.",
    "douche":        "Try 'arrogant' or 'self-important'.",
    "lund":          "Avoid vulgar language — express your point clearly.",
    "lodu":          "Try 'foolish' or 'not thinking straight'.",
    "lawde":         "Express your frustration without using slang — say what's wrong.",
    "lavde":         "Express your frustration without using slang — say what's wrong.",
    "randi":         "Avoid this slur — it's degrading. Describe the behavior respectfully.",
    "kamina":        "Say 'sneaky', 'dishonest', or 'acting badly'.",
    "kaminey":       "Say 'sneaky', 'dishonest', or 'acting badly'.",
    "harami":        "Try 'unethical', 'untrustworthy', or 'acting wrongly'.",
    "haramkhor":     "Say 'exploitative' or 'taking unfair advantage'.",
    "bhadwe":        "Avoid this slur — describe what happened objectively.",
    "chodu":         "Express disagreement calmly without using vulgar language.",
    "kutti":         "Try 'rude' or 'acting disrespectfully'.",
    "kutte":         "Try 'acting without manners' or 'disrespectful'.",
    "dogla":         "Try 'two-faced', 'dishonest', or 'hypocritical'.",
    "dogle":         "Try 'two-faced', 'dishonest', or 'hypocritical'.",

    # ── MODERATE ─────────────────────────────────────────────────────────────
    "idiot":         "Try 'misinformed', 'confused', or 'made an error'.",
    "stupid":        "Use 'unwise', 'poorly thought out', or 'not a good idea'.",
    "dumb":          "Say 'unclear', 'not well reasoned', or 'mistaken'.",
    "moron":         "Try 'making a mistake' or 'not understanding the situation'.",
    "fool":          "Say 'acting without thinking' or 'made a poor choice'.",
    "loser":         "Try 'struggling right now' or 'having a rough time'.",
    "worthless":     "Say 'unhelpful', 'ineffective', or 'not working well'.",
    "pathetic":      "Use 'disappointing', 'inadequate', or 'falling short'.",
    "jerk":          "Try 'unkind', 'inconsiderate', or 'acting rudely'.",
    "trash":         "Say 'low quality', 'unacceptable', or 'poorly done'.",
    "degenerate":    "Describe the behavior specifically rather than labeling the person.",
    "psycho":        "Avoid stigmatizing language — say 'acting erratically' or 'unpredictably'.",
    "maniac":        "Try 'extremely reckless' or 'acting dangerously'.",
    "go die":        "Express that you're done with the conversation: 'I'm done talking to you'.",
    "drop dead":     "Say 'I don't want to speak to you anymore' calmly.",
    "go to hell":    "Express frustration as: 'I'm very upset with you' or 'this is unacceptable'.",
    "burn in hell":  "Say 'I'm extremely disappointed in you' — convey the feeling without threats.",
    "you suck":      "Be specific: 'you handled this poorly' or 'I'm disappointed in this'.",
    "shut up":       "Try 'please stop' or 'I'd like to finish speaking'.",
    "get lost":      "Say 'please leave me alone' or 'I need some space'.",
    "nobody cares":  "Try 'this doesn't seem relevant here' or 'others may disagree'.",
    "who asked":     "Say 'I didn't ask for this input' or simply ignore the comment.",
    "pagal":         "Try 'confused', 'acting oddly', or 'behaving strangely'.",
    "bewakoof":      "Say 'mistaken', 'incorrect', or 'poorly informed'.",
    "nikamma":       "Try 'unproductive', 'not contributing', or 'ineffective'.",
    "nalayak":       "Say 'irresponsible', 'unreliable', or 'not fulfilling duties'.",
    "bakwas":        "Try 'nonsense', 'irrelevant', or 'not making sense'.",
    "bakwaas":       "Try 'nonsense', 'irrelevant', or 'not making sense'.",
    "ghatiya":       "Say 'low quality', 'substandard', or 'poorly done'.",
    "gadha":         "Try 'stubborn', 'not listening', or 'being unreasonable'.",
    "ullu":          "Say 'being fooled', 'naive', or 'not paying attention'.",
    "bhikari":       "Avoid classist language — describe the situation instead.",
    "tatti":         "Try 'terrible', 'very bad quality', or 'completely wrong'.",
    "andhbhakt":     "Say 'blindly following' or 'not thinking critically'.",
    "sala":          "Express frustration directly: 'this is very frustrating'.",
    "saala":         "Express frustration directly: 'this is very frustrating'.",
    "saali":         "Avoid this term — describe the specific issue instead.",
    "sale":          "Try 'dishonest', 'untrustworthy', or describe the behavior.",
    "dalle":         "Avoid slang — describe the behavior or issue directly.",
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
