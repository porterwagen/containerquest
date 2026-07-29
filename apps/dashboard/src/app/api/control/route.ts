import { NextResponse } from "next/server";
import { byId, newTraceId, TRACE_HEADER, type Span } from "@quest/contracts";
import { restart, scale, dockerAvailable } from "@/lib/drivers/compose";
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
  return process.env.QUEST_IN_CONTAINER === "1"
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
        return NextResponse.json({ ok: true, status: res.status });
      }

      case "restart": {
        if (!dockerAvailable()) {
          return NextResponse.json(
            { error: "Docker socket not mounted. Set QUEST_ALLOW_DOCKER_SOCKET=1." },
            { status: 503 },
          );
        }
        await restart(service ?? "");
        return NextResponse.json({ ok: true });
      }

      case "scale": {
        await scale(service ?? "", Number(value ?? 1));
        return NextResponse.json({ ok: true });
      }

      case "enqueue": {
        const url = serviceUrl("worker");
        const res = await fetch(`${url}/enqueue`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ count: Number(value ?? 200), kind: "hash" }),
          signal: AbortSignal.timeout(5_000),
        });
        return NextResponse.json(await res.json(), { status: res.status });
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
async function generateTraffic(count: number): Promise<{ traces: number; spans: number }> {
  const utilUrl = serviceUrl("util");
  const computeUrl = serviceUrl("compute");
  let spans = 0;

  const runs = Array.from({ length: Math.min(count, 40) }, async () => {
    const traceId = newTraceId();

    // Hop 1: dashboard → util. /aggregate makes util fan out to ai + compute,
    // and those two spans are recorded by util itself.
    const t0 = Date.now();
    try {
      const res = await fetch(`${utilUrl}/aggregate`, {
        headers: { [TRACE_HEADER]: traceId },
        signal: AbortSignal.timeout(6_000),
        cache: "no-store",
      });
      recordSpan(span(traceId, "dashboard", "util", t0, res.status));
      spans++;
    } catch {
      recordSpan(span(traceId, "dashboard", "util", t0, 0));
      spans++;
    }

    // Hop 2: dashboard → compute directly, so the C service shows a direct
    // edge as well as the one it gets via util.
    const t1 = Date.now();
    try {
      const res = await fetch(`${computeUrl}/mandelbrot`, {
        headers: { [TRACE_HEADER]: traceId },
        signal: AbortSignal.timeout(6_000),
        cache: "no-store",
      });
      recordSpan(span(traceId, "dashboard", "compute", t1, res.status));
      spans++;
    } catch {
      recordSpan(span(traceId, "dashboard", "compute", t1, 0));
      spans++;
    }
  });

  await Promise.all(runs);
  return { traces: runs.length, spans };
}

function span(traceId: string, from: string, to: string, started: number, status: number): Span {
  return { traceId, from, to, ms: Date.now() - started, status, at: Date.now() };
}
