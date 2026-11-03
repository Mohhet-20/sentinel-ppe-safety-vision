import { ListChecks } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClassColor, type BoundingBox } from "@/lib/mock-detection-data";

function confidenceColor(c: number) {
  if (c >= 0.95) return "text-success";
  if (c >= 0.85) return "text-primary";
  return "text-danger";
}

export function DetectionResultsTable({ boxes }: { boxes: BoundingBox[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ListChecks className="h-4 w-4 text-primary" />
          Detection Results
        </CardTitle>
        <span className="text-[10px] font-mono text-muted-foreground">{boxes.length} objects</span>
      </CardHeader>
      <CardContent className="pt-1">
        {boxes.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No detections above the current threshold.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="py-1.5 pr-2 font-medium">Class</th>
                  <th className="py-1.5 pr-2 font-medium">Confidence</th>
                  <th className="py-1.5 pr-2 font-medium">Position (x, y)</th>
                  <th className="py-1.5 text-right font-medium">Size (w × h)</th>
                </tr>
              </thead>
              <tbody>
                {boxes.map((b) => (
                  <tr key={b.id} className="border-t border-border/60">
                    <td className="py-2 pr-2">
                      <span className="flex items-center gap-1.5 font-medium text-foreground">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getClassColor(b.class) }} />
                        {b.class}
                      </span>
                    </td>
                    <td className={cn("py-2 pr-2 font-mono font-semibold", confidenceColor(b.confidence))}>
                      {(b.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 pr-2 font-mono text-muted-foreground">
                      {b.x.toFixed(0)}%, {b.y.toFixed(0)}%
                    </td>
                    <td className="py-2 text-right font-mono text-muted-foreground">
                      {b.w.toFixed(0)}% × {b.h.toFixed(0)}%
                    </td>
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
