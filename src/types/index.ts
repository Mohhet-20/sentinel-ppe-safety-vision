export type IncidentSeverity = "critical" | "high" | "medium" | "low";

export type IncidentStatus = "open" | "investigating" | "resolved" | "dismissed";

export type ViolationType =
  | "no-hard-hat"
  | "no-vest"
  | "no-goggles"
  | "restricted-zone"
  | "fall-detected"
  | "no-gloves"
  | "unsafe-lifting"
  | "fire-hazard";

export interface Incident {
  id: string;
  title: string;
  siteId: string;
  siteName: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  violationType: ViolationType;
  detectedAt: string;
  cameraId: string;
  confidence: number;
  thumbnailUrl?: string;
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  siteId: string;
  siteName: string;
  complianceScore: number;
  activeIncidents: number;
  lastSeenAt: string;
  status: "on-site" | "off-site" | "on-break";
}

export interface Site {
  id: string;
  name: string;
  location: string;
  activeCameras: number;
  activeWorkers: number;
  complianceScore: number;
}

export interface DetectionModel {
  id: string;
  name: string;
  version: string;
  type: "ppe-detection" | "zone-intrusion" | "fall-detection" | "fire-smoke" | "pose-estimation";
  status: "active" | "training" | "idle" | "deprecated";
  accuracy: number;
  lastTrainedAt: string;
}

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  badge?: number;
}
