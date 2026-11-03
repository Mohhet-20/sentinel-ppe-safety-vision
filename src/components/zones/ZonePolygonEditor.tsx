import { useRef, useState } from "react";
import { RotateCcw, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ZonePoint } from "@/lib/api-client";

const ZONE_TYPE_COLOR: Record<string, string> = {
  safe: "#2ecc71",
  restricted: "#ff9f1c",
  danger: "#ff3b3b",
  mandatory_ppe: "#00d9ff",
};

/**
 * Click-to-place polygon editor over a placeholder camera frame. Points are
 * stored normalized (0-1) so they stay valid at any render size — the same
 * convention the backend Zone.polygon field uses.
 */
export function ZonePolygonEditor({
  points,
  onChange,
  zoneType,
  existingZones,
}: {
  points: ZonePoint[];
  onChange: (points: ZonePoint[]) => void;
  zoneType: string;
  existingZones?: { polygon: ZonePoint[]; zone_type: string; name: string }[];
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<ZonePoint | null>(null);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    onChange([...points, { x, y }]);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    });
  }

  function undoLast() {
    onChange(points.slice(0, -1));
  }

  function clearAll() {
    onChange([]);
  }

  const activeColor = ZONE_TYPE_COLOR[zoneType] ?? "#ff9f1c";
  const pointsAttr = points.map((p) => `${p.x * 100},${p.y * 100}`).join(" ");
  const previewAttr = hover && points.length > 0 ? `${points[points.length - 1].x * 100},${points[points.length - 1].y * 100} ${hover.x * 100},${hover.y * 100}` : "";

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={stageRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
        className="hud-panel relative aspect-video w-full cursor-crosshair overflow-hidden rounded-lg border border-border bg-[#05070a]"
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40">
            Click to place polygon vertices
          </p>
        </div>

        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {existingZones?.map((z, i) => (
            <polygon
              key={i}
              points={z.polygon.map((p) => `${p.x * 100},${p.y * 100}`).join(" ")}
              fill={ZONE_TYPE_COLOR[z.zone_type] ?? "#8b97a8"}
              fillOpacity={0.08}
              stroke={ZONE_TYPE_COLOR[z.zone_type] ?? "#8b97a8"}
              strokeOpacity={0.4}
              strokeWidth={0.3}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {points.length > 1 && (
            <polygon
              points={pointsAttr}
              fill={activeColor}
              fillOpacity={0.15}
              stroke={activeColor}
              strokeWidth={0.4}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {previewAttr && (
            <polyline points={previewAttr} fill="none" stroke={activeColor} strokeOpacity={0.5} strokeWidth={0.3} strokeDasharray="1,1" vectorEffect="non-scaling-stroke" />
          )}
          {points.map((p, i) => (
            <circle key={i} cx={p.x * 100} cy={p.y * 100} r={0.8} fill={activeColor} stroke="#0a0e14" strokeWidth={0.3} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={undoLast} disabled={points.length === 0}>
          <Undo2 className="h-3.5 w-3.5" /> Undo point
        </Button>
        <Button size="sm" variant="ghost" onClick={clearAll} disabled={points.length === 0}>
          <RotateCcw className="h-3.5 w-3.5" /> Clear
        </Button>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">{points.length} vertices</span>
      </div>
    </div>
  );
}
