"""Zip the merged dataset for upload to Kaggle/Colab.
Uses ZIP_STORED (no compression) since the images are already JPEG-compressed
-- this is purely I/O bound and much faster than DEFLATE at this scale.
"""
import os
import zipfile
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import DATASET_DIR, ML_ROOT

OUT_ZIP = os.path.join(ML_ROOT, "ppe_merged_dataset.zip")

if __name__ == "__main__":
    if os.path.exists(OUT_ZIP):
        os.remove(OUT_ZIP)

    file_count = 0
    with zipfile.ZipFile(OUT_ZIP, "w", compression=zipfile.ZIP_STORED, allowZip64=True) as zf:
        for root, dirs, files in os.walk(DATASET_DIR):
            for fname in files:
                full_path = os.path.join(root, fname)
                arcname = os.path.relpath(full_path, DATASET_DIR)
                zf.write(full_path, arcname)
                file_count += 1
                if file_count % 5000 == 0:
                    print(f"  zipped {file_count} files")

    size_gb = os.path.getsize(OUT_ZIP) / (1024 ** 3)
    print(f"\nDone. {file_count} files -> {OUT_ZIP} ({size_gb:.2f} GB)")
