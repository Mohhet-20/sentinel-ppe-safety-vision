import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";

import { LiveKpiGrid, LiveWorkerRiskRanking, LiveCameraStatistics, LiveDetectionTrendChart } from "@/components/analytics/LiveAnalyticsPanels";
import { ExecutiveSummaryCard } from "@/components/analytics/ExecutiveSummaryCard";
import {
  ViolationTypeChart,
  SeverityMixChart,
  ViolationZoneChart,
  ConfidenceDistributionChart,
  WeekdayRadarChart,
  HourlyViolationsChart,
} from "@/components/analytics/AnalyticsCharts";
import {
  getCameraStatistics,
  getDetectionTrends,
  getExecutiveSummary,
  getWorkerRiskRanking,
  getZoneRanking,
  listIncidents,
  type BackendIncident,
  type CameraStatEntry,
  type DetectionTrendPoint,
  type ExecutiveSummary,
  type WorkerRiskEntry,
} from "@/lib/api-client";

export default function Analytics() {
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [workers, setWorkers] = useState<WorkerRiskEntry[]>([]);
  const [cameras, setCameras] = useState<CameraStatEntry[]>([]);
  const [trend, setTrend] = useState<DetectionTrendPoint[]>([]);
  const [zoneViolations, setZoneViolations] = useState<{ zone: string; count: number }[]>([]);
  const [incidents, setIncidents] = useState<BackendIncident[]>([]);

  useEffect(() => {
    void getExecutiveSummary().then(setSummary).catch(() => setSummary(null));
    void getWorkerRiskRanking().then(setWorkers).catch(() => setWorkers([]));
    void getCameraStatistics().then(setCameras).catch(() => setCameras([]));
    void getDetectionTrends(14).then(setTrend).catch(() => setTrend([]));
    void listIncidents().then(setIncidents).catch(() => setIncidents([]));
    void getZoneRanking()
      .then((rows) => setZoneViolations(rows.map((z) => ({ zone: z.name, count: z.violation_count }))))
      .catch(() => setZoneViolations([]));
  }, []);

  return (
    <div className="flex flex-col gap-6 pb-6">
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-wide text-foreground">
          <BarChart3 className="h-5 w-5 text-detect" />
          Executive Analytics
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Site-wide safety performance, trends, and data-driven insights across every camera and worker.
        </p>
      </motion.div>

      <LiveKpiGrid summary={summary} />

      <ExecutiveSummaryCard incidents={incidents} workers={workers} cameras={cameras} compliance={summary?.live_compliance ?? null} />

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3"
      >
        <LiveDetectionTrendChart trend={trend} />
        <ViolationTypeChart incidents={incidents} />
        <SeverityMixChart incidents={incidents} />
        <ViolationZoneChart data={zoneViolations} />
        <ConfidenceDistributionChart incidents={incidents} />
        <WeekdayRadarChart incidents={incidents} />
        <HourlyViolationsChart incidents={incidents} />
        <LiveWorkerRiskRanking workers={workers} />
      </motion.div>

      <LiveCameraStatistics cameras={cameras} />
    </div>
  );
}
