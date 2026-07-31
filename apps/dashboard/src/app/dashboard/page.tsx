import { pollFleet } from "@/lib/fleet";
import { AppHeader } from "@/components/AppHeader";
import { FleetView } from "@/components/FleetView";

// Telemetry is never prerendered: this page is meaningless without a live read.
// It is also the only route that pays this cost. The landing page and the
// course are static, because neither needs to know what the fleet is doing.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Demo builds ship with no backend at all, so skip the poll entirely.
  // Otherwise every page load would wait on five connections that refuse.
  const demo = process.env.NEXT_PUBLIC_QUEST_MODE === "demo";
  const initial = demo ? [] : await pollFleet();
  const mode = demo ? "demo" : "live";

  return (
    <main className="mx-auto max-w-[1180px] px-5 py-7 sm:px-8">
      <AppHeader current="dashboard" mode={mode} />

      <p className="mb-5 max-w-2xl rounded-lg border border-edge bg-panel px-4 py-3 text-[12.5px] leading-relaxed text-ink-faint">
        {demo ? (
          <>
            <span className="text-beam">Simulated. </span>
            Overview is always the scoreboard. Experiments appear only when the matching lesson is
            current or complete, and Kubernetes experiments use the in-browser simulator.
          </>
        ) : (
          <>
            <span className="text-beam">Overview </span>
            is always the fleet scoreboard. Named experiments unlock from the lessons that use
            them, so every action has a before, an after, and one conclusion.
          </>
        )}
      </p>

      <FleetView initial={initial} mode={mode} />
    </main>
  );
}
