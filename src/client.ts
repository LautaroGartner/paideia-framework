import type { FrameworkConfig } from "./config.js";
import type { Resource } from "./resource.js";
import { slugify } from "./utils.js";
import { generateApiContract } from "./api.js";

export function generateClientScript(
  resource: Resource,
  config: FrameworkConfig
): string {
  const resourceName = resource.name;
  const resourceSlug = slugify(resource.name);
  const diagnosticsEnabled = config.logs;

  const schemaJson = JSON.stringify(resource.schema, null, 2).replaceAll(
    "<",
    "\\u003c"
  );

  const actionsJson = JSON.stringify(resource.actions, null, 2).replaceAll(
    "<",
    "\\u003c"
  );
  const permissionsJson = JSON.stringify(
    resource.permissions,
    null,
    2
  ).replaceAll("<", "\\u003c");
  const storageJson = JSON.stringify(resource.storage);
  const runtimeTargetJson = JSON.stringify(resource.runtimeTarget);

  const apiJson = JSON.stringify(
    generateApiContract(resource),
    null,
    2
  ).replaceAll("<", "\\u003c");

  const diagnosticsDeclarations = diagnosticsEnabled
    ? `
        const logsStorageKey = "paideia:" + resourceSlug + ":logs";
        const seenLogStorageKey = "paideia:" + resourceSlug + ":seen-log";
        const activeErrorStorageKey = "paideia:" + resourceSlug + ":active-error";
      `
    : "";

  const diagnosticsDomRefs = diagnosticsEnabled
    ? `
        const clearLogsButton = document.getElementById(resourceSlug + "-clear-logs");
        const logList = document.getElementById(resourceSlug + "-framework-log-list");
        const logCount = document.getElementById(resourceSlug + "-log-count");
        const logBubble = document.getElementById(resourceSlug + "-log-bubble");
        const runtimeStats = document.getElementById(resourceSlug + "-runtime-stats");
      `
    : "";

  const diagnosticsFunctions = diagnosticsEnabled
    ? `
        function loadLogs() {
          const raw = localStorage.getItem(logsStorageKey);

          if (!raw) return [];

          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }

        function saveLogs(logs) {
          localStorage.setItem(logsStorageKey, JSON.stringify(logs));
        }

        function renderRuntimeStats() {
          if (!runtimeStats) return;

          const records = loadRecords();
          const logs = loadLogs();
          const activeErrorId = localStorage.getItem(activeErrorStorageKey);

          runtimeStats.textContent =
            "records: " +
            records.length +
            " · logs: " +
            logs.length +
            " · active error: " +
            (activeErrorId ? "yes" : "no");
        }

        function addLog(level, title, message) {
          const logs = loadLogs();

          const nextLog = {
            id: createId(),
            level,
            title,
            message,
            createdAt: new Date().toISOString(),
          };

          const nextLogs = [nextLog, ...logs];

          saveLogs(nextLogs);
          localStorage.removeItem(seenLogStorageKey);

          if (level === "error") {
            localStorage.setItem(activeErrorStorageKey, nextLog.id);
          }

          renderLogs();
          renderRuntimeStats();
        }

        function renderLogs() {
          if (!logList) return;

          const logs = loadLogs();
          const latestLog = logs[0];
          const seenLogId = localStorage.getItem(seenLogStorageKey);
          const activeErrorId = localStorage.getItem(activeErrorStorageKey);

          const activeErrorLog = activeErrorId
            ? logs.find(function (log) {
                return log.id === activeErrorId;
              })
            : null;

          const logIsOpen = logBubble && logBubble.open;
          const latestLogIsSeen =
            latestLog && latestLog.id === seenLogId;

          let statusLog = null;

          if (activeErrorLog) {
            statusLog = activeErrorLog;
          } else if (latestLog && !latestLogIsSeen && !logIsOpen) {
            statusLog = latestLog;
          }

          if (logCount) {
            logCount.textContent = statusLog ? String(logs.length) : "";
          }

          if (logBubble) {
            logBubble.classList.remove(
              "has-info",
              "has-success",
              "has-warning",
              "has-error"
            );

            if (statusLog) {
              logBubble.classList.add("has-" + statusLog.level);
            }
          }

          if (logs.length === 0) {
            logList.innerHTML = '<li class="empty-log">No events.</li>';
            return;
          }

          logList.innerHTML = logs
            .map(function (log) {
              const date = new Date(log.createdAt);

              const readableDate = Number.isNaN(date.getTime())
                ? "Unknown"
                : date.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

              return (
                '<li class="log-entry log-' + escapeHtml(log.level) + '">' +
                  '<div class="log-entry-header">' +
                    '<strong>' +
                      escapeHtml(log.level) +
                      " · " +
                      escapeHtml(log.title) +
                    '</strong>' +
                    '<time>' + escapeHtml(readableDate) + '</time>' +
                  '</div>' +
                  '<pre>' + escapeHtml(log.message) + '</pre>' +
                '</li>'
              );
            })
            .join("");
        }

        function acknowledgeLatestLogIfSafe() {
          const logs = loadLogs();
          const latestLog = logs[0];

          if (!latestLog) return;

          if (latestLog.level === "error") {
            renderLogs();
            renderRuntimeStats();
            return;
          }

          localStorage.setItem(seenLogStorageKey, latestLog.id);
          renderLogs();
          renderRuntimeStats();
        }
      `
    : "";

  const clearActiveErrorAfterSave = diagnosticsEnabled
    ? `localStorage.removeItem(activeErrorStorageKey);`
    : "";

  const refreshRuntimeStats = diagnosticsEnabled
    ? `renderRuntimeStats();`
    : "";

  const forwardRuntimeEventToDevServer = diagnosticsEnabled
    ? `sendRuntimeEventToDevServer(eventName, payload);`
    : "";

  const devBridgeFunction = diagnosticsEnabled
    ? `
        function sendRuntimeEventToDevServer(eventName, payload) {
          if (window.location.protocol === "file:") {
            return;
          }

          fetch("/__paideia/events", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              eventName,
              payload,
            }),
          }).catch(function () {
            // Dev bridge is optional.
          });
        }
      `
    : "";

  const diagnosticsListeners = diagnosticsEnabled
    ? `
        if (clearLogsButton) {
          clearLogsButton.addEventListener("click", function () {
            saveLogs([]);
            localStorage.removeItem(seenLogStorageKey);
            localStorage.removeItem(activeErrorStorageKey);

            renderLogs();
            renderRuntimeStats();
          });
        }

        if (logBubble) {
          logBubble.addEventListener("toggle", function () {
            if (logBubble.open) {
              acknowledgeLatestLogIfSafe();
            }
          });
        }
      `
    : "";

  const diagnosticsStartup = diagnosticsEnabled
    ? `
        renderLogs();
        renderRuntimeStats();

        if (loadLogs().length === 0) {
          addLog(
            "info",
            "Ready",
            resourceName + " resource initialized."
          );
        }
      `
    : "";

  const diagnosticsRuntimeListeners = diagnosticsEnabled
    ? `
        onRuntimeEvent("record.created", function () {
          addLog("success", "Record created", resourceName + " was created.");
        });

        onRuntimeEvent("record.deleted", function () {
          addLog("warning", "Record deleted", "One " + resourceName + " record was deleted.");
        });

        onRuntimeEvent("records.cleared", function () {
          addLog("warning", "Records cleared", "All " + resourceName + " records were removed.");
        });

        onRuntimeEvent("validation.failed", function (payload) {
          addLog("error", "Validation failed", payload.message);
        });

        onRuntimeEvent("action.executed", function (payload) {
          addLog(
            "success",
            "Action ran",
            payload.log || payload.label + " ran on one " + resourceName + " record."
          );
        });

        onRuntimeEvent("ai.executed", function (payload) {
          addLog("info", "AI executed", payload.summary);
        });

        onRuntimeEvent("permission.denied", function (payload) {
          addLog(
            "error",
            "Permission denied",
            payload.operation +
              " requires " +
              payload.requiredPermission +
              " permission."
          );
        });
      `
    : "";

  return `
    <script>
      (function () {
        const resourceName = ${JSON.stringify(resourceName)};
        const resourceSlug = ${JSON.stringify(resourceSlug)};
        const schema = ${schemaJson};
        const actions = ${actionsJson};
        const permissions = ${permissionsJson};
        const storageKind = ${storageJson};
        const runtimeTarget = ${runtimeTargetJson};
        const api = ${apiJson};

        const currentPermissionLevel = "public";

        const permissionRank = {
          public: 0,
          authenticated: 1,
          admin: 2,
        };

        function canAccess(requiredPermission) {
          return (
            permissionRank[currentPermissionLevel] >=
            permissionRank[requiredPermission]
          );
        }

        function getPermissionForAction(action) {
          if (action.type === "ai") {
            return permissions.ai;
          }

          if (action.type === "update") {
            return permissions.update;
          }

          return "admin";
        }

        const recordsStorageKey = "paideia:" + resourceSlug + ":records";
        ${diagnosticsDeclarations}

        const form = document.getElementById(resourceSlug + "-form");
        const tableBody = document.getElementById(resourceSlug + "-table-body");
        const formSummary = document.getElementById(resourceSlug + "-form-summary");
        const clearRecordsButton = document.getElementById(resourceSlug + "-clear-records");
        const clearTableRecordsButton = document.getElementById(resourceSlug + "-clear-table-records");
        ${diagnosticsDomRefs}

        const fieldNames = Object.keys(schema);
        const hasAiSummaryColumn = actions.some(function (action) {
          return (
            action.type === "ai" &&
            action.capability === "summarizeRecord"
          );
        });

        function escapeHtml(value) {
          return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
        }

        function humanize(fieldName) {
          return fieldName
            .replace(/([A-Z])/g, " $1")
            .replace(/[-_]/g, " ")
            .replace(/\\b\\w/g, function (letter) {
              return letter.toUpperCase();
            })
            .trim();
        }

        function getFieldLabel(fieldName) {
          return schema[fieldName].label || humanize(fieldName);
        }

        function createId() {
          if (window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
          }

          return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
        }

        function createStorageAdapter(kind) {
          if (kind !== "local") {
            throw new Error("Unsupported storage adapter: " + kind);
          }

          return {
            load(key) {
              const raw = localStorage.getItem(key);

              if (!raw) return [];

              try {
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            },

            save(key, records) {
              localStorage.setItem(key, JSON.stringify(records));
            },
          };
        }

        const storage = createStorageAdapter(storageKind);

        const runtimeListeners = {};

        function onRuntimeEvent(eventName, handler) {
          if (!runtimeListeners[eventName]) {
            runtimeListeners[eventName] = [];
          }

          runtimeListeners[eventName].push(handler);
        }

        function emitRuntimeEvent(eventName, payload) {
          const listeners = runtimeListeners[eventName] || [];

          listeners.forEach(function (handler) {
            handler(payload);
          });

          ${forwardRuntimeEventToDevServer}
        }

        ${devBridgeFunction}

        ${diagnosticsRuntimeListeners}

        function loadRecords() {
          return storage.load(recordsStorageKey);
        }

        function saveRecords(records) {
          storage.save(recordsStorageKey, records);
        }

        ${diagnosticsFunctions}

        function collectFormValues() {
          const values = {};

          fieldNames.forEach(function (fieldName) {
            const input = form.elements[fieldName];
            values[fieldName] = input ? input.value : "";
          });

          return values;
        }

        function validateRecord(values) {
          const errors = [];

          fieldNames.forEach(function (fieldName) {
            const field = schema[fieldName];
            const rawValue = values[fieldName] || "";
            const value = String(rawValue).trim();
            const label = getFieldLabel(fieldName);

            if (field.required && value === "") {
              errors.push({
                field: fieldName,
                label,
                message: label + " is required.",
              });

              return;
            }

            if (value === "") return;

            if (field.type === "email") {
              const emailLooksValid = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value);

              if (!emailLooksValid) {
                errors.push({
                  field: fieldName,
                  label,
                  message: label + " must be a valid email address.",
                });
              }
            }

            if (field.type === "number") {
              const numberValue = Number(value);

              if (!Number.isFinite(numberValue)) {
                errors.push({
                  field: fieldName,
                  label,
                  message: label + " must be a valid number.",
                });
              }
            }

            if (
              typeof field.minLength === "number" &&
              value.length < field.minLength
            ) {
              errors.push({
                field: fieldName,
                label,
                message: label + " must be at least " + field.minLength + " characters.",
              });
            }

            if (
              typeof field.maxLength === "number" &&
              value.length > field.maxLength
            ) {
              errors.push({
                field: fieldName,
                label,
                message: label + " must be less than " + field.maxLength + " characters.",
              });
            }

            if (field.type === "select" && Array.isArray(field.options)) {
              if (!field.options.includes(value)) {
                errors.push({
                  field: fieldName,
                  label,
                  message: label + " must be one of: " + field.options.join(", ") + ".",
                });
              }
            }
          });

          return {
            valid: errors.length === 0,
            errors,
          };
        }

        function clearValidationUi() {
          if (formSummary) {
            formSummary.hidden = true;
            formSummary.innerHTML = "";
          }

          document.querySelectorAll("[data-error-for]").forEach(function (errorElement) {
            errorElement.hidden = true;
            errorElement.textContent = "";
          });

          fieldNames.forEach(function (fieldName) {
            const input = form.elements[fieldName];

            if (input) {
              input.removeAttribute("aria-invalid");
            }
          });
        }

        function renderValidationErrors(errors) {
          if (formSummary) {
            formSummary.hidden = false;

            formSummary.innerHTML =
              '<strong>' + escapeHtml(resourceName) + ' could not be saved.</strong>' +
              '<p>Fix these fields:</p>' +
              '<ul>' +
                errors
                  .map(function (error) {
                    return '<li>' + escapeHtml(error.message) + '</li>';
                  })
                  .join("") +
              '</ul>';
          }

          errors.forEach(function (error) {
            const errorElement = document.querySelector('[data-error-for="' + error.field + '"]');
            const input = form.elements[error.field];

            if (errorElement) {
              errorElement.hidden = false;
              errorElement.textContent = error.message;
            }

            if (input) {
              input.setAttribute("aria-invalid", "true");
            }
          });

          const firstError = errors[0];

          if (firstError && form.elements[firstError.field]) {
            form.elements[firstError.field].focus();
          }
        }

        function getActionByName(actionName) {
          return actions.find(function (action) {
            return action.name === actionName;
          });
        }

        function generateAiSummary(record) {
          const name = record.name || "This lead";
          const status = record.status || "unknown";
          const notes = record.notes || "";

          let suggestedAction = "Review this lead and decide the next step.";

          if (status === "new") {
            suggestedAction = "Suggested next action: reach out and start the conversation.";
          }

          if (status === "contacted") {
            suggestedAction = "Suggested next action: follow up or move toward closing.";
          }

          if (status === "closed") {
            suggestedAction = "Suggested next action: archive or keep for reporting.";
          }

          const notesSummary = notes
            ? "Notes: " + notes
            : "Notes: no extra context provided.";

          return (
            "Lead summary:\\n" +
            name +
            " is currently marked as " +
            status +
            ".\\n" +
            notesSummary +
            "\\n" +
            suggestedAction
          );
        }

        function applyAiAction(record, action) {
          if (action.capability !== "summarizeRecord") {
            return record;
          }

          const summary = generateAiSummary(record);

          emitRuntimeEvent("ai.executed", {
            action,
            summary,
          });

          return {
            ...record,
            _ai: {
              ...(record._ai || {}),
              summary,
              updatedAt: new Date().toISOString(),
            },
          };
        }

        function applyUpdateAction(record, action) {
          return {
            ...record,
            ...action.set,
            updatedAt: new Date().toISOString(),
          };
        }

        function renderActionButtons(recordIndex) {
          const customActions = actions
            .map(function (action) {
              const buttonClass =
                action.type === "ai"
                  ? "button primary tiny"
                  : "button secondary tiny";

              return (
                '<button type="button" class="' +
                  buttonClass +
                  '" data-action-name="' +
                  escapeHtml(action.name) +
                  '" data-action-index="' +
                  recordIndex +
                '">' +
                  escapeHtml(action.label) +
                '</button>'
              );
            })
            .join("");

          return (
            '<div class="record-actions">' +
              customActions +
              '<button type="button" class="button danger tiny" data-delete-index="' + recordIndex + '">' +
                'Delete' +
              '</button>' +
            '</div>'
          );
        }

        function renderRecords() {
          const records = loadRecords();

          if (!tableBody) return;

          const extraAiColumnCount = hasAiSummaryColumn ? 1 : 0;

          if (records.length === 0) {
            tableBody.innerHTML =
              '<tr>' +
                '<td colspan="' + (fieldNames.length + extraAiColumnCount + 1) + '" class="empty">' +
                  'No records.' +
                '</td>' +
              '</tr>';

            return;
          }

          tableBody.innerHTML = records
            .map(function (record, index) {
              const cells = fieldNames
                .map(function (fieldName) {
                  return '<td>' + escapeHtml(record[fieldName] ?? "") + '</td>';
                })
                .join("");

              const aiSummaryCell = hasAiSummaryColumn
                ? (
                    '<td class="ai-summary-cell">' +
                      escapeHtml(
                        record._ai && record._ai.summary
                          ? record._ai.summary
                          : ""
                      ) +
                    '</td>'
                  )
                : "";

              return (
                '<tr>' +
                  cells +
                  aiSummaryCell +
                  '<td>' +
                    renderActionButtons(index) +
                  '</td>' +
                '</tr>'
              );
            })
            .join("");
        }

        if (form) {
          form.addEventListener("submit", function (event) {
            event.preventDefault();

            if (!canAccess(permissions.create)) {
              emitRuntimeEvent("permission.denied", {
                operation: "create",
                requiredPermission: permissions.create,
                currentPermission: currentPermissionLevel,
              });

              return;
            }

            clearValidationUi();

            const values = collectFormValues();
            const result = validateRecord(values);

            if (!result.valid) {
              const errorMessage =
                resourceName + " could not be saved.\\n" +
                result.errors
                  .map(function (error) {
                    return "- " + error.message;
                  })
                  .join("\\n");

              renderValidationErrors(result.errors);
              emitRuntimeEvent("validation.failed", {
                message: errorMessage,
              });

              return;
            }

            const records = loadRecords();

            const nextRecord = {
              id: createId(),
              createdAt: new Date().toISOString(),
              ...values,
            };

            saveRecords([...records, nextRecord]);

            form.reset();
            clearValidationUi();
            renderRecords();

            ${clearActiveErrorAfterSave}
            emitRuntimeEvent("record.created", {
              record: nextRecord,
            });
            ${refreshRuntimeStats}
          });
        }

        if (tableBody) {
          tableBody.addEventListener("click", function (event) {
            const actionButton = event.target.closest("[data-action-name]");
            const deleteButton = event.target.closest("[data-delete-index]");

            if (actionButton) {
              const actionName = actionButton.getAttribute("data-action-name");
              const index = Number(actionButton.getAttribute("data-action-index"));
              const action = getActionByName(actionName);
              const records = loadRecords();

              if (!action || !Number.isInteger(index) || !records[index]) {
                return;
              }

              const requiredPermission = getPermissionForAction(action);

              if (!canAccess(requiredPermission)) {
                emitRuntimeEvent("permission.denied", {
                  operation: action.name,
                  requiredPermission,
                  currentPermission: currentPermissionLevel,
                });

                return;
              }

              if (action.type === "ai") {
                const nextRecords = records.map(function (record, recordIndex) {
                  if (recordIndex !== index) {
                    return record;
                  }

                  return applyAiAction(record, action);
                });

                saveRecords(nextRecords);
                renderRecords();
                ${refreshRuntimeStats}

                return;
              }

              if (action.type === "update") {
                const nextRecords = records.map(function (record, recordIndex) {
                  if (recordIndex !== index) {
                    return record;
                  }

                  return applyUpdateAction(record, action);
                });

                saveRecords(nextRecords);
                renderRecords();

                emitRuntimeEvent("action.executed", {
                  action,
                  name: action.name,
                  label: action.label,
                  log: action.log,
                });
                ${refreshRuntimeStats}

                return;
              }
            }

            if (deleteButton) {
              const index = Number(deleteButton.getAttribute("data-delete-index"));
              const records = loadRecords();

              if (!Number.isInteger(index) || !records[index]) {
                return;
              }

              if (!canAccess(permissions.delete)) {
                emitRuntimeEvent("permission.denied", {
                  operation: "delete",
                  requiredPermission: permissions.delete,
                  currentPermission: currentPermissionLevel,
                });

                return;
              }

              const nextRecords = records.filter(function (_, recordIndex) {
                return recordIndex !== index;
              });

              saveRecords(nextRecords);
              renderRecords();

              emitRuntimeEvent("record.deleted", {
                index,
              });
              ${refreshRuntimeStats}
            }
          });
        }

        function clearRecords() {
            if (!canAccess(permissions.delete)) {
              emitRuntimeEvent("permission.denied", {
                operation: "clear records",
                requiredPermission: permissions.delete,
                currentPermission: currentPermissionLevel,
              });

              return;
            }

            saveRecords([]);
            renderRecords();

            emitRuntimeEvent("records.cleared", {});
            ${refreshRuntimeStats}
        }

        if (clearRecordsButton) {
          clearRecordsButton.addEventListener("click", clearRecords);
        }

        if (clearTableRecordsButton) {
          clearTableRecordsButton.addEventListener("click", clearRecords);
        }

        ${diagnosticsListeners}

        renderRecords();
        ${diagnosticsStartup}
      })();
    </script>
  `;
}
