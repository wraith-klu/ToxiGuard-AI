"""
ToxiGuard AI — Test Fixtures
==============================
Shared pytest fixtures for all test modules.
"""

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient


# ── APP CLIENT ────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def client():
    """FastAPI test client with mocked model service."""
    # Patch model_service before importing the app
    with patch("app.services.model_service.ModelService._load"):
        from app.main import app
        with TestClient(app) as c:
            yield c


# ── MOCK ML RESULT ────────────────────────────────────────────────────────────

@pytest.fixture
def mock_ml_result_toxic():
    return {
        "toxic": True,
        "toxicity_probability": 0.92,
        "labels": {
            "toxic": 0.92,
            "severe_toxic": 0.15,
            "obscene": 0.70,
            "threat": 0.05,
            "insult": 0.80,
            "identity_hate": 0.03,
        },
        "severity": "high",
        "detected_categories": ["toxic", "obscene", "insult"],
        "source": "transformer_onnx",
    }


@pytest.fixture
def mock_ml_result_clean():
    return {
        "toxic": False,
        "toxicity_probability": 0.04,
        "labels": {
            "toxic": 0.04,
            "severe_toxic": 0.01,
            "obscene": 0.02,
            "threat": 0.01,
            "insult": 0.03,
            "identity_hate": 0.01,
        },
        "severity": "low",
        "detected_categories": [],
        "source": "transformer_onnx",
    }


@pytest.fixture
def mock_llm_result_toxic():
    return {
        "toxic": True,
        "confidence": 0.91,
        "severity": "high",
        "category": "abusive",
        "detected_phrases": ["idiot"],
        "explanation": (
            "The message contains direct personal insults. "
            "The word 'idiot' is used to demean and belittle the recipient. "
            "This constitutes abusive behaviour targeting an individual."
        ),
    }


@pytest.fixture
def mock_llm_result_clean():
    return {
        "toxic": False,
        "confidence": 0.95,
        "severity": "low",
        "category": "safe",
        "detected_phrases": [],
        "explanation": (
            "The message expresses a personal preference about weather. "
            "There is no harmful intent or abusive language present. "
            "Context confirms this is entirely safe content."
        ),
    }
