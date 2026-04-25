from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .api.routes.workflow import router as workflow_router
from .core.config import settings


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app.main")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = PROJECT_ROOT / "frontend"
FRONTEND_DIST_DIR = FRONTEND_DIR / "dist"
FRONTEND_INDEX = FRONTEND_DIST_DIR / "index.html"


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    logger.info("%s iniciado com sucesso.", settings.app_name)
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="Sistema fullstack com FastAPI, agentes dedicados e interface tipo chat.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(workflow_router, prefix=settings.api_prefix)


def mount_static_directory(route: str, directory: Path, name: str) -> None:
    if not directory.exists():
        logger.info("Diretório estático não encontrado em %s. Montagem ignorada.", directory)
        return

    app.mount(route, StaticFiles(directory=directory), name=name)
    logger.info("Diretório estático montado: %s -> %s", route, directory)


mount_static_directory("/assets", FRONTEND_DIST_DIR / "assets", "assets")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "Erro não tratado em %s %s",
        request.method,
        request.url.path,
        exc_info=(type(exc), exc, exc.__traceback__),
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno no servidor."},
    )


@app.get("/api/health")
async def healthcheck() -> dict:
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
async def root():
    if FRONTEND_INDEX.exists():
        return FileResponse(FRONTEND_INDEX)

    return {"message": "API rodando", "status": "ok"}


@app.get("/favicon.svg", include_in_schema=False)
async def favicon() -> FileResponse:
    return serve_dist_file("favicon.svg")


@app.get("/icons.svg", include_in_schema=False)
async def icons() -> FileResponse:
    return serve_dist_file("icons.svg")


@app.get("/{path:path}", include_in_schema=False)
async def spa_fallback(path: str):
    if path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Rota da API não encontrada.")

    if FRONTEND_INDEX.exists():
        return FileResponse(FRONTEND_INDEX)

    raise HTTPException(status_code=404, detail="Frontend não publicado neste serviço.")


def serve_dist_file(filename: str) -> FileResponse:
    file_path = FRONTEND_DIST_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")

    return FileResponse(file_path)
