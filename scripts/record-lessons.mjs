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
 *   node scripts/record-lessons.mjs            # record everything
 *   node scripts/record-lessons.mjs --only ch0 # just one chapter
 *
 * Commands run in lesson order, because they build on each other's state.
 */

import { execFile } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LESSONS } from "../apps/dashboard/src/lessons/index.ts";

const exec = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "apps/dashboard/src/generated/recordings.json");

/** Long output is trimmed — nobody reads 400 lines in a replay pane. */
const MAX_LINES = 28;
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
async function run(command) {
  const started = Date.now();
  try {
    const { stdout, stderr } = await exec("/bin/zsh", ["-lic", command], {
      cwd: ROOT,
      timeout: TIMEOUT_MS,
      maxBuffer: 20 * 1024 * 1024,
      env: { ...process.env, PATH: `${process.env.HOME}/.orbstack/bin:${process.env.PATH}` },
    });
    return { output: trim([stdout, stderr].filter(Boolean).join("\n")), exitCode: 0, ms: Date.now() - started };
  } catch (err) {
    // A non-zero exit is often the POINT of the step — the C service has no
    // shell, Compose refuses to scale. Those failures are the lesson, so they
    // get recorded exactly like any other output.
    const combined = [err.stdout, err.stderr].filter(Boolean).join("\n") || String(err.message ?? err);
    return { output: trim(combined), exitCode: err.code ?? 1, ms: Date.now() - started };
  }
}

const onlyArg = process.argv.indexOf("--only");
const only = onlyArg > -1 ? process.argv[onlyArg + 1] : null;

// Merge onto whatever is already recorded, so `--only ch6` re-records one
// chapter instead of throwing the other six away.
let recordings = {};
if (only) {
  try {
    const { readFile } = await import("node:fs/promises");
    recordings = JSON.parse(await readFile(OUT, "utf8")).recordings ?? {};
    console.log(`Merging onto ${Object.keys(recordings).length} existing recordings.`);
  } catch {
    /* nothing recorded yet */
  }
}

let recorded = 0;
let failed = 0;

const targets = LESSONS.filter((l) => (only ? `ch${l.chapter}` === only : true));

console.log(`Recording ${targets.length} lessons against the live system…\n`);

for (const lesson of targets) {
  for (const [i, step] of lesson.steps.entries()) {
    if (!step.command) continue;

    const key = `${lesson.id}:${i}`;
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
