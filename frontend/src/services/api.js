const API_BASE_URL = "https://ai-dev-team-a3f1n.onrender.com";
const WORKFLOW_RUN_URL = new URL("/api/workflows/run", API_BASE_URL).toString();

export async function runWorkflow(task) {
  const response = await fetch(WORKFLOW_RUN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ task }),
  });

  if (!response.ok) {
    let detail = "N\u00e3o foi poss\u00edvel iniciar a tarefa.";

    try {
      const payload = await response.json();
      detail = payload.detail ?? detail;
    } catch {
      // Mant\u00e9m a mensagem padr\u00e3o quando a resposta n\u00e3o traz detalhes.
    }

    throw new Error(detail);
  }

  return response.json();
}

function getWorkflowSocketUrl() {
  const socketUrl = new URL(API_BASE_URL);
  socketUrl.protocol = socketUrl.protocol === "https:" ? "wss:" : "ws:";
  socketUrl.pathname = "/api/workflows/stream";
  socketUrl.search = "";
  socketUrl.hash = "";
  return socketUrl.toString();
}

export function streamWorkflow(task, { onEvent } = {}) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(getWorkflowSocketUrl());
    let settled = false;

    function fail(message) {
      if (settled) {
        return;
      }
      settled = true;
      reject(new Error(message));
      socket.close();
    }

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ task }));
    });

    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data);
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
          fail(payload.detail ?? "N\u00e3o foi poss\u00edvel continuar a tarefa em tempo real.");
        }
      } catch {
        fail("Recebemos uma atualiza\u00e7\u00e3o inv\u00e1lida durante a execu\u00e7\u00e3o.");
      }
    });

    socket.addEventListener("error", () => {
      fail("N\u00e3o foi poss\u00edvel abrir a atualiza\u00e7\u00e3o em tempo real.");
    });

    socket.addEventListener("close", () => {
      if (!settled) {
        fail("A atualiza\u00e7\u00e3o em tempo real foi encerrada antes do fim da tarefa.");
      }
    });
  });
}
