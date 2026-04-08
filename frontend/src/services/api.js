const API_BASE_URL = "https://ai-dev-team-a3fl.onrender.com";
const WORKFLOW_RUN_URL = new URL("/api/workflows/run", API_BASE_URL).toString();
const WORKFLOW_STREAM_PATH = "/api/workflows/stream";

const CONNECTION_ERROR_MESSAGE =
  "Nao foi possivel conectar ao servidor. Verifique se o backend no Render esta online e tente novamente.";

function buildFriendlyHttpError(status) {
  if (status === 404) {
    return "Nao encontramos a rota da API. Confira se o backend publicado no Render esta com as rotas corretas.";
  }

  if (status >= 500) {
    return "O servidor encontrou um problema ao processar a tarefa. Tente novamente em alguns instantes.";
  }

  return "Nao foi possivel iniciar a tarefa.";
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
    throw new Error("Recebemos uma resposta invalida do servidor.");
  }
}

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

  return parseJsonResponse(response, "Nao foi possivel iniciar a tarefa.");
}

function getWorkflowSocketUrl() {
  const socketUrl = new URL(API_BASE_URL);
  socketUrl.protocol = socketUrl.protocol === "https:" ? "wss:" : "ws:";
  socketUrl.pathname = WORKFLOW_STREAM_PATH;
  socketUrl.search = "";
  socketUrl.hash = "";
  return socketUrl.toString();
}

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
    const stepStartedAt = step.started_at ?? startedAt;
    const stepCompletedAt = step.completed_at ?? payload.completed_at ?? payload.executed_at ?? startedAt;
    const progressBeforeStep = totalSteps ? Math.round(((order - 1) / totalSteps) * 100) : 0;
    const progressAfterStep =
      step.progress_percent ?? (totalSteps ? Math.round((order / totalSteps) * 100) : 100);

    onEvent?.({
      type: "step_started",
      order,
      agent_id: step.agent_id,
      agent_name: step.agent_name,
      role: step.role,
      started_at: stepStartedAt,
      progress_percent: progressBeforeStep,
    });

    onEvent?.({
      type: "step_completed",
      order,
      progress_percent: progressAfterStep,
      completed_at: stepCompletedAt,
      step,
    });
  });

  const completedEvent = {
    type: "workflow_completed",
    task: payload.task,
    started_at: startedAt,
    completed_at: payload.completed_at ?? payload.executed_at ?? new Date().toISOString(),
    progress_percent: 100,
    final_summary: payload.final_summary,
    final_snapshot: payload.final_snapshot,
  };

  onEvent?.(completedEvent);
  return completedEvent;
}

function openWorkflowSocket(task, { onEvent } = {}) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(getWorkflowSocketUrl());
    let settled = false;
    let receivedEvents = 0;

    function fail(message, allowHttpFallback = false) {
      if (settled) {
        return;
      }

      const error = new Error(message);
      error.allowHttpFallback = allowHttpFallback && receivedEvents === 0;
      settled = true;
      reject(error);
      socket.close();
    }

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ task }));
    });

    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data);
        receivedEvents += 1;
        onEvent?.(payload);

        if (payload.type === "workflow_completed") {
          if (!settled) {
            settled = true;
            resolve(payload);
          }
          socket.close();
          return;
        }

        if (payload.type === "workflow_error") {
          fail(payload.detail ?? "Nao foi possivel continuar a tarefa em tempo real.");
        }
      } catch {
        fail("Recebemos uma atualizacao invalida durante a execucao.");
      }
    });

    socket.addEventListener("error", () => {
      fail(CONNECTION_ERROR_MESSAGE, true);
    });

    socket.addEventListener("close", () => {
      if (!settled) {
        fail(
          "A atualizacao em tempo real foi encerrada antes do fim da tarefa.",
          true,
        );
      }
    });
  });
}

export async function streamWorkflow(task, { onEvent } = {}) {
  try {
    return await openWorkflowSocket(task, { onEvent });
  } catch (error) {
    if (!(error instanceof Error) || !error.allowHttpFallback) {
      throw error;
    }

    const payload = await runWorkflow(task);
    return emitWorkflowFromResponse(payload, onEvent);
  }
}
