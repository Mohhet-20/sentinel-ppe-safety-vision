import { Link } from "react-router-dom";
import { ScanEye } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-ambient px-6 text-center">
      <div className="hud-panel rounded-xl border border-border bg-card/60 px-10 py-8">
        <ScanEye className="mx-auto h-8 w-8 text-detect" />
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">0 detections · conf —</p>
        <h1 className="mt-2 font-display text-5xl font-bold">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Nothing in frame. This page doesn't exist.</p>
      </div>
      <div className="flex gap-2">
        <Button asChild>
          <Link to="/">Home</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link to="/app">Open dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
