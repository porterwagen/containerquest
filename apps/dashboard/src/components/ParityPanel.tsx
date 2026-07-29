"use client";

import { useState } from "react";
import type { FleetEntry } from "@/lib/fleet";

/**
 * The thesis, made checkable.
 *
 * One row per field in the contract, one column per service. Four languages
 * that share not one line of code produce the same keys in the same shape —
 * so the platform above them never needs to know which is which.
 */

const FIELDS = [
  { key: "language", note: "the only field that differs by design" },
  { key: "version", note: "changes during a rolling deploy" },
  { key: "hostname", note: "container id — survives a restart, changes on replacement" },
  { key: "podName", note: "null under Docker, set under Kubernetes" },
  { key: "uptimeSec", note: "resets to 0 on restart — the reliable crash signal" },
  { key: "requests", note: "counted in-process, so it resets too" },
  { key: "pid", note: "almost always 1 — your app IS the container" },
] as const;

const LANG_COLOR: Record<string, string> = {
  typescript: "var(--color-lang-typescript)",
  python: "var(--color-lang-python)",
  go: "var(--color-lang-go)",
  c: "var(--color-lang-c)",
};

export function ParityPanel({ fleet }: { fleet: FleetEntry[] }) {
  const [showRaw, setShowRaw] = useState(false);
  const live = fleet.filter((f) => f.meta);

  if (live.length === 0) {
    return (
      <section className="rounded-xl border border-edge bg-panel p-5">
        <p className="text-[13px] text-ink-faint">
          No services responding yet. Run <code className="font-mono text-ink-dim">make up</code>.
        </p>
      </section>
    );
  }

  const languages = new Set(live.map((f) => f.def.language));

  return (
    <section className="overflow-hidden rounded-xl border border-edge bg-panel">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-edge px-5 py-3.5">
        <div>
          <h2 className="text-[14px] font-medium text-ink">
            {languages.size} languages, one contract
          </h2>
          <p className="mt-0.5 text-[12px] text-ink-faint">
            Same keys, same types, no shared code. This is the whole argument.
          </p>
        </div>
        <button
          onClick={() => setShowRaw((v) => !v)}
          className="rounded-md border border-edge bg-panel-2 px-2.5 py-1.5 font-mono text-[11px] text-ink-dim transition-colors hover:border-edge-bright hover:text-ink"
        >
          {showRaw ? "table view" : "raw json"}
        </button>
      </header>

      {showRaw ? (
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {live.map((f) => (
            <div key={f.def.id} className="overflow-hidden rounded-lg border border-edge bg-void">
              <div
                className="border-b border-edge px-3 py-1.5 font-mono text-[11px]"
                style={{ color: LANG_COLOR[f.def.language] }}
              >
                GET {f.def.id}:{f.def.port}/meta
              </div>
              <pre className="overflow-x-auto p-3 font-mono text-[10.5px] leading-relaxed text-ink-dim">
                {JSON.stringify(f.meta, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-edge">
                <th className="px-5 py-2 text-[10px] font-normal uppercase tracking-[0.14em] text-ink-faint">
                  field
                </th>
                {live.map((f) => (
                  <th
                    key={f.def.id}
                    className="px-3 py-2 font-mono text-[11px] font-normal"
                    style={{ color: LANG_COLOR[f.def.language] }}
                  >
                    {f.def.id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FIELDS.map(({ key, note }) => (
                <tr key={key} className="border-b border-edge/60 last:border-0">
                  <td className="px-5 py-2 align-top">
                    <div className="font-mono text-[12px] text-ink-dim">{key}</div>
                    <div className="text-[10.5px] text-ink-faint">{note}</div>
                  </td>
                  {live.map((f) => {
                    const value = f.meta?.[key as keyof typeof f.meta];
                    return (
                      <td
                        key={f.def.id}
                        className="px-3 py-2 align-top font-mono text-[11.5px] text-ink-dim"
                      >
                        {value === null ? (
                          <span className="text-ink-faint italic">null</span>
                        ) : (
                          String(value)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
