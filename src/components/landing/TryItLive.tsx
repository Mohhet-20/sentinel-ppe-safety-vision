import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, CameraOff, Cpu, ImageUp, Loader2, ShieldAlert, ShieldCheck, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { DetectionOverlay, type OverlayBox } from "@/components/landing/DetectionOverlay";
import { detect, loadImage, MODEL_INFO } from "@/lib/vision/detector";
import { classColor, detectionKind } from "@/lib/vision/class-style";
import type { Detection } from "@/lib/vision/yolo-postprocess";
import { cn } from "@/lib/utils";

const SAMPLES = [
  { id: "rail", label: "Rail crew", src: "/samples/rail-bridge-crew-1280.webp", thumb: "/samples/rail-bridge-crew-thumb.webp" },
  { id: "hivis", label: "Hi-vis crew", src: "/samples/hi-vis-crew-1280.webp", thumb: "/samples/hi-vis-crew-thumb.webp" },
  { id: "inspector", label: "Site inspector", src: "/samples/site-inspector-1280.webp", thumb: "/samples/site-inspector-thumb.webp" },
];

type ModelState = "idle" | "loading" | "ready" | "error";
type Source = { kind: "image"; src: string; width: number; height: number } | { kind: "webcam"; width: number; height: number };

const toOverlay = (d: Detection): OverlayBox => ({ cls: d.className, conf: d.confidence, x: d.x, y: d.y, w: d.w, h: d.h });

export function TryItLive() {
  const [modelState, setModelState] = useState<ModelState>("idle");
  const [source, setSource] = useState<Source | null>(null);
  const [activeSample, setActiveSample] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [threshold, setThreshold] = useState(0.45);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef(false);

  const stopWebcam = useCallback(() => {
    loopRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopWebcam, [stopWebcam]);

  async function runOnImage(src: string, sampleId: string | null) {
    stopWebcam();
    setError(null);
    setActiveSample(sampleId);
    setDetections([]);
    setLatency(null);
    try {
      const img = await loadImage(src);
      setSource({ kind: "image", src, width: img.naturalWidth, height: img.naturalHeight });
      if (modelState !== "ready") setModelState("loading");
      const run = await detect(img, 0.25);
      setModelState("ready");
      setDetections(run.detections);
      setLatency(run.inferenceMs);
    } catch (err) {
      setModelState("error");
      setError(err instanceof Error ? err.message : "Inference failed.");
    }
  }

  async function startWebcam() {
    setError(null);
    setActiveSample(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 960, height: 540, facingMode: "user" }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setSource({ kind: "webcam", width: video.videoWidth, height: video.videoHeight });
      if (modelState !== "ready") setModelState("loading");
      loopRef.current = true;
      while (loopRef.current) {
        const run = await detect(video, 0.25);
        if (!loopRef.current) break;
        setModelState("ready");
        setDetections(run.detections);
        setLatency(run.inferenceMs);
        await new Promise((r) => requestAnimationFrame(r));
      }
    } catch (err) {
      stopWebcam();
      setSource(null);
      setError(err instanceof DOMException ? "Camera permission was denied or no camera is available." : "Could not start the webcam.");
    }
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void runOnImage(URL.createObjectURL(file), null);
    e.target.value = "";
  }

  const visible = useMemo(() => detections.filter((d) => d.confidence >= threshold), [detections, threshold]);
  const violations = visible.filter((d) => detectionKind(d.className) === "violation");
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    visible.forEach((d) => m.set(d.className, (m.get(d.className) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [visible]);

  const webcamOn = source?.kind === "webcam";

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* stage */}
      <div className="hud-panel relative overflow-hidden rounded-xl border border-border bg-card" style={{ ["--corner-color" as string]: "var(--detect)" }}>
        {/* Width is capped so tall images stay ≤ 560px high while the frame keeps
            the image's exact aspect ratio, keeping boxes aligned with pixels. */}
        <div
          className="relative mx-auto bg-black/40"
          style={{
            aspectRatio: source ? `${source.width} / ${source.height}` : "16 / 10",
            width: source ? `min(100%, ${(560 * source.width) / source.height}px)` : "100%",
          }}
        >
          <video ref={videoRef} muted playsInline className={cn("absolute inset-0 h-full w-full", !webcamOn && "hidden")} />
          {source?.kind === "image" && <img src={source.src} alt="Detection input" className="absolute inset-0 h-full w-full" />}
          {source && <DetectionOverlay boxes={visible.map(toOverlay)} animate={!webcamOn} stagger={0.03} />}

          {!source && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-detect/10">
                <Cpu className="h-6 w-6 text-detect" />
              </div>
              <p className="max-w-sm text-sm text-muted-foreground">
                Pick a sample, upload a photo, or turn on your webcam. The model downloads once (~12 MB) and runs entirely on
                your device: nothing is uploaded.
              </p>
            </div>
          )}

          {modelState === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-detect" />
                Loading model into WebAssembly…
              </div>
            </div>
          )}
        </div>
      </div>

      {/* controls */}
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Input</p>
          <div className="grid grid-cols-3 gap-2">
            {SAMPLES.map((s) => (
              <button
                key={s.id}
                onClick={() => void runOnImage(s.src, s.id)}
                className={cn(
                  "group overflow-hidden rounded-md border-2 text-left transition-colors",
                  activeSample === s.id ? "border-detect" : "border-border hover:border-muted-foreground",
                )}
              >
                <img src={s.thumb} alt="" loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
                <span className="block truncate px-1.5 py-1 text-[10px] text-muted-foreground group-hover:text-foreground">{s.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" asChild>
              <label className="cursor-pointer">
                <ImageUp /> Upload
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              </label>
            </Button>
            {webcamOn ? (
              <Button variant="destructive" size="sm" onClick={() => { stopWebcam(); setSource(null); setDetections([]); }}>
                <CameraOff /> Stop
              </Button>
            ) : (
              <Button variant="detect" size="sm" onClick={() => void startWebcam()}>
                <Camera /> Webcam
              </Button>
            )}
          </div>
          {error && <p className="mt-3 text-xs text-danger">{error}</p>}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Metric icon={Timer} label="inference" value={latency === null ? "—" : `${Math.round(latency)} ms`} />
          <Metric icon={ShieldCheck} label="objects" value={String(visible.length)} />
          <Metric icon={ShieldAlert} label="violations" value={String(violations.length)} danger={violations.length > 0} />
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Confidence ≥ {threshold.toFixed(2)}</p>
          </div>
          <Slider aria-label="Confidence threshold" value={[threshold]} min={0.25} max={0.9} step={0.05} onValueChange={([v]) => setThreshold(v)} />
          <ul className="mt-4 flex max-h-40 flex-col gap-1.5 overflow-y-auto">
            {counts.length === 0 && <li className="text-xs text-muted-foreground">No detections yet.</li>}
            {counts.map(([cls, n]) => (
              <li key={cls} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-sm" style={{ background: classColor(cls) }} />
                  {cls}
                </span>
                <span className="font-mono text-muted-foreground">×{n}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {MODEL_INFO.name} · {MODEL_INFO.runtime}. The same checkpoint the FastAPI backend serves, exported to ONNX.
        </p>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, danger }: { icon: typeof Timer; label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <Icon className={cn("h-3.5 w-3.5", danger ? "text-danger" : "text-muted-foreground")} />
      <p className={cn("mt-1.5 font-mono text-base font-semibold", danger && "text-danger")}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
