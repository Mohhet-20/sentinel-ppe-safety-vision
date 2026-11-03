"""
Convert all 3 raw datasets into a single pooled staging area of YOLO-bbox
(image, label) pairs with unified class ids. Handles:
  - ds1: already YOLO bbox txt, raw ids -> remap via DS1_MAP (drop unmapped)
  - ds2: YOLO *segmentation* polygons -> convert to axis-aligned bbox, remap
  - ds3: already YOLO bbox txt, raw ids -> remap via DS3_MAP

Output: F:\\safety-platform\\ml\\staging\\images\\<uid>.jpg
        F:\\safety-platform\\ml\\staging\\labels\\<uid>.txt   (may be empty -> background image)
Filenames are prefixed per source dataset+split to guarantee global uniqueness.
"""
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import RAW_DIR, STAGING_IMAGES, STAGING_LABELS, DS1_MAP, DS2_MAP, DS3_MAP

IMG_EXTS = (".jpg", ".jpeg", ".png", ".jfif", ".bmp")

stats = {
    "ds1": {"images": 0, "boxes_kept": 0, "boxes_dropped": 0},
    "ds2": {"images": 0, "boxes_kept": 0, "boxes_dropped": 0},
    "ds3": {"images": 0, "boxes_kept": 0, "boxes_dropped": 0},
}


def ensure_dirs():
    os.makedirs(STAGING_IMAGES, exist_ok=True)
    os.makedirs(STAGING_LABELS, exist_ok=True)


def write_pair(uid, src_image_path, label_lines):
    ext = os.path.splitext(src_image_path)[1].lower()
    if ext not in IMG_EXTS:
        ext = ".jpg"
    dst_image = os.path.join(STAGING_IMAGES, uid + ext)
    dst_label = os.path.join(STAGING_LABELS, uid + ".txt")
    shutil.copyfile(src_image_path, dst_image)
    with open(dst_label, "w") as f:
        f.write("\n".join(label_lines))
        if label_lines:
            f.write("\n")


def remap_bbox_line(tokens, class_map, tag):
    """tokens: [cls, cx, cy, w, h] (strings) -> remapped line or None if dropped."""
    raw_cls = int(float(tokens[0]))
    new_cls = class_map.get(raw_cls)
    if new_cls is None:
        stats[tag]["boxes_dropped"] += 1
        return None
    stats[tag]["boxes_kept"] += 1
    cx, cy, w, h = (float(t) for t in tokens[1:5])
    return f"{new_cls} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}"


def polygon_to_bbox_line(tokens, class_map, tag):
    """tokens: [cls, x1, y1, x2, y2, ...] -> bbox line or None if dropped."""
    raw_cls = int(float(tokens[0]))
    new_cls = class_map.get(raw_cls)
    if new_cls is None:
        stats[tag]["boxes_dropped"] += 1
        return None
    coords = [float(t) for t in tokens[1:]]
    xs = coords[0::2]
    ys = coords[1::2]
    if not xs or not ys:
        stats[tag]["boxes_dropped"] += 1
        return None
    xmin, xmax = min(xs), max(xs)
    ymin, ymax = min(ys), max(ys)
    cx = (xmin + xmax) / 2
    cy = (ymin + ymax) / 2
    w = xmax - xmin
    h = ymax - ymin
    stats[tag]["boxes_kept"] += 1
    return f"{new_cls} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}"


def process_ds1():
    tag = "ds1"
    root = os.path.join(RAW_DIR, "ds1")
    images_dir = os.path.join(root, "images")
    labels_dir = os.path.join(root, "labels")
    if not os.path.isdir(images_dir):
        print(f"[{tag}] not found, skipping")
        return
    for fname in os.listdir(images_dir):
        stem, ext = os.path.splitext(fname)
        if ext.lower() not in IMG_EXTS:
            continue
        img_path = os.path.join(images_dir, fname)
        lbl_path = os.path.join(labels_dir, stem + ".txt")
        lines = []
        if os.path.isfile(lbl_path):
            with open(lbl_path) as f:
                for raw_line in f:
                    toks = raw_line.split()
                    if len(toks) != 5:
                        continue
                    out = remap_bbox_line(toks, DS1_MAP, tag)
                    if out:
                        lines.append(out)
        uid = f"ds1_{stem}"
        write_pair(uid, img_path, lines)
        stats[tag]["images"] += 1


def process_ds2():
    tag = "ds2"
    root = os.path.join(RAW_DIR, "ds2")
    if not os.path.isdir(root):
        print(f"[{tag}] not found, skipping")
        return
    for split in ("train", "valid", "test"):
        images_dir = os.path.join(root, split, "images")
        labels_dir = os.path.join(root, split, "labels")
        if not os.path.isdir(images_dir):
            continue
        for fname in os.listdir(images_dir):
            stem, ext = os.path.splitext(fname)
            if ext.lower() not in IMG_EXTS:
                continue
            img_path = os.path.join(images_dir, fname)
            lbl_path = os.path.join(labels_dir, stem + ".txt")
            lines = []
            if os.path.isfile(lbl_path):
                with open(lbl_path) as f:
                    for raw_line in f:
                        toks = raw_line.split()
                        if len(toks) < 7 or len(toks) % 2 == 0:
                            continue
                        out = polygon_to_bbox_line(toks, DS2_MAP, tag)
                        if out:
                            lines.append(out)
            uid = f"ds2_{split}_{stem}"
            write_pair(uid, img_path, lines)
            stats[tag]["images"] += 1


def process_ds3():
    tag = "ds3"
    root = os.path.join(RAW_DIR, "ds3", "css-data")
    if not os.path.isdir(root):
        print(f"[{tag}] not found, skipping")
        return
    for split in ("train", "valid", "test"):
        images_dir = os.path.join(root, split, "images")
        labels_dir = os.path.join(root, split, "labels")
        if not os.path.isdir(images_dir):
            continue
        for fname in os.listdir(images_dir):
            stem, ext = os.path.splitext(fname)
            if ext.lower() not in IMG_EXTS:
                continue
            img_path = os.path.join(images_dir, fname)
            lbl_path = os.path.join(labels_dir, stem + ".txt")
            lines = []
            if os.path.isfile(lbl_path):
                with open(lbl_path) as f:
                    for raw_line in f:
                        toks = raw_line.split()
                        if len(toks) != 5:
                            continue
                        out = remap_bbox_line(toks, DS3_MAP, tag)
                        if out:
                            lines.append(out)
            uid = f"ds3_{split}_{stem}"
            write_pair(uid, img_path, lines)
            stats[tag]["images"] += 1


if __name__ == "__main__":
    ensure_dirs()
    process_ds1()
    process_ds2()
    process_ds3()
    print()
    for tag, s in stats.items():
        print(f"{tag}: images={s['images']} boxes_kept={s['boxes_kept']} boxes_dropped={s['boxes_dropped']}")
    total_images = len(os.listdir(STAGING_IMAGES))
    print(f"\nTotal staged images: {total_images}")
