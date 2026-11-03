import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Compass, Github, X } from "lucide-react";

import { useLiveChannel } from "@/hooks/use-live-channel";
import { SITE } from "@/constants/site";
import { cn } from "@/lib/utils";

// A five-minute path through the product's best moments. Each step completes
// itself from real signals (live events, navigation), never from a click on
// the checklist, so finishing the tour means the visitor actually saw it work.

type StepId = "live" | "image" | "webcam" | "triage" | "analytics";

const STEPS: { id: StepId; title: string; hint: string; to: string }[] = [
  { id: "live", title: "Watch the command center go live", hint: "Simulated site cameras stream real model output into the feed.", to: "/app" },
  { id: "image", title: "Run the model on a photo", hint: "Drop any image; inference runs on your device.", to: "/app/detection/image" },
  { id: "webcam", title: "Point your webcam at the model", hint: "Pick “Monitor as CAM-01” to enforce its zones and rules.", to: "/app/detection/live" },
  { id: "triage", title: "Triage an incident", hint: "Open one, assign it, mark it resolved.", to: "/app/incidents" },
  { id: "analytics", title: "Read the analytics", hint: "Insights recompute from incidents as they arrive.", to: "/app/analytics" },
];

const STORAGE_KEY = "sentinel_demo_tour";

function load(): { done: StepId[]; seen: boolean } {
  try {
    return { done: [], seen: false, ...JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") };
  } catch {
    return { done: [], seen: false };
  }
}

export function DemoTour() {
  const location = useLocation();
  const [state, setState] = useState(load);
  const [open, setOpen] = useState(() => !load().seen);
  const done = new Set(state.done);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, seen: true }));
    } catch {
      /* per-viewer convenience only */
    }
  }, [state]);

  const complete = (id: StepId) =>
    setState((s) => (s.done.includes(id) ? s : { ...s, done: [...s.done, id] }));

  useLiveChannel((event) => {
    const p = (event.payload ?? {}) as { source?: string; status?: string };
    if (event.type === "detections" && location.pathname === "/app") complete("live");
    if (event.type === "telemetry" && p.source === "inference/image") complete("image");
    if (event.type === "telemetry" && p.source === "inference/webcam") complete("webcam");
    if (event.type === "incident_update" && p.status && p.status !== "open") complete("triage");
  });

  useEffect(() => {
    if (location.pathname === "/app/analytics") complete("analytics");
  }, [location.pathname]);

  const finished = done.size === STEPS.length;

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-detect/15 px-2 py-0.5 font-semibold hover:bg-detect/25"
        aria-expanded={open}
      >
        <Compass className="h-3 w-3" />
        Tour {done.size}/{STEPS.length}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed right-4 top-10 z-50 w-[min(340px,calc(100vw-2rem))] rounded-xl border border-border bg-popover p-4 text-left text-foreground shadow-2xl"
            role="dialog"
            aria-label="Demo tour"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-base font-bold">{finished ? "Tour complete" : "Five-minute tour"}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {finished ? "You've seen the whole loop, from pixels to a closed ticket." : "Steps tick themselves off as you go."}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded p-1 text-muted-foreground hover:bg-secondary" aria-label="Close tour">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary">
              <motion.div className="h-full bg-detect" animate={{ width: `${(done.size / STEPS.length) * 100}%` }} />
            </div>

            <ol className="mt-3 flex flex-col gap-1">
              {STEPS.map((step, i) => {
                const isDone = done.has(step.id);
                return (
                  <li key={step.id}>
                    <Link
                      to={step.to}
                      className={cn(
                        "flex gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary/70",
                        location.pathname === step.to && !isDone && "bg-secondary/50",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-mono text-[10px]",
                          isDone ? "border-success bg-success text-success-foreground" : "border-border text-muted-foreground",
                        )}
                      >
                        {isDone ? <Check className="h-3 w-3" /> : i + 1}
                      </span>
                      <span>
                        <span className={cn("block text-sm font-medium", isDone && "text-muted-foreground line-through")}>{step.title}</span>
                        <span className="block text-[11px] leading-snug text-muted-foreground">{step.hint}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>

            {finished && SITE.repoUrl && (
              <a
                href={SITE.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                <Github className="h-4 w-4" /> Read how it's built
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
