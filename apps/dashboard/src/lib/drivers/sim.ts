"use client";

import type { QuestEvent, Replica, ChaosAction } from "@quest/contracts";
import { newTraceId } from "@quest/contracts";

/**
 * SimDriver — the whole platform, modeled in the browser.
 *
 * This is what makes Container Quest shareable. It emits the exact same
 * QuestEvent stream as the real Docker and Kubernetes drivers, so the public
 * demo runs the actual dashboard rather than a video of it. Someone with no
 * Docker, no cluster, and no patience can open a link and crash a pod.
 *
 * It deliberately models KUBERNETES semantics, not Docker: pods with generated
 * names, scheduling across nodes, rolling updates with surge bounds. That is
 * the destination this project is heading toward, and it means the simulator
 * is a specification for the K8sDriver rather than an afterthought.
 *
 * Everything here is an honest model of mechanism, not a recording. Kill a pod
 * and a replacement really is scheduled by the same code path that handles a
 * scale-up.
 */

const NODES = ["node-a", "node-b", "node-c"];

/** How long a caller waits before giving up on a hung callee. */
const CALLER_TIMEOUT_MS = 3_000;

interface SimService {
  id: string;
  desired: number;
  version: string;
  baseLatency: number;
  calls: string[];
}

const SERVICES: SimService[] = [
  { id: "dashboard", desired: 1, version: "1.0.0", baseLatency: 4, calls: ["util", "compute", "worker", "ai"] },
  { id: "util", desired: 2, version: "1.0.0", baseLatency: 6, calls: ["ai", "compute"] },
  { id: "worker", desired: 2, version: "1.0.0", baseLatency: 9, calls: ["ai"] },
  { id: "ai", desired: 2, version: "1.0.0", baseLatency: 42, calls: [] },
  { id: "compute", desired: 1, version: "1.0.0", baseLatency: 2, calls: [] },
];

let seq = 0;
const rid = () => Math.random().toString(36).slice(2, 7);

function makeReplica(service: string, version: string): Replica {
  return {
    // Kubernetes pod naming: <deployment>-<replicaset hash>-<pod hash>.
    id: `${service}-${(7000 + seq++).toString(36)}-${rid()}`,
    service,
    version,
    phase: "Pending",
    restarts: 0,
    node: NODES[Math.floor(Math.random() * NODES.length)]!,
    startedAt: Date.now(),
    cpuPct: 4 + Math.random() * 8,
    memMb: 40 + Math.random() * 60,
  };
}

export class SimDriver {
  readonly mode = "sim" as const;

  private listeners = new Set<(e: QuestEvent) => void>();
  private replicas: Replica[] = [];
  private services = SERVICES.map((s) => ({ ...s }));
  private timers: ReturnType<typeof setInterval>[] = [];

  private unreadyUntil = new Map<string, number>();
  private slowUntil = new Map<string, number>();
  // A hung service is NOT a slow one. It never answers at all, while the
  // process stays alive and the replica keeps reporting Ready. That gap is the
  // entire reason liveness probes exist, so the simulator has to model it
  // separately rather than folding it into added latency.
  private hungUntil = new Map<string, number>();
  private queue = { depth: 0, active: 0, completed: 0, failed: 0 };

  constructor() {
    for (const svc of this.services) {
      for (let i = 0; i < svc.desired; i++) {
        this.replicas.push({ ...makeReplica(svc.id, svc.version), phase: "Ready" });
      }
    }
  }

  subscribe(cb: (e: QuestEvent) => void): () => void {
    this.listeners.add(cb);

    // Snapshot immediately, exactly like the SSE route does.
    cb({ type: "snapshot", at: Date.now(), replicas: [...this.replicas] });

    if (this.timers.length === 0) this.start();

    return () => {
      this.listeners.delete(cb);
      if (this.listeners.size === 0) this.dispose();
    };
  }

  private emit(e: QuestEvent): void {
    for (const cb of this.listeners) cb(e);
  }

  private start(): void {
    // Pod lifecycle: Pending → Starting → Ready, on realistic delays.
    this.timers.push(
      setInterval(() => {
        const now = Date.now();
        for (const r of this.replicas) {
          const age = now - r.startedAt;
          if (r.phase === "Pending" && age > 600) this.setPhase(r, "Starting");
          else if (r.phase === "Starting" && age > 2_000) this.setPhase(r, "Ready");

          const until = this.unreadyUntil.get(r.id);
          if (until && now > until) {
            this.unreadyUntil.delete(r.id);
            if (r.phase === "Unready") this.setPhase(r, "Ready");
          }

          // Gentle resource drift, so the meters look alive rather than frozen.
          if (r.phase === "Ready") {
            r.cpuPct = clamp(r.cpuPct + (Math.random() - 0.5) * 6, 2, 95);
            r.memMb = clamp(r.memMb + (Math.random() - 0.5) * 8, 30, 512);
          }
        }
      }, 400),
    );

    // Ambient traffic, so the topology is never dead on arrival.
    this.timers.push(
      setInterval(() => {
        this.fireTrace();
      }, 700),
    );

    // Queue drains proportionally to ready workers — the scaling lesson.
    this.timers.push(
      setInterval(() => {
        const workers = this.readyCount("worker");
        const drained = Math.min(this.queue.depth, workers * 4);
        this.queue.depth -= drained;
        this.queue.completed += drained;
        this.queue.active = Math.min(this.queue.depth, workers * 4);
        this.emit({
          type: "queue.stats",
          at: Date.now(),
          service: "worker",
          ...this.queue,
        });
      }, 1_000),
    );
  }

  private readyCount(service: string): number {
    return this.replicas.filter((r) => r.service === service && r.phase === "Ready").length;
  }

  private setPhase(r: Replica, phase: Replica["phase"]): void {
    r.phase = phase;
    this.emit({ type: "replica.phase", at: Date.now(), service: r.service, id: r.id, phase });
  }

  /** One synthetic request that fans out exactly like the real one does. */
  private fireTrace(): void {
    const traceId = newTraceId();
    const at = Date.now();
    const now = Date.now();

    const hop = (from: string, to: string, delay: number) => {
      const svc = this.services.find((s) => s.id === to);
      if (!svc) return;
      const down = this.readyCount(to) === 0;
      const slow = (this.slowUntil.get(to) ?? 0) > now;
      const hung = (this.hungUntil.get(to) ?? 0) > now;

      // A hung call does not come back. What the caller eventually records is
      // its own timeout: a failed span, after waiting the full budget. The
      // callee is still "up" the whole time, which is exactly what makes this
      // failure mode so hard to see without a probe.
      const ms = hung
        ? CALLER_TIMEOUT_MS
        : Math.round(svc.baseLatency * (0.6 + Math.random()) + (slow ? 2_000 : 0));

      setTimeout(
        () => {
          this.emit({
            type: "trace.span",
            at: Date.now(),
            service: to,
            traceId,
            from,
            to,
            ms,
            status: down || hung ? 0 : 200,
          });
        },
        hung ? delay + CALLER_TIMEOUT_MS : delay,
      );
    };

    hop("dashboard", "util", 0);
    hop("util", "ai", 120);
    hop("util", "compute", 140);
    if (Math.random() > 0.5) hop("dashboard", "compute", 40);
    if (Math.random() > 0.7) hop("worker", "ai", 200);
    void at;
  }

  // --- Controls, mirroring the real API surface -----------------------------

  async chaos(service: string, action: ChaosAction): Promise<void> {
    const targets = this.replicas.filter((r) => r.service === service && r.phase === "Ready");
    const target = targets[Math.floor(Math.random() * targets.length)];
    if (!target) return;

    this.emit({ type: "chaos.applied", at: Date.now(), service, action, target: target.id });

    switch (action) {
      case "crash": {
        // A crashed container restarts IN PLACE: same pod name, restart count
        // up, uptime reset. A new name appears only when the pod is replaced.
        this.emit({
          type: "log",
          at: Date.now(),
          service,
          level: "error",
          message: `container exited (code 1), restarting`,
          replicaId: target.id,
        });
        this.setPhase(target, "Starting");
        target.restarts += 1;
        target.startedAt = Date.now();
        this.emit({
          type: "replica.restarted",
          at: Date.now(),
          service,
          id: target.id,
          restarts: target.restarts,
        });
        break;
      }
      case "unready":
        this.unreadyUntil.set(target.id, Date.now() + 15_000);
        this.setPhase(target, "Unready");
        this.emit({
          type: "probe.failed",
          at: Date.now(),
          service,
          id: target.id,
          probe: "readiness",
          detail: "chaos: unready, traffic drained, process untouched",
        });
        break;
      case "slow":
        this.slowUntil.set(service, Date.now() + 15_000);
        this.emit({
          type: "log",
          at: Date.now(),
          service,
          level: "warn",
          message: `injected 2s latency for 15s`,
          replicaId: target.id,
        });
        break;

      case "hang":
        // Note what is absent: no phase change, no restart, no probe failure.
        // The replica goes on reporting Ready while answering nothing, so the
        // only visible symptom is callers timing out. A liveness probe is the
        // one thing that would catch this.
        this.hungUntil.set(service, Date.now() + 15_000);
        this.emit({
          type: "log",
          at: Date.now(),
          service,
          level: "error",
          message: `stopped responding: process alive, requests hanging (15s)`,
          replicaId: target.id,
        });
        break;
      case "leak":
        target.memMb = Math.min(target.memMb * 2.5, 512);
        break;
    }
  }

  /** Deleting a pod: it is REPLACED, so a new name appears on a new node. */
  async restart(service: string): Promise<void> {
    const target = this.replicas.find((r) => r.service === service && r.phase !== "Gone");
    if (!target) return;

    this.setPhase(target, "Terminating");
    this.emit({
      type: "log",
      at: Date.now(),
      service,
      level: "warn",
      message: `pod deleted, the ReplicaSet will create a replacement`,
      replicaId: target.id,
    });

    setTimeout(() => {
      this.replicas = this.replicas.filter((r) => r.id !== target.id);
      this.emit({
        type: "replica.removed",
        at: Date.now(),
        service,
        id: target.id,
        reason: "deleted",
      });

      const svc = this.services.find((s) => s.id === service);
      const replacement = makeReplica(service, svc?.version ?? "1.0.0");
      this.replicas.push(replacement);
      this.emit({ type: "replica.added", at: Date.now(), service, replica: replacement });
      this.emit({
        type: "log",
        at: Date.now(),
        service,
        level: "info",
        message: `scheduled ${replacement.id} on ${replacement.node}`,
        replicaId: replacement.id,
      });
    }, 1_200);
  }

  async scale(service: string, replicas: number): Promise<void> {
    const svc = this.services.find((s) => s.id === service);
    if (!svc) return;
    const current = this.replicas.filter((r) => r.service === service && r.phase !== "Gone");
    const target = Math.max(0, Math.min(replicas, 8));

    this.emit({
      type: "scale.changed",
      at: Date.now(),
      service,
      from: current.length,
      to: target,
    });
    svc.desired = target;

    if (target > current.length) {
      for (let i = current.length; i < target; i++) {
        const r = makeReplica(service, svc.version);
        this.replicas.push(r);
        this.emit({ type: "replica.added", at: Date.now(), service, replica: r });
        this.emit({
          type: "log",
          at: Date.now(),
          service,
          level: "info",
          message: `scheduled ${r.id} on ${r.node}`,
          replicaId: r.id,
        });
      }
    } else {
      for (const r of current.slice(target)) {
        this.setPhase(r, "Terminating");
        setTimeout(() => {
          this.replicas = this.replicas.filter((x) => x.id !== r.id);
          this.emit({
            type: "replica.removed",
            at: Date.now(),
            service,
            id: r.id,
            reason: "scaled down",
          });
        }, 900);
      }
    }
  }

  /**
   * A rolling update with maxSurge=1, maxUnavailable=0.
   *
   * New pods come up BEFORE old ones go away, which is why the replica count
   * temporarily exceeds the desired count. That surge is the entire reason a
   * rolling deploy has no downtime, and watching the number go 2 → 3 → 2 is
   * the clearest possible way to understand it.
   */
  async rollout(service: string, version: string): Promise<void> {
    const svc = this.services.find((s) => s.id === service);
    if (!svc) return;

    const old = this.replicas.filter((r) => r.service === service && r.phase !== "Gone");
    const total = old.length;
    svc.version = version;

    this.emit({
      type: "log",
      at: Date.now(),
      service,
      level: "info",
      message: `rollout started: ${old[0]?.version ?? "1.0.0"} → ${version} (maxSurge=1, maxUnavailable=0)`,
      replicaId: null,
    });

    for (let i = 0; i < total; i++) {
      // Surge: create the replacement first.
      await sleep(1_400);
      const fresh = makeReplica(service, version);
      this.replicas.push(fresh);
      this.emit({ type: "replica.added", at: Date.now(), service, replica: fresh });
      this.emit({
        type: "rollout.progress",
        at: Date.now(),
        service,
        fromVersion: old[0]?.version ?? "1.0.0",
        toVersion: version,
        updated: i + 1,
        total,
        available: this.readyCount(service),
        done: false,
      });

      // Only once it is Ready does an old pod get retired.
      await sleep(2_200);
      const victim = old[i];
      if (victim) {
        this.setPhase(victim, "Terminating");
        await sleep(600);
        this.replicas = this.replicas.filter((r) => r.id !== victim.id);
        this.emit({
          type: "replica.removed",
          at: Date.now(),
          service,
          id: victim.id,
          reason: "replaced by rollout",
        });
      }
    }

    this.emit({
      type: "rollout.progress",
      at: Date.now(),
      service,
      fromVersion: "1.0.0",
      toVersion: version,
      updated: total,
      total,
      available: this.readyCount(service),
      done: true,
    });
    this.emit({
      type: "log",
      at: Date.now(),
      service,
      level: "info",
      message: `rollout complete: all replicas on ${version}, zero downtime`,
      replicaId: null,
    });
  }

  async enqueue(count: number): Promise<void> {
    this.queue.depth += count;
    this.emit({
      type: "log",
      at: Date.now(),
      service: "worker",
      level: "info",
      message: `enqueued ${count} jobs`,
      replicaId: null,
    });
  }

  async traffic(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      setTimeout(() => this.fireTrace(), i * 90);
    }
  }

  dispose(): void {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
  }
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let singleton: SimDriver | null = null;
export function getSimDriver(): SimDriver {
  singleton ??= new SimDriver();
  return singleton;
}
