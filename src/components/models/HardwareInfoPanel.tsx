import { Server } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModelStatus } from "@/lib/api-client";

/** The runtime actually executing the model, as reported by the backend (or the browser in demo mode). */
export function HardwareInfoPanel({ status }: { status: ModelStatus | null }) {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const rows: [string, string][] = [
    ["Runtime", status?.backend ?? "—"],
    ["Device", status?.device ?? "—"],
    ["Weights", status?.model_path ?? "—"],
    ["Input size", "640 × 640"],
    ["Classes", status ? String(status.class_names.length) : "—"],
    ["Client CPU threads", String(navigator.hardwareConcurrency || "—")],
    ["Client memory", nav.deviceMemory ? `≥ ${nav.deviceMemory} GB` : "not exposed"],
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Server className="h-4 w-4 text-primary" />
          Runtime Environment
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 text-xs">
            <span className="shrink-0 text-muted-foreground">{label}</span>
            <span className="truncate font-mono text-foreground" title={value}>
              {value}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
