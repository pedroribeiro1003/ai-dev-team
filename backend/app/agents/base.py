from __future__ import annotations

from abc import ABC, abstractmethod

from backend.app.domain.models import AgentResult, ProjectState
from backend.app.services.task_profiler import TaskProfile, build_task_profile


class BaseAgent(ABC):
    agent_id = "base"
    display_name = "Base"
    role = "system"

    @abstractmethod
    def execute(self, task: str, state: ProjectState, order: int) -> AgentResult:
        raise NotImplementedError

    def normalize_task(self, task: str) -> str:
        compact = " ".join(task.split())
        return compact[:140]

    def profile_task(self, task: str) -> TaskProfile:
        return build_task_profile(task)

    def join_items(self, items: list[str], limit: int = 2) -> str:
        selected = [item for item in items[:limit] if item]
        if not selected:
            return ""
        if len(selected) == 1:
            return selected[0]
        return ", ".join(selected[:-1]) + f" e {selected[-1]}"

    def build_result(
        self,
        *,
        order: int,
        state: ProjectState,
        headline: str,
        message: str,
        highlights: list[str],
        changes,
    ) -> AgentResult:
        return AgentResult(
            order=order,
            agent_id=self.agent_id,
            agent_name=self.display_name,
            role=self.role,
            headline=headline,
            message=message,
            highlights=highlights,
            changes=list(changes),
            snapshot=state.snapshot(focus=headline),
        )
