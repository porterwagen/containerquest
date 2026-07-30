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
  if (check.kind === "running") return now[check.container]?.up === true;

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
