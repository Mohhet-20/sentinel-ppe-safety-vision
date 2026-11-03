// In-browser implementation of the Sentinel REST API, used in demo mode so the
// full product works as a static site. Request/response shapes mirror the
// FastAPI schemas in backend/app/schemas exactly — the rest of the frontend
// can't tell the difference. State lives in memory for the tab's lifetime.
//
// Inference is NOT faked: image, video and webcam routes run the real
// PPE-YOLOv8n model through onnxruntime-web (see lib/vision/detector.ts).

import type {
  AuditLogEntry,
  BackendDetectedObject,
  BackendIncident,
  BackendInferenceResult,
  BackendWorker,
  CameraSummary,
  RuleConfig,
  SystemSettings,
  UserBase,
  VideoInferenceResult,
  WebcamSessionStatus,
  Zone,
} from "@/lib/api-client";
import { detect, isDetectorLoaded, MODEL_INFO, PPE_CLASS_NAMES, loadDetector, loadImage } from "@/lib/vision/detector";
import { classifyViolation, type Detection } from "@/lib/vision/yolo-postprocess";
import { evaluateFrame } from "@/lib/vision/zone-enforcement";
import { emitDemoEvent } from "@/lib/demo/event-bus";

// ---------------------------------------------------------------------- //
// Seed data (deterministic, so screenshots and walkthroughs are stable)
// ---------------------------------------------------------------------- //

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}
const rand = seeded(42);
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
const uid = () => crypto.randomUUID();
const HOUR = 3_600_000;

const cameras: CameraSummary[] = [
  { id: "cam-01", name: "CAM-01 · Loading Dock", site: "Riverside Plant", zone: "Zone B", status: "online" },
  { id: "cam-04", name: "CAM-04 · Assembly Line 2", site: "Riverside Plant", zone: "Zone A", status: "online" },
  { id: "cam-07", name: "CAM-07 · Warehouse East", site: "Northgate Hub", zone: "Zone C", status: "degraded" },
  { id: "cam-09", name: "CAM-09 · Scaffold North", site: "Delta Line 4", zone: "Zone A", status: "online" },
  { id: "cam-12", name: "CAM-12 · Perimeter Gate", site: "Delta Line 4", zone: "Zone D", status: "offline" },
  { id: "cam-15", name: "CAM-15 · Crane Bay", site: "Riverside Plant", zone: "Zone B", status: "online" },
];

const workers: BackendWorker[] = [
  ["Daniel Marsh", "Assembly", "Line Operator", 78, 82],
  ["Renata Alvarez", "Warehouse", "Forklift Operator", 84, 74],
  ["Kevin Chen", "Logistics", "Dispatcher", 88, 66],
  ["Tunde Obi", "Maintenance", "Electrician", 91, 58],
  ["Priya Raman", "Assembly", "Shift Lead", 96, 31],
  ["Marco Bellini", "Construction", "Rigger", 72, 88],
  ["Aisha Karimi", "Construction", "Site Engineer", 94, 36],
  ["Lukas Weber", "Maintenance", "Welder", 81, 69],
  ["Sofia Duarte", "Warehouse", "Picker", 89, 47],
  ["James Okafor", "Logistics", "Yard Marshal", 86, 52],
  ["Hana Sato", "Construction", "Scaffolder", 76, 79],
  ["Omar Haddad", "Assembly", "Quality Inspector", 97, 22],
].map(([name, department, role, compliance, risk], i) => ({
  id: `wkr-${i + 1}`,
  employee_id: `EMP-${2101 + i}`,
  name: name as string,
  department: department as string,
  role: role as string,
  site: pick(["Riverside Plant", "Northgate Hub", "Delta Line 4"]),
  compliance_score: compliance as number,
  risk_score: risk as number,
}));

const VIOLATION_MIX: [string, BackendIncident["severity"]][] = [
  ["Missing Helmet", "high"],
  ["Missing Helmet", "critical"],
  ["Missing Vest", "medium"],
  ["Missing Vest", "medium"],
  ["Missing Mask", "low"],
  ["Restricted Zone Entry", "high"],
];

const incidents: BackendIncident[] = Array.from({ length: 46 }, (_, i) => {
  const [missing, severity] = pick(VIOLATION_MIX);
  const cam = pick(cameras.filter((c) => c.status !== "offline"));
  const ageHours = i < 6 ? rand() * 8 : rand() * 24 * 14;
  const status: BackendIncident["status"] =
    ageHours < 10 ? pick(["open", "open", "investigating"]) : pick(["resolved", "resolved", "resolved", "dismissed", "investigating"]);
  const worker = rand() > 0.35 ? pick(workers) : null;
  return {
    id: uid(),
    camera: cam.name,
    camera_id: cam.id,
    zone_id: null,
    track_id: `T${100 + i}`,
    missing_ppe: missing,
    severity,
    confidence: 0.55 + rand() * 0.42,
    worker_id: worker?.id ?? null,
    assigned_to: status === "open" ? "Unassigned" : pick(["Sentinel Administrator", "Priya Raman", "Aisha Karimi"]),
    notes: "Auto-detected by AI pipeline",
    screenshot_path: null,
    timestamp: new Date(Date.now() - ageHours * HOUR).toISOString(),
    status,
    resolution: status === "resolved" ? "Worker briefed and PPE issued on site." : null,
  };
}).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

let zones: Zone[] = [
  {
    id: "zone-1",
    camera_id: "cam-01",
    name: "Assembly Floor",
    zone_type: "mandatory_ppe",
    polygon: [{ x: 0.05, y: 0.1 }, { x: 0.6, y: 0.1 }, { x: 0.6, y: 0.9 }, { x: 0.05, y: 0.9 }],
    required_ppe: ["hardhat", "vest"],
    priority: 2,
    is_active: true,
  },
  {
    id: "zone-2",
    camera_id: "cam-01",
    name: "Forklift Lane",
    zone_type: "restricted",
    polygon: [{ x: 0.6, y: 0.3 }, { x: 0.95, y: 0.3 }, { x: 0.95, y: 0.95 }, { x: 0.6, y: 0.95 }],
    required_ppe: ["hardhat", "vest"],
    priority: 4,
    is_active: true,
  },
];

const ruleDefaults = { camera_id: null, zone_id: null, shift: "all", is_active: true, confidence_threshold: 0.5, debounce_seconds: 10, alert_delay_seconds: 0 } as const;
let rules: RuleConfig[] = [
  { ...ruleDefaults, id: "rule-1", name: "Hard hat required — site-wide", rule_type: "ppe_required", required_ppe: ["hardhat"], severity: "high" },
  { ...ruleDefaults, id: "rule-2", name: "Hi-vis vest required — site-wide", rule_type: "ppe_required", required_ppe: ["vest"], severity: "medium" },
  { ...ruleDefaults, id: "rule-3", name: "No entry — restricted zones", rule_type: "zone_restricted", required_ppe: [], severity: "high" },
];

const admin: UserBase = {
  id: "usr-admin",
  username: "admin",
  email: "admin@sentinel-ai.com",
  full_name: "Sentinel Administrator",
  role: "admin",
  is_active: true,
  force_password_change: false,
};
let users: UserBase[] = [
  admin,
  { id: "usr-2", username: "priya.raman", email: "priya.raman@sentinel-ai.com", full_name: "Priya Raman", role: "safety_lead", is_active: true, force_password_change: false },
  { id: "usr-3", username: "j.okafor", email: "j.okafor@sentinel-ai.com", full_name: "James Okafor", role: "supervisor", is_active: true, force_password_change: false },
  { id: "usr-4", username: "auditor", email: "auditor@sentinel-ai.com", full_name: "External Auditor", role: "viewer", is_active: false, force_password_change: true },
];

let settings: SystemSettings = {
  detection: { confidence_threshold: 0.35, iou_threshold: 0.5, tracker: "bytetrack", max_tracking_age: 30 },
  alerts: { email_alerts: true, push_alerts: true, sms_alerts: false, min_severity: "medium" },
  reports: { auto_generate_daily: true, recipients: ["safety@sentinel-ai.com"] },
};

const audit: AuditLogEntry[] = [];
function logAudit(action: string, category: AuditLogEntry["category"], summary: string, status = "success", target?: [string, string]) {
  audit.unshift({
    id: uid(),
    timestamp: new Date().toISOString(),
    actor: "admin",
    actor_id: admin.id,
    action,
    category,
    status,
    target_type: target?.[0] ?? null,
    target_id: target?.[1] ?? null,
    summary,
    ip_address: "127.0.0.1",
  });
}
[
  ["auth.login", "security", "Administrator signed in"],
  ["model.reload", "model", "Detection model reloaded (PPE-YOLOv8n)"],
  ["settings.update", "configuration", "Confidence threshold changed 0.50 → 0.35"],
  ["zone.create", "configuration", "Zone 'Forklift Lane' created on CAM-01"],
  ["incident.update", "operations", "Incident marked resolved"],
  ["auth.login", "security", "Failed sign-in for 'auditor'"],
].forEach(([action, category, summary], i) => {
  logAudit(action, category, summary, action === "auth.login" && i === 5 ? "failure" : "success");
  audit[0].timestamp = new Date(Date.now() - (i + 1) * 3.7 * HOUR).toISOString();
});

// Live runtime stats
const startedAt = Date.now();
const perf = { predictions: 0, totalMs: 0, lastFps: 0 };
function recordRun(ms: number) {
  perf.predictions += 1;
  perf.totalMs += ms;
  perf.lastFps = 1000 / Math.max(ms, 1);
}

const webcamSessions = new Map<string, WebcamSessionStatus & { seen: Map<string, number>; label: string }>();
const VIOLATION_COOLDOWN_MS = 30_000;

// ---------------------------------------------------------------------- //
// Helpers
// ---------------------------------------------------------------------- //

function json(body: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function error(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, status);
}

function toBackendBoxes(dets: Detection[]): BackendDetectedObject[] {
  return dets.map((d, i) => ({
    class_id: d.classId,
    class_name: d.className,
    confidence: d.confidence,
    bbox: { x: d.x, y: d.y, w: d.w, h: d.h },
    track_id: `T${i + 1}`,
  }));
}

function createIncident(
  label: string,
  severity: BackendIncident["severity"],
  confidence: number,
  source: string,
  where: { cameraId?: string | null; zoneId?: string | null } = {},
): BackendIncident {
  const incident: BackendIncident = {
    id: uid(),
    camera: source,
    camera_id: where.cameraId ?? null,
    zone_id: where.zoneId ?? null,
    track_id: null,
    missing_ppe: label,
    severity,
    confidence,
    worker_id: null,
    assigned_to: "Unassigned",
    notes: "Auto-detected by in-browser AI pipeline",
    screenshot_path: null,
    timestamp: new Date().toISOString(),
    status: "open",
    resolution: null,
  };
  incidents.unshift(incident);
  emitDemoEvent("incident_update", incident);
  return incident;
}

async function fileFrom(body: BodyInit | null | undefined, field = "file"): Promise<File | null> {
  if (!(body instanceof FormData)) return null;
  const value = body.get(field);
  return value instanceof File ? value : null;
}

function formValue(body: BodyInit | null | undefined, field: string): string | null {
  if (!(body instanceof FormData)) return null;
  const v = body.get(field);
  return typeof v === "string" ? v : null;
}

function jsonBody<T>(body: BodyInit | null | undefined): T {
  return (typeof body === "string" ? JSON.parse(body) : {}) as T;
}

const since = (ms: number) => incidents.filter((i) => Date.now() - Date.parse(i.timestamp) < ms).length;

// ---------------------------------------------------------------------- //
// Inference
// ---------------------------------------------------------------------- //

async function runImage(file: Blob): Promise<BackendInferenceResult> {
  const bitmap = await createImageBitmap(file);
  const run = await detect(bitmap, settings.detection.confidence_threshold, settings.detection.iou_threshold);
  bitmap.close();
  recordRun(run.totalMs);
  emitDemoEvent("telemetry", { source: "inference/image", fps: perf.lastFps, inference_ms: run.inferenceMs });
  return {
    status: "ok",
    boxes: toBackendBoxes(run.detections),
    latency_ms: run.totalMs,
    inference_ms: run.inferenceMs,
    fps: 1000 / run.totalMs,
    model_name: MODEL_INFO.name,
    model_version: MODEL_INFO.version,
    message: null,
    image_width: run.width,
    image_height: run.height,
    original_image_url: null,
    annotated_image_url: null,
    detection_ids: [],
  };
}

async function runVideo(file: File): Promise<VideoInferenceResult> {
  const started = performance.now();
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error("Unsupported video format"));
  });

  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  // Sample ~2 frames/sec, capped so long clips stay responsive in the browser.
  const samples = Math.max(1, Math.min(90, Math.floor(duration * 2)));
  const step = duration / samples;
  const timeline: VideoInferenceResult["timeline"] = [];
  const summary = new Map<string, { count: number; severity: BackendIncident["severity"]; conf: number }>();
  let total = 0;
  let confSum = 0;

  for (let s = 0; s < samples; s++) {
    const t = s * step;
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      video.currentTime = t;
    });
    const run = await detect(video, settings.detection.confidence_threshold, settings.detection.iou_threshold);
    recordRun(run.totalMs);
    for (const d of run.detections) {
      total += 1;
      confSum += d.confidence;
      const v = classifyViolation(d.className);
      timeline.push({ time_sec: t, class_name: d.className, confidence: d.confidence, track_id: null, severity: v?.severity ?? null });
      if (v) {
        const prev = summary.get(v.label);
        summary.set(v.label, { count: (prev?.count ?? 0) + 1, severity: v.severity, conf: Math.max(prev?.conf ?? 0, d.confidence) });
      }
    }
  }

  const incidentIds = [...summary.entries()].map(([label, s]) => createIncident(label, s.severity, s.conf, file.name).id);
  const elapsed = performance.now() - started;

  return {
    status: "ok",
    message: "Processed in your browser — boxes are drawn on the timeline (annotated re-encoding runs server-side).",
    processed_video_url: url,
    original_video_url: url,
    total_frames: Math.round(duration * 30),
    frames_processed: samples,
    total_detections: total,
    unique_tracks: new Set(timeline.map((e) => e.class_name)).size,
    average_confidence: total ? confSum / total : 0,
    processing_fps: samples / (elapsed / 1000),
    source_fps: 30,
    duration_sec: duration,
    processing_time_ms: elapsed,
    timeline,
    incident_summary: [...summary.entries()].map(([label, s]) => ({ label, count: s.count })),
    incident_ids: incidentIds,
  };
}

// ---------------------------------------------------------------------- //
// Router
// ---------------------------------------------------------------------- //

type Handler = (ctx: { params: string[]; query: URLSearchParams; init: RequestInit }) => Promise<Response> | Response;
const routes: [string, RegExp, Handler][] = [];
const route = (method: string, pattern: string, handler: Handler) =>
  routes.push([method, new RegExp(`^${pattern.replace(/:\w+/g, "([^/]+)")}/?$`), handler]);

// Auth ------------------------------------------------------------------ //
route("POST", "/auth/login", ({ init }) => {
  const { username } = jsonBody<{ username: string }>(init.body);
  const user = users.find((u) => u.username === username || u.email === username) ?? admin;
  logAudit("auth.login", "security", `${user.username} signed in (demo)`);
  return json({ access_token: "demo-access-token", refresh_token: "demo-refresh-token", token_type: "bearer" });
});
route("POST", "/auth/refresh", () => json({ access_token: "demo-access-token", token_type: "bearer" }));
route("GET", "/auth/profile", () => json(admin));

// Inference ------------------------------------------------------------- //
route("POST", "/inference/image", async ({ init }) => {
  const file = await fileFrom(init.body);
  if (!file) return error(422, "validation_error", "No image uploaded.");
  return json(await runImage(file));
});
route("POST", "/inference/video", async ({ init }) => {
  const file = await fileFrom(init.body);
  if (!file) return error(422, "validation_error", "No video uploaded.");
  return json(await runVideo(file));
});
route("POST", "/inference/webcam/start", ({ init }) => {
  const cameraId = formValue(init.body, "camera_id");
  const camera = cameraId ? cameras.find((c) => c.id === cameraId) : undefined;
  if (cameraId && !camera) return error(404, "not_found", `Camera '${cameraId}' not found`);
  const id = uid();
  const session = {
    session_id: id,
    is_active: true,
    started_at: new Date().toISOString(),
    ended_at: null,
    frame_count: 0,
    detection_count: 0,
    unique_tracks: 0,
    avg_fps: 0,
    avg_latency_ms: 0,
    last_updated: new Date().toISOString(),
    camera_id: camera?.id ?? null,
    seen: new Map<string, number>(),
    label: camera?.name ?? formValue(init.body, "camera_label") ?? "Browser Webcam",
  };
  webcamSessions.set(id, session);
  return json(publicSession(session));
});
route("POST", "/inference/webcam/stop", ({ init }) => {
  const s = webcamSessions.get(formValue(init.body, "session_id") ?? "");
  if (!s) return error(404, "not_found", "Session not found.");
  s.is_active = false;
  s.ended_at = new Date().toISOString();
  return json(publicSession(s));
});
route("POST", "/inference/webcam", async ({ init }) => {
  const file = await fileFrom(init.body);
  if (!file) return error(422, "validation_error", "No frame uploaded.");
  const result = await runImage(file);
  const s = webcamSessions.get(formValue(init.body, "session_id") ?? "");
  if (s) {
    s.frame_count += 1;
    s.detection_count += result.boxes.length;
    s.avg_latency_ms += (result.latency_ms - s.avg_latency_ms) / s.frame_count;
    s.avg_fps = 1000 / Math.max(s.avg_latency_ms, 1);
    s.last_updated = new Date().toISOString();
    // No tracker in the browser, so dedupe per (zone, violation) with a cooldown.
    const fresh = (key: string) => {
      if (Date.now() - (s.seen.get(key) ?? 0) < VIOLATION_COOLDOWN_MS) return false;
      s.seen.set(key, Date.now());
      return true;
    };
    if (s.camera_id) {
      // Bound to a site camera: enforce its zones and rules (mirrors zone_enforcement.py).
      const globalPpe = rules.filter((r) => r.is_active && r.rule_type === "ppe_required" && !r.camera_id).map((r) => r.required_ppe);
      const camZones = zones.filter((z) => z.camera_id === s.camera_id);
      for (const v of evaluateFrame(result.boxes, camZones, globalPpe)) {
        if (fresh(`${v.zoneId}|${v.label}`)) createIncident(v.label, v.severity, v.confidence, s.label, { cameraId: s.camera_id, zoneId: v.zoneId });
      }
    } else {
      for (const box of result.boxes) {
        const v = classifyViolation(box.class_name);
        if (v && fresh(v.label)) createIncident(v.label, v.severity, box.confidence, s.label);
      }
    }
    s.unique_tracks = s.seen.size;
  }
  emitDemoEvent("detections", { camera_id: s?.label ?? "webcam", boxes: result.boxes });
  return json(result);
});

function publicSession(s: WebcamSessionStatus): WebcamSessionStatus {
  const { session_id, camera_id, is_active, started_at, ended_at, frame_count, detection_count, unique_tracks, avg_fps, avg_latency_ms, last_updated } = s;
  return { session_id, camera_id, is_active, started_at, ended_at, frame_count, detection_count, unique_tracks, avg_fps, avg_latency_ms, last_updated };
}

// Models ---------------------------------------------------------------- //
const modelStatus = () => ({
  is_loaded: isDetectorLoaded(),
  model_path: "/models/ppe-yolov8n.onnx",
  exists_on_disk: true,
  backend: MODEL_INFO.runtime,
  device: "browser (WebAssembly SIMD)",
  class_names: PPE_CLASS_NAMES,
  last_loaded_at: isDetectorLoaded() ? new Date(startedAt).toISOString() : null,
  load_error: null,
  total_predictions: perf.predictions,
  avg_fps: perf.predictions ? 1000 / (perf.totalMs / perf.predictions) : 0,
  avg_latency_ms: perf.predictions ? perf.totalMs / perf.predictions : 0,
});
route("GET", "/models/status", () => json(modelStatus()));
route("POST", "/models/reload", async () => {
  await loadDetector();
  logAudit("model.reload", "model", "Detection model reloaded (PPE-YOLOv8n)");
  return json(modelStatus());
});

// Analytics ------------------------------------------------------------- //
route("GET", "/analytics/summary", () =>
  json({
    live_compliance: workers.reduce((s, w) => s + w.compliance_score, 0) / workers.length,
    todays_violations: since(24 * HOUR),
    weekly_violations: since(7 * 24 * HOUR),
    monthly_violations: since(30 * 24 * HOUR),
    // Matches analytics_service.executive_summary: a percentage, 1 decimal.
    average_confidence: Math.round((incidents.reduce((s, i) => s + i.confidence, 0) / incidents.length) * 1000) / 10,
    fps: modelStatus().avg_fps,
    latency_ms: modelStatus().avg_latency_ms,
    model_loaded: isDetectorLoaded(),
  }),
);
route("GET", "/analytics/worker-risk-ranking", () =>
  json(
    [...workers]
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, 10)
      .map(({ id, name, department, risk_score, compliance_score }) => ({ id, name, department, risk_score, compliance_score })),
  ),
);
route("GET", "/analytics/zone-ranking", () =>
  json(
    ["Zone A", "Zone B", "Zone C", "Zone D"].map((name, i) => ({
      id: `z-${i}`,
      name,
      zone_type: i === 1 ? "restricted" : "mandatory_ppe",
      violation_count: incidents.filter((inc) => cameras.find((c) => c.id === inc.camera_id)?.zone === name).length,
    })).sort((a, b) => b.violation_count - a.violation_count),
  ),
);
route("GET", "/analytics/camera-statistics", () =>
  json(cameras.map((c) => ({ id: c.id, name: c.name, status: c.status, violation_count: incidents.filter((i) => i.camera_id === c.id).length }))),
);
route("GET", "/analytics/detection-trends", ({ query }) => {
  const days = Number(query.get("days") ?? 14);
  const out = [];
  for (let d = days - 1; d >= 0; d--) {
    const day = new Date(Date.now() - d * 24 * HOUR).toISOString().slice(0, 10);
    out.push({ day, count: incidents.filter((i) => i.timestamp.startsWith(day)).length });
  }
  return json(out);
});

// Reports --------------------------------------------------------------- //
route("GET", "/reports/csv", () => {
  const header = "id,timestamp,camera,missing_ppe,severity,status,confidence";
  const rows = incidents.map((i) =>
    [i.id, i.timestamp, `"${i.camera}"`, i.missing_ppe, i.severity, i.status, i.confidence.toFixed(3)].join(","),
  );
  return new Response([header, ...rows].join("\n"), { headers: { "Content-Type": "text/csv" } });
});
const serverOnlyReport = () =>
  error(501, "server_only", "PDF and Excel rendering runs server-side (reportlab / openpyxl). CSV export works in this demo.");
route("GET", "/reports/excel", serverOnlyReport);
route("GET", "/reports/pdf", serverOnlyReport);

// Zones ----------------------------------------------------------------- //
route("GET", "/zones", ({ query }) => {
  const cam = query.get("camera_id");
  return json(cam ? zones.filter((z) => z.camera_id === cam) : zones);
});
route("POST", "/zones", ({ init }) => {
  const zone = { ...jsonBody<Omit<Zone, "id">>(init.body), id: uid() };
  zones.push(zone);
  logAudit("zone.create", "configuration", `Zone '${zone.name}' created`, "success", ["zone", zone.id]);
  return json(zone, 201);
});
route("PATCH", "/zones/:id", ({ params, init }) => {
  const zone = zones.find((z) => z.id === params[0]);
  if (!zone) return error(404, "not_found", "Zone not found.");
  Object.assign(zone, jsonBody<Partial<Zone>>(init.body));
  return json(zone);
});
route("DELETE", "/zones/:id", ({ params }) => {
  zones = zones.filter((z) => z.id !== params[0]);
  return json(null, 204);
});

// Rules ----------------------------------------------------------------- //
route("GET", "/rules", () => json(rules));
route("POST", "/rules", ({ init }) => {
  const rule = { ...ruleDefaults, required_ppe: [], severity: "medium", rule_type: "custom", name: "New rule", ...jsonBody<Partial<RuleConfig>>(init.body), id: uid() } as RuleConfig;
  rules.push(rule);
  logAudit("rule.create", "configuration", `Rule '${rule.name}' created`, "success", ["rule", rule.id]);
  return json(rule, 201);
});
route("PATCH", "/rules/:id", ({ params, init }) => {
  const rule = rules.find((r) => r.id === params[0]);
  if (!rule) return error(404, "not_found", "Rule not found.");
  Object.assign(rule, jsonBody<Partial<RuleConfig>>(init.body));
  return json(rule);
});
route("DELETE", "/rules/:id", ({ params }) => {
  rules = rules.filter((r) => r.id !== params[0]);
  return json(null, 204);
});

// Users ----------------------------------------------------------------- //
route("GET", "/users", () => json(users));
route("POST", "/users", ({ init }) => {
  const body = jsonBody<Partial<UserBase>>(init.body);
  if (users.some((u) => u.username === body.username)) return error(409, "conflict", "Username already exists.");
  const user: UserBase = { id: uid(), username: "", email: "", full_name: null, role: "viewer", is_active: true, force_password_change: true, ...body };
  users.push(user);
  logAudit("user.create", "security", `User '${user.username}' created`, "success", ["user", user.id]);
  return json(user, 201);
});
route("PATCH", "/users/:id", ({ params, init }) => {
  const user = users.find((u) => u.id === params[0]);
  if (!user) return error(404, "not_found", "User not found.");
  Object.assign(user, jsonBody<Partial<UserBase>>(init.body));
  return json(user);
});
route("DELETE", "/users/:id", ({ params }) => {
  if (params[0] === admin.id) return error(400, "bad_request", "You cannot delete your own account.");
  users = users.filter((u) => u.id !== params[0]);
  return json(null, 204);
});
route("POST", "/users/:id/reset-password", ({ params }) => {
  logAudit("user.reset_password", "security", "Password reset by administrator", "success", ["user", params[0]]);
  return json(null, 204);
});
for (const [action, active] of [["enable", true], ["disable", false]] as const) {
  route("POST", `/users/:id/${action}`, ({ params }) => {
    const user = users.find((u) => u.id === params[0]);
    if (user) user.is_active = active;
    return json(null, 204);
  });
}

// Cameras, workers, incidents ---------------------------------------- //
route("GET", "/cameras", () => json(cameras));
route("GET", "/workers", ({ query }) => {
  const dept = query.get("department");
  const search = query.get("search")?.toLowerCase();
  return json(
    workers.filter(
      (w) => (!dept || w.department === dept) && (!search || w.name.toLowerCase().includes(search) || w.employee_id.toLowerCase().includes(search)),
    ),
  );
});
route("GET", "/incidents", ({ query }) => {
  const f = (key: string, value: string) => !query.get(key) || query.get(key) === value;
  return json(
    incidents.filter(
      (i) => f("severity", i.severity) && f("status", i.status) && f("camera", i.camera) && f("worker_id", i.worker_id ?? ""),
    ),
  );
});
route("PATCH", "/incidents/:id", ({ params, init }) => {
  const inc = incidents.find((i) => i.id === params[0]);
  if (!inc) return error(404, "not_found", "Incident not found.");
  Object.assign(inc, jsonBody<Partial<BackendIncident>>(init.body));
  logAudit("incident.update", "operations", `Incident set to ${inc.status}`, "success", ["incident", inc.id]);
  emitDemoEvent("incident_update", inc);
  return json(inc);
});

// Settings, system, audit --------------------------------------------- //
route("GET", "/settings", () => json(settings));
route("PUT", "/settings", ({ init }) => {
  settings = jsonBody<SystemSettings>(init.body);
  logAudit("settings.update", "configuration", "System settings updated");
  return json(settings);
});
route("GET", "/system/health", () => {
  const mem = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  const heapPct = mem ? (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100 : 0;
  return json({
    status: "ok",
    app: "Sentinel (browser demo)",
    version: "1.0.0",
    environment: "demo",
    uptime_seconds: (Date.now() - startedAt) / 1000,
    timestamp: new Date().toISOString(),
    resources: [
      { label: "CPU threads", value: navigator.hardwareConcurrency || 0, unit: "", status: "ok", detail: "Logical cores visible to the browser" },
      { label: "JS heap", value: Math.round(heapPct), unit: "%", status: mem ? (heapPct > 80 ? "warn" : "ok") : "unknown", detail: mem ? `${(mem.usedJSHeapSize / 1e6).toFixed(0)} MB used` : "Not exposed by this browser" },
      { label: "Inference latency", value: Math.round(modelStatus().avg_latency_ms), unit: "ms", status: "ok", detail: `${perf.predictions} predictions this session` },
    ],
    dependencies: [
      { name: "onnxruntime-web", status: isDetectorLoaded() ? "ok" : "unknown", latency_ms: null, detail: isDetectorLoaded() ? "Model session ready" : "Loads on first inference" },
      { name: "In-memory store", status: "ok", latency_ms: 0, detail: "Demo replacement for SQLite / PostgreSQL" },
      { name: "Live event bus", status: "ok", latency_ms: 0, detail: "Demo replacement for the /ws/live WebSocket" },
    ],
    cameras_total: cameras.length,
    cameras_online: cameras.filter((c) => c.status === "online").length,
    websocket_connections: 1,
    model_loaded: isDetectorLoaded(),
    model_device: "browser (wasm)",
  });
});
route("GET", "/audit", ({ query }) => {
  const f = (key: string, value: string) => !query.get(key) || query.get(key) === value;
  const limit = Number(query.get("limit") ?? 100);
  return json(audit.filter((a) => f("category", a.category) && f("status", a.status) && f("actor", a.actor)).slice(0, limit));
});

// ---------------------------------------------------------------------- //
// Site simulator: stand-in camera feeds for the demo command center.
// Each tick takes a sample photo as a "frame" from a site camera, runs it
// through the REAL model, and pushes detections / telemetry / zone-enforced
// incidents through the same live channel the WebSocket would use.
// ---------------------------------------------------------------------- //

const SIM_FEEDS = [
  { cameraId: "cam-01", src: "/samples/rail-bridge-crew-1280.webp" },
  { cameraId: "cam-04", src: "/samples/hi-vis-crew-1280.webp" },
  { cameraId: "cam-09", src: "/samples/site-inspector-1280.webp" },
];
const SIM_INTERVAL_MS = 15_000;
const SIM_FIRST_TICK_MS = 3_000;
const SIM_COOLDOWN_MS = 3 * 60_000;
const sim = { timer: 0, tick: 0, enabled: true, seen: new Map<string, number>() };

async function simulateFrame() {
  if (!sim.enabled || document.hidden) return;
  const feed = SIM_FEEDS[sim.tick++ % SIM_FEEDS.length];
  const camera = cameras.find((c) => c.id === feed.cameraId);
  if (!camera) return;

  const run = await detect(await loadImage(feed.src), settings.detection.confidence_threshold, settings.detection.iou_threshold);
  recordRun(run.totalMs);
  const boxes = toBackendBoxes(run.detections);
  emitDemoEvent("detections", { camera_id: camera.name, boxes });
  emitDemoEvent("telemetry", { source: `simulator/${camera.id}`, fps: perf.lastFps, inference_ms: run.inferenceMs });

  // At most one new incident per tick, so the alert stream stays readable.
  const globalPpe = rules.filter((r) => r.is_active && r.rule_type === "ppe_required" && !r.camera_id).map((r) => r.required_ppe);
  const violation = evaluateFrame(boxes, zones.filter((z) => z.camera_id === camera.id), globalPpe).find(
    (v) => Date.now() - (sim.seen.get(`${camera.id}|${v.zoneId}|${v.label}`) ?? 0) > SIM_COOLDOWN_MS,
  );
  if (violation) {
    sim.seen.set(`${camera.id}|${violation.zoneId}|${violation.label}`, Date.now());
    createIncident(violation.label, violation.severity, violation.confidence, camera.name, { cameraId: camera.id, zoneId: violation.zoneId });
  }
}

/** Starts the simulated feeds; returns a stop function. Safe to call repeatedly. */
export function startSiteSimulator(): () => void {
  if (!sim.timer) {
    const tick = () => void simulateFrame().catch(() => undefined);
    const first = window.setTimeout(tick, SIM_FIRST_TICK_MS);
    sim.timer = window.setInterval(tick, SIM_INTERVAL_MS);
    const interval = sim.timer;
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
      sim.timer = 0;
    };
  }
  return () => undefined;
}

export function setSimulatorEnabled(enabled: boolean) {
  sim.enabled = enabled;
}

export function isSimulatorEnabled() {
  return sim.enabled;
}

// ---------------------------------------------------------------------- //

/** Drop-in replacement for `fetch` against API_BASE. */
export async function demoFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = new URL(path, "http://demo.local");
  const method = (init.method ?? "GET").toUpperCase();
  // Simulate a little network latency so loading states are visible but brief.
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 180));

  for (const [m, re, handler] of routes) {
    if (m !== method) continue;
    const match = url.pathname.match(re);
    if (!match) continue;
    try {
      return await handler({ params: match.slice(1), query: url.searchParams, init });
    } catch (err) {
      return error(500, "demo_error", err instanceof Error ? err.message : "Unexpected demo backend error.");
    }
  }
  return error(404, "not_found", `${method} ${url.pathname} is not available in the demo.`);
}
