import { useRef, useState, type MouseEvent } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { getClassColor, type BoundingBox } from "@/lib/mock-detection-data";

interface ImageStageProps {
  imageUrl: string;
  boxes: BoundingBox[];
  showBoxes: boolean;
  splitMode: boolean;
  brightness: number;
  contrast: number;
  confidenceThreshold: number;
}

export function ImageStage({
  imageUrl,
  boxes,
  showBoxes,
  splitMode,
  brightness,
  contrast,
  confidenceThreshold,
}: ImageStageProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [splitPct, setSplitPct] = useState(50);
  const [magnifierOn, setMagnifierOn] = useState(false);
  const [magPos, setMagPos] = useState<{ x: number; y: number } | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const filterStyle = { filter: `brightness(${brightness}%) contrast(${contrast}%)` };
  const visibleBoxes = boxes.filter((b) => b.confidence >= confidenceThreshold);

  // Box coordinates are relative to the image, not the 16:9 stage, so the
  // overlay layer is sized to exactly the area the letterboxed image covers.
  const STAGE_RATIO = 16 / 9;
  const imageRatio = natural ? natural.w / natural.h : STAGE_RATIO;
  const frameStyle = {
    aspectRatio: `${imageRatio}`,
    ...(imageRatio >= STAGE_RATIO ? { width: "100%" } : { height: "100%" }),
  };

  function onMouseDown(e: MouseEvent) {
    if (zoom <= 1) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }
  function onMouseMove(e: MouseEvent) {
    if (magnifierOn && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMagPos({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
    }
    if (!dragging) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  }
  function onMouseUp() {
    setDragging(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => {
          setDragging(false);
          setMagPos(null);
        }}
        className={cn(
          "hud-panel relative aspect-video w-full select-none overflow-hidden rounded-xl border border-border bg-[#05070a]",
          zoom > 1 && (dragging ? "cursor-grabbing" : "cursor-grab"),
          magnifierOn && "cursor-none",
        )}
      >
        <div
          className="absolute inset-0 origin-center transition-transform duration-100"
          style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }}
        >
          <div className="flex h-full w-full items-center justify-center">
          <div className="relative" style={frameStyle}>
          {/* base (after / annotated) image */}
          <img
            src={imageUrl}
            alt="Uploaded frame"
            className="h-full w-full"
            style={filterStyle}
            draggable={false}
            onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          />

          {showBoxes &&
            visibleBoxes.map((box) => (
              <div
                key={box.id}
                className="absolute rounded-sm"
                style={{
                  left: `${box.x}%`,
                  top: `${box.y}%`,
                  width: `${box.w}%`,
                  height: `${box.h}%`,
                  border: `1.5px solid ${getClassColor(box.class)}`,
                  boxShadow: `0 0 10px -2px ${getClassColor(box.class)}`,
                }}
              >
                <span
                  className="absolute -top-5 left-0 whitespace-nowrap rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-medium text-black"
                  style={{ backgroundColor: getClassColor(box.class) }}
                >
                  {box.class} {(box.confidence * 100).toFixed(0)}%
                </span>
              </div>
            ))}

          {/* before overlay (original, clipped) */}
          {splitMode && (
            <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - splitPct}% 0 0)` }}>
              <img src={imageUrl} alt="Original frame" className="h-full w-full" draggable={false} />
            </div>
          )}
          </div>
          </div>
        </div>

        {splitMode && (
          <>
            <div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: `${splitPct}%` }}>
              <div className="h-full w-0.5 bg-detect shadow-glow-detect" />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={splitPct}
              onChange={(e) => setSplitPct(Number(e.target.value))}
              className="absolute inset-x-0 bottom-3 z-20 w-full opacity-0"
              style={{ height: 24 }}
            />
            <div className="pointer-events-none absolute left-3 top-3 rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-white/80">
              BEFORE
            </div>
            <div className="pointer-events-none absolute right-3 top-3 rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-white/80">
              AFTER
            </div>
          </>
        )}

        {magnifierOn && magPos && (
          <div
            className="pointer-events-none absolute z-30 h-32 w-32 rounded-full border-2 border-detect shadow-glow-detect"
            style={{
              left: `calc(${magPos.x}% - 64px)`,
              top: `calc(${magPos.y}% - 64px)`,
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: "400% 400%",
              backgroundPosition: `${magPos.x}% ${magPos.y}%`,
              backgroundRepeat: "no-repeat",
              ...filterStyle,
            }}
          />
        )}
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(1, z - 0.25))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <div className="w-24">
            <Slider aria-label="Zoom" min={1} max={3} step={0.1} value={[zoom]} onValueChange={([v]) => setZoom(v)} />
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(3, z + 0.25))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <span className="w-10 font-mono text-[10px] text-muted-foreground">{zoom.toFixed(1)}x</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
        <Button size="sm" variant={magnifierOn ? "detect" : "ghost"} onClick={() => setMagnifierOn((m) => !m)}>
          <Search className="h-3.5 w-3.5" /> Magnifier
        </Button>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {zoom > 1 ? "Drag to pan" : "Scroll zoom or use slider"}
        </span>
      </div>
    </div>
  );
}
