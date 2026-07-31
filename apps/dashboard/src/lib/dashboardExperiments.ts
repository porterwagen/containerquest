import type { DashboardCue } from "@/lessons";

export type ExperimentId = NonNullable<DashboardCue["experiment"]>;

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

export function experimentById(id: string | null): ExperimentDef | undefined {
  return EXPERIMENTS.find((experiment) => experiment.id === id);
}
