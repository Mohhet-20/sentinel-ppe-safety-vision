import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const CROSS_ORIGIN_ISOLATION = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "credentialless",
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Cross-origin isolation unlocks SharedArrayBuffer, so the in-browser ONNX
  // model can run multi-threaded. Mirrors the production headers in vercel.json.
  server: {
    port: 5173,
    open: false,
    headers: CROSS_ORIGIN_ISOLATION,
    // The Python backend (incl. its virtualenv) and the multi-GB ML workspace
    // live in this repo; watching them blocks the dev server on startup.
    watch: {
      ignored: ["**/backend/**", "**/ml/**", "**/docs/**", "**/test-results/**", "**/playwright-report/**"],
    },
  },
  preview: {
    headers: CROSS_ORIGIN_ISOLATION,
  },
  // onnxruntime-web ships prebuilt ESM + wasm; pre-bundling it stalls the dev server.
  // Only scan the real entry: by default Vite crawls every .html under the
  // root, which here includes backend/.venv and the multi-GB ml/ workspace.
  optimizeDeps: {
    entries: ["index.html"],
    exclude: ["onnxruntime-web"],
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        // Rollup pulls a manual chunk's unassigned dependencies into that chunk,
        // so shared utilities (clsx is also a recharts dep) get their own chunk —
        // otherwise the landing page would preload all of recharts.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/(clsx|tailwind-merge|class-variance-authority)\//.test(id)) return "vendor-ui";
          if (/node_modules\/(recharts|d3-[^/]+|victory-vendor|internmap)\//.test(id)) return "vendor-charts";
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler|@remix-run)\//.test(id)) return "vendor-react";
          if (/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id)) return "vendor-motion";
          if (/node_modules\/@tanstack\//.test(id)) return "vendor-query";
          return undefined;
        },
      },
    },
  },
});
