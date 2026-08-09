import os
import time
from datetime import UTC, datetime

from fastapi import FastAPI
from pydantic import BaseModel, Field

APP_VERSION = os.getenv("APP_VERSION", "dev")
WORK_DELAY_MS = int(os.getenv("WORK_DELAY_MS", "300"))

app = FastAPI(title="quest-ship worker", version=APP_VERSION)


class WorkIn(BaseModel):
    jobId: str = ""
    message: str = Field(min_length=1, max_length=500)


@app.get("/healthz")
def healthz():
    return {"service": "worker", "status": "ok", "version": APP_VERSION}


@app.post("/v1/work")
def work(body: WorkIn):
    started = time.perf_counter()
    time.sleep(max(WORK_DELAY_MS, 0) / 1000.0)
    out = " ".join(reversed(body.message.split()))
    return {
        "jobId": body.jobId,
        "output": f"[worker:{APP_VERSION}] {out}",
        "workerVersion": APP_VERSION,
        "workerMs": int((time.perf_counter() - started) * 1000),
        "at": datetime.now(UTC).isoformat(),
    }
