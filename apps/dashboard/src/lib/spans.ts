import { Redis } from "ioredis";
import { SPAN_STREAM, SPAN_STREAM_MAXLEN, type Span } from "@quest/contracts";

/**
 * Span collection, on a Redis stream.
 *
 * A stream is an append-only log with a cursor per reader — the right shape
 * for telemetry. A plain pub/sub channel would drop everything published while
 * no browser was connected; a list would need someone to pop from it. With a
 * stream, each reader keeps its own position and slow readers cannot lose data
 * that fast ones already consumed.
 */

let writer: Redis | null = null;

/**
 * One lazily-created connection, reused. Reconnects are ioredis's problem.
 *
 * The error handler is attached INSIDE the initialization, not after it.
 * Attaching it on every call added a listener per span and tripped Node's
 * MaxListenersExceededWarning — which is not a spurious warning here, it was
 * a genuine leak that grew for as long as the process ran.
 */
function client(): Redis {
  if (!writer) {
    writer = new Redis(process.env.REDIS_URL || "redis://redis:6379", {
      maxRetriesPerRequest: 2,
      lazyConnect: false,
      // Without this a Redis outage floods the log with reconnect noise.
      retryStrategy: (times) => Math.min(times * 200, 3_000),
    });
    writer.on("error", (err) => console.error("[spans] redis:", err.message));
  }
  return writer;
}

/**
 * Fire-and-forget. Telemetry must never fail or slow the request it describes:
 * a tracing backend having a bad day should cost you visibility, not uptime.
 */
export function recordSpan(span: Span): void {
  const c = client();
  c.xadd(
    SPAN_STREAM,
    "MAXLEN",
    "~",
    String(SPAN_STREAM_MAXLEN),
    "*",
    "traceId", span.traceId,
    "from", span.from,
    "to", span.to,
    "ms", String(span.ms),
    "status", String(span.status),
    "at", String(span.at),
    ...(span.toHost ? ["toHost", span.toHost] : []),
  ).catch((err) => console.error("[spans] drop:", err.message));
}

/** Redis returns flat [field, value, field, value] arrays. */
function toObject(flat: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i + 1 < flat.length; i += 2) out[flat[i]!] = flat[i + 1]!;
  return out;
}

export interface SpanBatch {
  cursor: string;
  spans: Span[];
}

/**
 * Reads spans newer than `cursor`, blocking up to `blockMs` for new arrivals.
 *
 * Blocking rather than polling matters: the server holds the connection open
 * and Redis pushes the moment a span lands, so latency is milliseconds instead
 * of a poll interval. Uses its own connection because a blocked client cannot
 * issue other commands.
 */
export async function readSpans(
  reader: Redis,
  cursor: string,
  blockMs = 2_000,
): Promise<SpanBatch> {
  const res = (await reader.xread("BLOCK", blockMs, "STREAMS", SPAN_STREAM, cursor)) as
    | [string, [string, string[]][]][]
    | null;

  if (!res || res.length === 0) return { cursor, spans: [] };

  const entries = res[0]![1];
  const spans: Span[] = [];
  let next = cursor;

  for (const [id, flat] of entries) {
    next = id;
    const f = toObject(flat);
    if (!f.traceId || !f.from || !f.to) continue;
    spans.push({
      traceId: f.traceId,
      from: f.from,
      to: f.to,
      ms: Number(f.ms ?? 0),
      status: Number(f.status ?? 0),
      at: Number(f.at ?? Date.now()),
      ...(f.toHost ? { toHost: f.toHost } : {}),
    });
  }

  return { cursor: next, spans };
}

/** A dedicated connection for blocking reads. */
export function newReader(): Redis {
  const r = new Redis(process.env.REDIS_URL || "redis://redis:6379", {
    maxRetriesPerRequest: null,
  });
  r.on("error", (err) => console.error("[spans] reader:", err.message));
  return r;
}
