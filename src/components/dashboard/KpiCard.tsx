import { motion } from "framer-motion";
import {
  Users,
  UserCheck,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Cpu,
  Gauge,
  MemoryStick,
  Timer,
  Target,
  Bell,
  Camera,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export interface KpiDatum {
  id: string;
  label: string;
  value: string;
  unit?: string;
  trend: "up" | "down" | "flat";
  delta: string;
  status: "success" | "hazard" | "danger" | "detect" | "neutral";
  icon:
    | "users"
    | "user-check"
    | "alert-triangle"
    | "shield-check"
    | "activity"
    | "cpu"
    | "gauge"
    | "memory-stick"
    | "timer"
    | "target"
    | "bell"
    | "camera";
}

const ICONS: Record<KpiDatum["icon"], LucideIcon> = {
  users: Users,
  "user-check": UserCheck,
  "alert-triangle": AlertTriangle,
  "shield-check": ShieldCheck,
  activity: Activity,
  cpu: Cpu,
  gauge: Gauge,
  "memory-stick": MemoryStick,
  timer: Timer,
  target: Target,
  bell: Bell,
  camera: Camera,
};

const STATUS_STYLES: Record<KpiDatum["status"], { text: string; bg: string; ring: string }> = {
  success: { text: "text-success", bg: "bg-success/10", ring: "group-hover:shadow-glow-detect" },
  hazard: { text: "text-primary", bg: "bg-primary/10", ring: "group-hover:shadow-glow-hazard" },
  danger: { text: "text-danger", bg: "bg-danger/10", ring: "group-hover:shadow-glow-danger" },
  detect: { text: "text-detect", bg: "bg-detect/10", ring: "group-hover:shadow-glow-detect" },
  neutral: { text: "text-muted-foreground", bg: "bg-secondary", ring: "" },
};

const TREND_ICON = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus };

export function KpiCard({ data, index }: { data: KpiDatum; index: number }) {
  const Icon = ICONS[data.icon];
  const TrendIcon = TREND_ICON[data.trend];
  const style = STATUS_STYLES[data.status];

  // For most safety metrics, "down" is favorable for violations/alerts/latency,
  // and "up" is favorable for compliance/accuracy/active counts. We infer the
  // semantic color from the KPI's own status rather than raw trend direction.
  const trendColor =
    data.status === "danger" ? "text-danger" : data.status === "hazard" ? "text-primary" : data.status === "success" ? "text-success" : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.035, ease: "easeOut" }}
      whileHover={{ y: -3 }}
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-card/80 p-4 backdrop-blur-sm transition-shadow duration-300",
        style.ring,
      )}
    >
      {/* glass sheen */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent" />

      <div className="relative flex items-start justify-between">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-md", style.bg)}>
          <Icon className={cn("h-4.5 w-4.5", style.text)} strokeWidth={2} />
        </span>
        <span className={cn("flex items-center gap-0.5 rounded-full bg-secondary/60 px-1.5 py-0.5 text-[10px] font-mono font-medium", trendColor)}>
          <TrendIcon className="h-3 w-3" />
          {data.delta}
        </span>
      </div>

      <div className="relative mt-3.5">
        <p className="flex items-baseline gap-1 font-display text-2xl font-bold tracking-wide text-foreground">
          {data.value}
          {data.unit && <span className="text-sm font-medium text-muted-foreground">{data.unit}</span>}
        </p>
        <p className="mt-0.5 text-xs font-medium text-muted-foreground">{data.label}</p>
      </div>
    </motion.div>
  );
}
