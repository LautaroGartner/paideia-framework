const demos = [
  {
    id: "static-site",
    label: "static-site",
    path: "../agentify-output/static-site",
  },
  {
    id: "docs-site",
    label: "docs-site",
    path: "../agentify-output/docs-site",
  },
  {
    id: "js-heavy-spa",
    label: "js-heavy-spa",
    path: "../agentify-output/js-heavy-spa",
  },
];

const state = {
  artifacts: {},
  demo: demos[0],
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

function artifactFilesFor(demo) {
  return {
    runtime: `${demo.path}/runtime.json`,
    system: `${demo.path}/system.json`,
    context: `${demo.path}/context.json`,
    llms: `${demo.path}/llms.txt`,
  };
}

async function loadArtifacts() {
  const artifactFiles = artifactFilesFor(state.demo);
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
  const sourceUrl = context.sourceUrl ?? context.source?.url ?? `${state.demo.path}/context.json`;

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

function renderBadges(runtime, context) {
  const crawl = runtime.crawl ?? context.crawl ?? {};
  const codes = new Set(runtime.diagnostics?.codes ?? context.warningCodes ?? []);
  const badges = [crawl.status === "partial" ? "partial" : "complete"];

  if (codes.has("js.required")) {
    badges.push("js-required");
  }

  if (codes.has("missing.title") || codes.has("missing.description")) {
    badges.push("metadata-missing");
  }

  const list = byId("status-badges");
  list.replaceChildren(
    ...badges.map((badge) => {
      const item = document.createElement("span");
      item.className = `badge badge-${badge}`;
      item.textContent = badge;

      return item;
    })
  );
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

function wireDemos() {
  const selector = byId("demo-selector");

  selector.replaceChildren(
    ...demos.map((demo) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "demo-button";
      button.dataset.demo = demo.id;
      button.textContent = demo.label;
      button.addEventListener("click", async () => {
        state.demo = demo;
        await renderDemo();
      });

      return button;
    })
  );
}

function syncDemoButtons() {
  for (const button of document.querySelectorAll(".demo-button")) {
    button.classList.toggle("is-active", button.dataset.demo === state.demo.id);
  }
}

function wireTabs() {
  for (const button of document.querySelectorAll(".tab")) {
    button.addEventListener("click", () => {
      showArtifact(button.dataset.artifact);
    });
  }
}

async function renderDemo() {
  syncDemoButtons();
  byId("artifact-preview").textContent = "Loading artifacts...";

  await loadArtifacts();
  renderSummary(state.artifacts.runtime.value, state.artifacts.context.value);
  renderBadges(state.artifacts.runtime.value, state.artifacts.context.value);
  renderRoutes(state.artifacts.context.value);
  renderFailures(state.artifacts.runtime.value);
  renderCapabilities(state.artifacts.system.value, state.artifacts.runtime.value);
  renderReceipts(state.artifacts.runtime.value, state.artifacts.context.value);
  showArtifact("runtime");
}

async function main() {
  wireDemos();
  wireTabs();

  try {
    await renderDemo();
  } catch (error) {
    byId("artifact-preview").textContent =
      error instanceof Error ? error.message : String(error);
  }
}

main();
