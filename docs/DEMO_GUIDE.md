# Demo Guide

A step-by-step walkthrough for demoing Sentinel end-to-end against the real
FastAPI backend.

> **No backend handy?** Open the landing page and click **Launch live demo**:
> the whole product runs in the browser with the real model (ONNX Runtime
> Web) and an in-memory API. The steps below apply equally to that mode,
> except PDF/Excel export, which is server-side only.

## 1. Start both servers

```bash
# Terminal 1
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2
npm run dev
```

Open `http://localhost:5173` (public landing page) and click **Sign in to a backend** in the footer, or go straight to `http://localhost:5173/login`.

## 2. Log in

Use the default admin account:

```
username: admin
password: ChangeMe123!
```

...or click **Continue with demo account** on the login page (pre-fills
the same credentials).

## 3. Image Detection — the core demo

Go to **Image Detection** in the sidebar.

- Upload a real construction-site photo. For best results, use a shot with
  people clearly visible (head-to-waist or full body), moderate distance,
  decent lighting — see [DEMO_IMAGES.md](DEMO_IMAGES.md) for exactly what
  works best and why, plus known-good sample images already in this repo
  under `ml/dataset/images/test/` (prefixed `ds2_`/`ds3_`).
- Watch the annotated result come back with bounding boxes, class labels,
  and confidence scores.
- If the model detects a `NO-Hardhat`, `NO-Safety Vest`, or `NO-Mask` box,
  an **Incident** is auto-created — no manual step needed.

## 4. Incident Center — see it land in real time

Open **Incident Center** in another tab (or navigate there after step 3).
The incident from the image you just uploaded should already be listed,
pushed live over the WebSocket connection — no page refresh needed. Click
a row to open the detail drawer (severity, confidence, screenshot, notes).

## 5. Video Detection

Go to **Video Detection**, upload a short clip (mp4/avi/mov/mkv). The
backend processes it frame-by-frame, assigns track IDs so the same person
isn't counted as a new violation every frame, and returns an annotated
output video plus a timeline of detection events you can click to seek.

## 6. Live Webcam

Go to **Live Webcam**, click **Start Camera** (grant browser camera
permission). Frames are captured client-side roughly once a second and
sent to the backend for inference — you'll see live bounding boxes,
FPS/latency stats, and a running detection/track count. Violations still
generate incidents exactly as in the image/video flows.

## 7. Analytics & Reports

- **Analytics** — live compliance rate, violation trends, worker risk
  ranking, camera statistics — all backed by real incident data building up
  as you run the demos above.
- **Reports** — download a real CSV/Excel/PDF report of current incident
  data via the export buttons.

## 8. Model Manager

Shows the currently loaded model (`backend/models/best.pt`), its class
list, and live status (loaded/not-loaded, prediction count, avg latency).
The **Reload model** button force-reloads from disk — useful if you swap
in a different checkpoint mid-demo.

## 9. User Management (admin only)

Create/edit/disable users and reset passwords — gated to the `admin` role
both in the UI and on the backend.

## What NOT to expect

- **Goggles, gloves, and boots are not detected** by the current model —
  don't demo PPE-compliance scenarios that depend on those specifically.
  See `ml/PRETRAINED_MODEL_REPORT.md` for the full supported-class list.
- The **Zone/Rule Engine** (`/api/zones`, `/api/rules`) is fully functional
  as configuration CRUD, but its evaluation logic isn't wired into the live
  detection pipeline yet — configuring a zone's `required_ppe` won't
  currently change what incidents get created. Incidents come from the
  simpler, always-on `ppe_incident_rules.py` path instead. Don't demo zone
  rules as if they actively gate detection.
- A handful of **Dashboard widgets, the Reports history/summary panel, and
  the multi-camera grid view on Live Webcam** show illustrative/placeholder
  data rather than live data (no backend endpoint backs them yet) — steer
  the demo toward Image/Video/Live Webcam Detection, Incident Center, and
  Analytics, which are fully real.
