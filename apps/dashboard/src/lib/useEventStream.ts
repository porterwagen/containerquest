"use client";

import { useEffect, useReducer, useRef } from "react";
import type { QuestEvent, Replica } from "@quest/contracts";

/**
 * One reducer, any source.
 *
 * This is the payoff of defining QuestEvent before writing any driver: the
 * same reducer consumes events from the live Docker stream and from the
 * in-browser simulator, so the public demo runs the real UI rather than a
 * mock of it. Nothing below knows or cares which driver produced an event.
 */

export interface TraceEdge {
  key: string;
  from: string;
  to: string;
  ms: number;
  status: number;
  at: number;
}

export interface LogLine {
  id: string;
  at: number;
  service: string;
  level: "info" | "warn" | "error";
  message: string;
}

export interface QueuePoint {
  at: number;
  depth: number;
  active: number;
  completed: number;
}

export interface FleetState {
  replicas: Replica[];
  edges: TraceEdge[];
  logs: LogLine[];
  queue: QueuePoint[];
  restarts: Record<string, number>;
  connected: boolean;
  lastEventAt: number | null;
}

const initial: FleetState = {
  replicas: [],
  edges: [],
  logs: [],
  queue: [],
  restarts: {},
  connected: false,
  lastEventAt: null,
};

type Action = { kind: "event"; event: QuestEvent } | { kind: "connected"; value: boolean };

/** Ring buffers everywhere: this runs for hours, so nothing may grow unbounded. */
const EDGE_WINDOW = 60;
const LOG_WINDOW = 60;
const QUEUE_WINDOW = 90;

function reduce(state: FleetState, action: Action): FleetState {
  if (action.kind === "connected") return { ...state, connected: action.value };

  const e = action.event;
  const next: FleetState = { ...state, lastEventAt: Date.now() };

  switch (e.type) {
    case "snapshot":
      next.replicas = e.replicas;
      return next;

    case "replica.added":
      next.replicas = [...state.replicas.filter((r) => r.id !== e.replica.id), e.replica];
      return next;

    case "replica.phase":
      next.replicas = state.replicas.map((r) => (r.id === e.id ? { ...r, phase: e.phase } : r));
      return next;

    case "replica.removed":
      next.replicas = state.replicas.map((r) =>
        r.id === e.id ? { ...r, phase: "Gone" as const } : r,
      );
      return next;

    case "replica.restarted":
      next.restarts = { ...state.restarts, [e.service]: e.restarts };
      next.replicas = state.replicas.map((r) =>
        r.id === e.id ? { ...r, restarts: e.restarts } : r,
      );
      return next;

    case "trace.span":
      next.edges = [
        ...state.edges.slice(-(EDGE_WINDOW - 1)),
        {
          key: `${e.traceId}-${e.from}-${e.to}-${e.at}-${Math.random().toString(36).slice(2, 6)}`,
          from: e.from,
          to: e.to,
          ms: e.ms,
          status: e.status,
          at: e.at,
        },
      ];
      return next;

    case "queue.stats":
      next.queue = [
        ...state.queue.slice(-(QUEUE_WINDOW - 1)),
        { at: e.at, depth: e.depth, active: e.active, completed: e.completed },
      ];
      return next;

    case "probe.failed":
      next.logs = pushLog(state.logs, {
        id: `${e.at}-${e.id}-probe`,
        at: e.at,
        service: e.service,
        level: "warn",
        message: `${e.probe} probe failed: ${e.detail}`,
      });
      return next;

    case "chaos.applied":
      next.logs = pushLog(state.logs, {
        id: `${e.at}-${e.service}-chaos`,
        at: e.at,
        service: e.service,
        level: "warn",
        message: `chaos: ${e.action} applied to ${e.target}`,
      });
      return next;

    case "log":
      next.logs = pushLog(state.logs, {
        id: `${e.at}-${e.service}-${Math.random().toString(36).slice(2, 7)}`,
        at: e.at,
        service: e.service,
        level: e.level,
        message: e.message,
      });
      return next;

    default:
      return next;
  }
}

function pushLog(logs: LogLine[], line: LogLine): LogLine[] {
  return [line, ...logs].slice(0, LOG_WINDOW);
}

/**
 * Subscribes to whichever driver this deployment is running.
 *
 * "live"  → SSE from /api/events, backed by Docker (and Kubernetes in Phase 4).
 * "demo"  → the in-browser simulator, no backend at all.
 *
 * The switch is these few lines, and nothing downstream changes — which is the
 * entire return on defining QuestEvent before writing a single driver.
 *
 * EventSource also reconnects automatically after a drop, most of why SSE beats
 * a WebSocket here: that logic would otherwise be hand-written, with backoff.
 */
export function useEventStream(mode: "live" | "demo" = "live"): FleetState {
  const [state, dispatch] = useReducer(reduce, initial);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (mode === "demo") {
      let unsubscribe = () => {};
      // Loaded lazily so the simulator is never bundled into the server path.
      void import("./drivers/sim").then(({ getSimDriver }) => {
        dispatch({ kind: "connected", value: true });
        unsubscribe = getSimDriver().subscribe((event) => dispatch({ kind: "event", event }));
      });
      return () => unsubscribe();
    }

    const source = new EventSource("/api/events");
    sourceRef.current = source;

    source.onopen = () => dispatch({ kind: "connected", value: true });
    source.onerror = () => dispatch({ kind: "connected", value: false });
    source.onmessage = (msg) => {
      // Arriving data is the strongest possible proof we are connected.
      // onopen alone was not enough: EventSource fires onerror on every
      // reconnect, and the flag stuck at false while events kept flowing.
      dispatch({ kind: "connected", value: true });
      try {
        dispatch({ kind: "event", event: JSON.parse(msg.data) as QuestEvent });
      } catch {
        /* malformed frame; ignore rather than tear down the stream */
      }
    };

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, [mode]);

  return state;
}
