import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertOctagon, Bell, Check, Info, Loader2, WifiOff } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listIncidents, type BackendIncident } from "@/lib/api-client";
import { useLiveChannel, type LiveEvent } from "@/hooks/use-live-channel";

type Severity = "critical" | "high" | "medium" | "low" | "info";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  severity: Severity;
  read: boolean;
}

const SEVERITY_DOT: Record<Severity, string> = {
  critical: "bg-danger shadow-glow-danger",
  high: "bg-primary shadow-glow-hazard",
  medium: "bg-detect",
  low: "bg-muted-foreground",
  info: "bg-detect",
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor(Math.max(0, Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function incidentToNotification(inc: BackendIncident): NotificationItem {
  const sev = (["critical", "high", "medium", "low"].includes(inc.severity) ? inc.severity : "info") as Severity;
  const missing = inc.missing_ppe ? inc.missing_ppe : "PPE violation";
  return {
    id: inc.id,
    title: sev === "critical" ? "Critical safety violation" : "PPE violation detected",
    description: `${inc.camera} — missing ${missing}`,
    time: relativeTime(inc.timestamp),
    severity: sev,
    read: inc.status === "resolved" || inc.status === "dismissed",
  };
}

export function NotificationCenter() {
  const navigate = useNavigate();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [live, setLive] = useState<NotificationItem[]>([]);

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["notifications-incidents"],
    queryFn: () => listIncidents(),
    refetchInterval: 30_000,
  });

  // Instant push: a live incident event prepends a notification without waiting for the poll.
  const { status: liveStatus } = useLiveChannel((event: LiveEvent) => {
    if (event.type !== "incident_update") return;
    const p = (event.payload ?? {}) as { id?: string; missing_ppe?: string; severity?: string; camera?: string };
    const sev = (["critical", "high", "medium", "low"].includes(p.severity ?? "") ? p.severity : "high") as Severity;
    setLive((prev) => [
      {
        id: p.id ?? crypto.randomUUID(),
        title: sev === "critical" ? "Critical safety violation" : "PPE violation detected",
        description: `${p.camera ?? "Live camera"} — missing ${p.missing_ppe ?? "PPE"}`,
        time: "just now",
        severity: sev,
        read: false,
      },
      ...prev,
    ]);
  });

  const items = useMemo(() => {
    const fromIncidents = incidents
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 12)
      .map(incidentToNotification);
    // De-dupe live events that later show up in the polled incident list.
    const seen = new Set(fromIncidents.map((n) => n.id));
    const merged = [...live.filter((n) => !seen.has(n.id)), ...fromIncidents];
    return merged.map((n) => ({ ...n, read: n.read || readIds.has(n.id) }));
  }, [incidents, live, readIds]);

  const unread = items.filter((n) => !n.read).length;

  // Keep the read set from growing unbounded across sessions of the dropdown.
  useEffect(() => {
    if (readIds.size > 200) setReadIds(new Set());
  }, [readIds]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Bell className="h-4.5 w-4.5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-danger px-0.5 text-[9px] font-bold text-white shadow-glow-danger">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
            Notifications
            {liveStatus === "open" ? (
              <span className="flex items-center gap-1 text-[9px] font-medium normal-case tracking-normal text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> live
              </span>
            ) : (
              <WifiOff className="h-3 w-3 text-muted-foreground/60" />
            )}
          </p>
          <button
            className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
            onClick={() => setReadIds(new Set(items.map((n) => n.id)))}
          >
            <Check className="h-3 w-3" /> Mark all read
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Info className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">You&rsquo;re all caught up</p>
            </div>
          ) : (
            items.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                onClick={() => setReadIds((prev) => new Set(prev).add(n.id))}
                className={cn(
                  "flex cursor-pointer gap-2.5 border-b border-border/60 px-3.5 py-2.5 transition-colors last:border-b-0 hover:bg-secondary/50",
                  !n.read && "bg-secondary/20",
                )}
              >
                <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", SEVERITY_DOT[n.severity])} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{n.title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{n.description}</p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">{n.time}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
        <div className="border-t border-border px-3.5 py-2 text-center">
          <button
            onClick={() => navigate("/app/incidents")}
            className="flex w-full items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            <AlertOctagon className="h-3 w-3" /> View incident center
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
