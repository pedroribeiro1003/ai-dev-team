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
uvicorn backend.app.main:app --reload
```

Abra `http://127.0.0.1:8000`.

## Testes

```bash
python -m unittest discover -s backend/tests
```

Para validar tambem os endpoints HTTP com `TestClient`, instale as dependencias de desenvolvimento:

```bash
python -m pip install -r requirements-dev.txt
```
