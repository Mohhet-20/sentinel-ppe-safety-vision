"""
Application-wide exception types and FastAPI exception handlers.
Every error response follows a consistent JSON envelope:

    { "error": { "code": "...", "message": "...", "details": ... } }
"""
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import logger


class AppError(Exception):
    """Base class for all application-raised errors."""

    def __init__(
        self,
        message: str,
        *,
        code: str = "app_error",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Any = None,
    ) -> None:
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found", details: Any = None) -> None:
        super().__init__(message, code="not_found", status_code=status.HTTP_404_NOT_FOUND, details=details)


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Authentication required", details: Any = None) -> None:
        super().__init__(message, code="unauthorized", status_code=status.HTTP_401_UNAUTHORIZED, details=details)


class ForbiddenError(AppError):
    def __init__(self, message: str = "You do not have access to this resource", details: Any = None) -> None:
        super().__init__(message, code="forbidden", status_code=status.HTTP_403_FORBIDDEN, details=details)


class ConflictError(AppError):
    def __init__(self, message: str = "Resource already exists", details: Any = None) -> None:
        super().__init__(message, code="conflict", status_code=status.HTTP_409_CONFLICT, details=details)


def _error_envelope(code: str, message: str, details: Any = None) -> dict:
    return {"error": {"code": code, "message": message, "details": details}}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        logger.warning(f"AppError on {request.method} {request.url.path}: {exc.message}")
        return JSONResponse(status_code=exc.status_code, content=_error_envelope(exc.code, exc.message, exc.details))

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_envelope("http_error", str(exc.detail)),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_error_envelope("validation_error", "Request validation failed", exc.errors()),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(f"Unhandled exception on {request.method} {request.url.path}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_envelope("internal_error", "An unexpected error occurred."),
        )
