import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Search, Users } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkerCard } from "@/components/workers/WorkerCard";
import { WorkerProfileDrawer } from "@/components/workers/WorkerProfileDrawer";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useWorkers } from "@/hooks/use-workers";
import type { WorkerProfile } from "@/lib/mock-workers-data";

export default function Workers() {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [selected, setSelected] = useState<WorkerProfile | null>(null);
  const [open, setOpen] = useState(false);

  // Department filter is applied server-side; free-text search stays client-side
  // for instant feedback without a request per keystroke.
  const { data: workers = [], isLoading, isError, refetch } = useWorkers({ department });

  const departments = useMemo(
    () => ["all", ...Array.from(new Set(workers.map((w) => w.department)))],
    [workers],
  );

  const filtered = useMemo(() => {
    return workers.filter((w) => {
      if (query && !w.name.toLowerCase().includes(query.toLowerCase()) && !w.employeeId.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [query, workers]);

  function openWorker(w: WorkerProfile) {
    setSelected(w);
    setOpen(true);
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-wide text-foreground">
          <Users className="h-5 w-5 text-primary" />
          Worker Directory
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Roster, compliance scores, and per-worker incident history across every site.
        </p>
      </motion.div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or employee ID…"
            className="h-9 w-full rounded-md border border-border bg-secondary/40 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="w-44">
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger>
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d === "all" ? "All departments" : d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-[11px] text-muted-foreground">{filtered.length} workers</span>
      </div>

      {isError ? (
        <ErrorState
          title="Could not load the worker directory"
          description="The workforce service is unreachable. Check that the backend is running and try again."
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/20 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading workers…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No workers match these filters"
          description="Try a different search term or select a different department."
          actionLabel="Clear filters"
          onAction={() => {
            setQuery("");
            setDepartment("all");
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((w, i) => (
            <WorkerCard key={w.id} worker={w} index={i} onClick={() => openWorker(w)} />
          ))}
        </div>
      )}

      <WorkerProfileDrawer worker={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
