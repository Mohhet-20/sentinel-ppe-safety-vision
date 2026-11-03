"""
Aggregates every route module under a single APIRouter, mounted in main.py
at settings.API_V1_PREFIX (default "/api").
"""
from fastapi import APIRouter

from app.api.routes import (
    analytics,
    audit,
    auth,
    cameras,
    health,
    system,
    incidents,
    inference,
    models,
    reports,
    rules,
    settings,
    workers,
    zones,
    users,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(workers.router)
api_router.include_router(incidents.router)
api_router.include_router(cameras.router)
api_router.include_router(zones.router)
api_router.include_router(rules.router)
api_router.include_router(settings.router)
api_router.include_router(inference.router)
api_router.include_router(models.router)
api_router.include_router(analytics.router)
api_router.include_router(reports.router)
api_router.include_router(audit.router)
api_router.include_router(system.router)
api_router.include_router(users.router)
