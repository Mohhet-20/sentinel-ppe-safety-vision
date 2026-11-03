import { motion } from "framer-motion";
import { AlertTriangle, Calendar, MapPinned, Sparkles, TrendingDown, TrendingUp, User } from "lucide-react";

import type { BackendIncident, CameraStatEntry, WorkerRiskEntry } from "@/lib/api-client";
import { byType, peakHour, weekOverWeek } from "@/lib/incident-stats";

interface Props {
  incidents: BackendIncident[];
  workers: WorkerRiskEntry[];
  cameras: CameraStatEntry[];
  compliance: number | null;
}

/** Rule-based executive summary: every sentence is derived from live data, nothing is canned. */
export function ExecutiveSummaryCard({ incidents, workers, cameras, compliance }: Props) {
  const topWorker = workers[0];
  const topCamera = [...cameras].sort((a, b) => b.violation_count - a.violation_count)[0];
  const topType = byType(incidents)[0];
  const wow = weekOverWeek(incidents);
  const peak = peakHour(incidents);
  const improving = wow.changePct !== null && wow.changePct < 0;
  const score = compliance === null ? null : Math.round(compliance);
  const health = score === null ? "—" : score >= 90 ? "Good" : score >= 80 ? "Fair" : "At risk";

  const trendText =
    wow.changePct === null
      ? `${wow.thisWeek} violations this week (no prior-week baseline)`
      : `${wow.thisWeek} violations this week, ${Math.abs(wow.changePct).toFixed(0)}% ${improving ? "fewer" : "more"} than last week`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="hud-panel relative overflow-hidden rounded-xl border border-detect/25 bg-gradient-to-br from-card via-card to-detect/[0.06] p-6 shadow-panel"
      style={{ ["--corner-color" as string]: "var(--detect)" }}
    >
      <div className="pointer-events-none absolute -top-20 right-0 h-56 w-56 rounded-full bg-detect/10 blur-3xl" />

      <div className="relative flex flex-wrap items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-detect/15">
          <Sparkles className="h-4 w-4 text-detect" />
        </span>
        <div>
          <p className="font-display text-sm font-semibold tracking-wide text-foreground">Executive Summary</p>
          <p className="text-[10px] text-muted-foreground">Computed from {incidents.length} incidents across {cameras.length} cameras</p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10px] font-medium text-success">
          Site health: {health}
          {score !== null && ` (${score})`}
        </span>
      </div>

      <div className="relative mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <SummaryRow
          icon={User}
          label="Highest-risk worker"
          value={topWorker ? `${topWorker.name} (${topWorker.department}): risk score ${topWorker.risk_score.toFixed(0)}` : "No worker data"}
          accent="danger"
        />
        <SummaryRow
          icon={MapPinned}
          label="Most violations"
          value={topCamera ? `${topCamera.name}: ${topCamera.violation_count} violations` : "No camera data"}
          accent="hazard"
        />
        <SummaryRow
          icon={AlertTriangle}
          label="Most common violation"
          value={topType ? `${topType.type}: ${topType.count} of ${incidents.length} incidents` : "No incidents yet"}
          accent="hazard"
        />
        <SummaryRow icon={improving ? TrendingDown : TrendingUp} label="Week over week" value={trendText} accent={improving ? "success" : "danger"} />
      </div>

      <div className="relative mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <RecommendationCard
          title="Daily focus"
          text={
            peak !== null && topCamera
              ? `Violations peak around ${String(peak).padStart(2, "0")}:00. Schedule a supervisor walk-through at ${topCamera.name.split("·").pop()?.trim()} during that window.`
              : "Not enough data yet to identify a peak window."
          }
        />
        <RecommendationCard
          title="Weekly focus"
          text={
            topType && topWorker
              ? `${topType.type} drives most incidents. Prioritise a PPE refresher for the ${topWorker.department} team, starting with ${topWorker.name}.`
              : "Not enough data yet for a weekly recommendation."
          }
        />
      </div>
    </motion.div>
  );
}

function SummaryRow({ icon: Icon, label, value, accent }: { icon: typeof User; label: string; value: string; accent: "danger" | "hazard" | "success" }) {
  const styles = { danger: "text-danger bg-danger/10", hazard: "text-primary bg-primary/10", success: "text-success bg-success/10" };
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border/70 bg-background/40 px-3 py-2.5">
      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${styles[accent]}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-xs leading-snug text-foreground">{value}</p>
      </div>
    </div>
  );
}

function RecommendationCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/40 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-detect">
        <Calendar className="h-3 w-3" /> {title}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-foreground/90">{text}</p>
    </div>
  );
}
