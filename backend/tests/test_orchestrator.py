import asyncio
from unittest import TestCase

from backend.app.services.orchestrator import MultiAgentOrchestrator


class MultiAgentOrchestratorTests(TestCase):
    def setUp(self) -> None:
        self.orchestrator = MultiAgentOrchestrator()

    def test_runs_all_agents_in_expected_order(self) -> None:
        execution = self.orchestrator.run("Criar fluxo colaborativo para uma plataforma de suporte.")

        self.assertEqual(
            [step.agent_name for step in execution.steps],
            ["Architect", "Dev", "Tester", "Reviewer"],
        )
        self.assertEqual(execution.final_snapshot.completion, 100)

    def test_developer_updates_existing_architecture_file(self) -> None:
        execution = self.orchestrator.run("Evoluir um chat de agentes.")
        developer_step = execution.steps[1]

        orchestrator_change = next(
            change
            for change in developer_step.changes
            if change.path == "workspace/backend/app/services/orchestrator.py"
        )

        self.assertEqual(orchestrator_change.change_type.value, "updated")

    def test_final_snapshot_accumulates_files(self) -> None:
        execution = self.orchestrator.run("Mapear backlog e gerar componentes.")
        final_paths = [file.path for file in execution.final_snapshot.files]

        self.assertIn("workspace/frontend/src/components/CodeEvolution.js", final_paths)
        self.assertIn("workspace/README.md", final_paths)

    def test_agents_have_distinct_personas_and_deeper_analysis(self) -> None:
        execution = self.orchestrator.run(
            "Criar dashboard multiagente com chat, login e streaming em tempo real."
        )
        architect, developer, tester, reviewer = execution.steps

        self.assertIn("fronteiras", architect.message.lower())
        self.assertIn("fatiei", developer.message.lower())
        self.assertIn("falha", tester.message.lower())
        self.assertIn("produção", reviewer.message.lower())
        self.assertTrue(
            any(
                "tempo real" in item.lower() or "stream" in item.lower()
                for item in architect.highlights
            )
        )

    def test_stream_emits_timeline_events_with_progress(self) -> None:
        async def collect_events():
            return [
                event
                async for event in self.orchestrator.stream(
                    "Criar timeline ao vivo para os agentes."
                )
            ]

        events = asyncio.run(collect_events())
        event_types = [event["type"] for event in events]
        completed_steps = [event for event in events if event["type"] == "step_completed"]

        self.assertEqual(event_types[0], "workflow_started")
        self.assertEqual(event_types[-1], "workflow_completed")
        self.assertEqual(
            [event["step"]["agent_id"] for event in completed_steps],
            ["architect", "developer", "tester", "reviewer"],
        )
        self.assertEqual(events[-1]["progress_percent"], 100)

    def test_steps_include_timing_and_progress_metadata(self) -> None:
        execution = self.orchestrator.run("Validar metadados de progresso e tempo.")

        for index, step in enumerate(execution.steps, start=1):
            self.assertIsNotNone(step.started_at)
            self.assertIsNotNone(step.completed_at)
            self.assertGreaterEqual(step.duration_ms, 1)
            self.assertEqual(step.progress_percent, index * 25)
