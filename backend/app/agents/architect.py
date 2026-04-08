from __future__ import annotations

from textwrap import dedent

from backend.app.agents.base import BaseAgent
from backend.app.domain.models import AgentResult, ProjectState


class ArchitectAgent(BaseAgent):
    agent_id = "architect"
    display_name = "Architect"
    role = "strategy"

    def execute(self, task: str, state: ProjectState, order: int) -> AgentResult:
        profile = self.profile_task(task)
        changes = [
            state.upsert_file(
                "workspace/backend/app/main.py",
                self._backend_entry(profile),
                "python",
                "Estrutura a API com routers, healthcheck e dependencias da orquestracao.",
            ),
            state.upsert_file(
                "workspace/backend/app/services/orchestrator.py",
                self._orchestrator_stub(profile),
                "python",
                "Desenha o pipeline sequencial com contratos claros entre agentes.",
            ),
            state.upsert_file(
                "workspace/frontend/src/main.js",
                self._frontend_shell(profile),
                "javascript",
                "Esboca o shell do produto com inicializacao, store e montagem da UI.",
            ),
            state.upsert_file(
                "workspace/ARCHITECTURE.md",
                self._architecture_doc(profile),
                "markdown",
                "Documenta drivers arquiteturais, riscos estruturais e handoff para implementacao.",
            ),
        ]
        state.advance(
            25,
            (
                f"Architect alinhou a {profile.domain} com foco em "
                f"{self.join_items(profile.backend_focus)}."
            ),
        )
        highlights = [
            f"Escopo lido como {profile.domain} de complexidade {profile.complexity}.",
            f"Drivers principais: {self.join_items(profile.capabilities)}.",
            f"Backend puxado por {self.join_items(profile.backend_focus, 3)}.",
            f"Risco estrutural dominante: {profile.risks[0]}.",
        ]
        return self.build_result(
            order=order,
            state=state,
            headline="Arquitetura definida a partir de contratos e riscos reais",
            message=(
                f"Li a solicitacao como uma {profile.domain} e comecei fechando fronteiras. "
                f"Antes de falar em tela ou endpoint, tratei as dependencias entre API, "
                f"orquestracao e UX como contratos explicitos. Isso me permitiu priorizar "
                f"{self.join_items(profile.backend_focus)} sem perder de vista que o maior "
                f"risco do desenho e {profile.risks[0]}."
            ),
            highlights=highlights,
            changes=changes,
        )

    def _backend_entry(self, profile) -> str:
        return dedent(
            f"""
            from fastapi import FastAPI
            from fastapi.middleware.cors import CORSMiddleware

            from app.api.routes.workflow import router as workflow_router


            app = FastAPI(
                title="Multi-Agent Studio",
                version="0.1.0",
                description="Entrega sequencial para {profile.domain}.",
            )
            app.add_middleware(
                CORSMiddleware,
                allow_origins=["*"],
                allow_credentials=True,
                allow_methods=["*"],
                allow_headers=["*"],
            )
            app.include_router(workflow_router, prefix="/api")


            @app.get("/api/health")
            async def healthcheck() -> dict:
                return {{
                    "status": "ok",
                    "domain": "{profile.domain}",
                    "complexity": "{profile.complexity}",
                }}
            """
        )

    def _orchestrator_stub(self, profile) -> str:
        return dedent(
            f"""
            from dataclasses import dataclass


            @dataclass(slots=True)
            class WorkflowContext:
                task: str
                goal: str = "{profile.brief}"


            class MultiAgentOrchestrator:
                def __init__(self, agents: list) -> None:
                    self.agents = agents

                def run(self, task: str) -> dict:
                    context = WorkflowContext(task=task)
                    steps = []
                    snapshots = []

                    for index, agent in enumerate(self.agents, start=1):
                        result = agent.execute(task=context.task, code_state=snapshots, order=index)
                        snapshots = result["snapshot"]["files"]
                        steps.append(result)

                    return {{
                        "task": task,
                        "steps": steps,
                        "summary": "workflow scaffolded around explicit agent contracts",
                    }}
            """
        )

    def _frontend_shell(self, profile) -> str:
        return dedent(
            f"""
            import {{ createWorkflowStore }} from "./state/workflow-store.js";
            import {{ mountWorkspace }} from "./ui/workspace.js";


            // Product intent: {profile.brief}
            const store = createWorkflowStore();
            mountWorkspace(document.querySelector("#app"), store, {{
              domain: "{profile.domain}",
              capabilities: {profile.capabilities[:2]!r},
            }});
            """
        )

    def _architecture_doc(self, profile) -> str:
        return dedent(
            f"""
            # Arquitetura Proposta

            ## Leitura da tarefa
            - Dominio: {profile.domain}
            - Complexidade: {profile.complexity}
            - Objetivo resumido: {profile.brief}

            ## Drivers de arquitetura
            - {profile.capabilities[0]}
            - {profile.capabilities[1] if len(profile.capabilities) > 1 else profile.backend_focus[0]}
            - {profile.frontend_focus[0]}

            ## Decisoes estruturais
            - Backend orientado por {profile.backend_focus[0]}.
            - Frontend orientado por {profile.frontend_focus[0]}.
            - A orquestracao permanece centralizada para reduzir acoplamento entre agentes.

            ## Riscos assumidos
            - {profile.risks[0]}
            - {profile.risks[1] if len(profile.risks) > 1 else profile.quality_gates[0]}

            ## Handoff para Dev
            - Implementar primeiro: {profile.delivery_slices[0]}.
            - Em seguida: {profile.delivery_slices[2]}.
            """
        )
