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
            This is the real dashboard, driven by a model running in your browser instead of by
            real containers: the same interface the live version uses. The controls genuinely
            work: crash a pod, scale a deployment, run a rolling deploy, and watch it respond.
          </>
        ) : (
          <>
            This is the instrument panel: live readings from the eight containers running on your
            machine. If a number here doesn&apos;t mean anything to you yet, that&apos;s expected.
            The lessons explain each one as you reach it.
          </>
        )}
      </p>

      <FleetView initial={initial} mode={mode} />
    </main>
  );
}
