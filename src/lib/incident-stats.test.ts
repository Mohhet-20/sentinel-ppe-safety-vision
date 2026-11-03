import { describe, expect, it } from "vitest";

import type { BackendIncident } from "@/lib/api-client";
import { byType, confidenceBuckets, incidentLabel, peakHour, weekOverWeek } from "@/lib/incident-stats";

const NOW = Date.parse("2026-06-10T12:00:00Z");
const DAY = 24 * 3600 * 1000;

const incident = (over: Partial<BackendIncident>): BackendIncident => ({
  id: crypto.randomUUID(),
  camera: "CAM-01",
  missing_ppe: "Missing Helmet",
  severity: "high",
  confidence: 0.8,
  worker_id: null,
  camera_id: null,
  zone_id: null,
  track_id: null,
  assigned_to: null,
  notes: null,
  screenshot_path: null,
  timestamp: new Date(NOW - DAY / 2).toISOString(),
  status: "open",
  resolution: null,
  ...over,
});

describe("incidentLabel", () => {
  it("does not double-prefix labels that already say Missing", () => {
    expect(incidentLabel("Missing Helmet")).toBe("Missing Helmet");
    expect(incidentLabel("Hard Hat")).toBe("Missing Hard Hat");
    expect(incidentLabel(null)).toBe("Safety violation");
  });
});

describe("aggregations", () => {
  const sample = [
    incident({}),
    incident({ confidence: 0.95 }),
    incident({ missing_ppe: "Missing Vest", confidence: 0.55, timestamp: new Date(NOW - 9 * DAY).toISOString() }),
  ];

  it("ranks violation types by frequency", () => {
    expect(byType(sample)).toEqual([
      { type: "Missing Helmet", count: 2 },
      { type: "Missing Vest", count: 1 },
    ]);
  });

  it("buckets confidence and clamps 100% into the top bucket", () => {
    const buckets = confidenceBuckets([...sample, incident({ confidence: 1 })]);
    // 0.55 → 50–60, 0.80 → 80–90, 0.95 and 1.0 → 90–100
    expect(buckets.map((b) => b.count)).toEqual([1, 0, 0, 1, 2]);
  });

  it("computes week-over-week change", () => {
    expect(weekOverWeek(sample, NOW)).toEqual({ thisWeek: 2, lastWeek: 1, changePct: 100 });
    expect(weekOverWeek([incident({})], NOW).changePct).toBeNull();
  });

  it("returns null peak hour for an empty list", () => {
    expect(peakHour([])).toBeNull();
  });
});
