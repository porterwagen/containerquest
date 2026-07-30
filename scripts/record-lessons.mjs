/**
 * Records a real session.
 *
 * Runs every command from every lesson against the actually-running system and
 * captures the genuine output. The web build replays these recordings, so a
 * visitor with no Docker sees output that really happened on a real machine
 * rather than something invented to look plausible.
 *
 * This is the difference between a recording and a mockup, and it is the whole
 * reason the public site can be honest about what it is.
 *
 *   node scripts/record-lessons.mjs                       # record everything
 *   node scripts/record-lessons.mjs --only ch0            # one chapter
 *   node scripts/record-lessons.mjs --only first-container # one lesson
 *   node scripts/record-lessons.mjs --missing             # only what is absent
 *
 * Commands run in lesson order, because they build on each other's state. That
 * is also why --missing is a convenience and not a guarantee: a step whose
 * setup came from an earlier step in the same lesson needs the whole lesson.
 */

import { spawn } from "node:child_process";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LESSONS } from "../apps/dashboard/src/lessons/index.ts";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "apps/dashboard/src/generated/recordings.json");

/**
 * Long output is trimmed — nobody reads 400 lines in a replay pane.
 *
 * Note that trim() keeps the FIRST N lines, so a build log loses its tail.
 * 28 was cutting the "naming to docker.io/..." success line off every
 * `docker build`, which is the one line proving the build worked. 45 still
 * cut it from the Chapter 0 build that also runs `npm install`, which is
 * the longest log the course records. 60 clears it with room to spare.
 */
const MAX_LINES = 60;
const MAX_CHARS = 4_000;

/** Commands that take a while (image builds, rollouts) need room. */
const TIMEOUT_MS = 240_000;

function trim(text) {
  let out = text.replace(/\r/g, "").trimEnd();
  if (out.length > MAX_CHARS) out = out.slice(0, MAX_CHARS);
  const lines = out.split("\n");
  if (lines.length > MAX_LINES) {
    const kept = lines.slice(0, MAX_LINES);
    kept.push(`… (${lines.length - MAX_LINES} more lines)`);
    return kept.join("\n");
  }
  return out;
}

/**
 * Runs through zsh as a login+interactive shell, matching how a person would
 * actually run these: their PATH, their profile, and job control available for
 * the port-forward steps that background a process and later kill %1.
 */
function run(command) {
  const started = Date.now();

  return new Promise((resolve) => {
    const child = spawn("/bin/zsh", ["-lic", command], {
      cwd: ROOT,
      env: { ...process.env, PATH: `${process.env.HOME}/.orbstack/bin:${process.env.PATH}` },
    });

    // ONE buffer fed by both streams, in the order the bytes actually arrive.
    //
    // Collecting them separately and concatenating at the end reorders the
    // session: docker writes build and pull progress to stderr and results to
    // stdout, so `docker run` on a missing image recorded the answer first and
    // the download after it. A lesson whose text says "first the download,
    // then the answer" then showed the exact opposite.
    let output = "";
    child.stdout.on("data", (d) => (output += d));
    child.stderr.on("data", (d) => (output += d));

    const timer = setTimeout(() => child.kill("SIGKILL"), TIMEOUT_MS);

    child.on("close", (code) => {
      clearTimeout(timer);
      // A non-zero exit is often the POINT of the step: the C service has no
      // shell, Compose refuses to scale. Those failures are the lesson, so
      // they get recorded exactly like any other output.
      resolve({ output: trim(output), exitCode: code ?? 1, ms: Date.now() - started });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ output: trim(String(err.message ?? err)), exitCode: 1, ms: Date.now() - started });
    });
  });
}

const onlyArg = process.argv.indexOf("--only");
const only = onlyArg > -1 ? process.argv[onlyArg + 1] : null;
const missingOnly = process.argv.includes("--missing");

// Merge onto whatever is already recorded, so `--only ch6` re-records one
// chapter instead of throwing the other six away.
let recordings = {};
if (only || missingOnly) {
  try {
    recordings = JSON.parse(await readFile(OUT, "utf8")).recordings ?? {};
    console.log(`Merging onto ${Object.keys(recordings).length} existing recordings.`);
  } catch {
    /* nothing recorded yet */
  }
}

let recorded = 0;
let failed = 0;

// --only takes either a chapter ("ch0") or a single lesson id, because the
// usual reason to re-record is that one lesson changed, and regenerating a
// whole chapter to fix one step is how good recordings get clobbered.
const targets = LESSONS.filter((l) => {
  if (!only) return true;
  return only.startsWith("ch") ? `ch${l.chapter}` === only : l.id === only;
});

if (only && targets.length === 0) {
  console.error(`No lessons matched --only ${only}. Expected a chapter like "ch0" or a lesson id.`);
  process.exit(1);
}

console.log(`Recording ${targets.length} lessons against the live system…\n`);

for (const lesson of targets) {
  for (const [i, step] of lesson.steps.entries()) {
    if (!step.command) continue;

    const key = `${lesson.id}:${i}`;

    // --missing fills gaps without touching recordings that are already good.
    if (missingOnly && recordings[key]) continue;

    process.stdout.write(`  ${lesson.id} [${i}] … `);

    const result = await run(step.command);
    recordings[key] = {
      command: step.command,
      output: result.output,
      exitCode: result.exitCode,
      ms: result.ms,
    };

    recorded++;
    if (result.exitCode !== 0) failed++;
    const flag = result.exitCode === 0 ? "ok" : `exit ${result.exitCode}`;
    console.log(`${flag}  (${result.ms}ms, ${result.output.split("\n").length} lines)`);
  }
}

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(
  OUT,
  JSON.stringify({ recordedAt: new Date().toISOString(), recordings }, null, 2) + "\n",
);

console.log(`\n${recorded} commands recorded (${failed} exited non-zero — expected for some steps)`);
console.log(`→ ${path.relative(ROOT, OUT)}`);
