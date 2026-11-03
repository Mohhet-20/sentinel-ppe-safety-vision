// In-browser PPE detector: the same YOLOv8 checkpoint the FastAPI backend
// serves (backend/models/best.pt), exported to ONNX and executed with
// onnxruntime-web (WebAssembly + SIMD). Lets the static demo deployment run
// genuine inference with no server at all.

import type { InferenceSession, Tensor } from "onnxruntime-web";

import { computeLetterbox, decodeYolo, type Detection } from "@/lib/vision/yolo-postprocess";

const ORT_VERSION = "1.20.1";
const MODEL_URL = "/models/ppe-yolov8n.onnx";
const INPUT_SIZE = 640;

export const PPE_CLASS_NAMES = [
  "Hardhat",
  "Mask",
  "NO-Hardhat",
  "NO-Mask",
  "NO-Safety Vest",
  "Person",
  "Safety Cone",
  "Safety Vest",
  "machinery",
  "vehicle",
];

export const MODEL_INFO = {
  name: "PPE-YOLOv8n",
  version: "onnx-opset12",
  runtime: `onnxruntime-web ${ORT_VERSION} (wasm${typeof self !== "undefined" && self.crossOriginIsolated ? ", multi-threaded" : ""})`,
  inputSize: INPUT_SIZE,
};

export interface DetectionRun {
  detections: Detection[];
  inferenceMs: number;
  totalMs: number;
  width: number;
  height: number;
}

type Source = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap;

let sessionPromise: Promise<{ session: InferenceSession; ort: typeof import("onnxruntime-web") }> | null = null;

/** Lazily downloads the runtime + model once; every caller shares the session. */
export function loadDetector() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = await import("onnxruntime-web/wasm");
      // Served same-origin from public/ort (see scripts/copy-ort-runtime.mjs).
      ort.env.wasm.wasmPaths = "/ort/";
      // Multi-threading needs cross-origin isolation (COOP/COEP headers, set in
      // vite.config.ts and vercel.json); fall back to 1 thread without it.
      ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
      const session = await ort.InferenceSession.create(MODEL_URL, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });
      // Warm-up pass: the first run pays for kernel setup and memory planning,
      // so reported latencies reflect steady-state inference.
      const blank = new ort.Tensor("float32", new Float32Array(3 * INPUT_SIZE * INPUT_SIZE), [1, 3, INPUT_SIZE, INPUT_SIZE]);
      await session.run({ [session.inputNames[0]]: blank });
      return { session, ort: ort as unknown as typeof import("onnxruntime-web") };
    })().catch((err) => {
      sessionPromise = null;
      throw err;
    });
  }
  return sessionPromise;
}

export function isDetectorLoaded() {
  return sessionPromise !== null;
}

function sourceSize(src: Source): [number, number] {
  if (src instanceof HTMLVideoElement) return [src.videoWidth, src.videoHeight];
  if (src instanceof HTMLImageElement) return [src.naturalWidth, src.naturalHeight];
  return [src.width, src.height];
}

let scratch: HTMLCanvasElement | null = null;

function toInputTensor(ort: typeof import("onnxruntime-web"), src: Source): { tensor: Tensor; w: number; h: number } {
  const [w, h] = sourceSize(src);
  const lb = computeLetterbox(w, h, INPUT_SIZE);
  scratch ??= document.createElement("canvas");
  scratch.width = INPUT_SIZE;
  scratch.height = INPUT_SIZE;
  const ctx = scratch.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "rgb(114,114,114)";
  ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
  ctx.drawImage(src, lb.padX, lb.padY, w * lb.scale, h * lb.scale);

  const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
  const plane = INPUT_SIZE * INPUT_SIZE;
  const chw = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    chw[i] = data[i * 4] / 255;
    chw[plane + i] = data[i * 4 + 1] / 255;
    chw[2 * plane + i] = data[i * 4 + 2] / 255;
  }
  return { tensor: new ort.Tensor("float32", chw, [1, 3, INPUT_SIZE, INPUT_SIZE]), w, h };
}

export async function detect(src: Source, confThreshold = 0.35, iouThreshold = 0.5): Promise<DetectionRun> {
  const { session, ort } = await loadDetector();
  // Timed after loading, so one-off model download never skews latency stats.
  const t0 = performance.now();
  const { tensor, w, h } = toInputTensor(ort, src);

  const t1 = performance.now();
  const outputs = await session.run({ [session.inputNames[0]]: tensor });
  const inferenceMs = performance.now() - t1;

  const out = outputs[session.outputNames[0]];
  const numAnchors = out.dims[2];
  const detections = decodeYolo(
    out.data as Float32Array,
    numAnchors,
    PPE_CLASS_NAMES,
    computeLetterbox(w, h, INPUT_SIZE),
    confThreshold,
    iouThreshold,
  );

  return { detections, inferenceMs, totalMs: performance.now() - t0, width: w, height: h };
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image ${url}`));
    img.src = url;
  });
}
