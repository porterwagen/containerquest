/** Job shapes shared between whoever enqueues and whoever consumes. */

export const QUEUE_NAME = "quest";

export type JobPayload =
  /** Pure CPU: repeated SHA-256. Scales linearly with replicas. */
  | { kind: "hash"; input: string; rounds: number; ms?: number }
  /** Calls the Python AI service — a job that fails when a dependency is down. */
  | { kind: "embed"; input: string; rounds?: number; ms?: number }
  /** Pure waiting. Shows that concurrency, not CPU, is the limit for I/O work. */
  | { kind: "sleep"; ms: number; input?: string; rounds?: number };

export type JobKind = JobPayload["kind"];
