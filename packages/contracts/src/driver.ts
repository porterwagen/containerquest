import type { QuestEvent, Replica } from "./events.ts";
import type { ChaosAction } from "./meta.ts";

/**
 * The seam that makes this project work.
 *
 * The dashboard never imports `dockerode` or `@kubernetes/client-node`. It
 * talks to a QuestDriver, and three things implement it:
 *
 *   SimDriver      nothing at all — a deterministic model in the browser.
 *                  Powers the public demo, so a stranger can crash a pod
 *                  without installing Docker.
 *   ComposeDriver  the Docker Engine API.
 *   K8sDriver      the Kubernetes API.
 *
 * Because the interface came first, the same buttons drive all three — and
 * swapping between them shows exactly what Kubernetes adds over plain Docker.
 */

export interface Workload {
  service: string;
  desired: number;
  ready: number;
  version: string;
  replicas: Replica[];
}

export type DriverMode = "sim" | "compose" | "k8s";

export interface DriverCapabilities {
  /** Compose can restart a container; only Kubernetes reschedules it elsewhere. */
  reschedules: boolean;
  /** Rolling updates with surge bounds are a Kubernetes concept. */
  rollingUpdate: boolean;
  /** Kubernetes distinguishes liveness from readiness; Compose healthchecks do not. */
  separateProbes: boolean;
  nodes: number;
}

export interface QuestDriver {
  readonly mode: DriverMode;
  readonly capabilities: DriverCapabilities;

  /** Emits a `snapshot` immediately, then deltas. Returns an unsubscribe fn. */
  subscribe(cb: (event: QuestEvent) => void): () => void;

  listWorkloads(): Promise<Workload[]>;

  scale(service: string, replicas: number): Promise<void>;
  restart(service: string): Promise<void>;
  rollout(service: string, version: string): Promise<void>;
  chaos(service: string, action: ChaosAction, durationMs?: number): Promise<void>;

  /** Pushes N jobs onto the queue so the worker has something to chew on. */
  enqueue(count: number): Promise<void>;

  dispose(): void;
}

/**
 * Capability gaps are rendered in the UI rather than hidden.
 *
 * When a control is unavailable the dashboard explains *why* — "Compose has no
 * concept of a rolling update; switch to Kubernetes mode" teaches more than a
 * greyed-out button ever could.
 */
export const CAPABILITY_NOTES: Record<keyof DriverCapabilities, string> = {
  reschedules:
    "Docker restarts a container in place. Kubernetes replaces the pod — possibly on a different node entirely.",
  rollingUpdate:
    "Compose stops the old container before starting the new one. Kubernetes surges up first, so traffic never drops.",
  separateProbes:
    "A Compose healthcheck only marks a container unhealthy. Kubernetes splits it in two: liveness restarts you, readiness merely stops sending you traffic.",
  nodes:
    "Compose runs everything on one host. Kubernetes schedules across nodes, so losing a machine is survivable.",
};
