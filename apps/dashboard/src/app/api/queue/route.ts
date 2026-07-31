import { NextResponse } from "next/server";
import nodeProcess from "node:process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function workerUrl(): string {
  return nodeProcess.env.QUEST_IN_CONTAINER === "1"
    ? "http://worker:3001"
    : "http://localhost:3001";
}

/** Live queue depth for Lab co-located counters. */
export async function GET() {
  try {
    const res = await fetch(`${workerUrl()}/queue`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2_500),
      headers: { "x-quest-probe": "1" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `worker ${res.status}` }, { status: 502 });
    }
    return NextResponse.json(await res.json());
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message, waiting: 0, active: 0, completed: 0, failed: 0 },
      { status: 502 },
    );
  }
}
