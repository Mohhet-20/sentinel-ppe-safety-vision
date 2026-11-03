import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { History } from "lucide-react";

import { cn } from "@/lib/utils";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { Skeleton } from "@/components/ui/skeleton";
import { incidentTitle, useDashboardIncidents } from "@/hooks/use-dashboard-data";
import type { IncidentSeverity } from "@/lib/api-client";

const SEVERITY_DOT: Record<IncidentSeverity, string> = {
  critical: "bg-danger shadow-glow-danger",
  high: "bg-primary shadow-glow-hazard",
  medium: "bg-detect shadow-glow-detect",
  low: "bg-muted-foreground",
};

export function AlertsTimeline() {
  const { data, isLoading } = useDashboardIncidents();
  const alerts = (data ?? []).slice(0, 6);

  return (
    <ChartCard title="Recent Alerts Timeline" icon={History}>
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      ) : alerts.length === 0 ? (
        <p className="py-10 text-center text-xs text-muted-foreground">No alerts yet. Violations appear here in real time.</p>
      ) : (
        <div className="relative ml-1 flex flex-col gap-4 border-l border-border pl-5">
          {alerts.map((alert, i) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative"
            >
              <span className={cn("absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full", SEVERITY_DOT[alert.severity])} />
              <p className="text-xs font-medium leading-snug text-foreground">
                {incidentTitle(alert.missing_ppe)} · {alert.camera}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </ChartCard>
  );
}
