import type { FleetEntry } from "@/lib/fleet";

const LANG_COLOR: Record<string, string> = {
  typescript: "var(--color-lang-typescript)",
  python: "var(--color-lang-python)",
  go: "var(--color-lang-go)",
  c: "var(--color-lang-c)",
  infra: "var(--color-lang-infra)",
};

const STATUS = {
  up: { color: "var(--color-live)", label: "READY" },
  unready: { color: "var(--color-warn)", label: "NOT READY" },
  down: { color: "var(--color-dead)", label: "DOWN" },
} as const;

function Stat({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{label}</div>
      <div className={`truncate text-[13px] text-ink-dim ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function uptime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

export function ServiceCard({
  entry,
  index,
  highlight = false,
}: {
  entry: FleetEntry;
  index: number;
  /** Briefly emphasize after a Lab action on this service. */
  highlight?: boolean;
}) {
  const { def, meta, status, latencyMs, error } = entry;
  const s = STATUS[status];
  const lang = LANG_COLOR[def.language] ?? LANG_COLOR.infra;

  return (
    <article
      className="fade-up relative overflow-hidden rounded-xl border bg-panel p-4 transition-colors hover:border-edge-bright"
      style={{
        animationDelay: `${index * 55}ms`,
        borderColor: highlight ? "var(--color-beam)" : "var(--color-edge)",
        boxShadow: highlight ? "0 0 0 1px color-mix(in oklab, var(--color-beam) 45%, transparent)" : undefined,
      }}
    >
      {/* Language stripe — the same color follows this service everywhere. */}
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: lang, opacity: 0.55 }} />

      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-medium text-ink">{def.label}</h3>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              className="rounded px-1.5 py-px font-mono text-[10px] uppercase tracking-wider"
              style={{ color: lang, background: `color-mix(in oklab, ${lang} 14%, transparent)` }}
            >
              {def.language}
            </span>
            <span className="font-mono text-[10px] text-ink-faint">:{def.port}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5" title={error ?? s.label}>
          <span
            className={`h-1.5 w-1.5 rounded-full ${status === "up" ? "pulse" : ""}`}
            style={{ background: s.color, color: s.color }}
          />
          <span className="font-mono text-[10px] tracking-wide" style={{ color: s.color }}>
            {s.label}
          </span>
        </div>
      </header>

      <p className="mt-2.5 line-clamp-2 text-[12px] leading-relaxed text-ink-faint">{def.role}</p>

      {meta ? (
        <div className="mt-3.5 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-edge pt-3">
          {/* Hostname survives a restart — Docker restarts the SAME container,
              so only uptime resets. It changes when the container is REPLACED
              (recreated, or rescheduled as a new pod). Watching which of those
              two happened is how you tell a restart from a reschedule. */}
          <Stat label="container" value={meta.hostname} mono />
          <Stat label="pod" value={meta.podName ?? "none (Docker)"} mono />
          <Stat label="version" value={`v${meta.version}`} mono />
          <Stat label="uptime" value={uptime(meta.uptimeSec)} mono />
          <Stat label="requests" value={meta.requests.toLocaleString()} mono />
          <Stat label="pid / rtt" value={`${meta.pid} · ${latencyMs ?? "n/a"}ms`} mono />
        </div>
      ) : (
        <div className="mt-3.5 border-t border-edge pt-3">
          <div className="font-mono text-[11px] text-dead">{error ?? "no response"}</div>
          <div className="mt-1 text-[11px] text-ink-faint">
            Nothing answered on {def.id}:{def.port}
          </div>
        </div>
      )}
    </article>
  );
}
