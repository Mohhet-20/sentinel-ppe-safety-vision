"""Build a stratified-by-random-sample fast subset of the merged dataset as
image-list txt files (no copying) so training can run in a fraction of the time."""
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import DATASET_DIR, UNIFIED_CLASSES

random.seed(0)

SIZES = {"train": 3000, "valid": 400, "test": 400}


def sample_split(split, n):
    images_dir = os.path.join(DATASET_DIR, "images", split)
    files = sorted(os.listdir(images_dir))
    random.shuffle(files)
    picked = files[:n]
    out_path = os.path.join(DATASET_DIR, f"{split}_fast.txt")
    with open(out_path, "w") as f:
        for fname in picked:
            f.write(os.path.join(images_dir, fname) + "\n")
    print(f"{split}: wrote {len(picked)} paths -> {out_path}")


for split, n in SIZES.items():
    sample_split(split, n)

names_block = "\n".join(f"  {i}: {name}" for i, name in enumerate(UNIFIED_CLASSES))
yaml_content = f"""path: {DATASET_DIR}
train: train_fast.txt
val: valid_fast.txt
test: test_fast.txt

nc: {len(UNIFIED_CLASSES)}
names:
{names_block}
"""
yaml_path = os.path.join(DATASET_DIR, "data_fast.yaml")
with open(yaml_path, "w") as f:
    f.write(yaml_content)
print(f"Wrote {yaml_path}")
