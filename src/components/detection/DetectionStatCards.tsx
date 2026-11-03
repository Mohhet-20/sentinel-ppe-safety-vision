import { motion } from "framer-motion";
import { AlertTriangle, Boxes, Target, Timer } from "lucide-react";

import type { BoundingBox } from "@/lib/mock-detection-data";
import { detectionKind } from "@/lib/vision/class-style";

export function DetectionStatCards({ boxes, processingMs }: { boxes: BoundingBox[]; processingMs: number }) {
  const violations = boxes.filter((b) => detectionKind(b.class) === "violation" || b.class === "Restricted Zone Breach").length;
  const avgConfidence = boxes.length ? boxes.reduce((s, b) => s + b.confidence, 0) / boxes.length : 0;

  const stats = [
    { label: "Detections", value: boxes.length.toString(), icon: Boxes, accent: "detect" as const },
    { label: "Violations", value: violations.toString(), icon: AlertTriangle, accent: violations > 0 ? ("danger" as const) : ("success" as const) },
    { label: "Avg. Confidence", value: `${(avgConfidence * 100).toFixed(1)}%`, icon: Target, accent: "hazard" as const },
    { label: "Processing Time", value: `${processingMs}ms`, icon: Timer, accent: "success" as const },
  ];

  const styles = {
    detect: { bg: "bg-detect/10", text: "text-detect" },
    hazard: { bg: "bg-primary/10", text: "text-primary" },
    danger: { bg: "bg-danger/10", text: "text-danger" },
    success: { bg: "bg-success/10", text: "text-success" },
  };

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-lg border border-border bg-card/80 p-4 backdrop-blur-sm"
        >
          <span className={`flex h-8 w-8 items-center justify-center rounded-md ${styles[s.accent].bg}`}>
            <s.icon className={`h-4 w-4 ${styles[s.accent].text}`} />
          </span>
          <p className="mt-3 font-display text-xl font-bold text-foreground">{s.value}</p>
          <p className="text-[11px] text-muted-foreground">{s.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
