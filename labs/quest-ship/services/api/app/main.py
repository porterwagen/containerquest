import os
import time
import uuid
from datetime import UTC, datetime

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

APP_VERSION = os.getenv("APP_VERSION", "dev")
WORKER_URL = os.getenv("WORKER_URL", "http://worker:8001").rstrip("/")

app = FastAPI(title="quest-ship api", version=APP_VERSION)


class JobIn(BaseModel):
    message: str = Field(min_length=1, max_length=500)


@app.get("/healthz")
def healthz():
    return {"service": "api", "status": "ok", "version": APP_VERSION}


@app.post("/v1/jobs")
async def jobs(body: JobIn):
    job_id = f"job_{uuid.uuid4().hex[:8]}"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                f"{WORKER_URL}/v1/work",
                json={"jobId": job_id, "message": body.message},
            )
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="worker unreachable") from exc
    return {
        "jobId": job_id,
        "path": ["browser", "web", "api", "worker"],
        "input": body.message,
        "output": data.get("output", ""),
        "apiVersion": APP_VERSION,
        "workerVersion": data.get("workerVersion", "?"),
        "at": datetime.now(UTC).isoformat(),
        "workerMs": data.get("workerMs", 0),
    }
