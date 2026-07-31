/**
 * Container Quest — worker service.
 *
 * Node and TypeScript, but with no HTTP framework and no build step: Node 24
 * strips types natively, so this .ts file runs directly. It is the only
 * service that is not primarily a server — its real job is pulling jobs off
 * a Redis queue.
 *
 * This is the service that makes scaling legible. Queue depth is a number you
 * can watch, and doubling the replica count visibly halves the drain time,
 * which is far more convincing than any diagram of a load balancer.
 */

import http from "node:http";
import os from "node:os";
import process from "node:process";

import { Queue, Worker, type Job } from "bullmq";
import { Redis } from "ioredis";
import pg from "pg";

import { QUEUE_NAME, type JobPayload } from "./jobs.ts";

const PORT = Number(process.env.PORT ?? 3001);
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 4);
const start = Date.now();

let requests = 0;
let unreadyUntil = 0;
let slowUntil = 0;
const stats = { completed: 0, failed: 0, active: 0 };

const env = (key: string, fallback: string) => process.env[key] || fallback;
/** Absent under Docker, populated by the Downward API under Kubernetes. */
const nullable = (key: string) => process.env[key] || null;

// maxRetriesPerRequest must be null for BullMQ's blocking commands: the
// default retry limit makes long-lived blocking reads throw spuriously.
const connection = new Redis(env("REDIS_URL", "redis://redis:6379"), {
  maxRetriesPerRequest: null,
});
connection.on("error", (err: Error) => console.error("[worker] redis:", err.message));

const pool = new pg.Pool({
  connectionString: env("DATABASE_URL", "postgres://quest:quest@postgres:5432/quest"),
  max: 4,
  // Fail fast rather than hanging a readiness probe for the default 30s.
  connectionTimeoutMillis: 3_000,
});
pool.on("error", (err) => console.error("[worker] postgres:", err.message));

const queue = new Queue(QUEUE_NAME, { connection });

/** Jobs land in Postgres so completed work survives a worker restart. */
async function ensureSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS job_results (
      id          BIGSERIAL PRIMARY KEY,
      job_id      TEXT NOT NULL,
      kind        TEXT NOT NULL,
      result      JSONB NOT NULL,
      worker_host TEXT NOT NULL,
      ms          INTEGER NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

const worker = new Worker<JobPayload>(
  QUEUE_NAME,
  async (job: Job<JobPayload>) => {
    const t0 = Date.now();
    stats.active++;
    try {
      const result = await runJob(job.data);
      const ms = Date.now() - t0;

      await pool.query(
        `INSERT INTO job_results (job_id, kind, result, worker_host, ms)
         VALUES ($1, $2, $3, $4, $5)`,
        [job.id ?? "?", job.data.kind, JSON.stringify(result), os.hostname(), ms],
      );

      stats.completed++;
      // Logging the hostname is the point: with replicas scaled up you can
      // watch jobs land on different containers.
      console.log(`[worker] ${job.data.kind} job=${job.id} ${ms}ms host=${os.hostname()}`);
      return result;
    } catch (err) {
      stats.failed++;
      throw err;
    } finally {
      stats.active--;
    }
  },
  { connection, concurrency: CONCURRENCY },
);

worker.on("failed", (job, err) => console.error(`[worker] job ${job?.id} failed: ${err.message}`));

async function runJob(payload: JobPayload): Promise<unknown> {
  switch (payload.kind) {
    case "hash": {
      const { createHash } = await import("node:crypto");
      let digest = payload.input;
      for (let i = 0; i < payload.rounds; i++) {
        digest = createHash("sha256").update(digest).digest("hex");
      }
      return { digest };
    }
    case "embed": {
      const res = await fetch(`${env("AI_URL", "http://ai:8000")}/embed`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: payload.input, dims: 16 }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) throw new Error(`ai service returned ${res.status}`);
      return await res.json();
    }
    case "sleep": {
      await new Promise((r) => setTimeout(r, payload.ms));
      return { slept: payload.ms };
    }
  }
}

// --- The service contract, on plain node:http (no framework needed) ---------

const json = (res: http.ServerResponse, status: number, body: unknown) => {
  const text = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(text) });
  res.end(text);
};

const readBody = (req: http.IncomingMessage): Promise<string> =>
  new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
  });

const server = http.createServer(async (req, res) => {
  // Excluded: the dashboard's own polling, which would otherwise make this
  // counter a measure of the monitoring rather than of real traffic.
  if (!req.headers["x-quest-probe"]) requests++;
  if (Date.now() < slowUntil) await new Promise((r) => setTimeout(r, 2_000));

  const path = (req.url ?? "/").split("?")[0];

  // Liveness: the event loop is turning. Deliberately checks nothing else —
  // if Redis is down, restarting this process does not bring Redis back.
  if (path === "/healthz") return json(res, 200, { ok: true, checks: {} });

  // Readiness: can I actually do my job? Here the dependencies matter, because
  // a worker that cannot reach Redis should not be counted as available.
  if (path === "/readyz") {
    if (Date.now() < unreadyUntil) {
      return json(res, 503, { ok: false, checks: { self: false }, detail: "chaos: unready" });
    }
    const checks = {
      redis: await connection.ping().then(() => true).catch(() => false),
      postgres: await pool.query("SELECT 1").then(() => true).catch(() => false),
    };
    const ok = Object.values(checks).every(Boolean);
    return json(res, ok ? 200 : 503, { ok, checks });
  }

  if (path === "/meta") {
    return json(res, 200, {
      service: "worker",
      language: "typescript",
      version: env("SERVICE_VERSION", "1.0.0"),
      gitSha: env("GIT_SHA", "dev"),
      buildTime: env("BUILD_TIME", "unknown"),
      hostname: os.hostname(),
      podName: nullable("POD_NAME"),
      nodeName: nullable("NODE_NAME"),
      namespace: nullable("POD_NAMESPACE"),
      uptimeSec: Math.floor((Date.now() - start) / 1000),
      requests,
      pid: process.pid,
    });
  }

  if (path === "/queue") {
    const counts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
    return json(res, 200, { ...counts, concurrency: CONCURRENCY, host: os.hostname(), ...stats });
  }

  if (path === "/enqueue" && req.method === "POST") {
    const body = await readBody(req);
    const parsed = body ? JSON.parse(body) : {};
    const count = Math.min(Number(parsed.count ?? 10), 5_000);
    const kind = (parsed.kind ?? "hash") as JobPayload["kind"];
    // sleep: wall-clock wait so Lab "Queue 200" stays visible on counters.
    // hash: CPU work (~30-40ms at 60k rounds) for scaling demos.
    const ms = Number(parsed.ms ?? 200);
    const rounds = Number(parsed.rounds ?? 60_000);
    const jobs = Array.from({ length: count }, (_, i) => {
      const input = `payload-${Date.now()}-${i}`;
      if (kind === "sleep") {
        return { name: "sleep", data: { kind: "sleep" as const, ms, input } };
      }
      if (kind === "embed") {
        return { name: "embed", data: { kind: "embed" as const, input } };
      }
      return {
        name: "hash",
        data: { kind: "hash" as const, input, rounds, ms },
      };
    });
    await queue.addBulk(jobs);
    return json(res, 200, { ok: true, enqueued: jobs.length, kind, ms: kind === "sleep" ? ms : undefined });
  }

  if (path === "/chaos" && req.method === "POST") {
    const body = await readBody(req);
    const { action, durationMs = 15_000 } = body ? JSON.parse(body) : {};
    const deadline = Date.now() + durationMs;

    if (action === "crash") {
      json(res, 200, { ok: true, action: "crash" });
      console.error("[worker] chaos: crash requested, exiting 1");
      // process.exit skips graceful shutdown on purpose — a real crash.
      setTimeout(() => process.exit(1), 50);
      return;
    }
    if (action === "unready") unreadyUntil = deadline;
    if (action === "slow") slowUntil = deadline;
    if (action === "hang") (unreadyUntil = deadline), (slowUntil = deadline);
    return json(res, 200, { ok: true, action });
  }

  json(res, 404, { error: "not found" });
});

/**
 * SIGTERM is how every supervisor asks a process to stop — `docker stop` and
 * Kubernetes pod deletion both send it, then wait ~30s before SIGKILL.
 * Draining in-flight jobs here is the difference between a clean deploy and
 * a batch of half-finished work.
 */
async function shutdown(signal: string): Promise<void> {
  console.log(`[worker] ${signal} received, draining...`);
  server.close();
  await worker.close();
  await pool.end().catch(() => {});
  await connection.quit().catch(() => {});
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

ensureSchema().catch((err) => console.error("[worker] schema init failed:", err.message));

server.listen(PORT, () => {
  console.log(`[worker] listening on :${PORT} pid=${process.pid} concurrency=${CONCURRENCY}`);
});
