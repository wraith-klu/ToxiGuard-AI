"""
ToxiGuard AI — Model Retraining Pipeline
=========================================
Retrains the legacy classifier model using historical baseline data combined
with newly collected active learning feedback samples.

Process:
  1. Retrieve all unreviewed feedback corrections from DB.
  2. Parse baseline dataset (data/sample_data.csv).
  3. Transform user feedback into format compatible with the baseline:
     - If user corrected to TOXIC -> label is 'toxic'
     - If user corrected to SAFE  -> label is 'clean'
  4. Append corrections to training data.
  5. Fit the scikit-learn pipeline (TF-IDF + Logistic Regression).
  6. Save updated model checkpoint.
  7. Hot-reload model in ModelService.
  8. Mark feedback samples as reviewed.
"""

from __future__ import annotations

import os
import joblib
import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.logger import logger
from app.services.model_service import model_service
from models import FeedbackSample

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
CSV_PATH = os.path.join(BASE_DIR, "data", "sample_data.csv")
MODEL_PATH = os.path.join(BASE_DIR, "abuse_model.joblib")
ENCODER_PATH = os.path.join(BASE_DIR, "label_encoder.joblib")


def retrain_model(db: Session) -> dict:
    """
    Retrain the ML classifier with the active learning queue samples.
    """
    # 1. Fetch unreviewed corrections
    feedback_samples = (
        db.query(FeedbackSample)
        .filter(FeedbackSample.reviewed == False)
        .all()
    )

    if not feedback_samples:
        return {
            "status": "ignored",
            "message": "No new unreviewed feedback samples found. Model is already up to date.",
            "count": 0
        }

    logger.info(f"[Retrainer] Starting retraining with {len(feedback_samples)} feedback samples...")

    # 2. Load baseline CSV
    if not os.path.exists(CSV_PATH):
        raise FileNotFoundError(f"Baseline dataset not found at: {CSV_PATH}")

    df_base = pd.read_csv(CSV_PATH)
    
    # 3. Load model structures
    if not os.path.exists(MODEL_PATH) or not os.path.exists(ENCODER_PATH):
        raise FileNotFoundError("Model or Encoder joblib file not found.")

    pipeline = joblib.load(MODEL_PATH)
    encoder = joblib.load(ENCODER_PATH)

    # 4. Process user feedback samples
    new_rows = []
    for sample in feedback_samples:
        label = "toxic" if sample.correct_label else "clean"
        # Map baseline equivalent labels
        new_rows.append({
            "text": sample.input_text,
            "label": label
        })
    
    df_new = pd.DataFrame(new_rows)
    df_combined = pd.concat([df_base, df_new], ignore_index=True)

    # 5. Prepare inputs
    X = df_combined["text"].fillna("").astype(str).values
    y_raw = df_combined["label"].values

    # Clean label mapping: map toxic classes to 'toxic', others to 'clean'
    TOXIC_LABELS = {
        "abusive", "toxic", "severe_toxic", "obscene", "threat",
        "insult", "identity_hate", "hate", "spam"
    }
    y_mapped = []
    for val in y_raw:
        val_str = str(val).strip().lower()
        if val_str in TOXIC_LABELS:
            y_mapped.append("toxic")
        else:
            y_mapped.append("clean")

    # Fit encoder target
    y = encoder.transform(y_mapped)

    # 6. Fit the pipeline
    pipeline.fit(X, y)

    # 7. Save model checkpoints
    joblib.dump(pipeline, MODEL_PATH)
    logger.info(f"[Retrainer] Model saved successfully to: {MODEL_PATH}")

    # 8. Hot-reload the prediction service
    model_service._load()
    logger.info("[Retrainer] Unified ModelService hot-reloaded successfully.")

    # 9. Mark samples as reviewed
    for sample in feedback_samples:
        sample.reviewed = True
    db.commit()

    return {
        "status": "success",
        "message": f"Successfully retrained legacy model using {len(feedback_samples)} feedback samples. Model is now updated.",
        "samples_retrained": len(feedback_samples),
        "timestamp": datetime.utcnow().isoformat()
    }
