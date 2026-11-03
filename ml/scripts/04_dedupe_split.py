"""
Dedupe staged images by content hash (prevents train/val/test leakage from
identical images appearing more than once, e.g. re-exported across roboflow
splits), then assign each unique image to train/val/test by hashing its uid
(deterministic 80/10/10 split), and materialize the final dataset under
F:\\safety-platform\\ml\\dataset\\{images,labels}\\{train,valid,test}.
"""
import hashlib
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import STAGING_IMAGES, STAGING_LABELS, DATASET_DIR

SPLIT_RATIOS = {"train": 0.8, "valid": 0.1, "test": 0.1}


def sha256_of(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def assign_split(uid):
    """Deterministic split assignment based on a hash of the uid."""
    v = int(hashlib.md5(uid.encode()).hexdigest(), 16) / 16**32
    if v < SPLIT_RATIOS["train"]:
        return "train"
    if v < SPLIT_RATIOS["train"] + SPLIT_RATIOS["valid"]:
        return "valid"
    return "test"


def main():
    image_files = sorted(os.listdir(STAGING_IMAGES))
    print(f"Hashing {len(image_files)} staged images for dedup...")

    seen_hashes = {}
    duplicates = []
    for i, fname in enumerate(image_files):
        path = os.path.join(STAGING_IMAGES, fname)
        h = sha256_of(path)
        if h in seen_hashes:
            duplicates.append(fname)
        else:
            seen_hashes[h] = fname
        if (i + 1) % 5000 == 0:
            print(f"  hashed {i + 1}/{len(image_files)}")

    unique_files = list(seen_hashes.values())
    print(f"Unique images: {len(unique_files)}  |  duplicates dropped: {len(duplicates)}")

    for d in ("images", "labels"):
        for s in ("train", "valid", "test"):
            os.makedirs(os.path.join(DATASET_DIR, d, s), exist_ok=True)

    split_counts = {"train": 0, "valid": 0, "test": 0}
    for fname in unique_files:
        stem, ext = os.path.splitext(fname)
        split = assign_split(stem)
        split_counts[split] += 1

        src_img = os.path.join(STAGING_IMAGES, fname)
        src_lbl = os.path.join(STAGING_LABELS, stem + ".txt")
        dst_img = os.path.join(DATASET_DIR, "images", split, fname)
        dst_lbl = os.path.join(DATASET_DIR, "labels", split, stem + ".txt")

        shutil.copyfile(src_img, dst_img)
        if os.path.isfile(src_lbl):
            shutil.copyfile(src_lbl, dst_lbl)
        else:
            open(dst_lbl, "w").close()

    print()
    for s, c in split_counts.items():
        print(f"{s}: {c} images")
    print(f"Total: {sum(split_counts.values())}")


if __name__ == "__main__":
    main()
