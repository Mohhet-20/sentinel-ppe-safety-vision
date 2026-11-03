"""
Video upload validation, mirroring app/utils/image_validation.py.
"""
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import AppError

VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv"}


class InvalidVideoError(AppError):
    def __init__(self, message: str = "The uploaded file is not a valid/readable video") -> None:
        super().__init__(message, code="invalid_video", status_code=422)


class UnsupportedVideoFormatError(AppError):
    def __init__(self, message: str = "Unsupported video format") -> None:
        super().__init__(message, code="unsupported_media_type", status_code=415)


class FileTooLargeError(AppError):
    def __init__(self, message: str = "File exceeds the maximum allowed size") -> None:
        super().__init__(message, code="file_too_large", status_code=413)


def validate_video_upload_metadata(file: UploadFile) -> None:
    if not file.filename:
        raise InvalidVideoError("Upload is missing a filename")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in VIDEO_EXTENSIONS:
        raise UnsupportedVideoFormatError(
            f"'{suffix or 'unknown'}' is not supported. Allowed types: {', '.join(sorted(VIDEO_EXTENSIONS))}"
        )


def validate_saved_video_size(path: Path) -> None:
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024 * 4  # videos get a larger budget than images
    size = path.stat().st_size
    if size == 0:
        raise InvalidVideoError("Uploaded file is empty")
    if size > max_bytes:
        raise FileTooLargeError(f"File is {size / (1024 * 1024):.1f} MB, exceeds the {max_bytes / (1024 * 1024):.0f} MB limit")


def open_video_capture(path: Path):
    """Returns an opened cv2.VideoCapture, or raises InvalidVideoError."""
    import cv2  # noqa: PLC0415

    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        capture.release()
        raise InvalidVideoError("The video could not be opened — it may be corrupt or use an unsupported codec")
    return capture
