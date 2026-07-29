import { NextResponse } from "next/server";
import { pollFleet } from "@/lib/fleet";

// teach: This must never be cached or statically prerendered — it is live
// telemetry. Next would happily cache it at build time otherwise, and the
// dashboard would proudly display the state of the world from `docker build`.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const fleet = await pollFleet();
  return NextResponse.json(
    { at: Date.now(), fleet },
    { headers: { "cache-control": "no-store" } },
  );
}
