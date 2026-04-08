export const agentCatalog = [
  {
    id: "architect",
    name: "Arquiteto",
    shortName: "Arq",
    role: "strategy",
    summary: "Organiza a estrutura da solu\u00e7\u00e3o e define o melhor caminho.",
  },
  {
    id: "developer",
    name: "Desenvolvedor",
    shortName: "Dev",
    role: "implementation",
    summary: "Constr\u00f3i a solu\u00e7\u00e3o e conecta as partes principais.",
  },
  {
    id: "tester",
    name: "Validador",
    shortName: "Teste",
    role: "quality",
    summary: "Confere se tudo faz sentido e funciona como esperado.",
  },
  {
    id: "reviewer",
    name: "Revisor",
    shortName: "Rev",
    role: "governance",
    summary: "Refina o resultado e fecha os \u00faltimos ajustes.",
  },
];

const agentMap = new Map(agentCatalog.map((agent) => [agent.id, agent]));

const agentIcons = {
  architect: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z"></path>
      <path d="M8 10h8"></path>
      <path d="M8 14h4"></path>
      <path d="M12 3v18"></path>
    </svg>
  `,
  developer: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="m8 8-4 4 4 4"></path>
      <path d="m16 8 4 4-4 4"></path>
      <path d="m13 5-2 14"></path>
    </svg>
  `,
  tester: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 3 5 6v6c0 4.2 2.8 6.8 7 9 4.2-2.2 7-4.8 7-9V6l-7-3Z"></path>
      <path d="m9 12 2 2 4-4"></path>
    </svg>
  `,
  reviewer: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 6h16"></path>
      <path d="M4 12h10"></path>
      <path d="M4 18h8"></path>
      <path d="m16 17 2 2 4-4"></path>
    </svg>
  `,
};

export function getAgentMeta(agentId) {
  return (
    agentMap.get(agentId) ?? {
      id: agentId,
      name: agentId,
      shortName: agentId,
      role: "system",
      summary: "Etapa personalizada.",
    }
  );
}

export function renderAgentIcon(agentId, label = "Agente") {
  const icon = agentIcons[agentId] ?? agentIcons.architect;

  return `
    <span class="agent-icon agent-icon--${agentId}" role="img" aria-label="${label}">
      ${icon}
    </span>
  `;
}
