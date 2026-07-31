/**
 * Lets plain `node` load the lesson files.
 *
 * The lessons import `@/lib/dashboardExperiments`, an alias Next resolves from
 * tsconfig. Node does not read tsconfig paths, so `node scripts/…` blew up with
 * ERR_MODULE_NOT_FOUND the moment a lesson file started importing it — which
 * broke both the recorder and the check that guards the demo build.
 *
 * Two small jobs: map `@/` onto apps/dashboard/src, and add the extension Node
 * insists on but TypeScript's import style omits.
 *
 * Import this for its side effect BEFORE loading the lessons, and load them
 * with a dynamic import: static imports are all resolved before any module
 * body runs, so a statically-imported hook would register too late to help.
 */

import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../apps/dashboard/src");

/** `@/lib/x` → `…/src/lib/x.ts`, `@/lessons` → `…/src/lessons/index.ts`. */
function resolveAlias(specifier) {
  const target = path.join(SRC, specifier.slice(2));
  for (const candidate of [target, `${target}.ts`, `${target}.tsx`, path.join(target, "index.ts")]) {
    if (existsSync(candidate) && !candidate.endsWith(path.sep)) {
      if (candidate === target && !path.extname(target)) continue; // a directory
      return pathToFileURL(candidate).href;
    }
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const url = resolveAlias(specifier);
      if (url) return { url, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

/** The one import every script here actually wants. */
export async function loadLessons() {
  const mod = await import(pathToFileURL(path.join(SRC, "lessons/index.ts")).href);
  return mod.LESSONS;
}
