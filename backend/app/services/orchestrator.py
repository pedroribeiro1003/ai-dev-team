from __future__ import annotations

from datetime import datetime, timezone

from backend.app.agents.architect import ArchitectAgent
from backend.app.agents.developer import DeveloperAgent
from backend.app.agents.reviewer import ReviewerAgent
from backend.app.agents.tester import TesterAgent
from backend.app.domain.models import ProjectState, WorkflowExecution
from backend.app.schemas.workflow import serialize_snapshot, serialize_step


class MultiAgentOrchestrator:
    def __init__(self) -> None:
        self.agents = [
            ArchitectAgent(),
            DeveloperAgent(),
            TesterAgent(),
            ReviewerAgent(),
        ]

    def _now(self) -> datetime:
        return datetime.now(timezone.utc)

    def _build_final_summary(self, steps) -> str:
        return " | ".join([f"{step.agent_name}: {step.headline}" for step in steps])

    def _annotate_step(self, step, started_at: datetime, completed_at: datetime, total_steps: int) -> None:
        step.started_at = started_at
        step.completed_at = completed_at
        step.duration_ms = max(1, int((completed_at - started_at).total_seconds() * 1000))
        step.progress_percent = round((step.order / total_steps) * 100)

    def _execute_step(self, agent, task: str, state: ProjectState, order: int):
        started_at = self._now()
        step = agent.execute(task=task, state=state, order=order)
        completed_at = self._now()
        self._annotate_step(step, started_at, completed_at, len(self.agents))
        return step

    def run(self, task: str) -> WorkflowExecution:
        state = ProjectState(task=task)
        steps = []
        started_at = self._now()

        for order, agent in enumerate(self.agents, start=1):
            steps.append(self._execute_step(agent, task=task, state=state, order=order))

        completed_at = self._now()
        final_summary = self._build_final_summary(steps)
        return WorkflowExecution(
            task=task,
            final_summary=final_summary,
            steps=steps,
            final_snapshot=state.snapshot("Estado final consolidado"),
            started_at=started_at,
            completed_at=completed_at,
        )

    async def stream(self, task: str):
        state = ProjectState(task=task)
        steps = []
        total_steps = len(self.agents)
        started_at = self._now()

        yield {
            "type": "workflow_started",
            "task": task,
            "started_at": started_at.isoformat(),
            "progress_percent": 0,
            "total_steps": total_steps,
        }

        for order, agent in enumerate(self.agents, start=1):
            step_started_at = self._now()
            yield {
                "type": "step_started",
                "order": order,
                "agent_id": agent.agent_id,
                "agent_name": agent.display_name,
                "role": agent.role,
                "started_at": step_started_at.isoformat(),
                "progress_percent": round(((order - 1) / total_steps) * 100),
            }

            step = agent.execute(task=task, state=state, order=order)
            step_completed_at = self._now()
            self._annotate_step(step, step_started_at, step_completed_at, total_steps)
            steps.append(step)

            yield {
                "type": "step_completed",
                "order": order,
                "progress_percent": step.progress_percent,
                "completed_at": step_completed_at.isoformat(),
                "step": serialize_step(step).model_dump(mode="json"),
            }

        completed_at = self._now()
        execution = WorkflowExecution(
            task=task,
            final_summary=self._build_final_summary(steps),
            steps=steps,
            final_snapshot=state.snapshot("Estado final consolidado"),
            started_at=started_at,
            completed_at=completed_at,
        )
        yield {
            "type": "workflow_completed",
            "task": task,
            "started_at": started_at.isoformat(),
            "completed_at": completed_at.isoformat(),
            "progress_percent": 100,
            "final_summary": execution.final_summary,
            "final_snapshot": serialize_snapshot(execution.final_snapshot).model_dump(mode="json"),
        }
