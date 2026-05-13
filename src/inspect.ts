import { generateDatabaseSchema, getTableName } from "./database.js";
import { escapeHtml, labelFromFieldName, slugify } from "./utils.js";
import type { Resource } from "./resource.js";
import { FRAMEWORK_VERSION } from "./version.js";

type FieldDefinition = {
  type: string;
  label?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  options?: string[];
};

function getFieldRules(field: FieldDefinition): string[] {
  const rules: string[] = [];

  if (field.required) {
    rules.push("required");
  }

  if (field.type === "email") {
    rules.push("email");
  }

  if (field.type === "number") {
    rules.push("number");
  }

  if (typeof field.minLength === "number") {
    rules.push(`minLength: ${field.minLength}`);
  }

  if (typeof field.maxLength === "number") {
    rules.push(`maxLength: ${field.maxLength}`);
  }

  if (field.type === "select" && field.options) {
    rules.push(`options: ${field.options.join(", ")}`);
  }

  if (rules.length === 0) {
    rules.push("none");
  }

  return rules;
}

export function generateInspectPanel(resource: Resource): string {
  const resourceSlug = slugify(resource.name);

  const recordsStorageKey = `paideia:${resourceSlug}:records`;
  const logsStorageKey = `paideia:${resourceSlug}:logs`;

  const tableName = getTableName(resource);
  const databaseSchema = generateDatabaseSchema(resource);

  const fieldsHtml = Object.entries(resource.schema)
    .map(([fieldName, field]) => {
      const typedField = field as FieldDefinition;

      const label =
        typedField.label ?? labelFromFieldName(fieldName);

      const rules = getFieldRules(typedField);

      return `
        <li class="inspect-field">
          <div>
            <strong>${escapeHtml(fieldName)}</strong>
            <span>${escapeHtml(label)} · ${escapeHtml(typedField.type)}</span>
          </div>

          <code>${escapeHtml(rules.join(" · "))}</code>
        </li>
      `;
    })
    .join("");

  const actionsHtml =
    resource.actions.length === 0
      ? `<li class="inspect-field"><div><strong>No actions</strong><span>This resource has no custom actions.</span></div><code>none</code></li>`
      : resource.actions
          .map((action) => {
            const changes =
              action.type === "update"
                ? Object.entries(action.set)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(" · ")
                : `capability: ${action.capability}`;

            return `
              <li class="inspect-field">
                <div>
                  <strong>${escapeHtml(action.name)}</strong>
                  <span>
                    ${escapeHtml(action.label)} · ${escapeHtml(action.type)}
                    ${action.type === "ai" ? " · audited" : ""}
                  </span>
                </div>

                <code>${escapeHtml(changes)}</code>
              </li>
            `;
          })
          .join("");

  return `
    <section class="inspect-disclosure" data-paideia-section="inspect-panel">
      <details>
        <summary>
          <span>Inspect generated system</span>
          <code>${escapeHtml(resource.name)}</code>
        </summary>

        <div class="inspect-content">
          <div class="inspect-grid">
            <div class="inspect-block">
              <p>Resource</p>
              <code>${escapeHtml(resource.name)}</code>
            </div>

            <div class="inspect-block">
              <p>Framework</p>
              <code>Paideia v${escapeHtml(FRAMEWORK_VERSION)}</code>
            </div>

            <div class="inspect-block">
              <p>Capabilities</p>
              <code>validation · logs · actions · inspectable</code>
            </div>

            <div class="inspect-block">
              <p>Security</p>
              <code>escaping · validation · audited AI · no client secrets</code>
            </div>

            <div class="inspect-block">
              <p>Runtime</p>
              <code id="${escapeHtml(resourceSlug)}-runtime-stats">
                loading...
              </code>
            </div>

            <div class="inspect-block">
              <p>Records storage</p>
              <code>${escapeHtml(recordsStorageKey)}</code>
            </div>

            <div class="inspect-block">
              <p>Log storage</p>
              <code>${escapeHtml(logsStorageKey)}</code>
            </div>

            <div class="inspect-block">
              <p>Database table</p>
              <code>${escapeHtml(tableName)}</code>
            </div>

            <div class="inspect-block">
              <p>Generated SQL</p>
              <a href="./schema.sql">schema.sql</a>
            </div>

            <div class="inspect-block">
              <p>System manifest</p>
              <a href="./system.json">system.json</a>
            </div>
          </div>

          <div class="inspect-fields">
            <p>Fields</p>

            <ul>
              ${fieldsHtml}
            </ul>
          </div>

          <div class="inspect-fields">
            <p>Actions</p>

            <ul>
              ${actionsHtml}
            </ul>
          </div>

          <div class="inspect-sql">
            <p>Database schema</p>
            <pre><code>${escapeHtml(databaseSchema)}</code></pre>
          </div>
        </div>
      </details>
    </section>
  `;
}
