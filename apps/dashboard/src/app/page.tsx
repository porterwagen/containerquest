import { pollFleet } from "@/lib/fleet";
import { Shell } from "@/components/Shell";

// Telemetry is never prerendered — this page is meaningless without a live read.
export const dynamic = "force-dynamic";

export default async function Page() {
  // Demo builds ship with no backend at all, so skip the poll entirely —
  // otherwise every page load would wait on five connections that refuse.
  const demo = process.env.NEXT_PUBLIC_QUEST_MODE === "demo";
  const initial = demo ? [] : await pollFleet();

  return <Shell initial={initial} mode={demo ? "demo" : "live"} />;
}
