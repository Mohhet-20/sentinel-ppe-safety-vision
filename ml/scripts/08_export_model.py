import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import ML_ROOT

SRC = os.path.join(ML_ROOT, "runs", "ppe_yolo11n_fast", "weights", "best.pt")
DST = r"F:\safety-platform\backend\models\best.pt"

if __name__ == "__main__":
    os.makedirs(os.path.dirname(DST), exist_ok=True)
    shutil.copyfile(SRC, DST)
    size_mb = os.path.getsize(DST) / (1024 * 1024)
    print(f"Copied {SRC} -> {DST} ({size_mb:.2f} MB)")
