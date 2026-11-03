import { motion } from "framer-motion";
import { AlertTriangle, Cpu, Gauge, HardDrive, Layers, Timer, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ModelStatus } from "@/lib/api-client";

export function LiveModelStatusCard({
  status,
  loading,
  error,
}: {
  status: ModelStatus | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading && !status) {
    return <Skeleton className="h-40 w-full rounded-xl" />;
  }

  if (error) {
    return (
      <div className="hud-panel flex items-center gap-3 rounded-xl border border-danger/30 bg-danger/[0.05] p-5">
        <AlertTriangle className="h-5 w-5 shrink-0 text-danger" />
        <div>
          <p className="text-sm font-medium text-foreground">Could not reach the model status API</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`hud-panel relative overflow-hidden rounded-xl border p-6 shadow-panel ${
        status.is_loaded ? "border-success/25 bg-gradient-to-br from-card via-card to-success/[0.05]" : "border-danger/25 bg-gradient-to-br from-card via-card to-danger/[0.05]"
      }`}
      style={{ ["--corner-color" as string]: status.is_loaded ? "var(--success)" : "var(--danger)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${status.is_loaded ? "bg-success/15" : "bg-danger/15"}`}>
            <Cpu className={`h-6 w-6 ${status.is_loaded ? "text-success" : "text-danger"}`} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-display text-lg font-bold tracking-wide text-foreground">PPE-YOLOv8n</p>
              <Badge variant={status.is_loaded ? "success" : "danger"}>
                <span className={`h-1.5 w-1.5 rounded-full ${status.is_loaded ? "bg-success" : "bg-danger"}`} />
                {status.is_loaded ? "Loaded" : "Not loaded"}
              </Badge>
              {status.backend === "openvino" && (
                <Badge variant="detect">
                  <Zap className="h-3 w-3" /> OpenVINO
                </Badge>
              )}
            </div>
            <p className="mt-0.5 max-w-md truncate text-xs text-muted-foreground" title={status.model_path}>
              {status.model_path}
            </p>
            {!status.is_loaded && status.load_error && (
              <p className="mt-1 text-xs text-danger">{status.load_error}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBlock icon={HardDrive} label="Device" value={status.device ?? "—"} />
        <StatBlock icon={Layers} label="Classes" value={status.class_names.length.toString()} />
        <StatBlock icon={Gauge} label="Avg FPS" value={status.avg_fps ? status.avg_fps.toFixed(1) : "—"} />
        <StatBlock icon={Timer} label="Avg Latency" value={status.avg_latency_ms ? `${status.avg_latency_ms.toFixed(1)}ms` : "—"} />
      </div>

      {status.class_names.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {status.class_names.map((name) => (
            <Badge key={name} variant="secondary" className="font-mono normal-case">
              {name}
            </Badge>
          ))}
        </div>
      )}

      <p className="mt-4 text-[10px] text-muted-foreground">
        {status.total_predictions} predictions served this session
        {status.last_loaded_at ? ` · loaded ${new Date(status.last_loaded_at).toLocaleString()}` : ""}
      </p>
    </motion.div>
  );
}

function StatBlock({ icon: Icon, label, value }: { icon: typeof Cpu; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/40 px-3 py-2.5">
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </span>
      <p className="mt-1 font-mono text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
