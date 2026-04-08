from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, Field

from backend.app.domain.models import WorkflowExecution


class TaskRequest(BaseModel):
    task: str = Field(..., min_length=5, max_length=1_000)


class VirtualFileResponse(BaseModel):
    path: str
    language: str
    summary: str
    content: str


class FileChangeResponse(BaseModel):
    path: str
    change_type: str
    summary: str


class SnapshotResponse(BaseModel):
    focus: str
    completion: int
    progress_note: str
    files: list[VirtualFileResponse]


class AgentStepResponse(BaseModel):
    order: int
    agent_id: str
    agent_name: str
    role: str
    headline: str
    message: str
    highlights: list[str]
    changes: list[FileChangeResponse]
    snapshot: SnapshotResponse
    started_at: datetime | None = None
    completed_at: datetime | None = None
    duration_ms: int = 0
    progress_percent: int = 0


class WorkflowResponse(BaseModel):
    task: str
    started_at: datetime | None = None
    completed_at: datetime | None = None
    executed_at: datetime
    final_summary: str
    steps: list[AgentStepResponse]
    final_snapshot: SnapshotResponse


def serialize_snapshot(snapshot) -> SnapshotResponse:
    return SnapshotResponse(
        focus=snapshot.focus,
        completion=snapshot.completion,
        progress_note=snapshot.progress_note,
        files=[
            VirtualFileResponse(
                path=file.path,
                language=file.language,
                summary=file.summary,
                content=file.content,
            )
            for file in snapshot.files
        ],
    )


def serialize_step(step) -> AgentStepResponse:
    return AgentStepResponse(
        order=step.order,
        agent_id=step.agent_id,
        agent_name=step.agent_name,
        role=step.role,
        headline=step.headline,
        message=step.message,
        highlights=step.highlights,
        changes=[
            FileChangeResponse(
                path=change.path,
                change_type=change.change_type.value,
                summary=change.summary,
            )
            for change in step.changes
        ],
        snapshot=serialize_snapshot(step.snapshot),
        started_at=step.started_at,
        completed_at=step.completed_at,
        duration_ms=step.duration_ms,
        progress_percent=step.progress_percent,
    )


def serialize_execution(execution: WorkflowExecution) -> WorkflowResponse:
    completed_at = execution.completed_at or datetime.now(timezone.utc)

    return WorkflowResponse(
        task=execution.task,
        started_at=execution.started_at,
        completed_at=completed_at,
        executed_at=completed_at,
        final_summary=execution.final_summary,
        steps=[serialize_step(step) for step in execution.steps],
        final_snapshot=serialize_snapshot(execution.final_snapshot),
    )
