"use client";

import { useEffect, useMemo, useState } from "react";
import type { FleetEntry } from "@/lib/fleet";
import { useEventStream } from "@/lib/useEventStream";
import { fleetFromReplicas, type Mode } from "@/lib/control";
import { ServiceCard } from "./ServiceCard";
import { ParityPanel } from "./ParityPanel";
import { Topology } from "./Topology";
import { ChaosLab } from "./ChaosLab";
import { QueueChart } from "./QueueChart";
import { Timeline } from "./Timeline";

/**
 * Two channels, on purpose.
 *
 * /api/events is a push stream: container lifecycle, trace spans, queue depth
 * arrive the moment they happen. /api/fleet stays a poll, because "what does
 * each service report about itself right now" genuinely is a question you ask
 * rather than an event that fires.
 *
 * Knowing which of your data is a stream and which is a snapshot is most of
 * designing a monitoring system.
 */
const POLL_MS = 2_000;

type Tab = "overview" | "flow" | "lab";

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
  const [tab, setTab] = useState<Tab>("overview");
  const stream = useEventStream(mode);

  // Tabs live in the URL, so a specific view is linkable — "here is the thing
  // I want you to look at" is most of what sharing a dashboard is for.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("tab");
    if (wanted === "flow" || wanted === "lab" || wanted === "overview") setTab(wanted);
  }, []);

  function selectTab(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }

  useEffect(() => {
    if (mode === "demo") return; // no backend to poll
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch("/api/fleet", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        setPolled(data.fleet);
        setStale(false);
      } catch {
        if (!cancelled) setStale(true);
      }
    }

    const id = setInterval(tick, POLL_MS);
    void tick();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [mode]);

  // Live mode polls each service; demo mode derives the same shape from the
  // simulator's replicas. Every component below is identical either way.
  const fleet = useMemo(
    () => (mode === "demo" ? fleetFromReplicas(stream.replicas) : polled),
    [mode, stream.replicas, polled],
  );

  const ready = fleet.filter((f) => f.status === "up").length;
  const languages = new Set(fleet.filter((f) => f.status !== "down").map((f) => f.def.language));
  const spansPerMin = stream.edges.filter((e) => e.at > Date.now() - 60_000).length;

  const TABS: Array<[Tab, string]> = [
    ["overview", "Overview"],
    ["flow", "Flow"],
    ["lab", "Lab"],
  ];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          label="services ready"
          value={`${ready}/${fleet.length}`}
          tone={ready === fleet.length ? "var(--color-live)" : "var(--color-warn)"}
        />
        <Metric label="languages live" value={`${languages.size}`} tone="var(--color-beam)" />
        <Metric label="spans / min" value={`${spansPerMin}`} tone="var(--color-beam)" />
        <Metric
          label="event stream"
          value={stream.connected ? "LIVE" : stale ? "DOWN" : "…"}
          tone={stream.connected ? "var(--color-live)" : "var(--color-dead)"}
        />
      </section>

      <nav className="flex gap-1 border-b border-edge">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => selectTab(id)}
            className={`-mb-px border-b-2 px-3.5 py-2 text-[13px] transition-colors ${
              tab === id
                ? "border-beam text-ink"
                : "border-transparent text-ink-faint hover:text-ink-dim"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {fleet.map((entry, i) => (
              <ServiceCard key={entry.def.id} entry={entry} index={i} />
            ))}
          </section>
          <ParityPanel fleet={fleet} />
        </>
      )}

      {tab === "flow" && (
        <>
          <Topology edges={stream.edges} fleet={fleet} />
          <QueueChart points={stream.queue} />
          <Timeline logs={stream.logs} mode={mode} />
        </>
      )}

      {tab === "lab" && (
        <>
          <ChaosLab mode={mode} />
          <section className="grid gap-3 lg:grid-cols-2">
            <Timeline logs={stream.logs} mode={mode} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {fleet.slice(0, 2).map((entry, i) => (
                <ServiceCard key={entry.def.id} entry={entry} index={i} />
              ))}
            </div>
          </section>
        </>
      )}

      <footer className="pb-8 text-center font-mono text-[10px] text-ink-faint">
        {mode === "demo"
          ? "demo mode · simulator running in your browser · no backend"
          : `push: /api/events · poll: /api/fleet every ${POLL_MS / 1000}s`}
      </footer>
    </div>
  );
}
