"""
Unit tests for InferenceService's pure-python pieces (result parsing,
status reporting) that don't require actual model weights.
"""
from app.services.inference_service import InferenceService


class _FakeTensor:
    def __init__(self, values):
        self._values = values

    def tolist(self):
        return self._values

    def item(self):
        return self._values[0] if isinstance(self._values, list) else self._values

    def __getitem__(self, idx):
        return _FakeTensor(self._values[idx]) if isinstance(self._values, list) else self


class _FakeBox:
    def __init__(self, xyxy, cls, conf, track_id=None):
        self.xyxy = [_FakeTensor(xyxy)]
        self.cls = [_FakeTensor(cls)]
        self.conf = [_FakeTensor(conf)]
        self.id = [_FakeTensor(track_id)] if track_id is not None else None


class _FakeResult:
    def __init__(self, boxes, orig_shape):
        self.boxes = boxes
        self.orig_shape = orig_shape


def test_model_status_when_never_loaded():
    service = InferenceService()
    status = service.model_status()
    assert status["is_loaded"] is False
    assert status["total_predictions"] == 0


def test_parse_ultralytics_result_normalizes_bbox():
    service = InferenceService()
    service.class_names = ["person", "hardhat"]

    fake_boxes = [_FakeBox(xyxy=[100.0, 50.0, 300.0, 250.0], cls=0, conf=0.93)]
    result = _FakeResult(boxes=fake_boxes, orig_shape=(400, 800))  # h, w

    parsed = service._parse_ultralytics_result(result)

    assert len(parsed) == 1
    box = parsed[0]
    assert box.class_name == "person"
    assert box.confidence == 0.93
    assert 0 <= box.bbox.x <= 1
    assert 0 <= box.bbox.y <= 1
    assert box.bbox.w > 0 and box.bbox.h > 0


def test_parse_ultralytics_result_handles_no_boxes():
    service = InferenceService()
    result = _FakeResult(boxes=None, orig_shape=(400, 800))
    assert service._parse_ultralytics_result(result) == []
