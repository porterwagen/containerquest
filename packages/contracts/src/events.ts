import { z } from "zod";
import { ChaosAction } from "./meta.ts";

/**
 * The event stream.
 *
 * Everything the dashboard animates arrives as one of these. The simulator,
 * the Docker driver, and the Kubernetes driver all emit exactly this shape —
 * which is what lets the public demo run the same UI as the real cluster.
 */

const base = { at: z.number(), service: z.string() };

/** A replica. "Pod" under Kubernetes, "container" under Docker — same card in the UI. */
export const Replica = z.object({
  id: z.string(),
  service: z.string(),
  version: z.string(),
  /** Kubernetes lifecycle, borrowed for Docker too so one component renders both. */
  phase: z.enum(["Pending", "Starting", "Ready", "Unready", "Terminating", "Gone"]),
  restarts: z.number(),
  node: z.string().nullable(),
  startedAt: z.number(),
  cpuPct: z.number(),
  memMb: z.number(),
});
export type Replica = z.infer<typeof Replica>;

export const QuestEvent = z.discriminatedUnion("type", [
  /** Full state, sent on connect so a late-joining browser is never out of sync. */
  z.object({ type: z.literal("snapshot"), at: z.number(), replicas: z.array(Replica) }),

  z.object({ type: z.literal("replica.added"), ...base, replica: Replica }),
  z.object({ type: z.literal("replica.phase"), ...base, id: z.string(), phase: Replica.shape.phase }),
  z.object({ type: z.literal("replica.removed"), ...base, id: z.string(), reason: z.string() }),

  /**
   * The restart counter incrementing is the single clearest signal that
   * something is supervising your process. It gets its own event.
   */
  z.object({ type: z.literal("replica.restarted"), ...base, id: z.string(), restarts: z.number() }),

  z.object({
    type: z.literal("probe.failed"),
    ...base,
    id: z.string(),
    probe: z.enum(["liveness", "readiness"]),
    detail: z.string(),
  }),

  z.object({ type: z.literal("scale.changed"), ...base, from: z.number(), to: z.number() }),

  /** Rollout progress drives the surge/unavailable bounds animation. */
  z.object({
    type: z.literal("rollout.progress"),
    ...base,
    fromVersion: z.string(),
    toVersion: z.string(),
    updated: z.number(),
    total: z.number(),
    available: z.number(),
    done: z.boolean(),
  }),

  /** One hop of a real request. This is what the topology particles are made of. */
  z.object({
    type: z.literal("trace.span"),
    ...base,
    traceId: z.string(),
    from: z.string(),
    to: z.string(),
    ms: z.number(),
    status: z.number(),
  }),

  z.object({
    type: z.literal("queue.stats"),
    ...base,
    depth: z.number(),
    active: z.number(),
    completed: z.number(),
    failed: z.number(),
  }),

  z.object({ type: z.literal("chaos.applied"), ...base, action: ChaosAction, target: z.string() }),

  z.object({
    type: z.literal("log"),
    ...base,
    level: z.enum(["info", "warn", "error"]),
    message: z.string(),
    replicaId: z.string().nullable(),
  }),
]);
export type QuestEvent = z.infer<typeof QuestEvent>;

export type QuestEventType = QuestEvent["type"];
