# Sentinel — Deployment Guide

This covers running the full stack (frontend + backend) with Docker, and
what to configure before going to production.

## Architecture recap

```
┌─────────────┐      REST + WebSocket      ┌──────────────┐
│  frontend    │ ────────────────────────▶ │   backend     │
│  (nginx,     │  /api/*  ·  /ws/live       │  (FastAPI +   │
│   static     │ ◀──────────────────────── │   YOLOv8n)    │
│   build)     │                            │              │
└─────────────┘                            └──────┬───────┘
                                                    │
                                     SQLite (dev) / Postgres (prod)
                                                    │
                                     backend/models/best.pt (bind-mounted)
```

## Option A: static demo on Vercel (no server)

The public demo is a static build: every API call is answered by an
in-browser mock backend and inference runs the real model via ONNX Runtime
Web. It needs no server, database or secrets.

1. Import the repository in Vercel. `vercel.json` already sets the build
   command (`npm run build:demo`), SPA rewrites, and the
   `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` headers
   that enable multi-threaded WebAssembly inference.
2. Deploy. That's it.

Any static host works the same way: run `npm run build:demo`, serve `dist/`
with an `index.html` fallback, and add the two cross-origin headers (without
them inference still works, single-threaded).

## Option B: full stack with Docker Compose

```bash
cp backend/.env.production.example backend/.env
# edit backend/.env: set SECRET_KEY, DEMO_ADMIN_PASSWORD, CORS_ORIGINS

docker compose up --build
```

- Frontend: http://localhost:8080
- Backend + API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

Drop a trained checkpoint at `backend/models/best.pt` on the host — it's
bind-mounted into the container and picked up automatically (the
inference service auto-reloads on file change; no rebuild or restart
needed). Until then, every `/api/inference/*` endpoint responds with a
clear `503 model_not_loaded` rather than crashing or faking results.

## What each container does

**backend** (`backend/Dockerfile`)
- `python:3.12-slim` + OpenCV's runtime system libs (`libgl1`, `ffmpeg`)
- Installs `requirements.txt`; the AI stack (`ultralytics`) is included by
  default (`INSTALL_AI=1` build arg) — set it to `0` for a lighter image
  if you only need the API surface without local inference (e.g. behind a
  remote inference service)
- Runs `uvicorn app.main:app` on port 8000
- On startup: ensures `uploads/ reports/ logs/ models/` exist, creates DB
  tables, seeds the demo admin + sample cameras/workers/zones/rules, and
  attempts to load `backend/models/best.pt` (non-fatal if absent)

**frontend** (`Dockerfile` at repo root)
- Multi-stage: `npm run build` in a Node stage, then serves the static
  `dist/` output from `nginx:alpine`
- `VITE_API_BASE_URL` is a **build-time** arg — the frontend is a static
  SPA, so the backend URL gets baked in at build time. Rebuild the image
  if the backend URL changes (`docker compose build frontend`).
- `nginx.conf` falls back to `index.html` for client-side routing and
  gzips/caches hashed JS/CSS assets.

## Data persistence

`docker-compose.yml` defines named volumes for everything that shouldn't
be lost on a container restart:

| Volume            | Contents |
|--------------------|----------|
| `backend_db`       | SQLite database file (`DATABASE_URL` points here) |
| `backend_uploads`  | Uploaded/annotated images, videos, incident screenshots |
| `backend_reports`  | Generated report artifacts (reserved for future use) |
| `backend_logs`     | Rotating Loguru log files |

`backend/models/` is a **bind mount** (not a named volume) so you can drop
a new `best.pt` from the host filesystem without shelling into the
container.

## Environment configuration

- `backend/.env.example` — local development defaults (SQLite, permissive
  CORS, a documented demo password). Fine to run as-is.
- `backend/.env.production.example` — production template. Copy to
  `backend/.env` and fill in:
  - `SECRET_KEY` — generate with `python -c "import secrets; print(secrets.token_urlsafe(64))"`
  - `DEMO_ADMIN_PASSWORD` — change from the documented default
  - `CORS_ORIGINS` — your real frontend origin(s) only, no wildcards
  - `DATABASE_URL` — point at Postgres for real multi-user/concurrent load
    (SQLite has no concurrent-write story at scale): 
    `postgresql+psycopg2://user:password@host:5432/sentinel`
- `.env.example` (repo root, frontend) — `VITE_API_BASE_URL` for local
  `npm run dev` against a non-default backend port/host.

**Never commit a real `.env` file.** Both are already covered by
`.gitignore`.

## Database migrations

The app auto-creates tables on startup (`Base.metadata.create_all`),
which is convenient for this stage but not a substitute for real schema
migrations once the platform is running in production with live data:

```bash
cd backend
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

## Production hardening checklist

- [ ] Set a strong, unique `SECRET_KEY` (JWT signing) — never reuse the dev default
- [ ] Change `DEMO_ADMIN_PASSWORD`, or replace the seeded demo account with real SSO/user provisioning
- [ ] Restrict `CORS_ORIGINS` to your real frontend domain(s)
- [ ] Move off SQLite to Postgres for concurrent access
- [ ] Put the backend behind TLS (a reverse proxy / load balancer terminating HTTPS — this repo doesn't include one)
- [ ] Set `DEBUG=false` and `APP_ENV=production`
- [ ] Size the backend host for the AI stack: YOLOv8n inference needs a
      GPU (CUDA) or an OpenVINO-compatible device (Intel CPU/iGPU/NPU) to
      hit real-time FPS — CPU-only PyTorch inference will work but is slow
- [ ] Rotate/ship `backend/logs/sentinel.log` to your log aggregator instead of relying on local rotation alone
- [ ] Back up the `backend_db` and `backend_uploads` volumes on a schedule

## Verifying a deployment

```bash
curl http://localhost:8000/api/health
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<your password>"}'
```

A successful login response confirms the API, database, and auth layer
are all wired correctly. Then open the frontend and confirm the Dashboard,
Analytics, and Model Manager pages load (Model Manager will show
"Not loaded" until `backend/models/best.pt` is present — that's expected).

## Running without Docker

See `backend/README.md` (backend) and the repo root `README.md`
(frontend) for the plain `pip install` / `npm install` local dev flow —
useful for active development, where Docker's build-time frontend URL
baking is more friction than it's worth.
