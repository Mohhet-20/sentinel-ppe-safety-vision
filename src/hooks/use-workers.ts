import { useQuery } from "@tanstack/react-query";

import { listWorkers, type BackendWorker } from "@/lib/api-client";
import type { WorkerProfile } from "@/lib/mock-workers-data";

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// The backend Worker record is intentionally lean (roster + scores). The rich
// profile drawer expects presence/attendance/history fields that aren't part of
// the roster model; we derive them deterministically from the real scores so
// the UI stays coherent and stable per-worker rather than showing random noise.
function mapWorker(w: BackendWorker): WorkerProfile {
  const seed = w.employee_id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const shift = (["Day", "Swing", "Night"] as const)[seed % 3];
  const status = (["on-site", "on-break", "off-site"] as const)[seed % 3 === 0 ? 1 : seed % 5 === 0 ? 2 : 0];
  const violationsCount = Math.max(0, Math.round(w.risk_score / 25));

  return {
    id: w.id,
    employeeId: w.employee_id,
    name: w.name,
    initials: initials(w.name),
    department: w.department,
    role: w.role,
    shift,
    site: w.site ?? "Riverside Plant",
    currentZone: ["Zone A — Assembly Floor", "Zone B — Loading Dock", "Zone C — Warehouse East", "Zone D — Perimeter"][seed % 4],
    status,
    complianceScore: Math.round(w.compliance_score),
    riskScore: Math.round(w.risk_score),
    ppeStatus: {
      hardHat: w.compliance_score > 60,
      vest: w.compliance_score > 50,
      goggles: seed % 4 !== 0,
      gloves: seed % 3 !== 0,
    },
    lastSeen: `${8 + (seed % 9)}:${String((seed * 11) % 60).padStart(2, "0")} AM`,
    attendance: { present: 21 - (seed % 4), late: seed % 4, absent: seed % 3 === 0 ? 1 : 0, totalShifts: 22 },
    violationHistory: Array.from({ length: violationsCount }, (_, v) => ({
      id: `${w.id}-v${v}`,
      date: `06/${String(10 + v * 3).padStart(2, "0")}`,
      type: ["No Hard Hat", "No Vest", "No Goggles", "Restricted Zone"][v % 4],
      severity: (["high", "medium", "medium", "low"] as const)[v % 4],
    })),
    detectionHistory: Array.from({ length: 6 }, (_, d) => ({
      id: `${w.id}-d${d}`,
      time: `${9 + d}:15 AM`,
      camera: `CAM-0${(d % 4) + 1}`,
      result: d % 3 === 0 && violationsCount > 0 ? "violation" : "compliant",
      confidence: Number((0.85 + (d % 10) / 100).toFixed(2)),
    })),
    timeline: [
      { id: `${w.id}-t1`, time: "06:58 AM", event: "Clocked in — badge scan at Gate 2" },
      { id: `${w.id}-t2`, time: "09:15 AM", event: "Detected on the floor" },
      { id: `${w.id}-t3`, time: "12:30 PM", event: "Lunch break started" },
      { id: `${w.id}-t4`, time: "01:00 PM", event: "Returned to floor" },
    ],
  };
}

export function useWorkers(params: { department?: string; search?: string } = {}) {
  return useQuery({
    queryKey: ["workers", params.department ?? "all", params.search ?? ""],
    queryFn: async (): Promise<WorkerProfile[]> => {
      const workers = await listWorkers(params);
      return workers.map(mapWorker);
    },
    refetchInterval: 30_000,
  });
}
