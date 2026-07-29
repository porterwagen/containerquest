import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Readiness: can this instance serve the UI?
 *
 * For the dashboard that is the same question as liveness, because it holds no
 * state and degrades gracefully when peers vanish. Saying so explicitly is
 * better than omitting the route — a missing /readyz reads to any orchestrator
 * as a hard failure, which is exactly the bug this file fixed.
 */
export async function GET() {
  return NextResponse.json(
    { ok: true, checks: { self: true } },
    { headers: { "cache-control": "no-store" } },
  );
}
