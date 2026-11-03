// Pure, framework-free YOLOv8 output decoding. Kept separate from the ONNX
// runtime wrapper so it can be unit-tested without loading a model.

export interface Letterbox {
  /** Scale applied to the source image to fit the model input. */
  scale: number;
  /** Horizontal / vertical padding (model-input pixels) added after scaling. */
  padX: number;
  padY: number;
  srcWidth: number;
  srcHeight: number;
}

export interface Detection {
  classId: number;
  className: string;
  confidence: number;
  /** Normalised [0, 1] box in source-image coordinates, top-left origin. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export function computeLetterbox(srcWidth: number, srcHeight: number, inputSize: number): Letterbox {
  const scale = Math.min(inputSize / srcWidth, inputSize / srcHeight);
  return {
    scale,
    padX: (inputSize - srcWidth * scale) / 2,
    padY: (inputSize - srcHeight * scale) / 2,
    srcWidth,
    srcHeight,
  };
}

export function iou(a: Detection, b: Detection): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.w * a.h + b.w * b.h - inter;
  return union <= 0 ? 0 : inter / union;
}

/** Greedy per-class non-maximum suppression (matches Ultralytics' default, non-agnostic NMS). */
export function nms(detections: Detection[], iouThreshold: number): Detection[] {
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const kept: Detection[] = [];
  for (const det of sorted) {
    if (kept.every((k) => k.classId !== det.classId || iou(k, det) < iouThreshold)) kept.push(det);
  }
  return kept;
}

/**
 * Decodes a raw YOLOv8 detection head of shape [1, 4 + numClasses, numAnchors]
 * (cx, cy, w, h in model-input pixels, followed by per-class scores) into
 * normalised, source-image-space detections.
 */
export function decodeYolo(
  output: Float32Array,
  numAnchors: number,
  classNames: string[],
  letterbox: Letterbox,
  confThreshold: number,
  iouThreshold: number,
): Detection[] {
  const numClasses = classNames.length;
  const { scale, padX, padY, srcWidth, srcHeight } = letterbox;
  const candidates: Detection[] = [];

  for (let i = 0; i < numAnchors; i++) {
    let best = 0;
    let bestClass = -1;
    for (let c = 0; c < numClasses; c++) {
      const score = output[(4 + c) * numAnchors + i];
      if (score > best) {
        best = score;
        bestClass = c;
      }
    }
    if (best < confThreshold) continue;

    const cx = output[i];
    const cy = output[numAnchors + i];
    const w = output[2 * numAnchors + i];
    const h = output[3 * numAnchors + i];

    const x1 = clamp((cx - w / 2 - padX) / scale, 0, srcWidth);
    const y1 = clamp((cy - h / 2 - padY) / scale, 0, srcHeight);
    const x2 = clamp((cx + w / 2 - padX) / scale, 0, srcWidth);
    const y2 = clamp((cy + h / 2 - padY) / scale, 0, srcHeight);
    if (x2 <= x1 || y2 <= y1) continue;

    candidates.push({
      classId: bestClass,
      className: classNames[bestClass],
      confidence: best,
      x: x1 / srcWidth,
      y: y1 / srcHeight,
      w: (x2 - x1) / srcWidth,
      h: (y2 - y1) / srcHeight,
    });
  }

  return nms(candidates, iouThreshold);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

// Mirrors backend/app/services/ppe_incident_rules.py so the browser and the
// server agree on what counts as a violation.
const VIOLATION_RULES: [string[], string, "high" | "medium" | "low"][] = [
  [["no", "hardhat"], "Missing Helmet", "high"],
  [["no", "helmet"], "Missing Helmet", "high"],
  [["no", "vest"], "Missing Vest", "medium"],
  [["no", "mask"], "Missing Mask", "medium"],
  [["no", "goggle"], "Missing Goggles", "medium"],
  [["no", "glove"], "Missing Gloves", "low"],
  [["no", "boot"], "Missing Boots", "low"],
];

export function classifyViolation(className: string): { label: string; severity: "high" | "medium" | "low" } | null {
  const tokens = className.toLowerCase().replace(/_/g, "-").replace(/ /g, "-").split("-");
  for (const [keywords, label, severity] of VIOLATION_RULES) {
    if (keywords.every((kw) => tokens.some((t) => t.includes(kw)))) return { label, severity };
  }
  return null;
}
