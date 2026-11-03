import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface PagePlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: "hazard" | "detect";
}

/**
 * Standard scaffold for not-yet-built pages. Keeps every route on-brand
 * (HUD corner frame, scanline sweep) while the real views are built out
 * module by module.
 */
export function PagePlaceholder({ icon: Icon, title, description, accent = "hazard" }: PagePlaceholderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex min-h-[calc(100vh-9rem)] items-center justify-center"
    >
      <Card
        className="hud-panel relative w-full max-w-md overflow-hidden"
        style={{ ["--corner-color" as string]: accent === "hazard" ? "var(--hazard)" : "var(--detect)" }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
          <motion.div
            className="absolute left-0 right-0 h-16 bg-gradient-to-b from-transparent via-detect/10 to-transparent"
            initial={{ top: "-20%" }}
            animate={{ top: "120%" }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
          />
        </div>
        <CardContent className="relative flex flex-col items-center gap-4 py-14 text-center">
          <div
            className={
              accent === "hazard"
                ? "flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"
                : "flex h-14 w-14 items-center justify-center rounded-full bg-detect/10 text-detect"
            }
          >
            <Icon className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-display text-lg font-semibold tracking-wide text-foreground">
              {title}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
          <div className="mt-1 flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
            Module pending
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
