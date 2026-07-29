"use client";

import { useEffect, useMemo, useState } from "react";
import type { TraceEdge } from "@/lib/useEventStream";
import type { FleetEntry } from "@/lib/fleet";

/**
 * The topology graph.
 *
 * Every particle you see is a real HTTP request that actually happened —
 * reconstructed from spans that services recorded as they called each other.
 * Nothing here is on a timer or faked. If the graph is still, the system is
 * idle; if an edge glows red, that call really did fail.
 *
 * Hand-rolled SVG rather than a graph library: six nodes in fixed positions
 * need no force simulation, and the whole thing stays readable.
 */

const NODES: Record<string, { x: number; y: number; label: string; lang: string }> = {
  dashboard: { x: 50, y: 12, label: "Dashboard", lang: "typescript" },
  util: { x: 22, y: 44, label: "Utility", lang: "go" },
  worker: { x: 78, y: 44, label: "Worker", lang: "typescript" },
  ai: { x: 36, y: 78, label: "AI", lang: "python" },
  compute: { x: 64, y: 78, label: "Compute", lang: "c" },
};

const LANG_COLOR: Record<string, string> = {
  typescript: "#4a9eff",
  python: "#ffd43b",
  go: "#00b8d4",
  c: "#c792ea",
};

/** Edges that exist structurally, drawn faintly even with no traffic. */
const STATIC_EDGES: Array<[string, string]> = [
  ["dashboard", "util"],
  ["dashboard", "worker"],
  ["dashboard", "ai"],
  ["dashboard", "compute"],
  ["util", "ai"],
  ["util", "compute"],
  ["worker", "ai"],
];

interface Particle {
  key: string;
  from: string;
  to: string;
  failed: boolean;
  born: number;
}

const FLIGHT_MS = 1_100;

export function Topology({ edges, fleet }: { edges: TraceEdge[]; fleet: FleetEntry[] }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [now, setNow] = useState(() => Date.now());

  // Turn newly-arrived spans into particles in flight.
  useEffect(() => {
    if (edges.length === 0) return;
    const recent = edges.slice(-12);
    setParticles((prev) => {
      const seen = new Set(prev.map((p) => p.key));
      const added = recent
        .filter((e) => !seen.has(e.key) && NODES[e.from] && NODES[e.to])
        .map((e) => ({
          key: e.key,
          from: e.from,
          to: e.to,
          failed: e.status === 0 || e.status >= 400,
          born: Date.now(),
        }));
      return [...prev, ...added].slice(-40);
    });
  }, [edges]);

  // One animation clock for every particle, rather than a timer each.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setNow(Date.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Retire particles that have landed.
  useEffect(() => {
    const id = setInterval(() => {
      const cutoff = Date.now() - FLIGHT_MS;
      setParticles((prev) => prev.filter((p) => p.born > cutoff));
    }, 500);
    return () => clearInterval(id);
  }, []);

  const statusOf = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of fleet) map[f.def.id] = f.status;
    return map;
  }, [fleet]);

  /** Traffic per edge over the recent window, used for line weight. */
  const heat = useMemo(() => {
    const counts: Record<string, number> = {};
    const cutoff = Date.now() - 10_000;
    for (const e of edges) {
      if (e.at < cutoff) continue;
      counts[`${e.from}->${e.to}`] = (counts[`${e.from}->${e.to}`] ?? 0) + 1;
    }
    return counts;
  }, [edges]);

  return (
    <section className="overflow-hidden rounded-xl border border-edge bg-panel">
      <header className="flex items-center justify-between border-b border-edge px-5 py-3.5">
        <div>
          <h2 className="text-[14px] font-medium text-ink">Live request flow</h2>
          <p className="mt-0.5 text-[12px] text-ink-faint">
            Every particle is one real HTTP call, reconstructed from trace spans.
          </p>
        </div>
        <span className="font-mono text-[10px] text-ink-faint">
          {particles.length} in flight
        </span>
      </header>

      {/* Fixed height rather than an aspect ratio: on a wide screen 16:9 left
          a screenful of empty canvas below the graph. */}
      <div className="relative h-[360px] w-full sm:h-[400px]">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {STATIC_EDGES.map(([from, to]) => {
            const a = NODES[from]!;
            const b = NODES[to]!;
            const weight = heat[`${from}->${to}`] ?? 0;
            return (
              <line
                key={`${from}-${to}`}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={weight > 0 ? "var(--color-beam)" : "var(--color-edge-bright)"}
                strokeWidth={weight > 0 ? 0.22 : 0.12}
                strokeOpacity={weight > 0 ? Math.min(0.28 + weight * 0.06, 0.8) : 0.5}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

        </svg>

        {/* Particles are HTML, not SVG. The viewBox above uses
            preserveAspectRatio="none" so the lines stretch to fill any
            container — which would squash an SVG <circle> into an ellipse.
            Positioning divs by percentage keeps them perfectly round. */}
        {particles.map((p) => {
          const a = NODES[p.from]!;
          const b = NODES[p.to]!;
          const t = Math.min((now - p.born) / FLIGHT_MS, 1);
          // Ease-out: fast departure, gentle arrival. Reads as intent rather
          // than as a constant-speed marching dot.
          const e = 1 - Math.pow(1 - t, 2.2);
          const color = p.failed ? "var(--color-dead)" : "var(--color-beam)";
          return (
            <span
              key={p.key}
              className="pointer-events-none absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${a.x + (b.x - a.x) * e}%`,
                top: `${a.y + (b.y - a.y) * e}%`,
                background: color,
                boxShadow: `0 0 6px ${color}`,
                opacity: t > 0.88 ? (1 - t) * 8.3 : 1,
              }}
            />
          );
        })}

        {Object.entries(NODES).map(([id, node]) => {
          const status = statusOf[id] ?? "down";
          const color = LANG_COLOR[node.lang] ?? "#7d8896";
          const ring =
            status === "up"
              ? "var(--color-live)"
              : status === "unready"
                ? "var(--color-warn)"
                : "var(--color-dead)";
          return (
            <div
              key={id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <div
                className="flex flex-col items-center gap-1 rounded-lg border bg-panel-2 px-2.5 py-1.5 transition-colors"
                style={{ borderColor: ring }}
              >
                <span className="font-mono text-[10px] leading-none" style={{ color }}>
                  {node.label}
                </span>
                <span
                  className={`h-1 w-1 rounded-full ${status === "up" ? "pulse" : ""}`}
                  style={{ background: ring, color: ring }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
