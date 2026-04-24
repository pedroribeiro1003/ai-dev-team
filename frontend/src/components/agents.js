import { escapeHtml, formatRole, formatTimestamp } from "../utils/format.js";
import { agentCatalog, getAgentMeta, renderAgentIcon } from "../utils/agents.js";

function truncateText(value = "", maxLength = 78) {
  if (value.length <= maxLength) {
    return value;
  }

  const preview = value.slice(0, maxLength).trimEnd();
  const lastSpace = preview.lastIndexOf(" ");
  return `${lastSpace > 42 ? preview.slice(0, lastSpace) : preview}...`;
}

function getStatus(state, index) {
  if (state.phase === "fetching") {
    return "queued";
  }

  if (state.phase === "playing") {
    if (index < state.activePlaybackIndex) {
      return "complete";
    }

    if (index === state.activePlaybackIndex) {
      return "active";
    }

    return "queued";
  }

  if (index < state.visibleStepCount) {
    return "complete";
  }

  return "queued";
}

function renderStatusLabel(status) {
  return {
    queued: "Aguardando",
    active: "Executando",
    complete: "Concluído",
  }[status];
}

function renderStatusPill(status) {
  return `
    <span class="status-pill status-pill--${escapeHtml(status)}">
      ${escapeHtml(renderStatusLabel(status))}
    </span>
  `;
}

function renderAgentProgress(status, progressPercent, agentId) {
  const width =
    status === "complete"
      ? 100
      : status === "active"
        ? Math.max(18, progressPercent || 0)
        : 8;

  return `
    <div class="agent-chip__progress">
      <span class="agent-chip__progress-bar agent-chip__progress-bar--${escapeHtml(agentId)}" style="width: ${width}%"></span>
    </div>
  `;
}

export function renderAgentRail(state) {
  if (!state.steps.length && state.phase !== "fetching") {
    return `
      <section class="empty-state">
        Os agentes aparecem aqui assim que a sua tarefa começa.
      </section>
    `;
  }

  const pipeline = state.steps.length
    ? state.steps
    : agentCatalog.map((agent) => ({
        agent_id: agent.id,
        agent_name: agent.name,
        role: agent.role,
        headline: agent.summary,
      }));
  const finalVisible = state.steps.length > 0 && state.phase === "done";
  const summaryText =
    state.phase === "fetching"
      ? "Estamos organizando as etapas."
      : state.phase === "playing"
        ? "Os agentes estão trabalhando em sequência."
        : truncateText(state.finalSummary || "Tudo pronto.", 120);

  return `
    <div class="evolution-metrics">
      <span class="metric-pill">${state.visibleStepCount}/${pipeline.length} etapas</span>
      <span class="metric-pill">${state.progressPercent}% concluído</span>
      ${
        finalVisible
          ? `<span class="metric-pill">${escapeHtml(formatTimestamp(state.executedAt))}</span>`
          : `<span class="metric-pill">${state.phase === "fetching" ? "Preparando" : "Em andamento"}</span>`
      }
    </div>
    <p class="status-note ${state.phase === "playing" ? "status-note--live" : ""}">${escapeHtml(summaryText)}</p>
    ${pipeline
      .map((step, index) => {
        const status = getStatus(state, index);
        const isVisible = state.phase === "fetching" || index < state.visibleStepCount;
        const isSelected = state.selectedStepIndex === index;
        const meta = getAgentMeta(step.agent_id);
        const headline = truncateText(step.headline || meta.summary);
        const classes = [
          "agent-chip",
          `agent-chip--${escapeHtml(step.agent_id)}`,
          `agent-chip--${status}`,
          isSelected ? "agent-chip--selected" : "",
          !isVisible ? "agent-chip--locked" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return `
          <button class="${classes}" type="button" data-step-index="${index}">
            <div class="agent-chip__header">
              <div class="agent-chip__identity">
                ${renderAgentIcon(meta.id, meta.name)}
                <div class="agent-chip__copy">
                  <strong>${escapeHtml(meta.name)}</strong>
                  <span>${escapeHtml(formatRole(step.role || meta.role))}</span>
                </div>
              </div>
              ${renderStatusPill(status)}
            </div>
            <div class="agent-chip__summary-row">
              <p class="agent-chip__headline">${escapeHtml(headline)}</p>
              <span class="agent-chip__meta">${escapeHtml(meta.shortName || meta.name)}</span>
            </div>
            ${renderAgentProgress(status, step.progress_percent ?? state.progressPercent, step.agent_id)}
          </button>
        `;
      })
      .join("")}
  `;
}
