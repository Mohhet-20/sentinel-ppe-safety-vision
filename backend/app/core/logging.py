"""
Centralized logging configuration using Loguru.
Logs to stdout (pretty, colorized) and to a rotating file under LOG_DIR.
"""
import sys

from loguru import logger

from app.core.config import settings


def configure_logging() -> None:
    settings.log_path.mkdir(parents=True, exist_ok=True)

    logger.remove()

    logger.add(
        sys.stdout,
        level="DEBUG" if settings.DEBUG else "INFO",
        colorize=True,
        format=(
            "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
            "<level>{message}</level>"
        ),
    )

    logger.add(
        settings.log_path / "sentinel.log",
        level="INFO",
        rotation="10 MB",
        retention="14 days",
        compression="zip",
        enqueue=True,
        backtrace=False,
        diagnose=False,
    )

    logger.info(f"Logging configured — env={settings.APP_ENV}, debug={settings.DEBUG}")


__all__ = ["logger", "configure_logging"]
