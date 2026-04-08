import { renderAgentRail } from "./components/agents.js";
import { renderTranscript } from "./components/chat.js";
import { renderEvolution } from "./components/evolution.js";
import { renderTimeline } from "./components/timeline.js";
import { streamWorkflow } from "./services/api.js";
import { createStore } from "./state/store.js";
import { getAgentMeta } from "./utils/agents.js";
import { downloadSnapshotZip } from "./utils/zip.js";

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
  statusLabel: "Pronto para come\u00e7ar",
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
    liveProgress.textContent = `${state.progressPercent}% conclu\u00eddo`;
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
            ? "Conclu\u00eddo"
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
          statusDetail: `Estamos organizando ${payload.total_steps} etapas para come\u00e7ar.`,
          timeline: [
            ...current.timeline,
            createTimelineEntry({
              status: "system",
              agentId: "system",
              title: "Tarefa iniciada",
              description: `Tudo pronto. O processo come\u00e7ou com ${payload.total_steps} etapas.`,
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
          statusDetail: `${agentName} est\u00e1 cuidando da etapa ${payload.order}.`,
          timeline: [
            ...current.timeline,
            createTimelineEntry({
              status: "active",
              agentId: payload.agent_id,
              title: `${agentName} come\u00e7ou`,
              description: `${agentName} est\u00e1 trabalhando nesta etapa agora.`,
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
              title: "Processo conclu\u00eddo",
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
  threadRoot.innerHTML = renderTranscript(state);
  railRoot.innerHTML = renderAgentRail(state);
  timelineRoot.innerHTML = renderTimeline(state);
  evolutionRoot.innerHTML = renderEvolution(state);
  textarea.disabled = isBusy(state);
  submitButton.disabled = isBusy(state);
  submitButton.textContent =
    state.phase === "fetching"
      ? "Preparando..."
      : state.phase === "playing"
        ? "Em andamento..."
        : "Come\u00e7ar";
}

async function handleSubmit(event) {
  event.preventDefault();
  const task = textarea.value.trim();

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
    store.setState({
      phase: "error",
      error: error instanceof Error ? error.message : "N\u00e3o foi poss\u00edvel concluir a tarefa.",
      activePlaybackIndex: null,
      activeAgentId: "",
      activeAgentName: "",
      statusLabel: "N\u00e3o foi poss\u00edvel concluir",
      statusDetail: error instanceof Error ? error.message : "Tente novamente em instantes.",
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

    downloadSnapshotZip(step.snapshot.files, `codigo-gerado-etapa-${step.order}`);
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

  const toggleButton = event.target.closest("[data-toggle-step]");
  if (toggleButton) {
    const stepKey = toggleButton.dataset.toggleStep;
    if (!stepKey) {
      return;
    }

    store.setState((current) => ({
      ...current,
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
