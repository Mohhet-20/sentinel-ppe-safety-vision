"""
Draws bounding boxes + labels (+ track IDs) onto frames using OpenCV.
Shared by image annotation (single frame) and video annotation (per-frame,
called once per frame while re-encoding the output video).
"""
from pathlib import Path
from typing import Any

from app.schemas.detection import DetectedObject

# BGR (OpenCV order) per class-name keyword — falls back to amber for anything unmatched.
_COLOR_RULES: list[tuple[str, tuple[int, int, int]]] = [
    ("no-", (59, 59, 255)),  # danger red for any "no-<ppe>" violation class
    ("restricted", (59, 59, 255)),
    ("person", (255, 217, 0)),
    ("hardhat", (113, 204, 46)),
    ("vest", (113, 204, 46)),
    ("goggles", (113, 204, 46)),
    ("gloves", (113, 204, 46)),
    ("mask", (113, 204, 46)),
]
_DEFAULT_COLOR = (28, 159, 255)  # amber, BGR


def _color_for(class_name: str) -> tuple[int, int, int]:
    lowered = class_name.lower()
    for needle, color in _COLOR_RULES:
        if needle in lowered:
            return color
    return _DEFAULT_COLOR


def draw_boxes_on_frame(frame: Any, boxes: list[DetectedObject], *, show_track_ids: bool = True) -> Any:
    """Mutates and returns `frame` (a BGR numpy array) with boxes/labels drawn on it."""
    import cv2  # noqa: PLC0415  (lazy)

    height, width = frame.shape[:2]

    for box in boxes:
        x1 = int(box.bbox.x * width)
        y1 = int(box.bbox.y * height)
        x2 = int((box.bbox.x + box.bbox.w) * width)
        y2 = int((box.bbox.y + box.bbox.h) * height)
        color = _color_for(box.class_name)

        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

        label = f"{box.class_name} {box.confidence * 100:.0f}%"
        if show_track_ids and box.track_id:
            label = f"#{box.track_id} {label}"

        (text_w, text_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        label_y = max(y1, text_h + 6)
        cv2.rectangle(frame, (x1, label_y - text_h - 6), (x1 + text_w + 6, label_y), color, -1)
        cv2.putText(frame, label, (x1 + 3, label_y - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (17, 18, 20), 1, cv2.LINE_AA)

    return frame


def annotate_image(source_path: Path, boxes: list[DetectedObject], *, output_dir: Path) -> Path:
    import cv2  # noqa: PLC0415  (lazy)

    image = cv2.imread(str(source_path))
    if image is None:
        raise ValueError(f"Could not read image for annotation: {source_path}")

    draw_boxes_on_frame(image, boxes)

    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{source_path.stem}_annotated.jpg"
    cv2.imwrite(str(output_path), image)
    return output_path
