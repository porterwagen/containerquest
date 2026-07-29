import os from "node:os";
import { NextResponse } from "next/server";
import { ServiceMeta } from "@quest/contracts";

export const dynamic = "force-dynamic";

const start = Date.now();
let requests = 0;

/**
 * The dashboard implements the same contract it consumes.
 *
 * It is a container in the fleet like any other — it can be scaled, crashed,
 * and rolled out, and mission control should never be the one component that
 * pretends to sit outside the system it monitors.
 */
export async function GET() {
  requests++;

  const meta = ServiceMeta.parse({
    service: "dashboard",
    language: "typescript",
    version: process.env.SERVICE_VERSION || "1.0.0",
    gitSha: process.env.GIT_SHA || "dev",
    buildTime: process.env.BUILD_TIME || "unknown",
    hostname: os.hostname(),
    podName: process.env.POD_NAME || null,
    nodeName: process.env.NODE_NAME || null,
    namespace: process.env.POD_NAMESPACE || null,
    uptimeSec: Math.floor((Date.now() - start) / 1000),
    requests,
    pid: process.pid,
  });

  return NextResponse.json(meta, { headers: { "cache-control": "no-store" } });
}
