"use client";

import { useEffect, useState } from "react";
import type { FleetEntry } from "@/lib/fleet";
import type { Mode } from "@/lib/control";
import { Course } from "./Course";
import { FleetView } from "./FleetView";
import { LESSONS, TOTAL_MINUTES } from "@/lessons";
import { RECORDED_AT } from "./Replay";

/**
 * Two halves of one thing.
 *
 * Learn is the course — the front door, where you start. Dashboard is the
 * instrument panel the lessons send you to once the readings mean something.
 *
 * The order matters. Landing on live telemetry when you don't yet know what a
 * container is teaches nothing; it just looks impressive, which is a different
 * and much less useful goal.
 */
export function Shell({ initial, mode }: { initial: FleetEntry[]; mode: Mode }) {
  const [view, setView] = useState<"learn" | "dashboard">("learn");
  const [done, setDone] = useState(0);

  useEffect(() => {
    const read = () => {
      try {
        const raw = window.localStorage.getItem("container-quest.progress.v1");
        setDone(raw ? (JSON.parse(raw).done?.length ?? 0) : 0);
      } catch {
        setDone(0);
      }
    };
    read();
    const id = setInterval(read, 1_500);
    return () => clearInterval(id);
  }, []);

  const pct = Math.round((done / LESSONS.length) * 100);

  return (
    <main className="mx-auto max-w-[1180px] px-5 py-7 sm:px-8">
      <header className="mb-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="pulse h-2 w-2 rounded-full bg-live text-live" />
              <h1 className="text-[22px] font-medium tracking-tight text-ink">Container Quest</h1>
            </div>
            <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-dim">
              Learn Docker and Kubernetes by running a real system and breaking it on purpose.
              Eight containers, five languages, {LESSONS.length} lessons, about {TOTAL_MINUTES}{" "}
              minutes so far.
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-edge bg-panel p-1">
            <Toggle active={view === "learn"} onClick={() => setView("learn")}>
              Learn
            </Toggle>
            <Toggle active={view === "dashboard"} onClick={() => setView("dashboard")}>
              Dashboard
            </Toggle>
          </div>
        </div>

        {mode === "demo" && (
          <div className="mt-4 rounded-lg border border-edge bg-panel px-4 py-3 text-[12.5px] leading-relaxed text-ink-faint">
            <span className="text-beam">You&apos;re reading the hosted version. </span>
            The lessons are the real thing. Every terminal output below was captured by actually
            running that command against a live system on{" "}
            {new Date(RECORDED_AT).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            — real hostnames, real image sizes, real errors. Nothing here is invented. What you
            can&apos;t do from a browser is run them yourself, so those play back as a recording.{" "}
            <span className="text-ink-dim">
              To do it for real: clone the repo and run <code className="font-mono">make up</code>.
            </span>
          </div>
        )}

        {view === "learn" && (
          <div className="mt-4 flex items-center gap-3">
            <div className="h-1 w-full max-w-xs overflow-hidden rounded-full bg-panel-2">
              <div
                className="h-full rounded-full bg-live transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono text-[11px] text-ink-faint">
              {done} of {LESSONS.length} complete
            </span>
          </div>
        )}
      </header>

      {view === "learn" ? (
        <Course onOpenDashboard={() => setView("dashboard")} mode={mode} />
      ) : (
        <>
          <p className="mb-5 max-w-2xl rounded-lg border border-edge bg-panel px-4 py-3 text-[12.5px] leading-relaxed text-ink-faint">
            {mode === "demo" ? (
              <>
                <span className="text-beam">Simulated. </span>
                This is the real dashboard, driven by a model running in your browser instead of by
                real containers — the same interface the live version uses. The controls genuinely
                work: crash a pod, scale a deployment, run a rolling deploy, and watch it respond.
              </>
            ) : (
              <>
                This is the instrument panel — live readings from the eight containers running on
                your machine. If a number here doesn&apos;t mean anything to you yet, that&apos;s
                expected. The lessons explain each one as you reach it.
              </>
            )}
          </p>
          <FleetView initial={initial} mode={mode} />
        </>
      )}
    </main>
  );
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3.5 py-1.5 text-[13px] transition-colors ${
        active ? "bg-panel-2 text-ink" : "text-ink-faint hover:text-ink-dim"
      }`}
    >
      {children}
    </button>
  );
}
