import { escapeHtml, formatDuration, formatRole, formatTimestamp } from "../utils/format.js";
import { agentCatalog, getAgentMeta, renderAgentIcon } from "../utils/agents.js";

const DEFAULT_MESSAGE_LENGTH = 92;

function renderExecutionLoader(agentId = "system", phase = "playing") {
  return `
    <div class="execution-loader execution-loader--${escapeHtml(agentId)} execution-loader--${escapeHtml(phase)}" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;
}

function truncateText(value = "", maxLength = DEFAULT_MESSAGE_LENGTH) {
  if (value.length <= maxLength) {
    return value;
  }

  const sliced = value.slice(0, maxLength).trimEnd();
  const lastSpace = sliced.lastIndexOf(" ");
  const summary = lastSpace > 48 ? sliced.slice(0, lastSpace) : sliced;
  return `${summary}...`;
}

function getFlowStatus(state, index) {
  if (state.phase === "playing") {
    if (index < state.visibleStepCount) {
      return "complete";
    }

    if (index === state.activePlaybackIndex && index >= state.visibleStepCount) {
      return "active";
    }

    return "queued";
  }

  if (state.phase === "done") {
    return index < state.visibleStepCount ? "complete" : "queued";
  }

  if (state.phase === "error") {
    return index < state.visibleStepCount ? "complete" : "queued";
  }

  return "queued";
}

function buildPipelineSteps(state) {
  if (!state.submittedTask && !state.steps.length && state.phase === "idle") {
    return [];
  }

  return agentCatalog.map((agent, index) => {
    const completedStep = state.steps[index];
    const isActive =
      state.phase === "playing" &&
      index === state.activePlaybackIndex &&
      index >= state.visibleStepCount;

    if (completedStep) {
      return {
        ...completedStep,
        isPlaceholder: false,
      };
    }

    return {
      order: index + 1,
      agent_id: agent.id,
      agent_name: agent.name,
      role: agent.role,
      headline: isActive ? state.statusDetail : agent.summary,
      message: isActive ? state.statusDetail : agent.summary,
      highlights: [],
      changes: [],
      completed_at: "",
      duration_ms: 0,
      progress_percent: isActive ? state.progressPercent : 0,
      snapshot: {
        completion: Math.round(((index + 1) / agentCatalog.length) * 100),
        files: [],
      },
      isPlaceholder: true,
    };
  });
}

function buildStepSummary(step, status) {
  const highlights = step.highlights ?? [];

  if (status === "complete") {
    return truncateText(highlights[0] || step.headline || step.message, 88);
  }

  if (status === "active") {
    return truncateText(step.message || step.headline || "Etapa em andamento.", 88);
  }

  return "Aguardando o in\u00edcio desta etapa.";
}

function renderStatusPill(status) {
  return `
    <span class="status-pill status-pill--${escapeHtml(status)}">
      ${
        status === "active"
          ? "Executando"
          : status === "complete"
            ? "Conclu\u00eddo"
            : "Aguardando"
      }
    </span>
  `;
}

function renderStageStatusLabel(status) {
  return {
    queued: "Na fila",
    active: "Agora",
    complete: "Feita",
  }[status];
}

function renderStageTracker(state, pipeline) {
  return `
    <div class="stage-tracker">
      ${pipeline
        .map((step, index) => {
          const status = getFlowStatus(state, index);
          const meta = getAgentMeta(step.agent_id);

          return `
            <div class="stage-node stage-node--${escapeHtml(status)} stage-node--${escapeHtml(meta.id)}">
              <span class="stage-node__index">${index + 1}</span>
              <div class="stage-node__copy">
                <strong>${escapeHtml(meta.name)}</strong>
                <span>${escapeHtml(renderStageStatusLabel(status))}</span>
              </div>
              ${
                status === "active"
                  ? `<div class="stage-node__loader">${renderExecutionLoader(meta.id, "playing")}</div>`
                  : ""
              }
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderBannerMetrics(state, pipelineLength) {
  const currentStep =
    state.phase === "playing" && state.activePlaybackIndex !== null
      ? `Etapa ${state.activePlaybackIndex + 1}`
      : state.phase === "done"
        ? `${pipelineLength} etapas`
        : "Preparando";

  return `
    <div class="live-metrics">
      <article class="live-metric-card">
        <span>Progresso</span>
        <strong>${state.progressPercent}%</strong>
      </article>
      <article class="live-metric-card">
        <span>Etapa</span>
        <strong>${escapeHtml(currentStep)}</strong>
      </article>
      <article class="live-metric-card">
        <span>Status</span>
        <strong>${escapeHtml(state.statusLabel)}</strong>
      </article>
    </div>
  `;
}

function renderBannerActions(state) {
  if (state.phase !== "done") {
    return "";
  }

  return `
    <div class="execution-banner__actions">
      <button type="button" class="secondary-button secondary-button--primary" data-download-code>
        Baixar projeto (.zip)
      </button>
      <button type="button" class="secondary-button" data-toggle-code-details>
        ${state.showCodeDetails ? "Ocultar código detalhado" : "Ver código detalhado"}
      </button>
    </div>
  `;
}

function renderDetails(step) {
  const highlights = step.highlights ?? [];
  const changes = step.changes ?? [];

  return `
    <div class="flow-step__details-panel">
      <div class="flow-step__details-copy">
        <strong>Detalhes da etapa</strong>
        <p>${escapeHtml(step.message || step.headline)}</p>
      </div>
      ${
        highlights.length
          ? `
            <div class="flow-step__details-copy">
              <strong>Pontos principais</strong>
              <div class="thread-card__chips">
                ${highlights.map((highlight) => `<span>${escapeHtml(highlight)}</span>`).join("")}
              </div>
            </div>
          `
          : ""
      }
      ${
        changes.length
          ? `
            <div class="flow-step__details-copy">
              <strong>Arquivos atualizados</strong>
              <div class="change-list">
                ${changes
                  .map(
                    (change) => `
                      <span class="change-badge change-badge--${escapeHtml(change.change_type)}">
                        ${change.change_type === "added" ? "Novo" : "Atualizado"}: ${escapeHtml(change.path)}
                      </span>
                    `,
                  )
                  .join("")}
              </div>
            </div>
          `
          : ""
      }
      <div class="thread-card__chips thread-card__chips--meta">
        <span>${escapeHtml(formatTimestamp(step.completed_at) || "Etapa conclu\u00edda")}</span>
        <span>${escapeHtml(formatDuration(step.duration_ms) || "Dura\u00e7\u00e3o indispon\u00edvel")}</span>
      </div>
    </div>
  `;
}

function renderUserCard(state) {
  if (!state.submittedTask) {
    return `
      <section class="empty-state">
        As etapas aparecem aqui assim que voc\u00ea enviar uma tarefa. Cada bloco
        mostra s\u00f3 o que importa.
      </section>
    `;
  }

  return `
    <article class="thread-card thread-card--user">
      <div class="thread-card__topline">
        <strong>Voc\u00ea</strong>
        <span class="thread-card__meta">${escapeHtml(formatTimestamp(state.executedAt || state.runStartedAt) || "Pronto para come\u00e7ar")}</span>
      </div>
      <h3 class="thread-card__headline">Sua tarefa</h3>
      <p>${escapeHtml(truncateText(state.submittedTask, 160))}</p>
    </article>
  `;
}

function renderExecutionBanner(state) {
  const pipeline = buildPipelineSteps(state);

  if (state.phase === "fetching") {
    return `
      <section class="execution-banner">
        <div class="execution-banner__pulse"></div>
        <div class="execution-banner__body">
          <strong>Estamos preparando sua tarefa</strong>
          <p>Organizando as etapas para mostrar o andamento em tempo real.</p>
          ${renderBannerMetrics(state, pipeline.length)}
          ${renderStageTracker(state, pipeline)}
          ${renderExecutionLoader("system", "fetching")}
        </div>
      </section>
      <section class="thread-skeletons">
        <article class="thread-skeleton"></article>
        <article class="thread-skeleton"></article>
      </section>
    `;
  }

  if (state.phase !== "playing") {
    if (state.phase !== "done") {
      return "";
    }

    const finalPipeline = buildPipelineSteps(state);
    return `
      <section class="execution-banner execution-banner--done">
        <div class="execution-banner__pulse"></div>
        <div class="execution-banner__body">
          <div class="execution-banner__topline">
            <strong>Projeto pronto para revisar</strong>
            <span>${state.progressPercent}% concluído</span>
          </div>
          <p>${escapeHtml(truncateText(state.statusDetail || "Tudo foi concluído com sucesso.", 120))}</p>
          ${renderBannerMetrics(state, finalPipeline.length)}
          ${renderStageTracker(state, finalPipeline)}
          ${renderBannerActions(state)}
        </div>
      </section>
    `;
  }

  const activeMeta = state.activeAgentId ? getAgentMeta(state.activeAgentId) : null;
  const progress = Math.max(8, state.progressPercent || 0);

  return `
    <section class="execution-banner execution-banner--${escapeHtml(activeMeta?.id ?? "architect")}">
      <div class="execution-banner__pulse"></div>
      <div class="execution-banner__body">
        <div class="execution-banner__topline">
          <strong>${escapeHtml(activeMeta?.name ?? "Processo")} em andamento</strong>
          <span>${progress}% conclu\u00eddo</span>
        </div>
        <p>${escapeHtml(truncateText(state.statusDetail || activeMeta?.summary || "As etapas est\u00e3o avan\u00e7ando em sequ\u00eancia.", 100))}</p>
        <div class="execution-banner__chips">
          <span class="metric-pill metric-pill--live">${escapeHtml(state.statusLabel)}</span>
          <span class="metric-pill">${escapeHtml(state.activeAgentName || "Aguardando a primeira etapa")}</span>
        </div>
        ${renderBannerMetrics(state, pipeline.length)}
        <div class="progress-bar">
          <span style="width: ${progress}%"></span>
        </div>
        ${renderStageTracker(state, pipeline)}
        ${renderExecutionLoader(activeMeta?.id ?? "system", "playing")}
      </div>
    </section>
  `;
}

function renderFlowStep(step, index, state) {
  const status = getFlowStatus(state, index);
  const meta = getAgentMeta(step.agent_id);
  const isExpanded = Boolean(state.expandedSteps?.[String(step.order)]);
  const isSelected = state.selectedStepIndex === index;
  const canExpand = !step.isPlaceholder;
  const summary = buildStepSummary(step, status);

  return `
    <article class="flow-step flow-step--${escapeHtml(status)} flow-step--${escapeHtml(meta.id)} ${isExpanded ? "flow-step--expanded" : ""} ${isSelected ? "flow-step--selected" : ""}">
      <div class="flow-step__rail">
        <span class="flow-step__step-badge">Etapa ${step.order}</span>
        <span class="flow-step__line"></span>
      </div>
      <div class="flow-step__content">
        <div
          class="flow-step__card ${canExpand ? "flow-step__card--clickable" : "flow-step__card--static"}"
          ${canExpand ? `data-step-card="${index}" role="button" tabindex="0" aria-expanded="${String(isExpanded)}"` : ""}
        >
          <div class="flow-step__topline">
            <div class="flow-step__identity">
              ${renderAgentIcon(meta.id, meta.name)}
              <div class="flow-step__title-group">
                <strong>${escapeHtml(meta.name)}</strong>
                <span>${escapeHtml(formatRole(step.role))}</span>
              </div>
            </div>
            ${renderStatusPill(status)}
          </div>
          <p class="flow-step__summary">${escapeHtml(summary)}</p>
          <div class="flow-step__bottomline">
            <span class="flow-step__hint">
              ${
                canExpand
                  ? isExpanded
                    ? "Ocultar detalhes"
                    : "Ver detalhes"
                  : status === "active"
                    ? "Em andamento"
                    : "Aguardando"
              }
            </span>
            ${
              status === "active"
                ? `
                  <div class="flow-step__live">
                    ${renderExecutionLoader(step.agent_id, "playing")}
                    <span>Agora</span>
                  </div>
                `
                : `
                  <span class="flow-step__meta">
                    ${status === "complete" ? `${step.progress_percent || step.snapshot.completion}%` : "Pendente"}
                  </span>
                `
            }
          </div>
        </div>
        ${isExpanded && canExpand ? renderDetails(step) : ""}
      </div>
    </article>
  `;
}

export function renderTranscript(state) {
  const pipeline = buildPipelineSteps(state);

  return `
    ${renderUserCard(state)}
    ${renderExecutionBanner(state)}
    ${state.error ? `<div class="status-note status-note--error">${escapeHtml(state.error)}</div>` : ""}
    ${
      pipeline.length
        ? `
          <div class="flow-timeline">
            ${pipeline.map((step, index) => renderFlowStep(step, index, state)).join("")}
          </div>
        `
        : ""
    }
  `;
}
