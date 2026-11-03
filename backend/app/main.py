"""
Sentinel backend entrypoint.

Run locally with:
    uvicorn app.main:app --reload --port 8000
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging, logger
from app.database.base import Base
from app.database.session import SessionLocal, engine
from app.services.inference_service import inference_service
from app.services.seed import run_seed
from app.websocket.routes import router as websocket_router

# Import models so they're registered on Base.metadata before create_all().
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    logger.info(f"Starting {settings.APP_NAME} ({settings.APP_ENV})")

    for directory in (settings.upload_path, settings.reports_path, settings.log_path, settings.models_path):
        directory.mkdir(parents=True, exist_ok=True)

    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ensured")

    with SessionLocal() as db:
        run_seed(db)

    # Best-effort model load — never blocks startup. If backend/models/best.pt
    # doesn't exist yet, the API still comes up; /api/inference/* will return
    # a clear 503 until a checkpoint is placed there (see models/README.md).
    if inference_service.load_model():
        logger.info(f"AI model ready: {settings.model_path}")
    else:
        logger.warning(
            f"AI model not loaded ({inference_service.load_error}). "
            f"Place a checkpoint at '{settings.model_path}' — it will be picked up automatically."
        )

    logger.info("Startup complete")
    yield
    logger.info("Shutting down Sentinel backend")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Enterprise AI Workplace Safety Platform — backend with a YOLOv8 PPE inference pipeline.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)
app.include_router(websocket_router)

# Serves saved uploads + annotated images so the frontend can render/download
# them directly, e.g. GET /uploads/images/annotated/<file>.jpg
settings.upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(settings.upload_path)), name="uploads")


@app.get("/", tags=["Root"])
def root() -> dict:
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health",
    }
