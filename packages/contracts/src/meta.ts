import { z } from "zod";

/**
 * The service contract.
 *
 * Every Container Quest service implements these four routes identically —
 * in TypeScript, Python, Go, and C. That sameness is the whole point: Docker
 * and Kubernetes never learn what language is inside the container, so five
 * very different runtimes end up looking like one uniform fleet.
 */

export const Language = z.enum(["typescript", "python", "go", "c"]);
export type Language = z.infer<typeof Language>;

/** `GET /meta` — who am I, and where am I running? */
export const ServiceMeta = z.object({
  service: z.string(),
  language: Language,

  /** Bumped on rollout. The dashboard colours pods by this during a deploy. */
  version: z.string(),
  gitSha: z.string(),
  buildTime: z.string(),

  /**
   * Container hostname. Under Docker this is the container ID; under
   * Kubernetes it happens to equal the pod name. Watching this value change
   * on restart is how you *see* that containers are cattle, not pets.
   */
  hostname: z.string(),

  /** Populated from the Downward API. Null under plain Docker — that gap is the lesson. */
  podName: z.string().nullable(),
  nodeName: z.string().nullable(),
  namespace: z.string().nullable(),

  uptimeSec: z.number(),
  requests: z.number(),
  pid: z.number(),
});
export type ServiceMeta = z.infer<typeof ServiceMeta>;

/** `GET /healthz` and `GET /readyz` share this shape. */
export const ProbeResult = z.object({
  ok: z.boolean(),
  /** Which dependencies this service checked, and whether they answered. */
  checks: z.record(z.string(), z.boolean()).default({}),
  detail: z.string().optional(),
});
export type ProbeResult = z.infer<typeof ProbeResult>;

/**
 * `POST /chaos` — the dashboard's red buttons.
 *
 * `crash` and `unready` are deliberately different, because the difference
 * between them *is* the difference between a liveness and a readiness probe:
 *   crash   → process exits → liveness fails → restart count increments
 *   unready → process fine  → readiness fails → traffic drains, no restart
 */
export const ChaosAction = z.enum(["crash", "hang", "unready", "slow", "leak"]);
export type ChaosAction = z.infer<typeof ChaosAction>;

export const ChaosRequest = z.object({
  action: ChaosAction,
  /** How long the effect lasts. Ignored by `crash`, which is permanent by nature. */
  durationMs: z.number().int().positive().max(120_000).default(15_000),
});
export type ChaosRequest = z.infer<typeof ChaosRequest>;

/** Header carried across every hop so the dashboard can draw real request flow. */
export const TRACE_HEADER = "x-quest-trace";
