// Pure aggregations over the incident list. Every analytics chart and summary
// is derived from these, so the numbers on screen always reconcile with the
// Incident Center.

import type { BackendIncident, IncidentSeverity } from "@/lib/api-client";

const DAY = 24 * 3600 * 1000;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function incidentLabel(missingPpe: string | null | undefined) {
  if (!missingPpe) return "Safety violation";
  return /^missing\b|entry|breach/i.test(missingPpe) ? missingPpe : `Missing ${missingPpe}`;
}

function countBy<K>(items: BackendIncident[], key: (i: BackendIncident) => K): Map<K, number> {
  const m = new Map<K, number>();
  items.forEach((i) => m.set(key(i), (m.get(key(i)) ?? 0) + 1));
  return m;
}

export function byType(incidents: BackendIncident[]) {
  return [...countBy(incidents, (i) => incidentLabel(i.missing_ppe))]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

export function bySeverity(incidents: BackendIncident[]) {
  const counts = countBy(incidents, (i) => i.severity);
  return (["critical", "high", "medium", "low"] as IncidentSeverity[]).map((severity) => ({
    name: severity[0].toUpperCase() + severity.slice(1),
    value: counts.get(severity) ?? 0,
  }));
}

/** Confidence histogram in 10-point buckets from 50% up. */
export function confidenceBuckets(incidents: BackendIncident[]) {
  const buckets = [50, 60, 70, 80, 90].map((lo) => ({ bucket: `${lo}–${lo + 10}%`, count: 0 }));
  incidents.forEach((i) => {
    const pct = i.confidence * 100;
    const idx = Math.min(4, Math.max(0, Math.floor((pct - 50) / 10)));
    buckets[idx].count += 1;
  });
  return buckets;
}

export function byWeekday(incidents: BackendIncident[]) {
  const counts = new Array(7).fill(0);
  incidents.forEach((i) => {
    counts[(new Date(i.timestamp).getDay() + 6) % 7] += 1;
  });
  return WEEKDAYS.map((day, idx) => ({ day, count: counts[idx] }));
}

export function byHour(incidents: BackendIncident[]) {
  const counts = new Array(24).fill(0);
  incidents.forEach((i) => {
    counts[new Date(i.timestamp).getHours()] += 1;
  });
  return counts.map((count, hour) => ({ hour: `${String(hour).padStart(2, "0")}h`, count }));
}

export function inWindow(incidents: BackendIncident[], fromDaysAgo: number, toDaysAgo: number, now = Date.now()) {
  return incidents.filter((i) => {
    const age = now - Date.parse(i.timestamp);
    return age >= toDaysAgo * DAY && age < fromDaysAgo * DAY;
  });
}

/** Week-over-week change in violation count, as a signed percentage (null if no baseline). */
export function weekOverWeek(incidents: BackendIncident[], now = Date.now()) {
  const thisWeek = inWindow(incidents, 7, 0, now).length;
  const lastWeek = inWindow(incidents, 14, 7, now).length;
  return { thisWeek, lastWeek, changePct: lastWeek ? ((thisWeek - lastWeek) / lastWeek) * 100 : null };
}

export function peakHour(incidents: BackendIncident[]) {
  const hours = byHour(incidents);
  const top = hours.reduce((best, h) => (h.count > best.count ? h : best), hours[0]);
  return top.count ? Number.parseInt(top.hour, 10) : null;
}
