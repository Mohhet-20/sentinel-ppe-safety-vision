"""
Image upload validation shared by the inference routes. Keeps error
messages consistent and makes sure a bad upload never reaches OpenCV/YOLO
unchecked (which would otherwise raise an opaque low-level exception).
"""
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import AppError


class InvalidImageError(AppError):
    def __init__(self, message: str = "The uploaded file is not a valid image") -> None:
        super().__init__(message, code="invalid_image", status_code=422)


class UnsupportedMediaError(AppError):
    def __init__(self, message: str = "Unsupported file type") -> None:
        super().__init__(message, code="unsupported_media_type", status_code=415)


class FileTooLargeError(AppError):
    def __init__(self, message: str = "File exceeds the maximum allowed size") -> None:
        super().__init__(message, code="file_too_large", status_code=413)


def validate_upload_metadata(file: UploadFile) -> None:
    """Checks filename/extension/content-type before the file is even saved."""
    if not file.filename:
        raise InvalidImageError("Upload is missing a filename")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in settings.allowed_image_extensions_list:
        raise UnsupportedMediaError(
            f"'{suffix or 'unknown'}' is not supported. Allowed types: "
            f"{', '.join(settings.allowed_image_extensions_list)}"
        )

    if file.content_type and not file.content_type.startswith("image/"):
        raise UnsupportedMediaError(f"Expected an image upload, got content-type '{file.content_type}'")


def validate_saved_file_size(path: Path) -> None:
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    size = path.stat().st_size
    if size == 0:
        raise InvalidImageError("Uploaded file is empty")
    if size > max_bytes:
        raise FileTooLargeError(f"File is {size / (1024 * 1024):.1f} MB, exceeds the {settings.MAX_UPLOAD_SIZE_MB} MB limit")


def read_image_dimensions(path: Path) -> tuple[int, int]:
    """Opens the saved file with OpenCV to confirm it's a decodable image and get (width, height)."""
    import cv2  # noqa: PLC0415  (lazy — keeps this module importable without opencv installed)

    image = cv2.imread(str(path))
    if image is None:
        raise InvalidImageError("The file could not be decoded — it may be corrupt or not a real image")

    height, width = image.shape[:2]
    return width, height
