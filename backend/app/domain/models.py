from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class ChangeType(str, Enum):
    ADDED = "added"
    UPDATED = "updated"


@dataclass(slots=True)
class VirtualFile:
    path: str
    language: str
    summary: str
    content: str


@dataclass(slots=True)
class FileChange:
    path: str
    change_type: ChangeType
    summary: str


@dataclass(slots=True)
class ProjectSnapshot:
    focus: str
    completion: int
    progress_note: str
    files: list[VirtualFile]


@dataclass(slots=True)
class AgentResult:
    order: int
    agent_id: str
    agent_name: str
    role: str
    headline: str
    message: str
    highlights: list[str]
    changes: list[FileChange]
    snapshot: ProjectSnapshot
    started_at: datetime | None = None
    completed_at: datetime | None = None
    duration_ms: int = 0
    progress_percent: int = 0


@dataclass(slots=True)
class WorkflowExecution:
    task: str
    final_summary: str
    steps: list[AgentResult]
    final_snapshot: ProjectSnapshot
    started_at: datetime | None = None
    completed_at: datetime | None = None


@dataclass(slots=True)
class ProjectState:
    task: str
    files: dict[str, VirtualFile] = field(default_factory=dict)
    progress_notes: list[str] = field(default_factory=list)
    completion: int = 0

    def upsert_file(
        self,
        path: str,
        content: str,
        language: str,
        summary: str,
    ) -> FileChange:
        change_type = ChangeType.UPDATED if path in self.files else ChangeType.ADDED
        self.files[path] = VirtualFile(
            path=path,
            language=language,
            summary=summary,
            content=content.strip(),
        )
        return FileChange(path=path, change_type=change_type, summary=summary)

    def advance(self, completion: int, note: str) -> None:
        self.completion = completion
        self.progress_notes.append(note)

    def snapshot(self, focus: str) -> ProjectSnapshot:
        progress_note = self.progress_notes[-1] if self.progress_notes else ""
        files = sorted(self.files.values(), key=lambda item: item.path)
        return ProjectSnapshot(
            focus=focus,
            completion=self.completion,
            progress_note=progress_note,
            files=files,
        )
