"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Replica } from "@quest/contracts";
import type {
  ExperimentCommand,
  ExperimentDef,
  ExperimentStatus,
} from "@/lib/dashboardExperiments";
import { experimentLessonHref, statusLabel } from "@/lib/dashboardExperiments";
import type { FleetEntry } from "@/lib/fleet";
import type { FleetState } from "@/lib/useEventStream";
import { control, type Mode } from "@/lib/control";
import { Timeline } from "./Timeline";

export function UpcomingBanner({ lessonTitle, mode }: { lessonTitle: string; mode: Mode }) {
  return (
    <p className="mt-3 rounded-lg border border-edge bg-panel-2 px-3 py-2 text-[12px] leading-relaxed text-ink-faint">
      Ahead of the course. You&apos;ll get more context in &ldquo;{lessonTitle}&rdquo;.
      {mode === "demo"
        ? " Running early on simulated data is fine."
        : " Running early is fine if you want to explore."}
    </p>
  );
}

interface Observation {
  service: string;
  identity: string;
  uptimeSec: number;
  restarts: number;
  liveness: number;
  readiness: number;
  status: "ready" | "unready" | "down";
}

export function ExperimentLab({
  experiment,
  mode,
  fleet,
  stream,
  status,
}: {
  experiment: ExperimentDef;
  mode: Mode;
  fleet: FleetEntry[];
  stream: FleetState;
  status: ExperimentStatus;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-edge bg-panel">
      <header className="border-b border-edge px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-[10px] uppercase tracking-[0.15em] text-beam">
            Chapter {experiment.chapter} experiment
          </div>
          <StatusPill status={status} />
        </div>
        <h2 className="mt-1 text-[18px] font-medium text-ink">{experiment.title}</h2>
        <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-ink-faint">
          {experiment.summary}
        </p>
        <Link
          href={experimentLessonHref(experiment)}
          target="_blank"
          className="mt-3 inline-flex items-center rounded-md border border-edge px-3 py-1.5 text-[12px] text-ink-dim transition-colors hover:border-edge-bright hover:text-ink"
        >
          Open matching lesson: {experiment.lessonTitle} ↗
        </Link>
        {status === "upcoming" && (
          <UpcomingBanner lessonTitle={experiment.lessonTitle} mode={mode} />
        )}
        {status === "in-lesson" && (
          <p className="mt-3 rounded-lg border border-beam/30 bg-beam/5 px-3 py-2 text-[12px] leading-relaxed text-ink-dim">
            This pairs with your current lesson. Prefer the terminal action when dual-tabbing; use
            dashboard controls to practice or peek.
          </p>
        )}
      </header>

      <div className="space-y-5 p-5">
        {mode === "live" && <ExperimentTerminal commands={experiment.commands} />}
        {experiment.kubernetes && mode === "live" ? (
          <KubernetesUnavailable />
        ) : experiment.id === "restart-vs-replace" ? (
          <IdentityExperiment mode={mode} fleet={fleet} stream={stream} />
        ) : experiment.id === "crash-recovery" ? (
          <CrashExperiment mode={mode} fleet={fleet} stream={stream} />
        ) : experiment.id === "readiness" ? (
          <ReadinessExperiment mode={mode} fleet={fleet} stream={stream} />
        ) : experiment.id === "compose-limits" ? (
          <ComposeLimits mode={mode} />
        ) : (
          <KubernetesExperiment id={experiment.id} mode={mode} stream={stream} />
        )}
      </div>
    </section>
  );
}

export function ExperimentTerminal({ commands }: { commands: ExperimentCommand[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(command: ExperimentCommand) {
    await navigator.clipboard.writeText(command.command);
    setCopied(command.key);
    window.setTimeout(() => setCopied(null), 1_600);
  }

  return (
    <section className="rounded-lg border border-edge bg-panel-2 p-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[10px] uppercase tracking-[0.14em] text-beam">
          Terminal alternative
        </h3>
        <span className="text-[11px] text-ink-faint">Same actions as the matching lesson</span>
      </div>
      <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-ink-faint">
        Use these when you want the terminal path. The experiment supplies the live evidence, so
        observation commands stay in the lesson.
      </p>
      <div className="mt-3 space-y-2.5">
        {commands.map((command) => (
          <div key={command.key}>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[11px] text-ink-dim">{command.label}</span>
              {command.role === "reset" && (
                <span className="rounded border border-warn/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-warn">
                  cleanup
                </span>
              )}
            </div>
            <div className="flex items-stretch gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre rounded-md border border-edge bg-void px-3 py-2 font-mono text-[11.5px] leading-relaxed text-beam">
                {command.command}
              </code>
              <button
                type="button"
                onClick={() => void copy(command)}
                className="shrink-0 rounded-md border border-edge px-2.5 font-mono text-[10.5px] text-ink-faint transition-colors hover:border-edge-bright hover:text-ink"
              >
                {copied === command.key ? "copied" : "copy"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: ExperimentStatus }) {
  const tone =
    status === "ready"
      ? "border-live/40 bg-live/10 text-live"
      : status === "in-lesson"
        ? "border-beam/40 bg-beam/10 text-beam"
        : "border-edge bg-panel-2 text-ink-faint";
  return (
    <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] ${tone}`}>
      {statusLabel(status)}
    </span>
  );
}

function IdentityExperiment({
  mode,
  fleet,
  stream,
}: {
  mode: Mode;
  fleet: FleetEntry[];
  stream: FleetState;
}) {
  const current = useObservation("ai", mode, fleet, stream);
  const [restartBefore, setRestartBefore] = useState<Observation | null>(null);
  const [restartAfter, setRestartAfter] = useState<Observation | null>(null);
  const [replaceBefore, setReplaceBefore] = useState<Observation | null>(null);
  const [replaceAfter, setReplaceAfter] = useState<Observation | null>(null);
  const [busy, setBusy] = useState<"restart" | "replace" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!current || restartAfter || !restartBefore) return;
    const restarted =
      current.status === "ready" &&
      current.identity === restartBefore.identity &&
      (current.restarts > restartBefore.restarts || current.uptimeSec < restartBefore.uptimeSec);
    if (restarted) setRestartAfter(current);
  }, [current, restartAfter, restartBefore]);

  useEffect(() => {
    if (!current || replaceAfter || !replaceBefore) return;
    if (
      current.status === "ready" &&
      current.identity !== "unknown" &&
      current.identity !== replaceBefore.identity
    ) {
      setReplaceAfter(current);
    }
  }, [current, replaceAfter, replaceBefore]);

  async function simulateRestart() {
    if (!current) return;
    setRestartBefore(current);
    setRestartAfter(null);
    setBusy("restart");
    setError(null);
    try {
      // Sim crash restarts in place: same identity, restarts++, uptime reset.
      await control(mode, "chaos", "ai", "crash");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function simulateReplace() {
    if (!current) return;
    setReplaceBefore(current);
    setReplaceAfter(null);
    setBusy("replace");
    setError(null);
    try {
      // Sim restart deletes the pod and creates a new identity.
      await control(mode, "restart", "ai");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (mode === "demo") {
    return (
      <div className="space-y-5">
        <p className="rounded-lg border border-beam/30 bg-beam/5 px-4 py-3 text-[12.5px] leading-relaxed text-ink-dim">
          Simulated identity comparison. The hosted model uses Kubernetes-style names, but the
          lesson is the same: <strong className="font-medium text-ink">restart keeps identity</strong>,{" "}
          <strong className="font-medium text-ink">replacement creates a new one</strong>. On your
          machine the course uses real <span className="font-mono text-[11px]">docker restart</span>{" "}
          vs recreate.
        </p>

        <ExperimentRule
          concept="ROUND 1: restart in place"
          action="Simulate a process restart that keeps the same container/pod identity."
          after="Identity stays put; restart count rises; uptime resets."
        />
        <EvidencePair before={restartBefore} after={restartAfter ?? (restartBefore ? current : null)} />
        <button
          type="button"
          disabled={!current || busy !== null}
          onClick={() => void simulateRestart()}
          className="rounded-md border border-beam/60 bg-beam/5 px-3 py-2 text-[12px] text-beam disabled:opacity-40"
        >
          {busy === "restart" ? "Restarting…" : "Simulate restart-in-place"}
        </button>
        {restartBefore && !restartAfter && <Watching text="Waiting for same identity, new uptime" />}
        {restartAfter && <Proof text="Restart proved: same identity, new uptime" />}

        <div className="border-t border-edge pt-5">
          <ExperimentRule
            concept="ROUND 2: replacement"
            action="Simulate deleting the unit so desired state creates a new identity."
            after="A different identity appears."
          />
          <div className="mt-3">
            <EvidencePair before={replaceBefore} after={replaceAfter ?? (replaceBefore ? current : null)} />
          </div>
          <button
            type="button"
            disabled={!current || busy !== null}
            onClick={() => void simulateReplace()}
            className="mt-3 rounded-md border border-beam/60 bg-beam/5 px-3 py-2 text-[12px] text-beam disabled:opacity-40"
          >
            {busy === "replace" ? "Replacing…" : "Simulate replacement"}
          </button>
          {replaceBefore && !replaceAfter && <Watching text="Waiting for a new AI identity" />}
          {replaceAfter && <Proof text="Replacement proved: a new identity appeared" />}
        </div>

        {error && <ErrorNote text={error} />}
        {restartAfter && replaceAfter && (
          <Takeaway>
            Restart and replacement can look like the same interruption from outside. Identity tells
            them apart. Run the Docker lesson locally to see the same idea on real containers.
          </Takeaway>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ExperimentRule
        concept="ROUND 1: restart"
        action="Capture the current AI identity, then run the lesson's docker restart command."
        after="The identity stays the same while uptime resets and restart count rises."
      />
      <EvidencePair before={restartBefore} after={restartAfter ?? current} />
      <button
        type="button"
        disabled={!current}
        onClick={() => {
          setRestartBefore(current);
          setRestartAfter(null);
        }}
        className="rounded-md border border-beam/60 bg-beam/5 px-3 py-2 text-[12px] text-beam disabled:opacity-40"
      >
        Capture before restart
      </button>
      {restartBefore && !restartAfter && <Watching text="Waiting for the same identity to restart" />}
      {restartAfter && <Proof text="Restart proved: same identity, new uptime" />}

      <div className="border-t border-edge pt-5">
        <ExperimentRule
          concept="ROUND 2: replacement"
          action="Capture again, then run the lesson's force-recreate command."
          after="The identity changes because Compose created a different container."
        />
        <div className="mt-3">
          <EvidencePair before={replaceBefore} after={replaceAfter ?? current} />
        </div>
        <button
          type="button"
          disabled={!current || !restartAfter}
          onClick={() => {
            setReplaceBefore(current);
            setReplaceAfter(null);
          }}
          className="mt-3 rounded-md border border-beam/60 bg-beam/5 px-3 py-2 text-[12px] text-beam disabled:opacity-40"
        >
          Capture before replacement
        </button>
        {replaceBefore && !replaceAfter && <Watching text="Waiting for a new AI identity" />}
        {replaceAfter && <Proof text="Replacement proved: a new identity appeared" />}
      </div>

      {restartAfter && replaceAfter && (
        <Takeaway>
          Restart and replacement can look like the same interruption from outside. Identity tells
          them apart.
        </Takeaway>
      )}
    </div>
  );
}

function CrashExperiment({
  mode,
  fleet,
  stream,
}: {
  mode: Mode;
  fleet: FleetEntry[];
  stream: FleetState;
}) {
  const current = useObservation("ai", mode, fleet, stream);
  const [before, setBefore] = useState<Observation | null>(null);
  const [after, setAfter] = useState<Observation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!before && current?.status === "ready") setBefore(current);
  }, [before, current]);

  useEffect(() => {
    if (!before || !current || after) return;
    const proved =
      current.status === "ready" &&
      current.identity === before.identity &&
      (current.restarts > before.restarts || current.uptimeSec < before.uptimeSec);
    if (proved) setAfter(current);
  }, [after, before, current]);

  async function crashAgain() {
    if (!current) return;
    setBefore(current);
    setAfter(null);
    setBusy(true);
    setError(null);
    try {
      await control(mode, "chaos", "ai", "crash");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <ExperimentRule
        concept="CRASH RECOVERY"
        action={
          mode === "demo"
            ? "Crash AI once and watch the same identity return with a higher restart count."
            : "Run the lesson's crash curl, or crash AI here to practice the same outcome."
        }
        after="AI keeps its identity, restart count rises, and uptime starts over."
      />
      <EvidencePair before={before} after={after ?? current} />
      <button
        type="button"
        disabled={busy || !current}
        onClick={() => void crashAgain()}
        className="rounded-md border border-dead/60 bg-dead/5 px-3 py-2 text-[12px] text-dead disabled:opacity-40"
      >
        {busy ? "Requesting crash..." : "Crash AI once"}
      </button>
      {error && <ErrorNote text={error} />}
      {before && !after && <Watching text="Watching for exit, restart count, and reset uptime" />}
      {after && (
        <>
          <Proof text="Crash recovery proved: the same container started its process again" />
          <Timeline logs={stream.logs.filter((line) => line.service === "ai")} mode={mode} />
          <Takeaway>
            The process exited. A supervisor restarted it in the same container, so identity stayed
            put while uptime and process state started over.
          </Takeaway>
        </>
      )}
    </div>
  );
}

function ReadinessExperiment({
  mode,
  fleet,
  stream,
}: {
  mode: Mode;
  fleet: FleetEntry[];
  stream: FleetState;
}) {
  const current = useObservation("util", mode, fleet, stream);
  const [before, setBefore] = useState<Observation | null>(null);
  const [after, setAfter] = useState<Observation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!before && current?.readiness === 200) setBefore(current);
  }, [before, current]);

  useEffect(() => {
    if (!before || !current || after) return;
    const proved =
      current.liveness === 200 &&
      current.readiness === 503 &&
      current.identity === before.identity &&
      current.restarts === before.restarts;
    if (proved) setAfter(current);
  }, [after, before, current]);

  async function makeUnready() {
    if (!current || current.readiness !== 200) return;
    setBefore(current);
    setAfter(null);
    setBusy(true);
    setError(null);
    try {
      await control(mode, "chaos", "util", "unready");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <ExperimentRule
        concept="READINESS VERSUS LIVENESS"
        action={
          mode === "demo"
            ? "Make util unready once and watch both health answers."
            : "Run the lesson's unready curl, or apply it here to practice."
        }
        after="Liveness stays 200, readiness becomes 503, and the process is not restarted."
      />
      <EvidencePair before={before} after={after ?? current} showHealth />
      <button
        type="button"
        disabled={busy || !current || current.readiness !== 200}
        onClick={() => void makeUnready()}
        className="rounded-md border border-warn/60 bg-warn/5 px-3 py-2 text-[12px] text-warn disabled:opacity-40"
      >
        {busy
          ? "Applying..."
          : current?.readiness === 503
            ? "Waiting for recovery"
            : "Make util unready once"}
      </button>
      {error && <ErrorNote text={error} />}
      {before && !after && <Watching text="Watching both health answers and restart count" />}
      {after && (
        <>
          <Proof text="Readiness proved: 200 alive, 503 not ready, zero restarts" />
          <Takeaway>
            Readiness can stop traffic without killing the process. Liveness is reserved for a
            process that must be restarted.
          </Takeaway>
        </>
      )}
    </div>
  );
}

function ComposeLimits({ mode }: { mode: Mode }) {
  return (
    <div className="space-y-4">
      {mode === "demo" && (
        <p className="rounded-lg border border-edge bg-panel-2 px-4 py-3 text-[12.5px] leading-relaxed text-ink-faint">
          Concept board — no live scale attempt in the simulator. The point is the capability gap
          you hit with Compose host ports.
        </p>
      )}
      <ExperimentRule
        concept="COMPOSE CAPABILITY BOUNDARY"
        action={
          mode === "demo"
            ? "Compare the two columns — Compose cannot express a multi-replica Service."
            : "Run the lesson's docker compose scale command in the terminal."
        }
        after="The second worker cannot claim host port 3001, so Compose reports a port conflict."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <CapabilityCard
          title="Compose"
          value="One published worker"
          note="The Docker Engine has containers, but no Service object or desired replica count."
          tone="var(--color-warn)"
        />
        <CapabilityCard
          title="Kubernetes"
          value="Many pods, one Service"
          note="A stable Service address load-balances across ready pods without host-port conflicts."
          tone="var(--color-beam)"
        />
      </div>
      <Takeaway>
        The disabled capability is the lesson: Compose cannot express the load-balanced desired
        state that makes Kubernetes scaling work.
      </Takeaway>
    </div>
  );
}

function KubernetesExperiment({
  id,
  mode,
  stream,
}: {
  id: ExperimentDef["id"];
  mode: Mode;
  stream: FleetState;
}) {
  const active = stream.replicas.filter((replica) => replica.service === "compute" && replica.phase !== "Gone");
  const ready = active.filter((replica) => replica.phase === "Ready");
  const [beforeIds, setBeforeIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const newIdentity = started && ready.some((replica) => !beforeIds.includes(replica.id));
  const scaled = started && ready.length >= 5;
  const rolled =
    started && active.length > 0 && active.every((replica) => replica.version === "2.0.0") && ready.length > 0;

  const action =
    id === "k8s-selfheal"
      ? { label: "Delete one compute pod", name: "restart", value: undefined }
      : id === "k8s-scaling"
        ? { label: "Scale compute to 5", name: "scale", value: 5 }
        : { label: "Roll compute to v2.0.0", name: "rollout", value: "2.0.0" };

  const rule =
    id === "k8s-selfheal"
      ? {
          concept: "DESIRED STATE REPLACES",
          action: "Delete one compute pod.",
          after: "A new pod identity appears because the desired count did not change.",
        }
      : id === "k8s-scaling"
        ? {
            concept: "ONE SERVICE, MORE PODS",
            action: "Change compute from its current count to five replicas.",
            after: "Five replicas become ready behind the same Service.",
          }
        : {
            concept: "ROLL WITHOUT LOSING CAPACITY",
            action: "Change compute to version 2.0.0.",
            after: "Old and new versions overlap before every active replica reports version 2.0.0.",
          };

  const proved = id === "k8s-selfheal" ? newIdentity : id === "k8s-scaling" ? scaled : rolled;

  async function run() {
    setBeforeIds(active.map((replica) => replica.id));
    setStarted(true);
    setBusy(true);
    setError(null);
    try {
      await control(mode, action.name, "compute", action.value);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {mode === "demo" && (
        <p className="rounded-lg border border-beam/30 bg-beam/5 px-3 py-2 text-[12px] text-ink-dim">
          In-browser Kubernetes model — same replica lifecycle the lesson describes with kubectl.
        </p>
      )}
      <ExperimentRule concept={rule.concept} action={rule.action} after={rule.after} />
      <div className="grid gap-3 sm:grid-cols-3">
        <CapabilityCard title="actual" value={String(active.length)} note="Compute replicas present" />
        <CapabilityCard title="ready" value={String(ready.length)} note="Eligible for traffic" />
        <CapabilityCard
          title="versions"
          value={[...new Set(active.map((replica) => replica.version))].join(", ") || "none"}
          note="Versions running together"
        />
      </div>
      <ReplicaList replicas={active} beforeIds={beforeIds} />
      <button
        type="button"
        disabled={busy}
        onClick={() => void run()}
        className="rounded-md border border-beam/60 bg-beam/5 px-3 py-2 text-[12px] text-beam disabled:opacity-40"
      >
        {busy ? "Applying..." : action.label}
      </button>
      {id === "k8s-scaling" && scaled && (
        <button
          type="button"
          onClick={() => void control(mode, "scale", "compute", 2)}
          className="ml-2 rounded-md border border-edge px-3 py-2 text-[12px] text-ink-dim"
        >
          Reset to 2
        </button>
      )}
      {error && <ErrorNote text={error} />}
      {started && !proved && <Watching text="Watching desired state change the replica set" />}
      {proved && (
        <>
          <Proof
            text={
              id === "k8s-selfheal"
                ? "Replacement proved: a new pod identity appeared"
                : id === "k8s-scaling"
                  ? "Scaling proved: five compute replicas became ready"
                  : "Rollout proved: every active compute replica now reports v2.0.0"
            }
          />
          <Timeline logs={stream.logs.filter((line) => line.service === "compute")} mode={mode} />
          <Takeaway>
            {id === "k8s-selfheal"
              ? "Kubernetes restores the declaration by creating a new pod. It does not resurrect the deleted identity."
              : id === "k8s-scaling"
                ? "The Service keeps one stable address while the set of ready pods behind it changes."
                : "Readiness lets new replicas join before old replicas leave, so the update does not require an outage."}
          </Takeaway>
        </>
      )}
    </div>
  );
}

function KubernetesUnavailable() {
  return (
    <div className="space-y-3">
      <p className="rounded-lg border border-warn/40 bg-warn/5 px-4 py-3 text-[12.5px] leading-relaxed text-ink-dim">
        This dashboard is connected to Docker Compose. The Kubernetes lesson still works through
        kubectl, but dashboard control stays locked until a real Kubernetes driver can observe and
        verify the result. On the hosted demo, these experiments run in the in-browser simulator.
      </p>
      <Takeaway>
        Compose and Kubernetes have different control planes. A mode label alone does not make a
        Kubernetes operation available.
      </Takeaway>
    </div>
  );
}

function useObservation(service: string, mode: Mode, fleet: FleetEntry[], stream: FleetState) {
  const derived = useMemo(
    () => deriveObservation(service, fleet, stream.replicas, stream.restarts),
    [fleet, service, stream.replicas, stream.restarts],
  );
  const [live, setLive] = useState<Observation | null>(null);

  useEffect(() => {
    if (mode === "demo") return;
    let cancelled = false;
    async function refresh() {
      try {
        const result = (await control(mode, "observe", service)) as unknown as Observation;
        if (!cancelled) setLive(result);
      } catch {
        if (!cancelled) setLive(derived);
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 800);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [mode, service]);

  return mode === "demo" ? derived : live ?? derived;
}

function deriveObservation(
  service: string,
  fleet: FleetEntry[],
  replicas: Replica[],
  restartMap: Record<string, number>,
): Observation | null {
  const entry = fleet.find((candidate) => candidate.def.id === service);
  const own = replicas.filter((replica) => replica.service === service && replica.phase !== "Gone");
  const replica = own.find((candidate) => candidate.phase === "Ready") ?? own[0];
  if (!entry && !replica) return null;
  const status = entry?.status === "up" ? "ready" : entry?.status === "unready" ? "unready" : "down";
  return {
    service,
    identity: entry?.meta?.hostname ?? replica?.id ?? "unknown",
    uptimeSec: entry?.meta?.uptimeSec ?? Math.max(0, Math.floor((Date.now() - (replica?.startedAt ?? Date.now())) / 1000)),
    restarts: Math.max(restartMap[service] ?? 0, ...own.map((candidate) => candidate.restarts), 0),
    liveness: status === "down" ? 0 : 200,
    readiness: status === "ready" ? 200 : status === "unready" ? 503 : 0,
    status,
  };
}

function EvidencePair({
  before,
  after,
  showHealth = false,
}: {
  before: Observation | null;
  after: Observation | null;
  showHealth?: boolean;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <ObservationCard label="BEFORE" observation={before} showHealth={showHealth} />
      <ObservationCard label="CURRENT / AFTER" observation={after} showHealth={showHealth} />
    </div>
  );
}

function ObservationCard({
  label,
  observation,
  showHealth,
}: {
  label: string;
  observation: Observation | null;
  showHealth: boolean;
}) {
  return (
    <div className="rounded-lg border border-edge bg-panel-2 p-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{label}</div>
      {observation ? (
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 font-mono text-[11px]">
          <Datum label="identity" value={observation.identity} />
          <Datum label="uptime" value={`${observation.uptimeSec}s`} />
          <Datum label="restarts" value={String(observation.restarts)} />
          <Datum label="state" value={observation.status} />
          {showHealth && <Datum label="liveness" value={String(observation.liveness)} />}
          {showHealth && <Datum label="readiness" value={String(observation.readiness)} />}
        </dl>
      ) : (
        <p className="mt-2 text-[12px] text-ink-faint">Waiting for the service.</p>
      )}
    </div>
  );
}

function Datum({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="truncate text-ink-dim" title={value}>{value}</dd>
    </div>
  );
}

function ExperimentRule({ concept, action, after }: { concept: string; action: string; after: string }) {
  return (
    <div className="grid gap-2 rounded-lg border border-edge bg-panel-2 p-3 text-[12px] leading-relaxed sm:grid-cols-3">
      <RulePart label="CONCEPT" text={concept} />
      <RulePart label="ONE ACTION" text={action} />
      <RulePart label="LOOK FOR" text={after} />
    </div>
  );
}

function RulePart({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.13em] text-beam">{label}</div>
      <p className="mt-1 text-ink-dim">{text}</p>
    </div>
  );
}

function CapabilityCard({
  title,
  value,
  note,
  tone = "var(--color-ink)",
}: {
  title: string;
  value: string;
  note: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-edge bg-panel-2 p-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{title}</div>
      <div className="mt-1 font-mono text-[15px]" style={{ color: tone }}>{value}</div>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-faint">{note}</p>
    </div>
  );
}

function ReplicaList({ replicas, beforeIds }: { replicas: Replica[]; beforeIds: string[] }) {
  return (
    <ul className="divide-y divide-edge/60 overflow-hidden rounded-lg border border-edge bg-panel-2 font-mono text-[11px]">
      {replicas.map((replica) => (
        <li key={replica.id} className="grid gap-1 px-3 py-2 sm:grid-cols-[1fr_90px_80px]">
          <span className={beforeIds.length > 0 && !beforeIds.includes(replica.id) ? "text-live" : "text-ink-dim"}>
            {replica.id}
          </span>
          <span className="text-ink-faint">{replica.phase}</span>
          <span className="text-beam">v{replica.version}</span>
        </li>
      ))}
    </ul>
  );
}

function Watching({ text }: { text: string }) {
  return <p className="mt-2 font-mono text-[11px] text-ink-faint">Watching: {text}...</p>;
}

function Proof({ text }: { text: string }) {
  return <p className="rounded-md border border-live/40 bg-live/5 px-3 py-2 text-[12px] text-live">{text}</p>;
}

function ErrorNote({ text }: { text: string }) {
  return <p className="rounded-md border border-dead/40 bg-dead/5 px-3 py-2 text-[12px] text-dead">{text}</p>;
}

function Takeaway({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-beam/40 bg-beam/5 px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-beam">Takeaway</div>
      <p className="mt-1 text-[13px] leading-relaxed text-ink">{children}</p>
    </div>
  );
}
