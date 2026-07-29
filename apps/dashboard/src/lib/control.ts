"use client";

import { ALL_SERVICES, type ChaosAction } from "@quest/contracts";
import type { Replica } from "@quest/contracts";
import type { FleetEntry } from "./fleet";

export type Mode = "live" | "demo";

/**
 * One control surface, two backends.
 *
 * In live mode a button POSTs to /api/control, which reaches Docker and the
 * services. In demo mode the same button calls the in-browser simulator. The
 * component firing it does not know which — so the public demo is genuinely
 * the same UI, not a stripped-down imitation of it.
 */
export async function control(
  mode: Mode,
  action: string,
  service?: string,
  value?: string | number,
): Promise<Record<string, unknown>> {
  if (mode === "demo") {
    const { getSimDriver } = await import("./drivers/sim");
    const sim = getSimDriver();

    switch (action) {
      case "chaos":
        await sim.chaos(service ?? "util", (value as ChaosAction) ?? "crash");
        return { ok: true };
      case "restart":
        await sim.restart(service ?? "util");
        return { ok: true };
      case "scale":
        await sim.scale(service ?? "util", Number(value ?? 3));
        return { ok: true };
      case "rollout":
        void sim.rollout(service ?? "util", String(value ?? "1.1.0"));
        return { ok: true };
      case "enqueue":
        await sim.enqueue(Number(value ?? 200));
        return { ok: true, enqueued: Number(value ?? 200) };
      case "traffic":
        await sim.traffic(Number(value ?? 8));
        return { traces: Number(value ?? 8), spans: Number(value ?? 8) * 3 };
      default:
        throw new Error(`unknown action "${action}"`);
    }
  }

  const res = await fetch("/api/control", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, service, value }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body.error as string) ?? `HTTP ${res.status}`);
  return body;
}

/**
 * In demo mode there is no /api/fleet to poll, so the service cards are
 * derived from the simulator's replica list. Same FleetEntry shape, same
 * components, no branching in the UI.
 */
export function fleetFromReplicas(replicas: Replica[]): FleetEntry[] {
  const defs = ALL_SERVICES.filter((s) => s.language !== "infra");

  return defs.map((def) => {
    const own = replicas.filter((r) => r.service === def.id && r.phase !== "Gone");
    const ready = own.find((r) => r.phase === "Ready");
    const any = ready ?? own[0];

    const status: FleetEntry["status"] = ready
      ? "up"
      : own.some((r) => r.phase === "Unready")
        ? "unready"
        : own.length > 0
          ? "unready"
          : "down";

    if (!any) {
      return { def, status: "down", meta: null, latencyMs: null, error: "no replicas" };
    }

    return {
      def,
      status,
      latencyMs: Math.round(2 + Math.random() * 12),
      error: null,
      meta: {
        service: def.id,
        language: def.language as "typescript" | "python" | "go" | "c",
        version: any.version,
        gitSha: "demo",
        buildTime: "demo",
        // In the simulator this models Kubernetes, where the container
        // hostname equals the pod name.
        hostname: any.id,
        podName: any.id,
        nodeName: any.node,
        namespace: "container-quest",
        uptimeSec: Math.max(0, Math.floor((Date.now() - any.startedAt) / 1000)),
        requests: Math.floor((Date.now() - any.startedAt) / 800),
        pid: 1,
      },
    };
  });
}
