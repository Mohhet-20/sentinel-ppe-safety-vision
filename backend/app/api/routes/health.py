"""
Health check endpoint used by load balancers / uptime monitors.
"""
from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check() -> dict:
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "env": settings.APP_ENV,
        "time": datetime.now(timezone.utc).isoformat(),
    }
