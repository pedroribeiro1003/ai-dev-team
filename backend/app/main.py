from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes.workflow import router as workflow_router

app = FastAPI()

# CORS CORRIGIDO
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://69d6e53ce42f20014fa5f2a6--aidevteam.netlify.app",  # SEU FRONTEND
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "API rodando 🚀"}

@app.get("/api/health")
async def healthcheck():
    return {"status": "ok"}

app.include_router(workflow_router, prefix="/api")