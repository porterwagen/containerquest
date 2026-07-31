/**
 * Fails the build if the recordings and the lessons have drifted apart.
 *
 * The hosted demo replays recordings instead of running commands, and a step
 * with a command but no recording is not a degraded experience: it is a dead
 * end. The UI has no run button and no completion button for it, so the lesson
 * can never be finished. That happened, silently, because lesson content was
 * edited after the last recording pass and nothing checked.
 *
 * Vercel cannot re-record (no Docker in the build), so the committed JSON is
 * the whole source of truth for the public site. This script is what makes a
 * forgotten `make record` a build failure instead of a broken page.
 *
 *   node scripts/check-recordings.mjs
 *
 * Three ways to drift, all caught here:
 *   missing  - a step gained a command, or a step was inserted and shifted keys
 *   stale    - a command literal was edited but the recording still has the old
 *   orphan   - a step lost its command or was deleted, leaving a dead key
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadLessons } from "./lessons-loader.mjs";

const LESSONS = await loadLessons();

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "apps/dashboard/src/generated/recordings.json");

let recordings;
try {
  recordings = JSON.parse(await readFile(FILE, "utf8")).recordings ?? {};
} catch (err) {
  console.error(`Could not read ${path.relative(ROOT, FILE)}: ${err.message}`);
  process.exit(1);
}

const missing = [];
const stale = [];
const expected = new Set();

for (const lesson of LESSONS) {
  lesson.steps.forEach((step, i) => {
    if (!step.command) return;
    const key = `${lesson.id}:${i}`;
    expected.add(key);

    const rec = recordings[key];
    if (!rec) {
      missing.push(key);
    } else if (rec.command !== step.command) {
      stale.push(key);
    }
  });
}

const orphans = Object.keys(recordings).filter((k) => !expected.has(k));

const report = (label, keys, explain) => {
  if (keys.length === 0) return;
  console.error(`\n${label} (${keys.length}):`);
  for (const k of keys) console.error(`  ${k}`);
  console.error(`  → ${explain}`);
};

report(
  "MISSING recordings",
  missing,
  "these lessons cannot be completed in demo mode. Run: node scripts/record-lessons.mjs --missing",
);
report(
  "STALE recordings",
  stale,
  "the command changed but the recording did not. Re-record those lessons with --only <lessonId>.",
);
report(
  "ORPHAN recordings",
  orphans,
  "no step maps to these any more. Safe to leave, but they are dead weight in the bundle.",
);

if (missing.length > 0 || stale.length > 0) {
  console.error(
    `\nFAIL: ${missing.length} missing, ${stale.length} stale, ${orphans.length} orphan.`,
  );
  process.exit(1);
}

console.log(
  `Recordings OK: ${expected.size} command steps, all recorded and current` +
    (orphans.length > 0 ? ` (${orphans.length} orphan keys, harmless).` : "."),
);
