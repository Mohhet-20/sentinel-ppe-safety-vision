import { describe, expect, it } from "vitest";

import { classifyViolation, computeLetterbox, decodeYolo, iou, nms, type Detection } from "@/lib/vision/yolo-postprocess";

const box = (over: Partial<Detection>): Detection => ({ classId: 0, className: "Hardhat", confidence: 0.9, x: 0, y: 0, w: 0.5, h: 0.5, ...over });

describe("computeLetterbox", () => {
  it("fits a landscape image and pads vertically", () => {
    const lb = computeLetterbox(1280, 640, 640);
    expect(lb.scale).toBe(0.5);
    expect(lb.padX).toBe(0);
    expect(lb.padY).toBe(160);
  });
});

describe("iou", () => {
  it("is 1 for identical boxes and 0 for disjoint ones", () => {
    expect(iou(box({}), box({}))).toBe(1);
    expect(iou(box({}), box({ x: 0.6, y: 0.6, w: 0.2, h: 0.2 }))).toBe(0);
  });

  it("computes partial overlap", () => {
    expect(iou(box({ w: 0.2, h: 0.2 }), box({ x: 0.1, w: 0.2, h: 0.2 }))).toBeCloseTo(1 / 3);
  });
});

describe("nms", () => {
  it("keeps the most confident of overlapping same-class boxes", () => {
    const kept = nms([box({ confidence: 0.6 }), box({ confidence: 0.9, x: 0.01 })], 0.5);
    expect(kept).toHaveLength(1);
    expect(kept[0].confidence).toBe(0.9);
  });

  it("never suppresses across classes", () => {
    const kept = nms([box({}), box({ classId: 1, className: "Person" })], 0.5);
    expect(kept).toHaveLength(2);
  });
});

describe("decodeYolo", () => {
  it("maps a model-space box back to normalised source coordinates", () => {
    const classes = ["Hardhat", "Person"];
    const anchors = 2;
    const out = new Float32Array((4 + classes.length) * anchors);
    // anchor 0: a 100x100 box centred at (320, 320) on a letterboxed 1280x640 image
    out[0] = 320; out[anchors] = 320; out[2 * anchors] = 100; out[3 * anchors] = 100;
    out[5 * anchors] = 0.8; // class 1 score
    // anchor 1: below threshold
    out[4 * anchors + 1] = 0.1;

    const dets = decodeYolo(out, anchors, classes, computeLetterbox(1280, 640, 640), 0.25, 0.5);
    expect(dets).toHaveLength(1);
    expect(dets[0].className).toBe("Person");
    expect(dets[0].x).toBeCloseTo((270 / 0.5) / 1280);
    expect(dets[0].y).toBeCloseTo(((270 - 160) / 0.5) / 640);
    expect(dets[0].w).toBeCloseTo(200 / 1280);
  });
});

describe("classifyViolation (mirrors backend ppe_incident_rules.py)", () => {
  it.each([
    ["NO-Hardhat", "Missing Helmet", "high"],
    ["NO-Safety Vest", "Missing Vest", "medium"],
    ["no_mask", "Missing Mask", "medium"],
  ])("%s → %s", (cls, label, severity) => {
    expect(classifyViolation(cls)).toEqual({ label, severity });
  });

  it("ignores compliant classes", () => {
    expect(classifyViolation("Hardhat")).toBeNull();
    expect(classifyViolation("Safety Vest")).toBeNull();
    expect(classifyViolation("Person")).toBeNull();
  });
});
