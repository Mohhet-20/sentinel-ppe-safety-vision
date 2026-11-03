import { Link } from "react-router-dom";
import { Radio, ScanEye, Video } from "lucide-react";

import heroData from "@/data/hero-detections.json";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DetectionOverlay, type OverlayBox } from "@/components/landing/DetectionOverlay";
import { detectionKind } from "@/lib/vision/class-style";

const BOXES = (heroData.boxes as OverlayBox[]).filter((b) => (b.cls === "Person" ? b.conf >= 0.8 : b.conf >= 0.6));

/**
 * Latest analysed frame. Physical RTSP cameras aren't attached to this
 * deployment, so it shows a reference frame with the model's real output and
 * routes the user to the live webcam / image pipelines.
 */
export function LiveCameraPanel() {
  const violations = BOXES.filter((b) => detectionKind(b.cls) === "violation").length;

  return (
    <div className="hud-panel relative overflow-hidden rounded-xl border border-border bg-card shadow-panel">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Video className="h-4 w-4 text-detect" />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-foreground">Reference Frame</p>
            <p className="text-[10px] text-muted-foreground">CAM-15 · Rail bridge · real model output</p>
          </div>
        </div>
        <Badge variant={violations ? "danger" : "secondary"}>{violations} violations</Badge>
      </div>

      <div className="relative w-full overflow-hidden bg-black" style={{ aspectRatio: `${heroData.width} / ${heroData.height}` }}>
        <img src="/samples/rail-bridge-crew-800.webp" loading="lazy" alt="Rail maintenance crew analysed by the PPE model" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-scanline opacity-50" />
        <DetectionOverlay boxes={BOXES} stagger={0.05} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="detect" asChild>
            <Link to="/app/detection/live">
              <Radio className="h-3.5 w-3.5" /> Go live
            </Link>
          </Button>
          <Button size="sm" variant="secondary" asChild>
            <Link to="/app/detection/image">
              <ScanEye className="h-3.5 w-3.5" /> Analyze an image
            </Link>
          </Button>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">{BOXES.length} objects · conf ≥ 0.6</span>
      </div>
    </div>
  );
}
