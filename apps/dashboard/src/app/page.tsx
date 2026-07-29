import { pollFleet } from "@/lib/fleet";
import { FleetView } from "@/components/FleetView";

// Telemetry is never prerendered — this page is meaningless without a live read.
export const dynamic = "force-dynamic";

export default async function Page() {
  // Demo builds ship with no backend at all, so skip the poll entirely —
  // otherwise every page load would wait on five connections that refuse.
  const demo = process.env.NEXT_PUBLIC_QUEST_MODE === "demo";
  const initial = demo ? [] : await pollFleet();
  const mode = demo ? "simulator" : (process.env.QUEST_MODE ?? "compose");

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
          {demo && (
            <p className="mt-2 max-w-xl rounded-md border border-edge bg-panel px-3 py-2 text-[12px] leading-relaxed text-ink-faint">
              <span className="text-beam">Demo mode. </span>
              Everything is simulated in your browser — no server, no containers. The
              controls are real: crash a pod, scale a deployment, run a rolling
              deploy. Running it locally with <code className="text-ink-dim">make up</code> drives
              actual Docker containers through the same interface.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
          <span className="text-ink-faint">orchestrator</span>
          <span className="rounded border border-edge bg-panel px-2 py-1 text-beam">{mode}</span>
        </div>
      </header>

      <FleetView initial={initial} mode={demo ? "demo" : "live"} />
    </main>
  );
}
