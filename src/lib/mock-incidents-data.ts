export type IncidentSeverity = "critical" | "high" | "medium" | "low";
export type IncidentStatus = "open" | "investigating" | "resolved" | "dismissed";

export interface ActionLogEntry {
  id: string;
  actor: string;
  action: string;
  time: string;
}

export interface CommentEntry {
  id: string;
  author: string;
  text: string;
  time: string;
}

export interface Incident {
  id: string;
  thumbnailColor: string;
  timestamp: string;
  camera: string;
  site: string;
  worker: string;
  missingPpe: string[];
  confidence: number;
  severity: IncidentSeverity;
  status: IncidentStatus;
  assignedTo: string;
  resolution: string;
  notes: string;
  actionLog: ActionLogEntry[];
  comments: CommentEntry[];
}

