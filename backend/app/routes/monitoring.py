"""
ToxiGuard AI — Monitoring Endpoints
=====================================
GET /monitoring/stats  — Live model health metrics + drift alert
GET /monitoring/drift  — Time-series confidence data for charting
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.routes.auth import get_api_user
from app.core.limiter import limiter
from app.core.logger import logger
from app.services.drift_monitor import drift_monitor
from models import User
from database import get_db

router = APIRouter()


@router.get("/monitoring/stats", tags=["Monitoring"])
@limiter.limit("30/minute")
def get_monitoring_stats(
    request: Request,
    user: User = Depends(get_api_user),
    db: Session = Depends(get_db),
):
    """
    Live model monitoring dashboard data.

    Returns rolling window statistics, drift detection result,
    toxic rate, severity breakdown, and hourly request volume.
    """
    logger.info(f"[/monitoring/stats] user={user.email}")
    return drift_monitor.get_stats(db)


@router.get("/monitoring/drift", tags=["Monitoring"])
@limiter.limit("20/minute")
def get_drift_series(
    request: Request,
    limit: int = 100,
    user: User = Depends(get_api_user),
    db: Session = Depends(get_db),
):
    """
    Time-series of confidence scores for the drift trend chart.
    Use `limit` query param (default 100, max 500).
    """
    limit = min(limit, 500)
    logger.info(f"[/monitoring/drift] user={user.email} limit={limit}")
    return {
        "series": drift_monitor.get_drift_series(db, limit=limit),
        "limit": limit,
    }
