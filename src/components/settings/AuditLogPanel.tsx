import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Cog,
  KeyRound,
  Loader2,
  ScrollText,
  ShieldQuestion,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionCard } from "@/components/shared/SectionCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { listAuditLogs, type AuditLogEntry } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const CATEGORY_META: Record<string, { icon: typeof Cog; className: string }> = {
  security: { icon: KeyRound, className: "text-danger" },
  configuration: { icon: Cog, className: "text-primary" },
  operations: { icon: Wrench, className: "text-detect" },
  model: { icon: ShieldQuestion, className: "text-success" },
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function AuditLogPanel() {
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["audit-logs", category, status],
    queryFn: () => listAuditLogs({ category, status, limit: 150 }),
    refetchInterval: 30_000,
  });

  return (
    <SectionCard
      title="Audit Log"
      description="Immutable trail of security, configuration, and operations activity."
      icon={ScrollText}
      right={
        <div className="flex items-center gap-2">
          <div className="w-36">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="configuration">Configuration</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
                <SelectItem value="model">Model</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-28">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failure">Failure</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      }
    >
      {isError ? (
        <ErrorState
          title="Could not load the audit log"
          description="The audit service is unreachable. Check that the backend is running and try again."
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading audit trail…
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit entries yet"
          description="Security and configuration activity will appear here as it happens."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-2 py-2 font-medium">Action</th>
                <th className="px-2 py-2 font-medium">Actor</th>
                <th className="px-2 py-2 font-medium">Detail</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 text-right font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry: AuditLogEntry, i) => {
                const meta = CATEGORY_META[entry.category] ?? CATEGORY_META.operations;
                const Icon = meta.icon;
                return (
                  <motion.tr
                    key={entry.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.015, 0.3) }}
                    className="border-t border-border/60 transition-colors hover:bg-secondary/40"
                  >
                    <td className="px-2 py-2.5">
                      <span className="flex items-center gap-2 font-mono font-medium text-foreground">
                        <Icon className={cn("h-3.5 w-3.5", meta.className)} />
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-muted-foreground">{entry.actor}</td>
                    <td className="max-w-[280px] truncate px-2 py-2.5 text-muted-foreground" title={entry.summary}>
                      {entry.summary || "—"}
                    </td>
                    <td className="px-2 py-2.5">
                      <Badge variant={entry.status === "failure" ? "danger" : "secondary"} className="capitalize">
                        {entry.status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right font-mono text-muted-foreground">
                      {relativeTime(entry.timestamp)}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
