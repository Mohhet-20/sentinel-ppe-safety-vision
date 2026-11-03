import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import heroData from "@/data/hero-detections.json";
import { DetectionOverlay, type OverlayBox } from "@/components/landing/DetectionOverlay";
import { classColor, detectionKind } from "@/lib/vision/class-style";

// Real output of backend/models/best.pt on this frame (see scripts in ml/),
// trimmed to the confident detections so the hero stays legible.
const BOXES: OverlayBox[] = (heroData.boxes as OverlayBox[]).filter((b) =>
  b.cls === "Person" ? b.conf >= 0.8 : b.conf >= 0.6,
);
const VIOLATIONS = BOXES.filter((b) => detectionKind(b.cls) === "violation");

export function HeroViewer() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 2600);
    return () => window.clearInterval(id);
  }, []);
  const featured = BOXES[tick % BOXES.length];

  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-primary/20 via-transparent to-detect/20 blur-2xl" />

      <div className="hud-panel overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/40">
        {/* camera chrome */}
        <div className="flex items-center justify-between border-b border-border bg-card/90 px-3 py-2 font-mono text-[10px] text-muted-foreground sm:text-[11px]">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
            </span>
            CAM-15 · RAIL BRIDGE
          </span>
          <span className="hidden sm:inline">PPE-YOLOv8n · 640px</span>
          <span className="text-detect">● ANALYZING</span>
        </div>

        <div className="relative" style={{ aspectRatio: `${heroData.width} / ${heroData.height}` }}>
          <img
            src="/samples/rail-bridge-crew-1280.webp"
            srcSet="/samples/rail-bridge-crew-800.webp 800w, /samples/rail-bridge-crew-1280.webp 1280w"
            sizes="(min-width: 1024px) 640px, 100vw"
            width={heroData.width}
            height={heroData.height}
            alt="Railway maintenance crew on a steel bridge, annotated by the PPE detector"
            className="absolute inset-0 h-full w-full object-cover"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-scanline opacity-60" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 animate-scan bg-gradient-to-b from-transparent via-detect/10 to-transparent" />
          <DetectionOverlay boxes={BOXES} />
        </div>

        {/* HUD footer */}
        <div className="grid grid-cols-3 divide-x divide-border border-t border-border bg-card/90 font-mono text-[10px] sm:text-[11px]">
          <HudStat label="objects" value={String(BOXES.length)} />
          <HudStat label="violations" value={String(VIOLATIONS.length)} tone="text-danger" />
          <HudStat label="ppe found" value={String(BOXES.filter((b) => detectionKind(b.cls) === "ppe").length)} tone="text-success" />
        </div>
      </div>

      {/* floating incident card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tick}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="absolute -bottom-16 -left-3 z-10 hidden w-60 rounded-lg border border-border bg-popover p-3 shadow-xl md:block lg:-left-10"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Detection</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span className="h-2 w-2 rounded-full" style={{ background: classColor(featured.cls) }} />
              {featured.cls}
            </span>
            <span className="font-mono text-xs text-muted-foreground">{(featured.conf * 100).toFixed(1)}%</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-full rounded-full"
              style={{ background: classColor(featured.cls) }}
              initial={{ width: 0 }}
              animate={{ width: `${featured.conf * 100}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function HudStat({ label, value, tone = "text-foreground" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-center gap-1.5 px-2 py-2">
      <span className={`text-sm font-semibold ${tone}`}>{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
