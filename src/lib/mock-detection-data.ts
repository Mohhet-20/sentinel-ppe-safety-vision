// Shared mock data for the Image / Video / Live Webcam detection workspaces.
// No backend or AI inference — everything here simulates plausible output
// from a PPE + hazard detection model so the UI can be fully exercised.

import { classColor } from "@/lib/vision/class-style";

export type DetectionClass =
  | "Person"
  | "Hard Hat"
  | "No Hard Hat"
  | "Hi-Vis Vest"
  | "No Vest"
  | "Safety Goggles"
  | "No Goggles"
  | "Gloves"
  | "Forklift"
  | "Restricted Zone Breach";

export interface BoundingBox {
  id: string;
  /** Usually a DetectionClass, but real backend models may return other class names too. */
  class: string;
  confidence: number;
  x: number; // % from left
  y: number; // % from top
  w: number; // % width
  h: number; // % height
}

export const CLASS_COLORS: Record<DetectionClass, string> = {
  Person: "var(--detect)",
  "Hard Hat": "var(--success)",
  "No Hard Hat": "var(--danger)",
  "Hi-Vis Vest": "var(--success)",
  "No Vest": "var(--danger)",
  "Safety Goggles": "var(--success)",
  "No Goggles": "var(--danger)",
  Gloves: "var(--success)",
  Forklift: "var(--hazard)",
  "Restricted Zone Breach": "var(--danger)",
};

const DEFAULT_CLASS_COLOR = "var(--hazard)";

/** Safe color lookup for any class name — including ones a live model returns that aren't in CLASS_COLORS. */
export function getClassColor(className: string): string {
  // Fall back to the shared violation/PPE/person colour language for real model class names.
  return CLASS_COLORS[className as DetectionClass] ?? classColor(className) ?? DEFAULT_CLASS_COLOR;
}

export interface SessionHistoryItem {
  id: string;
  fileName: string;
  thumbnailColor: string;
  detections: number;
  violations: number;
  avgConfidence: number;
  processedAt: string;
}

export const IMAGE_SESSION_HISTORY: SessionHistoryItem[] = [
  { id: "h1", fileName: "loading-dock-cam04.jpg", thumbnailColor: "#1b232f", detections: 6, violations: 1, avgConfidence: 0.93, processedAt: "10:41 AM" },
  { id: "h2", fileName: "assembly-line-2.png", thumbnailColor: "#20180f", detections: 4, violations: 2, avgConfidence: 0.88, processedAt: "10:22 AM" },
  { id: "h3", fileName: "warehouse-east-cam12.jpg", thumbnailColor: "#0f1a20", detections: 8, violations: 0, avgConfidence: 0.97, processedAt: "09:58 AM" },
];

export interface VideoDetectionEvent {
  id: string;
  timeSec: number;
  class: string;
  confidence: number;
  severity: "critical" | "high" | "medium" | "low";
}

export const MOCK_CAMERAS = [
  { id: "cam-01", name: "Loading Dock — CAM 01", status: "online" as const },
  { id: "cam-02", name: "Assembly Line — CAM 02", status: "online" as const },
  { id: "cam-03", name: "Warehouse East — CAM 03", status: "degraded" as const },
  { id: "cam-04", name: "Perimeter Gate — CAM 04", status: "offline" as const },
];
