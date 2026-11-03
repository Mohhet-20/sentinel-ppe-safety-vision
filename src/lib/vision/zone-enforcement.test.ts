import { describe, expect, it } from "vitest";

import type { BackendDetectedObject, Zone } from "@/lib/api-client";
import { evaluateFrame, pointInPolygon, ppeForPerson } from "@/lib/vision/zone-enforcement";

// Same fixtures as backend/tests/test_zone_enforcement.py, so both implementations are held to one spec.
const det = (class_name: string, x: number, y: number, w: number, h: number, track_id: string | null = null): BackendDetectedObject => ({
  class_id: 0,
  class_name,
  confidence: 0.9,
  bbox: { x, y, w, h },
  track_id,
});

const LEFT_PERSON = det("Person", 0.1, 0.3, 0.2, 0.6, "p-left");
const RIGHT_PERSON = det("Person", 0.7, 0.3, 0.2, 0.6, "p-right");
const LEFT_HELMET = det("Hardhat", 0.15, 0.26, 0.1, 0.08);
const RIGHT_HELMET = det("Hardhat", 0.75, 0.26, 0.1, 0.08);

const zone = (over: Partial<Zone>): Zone => ({
  id: "z1",
  camera_id: "cam",
  name: "Zone",
  zone_type: "mandatory_ppe",
  polygon: [{ x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 0, y: 1 }],
  required_ppe: ["hardhat"],
  priority: 2,
  is_active: true,
  ...over,
});

describe("geometry", () => {
  it("point in polygon", () => {
    expect(pointInPolygon([0.25, 0.5], zone({}).polygon)).toBe(true);
    expect(pointInPolygon([0.75, 0.5], zone({}).polygon)).toBe(false);
  });

  it("attaches PPE only to the person wearing it", () => {
    expect(ppeForPerson(LEFT_PERSON, [LEFT_HELMET, RIGHT_HELMET])).toEqual([LEFT_HELMET]);
    expect(ppeForPerson(LEFT_PERSON, [RIGHT_HELMET])).toEqual([]);
  });
});

describe("evaluateFrame", () => {
  it("flags missing PPE in a mandatory zone", () => {
    expect(evaluateFrame([LEFT_PERSON], [zone({})], []).map((v) => v.label)).toEqual(["Missing Hardhat"]);
  });

  it("does not let a helmet elsewhere satisfy the rule", () => {
    expect(evaluateFrame([LEFT_PERSON, RIGHT_HELMET], [zone({})], [])).toHaveLength(1);
  });

  it("passes a compliant worker", () => {
    expect(evaluateFrame([LEFT_PERSON, LEFT_HELMET], [zone({})], [])).toEqual([]);
  });

  it("flags restricted-zone entry with high severity", () => {
    const restricted = zone({ zone_type: "restricted", required_ppe: [], polygon: [{ x: 0.5, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0.5, y: 1 }] });
    expect(evaluateFrame([RIGHT_PERSON, RIGHT_HELMET], [restricted], [])).toEqual([
      expect.objectContaining({ label: "Restricted Zone Entry", severity: "high" }),
    ]);
  });

  it("applies site-wide rules outside every zone", () => {
    const labels = evaluateFrame([RIGHT_PERSON, RIGHT_HELMET], [zone({})], [["hardhat"], ["vest"]]).map((v) => v.label);
    expect(labels).toEqual(["Missing Vest"]);
  });
});
