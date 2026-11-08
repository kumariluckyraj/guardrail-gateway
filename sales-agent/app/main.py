import asyncio
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import settings
from app.graph import execute_run
from app.mock_tools.router import router as mock_router
from app.mock_tools.router import view_router

app = FastAPI(title="Sales Agent + Mock Tools", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(mock_router, prefix="/mock")
app.include_router(view_router, prefix="/mock")

RUNS: dict[str, dict] = {}
_TASKS: set[asyncio.Task] = set()  # keep references so tasks aren't garbage collected
MAX_STORED_RUNS = 50


class RunRequest(BaseModel):
    task: str = Field(min_length=3, max_length=1000)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/run", status_code=202)
async def start_run(body: RunRequest):
    active = sum(1 for r in RUNS.values() if r["status"] in ("queued", "running"))
    if active >= settings.max_concurrent_runs:
        raise HTTPException(status_code=429, detail="Too many runs in progress, try again shortly")

    run = {
        "id": uuid.uuid4().hex[:12],
        "task": body.task.strip(),
        "status": "queued",
        "steps": [],
        "tool_calls": 0,
        "final_answer": None,
        "error": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "finished_at": None,
    }
    RUNS[run["id"]] = run
    while len(RUNS) > MAX_STORED_RUNS:
        RUNS.pop(next(iter(RUNS)))

    task = asyncio.create_task(execute_run(run))
    _TASKS.add(task)
    task.add_done_callback(_TASKS.discard)
    return {"run_id": run["id"]}


@app.get("/runs")
async def list_runs():
    return [
        {k: r[k] for k in ("id", "task", "status", "created_at", "finished_at")}
        for r in reversed(list(RUNS.values()))
    ]


@app.get("/runs/{run_id}")
async def get_run(run_id: str):
    run = RUNS.get(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run