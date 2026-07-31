import type { DashboardCue } from "@/lessons";

export type ExperimentId = NonNullable<DashboardCue["experiment"]>;
export type ExperienceId = ExperimentId | "request-path";

export interface ExperimentCommand {
  key: "setup" | "action" | "restart" | "replace" | "reset";
  label: string;
  command: string;
  role: "setup" | "action" | "reset";
}

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
  /** One-based lesson step that introduces this experiment. */
  lessonStep: number;
  /** Compact terminal path shown on the live experiment. */
  commands: ExperimentCommand[];
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
    lessonStep: 2,
    commands: [
      {
        key: "setup",
        label: "Create the scratch file",
        role: "setup",
        command:
          "docker exec container-quest-ai-1 sh -c 'echo \"I was here\" > /tmp/note.txt && cat /tmp/note.txt'",
      },
      {
        key: "restart",
        label: "Restart the existing container",
        role: "action",
        command:
          "docker restart container-quest-ai-1 && sleep 4 && docker exec container-quest-ai-1 cat /tmp/note.txt 2>/dev/null && echo \"--> STILL THERE\" || echo \"--> GONE\"",
      },
      {
        key: "replace",
        label: "Replace the container",
        role: "action",
        command:
          "cd ~/Documents/containerquest && docker compose -f infra/compose/docker-compose.yml up -d --force-recreate ai && sleep 6 && docker exec container-quest-ai-1 cat /tmp/note.txt 2>/dev/null && echo \"--> STILL THERE\" || echo \"--> GONE\"",
      },
    ],
  },
  {
    id: "crash-recovery",
    lessonId: "restart-policies",
    lessonTitle: "Restart policies: who brings it back",
    chapter: 4,
    title: "Crash recovery",
    summary: "Watch one process exit and see exactly what brings it back.",
    kubernetes: false,
    lessonStep: 1,
    commands: [
      {
        key: "action",
        label: "Crash AI",
        role: "action",
        command:
          "curl -s -XPOST localhost:8000/chaos -H 'content-type: application/json' -d '{\"action\":\"crash\"}'",
      },
    ],
  },
  {
    id: "readiness",
    lessonId: "probes",
    lessonTitle: "Health checks: the two questions that look identical",
    chapter: 4,
    title: "Ready is not alive",
    summary: "Make one service decline traffic without restarting it.",
    kubernetes: false,
    lessonStep: 1,
    commands: [
      {
        key: "action",
        label: "Make util unready",
        role: "action",
        command:
          "curl -s -XPOST localhost:8080/chaos -H 'content-type: application/json' -d '{\"action\":\"unready\"}'",
      },
    ],
  },
  {
    id: "compose-limits",
    lessonId: "compose-limits",
    lessonTitle: "Where Compose runs out of road",
    chapter: 4,
    title: "Why Compose cannot scale this",
    summary: "Connect the fixed host-port failure to the capability Kubernetes adds.",
    kubernetes: false,
    lessonStep: 1,
    commands: [
      {
        key: "action",
        label: "Try three workers",
        role: "action",
        command:
          "cd ~/Documents/containerquest && docker compose -f infra/compose/docker-compose.yml up -d --scale worker=3 2>&1 | tail -4",
      },
      {
        key: "reset",
        label: "Restore one worker",
        role: "reset",
        command:
          "cd ~/Documents/containerquest && docker compose -f infra/compose/docker-compose.yml up -d --scale worker=1 2>&1 | tail -2",
      },
    ],
  },
  {
    id: "k8s-selfheal",
    lessonId: "k8s-selfheal",
    lessonTitle: "Self-healing: delete a pod and watch",
    chapter: 5,
    title: "Pod replacement",
    summary: "Delete one pod and watch desired state create a new identity.",
    kubernetes: true,
    lessonStep: 1,
    commands: [
      {
        key: "action",
        label: "Delete one compute pod",
        role: "action",
        command:
          "kubectl delete pod -n container-quest $(kubectl get pods -n container-quest -l app=compute -o jsonpath='{.items[0].metadata.name}')",
      },
    ],
  },
  {
    id: "k8s-scaling",
    lessonId: "k8s-scaling",
    lessonTitle: "Scaling: one number, no port conflicts",
    chapter: 5,
    title: "Scale behind one Service",
    summary: "Change one replica count and watch ready copies join the pool.",
    kubernetes: true,
    lessonStep: 1,
    commands: [
      {
        key: "action",
        label: "Scale compute to five",
        role: "action",
        command: "kubectl scale deployment compute -n container-quest --replicas=5",
      },
      {
        key: "reset",
        label: "Restore two replicas",
        role: "reset",
        command: "kubectl scale deployment compute -n container-quest --replicas=2",
      },
    ],
  },
  {
    id: "k8s-rollout",
    lessonId: "k8s-rollout",
    lessonTitle: "Rolling updates: deploying without downtime",
    chapter: 5,
    title: "Rolling update",
    summary: "Watch old and new versions overlap while ready capacity stays available.",
    kubernetes: true,
    lessonStep: 1,
    commands: [
      {
        key: "action",
        label: "Roll compute to version 2.0.0",
        role: "action",
        command:
          "kubectl set env deployment/compute -n container-quest SERVICE_VERSION=2.0.0",
      },
      {
        key: "reset",
        label: "Roll back",
        role: "reset",
        command: "kubectl rollout undo deployment/compute -n container-quest",
      },
    ],
  },
];

export const REQUEST_PATH_LESSON = "the-system";
export const REQUEST_PATH_LESSON_TITLE = "The system you're about to learn on";
export const REQUEST_PATH_LESSON_STEP = 2;
export const REQUEST_PATH_COMMANDS: ExperimentCommand[] = [
  {
    key: "action",
    label: "Send one request through util",
    role: "action",
    command: "curl -s localhost:8080/aggregate",
  },
];

/** Demo starter chips: high-signal experiments that need no Docker. */
export const DEMO_STARTER_IDS: ExperimentId[] = [
  "crash-recovery",
  "readiness",
  "k8s-scaling",
];

export function experimentById(id: string | null): ExperimentDef | undefined {
  return EXPERIMENTS.find((experiment) => experiment.id === id);
}

export function experienceCommand(
  id: ExperienceId,
  key: ExperimentCommand["key"],
): string {
  const commands = id === "request-path" ? REQUEST_PATH_COMMANDS : experimentById(id)?.commands;
  const command = commands?.find((candidate) => candidate.key === key)?.command;
  if (!command) throw new Error(`missing ${key} command for experiment "${id}"`);
  return command;
}

function lessonHref(lessonId: string, step: number, fromExperiment: ExperienceId): string {
  return `/learn?${new URLSearchParams({
    lesson: lessonId,
    step: String(step),
    fromExperiment,
  }).toString()}`;
}

export function experimentLessonHref(experiment: ExperimentDef): string {
  return lessonHref(experiment.lessonId, experiment.lessonStep, experiment.id);
}

export function requestPathLessonHref(): string {
  return lessonHref(REQUEST_PATH_LESSON, REQUEST_PATH_LESSON_STEP, "request-path");
}

export function experienceDashboardHref(id: ExperienceId): string {
  return id === "request-path"
    ? "/dashboard?view=request-path"
    : `/dashboard?${new URLSearchParams({ view: "experiment", experiment: id }).toString()}`;
}

export function experienceForLesson(
  lessonId: string,
): { id: ExperienceId; title: string; dashboardHref: string } | undefined {
  if (lessonId === REQUEST_PATH_LESSON) {
    return {
      id: "request-path",
      title: "Request Path",
      dashboardHref: experienceDashboardHref("request-path"),
    };
  }
  const experiment = EXPERIMENTS.find((candidate) => candidate.lessonId === lessonId);
  return experiment
    ? {
        id: experiment.id,
        title: experiment.title,
        dashboardHref: experienceDashboardHref(experiment.id),
      }
    : undefined;
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
