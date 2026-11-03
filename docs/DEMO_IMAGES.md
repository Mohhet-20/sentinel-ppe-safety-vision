# Demo Images Guide — PPE Detection Model

This describes what kind of images/video get the best results out of the
current detection model (`backend/models/best.pt`, see the model card in
`ml/PRETRAINED_MODEL_REPORT.md` for full details).

## What the model was trained to see

The model was trained on construction-site footage (YouTube site walkthroughs
+ Roboflow-annotated photos), so it performs best on scenes that look like a
real job site, not a studio product photo:

- People standing or walking, mostly upright, **head-to-waist or full-body
  visible** — not extreme close-ups of just a helmet or just a vest.
- **Medium distance**: subjects filling roughly 10-60% of the frame height.
  A person who's a tiny speck in a wide drone shot, or a face filling the
  whole frame, both perform worse.
- Normal daylight or well-lit indoor industrial lighting. Avoid heavy
  backlighting/silhouettes and very low-light/night shots.
- Typical construction/industrial backdrops: scaffolding, rebar, site
  vehicles, machinery, safety cones — the model also uses this context.

## Best PPE items to feature

| Detects well | Notes |
|---|---|
| `Person` | Any upright person in-frame |
| `Hardhat` / `NO-Hardhat` | Clear head visibility needed |
| `Safety Vest` / `NO-Safety Vest` | Hi-vis orange/yellow vests work best (what it was trained on) |
| `Mask` / `NO-Mask` | Face visible, not turned away |
| `Safety Cone` | Standard orange traffic/safety cones |
| `machinery` | Excavators, forklifts, site vehicles/equipment |
| `vehicle` | Trucks, cars on/near site |

**Not supported by this model** — don't expect detections for: safety
goggles/glasses, gloves, or boots. If your demo needs to show those, mention
it's a known gap (see the model report) rather than expecting a detection.

## Good demo shots

- A small group (2-5 people) on a site, some wearing hardhats/vests, at
  least one missing one — shows off both positive and `NO-*` violation
  classes at once.
- A wide site shot with visible machinery/vehicles alongside workers.
- A single worker mid-task, upper body clearly in frame, hardhat visible.

## Shots to avoid

- Extreme close-ups (just a helmet, just a face).
- Very crowded scenes where people heavily overlap/occlude each other.
- Studio/stock photos with plain backgrounds and no site context.
- Screenshots or images with baked-in UI/text overlays.

## Known-good samples in this repo

The merged training dataset under `ml/dataset/images/test/` has real
examples confirmed to produce strong detections with this model — anything
prefixed `ds3_` or `ds2_` (Construction Site Safety / Roboflow PPE sets) is
the closest match to this model's own training distribution, e.g.:

- `ml/dataset/images/test/ds3_train_construction-1099-*.jpg`
- `ml/dataset/images/test/ds2_test_000052_*.jpg`

`ds1_*` prefixed images (Pexels stock photos) are more hit-or-miss since
many are close-ups or non-construction scenes.
