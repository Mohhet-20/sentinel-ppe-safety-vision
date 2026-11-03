# PPE Detection Model — Pretrained Model Report

## Model source

- **Repo:** [`Hansung-Cho/yolov8-ppe-detection`](https://huggingface.co/Hansung-Cho/yolov8-ppe-detection) (Hugging Face)
- **Architecture:** YOLOv8n (Ultralytics-native `.pt`, loads directly via `YOLO(path)` — no wrapper library needed)
- **License:** MIT
- **Last updated:** 2025-11-27 (actively maintained relative to alternatives evaluated — see below)
- **Adoption:** 1,720 downloads on Hugging Face at time of evaluation
- Local copies: `ml/pretrained/hansung_cho_best.pt` (source of truth) and
  `backend/models/best.pt` (deployed copy — identical bytes)

### Alternatives considered and rejected

| Candidate | Classes | mAP50 | Last updated | Why not chosen |
|---|---|---|---|---|
| `keremberke/yolov8m-protective-equipment-detection` | glove/no_glove, goggles/no_goggles, helmet/no_helmet, mask/no_mask, shoes/no_shoes | 0.273 | Feb 2023 | No `person` or `vest` class at all; low reported accuracy; stale (3+ years, built for the old `ultralyticsplus` wrapper) |
| `Tanishjain9/yolov8n-ppe-detection-6classes` | Gloves, Vest, Goggles, Helmet, Mask, Safety_shoe | ~0.81 | Nov 2025 | No `person` class and no `NO-*` violation classes at all — can't drive the violation-detection rules; 0 community downloads (unproven) |
| Roboflow "Construction Site Safety" community checkpoints | same 10-class taxonomy as chosen model | ~0.88 (self-reported) | unclear | No single directly-downloadable `.pt` confirmed without a Roboflow API key / training notebook re-run |

## Supported classes (10)

```
Hardhat, Mask, NO-Hardhat, NO-Mask, NO-Safety Vest, Person,
Safety Cone, Safety Vest, machinery, vehicle
```

Verified by loading the checkpoint directly (`model.names`), not just the model card text.

## Expected accuracy

Per the model card: **mAP@0.50 = 0.744, mAP@0.50:0.95 = 0.436, Precision = 0.831, Recall = 0.685.**

Spot-verified locally against real construction-site images (from the
merged dataset built earlier in this project) via the actual
`InferenceService` — confident, correct detections (Person, Hardhat,
Safety Vest, NO-Safety Vest, NO-Mask, machinery, vehicle all observed with
0.5-0.97 confidence) on both the matching Construction-Site-Safety-style
images and on a different source dataset (Roboflow `ppe-6-classes`),
indicating reasonable generalization beyond its own training distribution.

## Classes NOT supported by this pretrained model

- **Safety goggles / NO-safety-goggles** — not detected at all.
- **Gloves / NO-gloves** — not detected at all.
- **Boots / NO-boots** — not detected at all.

If a Zone's `required_ppe` includes `"goggles"` or `"gloves"`, the Rule
Engine will correctly (and permanently) report those as missing, since the
model can never detect their presence — this is an honest reflection of a
real model limitation, not a bug. Avoid configuring zones that require
those items unless/until a model covering them is added.

## Integration changes made

1. **`backend/app/services/rule_engine.py`** — `evaluate_ppe_compliance`
   previously matched detected class names by **exact string** against
   `PPE_CLASSES = {"hardhat","vest","boots","mask","goggles","gloves"}`. This
   model's classes are `"Hardhat"`, `"Safety Vest"`, etc. — `"safety vest"`
   never equals `"vest"`, so zone PPE-compliance checks would have silently
   never matched. Replaced with the same keyword/token-substring matching
   already used in `ppe_incident_rules.classify_violation`, with an explicit
   exclusion so a `"NO-Safety Vest"` detection can't be mistaken for
   satisfying the `"vest"` requirement. **This was a real integration bug,
   now fixed.**
2. **`backend/app/utils/annotate.py`** — added a `"mask"` entry to the
   bounding-box color rules (was falling through to the default amber
   instead of the "compliant PPE" green used for hardhat/vest/goggles/gloves).
   Cosmetic only.
3. **No changes needed** in `inference_service.py` (already fully dynamic —
   reads `model.names` at load time) or `ppe_incident_rules.py` (already
   keyword-based, verified correct against this model's exact class strings).

## Verification performed

- Model loads via standard `ultralytics.YOLO()` — confirmed.
- Real inference via the actual `InferenceService` class (not a bypass) on
  9 sample images spanning all three source datasets used earlier in this
  project — confirmed correct, high-confidence detections.
- `predict_frame` (webcam per-frame path) and `predict_video` (sampled
  frame-by-frame video path) both exercised directly — confirmed working.
- Backend unit tests `test_inference_service.py`, `test_ppe_incident_rules.py`,
  `test_tracker_service.py` — 9/9 pass.
- `test_inference.py`, `test_video_inference.py`, `test_webcam_session.py`,
  `test_rules.py` (route-level, auth-gated tests) fail with
  `KeyError: 'access_token'` — this is a **pre-existing** test-fixture bug
  unrelated to this change: those tests hardcode the login password
  `"ChangeMe123!"` while `Settings.DEMO_ADMIN_PASSWORD` defaults to
  `"Admin@123"`. Not touched, since it's outside this task's scope
  (no AI/model code involved) and predates this session's changes.

## Limitations

- No goggles/gloves/boots detection (see above).
- mAP50-95 of 0.436 means localization precision is moderate — expect
  reasonably accurate class identification but boxes that are sometimes
  loosely fit, especially on partially-occluded or small/distant people.
- Trained primarily on outdoor construction-site scenes; may perform worse
  in other industrial contexts (e.g. indoor manufacturing floors, warehouses)
  not well-represented in its training data — no such images were tested
  since we don't have a labeled sample of that domain.
- It's a YOLOv8**n** (nano) model — favors real-time speed over the accuracy
  ceiling a larger model (s/m/l) would offer.
