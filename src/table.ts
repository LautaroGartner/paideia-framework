import type { Resource } from "./resource.js";
import { escapeHtml, labelFromFieldName, slugify } from "./utils.js";

export function generateTable(resource: Resource): string {
  const resourceSlug = slugify(resource.name);

  const hasAiSummaryColumn = resource.actions.some(
    (action) =>
      action.type === "ai" &&
      action.capability === "summarizeRecord"
  );

  const headings = Object.entries(resource.schema)
    .map(([fieldName, field]) => {
      const label = field.label ?? labelFromFieldName(fieldName);
      return `<th>${escapeHtml(label)}</th>`;
    })
    .join("");

  const aiSummaryHeading = hasAiSummaryColumn
    ? "<th>AI Summary</th>"
    : "";

  const emptyStateColspan =
    Object.keys(resource.schema).length +
    (hasAiSummaryColumn ? 1 : 0) +
    1;

  return `
    <section class="panel" data-paideia-section="table">
      <div class="panel-heading">
        <h2>Records</h2>
        <span>Stored locally in this browser.</span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              ${headings}
              ${aiSummaryHeading}
              <th>Actions</th>
            </tr>
          </thead>

          <tbody id="${escapeHtml(resourceSlug)}-table-body">
            <tr>
              <td colspan="${emptyStateColspan}" class="empty">
                No records.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="actions">
        <button
          type="button"
          id="${escapeHtml(resourceSlug)}-clear-table-records"
          class="button danger"
        >
          Clear saved records
        </button>
      </div>
    </section>
  `;
}
