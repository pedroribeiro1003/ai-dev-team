from __future__ import annotations

from textwrap import dedent

from .base import BaseAgent
from ..domain.models import AgentResult, ProjectState


class ReviewerAgent(BaseAgent):
    agent_id = "reviewer"
    display_name = "Reviewer"
    role = "governance"

    def execute(self, task: str, state: ProjectState, order: int) -> AgentResult:
        profile = self.profile_task(task)
        changes = [
            state.upsert_file(
                "workspace/backend/app/services/orchestrator.py",
                self._reviewed_orchestrator(profile),
                "python",
                "Consolida o orquestrador com resumo final, status e pontos claros de extensao.",
            ),
            state.upsert_file(
                "workspace/frontend/src/components/CodeEvolution.js",
                self._code_evolution_component(profile),
                "javascript",
                "Aprimora o painel de codigo com contexto, foco e leitura de snapshot por etapa.",
            ),
            state.upsert_file(
                "workspace/README.md",
                self._readme(profile),
                "markdown",
                "Documenta a base com fluxo de handoff, riscos residuais e recomendacoes de proxima fase.",
            ),
        ]
        state.advance(
            100,
            (
                f"Reviewer fechou a iteracao com criterio de producao, olhando para "
                f"{self.join_items(profile.review_lens)}."
            ),
        )
        highlights = [
            f"Leitura de release: {self.join_items(profile.review_lens)}.",
            f"Debito aceitavel nesta rodada: persistencia e observabilidade avancada.",
            f"Risco residual acompanhado: {profile.risks[0]}.",
            "Base pronta para crescer sem perder a narrativa entre agentes e snapshots.",
        ]
        return self.build_result(
            order=order,
            state=state,
            headline="Revisao feita com criterio de produto pronto para evoluir",
            message=(
                "Revisei o fluxo com criterio de producao, nao so de demo. A pergunta aqui "
                f"foi se {self.join_items(profile.review_lens)} continuaria clara para o time "
                "depois de algumas iteracoes, e nao apenas se a tela estava bonita hoje. "
                f"O resultado ficou consistente, mas mantive visivel que {profile.risks[0]} "
                "ainda merece monitoramento quando esse projeto sair do ambiente controlado."
            ),
            highlights=highlights,
            changes=changes,
        )

    def _reviewed_orchestrator(self, profile) -> str:
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
                        steps.append(agent.execute(task=task, state=state, order=order))

                    return {{
                        "task": task,
                        "status": "done",
                        "steps": steps,
                        "summary": "ready to explain {profile.domain} through agent handoffs",
                    }}
            """
        )

    def _code_evolution_component(self, profile) -> str:
        return dedent(
            f"""
            export function renderCodeEvolution(snapshot, selectedFilePath) {{
              const activeFile =
                snapshot.files.find((file) => file.path === selectedFilePath) ?? snapshot.files[0];

              return {{
                focus: snapshot.focus,
                note: snapshot.progress_note,
                context: "{profile.frontend_focus[0]}",
                file: activeFile,
              }};
            }}
            """
        )

    def _readme(self, profile) -> str:
        return dedent(
            f"""
            # Multi-Agent Studio

            Projeto revisado para: {profile.brief}

            ## Como o fluxo pensa
            - Architect define contratos, fronteiras e riscos estruturais.
            - Dev transforma isso em fatias implementaveis e conectadas.
            - Tester procura falhas antes de aceitar o caminho feliz.
            - Reviewer fecha a rodada com criterio de manutencao e release.

            ## Forcas da base atual
            - {profile.capabilities[0]}
            - {profile.backend_focus[0]}
            - {profile.frontend_focus[0]}

            ## Riscos residuais
            - {profile.risks[0]}
            - {profile.risks[1] if len(profile.risks) > 1 else profile.review_lens[0]}

            ## Proximos passos recomendados
            - Instrumentar logs e analytics do fluxo completo.
            - Evoluir persistencia se o produto sair do modo demonstrativo.
            - Acrescentar testes visuais e de contrato em pipeline CI.
            """
        )
