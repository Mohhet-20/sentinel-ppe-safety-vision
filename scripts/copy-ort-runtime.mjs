// Copies the onnxruntime-web WebAssembly runtime into public/ort so it is
// served from the app's own origin. Same-origin is required for the
// multi-threaded build (its worker scripts can't be cross-origin) and keeps
// the demo working without a CDN.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "onnxruntime-web", "dist");
const dest = join(root, "public", "ort");

mkdirSync(dest, { recursive: true });
for (const file of ["ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.mjs"]) {
  copyFileSync(join(src, file), join(dest, file));
}
console.log("onnxruntime-web runtime copied to public/ort");
