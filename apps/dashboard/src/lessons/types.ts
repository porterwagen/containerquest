/**
 * The course.
 *
 * Every lesson follows the same rhythm, because that rhythm is what makes
 * things stick:
 *
 *   concept  — plain language, no jargon that has not been defined yet
 *   do       — a real command you type in a real terminal
 *   saw      — what just happened, and why it looks like that
 *   takeaway — the one sentence worth remembering
 *
 * Commands are real. The dashboard verifies you actually ran them by watching
 * the services change, so "complete" means complete, not "clicked next".
 */

/** How we prove a step actually happened. */
export type Check =
  /** Nothing observable to detect — you tell us. Used honestly, not as filler. */
  | { kind: "manual"; label: string }
  /** That service's request counter rose since the step started. */
  | { kind: "requests"; service: string; delta: number }
  /** Its restart count went up — something killed and revived it. */
  | { kind: "restarts"; service: string; delta: number }
  /** Its uptime went DOWN, which can only mean the process started over. */
  | { kind: "restarted"; service: string }
  /** It is running but refusing traffic. */
  | { kind: "unready"; service: string };

export interface Step {
  /** What to do, in one imperative sentence. */
  instruction: string;
  /** The exact command. Copyable. Real. */
  command?: string;
  /** What you should see, and what it means. Shown after the step passes. */
  saw?: string;
  check: Check;
}

export interface Lesson {
  id: string;
  chapter: number;
  chapterTitle: string;
  title: string;
  /** Honest estimate, in minutes. */
  minutes: number;
  /** The idea, before any command. Paragraphs of plain prose. */
  concept: string[];
  steps: Step[];
  /** One sentence. The thing you now know. */
  takeaway: string;
  /** Optional: the file in this repo where the idea lives. */
  source?: { path: string; note: string };
}

/** Live counters the checks are evaluated against. */
export interface Probe {
  requests: number;
  uptimeSec: number;
  restarts: number;
  ready: boolean;
  up: boolean;
}

export type ProbeMap = Record<string, Probe>;

/**
 * Pure, so it can be unit-tested and so demo mode and live mode agree.
 * `baseline` is captured when the step becomes active.
 */
export function evaluate(check: Check, baseline: ProbeMap, now: ProbeMap): boolean {
  if (check.kind === "manual") return false; // only a human can pass this

  const before = baseline[check.service];
  const after = now[check.service];
  if (!after) return false;

  switch (check.kind) {
    case "requests":
      return after.requests >= (before?.requests ?? 0) + check.delta;

    case "restarts":
      return after.restarts >= (before?.restarts ?? 0) + check.delta;

    case "restarted":
      // Uptime running backwards is the one signal that cannot be faked by a
      // slow poll: a process that restarted is younger than it used to be.
      return before !== undefined && after.uptimeSec < before.uptimeSec;

    case "unready":
      return after.up && !after.ready;
  }
}
