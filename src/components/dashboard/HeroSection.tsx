import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, MapPin, ShieldCheck, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  incidentTitle,
  useDashboardCameras,
  useDashboardIncidents,
  useDashboardSummary,
} from "@/hooks/use-dashboard-data";
import type { BackendIncident } from "@/lib/api-client";

const WEEK = 7 * 24 * 3600 * 1000;

/** Rule-based insight from the last 7 days of incidents: top violation × top camera. */
function weeklyInsight(incidents: BackendIncident[]): string {
  const recent = incidents.filter((i) => Date.now() - Date.parse(i.timestamp) < WEEK);
  if (recent.length === 0) return "No violations in the last 7 days. Keep cameras online to maintain coverage.";
  const top = <K,>(key: (i: BackendIncident) => K) => {
    const m = new Map<K, number>();
    recent.forEach((i) => m.set(key(i), (m.get(key(i)) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0];
  };
  const [type, typeCount] = top((i) => incidentTitle(i.missing_ppe));
  const [camera, camCount] = top((i) => i.camera);
  const share = Math.round((camCount / recent.length) * 100);
  return `${type} is the most frequent violation this week (${typeCount} of ${recent.length}). ${share}% of incidents come from ${camera}, so a PPE checkpoint at that entrance would have the biggest impact.`;
}

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function HeroSection() {
  const now = useLiveClock();
  const { data: incidents = [] } = useDashboardIncidents();
  const { data: summary } = useDashboardSummary();
  const { data: cameras = [] } = useDashboardCameras();
  const sites = new Set(cameras.map((c) => c.site).filter(Boolean));
  const openCount = incidents.filter((i) => i.status === "open" || i.status === "investigating").length;
  const resolvedWeek = incidents.filter((i) => i.status === "resolved" && Date.now() - Date.parse(i.timestamp) < WEEK).length;
  const camsOnline = cameras.filter((c) => c.status === "online").length;
  const timeStr = now.toLocaleTimeString("en-US", { hour12: false });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="hud-panel relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-card to-secondary/40 shadow-panel"
    >
      {/* ambient glow + scanline sweep */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/4 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 right-1/4 h-64 w-64 rounded-full bg-detect/10 blur-3xl" />
        <motion.div
          className="absolute left-0 right-0 h-24 bg-gradient-to-b from-transparent via-detect/5 to-transparent"
          initial={{ top: "-30%" }}
          animate={{ top: "130%" }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="relative flex flex-col gap-6 p-6 lg:p-7">
        {/* top row: title + status + clock */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-1.5 w-1.5 items-center justify-center">
                <span className="absolute inline-flex h-2 w-2 animate-pulse-ring rounded-full bg-success" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                Real-time monitoring active
              </p>
            </div>
            <h1 className="mt-1.5 font-display text-2xl font-bold tracking-wide text-foreground lg:text-3xl">
              AI Workplace Safety Platform
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-1.5 sm:flex">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              <span className="text-xs font-semibold text-success">System Healthy</span>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="text-right leading-tight">
                <p className="font-mono text-sm font-semibold tabular-nums text-foreground">{timeStr}</p>
                <p className="text-[10px] text-muted-foreground">{dateStr}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="divider-hairline" />

        {/* middle row: site selector + AI recommendation */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
          <div className="flex items-center gap-2.5 rounded-lg border border-border bg-secondary/40 px-4 py-3">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <div className="leading-tight">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Coverage</p>
              <p className="text-sm font-semibold text-foreground">
                {sites.size} sites · {cameras.length} cameras
              </p>
            </div>
          </div>

          <div className="hud-panel relative rounded-lg border border-detect/25 bg-detect/[0.06] px-4 py-3" style={{ ["--corner-color" as string]: "var(--detect)" }}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-detect/15">
                <Sparkles className="h-3.5 w-3.5 text-detect" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-detect">
                  Weekly insight
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-foreground/90">{weeklyInsight(incidents)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* bottom row: today's safety summary strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryStat label="Resolved this week" value={resolvedWeek} accent="success" />
          <SummaryStat label="Avg. PPE compliance" value={summary ? `${summary.live_compliance.toFixed(1)}%` : "—"} accent="hazard" />
          <SummaryStat label="Open incidents" value={openCount} accent="danger" />
          <SummaryStat label="Cameras online" value={`${camsOnline}/${cameras.length}`} accent="detect" />
        </div>
      </div>
    </motion.div>
  );
}

function SummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: "success" | "hazard" | "danger" | "detect";
}) {
  const dot = {
    success: "bg-success",
    hazard: "bg-primary",
    danger: "bg-danger",
    detect: "bg-detect",
  }[accent];

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-background/40 px-3 py-2.5">
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
      <div className="min-w-0 leading-tight">
        <p className="truncate font-mono text-base font-semibold text-foreground">{value}</p>
        <p className="truncate text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
