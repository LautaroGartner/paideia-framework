const artifactFiles = {
  runtime: "./demo/runtime.json",
  system: "./demo/system.json",
  context: "./demo/context.json",
  llms: "./demo/llms.txt",
};

const state = {
  artifacts: {},
};

function byId(id) {
  return document.getElementById(id);
}

function escapeText(value) {
  return String(value ?? "");
}

function setText(id, value) {
  byId(id).textContent = escapeText(value);
}

async function fetchText(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Could not load ${path}`);
  }

  return response.text();
}

async function loadArtifacts() {
  const entries = await Promise.all(
    Object.entries(artifactFiles).map(async ([key, file]) => {
      const text = await fetchText(file);
      const value = file.endsWith(".json") ? JSON.parse(text) : text;

      return [key, { file, text, value }];
    })
  );

  state.artifacts = Object.fromEntries(entries);
}

function renderSummary(runtime, context) {
  const crawl = runtime.crawl ?? context.crawl ?? {};
  const sourceUrl = context.sourceUrl ?? context.source?.url ?? "./demo/context.json";

  setText("crawl-status", crawl.status ?? "unknown");
  setText("crawl-renderer", runtime.renderer ?? context.renderer ?? "unknown");
  setText("crawl-fetched", crawl.fetched ?? context.routeCount ?? 0);
  setText("crawl-failed", crawl.failed ?? context.failedRouteCount ?? 0);
  setText("route-count", context.routeCount ?? context.routes?.length ?? 0);
  setText("site-title", context.site?.title ?? "Unknown site");
  setText("site-description", context.site?.description ?? "");

  const sourceLink = byId("source-link");
  sourceLink.href = sourceUrl;
  sourceLink.textContent = sourceUrl;
}

function renderRoutes(context) {
  const routes = context.routes ?? [];
  const list = byId("routes-list");

  list.replaceChildren(
    ...routes.map((route) => {
      const item = document.createElement("article");
      item.className = "route";

      const path = document.createElement("code");
      path.textContent = route.path ?? "/";

      const body = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = route.title || "Untitled route";
      const description = document.createElement("p");
      description.textContent = route.description || "No description found.";

      const headings = document.createElement("div");
      headings.className = "heading-list";

      for (const heading of route.headings ?? []) {
        const pill = document.createElement("span");
        pill.textContent = heading;
        headings.append(pill);
      }

      body.append(title, description, headings);
      item.append(path, body);

      return item;
    })
  );
}

function renderFailures(runtime) {
  const failures = runtime.crawl?.failures ?? [];
  const list = byId("failures-list");

  if (failures.length === 0) {
    const empty = document.createElement("div");
    empty.className = "failure is-empty";
    empty.textContent = "No failed routes recorded in this crawl.";
    list.replaceChildren(empty);
    return;
  }

  list.replaceChildren(
    ...failures.map((failure) => {
      const item = document.createElement("article");
      item.className = "failure";
      const status = document.createElement("strong");
      status.textContent = failure.status ? `HTTP ${failure.status}` : "Failed";
      const url = document.createElement("code");
      url.textContent = failure.url ?? "";
      const message = document.createElement("p");
      message.textContent = failure.message ?? "No message recorded.";

      item.append(status, url, message);

      return item;
    })
  );
}

function renderCapabilities(system, runtime) {
  const capabilities = system.capabilities ?? runtime.capabilities ?? [];
  const list = byId("capabilities-list");

  list.replaceChildren(
    ...capabilities.map((capability) => {
      const item = document.createElement("span");
      item.className = "capability";
      item.textContent = capability;

      return item;
    })
  );
}

function renderReceipts(runtime, context) {
  const limitations = runtime.limitations ?? context.limitations ?? {};
  const warningCodes = runtime.diagnostics?.codes ?? context.warningCodes ?? [];
  const entries = [
    ...Object.entries(limitations).map(([key, value]) => (
      `${key}: ${value}`
    )),
    ...warningCodes.map((code) => `warning: ${code}`),
  ];
  const list = byId("receipts-list");

  if (entries.length === 0) {
    const item = document.createElement("span");
    item.className = "capability";
    item.textContent = "no warning codes";
    list.replaceChildren(item);
    return;
  }

  list.replaceChildren(
    ...entries.map((entry) => {
      const item = document.createElement("span");
      item.className = "capability";
      item.textContent = entry;

      return item;
    })
  );
}

function showArtifact(name) {
  const artifact = state.artifacts[name];

  if (!artifact) {
    return;
  }

  byId("artifact-preview").textContent = artifact.text;

  for (const button of document.querySelectorAll(".tab")) {
    button.classList.toggle("is-active", button.dataset.artifact === name);
  }
}

function wireTabs() {
  for (const button of document.querySelectorAll(".tab")) {
    button.addEventListener("click", () => {
      showArtifact(button.dataset.artifact);
    });
  }
}

async function main() {
  wireTabs();

  try {
    await loadArtifacts();
    renderSummary(state.artifacts.runtime.value, state.artifacts.context.value);
    renderRoutes(state.artifacts.context.value);
    renderFailures(state.artifacts.runtime.value);
    renderCapabilities(state.artifacts.system.value, state.artifacts.runtime.value);
    renderReceipts(state.artifacts.runtime.value, state.artifacts.context.value);
    showArtifact("runtime");
  } catch (error) {
    byId("artifact-preview").textContent =
      error instanceof Error ? error.message : String(error);
  }
}

main();
