# Project Structure

```
safety-platform/
├── src/                          # Frontend (React + TypeScript + Vite)
│   ├── pages/                    # One file per route
│   │   ├── Dashboard.tsx
│   │   ├── Analytics.tsx
│   │   ├── ImageDetection.tsx
│   │   ├── VideoDetection.tsx
│   │   ├── LiveWebcam.tsx
│   │   ├── IncidentCenter.tsx
│   │   ├── Workers.tsx
│   │   ├── Reports.tsx
│   │   ├── ModelManager.tsx
│   │   ├── SystemHealth.tsx
│   │   ├── UserManagement.tsx
│   │   ├── Settings.tsx
│   │   ├── Login.tsx
│   │   └── About.tsx
│   ├── components/
│   │   ├── layout/                AppShell, Sidebar, Topbar
│   │   ├── shell/                 CommandPalette, LiveAlerts, NotificationCenter, UserMenu, ...
│   │   ├── dashboard/              KPI cards, charts, live camera/detection panels
│   │   ├── analytics/              Analytics charts + KPI grid
│   │   ├── detection/              Image/video detection workspace panels
│   │   ├── incidents/              Incident table, filters, drawer
│   │   ├── models/                 Model Manager cards (live status, reload button)
│   │   ├── reports/                Report template grid, history table
│   │   ├── rules/, zones/          Rule/Zone manager panels
│   │   ├── workers/                Worker card, profile drawer
│   │   ├── auth/                   ProtectedRoute
│   │   └── ui/                     shadcn/ui primitives (button, card, dialog, ...)
│   ├── providers/
│   │   ├── AuthProvider.tsx        Session state, login/logout, token restore-on-mount
│   │   ├── LiveChannelProvider.tsx Single shared /ws/live WebSocket connection
│   │   ├── QueryProvider.tsx       TanStack Query client
│   │   └── ThemeProvider.tsx       Light/dark theme
│   ├── hooks/                      use-incidents, use-workers, use-system-health, use-live-channel, use-toast
│   ├── lib/
│   │   ├── api-client.ts           Every backend call — the ONLY place fetch() happens
│   │   ├── auth.ts                 Token storage, login/refresh/profile API calls
│   │   └── mock-*-data.ts          Fallback/demo data + shared types where noted per-file
│   ├── router/index.tsx            Route table
│   ├── constants/nav.ts            Sidebar nav entries
│   └── types/index.ts              Shared domain types
│
├── backend/                      # Backend (FastAPI + SQLAlchemy)
│   ├── app/
│   │   ├── api/
│   │   │   ├── router.py           Mounts every route module under /api
│   │   │   └── routes/             analytics, audit, auth, cameras, health, incidents,
│   │   │                           inference, models, reports, rules, settings, system,
│   │   │                           users, workers, zones
│   │   ├── auth/                   JWT (jwt.py), password hashing (security.py),
│   │   │                           get_current_user/require_roles (dependencies.py)
│   │   ├── core/                   config.py (Settings), logging.py, exceptions.py
│   │   ├── database/               engine/session (session.py), declarative Base (base.py)
│   │   ├── models/                 SQLAlchemy ORM: User, Worker, Camera, Zone, Incident,
│   │   │                           Detection, RuleConfiguration, TrackingSession, AuditLog
│   │   ├── schemas/                Pydantic request/response shapes, one file per domain
│   │   ├── services/               Business logic — see "Key services" below
│   │   ├── websocket/              ConnectionManager (manager.py), broadcast helpers
│   │   │                           (broadcaster.py), /ws/live route (routes.py)
│   │   ├── utils/                  annotate.py (draw boxes), files.py, image/video validation
│   │   └── main.py                 App factory, lifespan (DB + model load), CORS, routers
│   ├── alembic/                    Migration environment (schema is auto-created via
│   │                               Base.metadata.create_all() on startup; Alembic is for
│   │                               incremental changes going forward)
│   ├── models/best.pt              The active detection checkpoint (see ml/PRETRAINED_MODEL_REPORT.md)
│   ├── scripts/                    check_db.py (DB inspector), test_admin_login.py (manual smoke test)
│   ├── tests/                      pytest suite (65 tests)
│   ├── uploads/, reports/, logs/   Runtime-generated artifacts
│   ├── pytest.ini                  Restricts pytest discovery to tests/
│   ├── requirements.txt
│   └── .env.example
│
├── ml/                            # Standalone PPE dataset/training pipeline (not part of the API)
│   ├── scripts/                    01_extract.py … 10_zip_dataset.py, numbered in run order
│   ├── dataset/                    Merged, cleaned, deduped YOLO-format dataset (28k images, 13 classes)
│   ├── runs/                       Local training run outputs
│   ├── train.py                    Standalone GPU training script (Kaggle/Colab-ready)
│   └── PRETRAINED_MODEL_REPORT.md  Model card for the currently-deployed best.pt
│
├── README.md                      Start here — install, run, credentials, demo, architecture
├── docs/
│   ├── DEMO_GUIDE.md              Step-by-step demo walkthrough
│   ├── PROJECT_STRUCTURE.md       This file
│   ├── AUDIT-2026-07.md           Production-readiness audit (historical snapshot)
│   ├── DEMO_IMAGES.md             What kind of images/video work best with the current model
│   ├── DEPLOYMENT.md              Docker / Vercel / production deployment guide
│   └── screenshots/               README screenshots (regenerate: SCREENSHOTS=1 npx playwright test screenshots)
├── e2e/                           Playwright end-to-end tests (run against the demo build)
├── scripts/copy-ort-runtime.mjs   Copies the ONNX Runtime wasm into public/ort at build time
├── public/models/                 ppe-yolov8n.onnx: the backend checkpoint exported for in-browser inference
├── public/samples/                Pexels sample photos used by the landing-page playground
├── docker-compose.yml, Dockerfile
└── package.json, vite.config.ts, tailwind.config.ts, eslint.config.js
```

## Key backend services (`backend/app/services/`)

| Service | Responsibility |
|---|---|
| `inference_service.py` | Loads/hot-reloads the YOLO model; `predict_image`/`predict_frame`/`predict_video` — the only place `ultralytics.YOLO(...)` is called |
| `tracker_service.py` | Assigns per-camera/session track IDs (greedy IoU matcher) |
| `ppe_incident_rules.py` | Keyword-matches detection class names (e.g. `no-hardhat`) → creates `Incident` rows, deduplicated per track |
| `rule_engine.py` | Zone-aware PPE compliance/breach evaluation — CRUD-complete via `/api/zones` and `/api/rules`, but **not currently wired into the live inference pipeline** (see AUDIT-2026-07.md) |
| `video_processing_service.py` | Frame-by-frame video pipeline: inference → tracking → annotated output video → incidents |
| `webcam_session_service.py` | Server-side bookkeeping for live browser-camera sessions |
| `analytics_service.py`, `report_service.py`, `report_generation_service.py` | Aggregate incident/worker/camera data into analytics + downloadable CSV/Excel/PDF reports |
| `user_service.py`, `audit_service.py` | User CRUD, audit trail |
| `zone_service.py`, `worker_service.py`, `camera_service.py`, `incident_service.py` | CRUD for their respective domains |
| `seed.py` | Seeds the demo admin + sample cameras/workers/incidents on first startup |

## Data flow: image upload → incident

```
POST /api/inference/image
  → validate upload (size/type/dimensions)
  → InferenceService.predict_image()      [Ultralytics YOLO]
  → annotate_image()                       [draw boxes, app/utils/annotate.py]
  → save_detections()                      [persist Detection rows]
  → generate_incidents_from_detections()   [ppe_incident_rules.py — any NO-* class]
  → broadcast over /ws/live                [WebSocket push to all connected clients]
  → response: boxes, image URLs, timing
```

The video and webcam pipelines follow the same shape, with `TrackerService`
added so a violation is only counted once per tracked person, not once per
frame.
