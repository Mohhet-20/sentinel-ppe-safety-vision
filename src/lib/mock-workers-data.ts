export interface ViolationHistoryEntry {
  id: string;
  date: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
}

export interface DetectionHistoryEntry {
  id: string;
  time: string;
  camera: string;
  result: "compliant" | "violation";
  confidence: number;
}

export interface TimelineEntry {
  id: string;
  time: string;
  event: string;
}

export interface WorkerProfile {
  id: string;
  employeeId: string;
  name: string;
  initials: string;
  department: string;
  role: string;
  shift: "Day" | "Swing" | "Night";
  site: string;
  currentZone: string;
  status: "on-site" | "off-site" | "on-break";
  complianceScore: number;
  riskScore: number;
  ppeStatus: { hardHat: boolean; vest: boolean; goggles: boolean; gloves: boolean };
  lastSeen: string;
  attendance: { present: number; late: number; absent: number; totalShifts: number };
  violationHistory: ViolationHistoryEntry[];
  detectionHistory: DetectionHistoryEntry[];
  timeline: TimelineEntry[];
}

