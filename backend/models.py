# models.py

from sqlalchemy import Column, Integer, String, DateTime
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