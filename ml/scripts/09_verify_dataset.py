"""Final sanity check on the merged dataset before packaging for upload."""
import os
import random
import sys

import yaml

sys.path.insert(0, os.path.dirname(__file__))
from common import DATASET_DIR

random.seed(0)

with open(os.path.join(DATASET_DIR, "data.yaml")) as f:
    cfg = yaml.safe_load(f)

print("data.yaml keys:", list(cfg.keys()))
print("nc:", cfg["nc"], "names:", len(cfg["names"]))
assert "path" not in cfg, "data.yaml should NOT contain a hardcoded local path"
assert cfg["nc"] == len(cfg["names"])

ok = True
for split, rel in (("train", cfg["train"]), ("valid", cfg["val"]), ("test", cfg["test"])):
    images_dir = os.path.join(DATASET_DIR, rel)
    labels_dir = os.path.join(DATASET_DIR, "labels", split)
    if not os.path.isdir(images_dir) or not os.path.isdir(labels_dir):
        print(f"[{split}] MISSING directory")
        ok = False
        continue
    images = sorted(os.listdir(images_dir))
    labels = sorted(os.listdir(labels_dir))
    img_stems = {os.path.splitext(f)[0] for f in images}
    lbl_stems = {os.path.splitext(f)[0] for f in labels}
    missing_labels = img_stems - lbl_stems
    missing_images = lbl_stems - img_stems
    print(f"[{split}] images={len(images)} labels={len(labels)} "
          f"missing_labels={len(missing_labels)} missing_images={len(missing_images)}")
    if missing_labels or missing_images:
        ok = False

    # spot-check class ids in a random sample of label files
    sample = random.sample(labels, min(300, len(labels)))
    bad = 0
    for fname in sample:
        with open(os.path.join(labels_dir, fname)) as f:
            for line in f:
                if not line.strip():
                    continue
                cls = int(line.split()[0])
                if not (0 <= cls < cfg["nc"]):
                    bad += 1
    print(f"[{split}] out-of-range class ids in sample of {len(sample)}: {bad}")
    if bad:
        ok = False

print("\nRESULT:", "PASS" if ok else "FAIL")
