import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ShieldAlert } from "lucide-react";

import { IncidentFilters, type IncidentFilterState } from "@/components/incidents/IncidentFilters";
import { IncidentTable } from "@/components/incidents/IncidentTable";
import { IncidentDrawer } from "@/components/incidents/IncidentDrawer";
import { ErrorState } from "@/components/shared/ErrorState";
import { useToast } from "@/hooks/use-toast";
import { useIncidents, useUpdateIncident, type UiIncident } from "@/hooks/use-incidents";
import type { IncidentStatus } from "@/lib/api-client";

export default function IncidentCenter() {
  const { data: incidents = [], isLoading, isError, refetch } = useIncidents();
  const updateIncident = useUpdateIncident();
  const { toast } = useToast();

  const [filters, setFilters] = useState<IncidentFilterState>({
    query: "",
    severity: "all",
    status: "all",
    camera: "all",
    worker: "all",
  });
  const [selected, setSelected] = useState<UiIncident | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const cameras = useMemo(() => Array.from(new Set(incidents.map((i) => i.camera))), [incidents]);
  const workers = useMemo(() => Array.from(new Set(incidents.map((i) => i.worker))), [incidents]);

  const filtered = useMemo(() => {
    return incidents.filter((inc) => {
      if (filters.severity !== "all" && inc.severity !== filters.severity) return false;
      if (filters.status !== "all" && inc.status !== filters.status) return false;
      if (filters.camera !== "all" && inc.camera !== filters.camera) return false;
      if (filters.worker !== "all" && inc.worker !== filters.worker) return false;
      if (filters.query) {
        const q = filters.query.toLowerCase();
        if (!inc.id.toLowerCase().includes(q) && !inc.worker.toLowerCase().includes(q) && !inc.camera.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [filters, incidents]);

  function openIncident(inc: UiIncident) {
    setSelected(inc);
    setDrawerOpen(true);
  }

  async function handleStatusChange(status: IncidentStatus, resolution?: string) {
    if (!selected) return;
    try {
      await updateIncident.mutateAsync({ id: selected.realId, patch: { status, ...(resolution ? { resolution } : {}) } });
      setSelected({ ...selected, status, resolution: resolution ?? selected.resolution });
      toast({ title: "Incident updated", description: `${selected.id} marked as ${status}.` });
    } catch {
      toast({ variant: "destructive", title: "Update failed", description: "Could not update the incident. Try again." });
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-wide text-foreground">
          <ShieldAlert className="h-5 w-5 text-primary" />
          Incident Center
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Triage, investigate, and resolve safety incidents flagged across every site.
        </p>
      </motion.div>

      <IncidentFilters filters={filters} setFilters={setFilters} cameras={cameras} workers={workers} resultCount={filtered.length} />

      {isError ? (
        <ErrorState
          title="Could not load incidents"
          description="The incident service is unreachable. Check that the backend is running and try again."
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/20 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading incidents…
        </div>
      ) : (
        <IncidentTable incidents={filtered} onOpen={(inc) => openIncident(inc as UiIncident)} />
      )}

      <IncidentDrawer
        incident={selected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onStatusChange={handleStatusChange}
        isUpdating={updateIncident.isPending}
      />
    </div>
  );
}
