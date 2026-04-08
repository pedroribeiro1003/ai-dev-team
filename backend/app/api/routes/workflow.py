from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from backend.app.schemas.workflow import TaskRequest, WorkflowResponse, serialize_execution
from backend.app.services.orchestrator import MultiAgentOrchestrator


router = APIRouter(prefix="/workflows", tags=["workflows"])
orchestrator = MultiAgentOrchestrator()


@router.get("/agents")
async def list_agents() -> dict:
    return {
        "agents": [
            {
                "id": agent.agent_id,
                "name": agent.display_name,
                "role": agent.role,
            }
            for agent in orchestrator.agents
        ]
    }


@router.post("/run", response_model=WorkflowResponse)
async def run_workflow(payload: TaskRequest) -> WorkflowResponse:
    execution = orchestrator.run(payload.task)
    return serialize_execution(execution)


@router.websocket("/stream")
async def stream_workflow(websocket: WebSocket) -> None:
    await websocket.accept()

    try:
        payload = await websocket.receive_json()
        request = TaskRequest.model_validate(payload)
    except ValidationError:
        await websocket.send_json(
            {
                "type": "workflow_error",
                "detail": "Envie uma tarefa valida com pelo menos 5 caracteres.",
            }
        )
        await websocket.close(code=1008)
        return
    except WebSocketDisconnect:
        return

    try:
        async for event in orchestrator.stream(request.task):
            await websocket.send_json(event)
    except WebSocketDisconnect:
        return
    except Exception:
        await websocket.send_json(
            {
                "type": "workflow_error",
                "detail": "Falha ao executar o workflow em tempo real.",
            }
        )
        await websocket.close(code=1011)
        return

    await websocket.close()
