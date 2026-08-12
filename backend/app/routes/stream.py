"""
ToxiGuard AI — Real-Time WebSocket Stream Analyzer
====================================================
WebSocket /ws/stream — Accepts a continuous stream of text messages,
runs full toxicity analysis on each, and pushes results back instantly.

Protocol:
  1. Client connects to ws://host/ws/stream
  2. Client sends first message: {"type": "auth", "api_key": "tg_..."}
  3. Server responds: {"type": "auth_ok", "user": "email@example.com"}
  4. Client sends text messages: {"type": "message", "text": "hello world", "id": "msg_1"}
  5. Server streams back: {"type": "result", "id": "msg_1", "toxic": false, ...}
  6. Client sends {"type": "ping"} → server sends {"type": "pong"}
  7. Client disconnects normally

Throughput: ~50 msg/sec on CPU (ONNX inference ~20ms/msg)
"""

import json
import time
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.logger import logger
from app.core.config import settings
from app.services.calibration import calibration_service
from app.services.model_service import model_service
from app.services.drift_monitor import drift_monitor
from database import SessionLocal, get_db

from utils.preprocessing import preprocess_for_rules, preprocess_for_model
from utils.abuse_words import detect_abusive_tokens, get_abuse_severity
from models import User

router = APIRouter()


async def _authenticate(websocket: WebSocket, data: dict) -> User | None:
    """Validate API key from first WebSocket message. Returns User or None."""
    from database import SessionLocal
    from models import User

    api_key = data.get("api_key", "").strip()
    if not api_key:
        return None

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.api_key == api_key).first()
        return user
    except Exception:
        return None
    finally:
        db.close()


def _analyze_message(text: str) -> dict:
    """Run full toxicity pipeline on a single message. Returns result dict."""
    start = time.perf_counter()

    rule_text = preprocess_for_rules(text)
    model_text = preprocess_for_model(text)

    # Rule engine
    abusive_hits = detect_abusive_tokens(rule_text)
    rules_triggered = len(abusive_hits) > 0
    rules_severity = get_abuse_severity(abusive_hits) if rules_triggered else "low"

    # DeBERTa ONNX
    ml_result = model_service.predict(model_text)
    ml_score = 0.0
    labels = {}
    if ml_result:
        ml_score = float(ml_result.get("toxicity_probability", 0.0))
        labels = ml_result.get("labels", {})

    # Decision
    confidence = ml_score
    if rules_triggered:
        rule_boost = {"critical": 0.95, "high": 0.85, "moderate": 0.65}.get(rules_severity, 0.6)
        confidence = max(confidence, rule_boost)

    toxic = rules_triggered or ml_score >= calibration_service.get_threshold()

    severity = (
        "high" if confidence >= settings.severity_high
        else "medium" if confidence >= settings.severity_medium
        else "low"
    )

    latency_ms = round((time.perf_counter() - start) * 1000, 1)

    return {
        "toxic": toxic,
        "confidence": round(confidence, 3),
        "severity": severity,
        "abusive_words": abusive_hits,
        "rules_triggered": rules_triggered,
        "ml_score": round(ml_score, 3),
        "labels": labels,
        "latency_ms": latency_ms,
    }


@router.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    """
    Real-time toxicity stream analyzer.

    Accepts continuous messages, analyzes each with DeBERTa + rules,
    and pushes results back with <50ms latency.
    """
    await websocket.accept()
    user = None
    message_count = 0
    session_start = time.time()

    logger.info(f"[WS] New connection from {websocket.client.host}")

    try:
        # ── STEP 1: Auth handshake ─────────────────────────────────────────────
        raw = await websocket.receive_text()
        try:
            auth_data = json.loads(raw)
        except json.JSONDecodeError:
            await websocket.send_json({
                "type": "error",
                "message": "Invalid JSON in auth message"
            })
            await websocket.close(code=1003)
            return

        if auth_data.get("type") != "auth":
            await websocket.send_json({
                "type": "error",
                "message": "First message must be: {type: 'auth', api_key: 'tg_...'}"
            })
            await websocket.close(code=1008)
            return

        user = await _authenticate(websocket, auth_data)
        if not user:
            await websocket.send_json({
                "type": "auth_error",
                "message": "Invalid API key"
            })
            await websocket.close(code=1008)
            return

        await websocket.send_json({
            "type": "auth_ok",
            "user": user.email,
            "message": "Connected to ToxiGuard AI stream",
            "model": model_service.status.get("description", "unknown"),
        })
        logger.info(f"[WS] Authenticated: {user.email}")

        # ── STEP 2: Message loop ───────────────────────────────────────────────
        while True:
            raw = await websocket.receive_text()

            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
                continue

            msg_type = msg.get("type", "message")

            # Ping/pong keepalive
            if msg_type == "ping":
                await websocket.send_json({"type": "pong", "ts": int(time.time())})
                continue

            # Disconnect request
            if msg_type == "disconnect":
                break

            # Text analysis
            if msg_type == "message":
                text = str(msg.get("text", "")).strip()
                msg_id = msg.get("id", str(message_count))

                if not text:
                    await websocket.send_json({
                        "type": "result",
                        "id": msg_id,
                        "error": "Empty text"
                    })
                    continue

                # Enforce max length
                if len(text) > 1000:
                    text = text[:1000]

                # Run analysis
                result = _analyze_message(text)
                message_count += 1

                # Log to drift monitor (background — don't await DB here)
                try:
                    db = SessionLocal()
                    drift_monitor.log_prediction(
                        db,
                        user_id=user.id,
                        input_text=text,
                        confidence=result["confidence"],
                        toxic=result["toxic"],
                        severity=result["severity"],
                        source="websocket_stream",
                    )
                    db.close()
                except Exception:
                    pass

                await websocket.send_json({
                    "type": "result",
                    "id": msg_id,
                    "text": text,
                    "toxic": result["toxic"],
                    "confidence": result["confidence"],
                    "severity": result["severity"],
                    "abusive_words": result["abusive_words"],
                    "rules_triggered": result["rules_triggered"],
                    "latency_ms": result["latency_ms"],
                    "message_num": message_count,
                })

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.error(f"[WS] Unexpected error: {exc}")
        try:
            await websocket.send_json({"type": "error", "message": str(exc)})
        except Exception:
            pass
    finally:
        elapsed = round(time.time() - session_start, 1)
        user_email = user.email if user else "unauthenticated"
        logger.info(
            f"[WS] Disconnected: {user_email} | "
            f"messages={message_count} | duration={elapsed}s"
        )
