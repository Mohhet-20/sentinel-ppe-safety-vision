import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Camera,
  CircleDot,
  Fingerprint,
  Grid2x2,
  Maximize2,
  Play,
  Radio,
  Square,
  Timer,
  Users,
  Video,
  VideoOff,
  Wifi,
  WifiOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { StatTile } from "@/components/shared/StatTile";
import { getClassColor, MOCK_CAMERAS } from "@/lib/mock-detection-data";
import {
  ApiError,
  inferWebcamFrame,
  listCameras,
  startWebcamSession,
  stopWebcamSession,
  type BackendDetectedObject,
  type CameraSummary,
} from "@/lib/api-client";

const FRAME_INTERVAL_MS = 1000;

export default function LiveWebcam() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const frameTimerRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const trackIdsRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef(false);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  // Binding the feed to a site camera makes the backend enforce that camera's zones and rules.
  const [siteCamera, setSiteCamera] = useState<string>("none");
  const [active, setActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState(0);
  const [detectionCount, setDetectionCount] = useState(0);
  const [uniqueTracks, setUniqueTracks] = useState(0);
  const [liveBoxes, setLiveBoxes] = useState<BackendDetectedObject[]>([]);
  const [gridMode, setGridMode] = useState(false);
  const [cameras, setCameras] = useState<CameraSummary[]>(
    MOCK_CAMERAS.map((cam) => ({ ...cam, site: null, zone: null })),
  );

  useEffect(() => {
    navigator.mediaDevices
      ?.enumerateDevices()
      .then((list) => setDevices(list.filter((d) => d.kind === "videoinput")))
      .catch(() => undefined);
  }, [active]);

  useEffect(() => {
    listCameras()
      .then((list) => {
        if (list.length > 0) setCameras(list);
      })
      .catch(() => undefined); // keep the placeholder camera list if the API call fails
  }, []);

  async function captureAndInferFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || inFlightRef.current) return;
    inFlightRef.current = true;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      inFlightRef.current = false;
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        inFlightRef.current = false;
        return;
      }
      try {
        const result = await inferWebcamFrame(blob, sessionIdRef.current);
        setModelError(null);
        setFps(result.fps);
        setLatency(result.inference_ms);
        setLiveBoxes(result.boxes);
        setDetectionCount((c) => c + result.boxes.length);
        result.boxes.forEach((b) => b.track_id && trackIdsRef.current.add(b.track_id));
        setUniqueTracks(trackIdsRef.current.size);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Live inference request failed.";
        setModelError(message);
      } finally {
        inFlightRef.current = false;
      }
    }, "image/jpeg", 0.85);
  }

  async function startCamera() {
    setError(null);
    setModelError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedDevice ? { deviceId: { exact: selectedDevice } } : true,
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setActive(true);

      const boundCamera = siteCamera !== "none" ? siteCamera : undefined;
      const session = await startWebcamSession(selectedDevice ? "Selected Camera" : "Default Camera", boundCamera).catch(() => null);
      sessionIdRef.current = session?.session_id ?? null;
      trackIdsRef.current = new Set();
      setDetectionCount(0);
      setUniqueTracks(0);

      frameTimerRef.current = window.setInterval(() => void captureAndInferFrame(), FRAME_INTERVAL_MS);
      toast({ title: "Camera started", description: "Live feed connected — streaming frames to the detection API." });
    } catch {
      setError("Camera access was denied or is unavailable. Grant permission in your browser to preview a live feed.");
    }
  }

  async function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
    setRecording(false);
    setLiveBoxes([]);

    if (frameTimerRef.current) {
      window.clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }
    if (sessionIdRef.current) {
      await stopWebcamSession(sessionIdRef.current).catch(() => undefined);
      sessionIdRef.current = null;
    }
    toast({ title: "Camera stopped", description: "Live feed disconnected." });
  }

  function handleSnapshot() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !active) {
      toast({ title: "No active feed", description: "Start the camera before capturing a snapshot.", variant: "destructive" });
      return;
    }
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `snapshot-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Snapshot saved", description: "Frame captured from the live feed." });
    });
  }

  function toggleRecording() {
    if (!streamRef.current) return;
    if (!recording) {
      try {
        chunksRef.current = [];
        const recorder = new MediaRecorder(streamRef.current);
        recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: "video/webm" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `recording-${Date.now()}.webm`;
          a.click();
          URL.revokeObjectURL(url);
          toast({ title: "Recording saved", description: "Clip downloaded to your device." });
        };
        recorder.start();
        recorderRef.current = recorder;
        setRecording(true);
      } catch {
        toast({ title: "Recording unavailable", description: "This browser does not support MediaRecorder.", variant: "destructive" });
      }
    } else {
      recorderRef.current?.stop();
      setRecording(false);
    }
  }

  function toggleFullscreen() {
    if (!stageRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else stageRef.current.requestFullscreen().catch(() => undefined);
  }

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (frameTimerRef.current) window.clearInterval(frameTimerRef.current);
      if (sessionIdRef.current) void stopWebcamSession(sessionIdRef.current).catch(() => undefined);
    },
    [],
  );

  return (
    <div className="flex flex-col gap-6 pb-6">
      <canvas ref={canvasRef} className="hidden" />

      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-wide text-foreground">
            <Radio className="h-5 w-5 text-detect" />
            Live Webcam Monitoring
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Stream a live camera feed for real-time hazard and compliance monitoring.</p>
        </div>
        <Button variant={gridMode ? "detect" : "secondary"} size="sm" onClick={() => setGridMode((g) => !g)}>
          <Grid2x2 className="h-3.5 w-3.5" /> {gridMode ? "Single view" : "Multi-camera grid"}
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          {gridMode ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {cameras.map((cam, i) => (
                <div key={cam.id} className="hud-panel relative aspect-video overflow-hidden rounded-lg border border-border bg-[#05070a]">
                  {i === 0 && active ? (
                    <video autoPlay muted playsInline className="h-full w-full object-cover" ref={(el) => { if (el) el.srcObject = streamRef.current; }} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <VideoOff className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded bg-black/60 px-2 py-0.5">
                    {cam.status === "online" ? <Wifi className="h-3 w-3 text-success" /> : <WifiOff className="h-3 w-3 text-danger" />}
                    <span className="font-mono text-[9px] text-white/80">{cam.name}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div ref={stageRef} className="hud-panel relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-[#05070a]">
              {active ? (
                <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground/50">
                  <VideoOff className="h-8 w-8" strokeWidth={1.25} />
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em]">Camera offline</p>
                  {error && <p className="max-w-xs px-6 text-center text-xs text-danger">{error}</p>}
                </div>
              )}

              {active && (
                <>
                  {liveBoxes.map((box, i) => (
                    <div
                      key={`${box.track_id ?? i}-${i}`}
                      className="absolute rounded-sm"
                      style={{
                        left: `${box.bbox.x * 100}%`,
                        top: `${box.bbox.y * 100}%`,
                        width: `${box.bbox.w * 100}%`,
                        height: `${box.bbox.h * 100}%`,
                        border: `1.5px solid ${getClassColor(box.class_name)}`,
                        boxShadow: `0 0 10px -2px ${getClassColor(box.class_name)}`,
                      }}
                    >
                      <span
                        className="absolute -top-5 left-0 whitespace-nowrap rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-medium text-black"
                        style={{ backgroundColor: getClassColor(box.class_name) }}
                      >
                        {box.track_id ? `#${box.track_id} ` : ""}
                        {box.class_name} {(box.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}

                  <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded bg-black/50 px-2 py-1 backdrop-blur-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-success" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                    </span>
                    <span className="font-mono text-[10px] text-white/90">LIVE</span>
                  </div>
                  {recording && (
                    <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded bg-black/50 px-2 py-1 backdrop-blur-sm">
                      <CircleDot className="h-3 w-3 animate-flicker text-danger" />
                      <span className="font-mono text-[10px] text-white/90">REC</span>
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3 rounded bg-black/50 px-2 py-1 font-mono text-[10px] text-white/70 backdrop-blur-sm">
                    {fps.toFixed(1)} FPS · {latency.toFixed(0)}ms
                  </div>
                  {modelError && (
                    <div className="absolute inset-x-3 bottom-3 flex items-center gap-1.5 rounded bg-danger/80 px-2 py-1 backdrop-blur-sm">
                      <AlertTriangle className="h-3 w-3 text-white" />
                      <span className="truncate font-mono text-[10px] text-white">{modelError}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/30 p-3">
            <div className="w-56">
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger>
                  <SelectValue placeholder="Default camera" />
                </SelectTrigger>
                <SelectContent>
                  {devices.length === 0 && (
                    <SelectItem value="default" disabled>
                      No cameras detected yet
                    </SelectItem>
                  )}
                  {devices.map((d, i) => (
                    <SelectItem key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-56">
              <Select value={siteCamera} onValueChange={setSiteCamera} disabled={active}>
                <SelectTrigger aria-label="Monitor as site camera">
                  <SelectValue placeholder="Monitor as…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Generic PPE rules</SelectItem>
                  {cameras.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      Monitor as {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!active ? (
              <Button size="sm" onClick={() => void startCamera()}>
                <Play className="h-3.5 w-3.5" /> Start camera
              </Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={() => void stopCamera()}>
                <Square className="h-3.5 w-3.5" /> Stop camera
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={handleSnapshot} disabled={!active}>
              <Camera className="h-3.5 w-3.5" /> Snapshot
            </Button>
            <Button size="sm" variant={recording ? "destructive" : "secondary"} onClick={toggleRecording} disabled={!active}>
              <CircleDot className="h-3.5 w-3.5" /> {recording ? "Stop recording" : "Record"}
            </Button>
            <Button size="sm" variant="ghost" onClick={toggleFullscreen} disabled={!active}>
              <Maximize2 className="h-3.5 w-3.5" /> Fullscreen
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile icon={Video} label="Stream FPS" value={active ? fps.toFixed(1) : "—"} accent="detect" />
            <StatTile icon={Timer} label="AI Latency" value={active ? `${latency.toFixed(0)}ms` : "—"} accent="hazard" />
            <StatTile icon={Users} label="Detections (session)" value={detectionCount.toString()} accent="success" />
            <StatTile icon={Fingerprint} label="Unique tracks" value={uniqueTracks.toString()} accent="detect" />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Stream Status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pt-1">
              {cameras.map((cam) => (
                <div key={cam.id} className="flex items-center justify-between rounded-md border border-border/70 bg-secondary/20 px-2.5 py-2">
                  <span className="truncate text-xs text-foreground">{cam.name}</span>
                  <Badge variant={cam.status === "online" ? "success" : cam.status === "degraded" ? "default" : "danger"} className="capitalize">
                    {cam.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Detection Summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pt-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Session detections</span>
                <span className="font-mono font-semibold text-foreground">{detectionCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Unique tracked workers</span>
                <span className="font-mono font-semibold text-detect">{uniqueTracks}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current frame objects</span>
                <span className="font-mono font-semibold text-foreground">{liveBoxes.length}</span>
              </div>
              {modelError ? (
                <p className="mt-1 flex items-center gap-1 text-[10px] text-danger">
                  <AlertTriangle className="h-3 w-3" /> {modelError}
                </p>
              ) : (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Frames are captured every {FRAME_INTERVAL_MS / 1000}s and sent to the detection API for live inference.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
