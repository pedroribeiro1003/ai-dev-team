from unittest import TestCase

try:
    from fastapi.testclient import TestClient
except Exception:  # pragma: no cover - depende do ambiente local.
    TestClient = None

from backend.app.main import app


class WorkflowApiContractTests(TestCase):
    def test_run_workflow_contract(self) -> None:
        if TestClient is None:
            self.skipTest("httpx nao esta instalado para executar o TestClient.")

        client = TestClient(app)
        response = client.post(
            "/api/workflows/run",
            json={"task": "Criar painel multiagente com visualizacao de snapshots."},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload["steps"]), 4)
        self.assertEqual(payload["steps"][0]["agent_id"], "architect")
        self.assertEqual(payload["steps"][-1]["snapshot"]["completion"], 100)
