"""
ToxiGuard AI — API Integration Tests
=====================================
Tests for route handlers, rate limiting, and dependency overrides.
"""

import pytest
from unittest.mock import MagicMock, patch
from fastapi import FastAPI
from app.routes.auth import get_api_user
from database import get_db
from models import User
from app.services.model_service import model_service


# ──────────────────────────────────────────────────────────────────────────────
# FIXTURES
# ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_user():
    return User(
        id=1,
        email="testuser@example.com",
        api_key="test-api-key-12345",
        plan="free",
        usage_count=5,
    )


@pytest.fixture
def mock_db():
    db = MagicMock()
    return db


# ──────────────────────────────────────────────────────────────────────────────
# TESTS
# ──────────────────────────────────────────────────────────────────────────────

# 1. Test Root endpoint '/'
def test_read_root(client):
    response = client.get("/")
    assert response.status_code == 200
    json_data = response.json()
    assert "status" in json_data
    assert "version" in json_data
    assert json_data["status"] == "ToxiGuard AI running"


# 2. Test Health endpoint '/health'
def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "healthy"
    assert "model" in json_data
    assert "endpoints" in json_data


# 3. Test Public prediction '/predict/demo' with clean text
def test_predict_demo_clean(client, mock_ml_result_clean):
    with patch.object(model_service, "predict", return_value=mock_ml_result_clean) as mock_predict, \
         patch.object(model_service, "model_type", "transformer_onnx"):
        
        response = client.post("/predict/demo", json={"text": "I love beautiful sunny days!"})
        assert response.status_code == 200
        json_data = response.json()
        assert json_data["toxic"] is False
        assert json_data["confidence"] == mock_ml_result_clean["toxicity_probability"]
        assert json_data["demo"] is True
        mock_predict.assert_called_once()


# 4. Test Public prediction '/predict/demo' with toxic text (rules)
def test_predict_demo_toxic_rules(client, mock_ml_result_clean):
    with patch.object(model_service, "predict", return_value=mock_ml_result_clean) as mock_predict, \
         patch.object(model_service, "model_type", "transformer_onnx"):
        
        # 'madarchod' triggers rules immediately
        response = client.post("/predict/demo", json={"text": "you are a complete madarchod!"})
        assert response.status_code == 200
        json_data = response.json()
        assert json_data["toxic"] is True
        assert "madarchod" in json_data["abusive_words"]
        assert json_data["severity"] == "medium"


# 5. Test Authenticated prediction '/predict/ml' using overrides
def test_predict_ml_only_authenticated(client, mock_user, mock_db, mock_ml_result_toxic):
    # Retrieve the FastAPI app instance from the test client to apply overrides
    from app.main import app
    
    app.dependency_overrides[get_api_user] = lambda: mock_user
    app.dependency_overrides[get_db] = lambda: mock_db

    try:
        with patch.object(model_service, "predict", return_value=mock_ml_result_toxic) as mock_predict, \
             patch.object(model_service, "model_type", "transformer_onnx"):
            
            response = client.post("/predict/ml", json={"text": "some toxic comment"})
            assert response.status_code == 200
            json_data = response.json()
            assert json_data["user"] == "testuser@example.com"
            assert json_data["toxic"] is True
            assert json_data["severity"] == "high"
            assert json_data["llm_used"] is False
            
            # Verify usage count increment and commit
            assert mock_user.usage_count == 6
            mock_db.commit.assert_called_once()
            mock_predict.assert_called_once()

    finally:
        # Clean up dependency overrides
        app.dependency_overrides.clear()


# 6. Test Authenticated prediction '/predict' full pipeline (no LLM triggered)
def test_predict_full_no_llm(client, mock_user, mock_db, mock_ml_result_clean):
    from app.main import app
    app.dependency_overrides[get_api_user] = lambda: mock_user
    app.dependency_overrides[get_db] = lambda: mock_db

    try:
        with patch.object(model_service, "predict", return_value=mock_ml_result_clean) as mock_predict, \
             patch.object(model_service, "model_type", "transformer_onnx"):
            
            response = client.post("/predict", json={"text": "nice weather"})
            assert response.status_code == 200
            json_data = response.json()
            assert json_data["toxic"] is False
            assert json_data["llm_used"] is False
            mock_predict.assert_called_once()

    finally:
        app.dependency_overrides.clear()


# 7. Test Authenticated prediction '/predict' full pipeline (with LLM mock)
def test_predict_full_with_llm(client, mock_user, mock_db, mock_ml_result_toxic, mock_llm_result_toxic):
    from app.main import app
    app.dependency_overrides[get_api_user] = lambda: mock_user
    app.dependency_overrides[get_db] = lambda: mock_db

    try:
        with patch.object(model_service, "predict", return_value=mock_ml_result_toxic) as mock_predict, \
             patch("app.routes.moderation.analyze_toxicity_llm", return_value=mock_llm_result_toxic) as mock_llm, \
             patch.object(model_service, "model_type", "transformer_onnx"):
            
            response = client.post("/predict", json={"text": "you are a complete idiot"})
            assert response.status_code == 200
            json_data = response.json()
            assert json_data["toxic"] is True
            assert json_data["llm_used"] is True
            assert json_data["reason"] == mock_llm_result_toxic["explanation"]
            mock_predict.assert_called_once()
            mock_llm.assert_called_once_with("you are a complete idiot")

    finally:
        app.dependency_overrides.clear()


# 8. Test Signup success
def test_signup_success(client, mock_db):
    from app.main import app
    
    mock_db.query().filter().first.return_value = None  # user doesn't exist yet
    app.dependency_overrides[get_db] = lambda: mock_db
    
    try:
        response = client.post("/auth/signup", json={"email": "newuser@example.com", "password": "securepassword123"})
        assert response.status_code == 201
        json_data = response.json()
        assert json_data["message"] == "Account created successfully"
        assert "api_key" in json_data
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
    finally:
        app.dependency_overrides.clear()


# 9. Test Signup validation error (e.g. short password)
def test_signup_validation_fails(client):
    response = client.post("/auth/signup", json={"email": "newuser@example.com", "password": "123"})
    assert response.status_code == 422


# 10. Test Login validation bypasses Pydantic on short/invalid inputs and goes to database
def test_login_validation_bypass(client, mock_db):
    from app.main import app
    mock_db.query().filter().first.return_value = None # user not found -> 401
    app.dependency_overrides[get_db] = lambda: mock_db
    
    try:
        # Short password that would fail signup validation should bypass login validation and return 401
        response = client.post("/auth/login", json={"email": "test@example.com", "password": "123"})
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid credentials"
        
        # Invalid email formatting that would fail signup should also bypass login validation and return 401
        response2 = client.post("/auth/login", json={"email": "invalid-email", "password": "securepassword123"})
        assert response2.status_code == 401
        assert response2.json()["detail"] == "Invalid credentials"
    finally:
        app.dependency_overrides.clear()
