import type { DashboardCue } from "@/lessons";

export type ExperimentId = NonNullable<DashboardCue["experiment"]>;

/** Course-relative readiness for the experiment library. */
export type ExperimentStatus = "upcoming" | "in-lesson" | "ready";

export interface ExperimentDef {
  id: ExperimentId;
  lessonId: string;
  lessonTitle: string;
  chapter: number;
  title: string;
  summary: string;
  kubernetes: boolean;
}

export const EXPERIMENTS: ExperimentDef[] = [
  {
    id: "restart-vs-replace",
    lessonId: "disposable",
    lessonTitle: "What survives, and what doesn't",
    chapter: 1,
    title: "Restart or replacement?",
    summary: "Compare identity and uptime after two operations that look similar from outside.",
    kubernetes: false,
  },
  {
    id: "crash-recovery",
    lessonId: "restart-policies",
    lessonTitle: "Restart policies: who brings it back",
    chapter: 4,
    title: "Crash recovery",
    summary: "Watch one process exit and see exactly what brings it back.",
    kubernetes: false,
  },
  {
    id: "readiness",
    lessonId: "probes",
    lessonTitle: "Health checks: the two questions that look identical",
    chapter: 4,
    title: "Ready is not alive",
    summary: "Make one service decline traffic without restarting it.",
    kubernetes: false,
  },
  {
    id: "compose-limits",
    lessonId: "compose-limits",
    lessonTitle: "Where Compose runs out of road",
    chapter: 4,
    title: "Why Compose cannot scale this",
    summary: "Connect the fixed host-port failure to the capability Kubernetes adds.",
    kubernetes: false,
  },
  {
    id: "k8s-selfheal",
    lessonId: "k8s-selfheal",
    lessonTitle: "Self-healing: delete a pod and watch",
    chapter: 5,
    title: "Pod replacement",
    summary: "Delete one pod and watch desired state create a new identity.",
    kubernetes: true,
  },
  {
    id: "k8s-scaling",
    lessonId: "k8s-scaling",
    lessonTitle: "Scaling: one number, no port conflicts",
    chapter: 5,
    title: "Scale behind one Service",
    summary: "Change one replica count and watch ready copies join the pool.",
    kubernetes: true,
  },
  {
    id: "k8s-rollout",
    lessonId: "k8s-rollout",
    lessonTitle: "Rolling updates: deploying without downtime",
    chapter: 5,
    title: "Rolling update",
    summary: "Watch old and new versions overlap while ready capacity stays available.",
    kubernetes: true,
  },
];

export const REQUEST_PATH_LESSON = "the-system";
export const REQUEST_PATH_LESSON_TITLE = "The system you're about to learn on";

/** Demo starter chips: high-signal experiments that need no Docker. */
export const DEMO_STARTER_IDS: ExperimentId[] = [
  "crash-recovery",
  "readiness",
  "k8s-scaling",
];

export function experimentById(id: string | null): ExperimentDef | undefined {
  return EXPERIMENTS.find((experiment) => experiment.id === id);
}

/**
 * Ready = lesson completed (practice what you learned).
 * In lesson = currently on that lesson (dual-tab capture).
 * Upcoming = everything else (visible roadmap; still runnable).
 */
export function experimentStatus(
  lessonId: string,
  progress: { done: string[]; current: string },
): ExperimentStatus {
  if (progress.done.includes(lessonId)) return "ready";
  if (progress.current === lessonId) return "in-lesson";
  return "upcoming";
}

export function statusLabel(status: ExperimentStatus): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "in-lesson":
      return "In lesson";
    case "upcoming":
      return "Upcoming";
  }
}
