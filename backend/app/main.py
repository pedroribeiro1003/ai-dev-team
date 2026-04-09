from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes.workflow import router as workflow_router
from .core.config import settings

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="Sistema fullstack com FastAPI e agentes.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workflow_router, prefix=settings.api_prefix)


@app.get("/api/health")
async def healthcheck() -> dict:
    return {"status": "ok", "app": settings.app_name}
