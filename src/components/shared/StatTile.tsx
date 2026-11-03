import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

const STYLES = {
  detect: "bg-detect/10 text-detect",
  danger: "bg-danger/10 text-danger",
  hazard: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  neutral: "bg-secondary text-muted-foreground",
} as const;

export type StatTileAccent = keyof typeof STYLES;

/**
 * Shared small metric tile used across Video Detection, Live Webcam, and
 * other workspaces for compact FPS/latency/count-style readouts.
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  accent = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: StatTileAccent;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="rounded-lg border border-border bg-card/80 p-4 backdrop-blur-sm transition-shadow hover:shadow-panel"
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-md ${STYLES[accent]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 font-display text-xl font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </motion.div>
  );
}
