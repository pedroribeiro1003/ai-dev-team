from __future__ import annotations

from textwrap import dedent

from backend.app.agents.base import BaseAgent
from backend.app.domain.models import AgentResult, ProjectState


class TesterAgent(BaseAgent):
    agent_id = "tester"
    display_name = "Tester"
    role = "quality"

    def execute(self, task: str, state: ProjectState, order: int) -> AgentResult:
        profile = self.profile_task(task)
        changes = [
            state.upsert_file(
                "workspace/backend/tests/test_orchestrator.py",
                self._test_suite(profile),
                "python",
                "Cobre ordem dos agentes, contrato do payload e acumulacao de snapshots.",
            ),
            state.upsert_file(
                "workspace/frontend/src/services/api.js",
                self._api_client(profile),
                "javascript",
                "Padroniza tratamento de falhas, resposta invalida e retry futuro.",
            ),
            state.upsert_file(
                "workspace/QUALITY_CHECKLIST.md",
                self._quality_notes(profile),
                "markdown",
                "Lista cenarios criticos, riscos de UX e criterios de aceite da iteracao.",
            ),
        ]
        state.advance(
            78,
            (
                f"Tester estressou o fluxo contra {self.join_items(profile.quality_gates)} "
                "antes da revisao final."
            ),
        )
        highlights = [
            f"Cenarios criticos: {self.join_items(profile.quality_gates)}.",
            f"Modo de falha mais sensivel: {profile.risks[0]}.",
            "Cobertura pensada para caminho feliz, latencia e regressao de contrato.",
            "Handoff para Reviewer com foco em readiness e debito residual.",
        ]
        return self.build_result(
            order=order,
            state=state,
            headline="Validacao montada para procurar falhas, nao so confirmar o caminho feliz",
            message=(
                "Entrei com mentalidade de falha. Em vez de assumir que o fluxo estava "
                f"correto, pressionei a implementacao nos pontos em que {profile.risks[0]} "
                f"ou {profile.quality_gates[0]} podem quebrar a experiencia. O objetivo aqui "
                "nao foi deixar o sistema bonito, e sim previsivel quando a execucao sair do ideal."
            ),
            highlights=highlights,
            changes=changes,
        )

    def _test_suite(self, profile) -> str:
        return dedent(
            f"""
            from app.services.orchestrator import MultiAgentOrchestrator


            def test_agents_run_in_sequence():
                execution = MultiAgentOrchestrator().run("Validate {profile.domain}")
                assert [step.agent_id for step in execution.steps] == [
                    "architect",
                    "developer",
                    "tester",
                    "reviewer",
                ]


            def test_snapshots_accumulate_across_steps():
                execution = MultiAgentOrchestrator().run("Track code evolution")
                assert execution.final_snapshot.files
                assert execution.steps[-1].snapshot.completion == 100


            def test_messages_stay_specific_to_each_agent():
                execution = MultiAgentOrchestrator().run("Stress {profile.domain}")
                messages = [step.message for step in execution.steps]
                assert len(set(messages)) == len(messages)
            """
        )

    def _api_client(self, profile) -> str:
        return dedent(
            f"""
            export async function runWorkflow(task) {{
              const response = await fetch("/api/workflows/run", {{
                method: "POST",
                headers: {{ "Content-Type": "application/json" }},
                body: JSON.stringify({{ task }}),
              }});

              if (!response.ok) {{
                throw new Error("Workflow execution failed while protecting {profile.risks[0]}");
              }}

              const payload = await response.json();

              if (!Array.isArray(payload.steps) || payload.steps.length === 0) {{
                throw new Error("Workflow returned an empty execution plan");
              }}

              return payload;
            }}
            """
        )

    def _quality_notes(self, profile) -> str:
        return dedent(
            f"""
            # Checklist de Qualidade

            Contexto analisado: {profile.brief}

            ## Gates de validacao
            - {profile.quality_gates[0]}
            - {profile.quality_gates[1] if len(profile.quality_gates) > 1 else profile.risks[0]}
            - {profile.quality_gates[2] if len(profile.quality_gates) > 2 else profile.frontend_focus[0]}

            ## Riscos priorizados
            - {profile.risks[0]}
            - {profile.risks[1] if len(profile.risks) > 1 else profile.backend_focus[0]}

            ## Observacao do Tester
            - O fluxo precisa continuar explicavel mesmo quando o backend demora ou devolve um payload parcial.
            """
        )
