// In-process stand-in for the backend's /ws/live channel, used in demo mode.
// Messages follow the same {type, payload, ts} envelope as
// backend/app/websocket/broadcaster.py.

import type { LiveEvent } from "@/hooks/use-live-channel";

type Listener = (event: LiveEvent) => void;

const listeners = new Set<Listener>();

export function emitDemoEvent(type: string, payload: unknown) {
  const event: LiveEvent = { type, payload, ts: new Date().toISOString() };
  listeners.forEach((l) => l(event));
}

export function subscribeDemoEvents(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
