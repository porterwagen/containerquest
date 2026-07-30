"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Mode } from "@/lib/control";
import { LESSONS } from "@/lessons";
import { RECORDED_AT } from "./Replay";

/**
 * The chrome shared by /learn and /dashboard.
 *
 * The landing page deliberately does not use this. It has its own hero, and
 * wrapping it in the same header would make the front door look like a third
 * tab rather than the way in.
 */
export function AppHeader({ current, mode }: { current: "learn" | "dashboard"; mode: Mode }) {
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
    <header className="mb-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="pulse h-2 w-2 rounded-full bg-live text-live" />
            <h1 className="text-[22px] font-medium tracking-tight text-ink transition-colors group-hover:text-beam">
              Container Quest
            </h1>
          </Link>
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-dim">
            Learn Docker and Kubernetes by running a real system and breaking it on purpose.
            Eight containers, five languages, {LESSONS.length} lessons.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-edge bg-panel p-1">
          <Tab href="/learn" active={current === "learn"}>
            Learn
          </Tab>
          <Tab href="/dashboard" active={current === "dashboard"}>
            Dashboard
          </Tab>
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
          })}
          : real hostnames, real image sizes, real errors. Nothing here is invented. What you
          can&apos;t do from a browser is run them yourself, so those play back as a recording.{" "}
          <span className="text-ink-dim">
            To do it for real: clone the repo and run <code className="font-mono">make up</code>.
          </span>
        </div>
      )}

      {current === "learn" && (
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
  );
}

function Tab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-[13px] transition-colors ${
        active ? "bg-panel-2 text-ink" : "text-ink-faint hover:text-ink-dim"
      }`}
    >
      {children}
    </Link>
  );
}
