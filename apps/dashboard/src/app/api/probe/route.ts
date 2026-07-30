import { NextResponse } from "next/server";
import { pollFleet } from "@/lib/fleet";
import { containerRunning, listReplicas, dockerAvailable } from "@/lib/drivers/compose";
import { LESSONS } from "@/lessons";
import type { ProbeMap } from "@/lessons/types";

/**
 * Container names the course asks about by name rather than by service id.
 *
 * Read out of the lessons instead of hardcoded, so adding a `running` check to
 * a lesson is the only edit needed. A list maintained by hand here would drift
 * the first time someone renamed a container in a lesson and forgot this file.
 */
const NAMED_CONTAINERS = [
  ...new Set(
    LESSONS.flatMap((l) => l.steps)
      .map((s) => s.check)
      .filter((c) => c.kind === "running")
      .map((c) => c.container),
  ),
];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The counters the course checks its work against.
 *
 * This is what makes a lesson step honest: we do not ask whether you clicked
 * "next", we look at whether the service you were told to poke actually
 * changed. Request counts, uptime, and restart counts are all reported by the
 * services themselves, so a step only completes if something really happened.
 */
export async function GET() {
  const fleet = await pollFleet();

  // Restart counts come from the container runtime, not the service — a
  // process cannot count its own restarts, since it wasn't alive for them.
  const restarts = new Map<string, number>();
  if (dockerAvailable()) {
    try {
      for (const r of await listReplicas()) {
        restarts.set(r.service, Math.max(restarts.get(r.service) ?? 0, r.restarts));
      }
    } catch {
      /* runtime unreachable; restart-based checks simply won't pass */
    }
  }

  const probes: ProbeMap = {};
  for (const entry of fleet) {
    probes[entry.def.id] = {
      requests: entry.meta?.requests ?? 0,
      uptimeSec: entry.meta?.uptimeSec ?? 0,
      restarts: restarts.get(entry.def.id) ?? 0,
      ready: entry.status === "up",
      up: entry.status !== "down",
      hostname: entry.meta?.hostname ?? "",
    };
  }

  // Primer containers are checked purely for existence. They report no /meta,
  // so every other field is a zero: the only honest signal here is `up`.
  if (dockerAvailable()) {
    await Promise.all(
      NAMED_CONTAINERS.map(async (name) => {
        try {
          const up = await containerRunning(name);
          probes[name] = {
            requests: 0,
            uptimeSec: 0,
            restarts: 0,
            ready: up,
            up,
            hostname: "",
          };
        } catch {
          /* runtime unreachable; running-based checks simply won't pass */
        }
      }),
    );
  }

  return NextResponse.json(
    { at: Date.now(), probes },
    { headers: { "cache-control": "no-store" } },
  );
}
