import { motion } from "framer-motion";
import { Calendar, CalendarDays, CalendarRange, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ReportTemplate } from "@/lib/mock-reports-data";

const ICONS: Record<ReportTemplate["cadence"], typeof Calendar> = {
  Daily: Calendar,
  Weekly: CalendarDays,
  Monthly: CalendarRange,
  Custom: Sparkles,
};

export function ReportTemplateGrid({
  templates,
  selectedId,
  onSelect,
}: {
  templates: ReportTemplate[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {templates.map((t, i) => {
        const Icon = ICONS[t.cadence];
        const active = t.id === selectedId;
        return (
          <motion.button
            key={t.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => onSelect(t.id)}
            className={cn(
              "flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors",
              active ? "border-primary bg-primary/[0.06] shadow-glow-hazard" : "border-border bg-card/70 hover:bg-secondary/40",
            )}
          >
            <span className={cn("flex h-9 w-9 items-center justify-center rounded-md", active ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground")}>
              <Icon className="h-4 w-4" />
            </span>
            <p className="font-display text-sm font-semibold text-foreground">{t.name}</p>
            <p className="text-[11px] leading-snug text-muted-foreground">{t.description}</p>
          </motion.button>
        );
      })}
    </div>
  );
}
