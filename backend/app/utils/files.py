"""
Async file-storage helpers built on aiofiles. Used by the detection
placeholder endpoints to persist uploads without blocking the event loop.
"""
import uuid
from pathlib import Path

import aiofiles
from fastapi import UploadFile

from app.core.config import settings


async def save_upload(file: UploadFile, *, subdir: str = "") -> Path:
    target_dir = settings.upload_path / subdir if subdir else settings.upload_path
    target_dir.mkdir(parents=True, exist_ok=True)

    suffix = Path(file.filename or "").suffix
    filename = f"{uuid.uuid4().hex}{suffix}"
    target_path = target_dir / filename

    async with aiofiles.open(target_path, "wb") as out_file:
        while chunk := await file.read(1024 * 1024):
            await out_file.write(chunk)

    await file.close()
    return target_path


def human_readable_size(num_bytes: int) -> str:
    size = float(num_bytes)
    for unit in ["B", "KB", "MB", "GB"]:
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"
