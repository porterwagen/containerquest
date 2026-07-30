"use client";

import { useState } from "react";
import { SERVICES } from "@quest/contracts";
import { control, type Mode } from "@/lib/control";

/**
 * The Lab.
 *
 * Each control carries a why-panel, because a button that breaks something is
 * only educational if you know what it proved. The pairing that matters most
 * is crash vs unready: same-looking buttons, completely different mechanisms,
 * and the difference is the whole reason Kubernetes has two probes.
 */

interface Control {
  id: string;
  label: string;
  tone: "danger" | "warn" | "beam" | "neutral";
  why: string;
  watch: string;
}

const CHAOS: Control[] = [
  {
    id: "crash",
    label: "Crash",
    tone: "danger",
    why: "The process calls exit(1). No cleanup, no graceful shutdown, exactly what a real crash looks like to whatever is supervising it.",
    watch:
      "Uptime resets to 0 and the restart count goes up, but the hostname stays the SAME. Docker restarts the same container rather than replacing it. Kubernetes behaves identically for a crashed container inside a pod. A NEW identity only appears when the pod itself is replaced, which is what you will see in Chapter 5 when you delete one.",
  },
  {
    id: "unready",
    label: "Make unready",
    tone: "warn",
    why: "The process stays perfectly healthy but answers /readyz with 503. Nothing is broken; the service is simply declining traffic.",
    watch:
      "The card turns amber but the hostname and uptime DO NOT change. Kubernetes would pull it from the Service endpoints without restarting it. This is the difference between liveness and readiness, in one click.",
  },
  {
    id: "slow",
    label: "Add latency",
    tone: "warn",
    why: "Every response is delayed by 2 seconds. The most common real-world failure, and the one that hurts most: nothing is down, everything is late.",
    watch:
      "Round-trip time on the card climbs, and particles crossing that edge slow down. Callers with tight timeouts start failing before the slow service does.",
  },
  {
    id: "hang",
    label: "Hang",
    tone: "danger",
    why: "The service stops answering entirely without exiting. A deadlock, an exhausted thread pool, a stuck syscall.",
    watch:
      "This is why liveness probes exist. A crashed process is easy: the supervisor notices immediately. A hung one looks alive from the outside, so only a probe that expects an answer can catch it. Watch the card stay green while every edge into it turns red and calls start timing out. Nothing restarts it.",
  },
];

const TONE: Record<Control["tone"], string> = {
  danger: "var(--color-dead)",
  warn: "var(--color-warn)",
  beam: "var(--color-beam)",
  neutral: "var(--color-ink-dim)",
};

export function ChaosLab({ mode = "live" }: { mode?: Mode }) {
  const [target, setTarget] = useState("util");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  async function run(action: string, value?: string | number, label = action) {
    setBusy(label);
    setNote(null);
    try {
      const out = await control(mode, action, target, value);
      setNote({
        text:
          action === "traffic"
            ? `Fired ${out.traces} traces → ${out.spans} spans. Watch the graph.`
            : action === "enqueue"
              ? `Queued ${out.enqueued} jobs. Watch the depth chart drain.`
              : `${label} applied to ${target}.`,
        bad: false,
      });
    } catch (err) {
      setNote({ text: (err as Error).message, bad: true });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-edge bg-panel">
      <header className="border-b border-edge px-5 py-3.5">
        <h2 className="text-[14px] font-medium text-ink">The Lab</h2>
        <p className="mt-0.5 text-[12px] text-ink-faint">
          Break things on purpose. Every control explains what it proves.
        </p>
      </header>

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">target</span>
          {SERVICES.map((s) => (
            <button
              key={s.id}
              onClick={() => setTarget(s.id)}
              className={`rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                target === s.id
                  ? "border-beam bg-panel-2 text-beam"
                  : "border-edge text-ink-dim hover:border-edge-bright hover:text-ink"
              }`}
            >
              {s.id}
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {CHAOS.map((c) => (
            <div key={c.id} className="rounded-lg border border-edge bg-panel-2">
              <div className="flex items-center justify-between gap-2 p-2.5">
                <button
                  onClick={() => run("chaos", c.id, c.label)}
                  disabled={busy !== null}
                  className="rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition-opacity disabled:opacity-40"
                  style={{ borderColor: TONE[c.tone], color: TONE[c.tone] }}
                >
                  {busy === c.label ? "…" : c.label}
                </button>
                <button
                  onClick={() => setOpen(open === c.id ? null : c.id)}
                  className="text-[11px] text-ink-faint transition-colors hover:text-ink-dim"
                  aria-expanded={open === c.id}
                >
                  {open === c.id ? "hide" : "why?"}
                </button>
              </div>

              {open === c.id && (
                <div className="space-y-2 border-t border-edge px-3 py-2.5 text-[11.5px] leading-relaxed">
                  <p className="text-ink-dim">{c.why}</p>
                  <p className="text-ink-faint">
                    <span className="text-beam">What to watch: </span>
                    {c.watch}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-edge pt-4">
          <Action
            label={mode === "demo" ? "Delete pod" : "Restart container"}
            busy={busy}
            onClick={() => run("restart", undefined, mode === "demo" ? "Delete pod" : "Restart container")}
          />
          <Action label="Send 8 traced requests" busy={busy} onClick={() => run("traffic", 8, "Send 8 traced requests")} />
          <Action label="Queue 200 jobs" busy={busy} onClick={() => run("enqueue", 200, "Queue 200 jobs")} />
          <Action label="Scale to 4" busy={busy} onClick={() => run("scale", 4, "Scale to 4")} />
          <Action label="Scale to 1" busy={busy} onClick={() => run("scale", 1, "Scale to 1")} />
          {mode === "demo" && (
            <Action
              label="Rolling deploy → v1.1.0"
              busy={busy}
              onClick={() => run("rollout", "1.1.0", "Rolling deploy → v1.1.0")}
            />
          )}
        </div>

        {mode === "live" && (
          <p className="rounded-md border border-edge bg-panel-2 px-3 py-2 text-[11.5px] leading-relaxed text-ink-faint">
            <span className="text-warn">Compose mode. </span>
            Scaling and rolling deploys will fail here, and the error message explains
            why. Both are Kubernetes capabilities that Docker Compose simply does not
            have. Chapter 5 runs these against a real cluster, where they work.
          </p>
        )}

        {note && (
          <p
            className="rounded-md border px-3 py-2 font-mono text-[11px] leading-relaxed"
            style={{
              borderColor: note.bad ? "var(--color-dead)" : "var(--color-edge)",
              color: note.bad ? "var(--color-dead)" : "var(--color-ink-dim)",
            }}
          >
            {note.text}
          </p>
        )}
      </div>
    </section>
  );
}

function Action({
  label,
  busy,
  onClick,
}: {
  label: string;
  busy: string | null;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy !== null}
      className="rounded-md border border-edge bg-panel-2 px-2.5 py-1.5 font-mono text-[11px] text-ink-dim transition-colors hover:border-edge-bright hover:text-ink disabled:opacity-40"
    >
      {busy === label ? "…" : label}
    </button>
  );
}
