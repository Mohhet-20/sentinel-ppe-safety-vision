import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import DATASET_DIR, ML_ROOT, UNIFIED_CLASSES

from ultralytics import YOLO

BEST_PT = os.path.join(ML_ROOT, "runs", "ppe_yolo11n_fast", "weights", "best.pt")
DATA_YAML = os.path.join(DATASET_DIR, "data_fast.yaml")

if __name__ == "__main__":
    model = YOLO(BEST_PT)
    metrics = model.val(data=DATA_YAML, split="test", imgsz=320, device="cpu")

    print("\n=== Test-set evaluation ===")
    print(f"mAP50:    {metrics.box.map50:.4f}")
    print(f"mAP50-95: {metrics.box.map:.4f}")
    print(f"Precision (mean): {metrics.box.mp:.4f}")
    print(f"Recall (mean):    {metrics.box.mr:.4f}")
    print("\nPer-class AP50:")
    for i, name in enumerate(UNIFIED_CLASSES):
        if i < len(metrics.box.ap50):
            print(f"  {name}: {metrics.box.ap50[i]:.4f}")
