import { Gauge } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModelStatus } from "@/lib/api-client";

// Published evaluation of the checkpoint (see ml/PRETRAINED_MODEL_REPORT.md).
const EVALUATION: [string, string][] = [
  ["mAP@0.50", "0.744"],
  ["mAP@0.50:0.95", "0.436"],
  ["Precision", "0.831"],
  ["Recall", "0.685"],
];

/** Offline accuracy from the model card plus latency measured live on this deployment. */
export function BenchmarkTable({ status }: { status: ModelStatus | null }) {
  const measured: [string, string][] = [
    ["Predictions served", status ? String(status.total_predictions) : "—"],
    ["Avg. latency", status?.avg_latency_ms ? `${status.avg_latency_ms.toFixed(1)} ms` : "run a detection"],
    ["Avg. throughput", status?.avg_fps ? `${status.avg_fps.toFixed(1)} fps` : "run a detection"],
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Gauge className="h-4 w-4 text-primary" />
          Accuracy &amp; Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
        <Section title="Model card (validation set)" rows={EVALUATION} accent="text-detect" />
        <Section title="Measured on this deployment" rows={measured} accent="text-foreground" />
      </CardContent>
    </Card>
  );
}

function Section({ title, rows, accent }: { title: string; rows: [string, string][]; accent: string }) {
  return (
    <div>
      <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
      <div className="flex flex-col gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className={`font-mono font-semibold ${accent}`}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
