import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { incidentTitle, shortIncidentId, useDashboardIncidents } from "@/hooks/use-dashboard-data";
import type { IncidentSeverity } from "@/lib/api-client";

const SEVERITY_VARIANT: Record<IncidentSeverity, "danger" | "default" | "detect" | "secondary"> = {
  critical: "danger",
  high: "default",
  medium: "detect",
  low: "secondary",
};

const STATUS_STYLES: Record<string, string> = {
  open: "text-danger",
  investigating: "text-primary",
  resolved: "text-success",
  dismissed: "text-muted-foreground",
};

function hhmm(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function RecentIncidentsTable() {
  const { data, isLoading } = useDashboardIncidents();
  const rows = (data ?? []).slice(0, 6);
  const today = new Date().toDateString();
  const todayCount = (data ?? []).filter((i) => new Date(i.timestamp).toDateString() === today).length;

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ClipboardList className="h-4 w-4 text-primary" />
          Recent Incidents
        </CardTitle>
        <Link to="/app/incidents" className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground">
          {todayCount} today <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">No incidents recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="px-2 py-2 font-medium">ID</th>
                  <th className="px-2 py-2 font-medium">Incident</th>
                  <th className="px-2 py-2 font-medium">Camera</th>
                  <th className="px-2 py-2 font-medium">Severity</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 text-right font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border/60 transition-colors hover:bg-secondary/40">
                    <td className="px-2 py-2.5 font-mono text-muted-foreground">{shortIncidentId(row.id)}</td>
                    <td className="px-2 py-2.5 font-medium text-foreground">{incidentTitle(row.missing_ppe)}</td>
                    <td className="px-2 py-2.5 text-muted-foreground">{row.camera}</td>
                    <td className="px-2 py-2.5">
                      <Badge variant={SEVERITY_VARIANT[row.severity]} className="capitalize">
                        {row.severity}
                      </Badge>
                    </td>
                    <td className={cn("px-2 py-2.5 font-medium capitalize", STATUS_STYLES[row.status])}>{row.status}</td>
                    <td className="px-2 py-2.5 text-right font-mono text-muted-foreground">{hhmm(row.timestamp)}</td>
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
