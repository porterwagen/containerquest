"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { FleetEntry } from "@/lib/fleet";
import { useEventStream, type TraceEdge } from "@/lib/useEventStream";
import { control, fleetFromReplicas, type Mode } from "@/lib/control";
import {
  DEMO_STARTER_IDS,
  EXPERIMENTS,
  REQUEST_PATH_LESSON,
  REQUEST_PATH_COMMANDS,
  REQUEST_PATH_LESSON_TITLE,
  experimentById,
  experimentStatus,
  requestPathLessonHref,
  statusLabel,
  type ExperimentDef,
  type ExperimentId,
  type ExperimentStatus,
} from "@/lib/dashboardExperiments";
import { ServiceCard } from "./ServiceCard";
import { ParityPanel } from "./ParityPanel";
import { Topology } from "./Topology";
import { ExperimentLab, ExperimentTerminal, UpcomingBanner } from "./ChaosLab";

const POLL_MS = 2_000;
const PROGRESS_KEY = "container-quest.progress.v1";

type View = "overview" | "experiments" | "request-path";

interface CourseProgress {
  done: string[];
  current: string;
}

interface RouteState {
  view: View;
  experiment: string | null;
  focus: string | null;
}

const EMPTY_PROGRESS: CourseProgress = { done: [], current: "why-containers" };
const EXPERIMENT_TOTAL = EXPERIMENTS.length + 1; // + Request Path

function readProgress(): CourseProgress {
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return EMPTY_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<CourseProgress>;
    return {
      done: Array.isArray(parsed.done) ? parsed.done : [],
      current: typeof parsed.current === "string" ? parsed.current : EMPTY_PROGRESS.current,
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}

function readRoute(): RouteState {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("view");
  const oldTab = params.get("tab");
  let view: View = "overview";

  if (requested === "request-path") view = "request-path";
  else if (requested === "experiment" || requested === "experiments") view = "experiments";
  else if (oldTab === "lab") view = "experiments";
  else if (oldTab === "advanced" || oldTab === "flow") view = "request-path";

  return {
    view,
    experiment: params.get("experiment"),
    focus: params.get("focus"),
  };
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-edge bg-panel px-3.5 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{label}</div>
      <div className="mt-0.5 font-mono text-xl" style={{ color: tone ?? "var(--color-ink)" }}>
        {value}
      </div>
    </div>
  );
}

export function FleetView({ initial, mode = "live" }: { initial: FleetEntry[]; mode?: Mode }) {
  const [polled, setPolled] = useState(initial);
  const [stale, setStale] = useState(false);
  const [route, setRoute] = useState<RouteState>({ view: "overview", experiment: null, focus: null });
  const [progress, setProgress] = useState<CourseProgress>(EMPTY_PROGRESS);
  const [generating, setGenerating] = useState(false);
  const [pathError, setPathError] = useState<string | null>(null);
  const [captureStartedAt, setCaptureStartedAt] = useState(() => Date.now());
  const stream = useEventStream(mode);

  useEffect(() => {
    const sync = () => {
      setRoute(readRoute());
      setProgress(readProgress());
    };
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("storage", sync);
    const timer = window.setInterval(() => setProgress(readProgress()), 1_500);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("storage", sync);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (mode === "demo") return;
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch("/api/fleet", { cache: "no-store" });
        if (!res.ok) throw new Error(`fleet HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setPolled(data.fleet);
        setStale(false);
      } catch {
        if (!cancelled) setStale(true);
      }
    }

    void tick();
    const timer = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [mode]);

  const fleet = useMemo(
    () => (mode === "demo" ? fleetFromReplicas(stream.replicas) : polled),
    [mode, polled, stream.replicas],
  );
  const ready = fleet.filter((entry) => entry.status === "up").length;
  const languages = new Set(fleet.filter((entry) => entry.status !== "down").map((entry) => entry.def.language));

  const requestPathStatus = experimentStatus(REQUEST_PATH_LESSON, progress);
  const selectedExperiment = experimentById(route.experiment);
  const selectedStatus = selectedExperiment
    ? experimentStatus(selectedExperiment.lessonId, progress)
    : null;

  const readyCount =
    EXPERIMENTS.filter((experiment) => experimentStatus(experiment.lessonId, progress) === "ready")
      .length + (requestPathStatus === "ready" ? 1 : 0);

  const visibleEdges = stream.edges.filter((edge) => edge.at >= captureStartedAt);

  function navigate(next: RouteState) {
    setRoute(next);
    const url = new URL(window.location.href);
    url.searchParams.set("view", next.view === "experiments" ? "experiment" : next.view);
    if (next.experiment) url.searchParams.set("experiment", next.experiment);
    else url.searchParams.delete("experiment");
    if (next.focus) url.searchParams.set("focus", next.focus);
    else url.searchParams.delete("focus");
    url.searchParams.delete("tab");
    url.searchParams.delete("highlight");
    window.history.pushState(null, "", url);
  }

  function openExperiment(id: ExperimentId) {
    navigate({ view: "experiments", experiment: id, focus: null });
  }

  async function generateTraffic() {
    setCaptureStartedAt(Date.now());
    setGenerating(true);
    setPathError(null);
    try {
      await control(mode, "traffic", "util", 1);
    } catch (err) {
      setPathError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3">
        <Metric
          label="application services ready"
          value={`${ready}/${fleet.length}`}
          tone={ready === fleet.length ? "var(--color-live)" : "var(--color-warn)"}
        />
        <Metric label="languages live" value={String(languages.size)} tone="var(--color-beam)" />
      </section>

      <nav className="flex gap-1 border-b border-edge" aria-label="Dashboard views">
        <NavButton
          active={route.view === "overview"}
          onClick={() => navigate({ view: "overview", experiment: null, focus: null })}
        >
          Overview
        </NavButton>
        <NavButton
          active={route.view === "experiments" || route.view === "request-path"}
          onClick={() => navigate({ view: "experiments", experiment: null, focus: null })}
        >
          Experiments ({readyCount}/{EXPERIMENT_TOTAL} ready)
        </NavButton>
      </nav>

      {route.view === "overview" && (
        <Overview
          fleet={fleet}
          focus={route.focus}
          connected={stream.connected}
          stale={stale}
          spans={stream.edges.length}
          mode={mode}
          onOpenExperiments={() => navigate({ view: "experiments", experiment: null, focus: null })}
        />
      )}

      {route.view === "experiments" && !route.experiment && (
        <ExperimentLibrary
          progress={progress}
          mode={mode}
          onSelect={openExperiment}
          onRequestPath={() => {
            setCaptureStartedAt(Date.now());
            navigate({ view: "request-path", experiment: null, focus: null });
          }}
        />
      )}

      {route.view === "experiments" && route.experiment && selectedExperiment && selectedStatus && (
        <div className="space-y-3">
          <BackToExperiments onClick={() => navigate({ view: "experiments", experiment: null, focus: null })} />
          <ExperimentLab
            key={selectedExperiment.id}
            experiment={selectedExperiment}
            mode={mode}
            fleet={fleet}
            stream={stream}
            status={selectedStatus}
          />
        </div>
      )}

      {route.view === "experiments" && route.experiment && !selectedExperiment && (
        <UnknownExperiment id={route.experiment} />
      )}

      {route.view === "request-path" && (
        <div className="space-y-3">
          <BackToExperiments onClick={() => navigate({ view: "experiments", experiment: null, focus: null })} />
          <section className="rounded-xl border border-edge bg-panel px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[10px] uppercase tracking-[0.15em] text-beam">Chapter 0 evidence</div>
              <StatusPill status={requestPathStatus} />
            </div>
            <h2 className="mt-1 text-[18px] font-medium text-ink">Request Path</h2>
            <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-ink-faint">
              {mode === "demo"
                ? "Send one simulated request and watch util fan out to AI and Compute. Same hop structure as the live lesson."
                : "Keep this view open, then run the lesson's curl command. It records only real HTTP hops, so an idle graph means the system is waiting for the action."}
            </p>
            <Link
              href={requestPathLessonHref()}
              target="_blank"
              className="mt-3 inline-flex items-center rounded-md border border-edge px-3 py-1.5 text-[12px] text-ink-dim transition-colors hover:border-edge-bright hover:text-ink"
            >
              Open matching lesson: {REQUEST_PATH_LESSON_TITLE} ↗
            </Link>
            {requestPathStatus === "upcoming" && (
              <UpcomingBanner lessonTitle={REQUEST_PATH_LESSON_TITLE} mode={mode} />
            )}
            {pathError && <p className="mt-2 font-mono text-[11px] text-dead">{pathError}</p>}
          </section>
          {mode === "live" && <ExperimentTerminal commands={REQUEST_PATH_COMMANDS} />}
          <Topology
            edges={visibleEdges}
            fleet={fleet}
            onGenerate={() => void generateTraffic()}
            generating={generating}
            actionDisabled={false}
            buttonLabel="Send one request"
            title="Observed service-to-service hops"
            subtitle="The lesson request reaches util, which records its calls to AI and Compute."
            emptyHint={
              mode === "demo"
                ? "No captured request yet. Send one request to see the fan-out."
                : "No captured request yet. Prefer curl in the lesson when dual-tabbing, or send one request here."
            }
          />
          <TraceList edges={visibleEdges} />
          {visibleEdges.length > 0 && (
            <div className="rounded-lg border border-beam/40 bg-beam/5 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.14em] text-beam">Takeaway</div>
              <p className="mt-1 text-[13px] leading-relaxed text-ink">
                One request to util became separate calls to AI and Compute. A multi-service system
                needs trace context to keep those hops connected.
              </p>
            </div>
          )}
        </div>
      )}

      <footer className="pb-8 text-center font-mono text-[10px] text-ink-faint">
        {mode === "demo" ? "demo mode · simulator in this browser" : `fleet snapshot every ${POLL_MS / 1000}s`}
      </footer>
    </div>
  );
}

function Overview({
  fleet,
  focus,
  connected,
  stale,
  spans,
  mode,
  onOpenExperiments,
}: {
  fleet: FleetEntry[];
  focus: string | null;
  connected: boolean;
  stale: boolean;
  spans: number;
  mode: Mode;
  onOpenExperiments: () => void;
}) {
  return (
    <>
      <p className="rounded-lg border border-edge bg-panel px-4 py-2.5 text-[12.5px] leading-relaxed text-ink-faint">
        {mode === "demo" ? (
          <>
            Simulated fleet scoreboard: identity, uptime, requests, and readiness. Open{" "}
            <button type="button" onClick={onOpenExperiments} className="text-beam hover:underline">
              Experiments
            </button>{" "}
            to crash, unready, or scale with fake data.
          </>
        ) : (
          <>
            The five application cards are the scoreboard: identity, uptime, requests, and readiness.
            PostgreSQL, Redis, and the socket proxy complete the eight-container Compose project.
          </>
        )}
      </p>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {fleet.map((entry, index) => (
          <ServiceCard
            key={entry.def.id}
            entry={entry}
            index={index}
            highlight={focus === entry.def.id}
          />
        ))}
      </section>
      <details className="overflow-hidden rounded-xl border border-edge bg-panel">
        <summary className="cursor-pointer px-5 py-3.5 text-[13px] text-ink-dim">
          Compare service metadata
        </summary>
        <div className="border-t border-edge">
          <ParityPanel fleet={fleet} />
        </div>
      </details>
      <details className="rounded-xl border border-edge bg-panel px-5 py-3.5">
        <summary className="cursor-pointer text-[13px] text-ink-dim">System details</summary>
        <dl className="mt-3 grid gap-3 border-t border-edge pt-3 text-[12px] sm:grid-cols-2">
          <Datum label="event stream" value={connected ? "connected" : stale ? "down" : "connecting"} />
          <Datum label="trace spans this session" value={String(spans)} />
        </dl>
      </details>
      <p className="text-center text-[11.5px] text-ink-faint">
        Experiments lists the full roadmap. Gray items are upcoming;{" "}
        <span className="text-ink-dim">Ready</span> means you finished the matching lesson.
      </p>
    </>
  );
}

function ExperimentLibrary({
  progress,
  mode,
  onSelect,
  onRequestPath,
}: {
  progress: CourseProgress;
  mode: Mode;
  onSelect: (id: ExperimentId) => void;
  onRequestPath: () => void;
}) {
  const requestStatus = experimentStatus(REQUEST_PATH_LESSON, progress);
  const starters = DEMO_STARTER_IDS.map((id) => experimentById(id)).filter(
    (experiment): experiment is ExperimentDef => Boolean(experiment),
  );

  return (
    <section className="overflow-hidden rounded-xl border border-edge bg-panel">
      <header className="border-b border-edge px-5 py-4">
        <h2 className="text-[18px] font-medium text-ink">Experiments</h2>
        <p className="mt-1 text-[12.5px] text-ink-faint">
          Full roadmap. Upcoming items are grayed but still runnable. Ready items match completed
          lessons — the best time to practice.
        </p>
      </header>

      {mode === "demo" && (
        <div className="border-b border-edge bg-beam/5 px-5 py-3">
          <div className="text-[10px] uppercase tracking-[0.14em] text-beam">Try these first</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRequestPath}
              className="rounded-md border border-beam/40 bg-panel px-2.5 py-1.5 text-[11.5px] text-beam hover:border-beam"
            >
              Request Path
            </button>
            {starters.map((experiment) => (
              <button
                key={experiment.id}
                type="button"
                onClick={() => onSelect(experiment.id)}
                className="rounded-md border border-beam/40 bg-panel px-2.5 py-1.5 text-[11.5px] text-beam hover:border-beam"
              >
                {experiment.title}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11.5px] text-ink-faint">
            Simulated fleet — no Docker required. Actions update the cards above with fake data.
          </p>
        </div>
      )}

      <div className="grid gap-3 p-5 md:grid-cols-2">
        <ExperimentButton
          title="Request Path"
          summary="See one request fan out from util to AI and Compute."
          chapter={0}
          status={requestStatus}
          lessonTitle={REQUEST_PATH_LESSON_TITLE}
          badge={undefined}
          onClick={onRequestPath}
        />
        {EXPERIMENTS.map((experiment) => {
          const status = experimentStatus(experiment.lessonId, progress);
          const extraBadge =
            experiment.kubernetes && mode === "live"
              ? "kubectl only"
              : experiment.kubernetes && mode === "demo"
                ? "sim"
                : undefined;
          return (
            <ExperimentButton
              key={experiment.id}
              title={experiment.title}
              summary={experiment.summary}
              chapter={experiment.chapter}
              status={status}
              lessonTitle={experiment.lessonTitle}
              badge={extraBadge}
              onClick={() => onSelect(experiment.id)}
            />
          );
        })}
      </div>
    </section>
  );
}

function ExperimentButton({
  title,
  summary,
  chapter,
  status,
  lessonTitle,
  badge,
  onClick,
}: {
  title: string;
  summary: string;
  chapter: number;
  status: ExperimentStatus;
  lessonTitle: string;
  badge?: string;
  onClick: () => void;
}) {
  const upcoming = status === "upcoming";
  const inLesson = status === "in-lesson";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition-colors ${
        upcoming
          ? "border-dashed border-edge/70 bg-panel-2/50 opacity-60 hover:opacity-90 hover:border-edge"
          : inLesson
            ? "border-beam/50 bg-beam/5 hover:border-beam"
            : "border-edge bg-panel-2 hover:border-edge-bright"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[10px] uppercase tracking-[0.14em] ${
            upcoming ? "text-ink-faint" : "text-beam"
          }`}
        >
          Chapter {chapter}
        </span>
        <div className="flex items-center gap-2">
          {badge && <span className="font-mono text-[10px] text-warn">{badge}</span>}
          <StatusPill status={status} />
        </div>
      </div>
      <h3 className={`mt-1 text-[14px] font-medium ${upcoming ? "text-ink-dim" : "text-ink"}`}>
        {title}
      </h3>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-faint">{summary}</p>
      <p className="mt-2 text-[11px] text-ink-faint">
        {status === "ready"
          ? "Lesson completed · practice again"
          : status === "in-lesson"
            ? `Open with “${lessonTitle}”`
            : `From “${lessonTitle}” · try early →`}
      </p>
    </button>
  );
}

function StatusPill({ status }: { status: ExperimentStatus }) {
  const tone =
    status === "ready"
      ? "border-live/40 bg-live/10 text-live"
      : status === "in-lesson"
        ? "border-beam/40 bg-beam/10 text-beam"
        : "border-edge bg-panel text-ink-faint";
  return (
    <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] ${tone}`}>
      {statusLabel(status)}
    </span>
  );
}

function UnknownExperiment({ id }: { id: string }) {
  return (
    <section className="rounded-xl border border-edge bg-panel p-6">
      <div className="text-[10px] uppercase tracking-[0.14em] text-warn">Unknown experiment</div>
      <h2 className="mt-1 text-[18px] font-medium text-ink">{id}</h2>
      <p className="mt-2 max-w-xl text-[12.5px] leading-relaxed text-ink-faint">
        This link does not name a dashboard experiment that exists. Open Experiments for the full
        roadmap.
      </p>
    </section>
  );
}

function TraceList({ edges }: { edges: TraceEdge[] }) {
  const groups = [...edges.reduce<Map<string, TraceEdge[]>>((byTrace, edge) => {
    const group = byTrace.get(edge.traceId) ?? [];
    group.push(edge);
    byTrace.set(edge.traceId, group);
    return byTrace;
  }, new Map()).entries()].slice(-4).reverse();
  return (
    <section className="overflow-hidden rounded-xl border border-edge bg-panel">
      <header className="border-b border-edge px-5 py-3.5">
        <h2 className="text-[14px] font-medium text-ink">Captured hops</h2>
        <p className="mt-0.5 text-[12px] text-ink-faint">Observed evidence, newest first.</p>
      </header>
      {groups.length === 0 ? (
        <p className="px-5 py-6 text-center text-[11.5px] text-ink-faint">Waiting for a request.</p>
      ) : (
        <div className="divide-y divide-edge/60">
          {groups.map(([traceId, traceEdges]) => (
            <div key={traceId} className="px-5 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                trace {traceId.slice(0, 12)}
              </div>
              <ul className="mt-1 font-mono text-[11px]">
                {traceEdges.map((edge) => (
                  <li key={edge.key} className="grid gap-1 py-1 sm:grid-cols-[1fr_80px_80px]">
                    <span className="text-beam">{edge.from} → {edge.to}</span>
                    <span className="text-ink-faint">{edge.ms}ms</span>
                    <span className={edge.status >= 400 || edge.status === 0 ? "text-dead" : "text-live"}>
                      HTTP {edge.status || "error"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function NavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-3.5 py-2 text-[13px] transition-colors ${
        active ? "border-beam text-ink" : "border-transparent text-ink-faint hover:text-ink-dim"
      }`}
    >
      {children}
    </button>
  );
}

function BackToExperiments({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-[12px] text-beam hover:underline">
      ← All experiments
    </button>
  );
}

function Datum({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{label}</dt>
      <dd className="mt-0.5 font-mono text-ink-dim">{value}</dd>
    </div>
  );
}
