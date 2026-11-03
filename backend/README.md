# Sentinel Backend

Production backend for the Sentinel AI Workplace Safety Platform. FastAPI +
SQLAlchemy 2.0 + JWT auth, wired end-to-end for the frontend's pages:
Dashboard, Image/Video/Live Webcam Detection, Analytics, Incident Center,
Workers, Reports, and Model Manager. Real Ultralytics YOLO inference,
IoU-based tracking (swappable for ByteTrack), a configurable Zone/Rule
Engine, automatic incident generation, database-backed analytics, and real
CSV/Excel/PDF report generation are all implemented. A pretrained PPE
detection checkpoint is already bundled at `models/best.pt` — see
`models/README.md` and `../ml/PRETRAINED_MODEL_REPORT.md`.

For Docker / production deployment, see `../docs/DEPLOYMENT.md`.

## Stack

- FastAPI + Uvicorn
- SQLAlchemy 2.0 (declarative, typed `Mapped[...]` columns) + Alembic migrations
- Pydantic v2 / pydantic-settings
- JWT auth (`python-jose`) with access + refresh tokens, bcrypt password hashing (`passlib`)
- Ultralytics YOLO (lazy-loaded, any compatible `.pt` checkpoint) + OpenCV, OpenVINO-export-ready
- WebSockets (`/ws/live`) — detections, tracking updates, incidents, telemetry
- reportlab / openpyxl for real PDF / Excel report generation
- Loguru structured logging, rotating file logs
- aiofiles for non-blocking upload storage

## Project layout

```
backend/
├── app/
│   ├── api/            # route registration + versioned routers
│   │   └── routes/      # auth, workers, incidents, cameras, settings, detection, health
│   ├── auth/            # password hashing, JWT, auth dependencies
│   ├── core/            # config, logging, exception handling
│   ├── database/        # engine/session, declarative base
│   ├── models/          # SQLAlchemy ORM models
│   ├── schemas/         # Pydantic request/response schemas
│   ├── services/        # business logic / DB access per domain
│   ├── websocket/       # connection manager + /ws/live route
│   ├── utils/           # file storage helpers
│   └── main.py          # FastAPI app, lifespan, CORS, router mounting
├── alembic/              # migration environment
├── uploads/               # stored detection uploads (images/videos/webcam frames)
├── reports/               # generated report artifacts
├── logs/                  # rotating log files
├── tests/                 # pytest suite
├── requirements.txt
├── .env.example
└── alembic.ini
```

## AI inference pipeline

Object detection is wired up end-to-end (Ultralytics YOLO + OpenCV). A
pretrained PPE-detection checkpoint (10 classes: Person, Hardhat/NO-Hardhat,
Safety Vest/NO-Safety Vest, Mask/NO-Mask, Safety Cone, machinery, vehicle —
see `../ml/PRETRAINED_MODEL_REPORT.md`) is already at:

```
backend/models/best.pt
```

Replace it with your own fine-tuned checkpoint any time — it's picked up
automatically (checked on every request; auto-reloads if the file's mtime
changes, no restart needed). If the file is ever missing/removed,
`/api/inference/*` returns a clear `503 model_not_loaded` instead of
crashing or faking results.

**Endpoints:**

| Method | Path                          | Notes |
|--------|--------------------------------|-------|
| POST   | `/api/inference/image`         | Full pipeline: validate → YOLO inference → annotate → persist `Detection` rows → respond with boxes, timing, and image URLs |
| POST   | `/api/inference/video`         | Full pipeline: validate (mp4/avi/mov/mkv) → frame-by-frame YOLO + tracking → annotated output video with boxes + track IDs → auto-generated incidents → timeline + stats |
| POST   | `/api/inference/webcam/start`  | Opens a server-side tracking session (returns `session_id`) — the camera itself is the browser's, this just gives frames a place to accumulate track IDs/stats |
| POST   | `/api/inference/webcam/stop`   | Ends a session, finalizes stats |
| GET    | `/api/inference/webcam/status` | Live FPS/latency/detection/track counters for a session (or the most recent active one) |
| POST   | `/api/inference/webcam`        | One frame; pass `session_id` to keep tracking/incident-dedup continuous across a live session, omit for a stateless snapshot |
| GET    | `/api/models/status`           | Whether a model is loaded, its class list, load errors, prediction count |
| POST   | `/api/models/reload`           | Force-reload from `backend/models/best.pt` |

Annotated images/videos are served statically at `/uploads/...`.

**Tracking:** `app/services/tracker_service.py` assigns per-camera/session
track IDs via a dependency-free greedy-IoU tracker so the whole pipeline
(video processing, webcam sessions, incident dedup) works without the AI
stack installed. Swap in real Ultralytics ByteTrack
(`model.track(..., tracker="bytetrack.yaml")`) by editing that one file —
nothing else changes.

**Incidents:** `app/services/ppe_incident_rules.py` scans detection class
names for "no-hardhat"/"no-vest"/"no-mask"/"no-goggles"/"no-gloves" style
labels (case/separator-insensitive) and auto-creates an `Incident` row per
(track, violation) pair the first time it's seen — so a person missing a
hardhat for an entire video doesn't create a duplicate incident every frame.

**Error handling:** invalid/corrupt images or videos (422), unsupported
file types (415), oversized uploads (413), unknown webcam sessions (404),
and a missing/unloaded model (503) all return the same
`{"error": {"code", "message"}}` envelope — see `app/utils/image_validation.py`,
`app/utils/video_validation.py`, and `app/api/routes/inference.py`.

## Getting started

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env             # adjust SECRET_KEY etc. for real use

uvicorn app.main:app --reload --port 8000
```

On first startup the app:
1. Creates all tables (SQLite by default, at `backend/sentinel.db`).
2. Seeds a demo admin user from `.env` (`DEMO_ADMIN_USERNAME` / `DEMO_ADMIN_PASSWORD`).
3. Seeds a handful of sample cameras / workers / incidents so the API isn't empty.

Interactive API docs: `http://localhost:8000/docs`

## Auth flow

```
POST /api/auth/login     { username, password }  # username may be a username OR an email
                         -> { access_token, refresh_token }
POST /api/auth/refresh   { refresh_token }       -> { access_token }
GET  /api/auth/profile   (Bearer access token)   -> current user
```

Demo credentials (from `.env.example`): `admin` / `ChangeMe123!`

## Database migrations

The app also auto-creates tables on startup for convenience in this
foundation stage. For real schema evolution, use Alembic:

```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

## REST endpoints

| Method | Path                     | Notes                                   |
|--------|--------------------------|------------------------------------------|
| GET    | `/api/health`            | Liveness/health check                    |
| POST   | `/api/auth/login`        | JWT login (by username or email)         |
| POST   | `/api/auth/refresh`      | Exchange refresh token for new access token |
| GET    | `/api/auth/profile`      | Current authenticated user               |
| GET/POST/PATCH/DELETE | `/api/workers`, `/api/workers/{id}` | Worker directory CRUD |
| GET/POST/PATCH/DELETE | `/api/incidents`, `/api/incidents/{id}` | Incident CRUD + filters |
| GET/POST/PATCH/DELETE | `/api/cameras`, `/api/cameras/{id}` | Camera registry CRUD |
| GET/POST/PATCH/DELETE | `/api/zones`, `/api/zones/{id}` | Zone Engine — polygon, type, required PPE, priority |
| GET/POST/PATCH/DELETE | `/api/rules`, `/api/rules/{id}` | Rule Engine — PPE/zone rules, confidence threshold, debounce, alert delay, shift |
| GET    | `/api/analytics/summary` | Live compliance, today's/weekly/monthly violations, avg confidence, FPS, latency |
| GET    | `/api/analytics/worker-risk-ranking` | Top workers by risk score |
| GET    | `/api/analytics/zone-ranking` | Zones ranked by violation count |
| GET    | `/api/analytics/camera-statistics` | Per-camera violation counts + status |
| GET    | `/api/analytics/detection-trends` | Daily incident counts (default 14d) |
| GET    | `/api/analytics/severity-breakdown` | Incident counts by severity |
| GET    | `/api/reports/csv`, `/excel`, `/pdf` | Real downloadable reports built from live data |
| GET/PUT | `/api/settings`          | Detection/alert/report settings           |
| GET    | `/api/audit`             | Read-only audit trail (filter by category/status/actor); written internally on login, settings/incident/model changes |
| GET    | `/api/system/health`     | Live host resources (CPU/RAM/disk via psutil), DB latency, camera/WebSocket/model health for the System Health dashboard |
| WS     | `/ws/live?token=<jwt>`    | Authenticated channel broadcasting detections, tracking updates, incidents, and telemetry |

## Tests

```bash
pytest
```

## What's intentionally NOT implemented

- No in-app dataset management or training UI — a standalone local pipeline
  for merging PPE datasets and training a custom model exists in `../ml/`
  (see `../ml/scripts/`), but it's run manually outside the backend/API
- Real Ultralytics ByteTrack (a dependency-free IoU tracker stands in — see
  `app/services/tracker_service.py` for the one-file swap)
- A server-attached physical camera loop (the webcam pipeline is fed by the
  browser's camera via periodic frame POSTs — see `webcam_session_service.py`
  docstring for the swap point if you want native OpenCV camera capture)
- Real-time database migrations in the running app (tables auto-create on
  startup for convenience — use Alembic for real schema evolution, see
  `../docs/DEPLOYMENT.md`)

These are the next layers to build on top of this foundation.
