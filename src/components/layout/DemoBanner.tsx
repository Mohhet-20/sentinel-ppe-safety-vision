import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Cpu, Pause, Play, X } from "lucide-react";

import { DemoTour } from "@/components/layout/DemoTour";
import { isDemoMode, isDemoOnlyBuild, setDemoMode } from "@/lib/demo/demo-mode";
import { useAuth } from "@/providers/AuthProvider";

/** Slim strip that makes it explicit the visitor is in the self-contained browser demo. */
export function DemoBanner() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [feedsOn, setFeedsOn] = useState(true);
  if (!isDemoMode()) return null;

  function exit() {
    setDemoMode(false);
    logout();
    navigate("/");
  }

  async function toggleFeeds() {
    const { setSimulatorEnabled } = await import("@/lib/demo/mock-backend");
    setSimulatorEnabled(!feedsOn);
    setFeedsOn(!feedsOn);
  }

  return (
    <div className="flex items-center justify-center gap-3 border-b border-detect/20 bg-detect/10 px-4 py-1.5 text-[11px] text-detect">
      <Cpu className="h-3.5 w-3.5 shrink-0" />
      <p className="truncate">
        <span className="font-semibold">Live demo</span>
        <span className="hidden md:inline">
          : runs entirely in your browser. Simulated site cameras replay sample frames through the real model every 15 s; data resets on reload.
        </span>
      </p>
      <DemoTour />
      <button onClick={() => void toggleFeeds()} className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 hover:bg-detect/15">
        {feedsOn ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        {feedsOn ? "Pause feeds" : "Resume feeds"}
      </button>
      <button onClick={exit} className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 hover:bg-detect/15">
        <X className="h-3 w-3" />
        {isDemoOnlyBuild() ? "Exit" : "Exit demo"}
      </button>
    </div>
  );
}
