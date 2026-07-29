import type { QuestEvent } from "@quest/contracts";
import { listReplicas, subscribeDockerEvents, dockerAvailable } from "@/lib/drivers/compose";
import { newReader, readSpans } from "@/lib/spans";

// teach: This route must run on the Node runtime, not Edge — it opens a unix
// socket and a raw TCP connection to Redis, neither of which Edge allows.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One event stream, three sources.
 *
 * Server-Sent Events rather than WebSockets: the traffic here is entirely
 * server→browser, SSE is plain HTTP (so proxies and load balancers pass it
 * through without special configuration), and the browser reconnects on its
 * own. WebSockets would buy bidirectional messaging we do not need, and cost
 * a protocol upgrade that infrastructure often mishandles.
 */
export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const abort = new AbortController();

  request.signal.addEventListener("abort", () => abort.abort());

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (event: QuestEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      abort.signal.addEventListener("abort", close);

      // 1. Snapshot first, so a browser joining late is never out of sync.
      if (dockerAvailable()) {
        try {
          send({ type: "snapshot", at: Date.now(), replicas: await listReplicas() });
        } catch (err) {
          send({
            type: "log",
            at: Date.now(),
            service: "dashboard",
            level: "error",
            message: `docker unavailable: ${(err as Error).message}`,
            replicaId: null,
          });
        }

        // 2. Live container lifecycle, pushed by the daemon.
        subscribeDockerEvents(send, abort.signal).catch((err) =>
          send({
            type: "log",
            at: Date.now(),
            service: "dashboard",
            level: "error",
            message: `docker events: ${err.message}`,
            replicaId: null,
          }),
        );
      } else {
        send({
          type: "log",
          at: Date.now(),
          service: "dashboard",
          level: "warn",
          message:
            "Docker socket not mounted — container lifecycle is hidden. Set QUEST_ALLOW_DOCKER_SOCKET=1.",
          replicaId: null,
        });
      }

      // 3. Trace spans, blocking-read from the Redis stream.
      const reader = newReader();
      let cursor = "$"; // "$" = only spans that arrive from now on.

      const pumpSpans = async () => {
        while (!closed && !abort.signal.aborted) {
          try {
            const batch = await readSpans(reader, cursor, 2_000);
            cursor = batch.cursor;
            for (const s of batch.spans) {
              send({
                type: "trace.span",
                at: s.at,
                service: s.to,
                traceId: s.traceId,
                from: s.from,
                to: s.to,
                ms: s.ms,
                status: s.status,
              });
            }
          } catch (err) {
            if (closed) break;
            await new Promise((r) => setTimeout(r, 1_000));
            void err;
          }
        }
        reader.disconnect();
      };
      void pumpSpans();

      // 4. Queue depth, polled from the worker (BullMQ has no push API).
      const pumpQueue = async () => {
        while (!closed && !abort.signal.aborted) {
          try {
            const res = await fetch(`${workerUrl()}/queue`, {
              signal: AbortSignal.timeout(2_000),
              cache: "no-store",
            });
            if (res.ok) {
              const q = await res.json();
              send({
                type: "queue.stats",
                at: Date.now(),
                service: "worker",
                depth: Number(q.waiting ?? 0),
                active: Number(q.active ?? 0),
                completed: Number(q.completed ?? 0),
                failed: Number(q.failed ?? 0),
              });
            }
          } catch {
            /* worker down; the fleet poll already reports that */
          }
          await new Promise((r) => setTimeout(r, 1_000));
        }
      };
      void pumpQueue();

      // teach: A comment line (":") every 15s. Idle connections get reaped by
      // proxies and load balancers after ~30-60s, and this keepalive is the
      // difference between a stream that lives for hours and one that silently
      // dies whenever the system is quiet — the worst possible failure mode
      // for a monitoring tool.
      const keepalive = setInterval(() => {
        if (closed) return clearInterval(keepalive);
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepalive);
        }
      }, 15_000);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      // teach: Disables nginx response buffering. Without it a proxy holds your
      // "live" events until its buffer fills, which looks exactly like a bug.
      "x-accel-buffering": "no",
    },
  });
}

function workerUrl(): string {
  return process.env.QUEST_IN_CONTAINER === "1"
    ? "http://worker:3001"
    : "http://localhost:3001";
}
