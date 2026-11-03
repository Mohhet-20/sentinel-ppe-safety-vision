// Thin client for the Sentinel FastAPI backend. Authentication is owned by
// lib/auth.ts (real JWT issued by the Login page) — this module just attaches
// the shared access token to each request and transparently refreshes it once
// on a 401 before giving up. There are no credentials baked into this file.

import { API_BASE, apiTransport, clearTokens, getAccessToken, refreshAccessToken } from "@/lib/auth";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function apiFetch(path: string, init: RequestInit = {}, retryOnAuthFailure = true): Promise<Response> {
  const token = getAccessToken();
  const response = await apiTransport(path, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (response.status === 401 && retryOnAuthFailure) {
    // Access token expired — try a single silent refresh, then retry once.
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch(path, init, false);
    }
    // Refresh failed: clear the session so the route guard bounces to /login.
    clearTokens();
  }

  return response;
}

async function parseErrorBody(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as { error?: { code?: string; message?: string } };
    return new ApiError(
      response.status,
      body.error?.code ?? "unknown_error",
      body.error?.message ?? `Request failed with status ${response.status}`,
    );
  } catch {
    return new ApiError(response.status, "unknown_error", `Request failed with status ${response.status}`);
  }
}

// ---------------------------------------------------------------------- //
// Inference
// ---------------------------------------------------------------------- //

export interface BackendBoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BackendDetectedObject {
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: BackendBoundingBox;
  track_id: string | null;
}

export interface BackendInferenceResult {
  status: "ok" | "model_not_loaded";
  boxes: BackendDetectedObject[];
  latency_ms: number;
  inference_ms: number;
  fps: number;
  model_name: string | null;
  model_version: string | null;
  message: string | null;
  image_width: number | null;
  image_height: number | null;
  original_image_url: string | null;
  annotated_image_url: string | null;
  detection_ids: string[];
}

export async function inferImage(file: File): Promise<BackendInferenceResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiFetch("/inference/image", { method: "POST", body: formData });
  if (!response.ok) {
    throw await parseErrorBody(response);
  }
  return (await response.json()) as BackendInferenceResult;
}

export interface ModelStatus {
  is_loaded: boolean;
  model_path: string;
  exists_on_disk: boolean;
  backend: string | null;
  device: string | null;
  class_names: string[];
  last_loaded_at: string | null;
  load_error: string | null;
  total_predictions: number;
  avg_fps: number;
  avg_latency_ms: number;
}

export async function getModelStatus(): Promise<ModelStatus> {
  const response = await apiFetch("/models/status");
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as ModelStatus;
}

export async function reloadModel(): Promise<ModelStatus> {
  const response = await apiFetch("/models/reload", { method: "POST" });
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as ModelStatus;
}

/** Resolves a backend-relative media path (e.g. "/uploads/images/x.jpg") to a fully-qualified URL. */
export function resolveMediaUrl(path: string): string {
  if (/^(https?|blob|data):/.test(path)) return path;
  const origin = API_BASE.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

// ---------------------------------------------------------------------- //
// Video inference
// ---------------------------------------------------------------------- //

export interface VideoTimelineEvent {
  time_sec: number;
  class_name: string;
  confidence: number;
  track_id: string | null;
  severity: string | null;
}

export interface IncidentSummaryEntry {
  label: string;
  count: number;
}

export interface VideoInferenceResult {
  status: "ok" | "model_not_loaded";
  message: string | null;
  processed_video_url: string | null;
  original_video_url: string | null;
  total_frames: number;
  frames_processed: number;
  total_detections: number;
  unique_tracks: number;
  average_confidence: number;
  processing_fps: number;
  source_fps: number;
  duration_sec: number;
  processing_time_ms: number;
  timeline: VideoTimelineEvent[];
  incident_summary: IncidentSummaryEntry[];
  incident_ids: string[];
}

export async function inferVideo(file: File): Promise<VideoInferenceResult> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiFetch("/inference/video", { method: "POST", body: formData });
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as VideoInferenceResult;
}

// ---------------------------------------------------------------------- //
// Live webcam session
// ---------------------------------------------------------------------- //

export interface WebcamSessionStatus {
  session_id: string | null;
  /** Site camera the session is bound to; its zones and rules are enforced. */
  camera_id?: string | null;
  is_active: boolean;
  started_at: string | null;
  ended_at: string | null;
  frame_count: number;
  detection_count: number;
  unique_tracks: number;
  avg_fps: number;
  avg_latency_ms: number;
  last_updated: string | null;
}

export async function startWebcamSession(cameraLabel: string, cameraId?: string): Promise<WebcamSessionStatus> {
  const formData = new FormData();
  formData.append("camera_label", cameraLabel);
  if (cameraId) formData.append("camera_id", cameraId);
  const response = await apiFetch("/inference/webcam/start", { method: "POST", body: formData });
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as WebcamSessionStatus;
}

export async function stopWebcamSession(sessionId: string): Promise<WebcamSessionStatus> {
  const formData = new FormData();
  formData.append("session_id", sessionId);
  const response = await apiFetch("/inference/webcam/stop", { method: "POST", body: formData });
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as WebcamSessionStatus;
}

export async function inferWebcamFrame(blob: Blob, sessionId: string | null): Promise<BackendInferenceResult> {
  const formData = new FormData();
  formData.append("file", blob, "frame.jpg");
  if (sessionId) formData.append("session_id", sessionId);
  const response = await apiFetch("/inference/webcam", { method: "POST", body: formData });
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as BackendInferenceResult;
}

// ---------------------------------------------------------------------- //
// Analytics (real database-backed metrics)
// ---------------------------------------------------------------------- //

export interface ExecutiveSummary {
  live_compliance: number;
  todays_violations: number;
  weekly_violations: number;
  monthly_violations: number;
  average_confidence: number;
  fps: number;
  latency_ms: number;
  model_loaded: boolean;
}

export interface WorkerRiskEntry {
  id: string;
  name: string;
  department: string;
  risk_score: number;
  compliance_score: number;
}

export interface ZoneRankingEntry {
  id: string;
  name: string;
  zone_type: string;
  violation_count: number;
}

export interface CameraStatEntry {
  id: string;
  name: string;
  status: string;
  violation_count: number;
}

export interface DetectionTrendPoint {
  day: string;
  count: number;
}

export async function getExecutiveSummary(): Promise<ExecutiveSummary> {
  const response = await apiFetch("/analytics/summary");
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as ExecutiveSummary;
}

export async function getWorkerRiskRanking(): Promise<WorkerRiskEntry[]> {
  const response = await apiFetch("/analytics/worker-risk-ranking");
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as WorkerRiskEntry[];
}

export async function getZoneRanking(): Promise<ZoneRankingEntry[]> {
  const response = await apiFetch("/analytics/zone-ranking");
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as ZoneRankingEntry[];
}

export async function getCameraStatistics(): Promise<CameraStatEntry[]> {
  const response = await apiFetch("/analytics/camera-statistics");
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as CameraStatEntry[];
}

export async function getDetectionTrends(days = 14): Promise<DetectionTrendPoint[]> {
  const response = await apiFetch(`/analytics/detection-trends?days=${days}`);
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as DetectionTrendPoint[];
}

// ---------------------------------------------------------------------- //
// Reports (real file downloads)
// ---------------------------------------------------------------------- //

/** Downloads a server-rendered report and resolves with its size in bytes. */
async function downloadReport(path: string, filename: string): Promise<number> {
  const response = await apiFetch(path);
  if (!response.ok) throw await parseErrorBody(response);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return blob.size;
}

export const downloadCsvReport = () => downloadReport("/reports/csv", `sentinel-report-${Date.now()}.csv`);
export const downloadExcelReport = () => downloadReport("/reports/excel", `sentinel-report-${Date.now()}.xlsx`);
export const downloadPdfReport = () => downloadReport("/reports/pdf", `sentinel-report-${Date.now()}.pdf`);

// ---------------------------------------------------------------------- //
// Zones
// ---------------------------------------------------------------------- //

export interface ZonePoint {
  x: number;
  y: number;
}

export interface Zone {
  id: string;
  camera_id: string;
  name: string;
  zone_type: "safe" | "restricted" | "danger" | "mandatory_ppe";
  polygon: ZonePoint[];
  required_ppe: string[];
  priority: number;
  is_active: boolean;
}

export type ZoneInput = Omit<Zone, "id">;

export async function listZones(cameraId?: string): Promise<Zone[]> {
  const query = cameraId ? `?camera_id=${encodeURIComponent(cameraId)}` : "";
  const response = await apiFetch(`/zones${query}`);
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as Zone[];
}

export async function createZone(input: ZoneInput): Promise<Zone> {
  const response = await apiFetch("/zones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as Zone;
}

export async function updateZone(id: string, input: Partial<ZoneInput>): Promise<Zone> {
  const response = await apiFetch(`/zones/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as Zone;
}

export async function deleteZone(id: string): Promise<void> {
  const response = await apiFetch(`/zones/${id}`, { method: "DELETE" });
  if (!response.ok) throw await parseErrorBody(response);
}

// ---------------------------------------------------------------------- //
// Rules
// ---------------------------------------------------------------------- //

export interface RuleConfig {
  id: string;
  name: string;
  rule_type: "ppe_required" | "zone_restricted" | "zone_danger" | "custom";
  camera_id: string | null;
  zone_id: string | null;
  shift: "day" | "swing" | "night" | "all";
  required_ppe: string[];
  severity: "critical" | "high" | "medium" | "low";
  is_active: boolean;
  confidence_threshold: number;
  debounce_seconds: number;
  alert_delay_seconds: number;
}

export type RuleInput = Omit<RuleConfig, "id">;

export async function listRules(): Promise<RuleConfig[]> {
  const response = await apiFetch("/rules");
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as RuleConfig[];
}

export async function createRule(input: Partial<RuleInput>): Promise<RuleConfig> {
  const response = await apiFetch("/rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as RuleConfig;
}

// ---------------------------------------------------------------------- //
// Users (Admin only)
// ---------------------------------------------------------------------- //

export interface UserBase {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  force_password_change: boolean;
}

export async function listUsers(): Promise<UserBase[]> {
  const response = await apiFetch("/users");
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as UserBase[];
}

export async function createUser(input: { username: string; email: string; password: string; role: string; full_name?: string }): Promise<UserBase> {
  const response = await apiFetch("/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as UserBase;
}

export async function updateUser(id: string, input: Partial<{ email: string; full_name: string; role: string; is_active: boolean }>): Promise<UserBase> {
  const response = await apiFetch(`/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as UserBase;
}

export async function deleteUser(id: string): Promise<void> {
  const response = await apiFetch(`/users/${id}`, { method: "DELETE" });
  if (!response.ok) throw await parseErrorBody(response);
}

export async function resetUserPassword(id: string, newPassword: string): Promise<void> {
  const response = await apiFetch(`/users/${id}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ new_password: newPassword }),
  });
  if (!response.ok) throw await parseErrorBody(response);
}

export async function enableUser(id: string): Promise<void> {
  const response = await apiFetch(`/users/${id}/enable`, { method: "POST" });
  if (!response.ok) throw await parseErrorBody(response);
}

export async function disableUser(id: string): Promise<void> {
  const response = await apiFetch(`/users/${id}/disable`, { method: "POST" });
  if (!response.ok) throw await parseErrorBody(response);
}

export async function updateRule(id: string, input: Partial<RuleInput>): Promise<RuleConfig> {
  const response = await apiFetch(`/rules/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as RuleConfig;
}

export async function deleteRule(id: string): Promise<void> {
  const response = await apiFetch(`/rules/${id}`, { method: "DELETE" });
  if (!response.ok) throw await parseErrorBody(response);
}

// ---------------------------------------------------------------------- //
// Cameras (read-only list, used by the Zone editor's camera picker)
// ---------------------------------------------------------------------- //

export interface CameraSummary {
  id: string;
  name: string;
  site: string | null;
  zone: string | null;
  status: string;
}

export async function listCameras(): Promise<CameraSummary[]> {
  const response = await apiFetch("/cameras");
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as CameraSummary[];
}

// ---------------------------------------------------------------------- //
// Incidents
// ---------------------------------------------------------------------- //

export type IncidentSeverity = "critical" | "high" | "medium" | "low";
export type IncidentStatus = "open" | "investigating" | "resolved" | "dismissed";

export interface BackendIncident {
  id: string;
  camera: string;
  missing_ppe: string;
  severity: IncidentSeverity;
  confidence: number;
  worker_id: string | null;
  camera_id: string | null;
  zone_id: string | null;
  track_id: string | null;
  assigned_to: string | null;
  notes: string | null;
  screenshot_path: string | null;
  timestamp: string;
  status: IncidentStatus;
  resolution: string | null;
}

export interface IncidentQuery {
  severity?: string;
  status?: string;
  camera?: string;
  worker_id?: string;
}

export async function listIncidents(query: IncidentQuery = {}): Promise<BackendIncident[]> {
  const params = new URLSearchParams();
  if (query.severity && query.severity !== "all") params.set("severity", query.severity);
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.camera && query.camera !== "all") params.set("camera", query.camera);
  if (query.worker_id) params.set("worker_id", query.worker_id);
  const qs = params.toString();
  const response = await apiFetch(`/incidents${qs ? `?${qs}` : ""}`);
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as BackendIncident[];
}

export interface IncidentUpdate {
  status?: IncidentStatus;
  assigned_to?: string;
  notes?: string;
  resolution?: string;
  severity?: IncidentSeverity;
}

export async function updateIncident(id: string, patch: IncidentUpdate): Promise<BackendIncident> {
  const response = await apiFetch(`/incidents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as BackendIncident;
}

// ---------------------------------------------------------------------- //
// Workers
// ---------------------------------------------------------------------- //

export interface BackendWorker {
  id: string;
  employee_id: string;
  name: string;
  department: string;
  role: string;
  site: string | null;
  compliance_score: number;
  risk_score: number;
}

export async function listWorkers(params: { department?: string; search?: string } = {}): Promise<BackendWorker[]> {
  const qs = new URLSearchParams();
  if (params.department && params.department !== "all") qs.set("department", params.department);
  if (params.search) qs.set("search", params.search);
  const query = qs.toString();
  const response = await apiFetch(`/workers${query ? `?${query}` : ""}`);
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as BackendWorker[];
}

// ---------------------------------------------------------------------- //
// System settings
// ---------------------------------------------------------------------- //

export interface SystemSettings {
  detection: {
    confidence_threshold: number;
    iou_threshold: number;
    tracker: string;
    max_tracking_age: number;
  };
  alerts: {
    email_alerts: boolean;
    push_alerts: boolean;
    sms_alerts: boolean;
    min_severity: string;
  };
  reports: {
    auto_generate_daily: boolean;
    recipients: string[];
  };
}

export async function getSettings(): Promise<SystemSettings> {
  const response = await apiFetch("/settings");
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as SystemSettings;
}

export async function updateSettings(settings: SystemSettings): Promise<SystemSettings> {
  const response = await apiFetch("/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as SystemSettings;
}

// ---------------------------------------------------------------------- //
// System health dashboard
// ---------------------------------------------------------------------- //

export interface ResourceGauge {
  label: string;
  value: number;
  unit: string;
  status: "ok" | "warn" | "critical" | "unknown";
  detail: string | null;
}

export interface DependencyHealth {
  name: string;
  status: "ok" | "degraded" | "down" | "unknown";
  latency_ms: number | null;
  detail: string | null;
}

export interface SystemHealth {
  status: "ok" | "degraded" | "critical";
  app: string;
  version: string;
  environment: string;
  uptime_seconds: number;
  timestamp: string;
  resources: ResourceGauge[];
  dependencies: DependencyHealth[];
  cameras_total: number;
  cameras_online: number;
  websocket_connections: number;
  model_loaded: boolean;
  model_device: string | null;
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const response = await apiFetch("/system/health");
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as SystemHealth;
}

// ---------------------------------------------------------------------- //
// Audit trail
// ---------------------------------------------------------------------- //

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  actor_id: string | null;
  action: string;
  category: "security" | "configuration" | "operations" | "model" | string;
  status: "success" | "failure" | string;
  target_type: string | null;
  target_id: string | null;
  summary: string;
  ip_address: string | null;
}

export interface AuditQuery {
  category?: string;
  status?: string;
  actor?: string;
  limit?: number;
}

export async function listAuditLogs(query: AuditQuery = {}): Promise<AuditLogEntry[]> {
  const params = new URLSearchParams();
  if (query.category && query.category !== "all") params.set("category", query.category);
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.actor) params.set("actor", query.actor);
  params.set("limit", String(query.limit ?? 100));
  const response = await apiFetch(`/audit?${params.toString()}`);
  if (!response.ok) throw await parseErrorBody(response);
  return (await response.json()) as AuditLogEntry[];
}
