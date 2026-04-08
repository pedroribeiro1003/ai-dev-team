import { escapeHtml, formatDuration, formatTimestamp } from "../utils/format.js";

function renderEmptyTimeline() {
  return `
    <section class="empty-state">
      A linha do tempo mostra quando cada etapa come\u00e7a e termina.
    </section>
  `;
}

export function renderTimeline(state) {
  if (!state.timeline.length) {
    return renderEmptyTimeline();
  }

  return `
    <div class="timeline-list">
      ${state.timeline
        .map(
          (entry) => `
            <article class="timeline-item timeline-item--${escapeHtml(entry.status)} timeline-item--${escapeHtml(entry.agentId ?? "system")}">
              <div class="timeline-item__rail">
                <span class="timeline-item__dot"></span>
                <span class="timeline-item__line"></span>
              </div>
              <div class="timeline-item__body">
                <div class="timeline-item__topline">
                  <strong>${escapeHtml(entry.title)}</strong>
                  <span>${escapeHtml(formatTimestamp(entry.timestamp))}</span>
                </div>
                <p>${escapeHtml(entry.description)}</p>
                <div class="timeline-item__meta">
                  ${
                    entry.status === "active"
                      ? '<span class="metric-pill metric-pill--live">Agora</span>'
                      : ""
                  }
                  ${
                    typeof entry.progressPercent === "number"
                      ? `<span class="metric-pill">${entry.progressPercent}%</span>`
                      : ""
                  }
                  ${
                    typeof entry.durationMs === "number" && entry.durationMs > 0
                      ? `<span class="metric-pill">${escapeHtml(formatDuration(entry.durationMs))}</span>`
                      : ""
                  }
                </div>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}
