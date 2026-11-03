import { Download, FileSpreadsheet, FileText, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import type { ReportHistoryItem } from "@/lib/mock-reports-data";

const FORMAT_ICON = { PDF: FileText, CSV: FileSpreadsheet, Excel: FileSpreadsheet };

export function ReportHistoryTable({ items, onDownload }: { items: ReportHistoryItem[]; onDownload: (item: ReportHistoryItem) => void }) {
  const download = onDownload;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <History className="h-4 w-4 text-primary" />
          Report History
        </CardTitle>
        <span className="text-[10px] font-mono text-muted-foreground">{items.length} reports</span>
      </CardHeader>
      <CardContent className="pt-1">
        {items.length === 0 ? (
          <EmptyState icon={History} title="No reports yet" description="Reports you export this session appear here for quick re-download." />
        ) : (
          <div className="flex flex-col gap-1.5">
            {items.map((item) => {
              const Icon = FORMAT_ICON[item.format];
              return (
                <div key={item.id} className="flex items-center gap-3 rounded-md border border-border/70 bg-secondary/20 px-3 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {item.generatedAt} · {item.generatedBy} · {(item.sizeKb / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <Badge variant="secondary">{item.format}</Badge>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => download(item)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
