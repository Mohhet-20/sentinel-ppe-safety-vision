"""
Validate staged (image, label) pairs in-place:
  - drop label lines with out-of-range class id, non-finite/out-of-[0,1] coords,
    non-positive width/height (with small tolerance for float noise)
  - verify every image actually opens and has nonzero dimensions via PIL;
    quarantine (delete) the pair if the image is corrupt/unreadable
  - images that end up with zero valid boxes are KEPT as background/negative
    samples (empty label file) -- YOLO supports this natively
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import STAGING_IMAGES, STAGING_LABELS, UNIFIED_CLASSES

from PIL import Image

NUM_CLASSES = len(UNIFIED_CLASSES)
EPS = 1e-6

stats = {
    "images_total": 0,
    "images_corrupt_removed": 0,
    "labels_total_lines": 0,
    "labels_invalid_dropped": 0,
    "images_now_background": 0,
}


def valid_line(toks):
    if len(toks) != 5:
        return None
    try:
        cls = int(float(toks[0]))
        cx, cy, w, h = (float(t) for t in toks[1:5])
    except ValueError:
        return None
    if not (0 <= cls < NUM_CLASSES):
        return None
    if w <= EPS or h <= EPS:
        return None
    if not (-EPS <= cx <= 1 + EPS and -EPS <= cy <= 1 + EPS):
        return None
    # clip near-boundary float noise
    cx = min(max(cx, 0.0), 1.0)
    cy = min(max(cy, 0.0), 1.0)
    w = min(w, 1.0)
    h = min(h, 1.0)
    # bbox must stay within image bounds after clipping
    if cx - w / 2 < -EPS or cx + w / 2 > 1 + EPS:
        w = min(2 * cx, 2 * (1 - cx))
        if w <= EPS:
            return None
    if cy - h / 2 < -EPS or cy + h / 2 > 1 + EPS:
        h = min(2 * cy, 2 * (1 - cy))
        if h <= EPS:
            return None
    return f"{cls} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}"


def main():
    image_files = sorted(os.listdir(STAGING_IMAGES))
    stats["images_total"] = len(image_files)

    for i, fname in enumerate(image_files):
        stem = os.path.splitext(fname)[0]
        img_path = os.path.join(STAGING_IMAGES, fname)
        lbl_path = os.path.join(STAGING_LABELS, stem + ".txt")

        try:
            with Image.open(img_path) as im:
                im.verify()
            with Image.open(img_path) as im:
                w, h = im.size
            if w <= 0 or h <= 0:
                raise ValueError("zero-size image")
        except Exception:
            stats["images_corrupt_removed"] += 1
            os.remove(img_path)
            if os.path.isfile(lbl_path):
                os.remove(lbl_path)
            continue

        cleaned_lines = []
        if os.path.isfile(lbl_path):
            with open(lbl_path) as f:
                raw_lines = [l.split() for l in f if l.strip()]
            stats["labels_total_lines"] += len(raw_lines)
            for toks in raw_lines:
                out = valid_line(toks)
                if out is None:
                    stats["labels_invalid_dropped"] += 1
                else:
                    cleaned_lines.append(out)

        if not cleaned_lines:
            stats["images_now_background"] += 1

        with open(lbl_path, "w") as f:
            f.write("\n".join(cleaned_lines))
            if cleaned_lines:
                f.write("\n")

        if (i + 1) % 5000 == 0:
            print(f"  validated {i + 1}/{len(image_files)}")

    print()
    for k, v in stats.items():
        print(f"{k}: {v}")


if __name__ == "__main__":
    main()
