from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.app.api.routes.workflow import router as workflow_router
from backend.app.core.config import settings


PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = PROJECT_ROOT / "frontend"

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="Sistema fullstack com FastAPI, agentes dedicados e interface tipo chat.",
)
app.include_router(workflow_router, prefix=settings.api_prefix)
app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")
app.mount("/src", StaticFiles(directory=FRONTEND_DIR / "src"), name="src")


@app.get("/api/health")
async def healthcheck() -> dict:
    return {"status": "ok", "app": settings.app_name}


@app.get("/", include_in_schema=False)
async def serve_index() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")
