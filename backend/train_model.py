# train_model.py

import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.preprocessing import LabelEncoder
import joblib
from utils.preprocessing import normalize_text

df = pd.read_csv("data/sample_data.csv")

print("\nClass distribution:")
print(df["label"].value_counts())

# ---------------- Clean text ----------------
df["text"] = df["text"].astype(str).apply(normalize_text)

# ---------------- Encode labels ----------------
encoder = LabelEncoder()
df["label_encoded"] = encoder.fit_transform(df["label"])

# Save encoder for inference
joblib.dump(encoder, "label_encoder.joblib")

X = df["text"]
y = df["label_encoded"]

# ---------------- Train-test split ----------------
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

# ---------------- Pipeline ----------------
pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(
        ngram_range=(1,2),
        max_features=15000,
        min_df=2
    )),
    ("clf", LogisticRegression(
        max_iter=3000,
        class_weight="balanced",
        multi_class="auto",
        n_jobs=-1
    ))
])

# ---------------- Train ----------------
pipeline.fit(X_train, y_train)

# ---------------- Evaluate ----------------
y_pred = pipeline.predict(X_test)

print("\nClassification Report:")
print(classification_report(
    y_test,
    y_pred,
    target_names=encoder.classes_
))

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))

accuracy = pipeline.score(X_test, y_test)
print(f"\nModel accuracy: {accuracy * 100:.2f}%")

# ---------------- Save model ----------------
joblib.dump(pipeline, "abuse_model.joblib")
print("\nModel saved as 'abuse_model.joblib'")
print("Label encoder saved as 'label_encoder.joblib'")
