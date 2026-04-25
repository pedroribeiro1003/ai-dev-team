from unittest import TestCase

try:
    from fastapi.testclient import TestClient
except Exception:  # pragma: no cover - depende do ambiente local.
    TestClient = None

from backend.app.main import app


class WorkflowApiContractTests(TestCase):
    def setUp(self) -> None:
        if TestClient is None:
            self.skipTest("httpx não está instalado para executar o TestClient.")

        self.client = TestClient(app)

    def test_run_workflow_contract(self) -> None:
        response = self.client.post(
            "/api/workflows/run",
            json={"task": "Criar painel multiagente com visualização de snapshots."},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload["steps"]), 4)
        self.assertEqual(payload["steps"][0]["agent_id"], "architect")
        self.assertEqual(payload["steps"][-1]["snapshot"]["completion"], 100)

    def test_task_alias_contract(self) -> None:
        response = self.client.post(
            "/api/workflows/task",
            json={"task": "Criar painel multiagente com visualização de snapshots."},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["steps"]), 4)

    def test_health_and_docs_routes(self) -> None:
        root = self.client.get("/")
        health = self.client.get("/api/health")
        docs = self.client.get("/docs")

        self.assertEqual(root.status_code, 200)
        self.assertEqual(root.json(), {"message": "API rodando", "status": "ok"})
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.json(), {"status": "ok"})
        self.assertEqual(docs.status_code, 200)

    def test_cors_preflight_headers(self) -> None:
        response = self.client.options(
            "/api/workflows/run",
            headers={
                "Origin": "https://frontend.exemplo.com",
                "Access-Control-Request-Method": "POST",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("access-control-allow-origin"), "*")
