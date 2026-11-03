import { createContext, useContext, useEffect, useRef } from "react";

import { API_BASE } from "@/lib/auth";

export type LiveEventType =
  | "connection_ack"
  | "detections"
  | "tracking_update"
  | "incident_update"
  | "telemetry"
  | "pong";

export interface LiveEvent {
  type: LiveEventType | string;
  payload?: unknown;
  ts?: string;
  [key: string]: unknown;
}

export type LiveChannelStatus = "connecting" | "open" | "closed";

/** Derive the ws(s):// URL for /ws/live from the http(s) API base. */
export function liveSocketUrl(token: string): string {
  const httpBase = API_BASE.replace(/\/api\/?$/, "");
  const wsBase = httpBase.replace(/^http/, "ws");
  return `${wsBase}/ws/live?token=${encodeURIComponent(token)}`;
}

interface LiveChannelContextValue {
  status: LiveChannelStatus;
  subscribe: (listener: (event: LiveEvent) => void) => () => void;
}

export const LiveChannelContext = createContext<LiveChannelContextValue | undefined>(undefined);

/**
 * Subscribes to the shared backend /ws/live channel (one connection per
 * session, owned by <LiveChannelProvider>, not per-caller) and invokes
 * `onEvent` for every server-pushed event (detections, incidents, telemetry).
 * Silently no-ops when unauthenticated or when rendered outside the provider.
 */
export function useLiveChannel(onEvent?: (event: LiveEvent) => void) {
  const ctx = useContext(LiveChannelContext);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!ctx) return;
    return ctx.subscribe((event) => onEventRef.current?.(event));
  }, [ctx]);

  return { status: ctx?.status ?? "closed" };
}
