import { ServiceMeta, ALL_SERVICES, type ServiceDef } from "@quest/contracts";

/**
 * Fleet polling.
 *
 * Runs server-side inside the dashboard container, which matters: it reaches
 * peers by their Compose/Kubernetes service name (`http://util:8080`), not via
 * localhost. Service discovery by DNS name is the thing that makes a container
 * network a network — and it is invisible until you look at code like this.
 */

export interface FleetEntry {
  def: ServiceDef;
  status: "up" | "down" | "unready";
  meta: ServiceMeta | null;
  latencyMs: number | null;
  error: string | null;
}

/** Inside a container we use DNS names; from a dev laptop, localhost + host port. */
function baseUrl(def: ServiceDef): string {
  const inContainer = process.env.QUEST_IN_CONTAINER === "1";
  return inContainer
    ? `http://${def.id}:${def.port}`
    : `http://localhost:${def.hostPort}`;
}

async function probeOne(def: ServiceDef): Promise<FleetEntry> {
  const t0 = performance.now();
  const base = baseUrl(def);

  try {
    const res = await fetch(`${base}/meta`, {
      signal: AbortSignal.timeout(2_500),
      cache: "no-store",
    });
    const latencyMs = Math.round(performance.now() - t0);

    if (!res.ok) {
      return { def, status: "down", meta: null, latencyMs, error: `HTTP ${res.status}` };
    }

    // Parsed against the shared schema rather than trusted. If the C service
    // ever emits malformed JSON, this is where it surfaces — loudly, in one
    // place, instead of as a blank field somewhere in the UI.
    const parsed = ServiceMeta.safeParse(await res.json());
    if (!parsed.success) {
      return {
        def,
        status: "down",
        meta: null,
        latencyMs,
        error: `contract violation: ${parsed.error.issues[0]?.path.join(".")}`,
      };
    }

    // Readiness is asked separately, because "running" and "ready for traffic"
    // are different questions — the distinction the chaos panel exists to teach.
    let status: FleetEntry["status"] = "up";
    try {
      const ready = await fetch(`${base}/readyz`, {
        signal: AbortSignal.timeout(2_000),
        cache: "no-store",
      });
      if (!ready.ok) status = "unready";
    } catch {
      status = "unready";
    }

    return { def, status, meta: parsed.data, latencyMs, error: null };
  } catch (err) {
    return {
      def,
      status: "down",
      meta: null,
      latencyMs: null,
      error: err instanceof Error ? err.message : "unreachable",
    };
  }
}

/**
 * Every service probed concurrently — one slow peer must not stall the page.
 *
 * The dashboard includes itself. It is a container like any other, and it can
 * be crashed and rescheduled like any other; mission control should not be the
 * one box on the diagram that pretends to stand outside the system.
 */
export async function pollFleet(): Promise<FleetEntry[]> {
  const targets = ALL_SERVICES.filter((s) => s.language !== "infra");
  return Promise.all(targets.map(probeOne));
}
