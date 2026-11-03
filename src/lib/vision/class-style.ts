// One colour language for detections everywhere in the UI:
// red = violation, green = protective equipment present, cyan = person,
// amber = hazards / everything else.

export type DetectionKind = "violation" | "ppe" | "person" | "hazard";

export function detectionKind(className: string): DetectionKind {
  const c = className.toLowerCase();
  if (c.startsWith("no-") || c.startsWith("no_") || c.startsWith("no ")) return "violation";
  if (c === "person") return "person";
  if (/hardhat|helmet|vest|mask|goggle|glove|boot/.test(c)) return "ppe";
  return "hazard";
}

export const KIND_COLOR: Record<DetectionKind, string> = {
  violation: "#ff3b3b",
  ppe: "#2ecc71",
  person: "#00d9ff",
  hazard: "#ff9f1c",
};

export function classColor(className: string) {
  return KIND_COLOR[detectionKind(className)];
}
