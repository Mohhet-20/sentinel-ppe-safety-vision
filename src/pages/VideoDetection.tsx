import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Film,
  Pause,
  Play,
  RotateCcw,
  Gauge,
  Boxes,
  AlertTriangle,
  Fingerprint,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/shared/ErrorState";
import { UploadDropzone } from "@/components/detection/UploadDropzone";
import { VideoTimeline } from "@/components/detection/VideoTimeline";
import { StatTile } from "@/components/shared/StatTile";
import { getClassColor, type VideoDetectionEvent } from "@/lib/mock-detection-data";
import { ApiError, inferVideo, resolveMediaUrl, type VideoInferenceResult } from "@/lib/api-client";

function formatTime(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function confidenceColor(c: number) {
  if (c >= 0.95) return "text-success";
  if (c >= 0.85) return "text-primary";
  return "text-danger";
}

const SEVERITY_VARIANT = { critical: "danger", high: "default", medium: "detect", low: "secondary" } as const;

function toTimelineEvents(result: VideoInferenceResult): VideoDetectionEvent[] {
  return result.timeline.map((e, i) => ({
    id: `${i}-${e.track_id ?? "na"}`,
    timeSec: e.time_sec,
    class: e.class_name,
    confidence: e.confidence,
    severity: (e.severity as VideoDetectionEvent["severity"]) ?? "low",
  }));
}

export default function VideoDetection() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [fps, setFps] = useState(30);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processed, setProcessed] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<VideoInferenceResult | null>(null);
  const [showAnnotated, setShowAnnotated] = useState(false);

  const events = result ? toTimelineEvents(result) : [];

  function handleFiles(files: File[]) {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setVideoUrl(URL.createObjectURL(f));
    setProcessed(false);
    setProgress(0);
    setCurrentTime(0);
    setApiError(null);
    setResult(null);
    setShowAnnotated(false);
  }

  async function startProcessing() {
    if (!file) return;
    setProcessing(true);
    setProgress(0);
    setProcessed(false);
    setApiError(null);

    // Real processing time is unknown up front (depends on video length + hardware),
    // so this progress bar is an animated approximation while we await the response —
    // it's replaced with real stats the moment the backend responds.
    const progressTimer = window.setInterval(() => {
      setProgress((p) => Math.min(96, p + 2 + Math.random() * 4));
    }, 300);

    const start = performance.now();
    try {
      const response = await inferVideo(file);
      window.clearInterval(progressTimer);
      setProgress(100);
      setResult(response);
      setProcessed(true);
      if (response.duration_sec) setDuration(response.duration_sec);
      if (response.source_fps) setFps(response.source_fps);

      const elapsed = ((performance.now() - start) / 1000).toFixed(1);
      toast({
        title: "Processing complete",
        description: `${response.total_detections} detections across ${response.frames_processed} frames in ${elapsed}s.`,
      });
    } catch (err) {
      window.clearInterval(progressTimer);
      setProgress(0);
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not reach the detection API. Confirm the backend is running and reachable.";
      setApiError(message);
      toast({ title: "Processing failed", description: message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  }

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    function onLoaded() {
      if (v && v.duration && Number.isFinite(v.duration) && !result) setDuration(v.duration);
    }
    function onTime() {
      if (v) setCurrentTime(v.currentTime);
    }
    function onPlay() {
      setPlaying(true);
    }
    function onPause() {
      setPlaying(false);
    }
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [videoUrl, showAnnotated, result]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  }

  function seek(t: number) {
    setCurrentTime(t);
    if (videoRef.current) videoRef.current.currentTime = t;
  }

  const eta = processing ? Math.max(1, Math.round(((100 - progress) / 100) * 6)) : 0;
  const eventsSoFar = processed ? events : events.filter((e) => e.timeSec <= currentTime + 1);
  const violations = events.filter((e) => e.severity === "high" || e.severity === "critical").length;
  const activeVideoSrc = showAnnotated && result?.processed_video_url ? resolveMediaUrl(result.processed_video_url) : videoUrl;

  function handleExport() {
    const rows = ["time_sec,class,confidence,severity", ...events.map((e) => `${e.timeSec},${e.class},${e.confidence},${e.severity}`)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file?.name.replace(/\.[^.]+$/, "") ?? "video"}-detections.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export ready", description: "Detection results exported as CSV." });
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-wide text-foreground">
          <Film className="h-5 w-5 text-detect" />
          Video Detection
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Process recorded footage frame-by-frame to surface safety violations over time.
        </p>
      </motion.div>

      {!videoUrl ? (
        <UploadDropzone accept="video/*" label="Drop a video to begin" hint="MP4, AVI, MOV, or MKV" onFiles={handleFiles} />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-4">
            <div className="hud-panel overflow-hidden rounded-xl border border-border bg-[#05070a]">
              <video ref={videoRef} src={activeVideoSrc ?? undefined} className="aspect-video w-full bg-black" />
            </div>

            {result?.processed_video_url && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/20 px-3 py-2">
                <Video className="h-3.5 w-3.5 text-detect" />
                <span className="text-xs text-muted-foreground">Viewing:</span>
                <div className="ml-auto flex gap-1.5">
                  <Button size="sm" variant={!showAnnotated ? "detect" : "ghost"} onClick={() => setShowAnnotated(false)}>
                    Original
                  </Button>
                  <Button size="sm" variant={showAnnotated ? "detect" : "ghost"} onClick={() => setShowAnnotated(true)}>
                    Annotated (boxes + track IDs)
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/30 p-3">
              <VideoTimeline events={eventsSoFar} duration={duration || 1} currentTime={currentTime} onSeek={seek} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button size="icon" className="h-8 w-8" onClick={togglePlay}>
                    {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => seek(0)}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  Frame {Math.round(currentTime * fps)} · {fps.toFixed(1)} fps
                </span>
              </div>
            </div>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Processing</CardTitle>
                {!processing && !processed && (
                  <Button size="sm" onClick={() => void startProcessing()}>
                    Run detection
                  </Button>
                )}
                {processed && (
                  <Badge variant="success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" /> Complete
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="pt-1">
                {processing ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Analyzing frames…</span>
                      <span className="font-mono text-foreground">{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} indicatorClassName="bg-detect" />
                    <p className="font-mono text-[10px] text-muted-foreground">ETA ~{eta}s remaining</p>
                  </div>
                ) : apiError ? (
                  <ErrorState title="Processing failed" description={apiError} onRetry={() => void startProcessing()} />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {processed ? "Full detection timeline available below." : "Run detection to analyze this clip and populate the timeline."}
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile icon={Boxes} label="Events detected" value={events.length.toString()} accent="detect" />
              <StatTile icon={AlertTriangle} label="High/Critical" value={violations.toString()} accent="danger" />
              <StatTile
                icon={Gauge}
                label="Avg. confidence"
                value={result ? `${(result.average_confidence * 100).toFixed(1)}%` : "—"}
                accent="hazard"
              />
              <StatTile icon={Fingerprint} label="Unique tracks" value={result ? result.unique_tracks.toString() : "—"} accent="success" />
            </div>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Detection Table</CardTitle>
                <Button size="sm" variant="secondary" onClick={handleExport} disabled={events.length === 0}>
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </Button>
              </CardHeader>
              <CardContent className="pt-1">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                        <th className="py-1.5 pr-2 font-medium">Time</th>
                        <th className="py-1.5 pr-2 font-medium">Class</th>
                        <th className="py-1.5 pr-2 font-medium">Confidence</th>
                        <th className="py-1.5 text-right font-medium">Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventsSoFar.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-muted-foreground">
                            {processed ? "No violations detected in this clip." : "Run detection to populate this table."}
                          </td>
                        </tr>
                      ) : (
                        eventsSoFar.map((e) => (
                          <tr key={e.id} className="cursor-pointer border-t border-border/60 hover:bg-secondary/40" onClick={() => seek(e.timeSec)}>
                            <td className="py-2 pr-2 font-mono text-muted-foreground">{formatTime(e.timeSec)}</td>
                            <td className="py-2 pr-2">
                              <span className="flex items-center gap-1.5 font-medium text-foreground">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getClassColor(e.class) }} />
                                {e.class}
                              </span>
                            </td>
                            <td className={`py-2 pr-2 font-mono font-semibold ${confidenceColor(e.confidence)}`}>{(e.confidence * 100).toFixed(1)}%</td>
                            <td className="py-2 text-right">
                              <Badge variant={SEVERITY_VARIANT[e.severity]} className="capitalize">
                                {e.severity}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">File Info</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-y-2 pt-1 text-xs">
                <Info label="File name" value={file?.name ?? "—"} span />
                <Info label="Size" value={file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : "—"} />
                <Info label="Type" value={file?.type || "—"} />
                <Info label="Duration" value={formatTime(duration)} />
                <Info label="Frame rate" value={`${fps.toFixed(1)} fps`} />
                <Info label="Processing time" value={result ? `${(result.processing_time_ms / 1000).toFixed(1)}s` : "—"} />
                <Info label="Processing FPS" value={result ? result.processing_fps.toFixed(1) : "—"} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Incident Summary</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 pt-1">
                {!result || result.incident_summary.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {processed ? "No incidents auto-generated for this clip." : "Incidents will appear here after processing."}
                  </p>
                ) : (
                  result.incident_summary.map((entry) => (
                    <div key={entry.label} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{entry.label}</span>
                      <span className="font-mono font-semibold text-danger">{entry.count}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? "col-span-2" : undefined}>
      <dt className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className="truncate font-mono text-foreground">{value}</dd>
    </div>
  );
}
