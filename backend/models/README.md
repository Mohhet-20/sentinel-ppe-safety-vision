# Model weights

`best.pt` is already present here — a pretrained PPE-detection checkpoint
([`Hansung-Cho/yolov8-ppe-detection`](https://huggingface.co/Hansung-Cho/yolov8-ppe-detection),
YOLOv8n). See `../../ml/PRETRAINED_MODEL_REPORT.md` for its class list,
accuracy, and known limitations.

To use your own fine-tuned checkpoint instead, replace it at the same path:

```
backend/models/best.pt
```

The inference service (`app/services/inference_service.py`) checks this
exact path (configurable via `MODEL_DIR` / `MODEL_FILENAME` in `.env`) on
every request. If the file's modification time changes — i.e. you replace
`best.pt` with a newer version — the service automatically reloads it on
the next inference call. No server restart required.

If `best.pt` is missing, the API stays up and returns a clear
`model_not_loaded` error (HTTP 503) instead of crashing.

Supported formats: a PyTorch `.pt` checkpoint, or an exported OpenVINO IR
directory (e.g. `best_openvino_model/`) — set `MODEL_FILENAME` accordingly.
