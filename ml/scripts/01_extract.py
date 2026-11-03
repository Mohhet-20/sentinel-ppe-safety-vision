"""Extract only the needed members of each PPE dataset zip to E:\\PPE_DATASETS\\raw."""
import os
import zipfile
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import DS1_ZIP, DS2_ZIP, DS3_ZIP, RAW_DIR


def extract_filtered(zip_path, dest_dir, keep_prefixes, skip_suffixes=()):
    os.makedirs(dest_dir, exist_ok=True)
    with zipfile.ZipFile(zip_path) as z:
        members = [
            n for n in z.namelist()
            if not n.endswith("/")
            and any(n.startswith(p) for p in keep_prefixes)
            and not any(n.endswith(s) for s in skip_suffixes)
        ]
        print(f"{zip_path}: extracting {len(members)} members to {dest_dir}")
        for i, m in enumerate(members):
            z.extract(m, dest_dir)
            if (i + 1) % 5000 == 0:
                print(f"  {i + 1}/{len(members)}")
    print(f"  done: {len(members)} files")


if __name__ == "__main__":
    ds1_dir = os.path.join(RAW_DIR, "ds1")
    ds2_dir = os.path.join(RAW_DIR, "ds2")
    ds3_dir = os.path.join(RAW_DIR, "ds3")

    if os.path.isdir(ds1_dir) and os.listdir(ds1_dir):
        print("ds1 already extracted, skipping")
    else:
        extract_filtered(DS1_ZIP, ds1_dir, keep_prefixes=["images/", "labels/"])

    if os.path.isdir(ds2_dir) and os.listdir(ds2_dir):
        print("ds2 already extracted, skipping")
    else:
        extract_filtered(
            DS2_ZIP, ds2_dir,
            keep_prefixes=["train/", "valid/", "test/", "data.yaml"],
        )

    if os.path.isdir(ds3_dir) and os.listdir(ds3_dir):
        print("ds3 already extracted, skipping")
    else:
        extract_filtered(DS3_ZIP, ds3_dir, keep_prefixes=["css-data/"])

    print("Extraction complete.")
