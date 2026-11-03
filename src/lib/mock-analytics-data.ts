// Realistic mock data for the Enterprise Analytics module.

export interface ExecutiveKpi {
  id: string;
  label: string;
  value: string;
  unit?: string;
  delta: string;
  trend: "up" | "down" | "flat";
  status: "success" | "hazard" | "danger" | "detect" | "neutral";
}

export const EXECUTIVE_KPIS: ExecutiveKpi[] = [
  { id: "safety-score", label: "Safety Score", value: "87", unit: "/100", delta: "+3.2", trend: "up", status: "success" },
  { id: "compliance", label: "Compliance", value: "94.6", unit: "%", delta: "+1.3%", trend: "up", status: "success" },
  { id: "violations-today", label: "Violations Today", value: "23", delta: "-8.1%", trend: "down", status: "hazard" },
  { id: "violations-week", label: "Violations (7d)", value: "168", delta: "-4.5%", trend: "down", status: "hazard" },
  { id: "violations-month", label: "Violations (30d)", value: "742", delta: "+2.1%", trend: "up", status: "danger" },
  { id: "active-workers", label: "Active Workers", value: "347", delta: "+4.2%", trend: "up", status: "neutral" },
  { id: "active-cameras", label: "Active Cameras", value: "64", unit: "/68", delta: "94.1%", trend: "flat", status: "neutral" },
  { id: "avg-confidence", label: "Avg. Confidence", value: "96.2", unit: "%", delta: "+0.6%", trend: "up", status: "detect" },
  { id: "avg-latency", label: "Avg. AI Latency", value: "14.8", unit: "ms", delta: "-1.2ms", trend: "down", status: "success" },
  { id: "fps", label: "FPS", value: "58.2", delta: "0.0%", trend: "flat", status: "detect" },
  { id: "gpu", label: "GPU Usage", value: "71", unit: "%", delta: "+5.4%", trend: "up", status: "hazard" },
  { id: "cpu", label: "CPU Usage", value: "44", unit: "%", delta: "-2.1%", trend: "down", status: "success" },
  { id: "ram", label: "RAM Usage", value: "62", unit: "%", delta: "+3.0%", trend: "up", status: "neutral" },
];

export const COMPLIANCE_TREND_30D = Array.from({ length: 14 }, (_, i) => ({
  day: `Day ${i + 1}`,
  compliance: Number((88 + Math.sin(i / 2) * 4 + i * 0.3).toFixed(1)),
}));

export const VIOLATIONS_BY_PPE_TYPE = [
  { type: "No Hard Hat", count: 62 },
  { type: "No Vest", count: 48 },
  { type: "Restricted Zone", count: 34 },
  { type: "No Goggles", count: 21 },
  { type: "No Gloves", count: 15 },
  { type: "Unsafe Lifting", count: 9 },
];

export const PPE_DISTRIBUTION = [
  { name: "Compliant", value: 742, color: "var(--success)" },
  { name: "Missing Hard Hat", value: 62, color: "var(--danger)" },
  { name: "Missing Vest", value: 48, color: "var(--hazard)" },
  { name: "Missing Goggles", value: 21, color: "var(--detect)" },
  { name: "Other", value: 24, color: "#8b97a8" },
];

export const VIOLATIONS_BY_ZONE = [
  { zone: "Loading Dock", count: 44 },
  { zone: "Assembly Line 2", count: 38 },
  { zone: "Warehouse East", count: 29 },
  { zone: "Perimeter Gate", count: 18 },
  { zone: "Maintenance Bay", count: 12 },
];

export interface WorkerRiskEntry {
  id: string;
  name: string;
  department: string;
  riskScore: number;
  violations: number;
}

export const WORKER_RISK_RANKING: WorkerRiskEntry[] = [
  { id: "w1", name: "D. Marsh", department: "Assembly", riskScore: 82, violations: 7 },
  { id: "w2", name: "R. Alvarez", department: "Warehouse", riskScore: 74, violations: 5 },
  { id: "w3", name: "K. Chen", department: "Logistics", riskScore: 66, violations: 4 },
  { id: "w4", name: "T. Obi", department: "Maintenance", riskScore: 58, violations: 3 },
  { id: "w5", name: "S. Novak", department: "Assembly", riskScore: 51, violations: 3 },
];

export interface CameraPerformanceEntry {
  id: string;
  name: string;
  uptime: number;
  avgFps: number;
  detections: number;
  status: "online" | "degraded" | "offline";
}

export const CAMERA_PERFORMANCE: CameraPerformanceEntry[] = [
  { id: "cam-01", name: "CAM-01 · Loading Dock", uptime: 99.8, avgFps: 59.1, detections: 412, status: "online" },
  { id: "cam-04", name: "CAM-04 · Assembly Line 2", uptime: 98.2, avgFps: 57.6, detections: 388, status: "online" },
  { id: "cam-07", name: "CAM-07 · Warehouse East", uptime: 91.4, avgFps: 51.2, detections: 296, status: "degraded" },
  { id: "cam-12", name: "CAM-12 · Perimeter Gate", uptime: 0, avgFps: 0, detections: 0, status: "offline" },
];

export const CONFIDENCE_DISTRIBUTION = [
  { bucket: "50–60%", count: 12 },
  { bucket: "60–70%", count: 24 },
  { bucket: "70–80%", count: 58 },
  { bucket: "80–90%", count: 146 },
  { bucket: "90–100%", count: 512 },
];

export const WEEKLY_SAFETY_TREND = [
  { week: "W1", score: 81 },
  { week: "W2", score: 83 },
  { week: "W3", score: 79 },
  { week: "W4", score: 85 },
  { week: "W5", score: 87 },
  { week: "W6", score: 86 },
  { week: "W7", score: 87 },
];

export const MONTHLY_TREND = [
  { month: "Jan", violations: 812, compliance: 89.1 },
  { month: "Feb", violations: 774, compliance: 90.4 },
  { month: "Mar", violations: 690, compliance: 91.8 },
  { month: "Apr", violations: 758, compliance: 90.9 },
  { month: "May", violations: 705, compliance: 92.6 },
  { month: "Jun", violations: 742, compliance: 94.6 },
];

export const HOURLY_VIOLATIONS = [
  { hour: "06", count: 3 }, { hour: "07", count: 6 }, { hour: "08", count: 11 },
  { hour: "09", count: 9 }, { hour: "10", count: 7 }, { hour: "11", count: 5 },
  { hour: "12", count: 4 }, { hour: "13", count: 8 }, { hour: "14", count: 14 },
  { hour: "15", count: 10 }, { hour: "16", count: 6 }, { hour: "17", count: 3 },
];

export const EXECUTIVE_SUMMARY = {
  siteHealth: "Good" as const,
  siteHealthScore: 87,
  highestRiskWorker: "D. Marsh (Assembly) — Risk Score 82",
  mostDangerousZone: "Loading Dock — 44 violations this month",
  mostCommonViolation: "Missing Hard Hat — 62 occurrences (30d)",
  dailyRecommendation:
    "Increase supervisor presence at the Loading Dock during the 14:00–15:00 peak-violation window observed today.",
  weeklyRecommendation:
    "Schedule refresher PPE training for Assembly department — 3 workers accounted for 61% of this week's hard hat violations.",
};
