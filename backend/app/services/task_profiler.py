from __future__ import annotations

from dataclasses import dataclass


def _dedupe(items: list[str]) -> list[str]:
    unique: list[str] = []
    for item in items:
        if item and item not in unique:
            unique.append(item)
    return unique


def _contains_any(haystack: str, *needles: str) -> bool:
    return any(needle in haystack for needle in needles)


@dataclass(frozen=True, slots=True)
class TaskProfile:
    brief: str
    domain: str
    complexity: str
    capabilities: list[str]
    backend_focus: list[str]
    frontend_focus: list[str]
    risks: list[str]
    delivery_slices: list[str]
    quality_gates: list[str]
    review_lens: list[str]


def build_task_profile(task: str) -> TaskProfile:
    normalized = " ".join(task.split())
    lowered = normalized.lower()

    capabilities: list[str] = []
    backend_focus: list[str] = []
    frontend_focus: list[str] = []
    risks: list[str] = []
    quality_gates: list[str] = []
    review_lens: list[str] = []

    domain = "plataforma operacional multiagente"

    if _contains_any(lowered, "suporte", "atendimento", "ticket"):
        domain = "plataforma de suporte colaborativo"
    elif _contains_any(lowered, "dashboard", "painel", "analytics", "relatorio"):
        domain = "painel operacional orientado por dados"
    elif _contains_any(lowered, "chat", "mensag", "conversa", "assistente"):
        domain = "workspace conversacional com agentes"

    if _contains_any(lowered, "agente", "multiagente", "workflow", "orquestr"):
        capabilities.append("handoff previsível entre agentes com papéis isolados")
        backend_focus.append("pipeline de orquestração com ordem determinística")
        review_lens.append("clareza de responsabilidades entre papéis especializados")

    if _contains_any(lowered, "chat", "mensag", "conversa", "assistente"):
        capabilities.append("thread de conversa com contexto preservado durante o playback")
        frontend_focus.append("timeline de mensagens com estados de loading por etapa")
        risks.append("quebra de contexto quando respostas aparecem fora da ordem")
        quality_gates.append("validar ordenação do transcript e restauração do contexto")

    if _contains_any(lowered, "dashboard", "painel", "analytics", "relatorio"):
        capabilities.append("visão executiva do progresso com sinais de status claros")
        frontend_focus.append("cards de leitura rápida sem sacrificar densidade informacional")
        risks.append("sobrecarga visual quando muitas métricas competem por atenção")
        review_lens.append("consistência entre narrativa do chat e métricas do painel")

    if _contains_any(lowered, "login", "auth", "autentic", "usuario", "perfil"):
        backend_focus.append("autenticação, sessões e isolamento de dados por usuário")
        risks.append("vazamento de dados entre sessões ou perfis com privilégios distintos")
        quality_gates.append("cobrir expiração de sessão e checagens de autorização")
        review_lens.append("gates de segurança antes de considerar rollout")

    if _contains_any(lowered, "tempo real", "realtime", "stream", "ao vivo", "socket"):
        backend_focus.append("streaming incremental de eventos com reconexão segura")
        frontend_focus.append("sincronização parcial do estado durante respostas em tempo real")
        risks.append("mensagens duplicadas ou fora de sequência em reconexões")
        quality_gates.append("simular lentidão, reconexão e eventos fora de ordem")

    if _contains_any(lowered, "api", "integracao", "webhook", "extern"):
        backend_focus.append("contratos de integração e tratamento de falhas externas")
        risks.append("payloads inconsistentes vindos de provedores externos")
        quality_gates.append("validar timeouts, retries e degradação controlada")
        review_lens.append("acoplamento com fornecedores externos e estratégia de fallback")

    if _contains_any(lowered, "codigo", "snapshot", "evolucao", "diff"):
        capabilities.append("histórico de snapshots para explicar a evolução do código")
        frontend_focus.append("navegação de arquivos com foco no snapshot ativo")
        quality_gates.append("garantir coerência entre etapa exibida e arquivo selecionado")

    if _contains_any(lowered, "mobile", "responsiv", "tablet"):
        frontend_focus.append("comportamento responsivo sem perder hierarquia visual")
        quality_gates.append("testar quebra de layout em viewports menores")

    if not capabilities:
        capabilities.extend(
            [
                "entrega progressiva com mensagens contextualizadas por agente",
                "visibilidade sobre como o código avança a cada etapa",
            ]
        )

    if not backend_focus:
        backend_focus.extend(
            [
                "contratos FastAPI com schemas claros para cada execução",
                "serviço de orquestração desacoplado dos agentes individuais",
            ]
        )

    if not frontend_focus:
        frontend_focus.extend(
            [
                "chat operacional com estados de submissão, playback e erro",
                "painel lateral para explorar arquivos produzidos em cada snapshot",
            ]
        )

    if not risks:
        risks.extend(
            [
                "escopo nebuloso entre agentes gera respostas superficiais",
                "contrato frouxo entre backend e frontend cria regressão visual",
            ]
        )

    quality_gates.extend(
        [
            "confirmar que os quatro agentes aparecem sempre na mesma sequência",
            "garantir que o snapshot final acumula os artefatos das etapas anteriores",
        ]
    )
    review_lens.extend(
        [
            "legibilidade do fluxo completo para uma equipe que precise manter o produto",
            "base pronta para crescer sem colar lógica de domínio na interface",
        ]
    )

    capabilities = _dedupe(capabilities)
    backend_focus = _dedupe(backend_focus)
    frontend_focus = _dedupe(frontend_focus)
    risks = _dedupe(risks)
    quality_gates = _dedupe(quality_gates)
    review_lens = _dedupe(review_lens)

    delivery_slices = _dedupe(
        [
            "contrato HTTP para enviar a tarefa e receber os passos do workflow",
            "pipeline backend para coordenar agentes e snapshots em memória",
            "interface de chat com loading, playback e seleção do agente ativo",
            "painel de código para navegar arquivos e progresso por etapa",
        ]
    )

    richness_score = (
        len(capabilities)
        + len(backend_focus)
        + len(frontend_focus)
        + len(risks)
        + (1 if len(normalized) > 120 else 0)
    )
    complexity = "alta" if richness_score >= 10 else "media-alta" if richness_score >= 7 else "media"

    return TaskProfile(
        brief=normalized[:180],
        domain=domain,
        complexity=complexity,
        capabilities=capabilities,
        backend_focus=backend_focus,
        frontend_focus=frontend_focus,
        risks=risks,
        delivery_slices=delivery_slices,
        quality_gates=quality_gates,
        review_lens=review_lens,
    )
