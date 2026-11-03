import { ImageOff, SearchX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Incident } from "@/lib/mock-incidents-data";

const SEVERITY_VARIANT = { critical: "danger", high: "default", medium: "detect", low: "secondary" } as const;
const STATUS_STYLES: Record<Incident["status"], string> = {
  open: "text-danger",
  investigating: "text-primary",
  resolved: "text-success",
  dismissed: "text-muted-foreground",
};

function confidenceColor(c: number) {
  if (c >= 0.95) return "text-success";
  if (c >= 0.85) return "text-primary";
  return "text-danger";
}

export function IncidentTable({ incidents, onOpen }: { incidents: Incident[]; onOpen: (incident: Incident) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[920px] text-left text-xs">
        <thead className="bg-secondary/40">
          <tr className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            <th className="px-3 py-2.5 font-medium">Screenshot</th>
            <th className="px-3 py-2.5 font-medium">ID / Time</th>
            <th className="px-3 py-2.5 font-medium">Camera</th>
            <th className="px-3 py-2.5 font-medium">Worker</th>
            <th className="px-3 py-2.5 font-medium">Missing PPE</th>
            <th className="px-3 py-2.5 font-medium">Confidence</th>
            <th className="px-3 py-2.5 font-medium">Severity</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Assigned</th>
          </tr>
        </thead>
        <tbody>
          {incidents.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-3 py-8">
                <EmptyState
                  icon={SearchX}
                  title="No incidents match the current filters"
                  description="Try clearing a filter or searching a different worker, camera, or incident ID."
                />
              </td>
            </tr>
          ) : (
            incidents.map((inc) => (
              <tr
                key={inc.id}
                onClick={() => onOpen(inc)}
                className="cursor-pointer border-t border-border/60 transition-colors hover:bg-secondary/40"
              >
                <td className="px-3 py-2.5">
                  <div className="flex h-9 w-14 items-center justify-center rounded-md border border-border" style={{ backgroundColor: inc.thumbnailColor }}>
                    <ImageOff className="h-3.5 w-3.5 text-white/20" />
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <p className="font-mono font-medium text-foreground">{inc.id}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{inc.timestamp}</p>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{inc.camera}</td>
                <td className="px-3 py-2.5 font-medium text-foreground">{inc.worker}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{inc.missingPpe.join(", ")}</td>
                <td className={`px-3 py-2.5 font-mono font-semibold ${confidenceColor(inc.confidence)}`}>
                  {(inc.confidence * 100).toFixed(1)}%
                </td>
                <td className="px-3 py-2.5">
                  <Badge variant={SEVERITY_VARIANT[inc.severity]} className="capitalize">
                    {inc.severity}
                  </Badge>
                </td>
                <td className={`px-3 py-2.5 font-medium capitalize ${STATUS_STYLES[inc.status]}`}>{inc.status}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{inc.assignedTo}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
