const PRODUCTION_API_BASE_URL = "https://ai-dev-team-backend-production.up.railway.app";
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE_URL = (configuredApiBaseUrl || PRODUCTION_API_BASE_URL).replace(/\/+$/, "");

// URL correta para executar o workflow
const WORKFLOW_RUN_URL = new URL("/api/workflows/run", API_BASE_URL).toString();

const CONNECTION_ERROR_MESSAGE =
  "Não foi possível conectar ao servidor. Verifique se o backend na Railway está online e tente novamente.";

function buildFriendlyHttpError(status) {
  if (status === 404) {
    return "Não encontramos a rota da API. Confira se o backend publicado na Railway está com as rotas corretas.";
  }

  if (status >= 500) {
    return "O servidor encontrou um problema ao processar a tarefa. Tente novamente em alguns instantes.";
  }

  return "Não foi possível iniciar a tarefa.";
}

async function parseErrorDetail(response, fallbackMessage) {
  try {
    const payload = await response.json();
    return payload.detail ?? fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

async function parseJsonResponse(response, fallbackMessage) {
  if (!response.ok) {
    const detail = await parseErrorDetail(response, buildFriendlyHttpError(response.status));
    throw new Error(detail || fallbackMessage);
  }

  try {
    return await response.json();
  } catch {
    throw new Error("Recebemos uma resposta inválida do servidor.");
  }
}

// Execução normal (HTTP)
export async function runWorkflow(task) {
  let response;

  try {
    response = await fetch(WORKFLOW_RUN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ task }),
    });
  } catch {
    throw new Error(CONNECTION_ERROR_MESSAGE);
  }

  return parseJsonResponse(response, "Não foi possível iniciar a tarefa.");
}

// Simulação de eventos sem WebSocket
function emitWorkflowFromResponse(payload, onEvent) {
  const steps = payload.steps ?? [];
  const totalSteps = steps.length;
  const startedAt = payload.started_at ?? payload.executed_at ?? new Date().toISOString();

  onEvent?.({
    type: "workflow_started",
    task: payload.task,
    started_at: startedAt,
    progress_percent: 0,
    total_steps: totalSteps,
  });

  steps.forEach((step, index) => {
    const order = step.order ?? index + 1;

    onEvent?.({
      type: "step_started",
      order,
      agent_name: step.agent_name,
      progress_percent: Math.round((index / totalSteps) * 100),
    });

    onEvent?.({
      type: "step_completed",
      order,
      progress_percent: Math.round(((index + 1) / totalSteps) * 100),
      step,
    });
  });

  const completedEvent = {
    type: "workflow_completed",
    task: payload.task,
    progress_percent: 100,
    final_summary: payload.final_summary,
    final_snapshot: payload.final_snapshot,
  };

  onEvent?.(completedEvent);
  return completedEvent;
}

// Função final sem WebSocket
export async function streamWorkflow(task, { onEvent } = {}) {
  const payload = await runWorkflow(task);
  return emitWorkflowFromResponse(payload, onEvent);
}
