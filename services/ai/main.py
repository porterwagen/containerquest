"""
Container Quest — AI service.

Python and FastAPI, standing in for the workload every platform eventually
grows: slow, memory-hungry, and CPU-bound in bursts. The inference here is
simulated (deterministic hashing, not a real model), because the lesson is
about how such a service is packaged and scheduled — not about the model.

It is the interesting neighbour in the fleet: the Go service starts in
milliseconds and the C service is 187 kB, while this one drags an entire
language runtime and its site-packages along. The Ledger view makes that
contrast concrete.
"""

from __future__ import annotations

import asyncio
import hashlib
import math
import os
import socket
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

START = time.monotonic()
STATE = {"requests": 0, "unready_until": 0.0, "slow_until": 0.0}


def env(key: str, fallback: str) -> str:
    return os.environ.get(key) or fallback


def nullable(key: str) -> str | None:
    """Absent under Docker, populated by the Downward API under Kubernetes."""
    return os.environ.get(key) or None


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"ai (python) listening on :{env('PORT', '8000')} pid={os.getpid()}", flush=True)
    yield


app = FastAPI(title="Container Quest — AI", lifespan=lifespan)


@app.middleware("http")
async def instrument(request, call_next):
    # Dashboard polls announce themselves so they don't inflate the count
    # they are trying to report. Monitoring should not move the needle.
    if not request.headers.get("x-quest-probe"):
        STATE["requests"] += 1
    if time.monotonic() < STATE["slow_until"]:
        await asyncio.sleep(2.0)
    t0 = time.monotonic()
    response = await call_next(request)
    ms = round((time.monotonic() - t0) * 1000)
    print(f"{request.method} {request.url.path} {response.status_code} {ms}ms", flush=True)
    return response


# Liveness: the process is up. Nothing about dependencies belongs here —
# a shared database hiccup must not restart every pod that touches it.
@app.get("/healthz")
async def healthz() -> dict:
    return {"ok": True, "checks": {}}


# Readiness: should traffic come to me? Dependency checks belong here.
@app.get("/readyz")
async def readyz() -> Response:
    if time.monotonic() < STATE["unready_until"]:
        return JSONResponse(
            status_code=503,
            content={"ok": False, "checks": {"self": False}, "detail": "chaos: unready"},
        )
    return JSONResponse(status_code=200, content={"ok": True, "checks": {"self": True}})


@app.get("/meta")
async def meta() -> dict:
    return {
        "service": "ai",
        "language": "python",
        "version": env("SERVICE_VERSION", "1.0.0"),
        "gitSha": env("GIT_SHA", "dev"),
        "buildTime": env("BUILD_TIME", "unknown"),
        "hostname": socket.gethostname(),
        "podName": nullable("POD_NAME"),
        "nodeName": nullable("NODE_NAME"),
        "namespace": nullable("POD_NAMESPACE"),
        "uptimeSec": int(time.monotonic() - START),
        "requests": STATE["requests"],
        "pid": os.getpid(),
    }


class EmbedRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    dims: int = Field(default=16, ge=4, le=256)


@app.post("/embed")
async def embed(req: EmbedRequest) -> dict:
    """A deterministic fake embedding: same text always yields the same vector.

    Real embeddings need a model of several hundred megabytes, which is
    precisely why AI services have such large images and slow cold starts.
    """
    digest = hashlib.sha256(req.text.encode()).digest()
    vector = [
        round(math.sin((digest[i % len(digest)] + i) / 17.0), 6) for i in range(req.dims)
    ]
    norm = math.sqrt(sum(v * v for v in vector)) or 1.0
    await asyncio.sleep(0.05)  # models are never instant
    return {
        "model": "quest-mock-embed-v1",
        "dims": req.dims,
        "vector": [round(v / norm, 6) for v in vector],
    }


class InferRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    work: int = Field(default=200_000, ge=1, le=20_000_000)


@app.post("/infer")
async def infer(req: InferRequest) -> dict:
    """Burns real CPU so the dashboard's resource meters show something honest.

    Note this blocks the event loop on purpose. Python's GIL means one CPU-bound
    request stalls every other request in the process — which is exactly why
    you scale Python horizontally with more replicas instead of more threads.
    That constraint is the reason the Scale control exists.
    """
    t0 = time.monotonic()
    acc = 0.0
    for i in range(req.work):
        acc += math.sqrt(i)
    return {
        "model": "quest-mock-infer-v1",
        "tokens": len(req.prompt.split()),
        "checksum": round(acc, 3),
        "ms": round((time.monotonic() - t0) * 1000),
    }


class ChaosRequest(BaseModel):
    action: str
    durationMs: int = Field(default=15_000, ge=1, le=120_000)


@app.post("/chaos")
async def chaos(req: ChaosRequest) -> dict:
    deadline = time.monotonic() + req.durationMs / 1000

    if req.action == "crash":
        # os._exit skips cleanup and finally-blocks entirely — a real crash,
        # not a graceful shutdown. The supervisor sees a non-zero exit.
        print("chaos: crash requested, exiting 1", flush=True)

        async def die() -> None:
            await asyncio.sleep(0.05)
            os._exit(1)

        asyncio.create_task(die())
    elif req.action == "unready":
        STATE["unready_until"] = deadline
    elif req.action == "slow":
        STATE["slow_until"] = deadline
    elif req.action == "hang":
        STATE["unready_until"] = deadline
        STATE["slow_until"] = deadline

    return {"ok": True, "action": req.action}
