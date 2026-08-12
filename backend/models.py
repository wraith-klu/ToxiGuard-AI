# models.py

from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text
from datetime import datetime

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String, unique=True, index=True, nullable=False)

    password_hash = Column(String, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    # SaaS fields
    api_key = Column(String, unique=True, index=True, nullable=True)

    plan = Column(String, default="free")

    usage_count = Column(Integer, default=0)

    # Tracks the last time the user made an authenticated API request.
    # Useful for analytics, stale account cleanup, and pro dashboard UX.
    last_used = Column(DateTime, nullable=True, default=None)


class PredictionLog(Base):
    """
    Stores every /predict response for drift monitoring and analytics.
    Used by DriftMonitor to compute rolling confidence stats.
    """
    __tablename__ = "prediction_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    text_hash = Column(String, nullable=True)           # SHA256 of input (no PII)
    text_length = Column(Integer, nullable=True)
    confidence = Column(Float, nullable=False)           # 0.0–1.0 toxicity probability
    toxic = Column(Boolean, nullable=False)
    severity = Column(String, nullable=True)             # low/medium/high
    source = Column(String, nullable=True)               # transformer_onnx / rules / etc.
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)


class FeedbackSample(Base):
    """
    Active Learning feedback table.
    Users flag incorrect predictions (FP/FN) to build a correction queue.
    """
    __tablename__ = "feedback_samples"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    input_text = Column(Text, nullable=False)            # original text
    predicted_toxic = Column(Boolean, nullable=False)    # what model said
    correct_label = Column(Boolean, nullable=False)      # what user says is right
    feedback_type = Column(String, nullable=False)       # "false_positive" / "false_negative"
    confidence_at_time = Column(Float, nullable=True)    # model confidence when flagged
    notes = Column(Text, nullable=True)                  # optional user comment
    abusive_words = Column(Text, nullable=True)          # specific abusive words identified by user
    explanation = Column(Text, nullable=True)            # explanation/why it is abusive
    reviewed = Column(Boolean, default=False)            # admin reviewed flag
    created_at = Column(DateTime, default=datetime.utcnow, index=True)