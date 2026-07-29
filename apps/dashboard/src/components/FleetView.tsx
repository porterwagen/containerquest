"use client";

import { useEffect, useState } from "react";
import type { FleetEntry } from "@/lib/fleet";
import { ServiceCard } from "./ServiceCard";
import { ParityPanel } from "./ParityPanel";

/**
 * Phase 1 polls on an interval. Phase 2 replaces this with a server-sent
 * event stream — polling cannot show you a container dying *between* ticks,
 * and those two seconds are exactly where the interesting things happen.
 */
const POLL_MS = 2_000;

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

export function FleetView({ initial }: { initial: FleetEntry[] }) {
  const [fleet, setFleet] = useState(initial);
  const [at, setAt] = useState<number | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch("/api/fleet", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        setFleet(data.fleet);
        setAt(data.at);
        setStale(false);
      } catch {
        // The dashboard is itself a container. Say so rather than freezing
        // on stale data pretending everything is fine.
        if (!cancelled) setStale(true);
      }
    }

    const id = setInterval(tick, POLL_MS);
    void tick();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const ready = fleet.filter((f) => f.status === "up").length;
  const languages = new Set(fleet.filter((f) => f.status !== "down").map((f) => f.def.language));
  const requests = fleet.reduce((sum, f) => sum + (f.meta?.requests ?? 0), 0);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          label="services ready"
          value={`${ready}/${fleet.length}`}
          tone={ready === fleet.length ? "var(--color-live)" : "var(--color-warn)"}
        />
        <Metric label="languages live" value={`${languages.size}`} tone="var(--color-beam)" />
        <Metric label="requests served" value={requests.toLocaleString()} />
        <Metric
          label="link"
          value={stale ? "STALE" : "LIVE"}
          tone={stale ? "var(--color-dead)" : "var(--color-live)"}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {fleet.map((entry, i) => (
          <ServiceCard key={entry.def.id} entry={entry} index={i} />
        ))}
      </section>

      <ParityPanel fleet={fleet} />

      <footer className="pb-8 text-center font-mono text-[10px] text-ink-faint">
        {at ? `last poll ${new Date(at).toLocaleTimeString()} · every ${POLL_MS / 1000}s` : "connecting…"}
      </footer>
    </div>
  );
}
