import { useEffect, useMemo, useRef, useState } from "react";

import { getAccessToken } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo/demo-mode";
import { subscribeDemoEvents } from "@/lib/demo/event-bus";
import {
  LiveChannelContext,
  liveSocketUrl,
  type LiveChannelStatus,
  type LiveEvent,
} from "@/hooks/use-live-channel";

/**
 * Owns the SINGLE WebSocket connection to the backend's authenticated
 * /ws/live channel for the whole authenticated session. Mount once (in
 * AppShell) — every useLiveChannel(onEvent) caller subscribes to this same
 * connection instead of each opening its own socket.
 */
export function LiveChannelProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<LiveChannelStatus>("closed");
  const listenersRef = useRef(new Set<(event: LiveEvent) => void>());

  useEffect(() => {
    if (isDemoMode()) {
      setStatus("open");
      const unsubscribe = subscribeDemoEvents((event) => listenersRef.current.forEach((listener) => listener(event)));
      // Stand-in camera feeds so the command center is live without real cameras.
      let stopSimulator: (() => void) | undefined;
      let disposed = false;
      void import("@/lib/demo/mock-backend").then(({ startSiteSimulator }) => {
        if (!disposed) stopSimulator = startSiteSimulator();
      });
      return () => {
        disposed = true;
        stopSimulator?.();
        unsubscribe();
      };
    }

    const token = getAccessToken();
    if (!token) return;

    let socket: WebSocket | null = null;
    let pingTimer: number | undefined;
    let reconnectTimer: number | undefined;
    let attempts = 0;
    let disposed = false;

    function connect() {
      if (disposed) return;
      setStatus("connecting");
      socket = new WebSocket(liveSocketUrl(token!));

      socket.onopen = () => {
        attempts = 0;
        setStatus("open");
        pingTimer = window.setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "ping" }));
        }, 25_000);
      };

      socket.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data) as LiveEvent;
          if (data.type === "pong") return;
          listenersRef.current.forEach((listener) => listener(data));
        } catch {
          /* ignore malformed frames */
        }
      };

      socket.onclose = () => {
        setStatus("closed");
        if (pingTimer) window.clearInterval(pingTimer);
        if (!disposed) {
          attempts += 1;
          const delay = Math.min(30_000, 1_000 * 2 ** attempts);
          reconnectTimer = window.setTimeout(connect, delay);
        }
      };

      socket.onerror = () => socket?.close();
    }

    connect();

    return () => {
      disposed = true;
      if (pingTimer) window.clearInterval(pingTimer);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  const value = useMemo(
    () => ({
      status,
      subscribe: (listener: (event: LiveEvent) => void) => {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
    }),
    [status],
  );

  return <LiveChannelContext.Provider value={value}>{children}</LiveChannelContext.Provider>;
}
