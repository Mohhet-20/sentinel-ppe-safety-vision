import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Camera as CameraIcon,
  CalendarDays,
  CalendarRange,
  Gauge,
  ShieldCheck,
  Timer,
  TrendingUp,
  Users2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import type {
  CameraStatEntry,
  DetectionTrendPoint,
  ExecutiveSummary,
  WorkerRiskEntry,
} from "@/lib/api-client";

// ------------------------------------------------------------------------ //
// KPI grid — every number sourced from /api/analytics/summary
// ------------------------------------------------------------------------ //
export function LiveKpiGrid({ summary }: { summary: ExecutiveSummary | null }) {
  const tiles = [
    { icon: ShieldCheck, label: "Live Compliance", value: summary ? `${summary.live_compliance}%` : "—", accent: "success" as const },
    { icon: AlertTriangle, label: "Today's Violations", value: summary ? summary.todays_violations.toString() : "—", accent: "hazard" as const },
    { icon: CalendarDays, label: "Weekly Violations", value: summary ? summary.weekly_violations.toString() : "—", accent: "hazard" as const },
    { icon: CalendarRange, label: "Monthly Violations", value: summary ? summary.monthly_violations.toString() : "—", accent: "danger" as const },
    { icon: Gauge, label: "Avg. Confidence", value: summary ? `${summary.average_confidence.toFixed(1)}%` : "—", accent: "detect" as const },
    { icon: Activity, label: "Model FPS", value: summary?.fps ? summary.fps.toFixed(1) : "—", accent: "detect" as const },
    { icon: Timer, label: "Model Latency", value: summary?.latency_ms ? `${summary.latency_ms.toFixed(1)}ms` : "—", accent: "success" as const },
  ];

  const styles = {
    success: "bg-success/10 text-success",
    hazard: "bg-primary/10 text-primary",
    danger: "bg-danger/10 text-danger",
    detect: "bg-detect/10 text-detect",
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {tiles.map((tile, i) => (
        <motion.div
          key={tile.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.03 }}
          className="rounded-lg border border-border bg-card/80 p-3.5 backdrop-blur-sm"
        >
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-md", styles[tile.accent])}>
            <tile.icon className="h-4 w-4" />
          </span>
          <p className="mt-2.5 font-display text-lg font-bold text-foreground">{tile.value}</p>
          <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{tile.label}</p>
        </motion.div>
      ))}
      {!summary && (
        <div className="col-span-full text-center text-[11px] text-muted-foreground">
          Live figures require the backend API — showing placeholders until it responds.
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------ //
// Worker risk ranking — real Worker.risk_score data
// ------------------------------------------------------------------------ //
function riskColor(score: number) {
  if (score >= 70) return "bg-danger";
  if (score >= 45) return "bg-primary";
  return "bg-success";
}

export function LiveWorkerRiskRanking({ workers }: { workers: WorkerRiskEntry[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users2 className="h-4 w-4 text-primary" />
          Worker Risk Ranking
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3.5 pt-1">
        {workers.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No workers on record yet.</p>
        ) : (
          workers.map((w, i) => (
            <div key={w.id}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[9px] font-mono text-muted-foreground">
                    {i + 1}
                  </span>
                  {w.name}
                  <span className="text-[10px] text-muted-foreground">· {w.department}</span>
                </span>
                <span className="font-mono text-muted-foreground">{w.compliance_score}% compliant</span>
              </div>
              <Progress value={w.risk_score} indicatorClassName={riskColor(w.risk_score)} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------------ //
// Camera statistics — real violation counts joined from Incident/Camera
// ------------------------------------------------------------------------ //
export function LiveCameraStatistics({ cameras }: { cameras: CameraStatEntry[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CameraIcon className="h-4 w-4 text-primary" />
          Camera Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-1">
        {cameras.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No cameras on record yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[380px] text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="py-1.5 pr-2 font-medium">Camera</th>
                  <th className="py-1.5 pr-2 font-medium">Status</th>
                  <th className="py-1.5 text-right font-medium">Violations</th>
                </tr>
              </thead>
              <tbody>
                {cameras.map((c) => (
                  <tr key={c.id} className="border-t border-border/60">
                    <td className="py-2 pr-2 font-medium text-foreground">{c.name}</td>
                    <td className="py-2 pr-2">
                      <Badge variant={c.status === "online" ? "success" : c.status === "degraded" ? "default" : "danger"} className="capitalize">
                        {c.status}
                      </Badge>
                    </td>
                    <td className="py-2 text-right font-mono text-danger">{c.violation_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------------ //
// Detection trend — real daily incident counts
// ------------------------------------------------------------------------ //
export function LiveDetectionTrendChart({ trend }: { trend: DetectionTrendPoint[] }) {
  return (
    <ChartCard title="Detection Trend (14d, live)" icon={TrendingUp}>
      <div className="h-56 w-full">
        {trend.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No incidents recorded in this window yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={26} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--secondary)" }} />
              <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
}
