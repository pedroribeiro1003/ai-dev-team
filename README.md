# Multi-Agent Studio

Sistema fullstack com:

- Backend em FastAPI
- Quatro agentes separados: Architect, Dev, Tester e Reviewer
- Orchestrator responsavel por coordenar as respostas em sequencia
- Frontend em JavaScript moderno com interface tipo chat
- Painel para acompanhar a evolucao do codigo por etapa

## Estrutura

- `backend/app/agents`: implementacoes individuais de cada agente
- `backend/app/services/orchestrator.py`: fluxo central de coordenacao
- `backend/app/api/routes/workflow.py`: endpoints HTTP
- `frontend/src`: interface modular em JavaScript

## Como rodar

```bash
python -m pip install -r requirements.txt
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Rotas principais:

- `http://127.0.0.1:8000/api/health`
- `http://127.0.0.1:8000/api/workflows/run`
- `http://127.0.0.1:8000/docs`

No Render, o backend pode subir com:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Testes

```bash
python -m unittest discover -s backend/tests
```

Para validar tambem os endpoints HTTP com `TestClient`, instale as dependencias de desenvolvimento:

```bash
python -m pip install -r requirements-dev.txt
```
