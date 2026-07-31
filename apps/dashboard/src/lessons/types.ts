/**
 * The course.
 *
 * Every lesson follows the same rhythm, because that rhythm is what makes
 * things stick:
 *
 *   concept   -  plain language, no jargon that has not been defined yet
 *   do        -  a real command you type in a real terminal
 *   saw       -  what just happened, and why it looks like that
 *   takeaway  -  the one sentence worth remembering
 *
 * Commands are real. The dashboard verifies you actually ran them by watching
 * the services change, so "complete" means complete, not "clicked next".
 */

/** How we prove a step actually happened. */
export type Check =
  /** Nothing observable to detect  -  you tell us. Used honestly, not as filler. */
  | { kind: "manual"; label: string }
  /** That service's request counter rose since the step started. */
  | { kind: "requests"; service: string; delta: number }
  /** Its restart count went up  -  something killed and revived it. */
  | { kind: "restarts"; service: string; delta: number }
  /** Its uptime went DOWN, which can only mean the process started over. */
  | { kind: "restarted"; service: string }
  /** Its container id CHANGED  -  this is a different container than before. */
  | { kind: "replaced"; service: string }
  /** It is running but refusing traffic. */
  | { kind: "unready"; service: string }
  /**
   * A container with this exact name is running.
   *
   * The primer lessons in Chapter 0 create containers by hand, outside the
   * Compose project, so they carry none of its labels and cannot be found by
   * service id like every other check here.
   */
  | { kind: "running"; container: string };


/**
 * Visual accompaniment for steps that create folders/files.
 *
 * Hardcore one-liners (`mkdir && printf '…' > file`) are hard to learn from.
 * When a step writes files, attach a scaffold: show the directory tree and the
 * file contents in plain form, then keep a real command below for people who
 * want to run it. Pattern: identify file-writing steps, add scaffold, prefer
 * a readable heredoc command over printf escapes.
 */
export interface ScaffoldFile {
  /** Path relative to `root`, e.g. "server.js" or "src/index.ts". */
  path: string;
  /** Highlight hint for the code block (js, dockerfile, json, …). */
  language?: string;
  /** Exact file contents the learner should end up with. */
  content: string;
}

export interface Scaffold {
  /** Folder being created, shown as the tree root (e.g. "~/quest-hello"). */
  root: string;
  files: ScaffoldFile[];
  /** Optional one-line caption under the tree. */
  note?: string;
}

/**
 * Decode a command the first time a flag or pattern appears.
 * Piece is the token as typed; meaning is plain English. Keep short.
 */
export interface CommandPart {
  piece: string;
  meaning: string;
}

/** A lesson-owned link to the dashboard evidence for one step. */
export interface DashboardCue {
  view: "overview" | "experiment" | "request-path";
  /** Named experiment when `view` is `experiment`. */
  experiment?:
    | "restart-vs-replace"
    | "crash-recovery"
    | "readiness"
    | "compose-limits"
    | "k8s-selfheal"
    | "k8s-scaling"
    | "k8s-rollout";
  /** Service card to emphasize on Overview. */
  focus?: string;
  /** Learner-facing button label. */
  label: string;
}

/**
 * A two-option guess, asked before the command runs.
 *
 * Committing to an answer before seeing the result makes the result stick far
 * better than reading it does. Use only where there is a genuine surprise; on
 * an obvious step it is just friction. Never gates completion.
 *
 * If you add one, check the step's `commandParts` for spoilers first: several
 * of them currently explain the punchline directly above the question.
 */
export interface Predict {
  question: string;
  options: [string, string];
  /** Index of the correct option. */
  answer: 0 | 1;
  /** Shown once they have chosen, before they run the command. */
  because: string;
}

export interface Step {
  /** What to do, in one imperative sentence. */
  instruction: string;
  /**
   * When this step creates files, show the tree + contents first so the
   * learner can see what they're building before copying a shell command.
   */
  scaffold?: Scaffold;
  /** The exact command. Copyable. Real. */
  command?: string;
  /**
   * Optional anatomy of `command` for first-time flags/patterns.
   * Shown under the command box. Prefer once per new idea, not every step.
   */
  commandParts?: CommandPart[];
  /**
   * The one failure most likely to happen here, and what to do about it.
   *
   * Costs nothing to record and prevents the worst beginner outcome: a hard
   * stop with no path forward. Priority on any step that binds a host port or
   * creates a named container, since those are the ones that collide.
   */
  ifItFails?: string;
  /** A guess to commit to before running. See `Predict`. */
  predict?: Predict;
  /** Open the exact dashboard evidence this step uses. */
  dashboard?: DashboardCue;
  /** What you should see, and what it means. Shown after the step passes. */
  saw?: string;
  check: Check;
}

export interface Lesson {
  id: string;
  chapter: number;
  chapterTitle: string;
  title: string;
  /**
   * Optional arc label inside a chapter. The sidebar draws a divider and this
   * label whenever it changes, so a long chapter reads as a few short ones
   * without renumbering anything.
   */
  section?: string;
  /** Honest estimate, in minutes. */
  minutes: number;
  /** The idea, before any command. Paragraphs of plain prose. */
  concept: string[];
  steps: Step[];
  /**
   * "What you just did", shown once the lesson is complete and on every later
   * visit. One line per thing you performed, past tense, naming the action and
   * the fact it demonstrated: "You ran Python 3.13 without installing Python,
   * and the image stayed on disk after the container was deleted." Not "Images
   * are templates", which is a `takeaway`, not a recap.
   */
  recap?: string[];
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
  /** The container's id. Survives a restart; changes on replacement. */
  hostname: string;
}

export type ProbeMap = Record<string, Probe>;

/**
 * Pure, so it can be unit-tested and so demo mode and live mode agree.
 * `baseline` is captured when the step becomes active.
 */
export function evaluate(check: Check, baseline: ProbeMap, now: ProbeMap): boolean {
  if (check.kind === "manual") return false; // only a human can pass this

  // Answered before the lookups below, because this is the one check keyed by
  // container name rather than service id, and so has no `service` field.
  //
  // "Is it up" alone is not enough. A previous lesson may have left a container
  // of the same name running, in which case the step would pass the instant it
  // appeared on screen. So it passes only if the container was NOT up at the
  // baseline, or if it is up under a different id than it had then, which is
  // what recreating it produces.
  if (check.kind === "running") {
    const wasUp = baseline[check.container];
    const isUp = now[check.container];
    if (isUp?.up !== true) return false;
    if (wasUp?.up !== true) return true;
    return isUp.hostname !== "" && wasUp.hostname !== "" && isUp.hostname !== wasUp.hostname;
  }

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

    case "replaced":
      // The single cleanest signal that a container was destroyed and rebuilt
      // rather than merely restarted: a restart keeps the id, a replacement
      // cannot. This is the distinction the whole lesson is about.
      return (
        before !== undefined &&
        after.hostname !== "" &&
        before.hostname !== "" &&
        after.hostname !== before.hostname
      );

    case "unready":
      return after.up && !after.ready;
  }
}
