import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Liveness: the Node process is serving requests.
 *
 * Deliberately checks nothing else. If the dashboard's peers are down it
 * should still render — showing you *that they are down* is its entire job.
 * A liveness probe that failed whenever a dependency failed would restart
 * mission control precisely when you most needed to look at it.
 */
export async function GET() {
  return NextResponse.json({ ok: true, checks: {} }, { headers: { "cache-control": "no-store" } });
}
