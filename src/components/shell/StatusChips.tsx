import { Camera, ServerCog, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { useDashboardHealth, useDashboardModel } from "@/hooks/use-dashboard-data";

export function StatusChips() {
  const { data: health } = useDashboardHealth();
  const { data: model } = useDashboardModel();
  const modelName = model?.model_path.split(/[\\/]/).pop()?.replace(/\.(pt|onnx)$/, "") ?? "model";
  const ok = health?.status === "ok";

  return (
    <div className="hidden items-center gap-2 xl:flex">
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-2.5 py-1",
          ok ? "border-success/25 bg-success/10 text-success" : "border-primary/25 bg-primary/10 text-primary",
        )}
      >
        <ShieldCheck className="h-3 w-3" />
        <span className="text-[10px] font-medium capitalize">{health ? (ok ? "Healthy" : health.status) : "Checking…"}</span>
      </div>
      <div className="flex items-center gap-1.5 rounded-full border border-detect/25 bg-detect/10 px-2.5 py-1">
        <ServerCog className="h-3 w-3 text-detect" />
        <span className="font-mono text-[10px] text-detect">
          {modelName}
          {model && ` · ${model.class_names.length} cls`}
        </span>
      </div>
      {health && (
        <div className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1">
          <Camera className="h-3 w-3 text-primary" />
          <span className="font-mono text-[10px] text-primary">
            {health.cameras_online}/{health.cameras_total} cams
          </span>
        </div>
      )}
    </div>
  );
}
