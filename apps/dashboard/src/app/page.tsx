import { pollFleet } from "@/lib/fleet";
import { FleetView } from "@/components/FleetView";

// Telemetry is never prerendered — this page is meaningless without a live read.
export const dynamic = "force-dynamic";

export default async function Page() {
  // Server-rendered first paint, so the dashboard arrives with real data
  // rather than a skeleton that fills in a beat later.
  const initial = await pollFleet();
  const mode = process.env.QUEST_MODE ?? "compose";

  return (
    <main className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="relative h-2 w-2">
              <span className="pulse absolute inset-0 rounded-full bg-live text-live" />
            </div>
            <h1 className="text-[22px] font-medium tracking-tight text-ink">Container Quest</h1>
          </div>
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-ink-dim">
            Five languages, one platform. Docker and Kubernetes never learn which is which —
            they just run Linux processes.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
          <span className="text-ink-faint">orchestrator</span>
          <span className="rounded border border-edge bg-panel px-2 py-1 text-beam">{mode}</span>
        </div>
      </header>

      <FleetView initial={initial} />
    </main>
  );
}
