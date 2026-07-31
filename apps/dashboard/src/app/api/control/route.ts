import { NextResponse } from "next/server";
import nodeProcess from "node:process";
import { byId, newTraceId, TRACE_HEADER, type Span } from "@quest/contracts";
import {
  restart,
  scale,
  listReplicas,
  dockerAvailable,
  dockerReachable,
} from "@/lib/drivers/compose";
import { recordSpan } from "@/lib/spans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Every button in the Lab tab lands here.
 *
 * In Phase 4 the same actions are re-implemented against the Kubernetes API,
 * and the UI does not change at all — which is the point of the QuestDriver
 * seam. Diffing this file against its Kubernetes twin shows precisely what an
 * orchestrator gives you over a container runtime.
 */

function serviceUrl(id: string): string | null {
  const def = byId(id);
  if (!def) return null;
  return nodeProcess.env.QUEST_IN_CONTAINER === "1"
    ? `http://${def.id}:${def.port}`
    : `http://localhost:${def.hostPort}`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { action, service, value } = body as {
    action?: string;
    service?: string;
    value?: string | number;
  };

  try {
    switch (action) {
      case "chaos": {
        const url = serviceUrl(service ?? "");
        if (!url) return NextResponse.json({ error: "unknown service" }, { status: 400 });

        // The dashboard does not kill the container itself — it asks the
        // service to misbehave, and lets the supervisor react. That is the
        // honest simulation: real outages come from inside the process.
        const res = await fetch(`${url}/chaos`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: value ?? "crash", durationMs: 15_000 }),
          signal: AbortSignal.timeout(3_000),
        });
        if (!res.ok) {
          return NextResponse.json(
            { error: `${service ?? "service"} rejected ${String(value ?? "crash")} with HTTP ${res.status}` },
            { status: 502 },
          );
        }
        return NextResponse.json({ ok: true, status: res.status });
      }

      case "observe": {
        const id = service ?? "";
        const url = serviceUrl(id);
        if (!url) return NextResponse.json({ error: "unknown service" }, { status: 400 });

        const headers = { "x-quest-probe": "1" };
        const [metaRes, liveRes, readyRes] = await Promise.all([
          fetch(`${url}/meta`, { cache: "no-store", headers, signal: AbortSignal.timeout(2_500) }).catch(() => null),
          fetch(`${url}/healthz`, { cache: "no-store", headers, signal: AbortSignal.timeout(2_500) }).catch(() => null),
          fetch(`${url}/readyz`, { cache: "no-store", headers, signal: AbortSignal.timeout(2_500) }).catch(() => null),
        ]);
        const meta = metaRes?.ok ? await metaRes.json().catch(() => null) : null;
        const replicas = (await dockerReachable())
          ? await listReplicas().catch(() => [])
          : [];
        const replica = replicas.find((candidate) => candidate.service === id && candidate.phase !== "Gone");
        const liveness = liveRes?.status ?? 0;
        const readiness = readyRes?.status ?? 0;

        return NextResponse.json({
          service: id,
          identity: meta?.hostname ?? replica?.id ?? "unknown",
          uptimeSec: Number(meta?.uptimeSec ?? 0),
          restarts: Number(replica?.restarts ?? 0),
          liveness,
          readiness,
          status: liveness !== 200 ? "down" : readiness === 200 ? "ready" : "unready",
        });
      }

      case "restart": {
        if (!(await dockerReachable())) {
          return NextResponse.json(
            {
              error:
                "Docker control plane unreachable. Dashboard should use DOCKER_HOST=tcp://socket-proxy:2375 (Compose) or a local socket for npm run dev.",
            },
            { status: 503 },
          );
        }
        await restart(service ?? "");
        return NextResponse.json({ ok: true, action: "restart", service: service ?? "" });
      }

      case "scale": {
        // Always errors in Compose by design — return a clear capability message.
        await scale(service ?? "", Number(value ?? 1));
        return NextResponse.json({ ok: true });
      }

      case "enqueue": {
        const url = serviceUrl("worker");
        // sleep jobs stay visible on the Lab counters; hash drains too fast to teach.
        const res = await fetch(`${url}/enqueue`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            count: Number(value ?? 200),
            kind: "sleep",
            // Slow enough that Lab's big WAITING number stays up for ~15–20s
            // with default worker concurrency 2.
            ms: 400,
          }),
          signal: AbortSignal.timeout(10_000),
        });
        return NextResponse.json(await res.json(), { status: res.status });
      }

      case "capabilities": {
        const questMode = nodeProcess.env.QUEST_MODE ?? "compose";
        const docker = await dockerReachable();
        return NextResponse.json({
          mode: questMode,
          docker,
          dockerConfigured: docker || dockerAvailable(),
          // Live Kubernetes control is not implemented yet. Do not advertise an
          // environment label as if it were an operational driver.
          scale: false,
          rollout: false,
          restart: docker,
          chaos: true,
          enqueue: true,
          traffic: true,
        });
      }

      case "traffic":
        return NextResponse.json(await generateTraffic(Number(value ?? 6)));

      default:
        return NextResponse.json({ error: `unknown action "${action}"` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/**
 * Fires real multi-hop requests so the topology has genuine traffic to draw.
 *
 * Each call gets a fresh trace id. The dashboard records its own span for
 * dashboard→util, then util (having received the header) records its spans for
 * util→ai and util→compute. One request in, three spans out, and the graph
 * draws itself from what actually happened rather than from a hardcoded list
 * of edges.
 */
async function generateTraffic(count: number): Promise<{
  traces: number;
  spans: number;
  hops: Array<{ from: string; to: string; ms: number; status: number }>;
}> {
  const utilUrl = serviceUrl("util");
  const hops: Array<{ from: string; to: string; ms: number; status: number }> = [];

  const runs = Array.from({ length: Math.min(count, 40) }, async () => {
    const traceId = newTraceId();

    // Hop 1: dashboard → util. /aggregate makes util fan out to ai + compute.
    const t0 = Date.now();
    try {
      const res = await fetch(`${utilUrl}/aggregate`, {
        headers: { [TRACE_HEADER]: traceId },
        signal: AbortSignal.timeout(6_000),
        cache: "no-store",
      });
      const s = span(traceId, "dashboard", "util", t0, res.status);
      recordSpan(s);
      hops.push({ from: s.from, to: s.to, ms: s.ms, status: s.status });
    } catch {
      const s = span(traceId, "dashboard", "util", t0, 0);
      recordSpan(s);
      hops.push({ from: s.from, to: s.to, ms: s.ms, status: s.status });
    }
  });

  await Promise.all(runs);
  return { traces: runs.length, spans: hops.length, hops: hops.slice(0, 24) };
}

function span(traceId: string, from: string, to: string, started: number, status: number): Span {
  return { traceId, from, to, ms: Date.now() - started, status, at: Date.now() };
}
