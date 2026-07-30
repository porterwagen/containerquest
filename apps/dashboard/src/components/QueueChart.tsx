"use client";

import type { QueuePoint } from "@/lib/useEventStream";

/**
 * Queue depth over time.
 *
 * The most legible argument for horizontal scaling there is. Enqueue 200 jobs
 * and watch the line climb then drain; double the workers and the same 200
 * jobs drain in roughly half the time. No diagram of a load balancer teaches
 * that as well as watching the slope change.
 */
export function QueueChart({ points }: { points: QueuePoint[] }) {
  const latest = points.at(-1);
  const maxDepth = Math.max(10, ...points.map((p) => p.depth));

  // Inline SVG sparkline — a charting library would be more code than this.
  const path =
    points.length > 1
      ? points
          .map((p, i) => {
            const x = (i / (points.length - 1)) * 100;
            const y = 100 - (p.depth / maxDepth) * 100;
            return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
          })
          .join(" ")
      : "";

  return (
    <section className="overflow-hidden rounded-xl border border-edge bg-panel">
      <header className="flex items-center justify-between border-b border-edge px-5 py-3.5">
        <div>
          <h2 className="text-[14px] font-medium text-ink">Queue depth</h2>
          <p className="mt-0.5 text-[12px] text-ink-faint">
            Jobs waiting in Redis, sampled once a second.
          </p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">waiting</div>
            <div className="font-mono text-lg text-warn">{latest?.depth ?? 0}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">active</div>
            <div className="font-mono text-lg text-beam">{latest?.active ?? 0}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">done</div>
            <div className="font-mono text-lg text-live">{latest?.completed ?? 0}</div>
          </div>
        </div>
      </header>

      <div className="relative h-28 w-full px-2 py-2">
        {points.length < 2 ? (
          <div className="flex h-full items-center justify-center text-[11.5px] text-ink-faint">
            Waiting for samples. Queue 200 jobs in the Lab to see this move.
          </div>
        ) : (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
            <path
              d={`${path} L 100 100 L 0 100 Z`}
              fill="var(--color-warn)"
              fillOpacity="0.1"
            />
            <path
              d={path}
              fill="none"
              stroke="var(--color-warn)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
      </div>
    </section>
  );
}
