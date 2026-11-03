import type { VideoDetectionEvent } from "@/lib/mock-detection-data";
import { cn } from "@/lib/utils";

const SEVERITY_COLOR: Record<VideoDetectionEvent["severity"], string> = {
  critical: "var(--danger)",
  high: "var(--hazard)",
  medium: "var(--detect)",
  low: "#8b97a8",
};

export function VideoTimeline({
  events,
  duration,
  currentTime,
  onSeek,
}: {
  events: VideoDetectionEvent[];
  duration: number;
  currentTime: number;
  onSeek: (t: number) => void;
}) {
  return (
    <div className="relative h-10 w-full rounded-md border border-border bg-secondary/30">
      <div
        className="absolute inset-y-0 left-0 rounded-l-md bg-detect/15"
        style={{ width: `${(currentTime / duration) * 100}%` }}
      />
      <div
        className="absolute inset-y-0 z-10 w-0.5 bg-detect shadow-glow-detect"
        style={{ left: `${(currentTime / duration) * 100}%` }}
      />
      {events.map((ev) => (
        <button
          key={ev.id}
          onClick={() => onSeek(ev.timeSec)}
          title={`${ev.class} @ ${Math.floor(ev.timeSec / 60)}:${String(ev.timeSec % 60).padStart(2, "0")}`}
          className={cn(
            "absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform hover:scale-150",
          )}
          style={{ left: `${(ev.timeSec / duration) * 100}%`, backgroundColor: SEVERITY_COLOR[ev.severity] }}
        />
      ))}
      <input
        type="range"
        min={0}
        max={duration}
        step={0.1}
        value={currentTime}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}
