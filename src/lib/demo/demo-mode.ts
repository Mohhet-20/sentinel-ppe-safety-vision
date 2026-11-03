// Demo mode lets the whole platform run as a static site (e.g. the public
// Vercel deployment) with no FastAPI server: every API call is answered by an
// in-browser mock backend (lib/demo/mock-backend.ts) and inference runs the
// real ONNX-exported model in WebAssembly.
//
// It's on when the build sets VITE_DEMO_MODE=true, or when a visitor opts in
// from the landing / login page (persisted per browser).

const STORAGE_KEY = "sentinel_demo_mode";

const BUILD_FORCED = (import.meta.env as Record<string, string | undefined>).VITE_DEMO_MODE === "true";

export function isDemoMode(): boolean {
  if (BUILD_FORCED) return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** True when the build can't talk to a real backend at all. */
export function isDemoOnlyBuild(): boolean {
  return BUILD_FORCED;
}

export function setDemoMode(enabled: boolean) {
  try {
    if (enabled) window.localStorage.setItem(STORAGE_KEY, "1");
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — the in-memory flag below still applies for this tab */
  }
}

export const DEMO_CREDENTIALS = { identifier: "admin", password: "ChangeMe123!" };
