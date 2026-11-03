import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, FileJson, Loader2, ScanEye, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/shared/ErrorState";
import { UploadDropzone } from "@/components/detection/UploadDropzone";
import { ImageStage } from "@/components/detection/ImageStage";
import { ImageAdjustPanel } from "@/components/detection/ImageAdjustPanel";
import { MetadataPanel, type ImageMetadata } from "@/components/detection/MetadataPanel";
import { DetectionResultsTable } from "@/components/detection/DetectionResultsTable";
import { DetectionStatCards } from "@/components/detection/DetectionStatCards";
import { ClassDistributionChart } from "@/components/detection/ClassDistributionChart";
import { SessionHistoryPanel } from "@/components/detection/SessionHistoryPanel";
import { IMAGE_SESSION_HISTORY, type BoundingBox, type SessionHistoryItem } from "@/lib/mock-detection-data";
import { ApiError, inferImage, resolveMediaUrl, type BackendDetectedObject } from "@/lib/api-client";
import { detectionKind } from "@/lib/vision/class-style";

interface QueuedImage {
  id: string;
  file: File;
  url: string;
}

function toFrontendBoxes(objects: BackendDetectedObject[]): BoundingBox[] {
  return objects.map((obj, i) => ({
    id: obj.track_id ?? `det-${i}-${obj.class_id}`,
    class: obj.class_name,
    confidence: obj.confidence,
    x: obj.bbox.x * 100,
    y: obj.bbox.y * 100,
    w: obj.bbox.w * 100,
    h: obj.bbox.h * 100,
  }));
}

export default function ImageDetection() {
  const { toast } = useToast();
  const [queue, setQueue] = useState<QueuedImage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  const [boxes, setBoxes] = useState<BoundingBox[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processingMs, setProcessingMs] = useState(0);
  const [history, setHistory] = useState<SessionHistoryItem[]>(IMAGE_SESSION_HISTORY);
  const [apiError, setApiError] = useState<string | null>(null);
  const [annotatedUrl, setAnnotatedUrl] = useState<string | null>(null);

  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
  const [showBoxes, setShowBoxes] = useState(true);
  const [splitMode, setSplitMode] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = queue.find((q) => q.id === activeId) ?? null;

  function handleFiles(files: File[]) {
    const items: QueuedImage[] = files.map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }));
    setQueue((q) => [...items, ...q]);
    if (items.length) void selectImage(items[0]);
  }

  async function selectImage(item: QueuedImage) {
    setActiveId(item.id);
    setBoxes([]);
    setApiError(null);
    setAnnotatedUrl(null);
    setProcessing(true);

    const img = new Image();
    img.onload = () => {
      setMetadata((prev) => ({
        fileName: item.file.name,
        fileType: item.file.type,
        fileSizeKb: item.file.size / 1024,
        width: prev?.fileName === item.file.name && prev.width ? prev.width : img.naturalWidth,
        height: prev?.fileName === item.file.name && prev.height ? prev.height : img.naturalHeight,
        uploadedAt: new Date().toLocaleTimeString("en-US", { hour12: false }),
      }));
    };
    img.src = item.url;

    try {
      const result = await inferImage(item.file);
      const parsedBoxes = toFrontendBoxes(result.boxes);

      setBoxes(parsedBoxes);
      setProcessingMs(Math.round(result.inference_ms));
      if (result.image_width && result.image_height) {
        setMetadata((prev) =>
          prev ? { ...prev, width: result.image_width!, height: result.image_height! } : prev,
        );
      }
      if (result.annotated_image_url) {
        setAnnotatedUrl(resolveMediaUrl(result.annotated_image_url));
      }

      const violations = parsedBoxes.filter((b) => detectionKind(b.class) === "violation").length;
      const avgConfidence = parsedBoxes.reduce((s, b) => s + b.confidence, 0) / (parsedBoxes.length || 1);
      setHistory((h) =>
        [
          {
            id: item.id,
            fileName: item.file.name,
            thumbnailColor: "#1b232f",
            detections: parsedBoxes.length,
            violations,
            avgConfidence,
            processedAt: new Date().toLocaleTimeString("en-US", { hour12: false }),
          },
          ...h,
        ].slice(0, 8),
      );

      toast({
        title: "Detection complete",
        description: `${parsedBoxes.length} object${parsedBoxes.length === 1 ? "" : "s"} found in ${item.file.name}.`,
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not reach the detection API. Confirm the backend is running and reachable.";
      setApiError(message);
      toast({ title: "Detection failed", description: message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  }

  function removeFromQueue(id: string) {
    setQueue((q) => q.filter((item) => item.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setBoxes([]);
      setMetadata(null);
      setApiError(null);
      setAnnotatedUrl(null);
    }
  }

  function handleExportJson() {
    if (!active) return;
    const payload = { file: active.file.name, generatedAt: new Date().toISOString(), detections: boxes };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active.file.name.replace(/\.[^.]+$/, "")}-detections.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export ready", description: "Detection JSON downloaded." });
  }

  async function handleDownloadAnnotated() {
    if (!active) return;

    // Prefer the server-rendered annotation (drawn by the same pipeline that ran inference).
    if (annotatedUrl) {
      try {
        const response = await fetch(annotatedUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${active.file.name.replace(/\.[^.]+$/, "")}-annotated.jpg`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Image downloaded", description: "Annotated frame saved to your device." });
        return;
      } catch {
        // fall through to client-side rendering below
      }
    }

    // Fallback: render boxes onto the original image client-side (e.g. offline/demo use).
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
      ctx.drawImage(img, 0, 0);
      ctx.filter = "none";
      boxes
        .filter((b) => b.confidence >= confidenceThreshold)
        .forEach((b) => {
          const x = (b.x / 100) * canvas.width;
          const y = (b.y / 100) * canvas.height;
          const w = (b.w / 100) * canvas.width;
          const h = (b.h / 100) * canvas.height;
          ctx.strokeStyle = "#ff9f1c";
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, w, h);
          ctx.fillStyle = "#ff9f1c";
          ctx.font = "16px sans-serif";
          ctx.fillText(`${b.class} ${(b.confidence * 100).toFixed(0)}%`, x, Math.max(14, y - 6));
        });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${active.file.name.replace(/\.[^.]+$/, "")}-annotated.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Image downloaded", description: "Annotated frame saved to your device." });
      });
    };
    img.src = active.url;
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <canvas ref={canvasRef} className="hidden" />

      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-wide text-foreground">
          <ScanEye className="h-5 w-5 text-detect" />
          Image Detection Workspace
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a single frame or a batch to run PPE and hazard detection against static images.
        </p>
      </motion.div>

      {queue.length === 0 ? (
        <UploadDropzone
          accept="image/*"
          multiple
          label="Drop images to begin"
          hint="JPG, PNG, or WEBP — drag & drop, browse, or paste from clipboard"
          onFiles={handleFiles}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-4">
            {/* batch strip */}
            <div className="flex items-center gap-2 overflow-x-auto rounded-lg border border-border bg-secondary/20 p-2">
              {queue.map((item) => (
                <div key={item.id} className="group relative shrink-0">
                  <button
                    onClick={() => void selectImage(item)}
                    className={`h-14 w-14 overflow-hidden rounded-md border-2 transition-colors ${
                      activeId === item.id ? "border-primary" : "border-border"
                    }`}
                  >
                    <img src={item.url} alt={item.file.name} className="h-full w-full object-cover" />
                  </button>
                  <button
                    onClick={() => removeFromQueue(item.id)}
                    className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-danger text-white group-hover:flex"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              <label className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
                />
                +
              </label>
            </div>

            {processing ? (
              <Skeleton className="aspect-video w-full rounded-xl" />
            ) : apiError ? (
              <ErrorState
                title="Detection failed"
                description={apiError}
                onRetry={active ? () => void selectImage(active) : undefined}
              />
            ) : active ? (
              <ImageStage
                imageUrl={active.url}
                boxes={boxes}
                showBoxes={showBoxes}
                splitMode={splitMode}
                brightness={brightness}
                contrast={contrast}
                confidenceThreshold={confidenceThreshold}
              />
            ) : null}

            {processing && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-detect" /> Running inference…
              </div>
            )}

            <DetectionStatCards boxes={boxes.filter((b) => b.confidence >= confidenceThreshold)} processingMs={processingMs} />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <DetectionResultsTable boxes={boxes.filter((b) => b.confidence >= confidenceThreshold)} />
              <ClassDistributionChart boxes={boxes.filter((b) => b.confidence >= confidenceThreshold)} />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Export</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" onClick={() => void handleDownloadAnnotated()} disabled={!active || processing || !!apiError}>
                  <Download className="h-3.5 w-3.5" /> Download annotated image
                </Button>
                <Button size="sm" variant="secondary" onClick={handleExportJson} disabled={!active || processing || !!apiError}>
                  <FileJson className="h-3.5 w-3.5" /> Export JSON
                </Button>
                <Button size="sm" variant="ghost" onClick={() => active && removeFromQueue(active.id)} disabled={!active}>
                  <Trash2 className="h-3.5 w-3.5" /> Discard
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <ImageAdjustPanel
              brightness={brightness}
              setBrightness={setBrightness}
              contrast={contrast}
              setContrast={setContrast}
              confidenceThreshold={confidenceThreshold}
              setConfidenceThreshold={setConfidenceThreshold}
              showBoxes={showBoxes}
              setShowBoxes={setShowBoxes}
              splitMode={splitMode}
              setSplitMode={setSplitMode}
            />
            <MetadataPanel metadata={metadata} />
            <SessionHistoryPanel items={history} />
          </div>
        </div>
      )}
    </div>
  );
}
