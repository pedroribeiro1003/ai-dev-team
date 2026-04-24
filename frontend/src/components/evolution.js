import { diffLines } from "../utils/diff.js";
import { escapeHtml, languageLabel } from "../utils/format.js";
import { getAgentMeta } from "../utils/agents.js";

function resolveSelectedIndex(state) {
  if (!state.steps.length || state.visibleStepCount === 0) {
    return null;
  }

  const fallbackIndex = Math.max(0, Math.min(state.visibleStepCount - 1, state.steps.length - 1));
  return state.selectedStepIndex ?? fallbackIndex;
}

function resolveStep(state) {
  const selectedIndex = resolveSelectedIndex(state);
  if (selectedIndex === null) {
    return null;
  }

  return state.steps[selectedIndex] ?? null;
}

function resolveActiveFile(step, selectedFilePath) {
  const preferredPath =
    step.snapshot.files.some((file) => file.path === selectedFilePath) && selectedFilePath
      ? selectedFilePath
      : step.changes[0]?.path ?? step.snapshot.files[0]?.path;

  return step.snapshot.files.find((file) => file.path === preferredPath) ?? step.snapshot.files[0];
}

function resolvePreviousFile(state, selectedIndex, activePath) {
  for (let index = selectedIndex - 1; index >= 0; index -= 1) {
    const previousStep = state.steps[index];
    const matchedFile = previousStep.snapshot.files.find((file) => file.path === activePath);
    if (matchedFile) {
      return matchedFile;
    }
  }

  return null;
}

function countDiffTypes(lines) {
  return lines.reduce(
    (summary, line) => {
      if (line.type === "added") {
        summary.added += 1;
      } else if (line.type === "removed") {
        summary.removed += 1;
      }
      return summary;
    },
    { added: 0, removed: 0 },
  );
}

function renderDiff(lines) {
  return `
    <div class="diff-block">
      ${lines
        .map(
          (line) => `
            <div class="diff-line diff-line--${escapeHtml(line.type)}">
              <span class="diff-line__number">${line.oldNumber ?? ""}</span>
              <span class="diff-line__number">${line.newNumber ?? ""}</span>
              <span class="diff-line__marker">${line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}</span>
              <code class="diff-line__content">${escapeHtml(line.content)}</code>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderSummaryActions(showCodeDetails) {
  return `
    <div class="evolution-actions">
      <button type="button" class="secondary-button secondary-button--primary" data-download-code>
        Baixar projeto (.zip)
      </button>
      <button type="button" class="secondary-button" data-toggle-code-details>
        ${showCodeDetails ? "Ocultar código detalhado" : "Ver código detalhado"}
      </button>
    </div>
  `;
}

function renderResultCards(step, changedLines) {
  return `
    <div class="result-kpis">
      <article class="result-kpi">
        <span>Etapa</span>
        <strong>${step.order}</strong>
      </article>
      <article class="result-kpi">
        <span>Arquivos</span>
        <strong>${step.snapshot.files.length}</strong>
      </article>
      <article class="result-kpi">
        <span>Linhas alteradas</span>
        <strong>${changedLines}</strong>
      </article>
    </div>
  `;
}

export function renderEvolution(state) {
  if (state.phase === "fetching" || (state.phase === "playing" && state.visibleStepCount === 0)) {
    return `
      <article class="evolution-card evolution-card--loading">
        <div>
          <h3>Preparando as primeiras mudanças</h3>
          <p class="evolution-card__meta">
            O resumo do código aparece assim que a primeira etapa terminar.
          </p>
        </div>
        <div class="evolution-metrics">
          <span class="metric-pill">Resumo em preparação</span>
          <span class="metric-pill">Arquivos aguardando</span>
        </div>
        <div class="file-list file-list--loading">
          <div class="file-button file-button--ghost"></div>
          <div class="file-button file-button--ghost"></div>
        </div>
      </article>
    `;
  }

  const selectedIndex = resolveSelectedIndex(state);
  const step = resolveStep(state);

  if (selectedIndex === null || !step) {
    return `
      <section class="empty-state">
        O resumo do código aparece aqui depois da primeira etapa.
      </section>
    `;
  }

  const activeFile = resolveActiveFile(step, state.selectedFilePath);
  const previousFile = resolvePreviousFile(state, selectedIndex, activeFile?.path);
  const diff = diffLines(previousFile?.content ?? "", activeFile?.content ?? "");
  const diffSummary = countDiffTypes(diff);
  const changedLines = diffSummary.added + diffSummary.removed;
  const agentMeta = getAgentMeta(step.agent_id);
  const visibleChanges = step.changes.slice(0, 4);
  const hiddenChanges = Math.max(0, step.changes.length - visibleChanges.length);

  return `
    <article class="evolution-card evolution-card--${escapeHtml(step.agent_id)}">
      <div class="evolution-summary">
        <div>
          <div class="evolution-file-list">
            <span class="file-pill file-pill--agent">${escapeHtml(agentMeta.name)}</span>
            <span class="file-summary">Etapa ${step.order}</span>
          </div>
          <h3>${escapeHtml(step.snapshot.focus)}</h3>
          <p class="evolution-card__meta">${escapeHtml(step.snapshot.progress_note)}</p>
        </div>
        ${renderSummaryActions(Boolean(state.showCodeDetails))}
      </div>

      ${renderResultCards(step, changedLines)}

      <div class="evolution-metrics">
        <span class="metric-pill">${step.snapshot.completion}% concluído</span>
        <span class="metric-pill">${step.snapshot.files.length} arquivos</span>
        <span class="metric-pill">${changedLines} linhas alteradas</span>
      </div>

      <div>
        <strong>Resumo do resultado</strong>
        <div class="change-list">
          ${visibleChanges
            .map(
              (change) => `
                <span class="change-badge change-badge--${escapeHtml(change.change_type)}">
                  ${change.change_type === "added" ? "Novo" : "Atualizado"}: ${escapeHtml(change.path)}
                </span>
              `,
            )
            .join("")}
          ${hiddenChanges ? `<span class="change-badge change-badge--more">+${hiddenChanges} arquivos</span>` : ""}
        </div>
      </div>

      ${
        state.showCodeDetails
          ? `
            <div class="evolution-detail-panel">
              <div class="file-list">
                ${step.snapshot.files
                  .map((file) => {
                    const isSelected = file.path === activeFile?.path;

                    return `
                      <button
                        type="button"
                        class="file-button ${isSelected ? "file-button--selected" : ""}"
                        data-file-path="${escapeHtml(file.path)}"
                      >
                        <strong>${escapeHtml(file.path)}</strong>
                        <span>${escapeHtml(languageLabel(file.language))} - ${escapeHtml(file.summary)}</span>
                      </button>
                    `;
                  })
                  .join("")}
              </div>

              <div>
                <div class="evolution-file-list">
                  <span class="file-pill">${escapeHtml(languageLabel(activeFile?.language ?? ""))}</span>
                  <span class="file-summary">${escapeHtml(activeFile?.summary ?? "Nenhum arquivo selecionado.")}</span>
                </div>
                <div class="diff-summary">
                  <span>${previousFile ? "Comparando com a etapa anterior" : "Arquivo criado nesta etapa"}</span>
                  <span>${escapeHtml(activeFile?.path ?? "")}</span>
                </div>
                ${renderDiff(diff)}
              </div>
            </div>
          `
          : ""
      }
    </article>
  `;
}
