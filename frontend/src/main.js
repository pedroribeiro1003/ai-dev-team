import "../assets/styles.css";

import { renderAgentRail } from "./components/agents.js";
import { renderTranscript } from "./components/chat.js";
import { renderEvolution } from "./components/evolution.js";
import { renderTimeline } from "./components/timeline.js";
import { streamWorkflow } from "./services/api.js";
import { createStore } from "./state/store.js";
import { getAgentMeta } from "./utils/agents.js";
import { downloadSnapshotZip } from "./utils/zip.js";

const app = document.querySelector("#app");

if (!app) {
  throw new Error("Não encontrei o elemento #app para montar a interface.");
}

app.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand__mark">MAS</span>
        <div>
          <p class="brand__eyebrow">Studio de Agentes</p>
          <strong class="brand__title">Planeje, crie e revise em um só lugar</strong>
        </div>
      </div>

      <div class="topbar__actions">
        <div class="topbar__live" aria-live="polite">
          <span class="topbar__live-dot" data-live-dot></span>
          <div class="topbar__live-copy">
            <strong data-live-label>Pronto para começar</strong>
            <span data-live-detail>Escreva uma tarefa para acompanhar cada etapa.</span>
          </div>
        </div>
        <div class="topbar__cluster">
          <span class="topbar__pill" data-live-progress>0% concluído</span>
          <span class="topbar__pill topbar__pill--muted" data-live-agent>Sem agente ativo</span>
        </div>
        <button type="button" class="theme-toggle" data-theme-toggle>
          Tema claro
        </button>
      </div>
    </header>

    <header class="hero hero--compact">
      <div class="hero__copy">
        <span class="eyebrow">Comece por aqui</span>
        <h1>Explique sua ideia em poucas palavras</h1>
        <p>Digite a tarefa, clique em começar e acompanhe o resultado.</p>

        <form id="task-form" class="composer composer--hero" data-task-form>
          <div class="composer__intro composer__intro--compact">
            <div class="composer__label-row">
              <label class="composer__label" for="task-input">O que você quer criar?</label>
              <span class="composer__hint-pill">Entrada principal</span>
            </div>
          </div>
          <div class="composer__input-wrap">
            <textarea
              id="task-input"
              class="composer__input"
              data-task-input
              rows="4"
              placeholder="Ex.: Crie uma tela de cadastro com validação, lista de usuários e mensagens claras."
            ></textarea>
          </div>
          <div class="composer__footer composer__footer--compact">
            <p class="composer__hint">
              Use uma frase simples. O sistema organiza o resto.
            </p>
            <button class="composer__button" type="submit" data-submit-button>
              Começar
            </button>
          </div>
        </form>
      </div>

      <div class="hero__aside">
        <section class="guide-panel guide-panel--compact" aria-label="Como funciona">
          <div class="guide-panel__header">
            <strong>Como funciona</strong>
          </div>
          <div class="guide-steps guide-steps--compact">
            <article class="guide-step">
              <span class="guide-step__number">1</span>
              <div>
                <strong>Escreva</strong>
                <p>Diga o que você precisa.</p>
              </div>
            </article>
            <article class="guide-step">
              <span class="guide-step__number">2</span>
              <div>
                <strong>Acompanhe</strong>
                <p>Veja as etapas em andamento.</p>
              </div>
            </article>
            <article class="guide-step">
              <span class="guide-step__number">3</span>
              <div>
                <strong>Baixe</strong>
                <p>Salve o resultado quando quiser.</p>
              </div>
            </article>
          </div>
        </section>

        <div class="hero__console hero__console--compact">
          <div class="hero-console__header">
            <span class="hero-console__eyebrow">Acompanhamento</span>
            <span class="hero-console__status" data-hero-status>Pronto</span>
          </div>
          <div class="hero-console__loader hero-console__loader--idle" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p class="hero-console__text" data-hero-detail>
            O andamento da sua tarefa aparece aqui em tempo real.
          </p>
        </div>
      </div>
    </header>

    <main class="workspace">
      <section class="panel panel--conversation">
        <div class="panel__header">
          <div>
            <span class="panel__eyebrow">Resultado</span>
            <h2>Resumo das etapas</h2>
          </div>
          <p class="panel__description">
            Veja só o essencial e abra detalhes quando precisar.
          </p>
        </div>

        <div id="chat-thread" class="thread" aria-live="polite"></div>
      </section>

      <aside class="panel panel--inspector">
        <section class="inspector-section">
          <div class="section-header">
            <span class="panel__eyebrow">Equipe</span>
            <h2>Quem está trabalhando</h2>
          </div>
          <div id="agent-rail" class="agent-rail"></div>
        </section>

        <section class="inspector-section">
          <div class="section-header">
            <span class="panel__eyebrow">Etapas</span>
            <h2>Linha do tempo</h2>
          </div>
          <div id="execution-timeline" class="timeline-panel"></div>
        </section>

        <section class="inspector-section">
          <div class="section-header">
            <span class="panel__eyebrow">Resultado</span>
            <h2>Resumo do código</h2>
          </div>
          <div id="code-evolution" class="evolution-panel"></div>
        </section>
      </aside>
    </main>
  </div>
`;

const form = document.querySelector("[data-task-form]");
const textarea = document.querySelector("[data-task-input]");
const submitButton = document.querySelector("[data-submit-button]");
const themeToggle = document.querySelector("[data-theme-toggle]");
const liveLabel = document.querySelector("[data-live-label]");
const liveDetail = document.querySelector("[data-live-detail]");
const liveProgress = document.querySelector("[data-live-progress]");
const liveAgent = document.querySelector("[data-live-agent]");
const heroStatus = document.querySelector("[data-hero-status]");
const heroDetail = document.querySelector("[data-hero-detail]");
const threadRoot = document.querySelector("#chat-thread");
const railRoot = document.querySelector("#agent-rail");
const timelineRoot = document.querySelector("#execution-timeline");
const evolutionRoot = document.querySelector("#code-evolution");
const themeStorageKey = "multi-agent-theme";

const store = createStore({
  theme: getInitialTheme(),
  phase: "idle",
  error: "",
  submittedTask: "",
  runStartedAt: "",
  executedAt: "",
  finalSummary: "",
  steps: [],
  visibleStepCount: 0,
  selectedStepIndex: null,
  selectedFilePath: "",
  activePlaybackIndex: null,
  activeAgentId: "",
  activeAgentName: "",
  progressPercent: 0,
  timeline: [],
  expandedSteps: {},
  showCodeDetails: false,
  statusLabel: "Pronto para começar",
  statusDetail: "Escreva uma tarefa para acompanhar cada etapa.",
});

function getInitialTheme() {
  const storedTheme = window.localStorage.getItem(themeStorageKey);
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return "dark";
}

function syncTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.body.dataset.theme = theme;
  if (themeToggle) {
    themeToggle.textContent = theme === "dark" ? "Tema claro" : "Tema escuro";
    themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
  }
  window.localStorage.setItem(themeStorageKey, theme);
}

function syncLiveChrome(state) {
  document.body.dataset.phase = state.phase;
  document.body.dataset.activeAgent = state.activeAgentId || "system";

  if (liveLabel) {
    liveLabel.textContent = state.statusLabel;
  }

  if (liveDetail) {
    liveDetail.textContent = state.statusDetail;
  }

  if (liveProgress) {
    liveProgress.textContent = `${state.progressPercent}% concluído`;
  }

  if (liveAgent) {
    liveAgent.textContent = state.activeAgentName || "Sem agente ativo";
  }

  if (heroStatus) {
    heroStatus.textContent =
      state.phase === "playing"
        ? state.activeAgentName || "Em andamento"
        : state.phase === "fetching"
          ? "Preparando"
          : state.phase === "done"
            ? "Concluído"
            : state.phase === "error"
              ? "Erro"
              : "Pronto";
  }

  if (heroDetail) {
    heroDetail.textContent = state.statusDetail;
  }
}

function pickDefaultFile(step) {
  return step?.changes[0]?.path ?? step?.snapshot?.files[0]?.path ?? "";
}

function isBusy(state) {
  return state.phase === "fetching" || state.phase === "playing";
}

function resolveSelectedStep(state) {
  if (!state.steps.length || state.visibleStepCount === 0) {
    return null;
  }

  const index = state.selectedStepIndex ?? Math.max(0, state.visibleStepCount - 1);
  return state.steps[index] ?? null;
}

function createTimelineEntry(entry) {
  const id =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return { id, ...entry };
}

function upsertStep(steps, step) {
  const next = steps.slice();
  next[step.order - 1] = step;
  return next;
}

function getDisplayAgent(agentId, fallbackName = "") {
  const meta = getAgentMeta(agentId);
  return meta.name || fallbackName || "Agente";
}

function applyWorkflowEvent(payload) {
  store.setState((current) => {
    switch (payload.type) {
      case "workflow_started":
        return {
          ...current,
          phase: "playing",
          runStartedAt: payload.started_at,
          activeAgentId: "",
          activeAgentName: "",
          progressPercent: payload.progress_percent ?? 0,
          statusLabel: "Tarefa iniciada",
          statusDetail: `Estamos organizando ${payload.total_steps} etapas para começar.`,
          timeline: [
            ...current.timeline,
            createTimelineEntry({
              status: "system",
              agentId: "system",
              title: "Tarefa iniciada",
              description: `Tudo pronto. O processo começou com ${payload.total_steps} etapas.`,
              timestamp: payload.started_at,
              progressPercent: payload.progress_percent ?? 0,
            }),
          ],
        };
      case "step_started": {
        const agentName = getDisplayAgent(payload.agent_id, payload.agent_name);
        return {
          ...current,
          phase: "playing",
          activePlaybackIndex: payload.order - 1,
          activeAgentId: payload.agent_id,
          activeAgentName: agentName,
          progressPercent: payload.progress_percent ?? current.progressPercent,
          statusLabel: `${agentName} em andamento`,
          statusDetail: `${agentName} está cuidando da etapa ${payload.order}.`,
          timeline: [
            ...current.timeline,
            createTimelineEntry({
              status: "active",
              agentId: payload.agent_id,
              title: `${agentName} começou`,
              description: `${agentName} está trabalhando nesta etapa agora.`,
              timestamp: payload.started_at,
              progressPercent: payload.progress_percent,
            }),
          ],
        };
      }
      case "step_completed": {
        const nextSteps = upsertStep(current.steps, payload.step);
        const agentName = getDisplayAgent(payload.step.agent_id, payload.step.agent_name);
        return {
          ...current,
          phase: "playing",
          steps: nextSteps,
          visibleStepCount: payload.order,
          selectedStepIndex: payload.order - 1,
          selectedFilePath: pickDefaultFile(payload.step),
          activePlaybackIndex: payload.order - 1,
          activeAgentId: payload.step.agent_id,
          activeAgentName: agentName,
          progressPercent: payload.progress_percent ?? current.progressPercent,
          statusLabel: `${agentName} concluiu a etapa`,
          statusDetail: payload.step.headline,
          timeline: [
            ...current.timeline,
            createTimelineEntry({
              status: "complete",
              agentId: payload.step.agent_id,
              title: `${agentName} concluiu a etapa`,
              description: payload.step.headline,
              timestamp: payload.completed_at ?? payload.step.completed_at,
              progressPercent: payload.progress_percent,
              durationMs: payload.step.duration_ms,
            }),
          ],
        };
      }
      case "workflow_completed":
        return {
          ...current,
          phase: "done",
          executedAt: payload.completed_at,
          finalSummary: payload.final_summary,
          activePlaybackIndex: null,
          activeAgentId: "",
          activeAgentName: "",
          progressPercent: payload.progress_percent ?? 100,
          statusLabel: "Tudo pronto",
          statusDetail: payload.final_summary,
          timeline: [
            ...current.timeline,
            createTimelineEntry({
              status: "system",
              agentId: "system",
              title: "Processo concluído",
              description: payload.final_summary,
              timestamp: payload.completed_at,
              progressPercent: payload.progress_percent ?? 100,
            }),
          ],
        };
      default:
        return current;
    }
  });
}

function render(state) {
  syncTheme(state.theme);
  syncLiveChrome(state);

  if (threadRoot) {
    threadRoot.innerHTML = renderTranscript(state);
  }
  if (railRoot) {
    railRoot.innerHTML = renderAgentRail(state);
  }
  if (timelineRoot) {
    timelineRoot.innerHTML = renderTimeline(state);
  }
  if (evolutionRoot) {
    evolutionRoot.innerHTML = renderEvolution(state);
  }

  if (textarea) {
    textarea.disabled = isBusy(state);
  }

  if (submitButton) {
    submitButton.disabled = isBusy(state);
    submitButton.textContent =
      state.phase === "fetching"
        ? "Preparando..."
        : state.phase === "playing"
          ? "Em andamento..."
          : "Começar";
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  const task = textarea?.value.trim() ?? "";

  if (task.length < 5) {
    store.setState({ error: "Escreva uma tarefa com pelo menos 5 caracteres." });
    return;
  }

  store.setState({
    phase: "fetching",
    error: "",
    submittedTask: task,
    runStartedAt: "",
    executedAt: "",
    finalSummary: "",
    steps: [],
    visibleStepCount: 0,
    selectedStepIndex: null,
    selectedFilePath: "",
    activePlaybackIndex: null,
    activeAgentId: "",
    activeAgentName: "",
    progressPercent: 0,
    timeline: [],
    expandedSteps: {},
    showCodeDetails: false,
    statusLabel: "Preparando sua tarefa",
    statusDetail: "Estamos organizando as etapas para mostrar tudo em tempo real.",
  });

  try {
    await streamWorkflow(task, {
      onEvent: applyWorkflowEvent,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível concluir a tarefa.";
    const isConnectionError =
      message.includes("conectar ao servidor") ||
      message.includes("backend no Render") ||
      message.includes("rota da API");

    store.setState({
      phase: "error",
      error: message,
      activePlaybackIndex: null,
      activeAgentId: "",
      activeAgentName: "",
      statusLabel: isConnectionError ? "Servidor indisponível" : "Não foi possível concluir",
      statusDetail: message,
    });
  }
}

function handleClick(event) {
  const codeToggle = event.target.closest("[data-toggle-code-details]");
  if (codeToggle) {
    store.setState((current) => ({
      ...current,
      showCodeDetails: !current.showCodeDetails,
    }));
    return;
  }

  const downloadButton = event.target.closest("[data-download-code]");
  if (downloadButton) {
    const state = store.getState();
    const step = resolveSelectedStep(state);

    if (!step?.snapshot?.files?.length) {
      return;
    }

    downloadSnapshotZip(step.snapshot.files, `projeto-gerado-etapa-${step.order}`);
    return;
  }

  const stepCard = event.target.closest("[data-step-card]");
  if (stepCard) {
    const index = Number(stepCard.dataset.stepCard);
    const state = store.getState();
    const step = state.steps[index];

    if (Number.isNaN(index) || !step) {
      return;
    }

    const stepKey = String(step.order);

    store.setState((current) => ({
      ...current,
      selectedStepIndex: index,
      selectedFilePath: pickDefaultFile(step),
      expandedSteps: {
        ...current.expandedSteps,
        [stepKey]: !current.expandedSteps[stepKey],
      },
    }));
    return;
  }

  const stepButton = event.target.closest("[data-step-index]");
  if (stepButton) {
    const index = Number(stepButton.dataset.stepIndex);
    const state = store.getState();
    const step = state.steps[index];

    if (Number.isNaN(index) || !step) {
      return;
    }

    store.setState({
      selectedStepIndex: index,
      selectedFilePath: pickDefaultFile(step),
    });
    return;
  }

  const fileButton = event.target.closest("[data-file-path]");
  if (fileButton) {
    store.setState({
      selectedFilePath: fileButton.dataset.filePath ?? "",
    });
  }
}

function handleKeyDown(event) {
  const target = event.target.closest?.("[data-step-card]");
  if (!target) {
    return;
  }

  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  target.click();
}

function handleThemeToggle() {
  store.setState((current) => ({
    ...current,
    theme: current.theme === "dark" ? "light" : "dark",
  }));
}

form?.addEventListener("submit", handleSubmit);
document.addEventListener("click", handleClick);
document.addEventListener("keydown", handleKeyDown);
themeToggle?.addEventListener("click", handleThemeToggle);
store.subscribe(render);
render(store.getState());
