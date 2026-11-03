import { motion } from "framer-motion";
import {
  Activity,
  Cpu,
  Database,
  Gauge,
  HardDrive,
  MemoryStick,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/shared/StatTile";
import { ErrorState } from "@/components/shared/ErrorState";
import { useSystemHealth } from "@/hooks/use-system-health";
import type { DependencyHealth, ResourceGauge } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const GAUGE_ICON: Record<string, typeof Cpu> = {
  CPU: Cpu,
  Memory: MemoryStick,
  Disk: HardDrive,
  GPU: Gauge,
};

const OVERALL_STYLES: Record<string, { label: string; className: string }> = {
  ok: { label: "All systems operational", className: "text-success border-success/30 bg-success/10" },
  degraded: { label: "Degraded performance", className: "text-primary border-primary/30 bg-primary/10" },
  critical: { label: "Critical — attention required", className: "text-danger border-danger/30 bg-danger/10" },
};

const GAUGE_BAR: Record<ResourceGauge["status"], string> = {
  ok: "bg-success",
  warn: "bg-primary",
  critical: "bg-danger",
  unknown: "bg-muted-foreground/40",
};

const DEP_DOT: Record<DependencyHealth["status"], string> = {
  ok: "bg-success",
  degraded: "bg-primary",
  down: "bg-danger",
  unknown: "bg-muted-foreground/50",
};

function formatUptime(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export default function SystemHealth() {
  const { data, isLoading, isError, refetch, isFetching } = useSystemHealth();
  const overall = data ? OVERALL_STYLES[data.status] ?? OVERALL_STYLES.degraded : null;

  return (
    <div className="flex flex-col gap-6 pb-6">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-start justify-between gap-3"
      >
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-wide text-foreground">
            <Server className="h-5 w-5 text-primary" />
            System Health
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Live host resources, service dependencies, and platform status — refreshed every 5 seconds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {overall && (
            <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", overall.className)}>
              {overall.label}
            </span>
          )}
          <Button variant="secondary" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} /> Refresh
          </Button>
        </div>
      </motion.div>

      {isError ? (
        <ErrorState
          title="Could not load system health"
          description="The telemetry service is unreachable. Check that the backend is running and try again."
          onRetry={() => void refetch()}
        />
      ) : isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile icon={ShieldCheck} label="Environment" value={data.environment} accent="detect" />
            <StatTile icon={Activity} label="Uptime" value={formatUptime(data.uptime_seconds)} accent="success" />
            <StatTile
              icon={Radio}
              label="Cameras online"
              value={`${data.cameras_online}/${data.cameras_total}`}
              accent={data.cameras_online === data.cameras_total ? "success" : "hazard"}
            />
            <StatTile
              icon={Cpu}
              label="Model device"
              value={data.model_loaded ? (data.model_device ?? "loaded") : "not loaded"}
              accent={data.model_loaded ? "success" : "danger"}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Gauge className="h-4 w-4 text-primary" />
                  Host Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-2">
                {data.resources.map((gauge) => {
                  const Icon = GAUGE_ICON[gauge.label] ?? Gauge;
                  const showBar = gauge.unit === "%" && gauge.status !== "unknown";
                  return (
                    <div key={gauge.label}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 font-medium text-foreground">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          {gauge.label}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {gauge.status === "unknown" ? "—" : `${gauge.value}${gauge.unit}`}
                        </span>
                      </div>
                      {showBar ? (
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className={cn("h-full rounded-full transition-all", GAUGE_BAR[gauge.status])}
                            style={{ width: `${Math.min(100, gauge.value)}%` }}
                          />
                        </div>
                      ) : (
                        <div className="mt-1 h-1.5" />
                      )}
                      {gauge.detail && <p className="mt-1 text-[10px] text-muted-foreground/70">{gauge.detail}</p>}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Database className="h-4 w-4 text-primary" />
                  Service Dependencies
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 pt-2">
                {data.dependencies.map((dep) => (
                  <div
                    key={dep.name}
                    className="flex items-center justify-between border-b border-border/50 py-2.5 last:border-b-0"
                  >
                    <span className="flex items-center gap-2.5 text-xs font-medium text-foreground">
                      <span className={cn("h-2 w-2 rounded-full", DEP_DOT[dep.status])} />
                      {dep.name}
                    </span>
                    <span className="flex items-center gap-2">
                      {dep.latency_ms != null && (
                        <span className="font-mono text-[10px] text-muted-foreground">{dep.latency_ms} ms</span>
                      )}
                      <Badge
                        variant={dep.status === "ok" ? "detect" : dep.status === "down" ? "danger" : "secondary"}
                        className="capitalize"
                      >
                        {dep.status}
                      </Badge>
                    </span>
                  </div>
                ))}
                <div className="mt-2 flex items-center justify-between rounded-md bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Radio className="h-3 w-3" /> WebSocket connections
                  </span>
                  <span className="font-mono">{data.websocket_connections}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <p className="text-right text-[10px] text-muted-foreground/60">
            {data.app} v{data.version} · snapshot {new Date(data.timestamp).toLocaleTimeString()}
          </p>
        </>
      )}
    </div>
  );
}
