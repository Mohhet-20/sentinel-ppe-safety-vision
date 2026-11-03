import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface IncidentFilterState {
  query: string;
  severity: string;
  status: string;
  camera: string;
  worker: string;
}

export function IncidentFilters({
  filters,
  setFilters,
  cameras,
  workers,
  resultCount,
}: {
  filters: IncidentFilterState;
  setFilters: (f: IncidentFilterState) => void;
  cameras: string[];
  workers: string[];
  resultCount: number;
}) {
  function update<K extends keyof IncidentFilterState>(key: K, value: IncidentFilterState[K]) {
    setFilters({ ...filters, [key]: value });
  }

  const hasActiveFilters =
    filters.query || filters.severity !== "all" || filters.status !== "all" || filters.camera !== "all" || filters.worker !== "all";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filters.query}
            onChange={(e) => update("query", e.target.value)}
            placeholder="Search incident ID, worker, camera…"
            className="h-9 w-full rounded-md border border-border bg-secondary/40 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <FilterSelect label="Severity" value={filters.severity} onChange={(v) => update("severity", v)} options={["all", "critical", "high", "medium", "low"]} />
        <FilterSelect label="Status" value={filters.status} onChange={(v) => update("status", v)} options={["all", "open", "investigating", "resolved", "dismissed"]} />
        <FilterSelect label="Camera" value={filters.camera} onChange={(v) => update("camera", v)} options={["all", ...cameras]} />
        <FilterSelect label="Worker" value={filters.worker} onChange={(v) => update("worker", v)} options={["all", ...workers]} />

        {hasActiveFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setFilters({ query: "", severity: "all", status: "all", camera: "all", worker: "all" })}
          >
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">{resultCount} incidents match the current filters</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="w-36">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt} className="capitalize">
              {opt === "all" ? `All ${label.toLowerCase()}` : opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
