import pandas as pd
import random
import os

# ---------------- Word Banks ----------------

abusive_words = [
    "idiot","stupid","loser","trash","jerk","pathetic","dumb",
    "useless","nonsense","creep","ugly","annoying"
]

toxic_words = [
    "fuck","motherfucker","bitch","asshole","kill",
    "die","go to hell","bastard","shit","slut","whore"
]

positive_words = [
    "great","amazing","nice","wonderful","awesome","happy",
    "fantastic","positive","helpful","kind","brilliant",
    "excellent","lovely","peaceful","respectful"
]

verbs = [
    "are","seem","look","feel","sound","behave like","act like"
]

targets = [
    "you","he","she","they","this person","that guy","my friend",
    "your idea","your work","your behavior"
]

prefix = ["", "honestly ", "seriously ", "bro ", "man ", "hey ", "yo "]
suffix = ["", "!", "!!", ".", " bro", " lol", " 😡", " 🙂"]

fillers = ["", " really", " sometimes", " kind of", " maybe", " honestly"]

# ---------------- Noise Injection ----------------

def typo(word):
    """Create spelling noise"""
    if len(word) < 4:
        return word
    i = random.randint(1, len(word)-2)
    return word[:i] + random.choice("0123456789") + word[i+1:]

def random_noise(text):
    if random.random() < 0.25:
        text = typo(text)
    if random.random() < 0.25:
        text = text.upper()
    return text

# ---------------- Sentence Builder ----------------

def random_sentence(label):

    base = (
        random.choice(prefix)
        + random.choice(targets) + " "
        + random.choice(verbs)
    )

    # ---------- POSITIVE ----------
    if label == "positive":
        word = random.choice(positive_words)
        sentence = base + " " + word

    # ---------- ABUSIVE ----------
    elif label == "abusive":
        word = random.choice(abusive_words)
        sentence = base + " " + word

    # ---------- TOXIC (MIXED) ----------
    else:
        toxic = random.choice(toxic_words)
        positive = random.choice(positive_words)
        abusive = random.choice(abusive_words)

        mix_type = random.choice(["toxic_only", "toxic_plus_positive", "toxic_plus_abuse"])

        if mix_type == "toxic_only":
            sentence = base + " " + toxic

        elif mix_type == "toxic_plus_positive":
            sentence = f"{base} {toxic} but {positive}"

        else:
            sentence = f"{base} {abusive} and {toxic}"

    sentence += random.choice(fillers)
    sentence += random.choice(suffix)

    return random_noise(sentence.strip())

# ---------------- Dataset Generation ----------------

rows = []
seen = set()

TARGET_PER_CLASS = 1200
labels = ["positive", "abusive", "toxic"]
counts = {label: 0 for label in labels}

while min(counts.values()) < TARGET_PER_CLASS:
    label = random.choice(labels)
    text = random_sentence(label)

    if text.lower() in seen:
        continue

    seen.add(text.lower())
    rows.append({
        "text": text,
        "label": label
    })

    counts[label] += 1

df = pd.DataFrame(rows)

os.makedirs("data", exist_ok=True)
df.to_csv("data/sample_data.csv", index=False)

print("✅ Dataset created")
print("Total rows:", len(df))
print("Class distribution:")
print(df["label"].value_counts())
print("\nSample rows:")
print(df.sample(10))
