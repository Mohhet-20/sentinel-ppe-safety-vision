import { KpiCard, type KpiDatum } from "@/components/dashboard/KpiCard";
import {
  useDashboardCameras,
  useDashboardIncidents,
  useDashboardModel,
  useDashboardSummary,
  useDashboardWorkers,
} from "@/hooks/use-dashboard-data";

const DAY = 24 * 3600 * 1000;

/**
 * Every KPI is derived from a live endpoint. Values render as "—" while
 * loading rather than showing placeholder numbers.
 */
export function KpiGrid() {
  const { data: summary } = useDashboardSummary();
  const { data: incidents } = useDashboardIncidents();
  const { data: workers } = useDashboardWorkers();
  const { data: cameras } = useDashboardCameras();
  const { data: model } = useDashboardModel();

  const inWindow = (from: number, to: number) =>
    (incidents ?? []).filter((i) => {
      const age = Date.now() - Date.parse(i.timestamp);
      return age >= from && age < to;
    }).length;
  const today = inWindow(0, DAY);
  const yesterday = inWindow(DAY, 2 * DAY);
  const thisWeek = inWindow(0, 7 * DAY);
  const lastWeek = inWindow(7 * DAY, 14 * DAY);
  const open = (incidents ?? []).filter((i) => i.status === "open").length;
  const critical = (incidents ?? []).filter((i) => i.status !== "resolved" && i.status !== "dismissed" && (i.severity === "critical" || i.severity === "high")).length;
  const online = (cameras ?? []).filter((c) => c.status.toLowerCase() === "online").length;
  const highRisk = (workers ?? []).filter((w) => w.risk_score >= 75).length;

  const delta = (now: number, prev: number): Pick<KpiDatum, "trend" | "delta"> =>
    now === prev ? { trend: "flat", delta: "±0" } : { trend: now > prev ? "up" : "down", delta: `${now > prev ? "+" : ""}${now - prev}` };

  const v = (ready: unknown, value: string) => (ready ? value : "—");

  const data: KpiDatum[] = [
    { id: "compliance", label: "PPE Compliance", value: v(summary, summary?.live_compliance.toFixed(1) ?? ""), unit: "%", trend: "flat", delta: "avg", status: "success", icon: "shield-check" },
    { id: "today", label: "Violations Today", value: v(incidents, String(today)), ...delta(today, yesterday), status: "hazard", icon: "alert-triangle" },
    { id: "week", label: "Violations (7d)", value: v(incidents, String(thisWeek)), ...delta(thisWeek, lastWeek), status: "hazard", icon: "bell" },
    { id: "open", label: "Open Incidents", value: v(incidents, String(open)), trend: "flat", delta: "triage", status: "danger", icon: "target" },
    { id: "critical", label: "High / Critical", value: v(incidents, String(critical)), trend: "flat", delta: "unresolved", status: "danger", icon: "alert-triangle" },
    { id: "cameras", label: "Cameras Online", value: v(cameras, String(online)), unit: cameras ? `/${cameras.length}` : undefined, trend: "flat", delta: cameras ? `${Math.round((online / Math.max(cameras.length, 1)) * 100)}%` : "", status: "neutral", icon: "camera" },
    { id: "workers", label: "Workers", value: v(workers, String(workers?.length ?? 0)), trend: "flat", delta: "tracked", status: "neutral", icon: "users" },
    { id: "risk", label: "High-Risk Workers", value: v(workers, String(highRisk)), trend: "flat", delta: "risk ≥ 75", status: "hazard", icon: "user-check" },
    { id: "latency", label: "Inference Latency", value: model?.avg_latency_ms ? model.avg_latency_ms.toFixed(0) : "—", unit: model?.avg_latency_ms ? "ms" : undefined, trend: "flat", delta: "avg", status: "success", icon: "timer" },
    { id: "fps", label: "Throughput", value: model?.avg_fps ? model.avg_fps.toFixed(1) : "—", unit: model?.avg_fps ? "fps" : undefined, trend: "flat", delta: "avg", status: "detect", icon: "activity" },
    { id: "predictions", label: "Predictions", value: v(model, String(model?.total_predictions ?? 0)), trend: "flat", delta: "this session", status: "detect", icon: "cpu" },
    { id: "confidence", label: "Avg Confidence", value: summary ? summary.average_confidence.toFixed(0) : "—", unit: summary ? "%" : undefined, trend: "flat", delta: "incidents", status: "neutral", icon: "gauge" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {data.map((kpi, i) => (
        <KpiCard key={kpi.id} data={kpi} index={i} />
      ))}
    </div>
  );
}
