from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# IMPORT ABSOLUTO (evita erro no Render)
from backend.app.api.routes.workflow import router as workflow_router

app = FastAPI(
    title="AI Dev API",
    version="1.0.0",
    description="Sistema fullstack com FastAPI e agentes.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ROTA PRINCIPAL (evita 404)
@app.get("/")
async def root():
    return {"message": "API rodando 🚀", "docs": "/docs"}

# HEALTH CHECK
@app.get("/api/health")
async def healthcheck():
    return {"status": "ok"}

# ROTAS DO WORKFLOW
app.include_router(workflow_router, prefix="/api")