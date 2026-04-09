from __future__ import annotations

from textwrap import dedent

from .base import BaseAgent
from ..domain.models import AgentResult, ProjectState


class DeveloperAgent(BaseAgent):
    agent_id = "developer"
    display_name = "Dev"
    role = "implementation"

    def execute(self, task: str, state: ProjectState, order: int) -> AgentResult:
        profile = self.profile_task(task)
        changes = [
            state.upsert_file(
                "workspace/backend/app/services/orchestrator.py",
                self._orchestrator_impl(profile),
                "python",
                "Transforma o desenho arquitetural em pipeline executavel com snapshots incrementais.",
            ),
            state.upsert_file(
                "workspace/backend/app/agents/dev_agent.py",
                self._developer_agent_module(profile),
                "python",
                "Implementa um agente de entrega com handoff explicito e foco em incrementalismo.",
            ),
            state.upsert_file(
                "workspace/frontend/src/main.js",
                self._frontend_runtime(profile),
                "javascript",
                "Liga a submissao da tarefa ao playback sequencial e aos estados de carregamento.",
            ),
            state.upsert_file(
                "workspace/frontend/src/components/AgentPanel.js",
                self._agent_panel_component(profile),
                "javascript",
                "Renderiza respostas, riscos e status de cada agente no chat do produto.",
            ),
        ]
        state.advance(
            55,
            (
                f"Dev fatiou a entrega em {self.join_items(profile.delivery_slices)} "
                "e conectou backend e frontend."
            ),
        )
        highlights = [
            f"Entrega priorizada em {self.join_items(profile.delivery_slices)}.",
            f"Tradeoff assumido: memoria em processo agora, persistencia depois.",
            f"UX guiada por {self.join_items(profile.frontend_focus)}.",
            f"Bloqueio tecnico evitado: {profile.risks[0]}.",
        ]
        return self.build_result(
            order=order,
            state=state,
            headline="Implementacao fatiada para andar rapido sem perder coerencia",
            message=(
                "Peguei o mapa do Architect e fatiei a entrega em blocos que realmente "
                "cabem em uma iteracao curta. Em vez de tentar resolver tudo ao mesmo "
                f"tempo, ataquei primeiro {profile.delivery_slices[0]} e depois "
                f"{profile.delivery_slices[2]}. Isso deixou o fluxo executavel desde cedo, "
                f"sem ignorar o risco de {profile.risks[0]}."
            ),
            highlights=highlights,
            changes=changes,
        )

    def _orchestrator_impl(self, profile) -> str:
        return dedent(
            f"""
            from app.agents.architect import ArchitectAgent
            from app.agents.developer import DeveloperAgent
            from app.agents.reviewer import ReviewerAgent
            from app.agents.tester import TesterAgent
            from app.domain.models import ProjectState


            class MultiAgentOrchestrator:
                def __init__(self) -> None:
                    self.agents = [
                        ArchitectAgent(),
                        DeveloperAgent(),
                        TesterAgent(),
                        ReviewerAgent(),
                    ]

                def run(self, task: str) -> dict:
                    state = ProjectState(task=task)
                    steps = []

                    for order, agent in enumerate(self.agents, start=1):
                        result = agent.execute(task=task, state=state, order=order)
                        steps.append(result)

                    return {{
                        "task": task,
                        "steps": steps,
                        "summary": "delivery pipeline assembled around {profile.domain}",
                    }}
            """
        )

    def _developer_agent_module(self, profile) -> str:
        return dedent(
            f"""
            class DevAgent:
                name = "Dev"
                style = "pragmatic incremental delivery"

                def execute(self, task: str, code_state: list[dict], order: int) -> dict:
                    next_file = {{
                        "path": "frontend/src/workflow/playback.js",
                        "language": "javascript",
                        "summary": "Sequential playback for {profile.domain}",
                    }}
                    return {{
                        "order": order,
                        "agent": self.name,
                        "message": "Implementation slice shipped with loading and handoff semantics.",
                        "highlights": {profile.delivery_slices[:3]!r},
                        "code_state": [*code_state, next_file],
                    }}
            """
        )

    def _frontend_runtime(self, profile) -> str:
        return dedent(
            f"""
            import {{ runWorkflow }} from "./services/api.js";
            import {{ renderThread }} from "./components/AgentPanel.js";

            const state = {{
              phase: "idle",
              currentAgent: null,
              focus: "{profile.frontend_focus[0]}",
            }};

            export async function submitTask(task) {{
              state.phase = "fetching";
              const payload = await runWorkflow(task);
              state.phase = "playing";

              for (const step of payload.steps) {{
                state.currentAgent = step.agent_id;
                renderThread(step, state);
                await new Promise((resolve) => setTimeout(resolve, 600));
              }}

              state.phase = "done";
            }}
            """
        )

    def _agent_panel_component(self, profile) -> str:
        return dedent(
            f"""
            export function renderThread(step, runtimeState) {{
              return {{
                title: step.headline,
                body: step.message,
                badges: step.highlights,
                emphasis: runtimeState.currentAgent,
                note: "{profile.frontend_focus[0]}",
              }};
            }}
            """
        )
