const roleMap = {
  strategy: "Arquitetura",
  implementation: "Desenvolvimento",
  quality: "Valida\u00e7\u00e3o",
  governance: "Revis\u00e3o",
};

export function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatRole(role) {
  return roleMap[role] ?? role;
}

export function formatTimestamp(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDuration(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }

  if (value < 1000) {
    return `${value} ms`;
  }

  return `${(value / 1000).toFixed(2)} s`;
}

export function languageLabel(value) {
  return {
    python: "Python",
    javascript: "JavaScript",
    markdown: "Markdown",
  }[value] ?? value;
}
