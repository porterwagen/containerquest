"use client";

import type { LogLine } from "@/lib/useEventStream";

/**
 * The event timeline.
 *
 * Fed by the Docker daemon's own event stream, so a container dying appears
 * here the instant it happens — not on the next poll. Those sub-second moments
 * between "died" and "started again" are exactly where the interesting
 * behavior lives, and polling reliably misses them.
 */

const LEVEL: Record<LogLine["level"], string> = {
  info: "var(--color-ink-faint)",
  warn: "var(--color-warn)",
  error: "var(--color-dead)",
};

export function Timeline({ logs, mode = "live" }: { logs: LogLine[]; mode?: "live" | "demo" }) {
  return (
    <section className="flex max-h-[340px] flex-col overflow-hidden rounded-xl border border-edge bg-panel">
      <header className="shrink-0 border-b border-edge px-5 py-3.5">
        <h2 className="text-[14px] font-medium text-ink">Event timeline</h2>
        <p className="mt-0.5 text-[12px] text-ink-faint">
          {mode === "demo"
            ? "Emitted by the in-browser simulator."
            : "Pushed by the Docker daemon, not polled."}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="px-5 py-6 text-center text-[11.5px] text-ink-faint">
            Nothing captured yet. Run the lesson action and watch the lifecycle appear here.
          </p>
        ) : (
          <ul className="divide-y divide-edge/60">
            {logs.map((line) => (
              <li key={line.id} className="flex gap-3 px-5 py-2 font-mono text-[11px]">
                <span className="shrink-0 text-ink-faint">
                  {new Date(line.at).toLocaleTimeString(undefined, { hour12: false })}
                </span>
                <span className="w-16 shrink-0 truncate" style={{ color: LEVEL[line.level] }}>
                  {line.service}
                </span>
                <span className="min-w-0 flex-1 break-words text-ink-dim">{line.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
