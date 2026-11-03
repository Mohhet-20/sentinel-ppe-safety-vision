import { History } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionHistoryItem } from "@/lib/mock-detection-data";

export function SessionHistoryPanel({
  items,
  onSelect,
}: {
  items: SessionHistoryItem[];
  onSelect?: (item: SessionHistoryItem) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <History className="h-4 w-4 text-primary" />
          Session History
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-1">
        {items.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Processed files will appear here.</p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect?.(item)}
              className="flex items-center gap-3 rounded-md border border-border/70 bg-secondary/20 px-2.5 py-2 text-left transition-colors hover:bg-secondary/50"
            >
              <span className="h-8 w-8 shrink-0 rounded-md border border-border" style={{ backgroundColor: item.thumbnailColor }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{item.fileName}</p>
                <p className="text-[10px] text-muted-foreground">
                  {item.detections} objects · {item.violations} violations · {item.processedAt}
                </p>
              </div>
              <span className="shrink-0 font-mono text-[10px] text-detect">{(item.avgConfidence * 100).toFixed(0)}%</span>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
