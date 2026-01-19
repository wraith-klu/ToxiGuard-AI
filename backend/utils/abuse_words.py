# abuse_words.py
import re

abusive_words = {

    # ---------- ENGLISH: STRONG PROFANITY ----------
    "fuck","fucking","fucked","fucker","motherfucker","mf",
    "shit","bullshit","crap","asshole","ass","bitch",
    "bastard","cunt","slut","whore","dick","dickhead",
    "prick","pussy","scumbag",

    # ---------- ENGLISH: OBFUSCATED ----------
    "f*ck","f**k","fuk","fuking","fuked","fuker",
    "sh*t","bullsh*t","a**hole","a$$hole","b!tch",

    # ---------- ENGLISH: INSULTS ----------
    "idiot","stupid","dumb","moron","fool","foolish",
    "loser","worthless","pathetic","ugly","jerk","trash",
    "garbage","nonsense","cringe","lame","weirdo","creep",
    "psycho","maniac","nutcase","degenerate",

    # ---------- ENGLISH: TOXIC / THREATS ----------
    "hate","kill","murder","die","go die","drop dead",
    "go to hell","burn in hell","suck","you suck",
    "shut up","get lost","nobody cares","who asked",

    # ---------- ENGLISH: NEGATIVE BEHAVIOR ----------
    "annoying","irritating","frustrating","frustrated",
    "rude","mean","cruel","vile","nasty","disgusting",
    "horrible","terrible","awful","disrespectful",

    # ---------- ENGLISH: PERSONAL ATTACK ----------
    "sissy","wimp","geek","nerd","pig","dog","rat",

    # ---------- HINDI / HINGLISH: STRONG ----------
    "madarchod","behenchod","bhenchod","bhosdike",
    "chutiya","chutiye","gandu","gaandu","lund",
    "lodu","lawde","lavde","randi","kamina",
    "kaminey","harami","haramkhor","bhadwe",
    "chodu","kutti","kutte",

    # ---------- HINDI: OBFUSCATED ----------
    "m*darchod","behen***d","b***dike","ch*tiya",
    "g*ndu","l*nd","l*d*u","bkl","bc",

    # ---------- HINDI: INSULTS ----------
    "pagal","bewakoof","nikamma","nalayak","bakwas",
    "bakwaas","ghatiya","gadha","ullu","bhikari",
    "tatti","andhbhakt","sala","saala","saali",
    "idiot","stupid","dumb","hate","kill","loser",
    "pathetic","ugly","shit", "murder",
    "fool","trash","nonsense","moron","jerk","worthless",
    "suck","sh*t","bastard","crap","damn","hell",
    "foolish","f**k","go to hell","bitch","asshole",
    "a**hole","fuck","fucking","fucked","fucker","fucks",
    "fuk","fuking","fuked","fuker","motherf**ker","ass",
    "piss","wtf","chodu","madarchod","randi","behenchod",
    "lund","gandu","bhosdike","bhadwe","sala","chutiya","pagal",
    "bewakoof)","harami", "kaminey", "kutte", "lodu",
    "bullshit", "bullsh*t", "andhbhakt", "tatti", "bakwas", 
    "bkl", "bc", "lawde", "frustrated", "frustrating", "irritating",
    "annoying", "disrespectful", "rude", "mean", "cruel", 
    "vile", "horrible", "terrible", "awful", "nasty",
    "disgusting", "pathetic", "sissy", "wimp", "loser", "geek", 
    "nerd", "motherfucker", "sale", "dalle"
}

# Normalize all words
abusive_words = set(word.lower() for word in abusive_words)

# SUGGESTED REPLACEMENTS

suggestions = {
    "idiot": "Try saying 'misinformed' or 'confused'.",
    "stupid": "Use 'unwise' or 'not a good idea'.",
    "dumb": "Try 'not well thought out'.",
    "loser": "Say 'unlucky' or 'didn’t succeed this time'.",
    "pathetic": "You could say 'disappointing'.",
    "hate": "Replace with 'dislike' or 'prefer not to'.",
    "kill": "Say 'stop' or 'end' instead.",
    "shit": "Use 'problem' or 'mess'.",
    "fuck": "Avoid profanity; explain calmly.",
    "bitch": "Try 'rude behavior' instead.",
    "asshole": "Describe the action, not the person.",
    "chutiya": "Avoid insults; express disagreement politely.",
    "gandu": "Avoid slang; state your concern respectfully.",
    "harami": "Say 'unethical' or 'wrong behavior'.",
    "pagal": "Use 'confused' or 'acting oddly'.",
    "bewakoof": "Say 'mistaken' or 'incorrect'.",
    "madarchod": "Avoid abusive language; stay respectful.",
    "behenchod": "Avoid slurs; express frustration calmly."
}


def detect_abusive_tokens(text: str):
    """
    Detect abusive words & phrases (normal + obfuscated + Hinglish)
    """
    text_lower = text.lower()
    found = set()

    for word in abusive_words:

        # If phrase contains space → direct match
        if " " in word:
            if word in text_lower:
                found.add(word)
        else:
            # Word boundary for single tokens
            pattern = r"\b" + re.escape(word) + r"\b"
            if re.search(pattern, text_lower):
                found.add(word)

    return sorted(found)
