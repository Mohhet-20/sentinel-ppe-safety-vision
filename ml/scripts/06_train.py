import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import DATASET_DIR, ML_ROOT

from ultralytics import YOLO

DATA_YAML = os.path.join(DATASET_DIR, "data_fast.yaml")
RUNS_DIR = os.path.join(ML_ROOT, "runs")

if __name__ == "__main__":
    model = YOLO("yolo11n.pt")
    model.train(
        data=DATA_YAML,
        epochs=10,
        imgsz=320,
        batch=16,
        device="cpu",
        workers=8,
        cache=False,
        mosaic=0.0,
        project=RUNS_DIR,
        name="ppe_yolo11n_fast",
        patience=10,
        exist_ok=True,
    )
