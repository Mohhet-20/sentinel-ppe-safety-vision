// TypeScript mirror of backend/app/services/zone_enforcement.py (+ the parts
// of rule_engine.py / zone_service.py it relies on), used by the in-browser
// demo API so zone and rule configuration behaves identically without a server.

import type { BackendDetectedObject, Zone, ZonePoint } from "@/lib/api-client";

const ASSOCIATION_MARGIN = 0.15;
const PPE_KEYWORDS = ["hardhat", "vest", "boots", "mask", "goggles", "gloves"];

export interface ZoneViolation {
  label: string;
  severity: "critical" | "high" | "medium" | "low";
  zoneId: string | null;
  trackId: string | null;
  confidence: number;
}

/** Ray-casting test over a normalised polygon (zone_service.point_in_polygon). */
export function pointInPolygon([x, y]: [number, number], polygon: ZonePoint[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const { x: xi, y: yi } = polygon[i];
    const { x: xj, y: yj } = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const center = (d: BackendDetectedObject): [number, number] => [d.bbox.x + d.bbox.w / 2, d.bbox.y + d.bbox.h / 2];

/** PPE whose centre lies inside the person's box (grown by a margin): no borrowing a helmet from across the frame. */
export function ppeForPerson(person: BackendDetectedObject, others: BackendDetectedObject[]) {
  const { x, y, w, h } = person.bbox;
  const mx = w * ASSOCIATION_MARGIN;
  const my = h * ASSOCIATION_MARGIN;
  return others.filter((d) => {
    const [cx, cy] = center(d);
    return cx >= x - mx && cx <= x + w + mx && cy >= y - my && cy <= y + h + my;
  });
}

function presentPpe(attached: BackendDetectedObject[]): Set<string> {
  const present = new Set<string>();
  for (const d of attached) {
    const normalized = d.class_name.toLowerCase().replace(/[_ ]/g, "-");
    if (normalized.split("-").includes("no")) continue; // "NO-Safety Vest" never satisfies "vest"
    PPE_KEYWORDS.filter((k) => normalized.includes(k)).forEach((k) => present.add(k));
  }
  return present;
}

function zoneSeverity(zone: Zone): ZoneViolation["severity"] {
  if (zone.zone_type === "danger") return "critical";
  if (zone.zone_type === "restricted") return "high";
  return zone.priority >= 3 ? "medium" : "low";
}

/** Highest-priority active zone containing the person's centre. */
export function resolveZone(person: BackendDetectedObject, zones: Zone[]): Zone | null {
  return [...zones].filter((z) => z.is_active).sort((a, b) => b.priority - a.priority).find((z) => pointInPolygon(center(person), z.polygon)) ?? null;
}

const missingLabel = (missing: string[]) => `Missing ${missing.map((m) => m[0].toUpperCase() + m.slice(1)).join(", ")}`;

/**
 * Evaluates every person in a frame: zone PPE requirements first, then
 * site-wide rules for people outside any zone, then restricted/danger
 * zone breaches (rule_engine.evaluate_frame).
 */
export function evaluateFrame(boxes: BackendDetectedObject[], zones: Zone[], globalRequiredPpe: string[][]): ZoneViolation[] {
  const people = boxes.filter((b) => b.class_name.toLowerCase() === "person");
  const others = boxes.filter((b) => b.class_name.toLowerCase() !== "person");
  const out: ZoneViolation[] = [];

  for (const person of people) {
    const zone = resolveZone(person, zones);
    const present = presentPpe(ppeForPerson(person, others));
    const base = { trackId: person.track_id, confidence: person.confidence, zoneId: zone?.id ?? null };

    const zoneMissing = (zone?.required_ppe ?? []).filter((p) => !present.has(p)).sort();
    if (zone && zoneMissing.length) {
      out.push({ ...base, label: missingLabel(zoneMissing), severity: zoneSeverity(zone) });
    } else if (!zone) {
      for (const required of globalRequiredPpe) {
        const missing = required.filter((p) => !present.has(p)).sort();
        if (missing.length) out.push({ ...base, label: missingLabel(missing), severity: "medium" });
      }
    }

    if (zone && (zone.zone_type === "restricted" || zone.zone_type === "danger")) {
      out.push({ ...base, label: "Restricted Zone Entry", severity: zoneSeverity(zone) });
    }
  }
  return out;
}
