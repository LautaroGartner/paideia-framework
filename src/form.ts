import type { Resource } from "./resource.js";
import { escapeHtml, labelFromFieldName, slugify } from "./utils.js";

export function generateForm(resource: Resource): string {
  const resourceSlug = slugify(resource.name);

  const fieldsHtml = Object.entries(resource.schema)
    .map(([fieldName, field]) => {
      const fieldId = `${resourceSlug}-${fieldName}`;
      const label = field.label ?? labelFromFieldName(fieldName);
      const requiredText = field.required ? `<span class="required">*</span>` : "";

      if (field.type === "select") {
        const options = field.options ?? [];

        return `
          <div class="field">
            <label for="${escapeHtml(fieldId)}">
              ${escapeHtml(label)} ${requiredText}
            </label>

            <select
              id="${escapeHtml(fieldId)}"
              name="${escapeHtml(fieldName)}"
              aria-describedby="${escapeHtml(fieldId)}-error"
            >
              <option value="">Select</option>
              ${options
                .map(
                  (option) => `
                    <option value="${escapeHtml(option)}">${escapeHtml(option)}</option>
                  `
                )
                .join("")}
            </select>

            <p
              id="${escapeHtml(fieldId)}-error"
              class="field-error"
              data-error-for="${escapeHtml(fieldName)}"
              hidden
            ></p>
          </div>
        `;
      }

      const inputType =
        field.type === "email" ? "email" : field.type === "number" ? "number" : "text";
      const placeholder = field.placeholder
        ? ` placeholder="${escapeHtml(field.placeholder)}"`
        : "";

      return `
        <div class="field">
          <label for="${escapeHtml(fieldId)}">
            ${escapeHtml(label)} ${requiredText}
          </label>

          <input
            id="${escapeHtml(fieldId)}"
            name="${escapeHtml(fieldName)}"
            type="${inputType}"
            aria-describedby="${escapeHtml(fieldId)}-error"
            ${placeholder}
          />

          <p
            id="${escapeHtml(fieldId)}-error"
            class="field-error"
            data-error-for="${escapeHtml(fieldName)}"
            hidden
          ></p>
        </div>
      `;
    })
    .join("");

  return `
    <section class="panel" data-paideia-section="form">
      <h2>Create</h2>

      <div id="${escapeHtml(resourceSlug)}-form-summary" class="form-summary" hidden></div>

      <form id="${escapeHtml(resourceSlug)}-form" novalidate>
        ${fieldsHtml}

        <div class="actions">
          <button type="submit" class="button primary">
            Save
          </button>
        </div>
      </form>
    </section>
  `;
}
