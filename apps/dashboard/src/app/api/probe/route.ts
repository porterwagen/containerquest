import { NextResponse } from "next/server";
import { pollFleet } from "@/lib/fleet";
import { listReplicas, dockerAvailable } from "@/lib/drivers/compose";
import type { ProbeMap } from "@/lessons/types";

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
    };
  }

  return NextResponse.json(
    { at: Date.now(), probes },
    { headers: { "cache-control": "no-store" } },
  );
}
