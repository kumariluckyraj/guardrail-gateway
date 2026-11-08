
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import (
    close_db,
    connect_db,
    ensure_indexes,
    ping_db,
)
from app.core.redis_client import (
    close_redis,
    connect_redis,
    ping_redis,
)
from app.api.routes import agents, approvals, audit, auth, check, gateway, policies, tools


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_db()
    await ensure_indexes()
    await connect_redis()

    yield

    # Shutdown
    await close_redis()
    await close_db()


app = FastAPI(
    title="Agent Guardrail Gateway",
    version="0.1.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check: application liveness
@app.get("/health")
async def health():
    return {"status": "ok"}


# Readiness check: dependency availability
@app.get("/ready")
async def ready():
    mongo_ok = await ping_db()
    redis_ok = await ping_redis()

    ok = mongo_ok and redis_ok

    return JSONResponse(
        status_code=200 if ok else 503,
        content={
            "status": "ready" if ok else "degraded",
            "mongo": mongo_ok,
            "redis": redis_ok,
        },
    )


# Register routers
app.include_router(auth.router)
app.include_router(agents.router)
app.include_router(tools.router)
app.include_router(policies.router)
app.include_router(gateway.router)
app.include_router(audit.router)
app.include_router(approvals.router)
app.include_router(approvals.agent_router)
app.include_router(check.router)