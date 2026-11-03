import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listIncidents,
  listWorkers,
  updateIncident,
  type BackendIncident,
  type IncidentStatus,
  type IncidentUpdate,
} from "@/lib/api-client";
import type { Incident } from "@/lib/mock-incidents-data";

// The UI `Incident` shape (table + drawer) carries a friendly display id; we
// keep the real backend UUID alongside it for mutations without touching the
// presentational components.
export type UiIncident = Incident & { realId: string };

const SEVERITY_COLOR: Record<Incident["severity"], string> = {
  critical: "#20120f",
  high: "#20180f",
  medium: "#0f1a20",
  low: "#141c12",
};

function shortId(uuid: string): string {
  return `INC-${uuid.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min}`;
}

function mapIncident(inc: BackendIncident, workerNames: Map<string, string>): UiIncident {
  const worker = inc.worker_id ? workerNames.get(inc.worker_id) ?? "Unknown worker" : "Unassigned";
  const missingPpe = inc.missing_ppe ? inc.missing_ppe.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const actionLog = [
    {
      id: `${inc.id}-created`,
      actor: "Sentinel AI",
      action: "Incident auto-created from detection",
      time: formatTimestamp(inc.timestamp),
    },
    ...(inc.status !== "open"
      ? [{ id: `${inc.id}-status`, actor: inc.assigned_to || "Operator", action: `Status changed to ${inc.status}`, time: "—" }]
      : []),
  ];

  return {
    realId: inc.id,
    id: shortId(inc.id),
    thumbnailColor: SEVERITY_COLOR[inc.severity] ?? "#1b232f",
    timestamp: formatTimestamp(inc.timestamp),
    camera: inc.camera,
    site: "—",
    worker,
    missingPpe,
    confidence: inc.confidence,
    severity: inc.severity,
    status: inc.status,
    assignedTo: inc.assigned_to || "Unassigned",
    resolution: inc.resolution ?? "",
    notes: inc.notes ?? "",
    actionLog,
    comments: [],
  };
}

export function useIncidents() {
  const query = useQuery({
    queryKey: ["incidents"],
    queryFn: async (): Promise<UiIncident[]> => {
      const [incidents, workers] = await Promise.all([listIncidents(), listWorkers()]);
      const names = new Map(workers.map((w) => [w.id, w.name]));
      return incidents.map((i) => mapIncident(i, names));
    },
    refetchInterval: 20_000,
  });

  return query;
}

export function useUpdateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: IncidentUpdate }) => updateIncident(id, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

export type { IncidentStatus };
