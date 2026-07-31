import { SPAN_STREAM, SPAN_STREAM_MAXLEN, type Span } from "@quest/contracts";
import { connect as netConnect, type Socket } from "node:net";
// teach: Read the environment at CALL time, not import time. `env` is the same
// teach: live object as process.env; copying values into module-level consts
// teach: would freeze whatever happened to be set when the bundle first loaded.
//
// A debugging story worth keeping: spans here once reported REDIS_URL=(unset)
// while the compose file plainly set it. The code was never the problem — a
// forgotten `npm run dev` on the host was answering :3000 instead of the
// container, with none of the fleet's environment. If config "isn't there" at
// runtime, first confirm which process is actually answering: `make doctor`
// checks for exactly this, and the README covers it under "Iterating on the
// dashboard alone".
import { env as runtimeEnv } from "node:process";

/**
 * Span collection on a Redis stream — without ioredis.
 *
 * Next standalone + Turbopack externalizes ioredis as a hashed package id and
 * has left the image with a broken or unreachable require path more than once.
 * Span write/read then silently no-ops and Request Path stays empty while util
 * happily XADDs with its own tiny RESP client.
 *
 * We only need XADD and XREAD BLOCK. The Redis wire protocol is simple enough
 * that a short client is more reliable here than a full dependency tree.
 */

function redisAddr(): { host: string; port: number } {
  const raw = runtimeEnv["REDIS_URL"] || "redis://redis:6379";
  const withoutScheme = raw.replace(/^rediss?:\/\//, "");
  const [hostPort] = withoutScheme.split("/");
  const [host, portStr] = (hostPort ?? "redis:6379").split(":");
  return {
    host: host || "redis",
    port: portStr ? Number(portStr) : 6379,
  };
}

/** Encode one Redis command as RESP. */
function encode(...args: string[]): string {
  let out = `*${args.length}\r\n`;
  for (const a of args) {
    out += `$${Buffer.byteLength(a)}\r\n${a}\r\n`;
  }
  return out;
}

/**
 * Read one RESP value from a buffer starting at offset.
 * Returns [value, nextOffset] or null if incomplete.
 */
function readResp(buf: Buffer, offset: number): [unknown, number] | null {
  if (offset >= buf.length) return null;
  const type = String.fromCharCode(buf[offset]!);
  const lineEnd = buf.indexOf("\r\n", offset);
  if (lineEnd < 0) return null;
  const line = buf.subarray(offset + 1, lineEnd).toString();
  const next = lineEnd + 2;

  switch (type) {
    case "+": // simple string
    case "-": // error (return as Error)
    case ":": // integer as string for simplicity
      return [type === "-" ? new Error(line) : line, next];
    case "$": {
      const len = Number(line);
      if (len < 0) return [null, next]; // null bulk
      if (next + len + 2 > buf.length) return null;
      const data = buf.subarray(next, next + len).toString();
      return [data, next + len + 2];
    }
    case "*": {
      const count = Number(line);
      if (count < 0) return [null, next];
      const items: unknown[] = [];
      let pos = next;
      for (let i = 0; i < count; i++) {
        const part = readResp(buf, pos);
        if (!part) return null;
        items.push(part[0]);
        pos = part[1];
      }
      return [items, pos];
    }
    default:
      return [new Error(`unknown RESP type ${type}`), next];
  }
}

class RespConn {
  private socket: Socket | null = null;
  private buf = Buffer.alloc(0);
  private waiters: Array<(err: Error | null, value?: unknown) => void> = [];
  private connecting: Promise<void> | null = null;

  async connect(): Promise<void> {
    if (this.socket && !this.socket.destroyed) return;
    if (this.connecting) return this.connecting;

    const { host, port } = redisAddr();
    const attempt = (async () => {
      await new Promise<void>((resolve, reject) => {
        // teach: "redis" is not a real hostname anywhere — it resolves because
        // teach: Docker's embedded DNS serves Compose service names on the
        // teach: project network. Kubernetes plays the same trick with Service
        // teach: names, which is why this code moves between the two unchanged.
        const sock = netConnect({ host, port, family: 4 }, () => {
          this.socket = sock;
          resolve();
        });
        sock.setNoDelay(true);
        sock.on("data", (chunk) => {
          this.buf = Buffer.concat([this.buf, chunk]);
          this.drain();
        });
        sock.on("error", (err) => {
          this.failAll(err);
          this.close();
          // A reject after the promise already settled is a no-op, so this is
          // safe for errors that arrive long after a successful connect.
          reject(err);
        });
        sock.on("close", () => {
          this.socket = null;
          if (this.waiters.length) {
            this.failAll(new Error("redis connection closed"));
          }
        });
      });
    })();

    // teach: Clear the in-flight marker when the attempt SETTLES — on failure
    // as well as success. Parking a rejected promise here would turn one
    // transient blip (Redis still booting, a container restarted in Chapter 4)
    // into a permanent outage: every later connect() would hand back that same
    // stale rejection without retrying, or even re-reading REDIS_URL, for the
    // life of the process. The writer below is a module-level singleton, so
    // that would take Request Path down until the dashboard was restarted.
    this.connecting = attempt;
    void attempt
      .catch(() => {}) // the caller already sees the real rejection
      .finally(() => {
        if (this.connecting === attempt) this.connecting = null;
      });

    return attempt;
  }

  private drain(): void {
    while (this.waiters.length) {
      const parsed = readResp(this.buf, 0);
      if (!parsed) return;
      const [value, next] = parsed;
      this.buf = this.buf.subarray(next);
      const waiter = this.waiters.shift()!;
      if (value instanceof Error) waiter(value);
      else waiter(null, value);
    }
  }

  private failAll(err: Error): void {
    const pending = this.waiters.splice(0);
    for (const w of pending) w(err);
  }

  close(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.buf = Buffer.alloc(0);
  }

  async command(...args: string[]): Promise<unknown> {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.waiters.push((err, value) => {
        if (err) reject(err);
        else resolve(value);
      });
      try {
        this.socket!.write(encode(...args), (writeErr) => {
          if (writeErr) {
            this.failAll(writeErr);
            this.close();
          }
        });
      } catch (err) {
        this.failAll(err as Error);
        this.close();
      }
    });
  }
}

let writer: RespConn | null = null;

function writerConn(): RespConn {
  if (!writer) writer = new RespConn();
  return writer;
}

/**
 * Persist one span. Awaits the XADD so callers (traffic generation) can surface
 * Redis failures instead of returning 200 with an empty graph.
 *
 * Prefer await in request handlers. Fire-and-forget is still safe for paths
 * that must not block: `void recordSpan(s).catch(...)`.
 */
export async function recordSpan(span: Span): Promise<void> {
  const args = [
    "XADD",
    SPAN_STREAM,
    "MAXLEN",
    "~",
    String(SPAN_STREAM_MAXLEN),
    "*",
    "traceId",
    span.traceId,
    "from",
    span.from,
    "to",
    span.to,
    "ms",
    String(span.ms),
    "status",
    String(span.status),
    "at",
    String(span.at),
  ];
  if (span.toHost) {
    args.push("toHost", span.toHost);
  }
  try {
    await writerConn().command(...args);
  } catch (err) {
    const addr = redisAddr();
    const detail = `[spans] drop host=${addr.host} port=${addr.port} REDIS_URL=${runtimeEnv["REDIS_URL"] ?? "(unset)"}: ${(err as Error).message}`;
    console.error(detail);
    throw new Error(detail);
  }
}

export interface SpanBatch {
  cursor: string;
  spans: Span[];
}

/**
 * Reads spans newer than `cursor`, blocking up to `blockMs` for new arrivals.
 * Uses its own connection because a blocked client cannot issue other commands.
 */
export async function readSpans(
  reader: RespConn,
  cursor: string,
  blockMs = 2_000,
): Promise<SpanBatch> {
  const res = (await reader.command(
    "XREAD",
    "BLOCK",
    String(blockMs),
    "STREAMS",
    SPAN_STREAM,
    cursor,
  )) as [string, [string, string[]][]][] | null;

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

/** Redis returns flat [field, value, field, value] arrays. */
function toObject(flat: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i + 1 < flat.length; i += 2) out[flat[i]!] = flat[i + 1]!;
  return out;
}

/** A dedicated connection for blocking reads. */
export function newReader(): RespConn {
  return new RespConn();
}
