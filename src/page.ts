import type { Resource } from "./resource.js";
import { config } from "./config.js";
import { generateClientScript } from "./client.js";
import { generateForm } from "./form.js";
import { generateInspectPanel } from "./inspect.js";
import { generateTable } from "./table.js";
import { composeLayout } from "./layout.js";
import { escapeHtml, slugify } from "./utils.js";
import { FRAMEWORK_VERSION } from "./version.js";

function generateInspectStyles(): string {
  return `
      .inspect-panel {
        margin-top: 28px;
      }

      .inspect-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .inspect-block {
        border: 1px solid #e5e5e5;
        border-radius: 12px;
        background: #fafafa;
        padding: 13px;
      }

      .inspect-block p,
      .inspect-fields > p {
        margin: 0 0 8px;
        color: #737373;
        font-size: 0.76rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .inspect-block code,
      .inspect-field code {
        color: #171717;
        font-family:
          ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
          "Liberation Mono", monospace;
        font-size: 0.78rem;
      }

      .inspect-fields ul {
        display: grid;
        gap: 8px;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .inspect-field {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        border: 1px solid #e5e5e5;
        border-radius: 12px;
        background: #fafafa;
        padding: 12px 13px;
      }

      .inspect-field div {
        display: grid;
        gap: 3px;
      }

      .inspect-field strong {
        color: #171717;
        font-size: 0.9rem;
      }

      .inspect-field span {
        color: #737373;
        font-size: 0.82rem;
      }

      .inspect-field code {
        max-width: 48%;
        color: #525252;
        text-align: right;
        white-space: normal;
      }

      .inspect-disclosure {
        border: 1px solid #e5e5e5;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.72);
        box-shadow:
          0 1px 1px rgba(0, 0, 0, 0.02),
          0 20px 70px rgba(0, 0, 0, 0.035);
        overflow: hidden;
      }

      .inspect-disclosure summary {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
        list-style: none;
        padding: 16px 18px;
        cursor: pointer;
      }

      .inspect-disclosure summary::-webkit-details-marker {
        display: none;
      }

      .inspect-disclosure summary span {
        color: #171717;
        font-size: 0.92rem;
        font-weight: 700;
        letter-spacing: -0.02em;
      }

      .inspect-disclosure summary code {
        color: #737373;
        font-family:
          ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
          "Liberation Mono", monospace;
        font-size: 0.78rem;
      }

      .inspect-disclosure[open] summary {
        border-bottom: 1px solid #e5e5e5;
      }

      .inspect-content {
        display: grid;
        gap: 22px;
        padding: 18px;
      }

      .inspect-block a {
        color: #171717;
        font-size: 0.82rem;
        font-weight: 650;
        text-decoration: underline;
        text-underline-offset: 3px;
      }

      .inspect-sql {
        display: grid;
        gap: 8px;
      }

      .inspect-sql p {
        margin: 0;
        color: #737373;
        font-size: 0.76rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .inspect-sql pre {
        margin: 0;
        overflow-x: auto;
        border: 1px solid #e5e5e5;
        border-radius: 12px;
        background: #fafafa;
        padding: 14px;
      }

      .inspect-sql code {
        color: #404040;
        font-family:
          ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
          "Liberation Mono", monospace;
        font-size: 0.78rem;
        line-height: 1.55;
      }

      @media (max-width: 680px) {
        .inspect-grid {
          grid-template-columns: 1fr;
        }

        .inspect-field {
          align-items: flex-start;
          flex-direction: column;
        }

        .inspect-field code {
          max-width: 100%;
          text-align: left;
        }
      }
  `;
}

function generateLogStyles(): string {
  return `
      .log-bubble {
        position: fixed;
        right: 24px;
        bottom: 24px;
        z-index: 20;
        width: min(440px, calc(100vw - 32px));
      }

      .log-bubble:not([open]) {
        width: auto;
      }

      .log-bubble summary {
        list-style: none;
        width: fit-content;
        margin-left: auto;
        border: 1px solid #d4d4d4;
        border-radius: 999px;
        background: #ffffff;
        color: #171717;
        padding: 10px 14px;
        font-size: 0.86rem;
        font-weight: 700;
        cursor: pointer;
        box-shadow:
          0 1px 1px rgba(0, 0, 0, 0.03),
          0 18px 60px rgba(0, 0, 0, 0.12);
      }

      .log-bubble summary::-webkit-details-marker {
        display: none;
      }

      .log-count {
        color: #737373;
        margin-left: 6px;
      }

      .log-bubble.has-info summary {
        border-color: #bfdbfe;
        background: #eff6ff;
        color: #1d4ed8;
      }

      .log-bubble.has-success summary {
        border-color: #bbf7d0;
        background: #f0fdf4;
        color: #15803d;
      }

      .log-bubble.has-warning summary {
        border-color: #fde68a;
        background: #fffbeb;
        color: #a16207;
      }

      .log-bubble.has-error summary {
        border-color: #fecdd3;
        background: #fff1f2;
        color: #be123c;
        box-shadow:
          0 0 0 4px rgba(225, 29, 72, 0.08),
          0 18px 60px rgba(0, 0, 0, 0.12);
      }

      .log-bubble.has-info .log-count {
        color: #2563eb;
      }

      .log-bubble.has-success .log-count {
        color: #16a34a;
      }

      .log-bubble.has-warning .log-count {
        color: #ca8a04;
      }

      .log-bubble.has-error .log-count {
        color: #e11d48;
      }

      .log-panel {
        margin-top: 10px;
        border: 1px solid #e5e5e5;
        border-radius: 16px;
        background: #ffffff;
        box-shadow:
          0 1px 1px rgba(0, 0, 0, 0.03),
          0 24px 80px rgba(0, 0, 0, 0.16);
        overflow: hidden;
      }

      .log-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        border-bottom: 1px solid #e5e5e5;
        padding: 12px;
      }

      .log-top strong {
        font-size: 0.88rem;
      }

      .log-list-wrap {
        max-height: 340px;
        overflow: auto;
        padding: 10px;
      }

      .framework-log-list {
        display: grid;
        gap: 8px;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .log-entry {
        border: 1px solid #ededed;
        border-left: 3px solid #a3a3a3;
        border-radius: 10px;
        background: #fafafa;
        padding: 10px 11px;
      }

      .log-entry-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 6px;
      }

      .log-entry-header strong {
        color: #171717;
        font-size: 0.82rem;
        text-transform: capitalize;
      }

      .log-entry-header time {
        color: #737373;
        font-size: 0.72rem;
        white-space: nowrap;
      }

      .log-entry pre {
        margin: 0;
        white-space: pre-wrap;
        color: #525252;
        font-family:
          ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
          "Liberation Mono", monospace;
        font-size: 0.78rem;
        line-height: 1.5;
      }

      .log-info {
        border-left-color: #3b82f6;
      }

      .log-success {
        border-left-color: #22c55e;
      }

      .log-warning {
        border-left-color: #eab308;
      }

      .log-error {
        border-left-color: #e11d48;
      }

      .empty-log {
        color: #737373;
        font-size: 0.86rem;
        padding: 8px 2px;
      }

      @media (max-width: 680px) {
        .log-bubble {
          right: 12px;
          bottom: 12px;
          width: min(420px, calc(100vw - 24px));
        }
      }
  `;
}

function generateLogBubble(resourceSlug: string): string {
  const safeResourceSlug = escapeHtml(resourceSlug);

  return `
    <details id="${safeResourceSlug}-log-bubble" class="log-bubble">
      <summary>
        Log <span id="${safeResourceSlug}-log-count" class="log-count">0</span>
      </summary>

      <div class="log-panel">
        <div class="log-top">
          <strong>Framework log</strong>

          <button
            type="button"
            id="${safeResourceSlug}-clear-logs"
            class="button secondary tiny"
          >
            Clear
          </button>
        </div>

        <div class="log-list-wrap">
          <ol id="${safeResourceSlug}-framework-log-list" class="framework-log-list">
            <li class="empty-log">No events.</li>
          </ol>
        </div>
      </div>
    </details>
  `;
}

export function generatePage(resource: Resource): string {
  const resourceSlug = slugify(resource.name);

  const pageSubtitle =
    config.inspect || config.logs
      ? "A small generated interface for creating, validating, storing, and inspecting records."
      : "A small generated interface for creating, validating, and storing records.";

  const inspectStyles = config.inspect ? generateInspectStyles() : "";
  const logStyles = config.logs ? generateLogStyles() : "";
  const logBubble = config.logs ? generateLogBubble(resourceSlug) : "";

  // Build sections array for composition
  const sections = [
    generateForm(resource),
    generateTable(resource),
  ];

  if (config.inspect) {
    sections.push(generateInspectPanel(resource));
  }

  // Compose layout from sections
  const layout = composeLayout(sections);

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <title>${escapeHtml(resource.name)} · Paideia Framework</title>

    <style>
      :root {
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
          "Segoe UI", sans-serif;

        background: #fafafa;
        color: #0a0a0a;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, rgba(99, 102, 241, 0.08), transparent 28rem),
          radial-gradient(circle at top right, rgba(14, 165, 233, 0.08), transparent 24rem),
          #fafafa;
        color: #0a0a0a;
      }

      main {
        width: min(980px, calc(100% - 40px));
        margin: 0 auto;
        padding: 72px 0 120px;
      }

      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 24px;
        margin-bottom: 56px;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .mark {
        width: 26px;
        height: 26px;
        border-radius: 8px;
        background: #0a0a0a;
      }

      h1,
      h2,
      p {
        margin: 0;
      }

      h1 {
        font-size: 1.1rem;
        letter-spacing: -0.03em;
        font-weight: 720;
      }

      .version {
        border: 1px solid #e5e5e5;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.72);
        color: #737373;
        padding: 6px 10px;
        font-size: 0.78rem;
        font-weight: 600;
      }

      .intro {
        margin-bottom: 44px;
      }

      .intro h2 {
        max-width: 680px;
        font-size: clamp(2.2rem, 6vw, 4.6rem);
        line-height: 0.98;
        letter-spacing: -0.075em;
        font-weight: 760;
      }

      .intro p {
        max-width: 560px;
        margin-top: 18px;
        color: #525252;
        font-size: 1.02rem;
        line-height: 1.7;
      }

      .layout {
        display: grid;
        gap: 24px;
      }

      .panel {
        display: grid;
        gap: 22px;
        border: 1px solid #e5e5e5;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.82);
        padding: 26px;
        box-shadow:
          0 1px 1px rgba(0, 0, 0, 0.02),
          0 24px 80px rgba(0, 0, 0, 0.04);
        backdrop-filter: blur(12px);
      }

      .panel h2 {
        color: #171717;
        font-size: 0.94rem;
        font-weight: 700;
        letter-spacing: -0.02em;
      }

      .panel-heading {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 16px;
      }

      .panel-heading span {
        color: #737373;
        font-size: 0.82rem;
        font-weight: 560;
      }

      form {
        display: grid;
        gap: 17px;
      }

      .field {
        display: grid;
        gap: 7px;
      }

      label {
        color: #404040;
        font-size: 0.86rem;
        font-weight: 600;
      }

      .required {
        color: #e11d48;
      }

      input,
      select {
        width: 100%;
        border: 1px solid #d4d4d4;
        border-radius: 10px;
        background: #ffffff;
        color: #0a0a0a;
        padding: 11px 12px;
        font: inherit;
        outline: none;
        transition:
          border-color 120ms ease,
          box-shadow 120ms ease;
      }

      input:focus,
      select:focus {
        border-color: #0a0a0a;
        box-shadow: 0 0 0 4px rgba(10, 10, 10, 0.06);
      }

      input[aria-invalid="true"],
      select[aria-invalid="true"] {
        border-color: #e11d48;
        box-shadow: 0 0 0 4px rgba(225, 29, 72, 0.08);
      }

      .field-error {
        color: #be123c;
        font-size: 0.82rem;
        line-height: 1.45;
      }

      .form-summary {
        border: 1px solid #fecdd3;
        border-left: 3px solid #e11d48;
        border-radius: 12px;
        background: #fff1f2;
        color: #9f1239;
        padding: 13px 14px;
        font-size: 0.88rem;
        line-height: 1.5;
      }

      .form-summary p {
        margin-top: 6px;
      }

      .form-summary ul {
        margin: 6px 0 0;
        padding-left: 18px;
      }

      .actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 4px;
      }

      .record-actions {
        display: inline-flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
        min-width: max-content;
      }

      .record-actions .button {
        white-space: nowrap;
      }

      .button,
      button {
        border: 1px solid transparent;
        border-radius: 10px;
        padding: 10px 13px;
        font: inherit;
        font-size: 0.9rem;
        font-weight: 660;
        cursor: pointer;
        transition:
          transform 120ms ease,
          background 120ms ease,
          border-color 120ms ease,
          opacity 120ms ease;
      }

      .button:hover,
      button:hover {
        transform: translateY(-1px);
      }

      .primary {
        background: #0a0a0a;
        color: #ffffff;
      }

      .secondary {
        border-color: #d4d4d4;
        background: #ffffff;
        color: #171717;
      }

      .danger {
        border-color: #fecdd3;
        background: #fff1f2;
        color: #be123c;
      }

      .danger:hover {
        border-color: #fda4af;
        background: #ffe4e6;
      }

      .tiny {
        padding: 6px 9px;
        font-size: 0.78rem;
      }

      .table-wrap {
        overflow-x: auto;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        border-bottom: 1px solid #e5e5e5;
        padding: 13px 0;
        text-align: left;
        vertical-align: middle;
      }

      th {
        color: #737373;
        font-size: 0.72rem;
        font-weight: 720;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      td {
        color: #171717;
        font-size: 0.92rem;
      }

      th:not(:last-child),
      td:not(:last-child) {
        padding-right: 24px;
      }

      th:last-child,
      td:last-child {
        width: 1%;
        white-space: nowrap;
      }

      .ai-summary-cell {
        max-width: 280px;
        color: #525252;
        font-size: 0.82rem;
        line-height: 1.45;
        white-space: pre-wrap;
      }

      .ai-summary-cell:not(:empty)::before {
        content: "generated";
        display: block;
        width: fit-content;
        margin-bottom: 6px;
        border: 1px solid #d4d4d4;
        border-radius: 999px;
        padding: 2px 7px;
        color: #737373;
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .empty {
        color: #737373;
      }

${inspectStyles}
${logStyles}

      @media (max-width: 680px) {
        main {
          width: min(100% - 24px, 980px);
          padding-top: 42px;
        }

        header {
          margin-bottom: 38px;
        }

        .intro {
          margin-bottom: 32px;
        }

        .intro h2 {
          font-size: 2.4rem;
        }

        .panel {
          padding: 20px;
          border-radius: 16px;
        }

        th,
        td {
          white-space: nowrap;
        }
      }
    </style>
  </head>

  <body>
    <main>
      <header>
        <div class="brand">
          <div class="mark" aria-hidden="true"></div>
          <h1>Paideia Framework</h1>
        </div>

        <p class="version">v${escapeHtml(FRAMEWORK_VERSION)}</p>
      </header>

      <section class="intro">
        <h2>${escapeHtml(resource.name)}</h2>
        <p>${escapeHtml(pageSubtitle)}</p>
      </section>

      ${layout}
    </main>

    ${logBubble}
    ${generateClientScript(resource, config)}
  </body>
</html>
  `;
}
