import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ScanEye, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLiveChannel } from "@/hooks/use-live-channel";
import { classColor } from "@/lib/vision/class-style";
import type { BackendDetectedObject } from "@/lib/api-client";

interface FeedRow {
  id: string;
  cls: string;
  confidence: number;
  camera: string;
  time: string;
}

function confidenceColor(c: number) {
  if (c >= 0.8) return "text-success";
  if (c >= 0.6) return "text-primary";
  return "text-danger";
}

/** Every detection the backend broadcasts on /ws/live, newest first. */
export function DetectionFeedPanel() {
  const [rows, setRows] = useState<FeedRow[]>([]);
  const { status } = useLiveChannel((event) => {
    if (event.type !== "detections") return;
    const p = (event.payload ?? {}) as { camera_id?: string; boxes?: BackendDetectedObject[] };
    const time = new Date().toLocaleTimeString("en-GB");
    const next = (p.boxes ?? []).map((b, i) => ({
      id: `${Date.now()}-${i}`,
      cls: b.class_name,
      confidence: b.confidence,
      camera: p.camera_id ?? "camera",
      time,
    }));
    if (next.length) setRows((r) => [...next, ...r].slice(0, 40));
  });

  return (
    <div className="hud-panel relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-panel" style={{ ["--corner-color" as string]: "var(--detect)" }}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <ScanEye className="h-4 w-4 text-detect" />
          <p className="text-sm font-semibold text-foreground">AI Detection Feed</p>
        </div>
        <Badge variant={status === "open" ? "detect" : "secondary"}>
          <Zap className="h-3 w-3" />
          {status === "open" ? "Live" : status}
        </Badge>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-detect/10">
            <span className="absolute inset-0 animate-pulse-ring rounded-full border border-detect/40" />
            <ScanEye className="h-6 w-6 text-detect" />
          </div>
          <p className="text-sm font-medium">Listening for detections</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Every object the model sees on a live stream is pushed here over the real-time channel.
          </p>
          <Button size="sm" variant="detect" asChild>
            <Link to="/app/detection/live">Start live webcam</Link>
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-card/95 backdrop-blur-sm">
              <tr className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-4 py-2 font-medium">Class</th>
                <th className="px-2 py-2 font-medium">Conf.</th>
                <th className="px-4 py-2 text-right font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {rows.map((d) => (
                  <motion.tr
                    key={d.id}
                    initial={{ opacity: 0, backgroundColor: "rgba(0,217,255,0.12)" }}
                    animate={{ opacity: 1, backgroundColor: "rgba(0,0,0,0)" }}
                    className="border-t border-border/60"
                  >
                    <td className="px-4 py-2">
                      <p className="flex items-center gap-2 font-medium text-foreground">
                        <span className="h-2 w-2 rounded-sm" style={{ background: classColor(d.cls) }} />
                        {d.cls}
                      </p>
                      <p className="pl-4 text-[10px] text-muted-foreground">{d.camera}</p>
                    </td>
                    <td className={cn("px-2 py-2 font-mono font-semibold", confidenceColor(d.confidence))}>
                      {(d.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-muted-foreground">{d.time}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
