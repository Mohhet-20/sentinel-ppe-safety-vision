import { Link } from "react-router-dom";
import { Camera, Radio, ServerCog, Timer, Zap } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDashboardHealth, useDashboardModel } from "@/hooks/use-dashboard-data";
import type { ResourceGauge } from "@/lib/api-client";

const STATUS_BAR: Record<ResourceGauge["status"], string> = {
  ok: "bg-success",
  warn: "bg-primary",
  critical: "bg-danger",
  unknown: "bg-muted-foreground",
};

function Gauge({ gauge }: { gauge: ResourceGauge }) {
  const isPercent = gauge.unit === "%";
  return (
    <div title={gauge.detail ?? undefined}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{gauge.label}</span>
        <span className="font-mono text-xs font-semibold text-foreground">
          {gauge.status === "unknown" ? "n/a" : `${gauge.value}${gauge.unit ? (isPercent ? "%" : ` ${gauge.unit}`) : ""}`}
        </span>
      </div>
      {isPercent ? (
        <Progress value={gauge.value} indicatorClassName={STATUS_BAR[gauge.status]} />
      ) : (
        gauge.detail && <p className="text-[10px] text-muted-foreground">{gauge.detail}</p>
      )}
    </div>
  );
}

export function SystemStatusSidebar() {
  const { data: health, isLoading } = useDashboardHealth();
  const { data: model } = useDashboardModel();

  return (
    <Card className="hud-panel sticky top-20">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ServerCog className="h-4 w-4 text-primary" />
          System Status
        </CardTitle>
        {health && (
          <span
            className={cn(
              "rounded px-1.5 py-0.5 font-mono text-[10px] uppercase",
              health.status === "ok" ? "bg-success/15 text-success" : health.status === "degraded" ? "bg-primary/15 text-primary" : "bg-danger/15 text-danger",
            )}
          >
            {health.status}
          </span>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-2">
        {isLoading || !health ? (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-8 w-full" />)
        ) : (
          health.resources.map((g) => <Gauge key={g.label} gauge={g} />)
        )}

        <div className="divider-hairline" />

        <div className="flex items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2">
          <span className="text-xs text-muted-foreground">Model</span>
          <span className={cn("font-mono text-xs font-semibold", model?.is_loaded ? "text-detect" : "text-muted-foreground")}>
            {model ? (model.is_loaded ? `${model.class_names.length} classes · ready` : "loads on first use") : "—"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Tile icon={Zap} label="Avg FPS" value={model?.avg_fps ? model.avg_fps.toFixed(1) : "—"} />
          <Tile icon={Timer} label="Inference" value={model?.avg_latency_ms ? `${model.avg_latency_ms.toFixed(0)}ms` : "—"} />
          <Tile icon={Camera} label="Cameras" value={health ? `${health.cameras_online}/${health.cameras_total}` : "—"} />
          <Tile icon={Radio} label="Live clients" value={health ? String(health.websocket_connections) : "—"} />
        </div>

        <Link to="/app/system" className="text-center text-[11px] text-muted-foreground hover:text-foreground">
          Full system health →
        </Link>
      </CardContent>
    </Card>
  );
}

function Tile({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className="mt-0.5 font-mono text-base font-bold text-foreground">{value}</p>
    </div>
  );
}
