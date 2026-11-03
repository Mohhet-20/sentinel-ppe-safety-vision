"""
Standalone PPE-detection training script — designed to run on a Kaggle or
Google Colab GPU notebook, not on this machine.

Usage (Kaggle/Colab cell):
    !pip install -q ultralytics
    !python train.py

It auto-detects data.yaml under /kaggle/input, /content, or the current
directory. Pass --data explicitly if auto-detection doesn't find it.

Expects the dataset zip (produced locally) to be extracted so that
images/, labels/, and data.yaml sit together at the dataset root — that's
exactly how data.yaml's relative paths are written.
"""
import argparse
import glob
import os

from ultralytics import YOLO


def find_data_yaml(explicit_path=None):
    if explicit_path:
        return explicit_path
    candidates = (
        glob.glob("/kaggle/input/**/data.yaml", recursive=True)
        + glob.glob("/content/**/data.yaml", recursive=True)
        + glob.glob("./**/data.yaml", recursive=True)
    )
    if not candidates:
        raise FileNotFoundError(
            "Could not find data.yaml automatically. Pass --data /path/to/data.yaml"
        )
    return candidates[0]


def find_output_dir():
    if os.path.isdir("/kaggle/working"):
        return "/kaggle/working/runs"
    if os.path.isdir("/content"):
        return "/content/runs"
    return "./runs"


def main():
    parser = argparse.ArgumentParser(description="Train the PPE detection YOLO model on GPU.")
    parser.add_argument("--data", default=None, help="Path to data.yaml (auto-detected if omitted)")
    parser.add_argument("--model", default="yolo11m.pt", help="Base checkpoint: yolo11n/s/m/l/x.pt")
    parser.add_argument("--epochs", type=int, default=150)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", default=-1, help="-1 = auto batch size (fills GPU memory)")
    parser.add_argument("--patience", type=int, default=50)
    parser.add_argument("--name", default="ppe_best")
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()

    data_yaml = find_data_yaml(args.data)
    project = find_output_dir()
    print(f"data.yaml: {data_yaml}")
    print(f"output dir: {project}")

    model = YOLO(args.model)
    model.train(
        data=data_yaml,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=0,
        workers=8,
        # Some source images are very high resolution; disk/RAM caching
        # stores pre-resize arrays and can blow up disk usage. Leave off
        # unless you've confirmed your instance has the headroom.
        cache=False,
        patience=args.patience,
        cos_lr=True,
        mosaic=1.0,
        mixup=0.1,
        project=project,
        name=args.name,
        exist_ok=True,
        resume=args.resume,
        plots=True,
    )

    best_path = os.path.join(project, args.name, "weights", "best.pt")
    print(f"\nTraining complete. Best weights: {best_path}")
    print("Download that file and drop it in backend/models/best.pt")


if __name__ == "__main__":
    main()
