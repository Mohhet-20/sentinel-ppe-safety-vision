import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getExecutiveSummary,
  getModelStatus,
  getSystemHealth,
  listCameras,
  listIncidents,
  listWorkers,
  getDetectionTrends,
} from "@/lib/api-client";
import { useLiveChannel } from "@/hooks/use-live-channel";

// Shared query keys so every dashboard widget reads from one cache entry and a
// single live incident event refreshes all of them at once.
export const DASHBOARD_KEYS = {
  incidents: ["dashboard", "incidents"],
  summary: ["dashboard", "summary"],
  workers: ["dashboard", "workers"],
  cameras: ["dashboard", "cameras"],
  trends: ["dashboard", "trends"],
  model: ["dashboard", "model"],
  health: ["dashboard", "health"],
} as const;

export const useDashboardIncidents = () =>
  useQuery({
    queryKey: DASHBOARD_KEYS.incidents,
    queryFn: async () => (await listIncidents()).sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    refetchInterval: 20_000,
  });

export const useDashboardSummary = () =>
  useQuery({ queryKey: DASHBOARD_KEYS.summary, queryFn: getExecutiveSummary, refetchInterval: 15_000 });

export const useDashboardWorkers = () => useQuery({ queryKey: DASHBOARD_KEYS.workers, queryFn: () => listWorkers() });

export const useDashboardCameras = () => useQuery({ queryKey: DASHBOARD_KEYS.cameras, queryFn: listCameras });

export const useDashboardTrends = () =>
  useQuery({ queryKey: DASHBOARD_KEYS.trends, queryFn: () => getDetectionTrends(14), refetchInterval: 60_000 });

export const useDashboardModel = () =>
  useQuery({ queryKey: DASHBOARD_KEYS.model, queryFn: getModelStatus, refetchInterval: 10_000 });

export const useDashboardHealth = () =>
  useQuery({ queryKey: DASHBOARD_KEYS.health, queryFn: getSystemHealth, refetchInterval: 10_000 });

/** Refresh incident-derived widgets the moment the backend pushes a new incident. */
export function useDashboardLiveRefresh() {
  const queryClient = useQueryClient();
  useLiveChannel((event) => {
    if (event.type === "incident_update") {
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_KEYS.incidents });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_KEYS.summary });
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_KEYS.trends });
    }
    if (event.type === "telemetry") {
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_KEYS.model });
    }
  });
}

export { incidentLabel as incidentTitle } from "@/lib/incident-stats";

export function shortIncidentId(id: string) {
  return `INC-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}
