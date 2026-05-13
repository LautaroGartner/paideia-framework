import { spawn } from "node:child_process";
import {
  createReadStream,
  existsSync,
  readFileSync,
  watch,
} from "node:fs";

import { readdir } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";

const ROOT = process.cwd();

const SOURCE_DIR = path.join(ROOT, "src");

const DEV_SERVER_PORT = Number(
  process.env.PAIDEIA_PORT ?? 4317
);

const DIST_DIR = path.join(ROOT, "dist");

const BUILD_ENTRY = path.join(
  ROOT,
  "build",
  "index.js"
);

const PACKAGE_JSON_PATH = path.join(
  ROOT,
  "package.json"
);

const TSC_BIN = path.join(
  ROOT,
  "node_modules",
  ".bin",
  process.platform === "win32"
    ? "tsc.cmd"
    : "tsc"
);

const packageJson = JSON.parse(
  readFileSync(PACKAGE_JSON_PATH, "utf8")
);

const VERSION =
  packageJson.version ?? "unknown";

const WATCH_DEBOUNCE_MS = 90;

let watchers = [];

let currentChild = null;

let rebuildTimer = null;

let rebuildInFlight = false;

let queuedReason = null;

let previouslyFailed = false;

let shuttingDown = false;

let fallbackDirectoryWatchMode = false;

let devServer = null;

let recentBrowserEvents = [];

let cli = null;

function now() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function log(symbol, message) {
  console.log(
    `[${now()}] ${symbol} ${message}`
  );
}

function getContentType(filePath) {
  if (filePath.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }

  if (filePath.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }

  if (filePath.endsWith(".sql")) {
    return "text/plain; charset=utf-8";
  }

  if (filePath.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }

  if (filePath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }

  return "application/octet-stream";
}

function resolveRequestPath(requestUrl) {
  const url = new URL(
    requestUrl ?? "/",
    `http://localhost:${DEV_SERVER_PORT}`
  );

  if (url.pathname === "/" || url.pathname === "/index.html") {
    return path.join(DIST_DIR, "index.html");
  }

  if (url.pathname === "/system.json") {
    return path.join(DIST_DIR, "system.json");
  }

  if (url.pathname === "/schema.sql") {
    return path.join(DIST_DIR, "schema.sql");
  }

  return null;
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk.toString();
    });

    request.on("end", () => {
      resolve(body);
    });

    request.on("error", reject);
  });
}

function sendJson(response, value, statusCode = 200) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });

  response.end(JSON.stringify(value, null, 2));
}

function readJsonFile(relativePath) {
  const filePath = path.join(ROOT, relativePath);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function startDevServer() {
  const server = createServer(async (request, response) => {
    if (
      request.method === "POST" &&
      request.url === "/__paideia/events"
    ) {
      try {
        const rawBody = await readRequestBody(request);
        const event = JSON.parse(rawBody);

        const eventName =
          typeof event.eventName === "string"
            ? event.eventName
            : "unknown";

        recentBrowserEvents = [
          {
            eventName,
            payload: event.payload ?? {},
            createdAt: new Date().toISOString(),
          },
          ...recentBrowserEvents,
        ].slice(0, 20);

        log("Browser", eventName);

        response.writeHead(204);
        response.end();
      } catch {
        response.writeHead(400, {
          "Content-Type": "text/plain; charset=utf-8",
        });

        response.end("Invalid Paideia event");
      }

      return;
    }

    if (
      request.method === "GET" &&
      request.url === "/__paideia/manifest"
    ) {
      const manifest = readJsonFile("dist/system.json");

      if (!manifest) {
        sendJson(response, {
          error: "Manifest not found",
        }, 404);

        return;
      }

      sendJson(response, manifest);
      return;
    }

    if (
      request.method === "GET" &&
      request.url === "/__paideia/schema"
    ) {
      const filePath = path.join(ROOT, "dist/schema.sql");

      if (!existsSync(filePath)) {
        sendJson(response, {
          error: "Schema not found",
        }, 404);

        return;
      }

      sendJson(response, {
        schema: readFileSync(filePath, "utf8"),
      });

      return;
    }

    if (
      request.method === "GET" &&
      request.url === "/__paideia/events"
    ) {
      sendJson(response, {
        events: recentBrowserEvents,
      });

      return;
    }

    if (
      request.method === "GET" &&
      request.url === "/__paideia/accessibility"
    ) {
      sendJson(response, getAccessibilityReport());
      return;
    }

    if (
      request.method === "GET" &&
      request.url === "/__paideia/runtime"
    ) {
      const manifest = readJsonFile("dist/system.json");

      sendJson(response, {
        framework: manifest?.framework ?? null,
        resource: manifest?.resource ?? null,
        runtime: manifest?.runtime ?? null,
        capabilities: manifest?.capabilities ?? [],
        api: manifest?.api ?? null,
        ai: manifest?.ai ?? null,
        trust: manifest?.trust ?? null,
        recentEvents: recentBrowserEvents,
        accessibility: getAccessibilityReport(),
      });

      return;
    }

    const filePath = resolveRequestPath(request.url);

    if (!filePath || !existsSync(filePath)) {
      response.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8",
      });

      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": getContentType(filePath),
      "Cache-Control": "no-store",
    });

    createReadStream(filePath).pipe(response);
  });

  server.listen(DEV_SERVER_PORT, () => {
    console.log("Local");
    console.log(`  http://localhost:${DEV_SERVER_PORT}`);
    console.log("");
    console.log("Generated");
    console.log("  /            → dist/index.html");
    console.log("  /system.json → dist/system.json");
    console.log("  /schema.sql  → dist/schema.sql");
    console.log("");
  });

  return server;
}

function readGeneratedHtml() {
  const filePath = path.join(DIST_DIR, "index.html");

  if (!existsSync(filePath)) {
    return null;
  }

  return readFileSync(filePath, "utf8");
}

function getAccessibilityReport() {
  const html = readGeneratedHtml();

  if (!html) {
    return {
      available: false,
      checks: [],
      passed: 0,
      total: 0,
    };
  }

  const checks = [
    {
      label: "Form fields have labels",
      passed: html.includes("<label"),
    },
    {
      label: "Required fields are marked",
      passed: html.includes("required") || html.includes("required-field"),
    },
    {
      label: "Invalid fields can use aria-invalid",
      passed: html.includes("aria-invalid"),
    },
    {
      label: "Field-level errors are generated",
      passed: html.includes("data-error-for"),
    },
    {
      label: "Validation summary exists",
      passed: html.includes("form-summary"),
    },
    {
      label: "Tables have headers",
      passed: html.includes("<th"),
    },
    {
      label: "Buttons have readable text",
      passed: html.includes("<button"),
    },
    {
      label: "Generated sections are identifiable",
      passed: html.includes("data-paideia-section"),
    },
  ];

  return {
    available: true,
    checks,
    passed: checks.filter((check) => check.passed).length,
    total: checks.length,
  };
}

function runAccessibilityReport() {
  const report = getAccessibilityReport();

  if (!report.available) {
    log("✕", "No generated HTML found. Run a build first.");
    return;
  }

  console.log("");
  console.log("Accessibility report");
  console.log("");

  for (const check of report.checks) {
    console.log(
      `${check.passed ? "✓" : "✕"} ${check.label}`
    );
  }

  console.log("");
  console.log(`${report.passed}/${report.total} checks passed`);
  console.log("");
}

function printHelp() {
  console.log("");
  console.log("Paideia CLI commands");
  console.log("");
  console.log("  help      Show commands");
  console.log("  open      Open local dev server");
  console.log("  runtime   Print runtime inspector summary");
  console.log("  manifest  Print dist/system.json");
  console.log("  schema    Print dist/schema.sql");
  console.log("  events    Show recent browser events");
  console.log("  a11y      Run accessibility report");
  console.log("  clear     Clear terminal");
  console.log("  exit      Stop dev runtime");
  console.log("");
}

function printFile(relativePath) {
  const filePath = path.join(ROOT, relativePath);

  if (!existsSync(filePath)) {
    log("✕", `${relativePath} does not exist.`);
    return;
  }

  console.log("");
  console.log(readFileSync(filePath, "utf8"));
  console.log("");
}

function printRecentEvents() {
  console.log("");
  console.log("Recent browser events");
  console.log("");

  if (recentBrowserEvents.length === 0) {
    console.log("No browser events yet.");
    console.log("");
    return;
  }

  for (const event of recentBrowserEvents) {
    console.log(
      `• ${event.eventName} · ${event.createdAt}`
    );
  }

  console.log("");
}

function openDevServer() {
  const url = `http://localhost:${DEV_SERVER_PORT}`;

  const command =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "cmd"
        : "xdg-open";

  const args =
    process.platform === "win32"
      ? ["/c", "start", url]
      : [url];

  spawn(command, args, {
    stdio: "ignore",
    detached: true,
  }).unref();

  log("✓", `Opened ${url}`);
}

function handleCliCommand(input) {
  const command = input.trim();

  if (!command) return;

  if (command === "help") {
    printHelp();
    return;
  }

  if (command === "open") {
    openDevServer();
    return;
  }

  if (command === "runtime") {
    const manifest = readJsonFile("dist/system.json");
    const accessibility = getAccessibilityReport();

    console.log("");
    console.log("Runtime inspector");
    console.log("");

    if (!manifest) {
      console.log("No manifest found.");
      console.log("");
      return;
    }

    console.log(`Framework: ${manifest.framework?.name ?? "unknown"}`);
    console.log(`Version: ${manifest.framework?.version ?? "unknown"}`);
    console.log(`Mode: ${manifest.framework?.mode ?? "unknown"}`);
    console.log(`Resource: ${manifest.resource?.name ?? "unknown"}`);
    console.log(`Runtime target: ${manifest.runtime?.target ?? "unknown"}`);
    console.log(`Capabilities: ${(manifest.capabilities ?? []).length}`);
    console.log(`Recent events: ${recentBrowserEvents.length}`);
    console.log(`Accessibility: ${accessibility.passed}/${accessibility.total}`);
    console.log("");

    return;
  }

  if (command === "manifest") {
    printFile("dist/system.json");
    return;
  }

  if (command === "schema") {
    printFile("dist/schema.sql");
    return;
  }

  if (command === "events") {
    printRecentEvents();
    return;
  }

  if (command === "a11y") {
    runAccessibilityReport();
    return;
  }

  if (command === "clear") {
    console.clear();
    printBanner();
    return;
  }

  if (command === "exit") {
    shutdown(0);
    return;
  }

  log("?", `Unknown command: ${command}`);
  console.log("Type help to see available commands.");
}

function startInteractiveCli() {
  cli = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "Paideia> ",
  });

  cli.on("line", (line) => {
    handleCliCommand(line);
    cli?.prompt();
  });

  cli.on("close", () => {
    shutdown(0);
  });

  console.log("Type help for CLI commands.");
  cli.prompt();
}

function printBanner() {
  console.log("");

  console.log(
    `Paideia Framework v${VERSION}`
  );

  console.log(
    "Live development runtime started."
  );

  console.log("");

  console.log("Mode");

  console.log("  development");

  console.log("");
}

function printIndented(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  for (const line of lines) {
    console.log(`  ${line}`);
  }
}

function getTscSpawnConfig() {
  if (process.platform === "win32") {
    return {
      command:
        process.env.ComSpec ?? "cmd.exe",

      args: [
        "/c",
        TSC_BIN,
        "--pretty",
        "false",
      ],
    };
  }

  return {
    command: TSC_BIN,

    args: [
      "--pretty",
      "false",
    ],
  };
}

function runProcess(
  command,
  args,
  extraEnv = {}
) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: ROOT,

      env: {
        ...process.env,
        ...extraEnv,
      },

      stdio: [
        "ignore",
        "pipe",
        "pipe",
      ],

      shell: false,
    });

    currentChild = child;

    let stdout = "";

    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      currentChild = null;

      resolve({
        ok: false,
        code: 1,
        stdout,
        stderr:
          `${stderr}${error.message}`,
      });
    });

    child.on("close", (code) => {
      currentChild = null;

      resolve({
        ok: code === 0,
        code: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

function scheduleRebuild(reason) {
  if (shuttingDown) return;

  if (rebuildTimer) {
    clearTimeout(rebuildTimer);
  }

  rebuildTimer = setTimeout(() => {
    rebuildTimer = null;

    void rebuild(reason);
  }, WATCH_DEBOUNCE_MS);
}

async function rebuild(reason) {
  if (shuttingDown) return;

  if (rebuildInFlight) {
    queuedReason = reason;
    return;
  }

  rebuildInFlight = true;

  if (reason === "startup") {
    log(
      "•",
      "Generating the initial development system..."
    );
  } else {
    log(
      "↻",
      `Change detected: ${reason}`
    );
  }

  log(
    "…",
    "Type-checking and compiling source..."
  );

  const tsc = getTscSpawnConfig();

  const compileResult =
    await runProcess(
      tsc.command,
      tsc.args
    );

  if (!compileResult.ok) {
    previouslyFailed = true;

    log(
      "✕",
      "TypeScript build failed."
    );

    if (compileResult.stdout) {
      printIndented(
        compileResult.stdout
      );
    }

    if (compileResult.stderr) {
      printIndented(
        compileResult.stderr
      );
    }

    log(
      "•",
      "Waiting for changes..."
    );

    finishRebuild();

    return;
  }

  log(
    "✓",
    "TypeScript compilation complete."
  );

  log(
    "…",
    "Regenerating the development system..."
  );

  const generationResult =
    await runProcess(
      process.execPath,
      [BUILD_ENTRY],
      {
        NODE_ENV: "development",
      }
    );

  if (!generationResult.ok) {
    previouslyFailed = true;

    log(
      "✕",
      "Paideia generation failed."
    );

    if (generationResult.stdout) {
      printIndented(
        generationResult.stdout
      );
    }

    if (generationResult.stderr) {
      printIndented(
        generationResult.stderr
      );
    }

    log(
      "•",
      "Waiting for changes..."
    );

    finishRebuild();

    return;
  }

  if (previouslyFailed) {
    log("✓", "Build recovered.");
  }

  previouslyFailed = false;

  log(
    "✓",
    "Development system regenerated."
  );

  if (generationResult.stdout) {
    printIndented(
      generationResult.stdout
    );
  }

  if (generationResult.stderr) {
    printIndented(
      generationResult.stderr
    );
  }

  log(
    "•",
    "Watching for changes..."
  );

  finishRebuild();
}

function finishRebuild() {
  rebuildInFlight = false;

  if (
    !queuedReason ||
    shuttingDown
  ) {
    return;
  }

  const nextReason =
    queuedReason;

  queuedReason = null;

  void rebuild(nextReason);
}

function relativeFileLabel(
  baseDir,
  filename,
  eventType
) {
  if (!filename) {
    return `${
      path.relative(ROOT, baseDir) || "."
    } (${eventType})`;
  }

  const filenameText =
    filename.toString();

  const changedPath =
    path.join(baseDir, filenameText);

  return `${
    path.relative(ROOT, changedPath)
  } (${eventType})`;
}

function addWatcher(
  targetPath,
  recursive
) {
  const watcher = watch(
    targetPath,
    {
      persistent: true,
      recursive,
    },
    (eventType, filename) => {
      const reason =
        relativeFileLabel(
          targetPath,
          filename,
          eventType
        );

      scheduleRebuild(reason);

      if (
        fallbackDirectoryWatchMode &&
        eventType === "rename"
      ) {
        void refreshFallbackDirectoryWatchers();
      }
    }
  );

  watcher.on("error", (error) => {
    log(
      "!",
      `Watcher warning: ${error.message}`
    );
  });

  watchers.push(watcher);
}

async function listDirectories(
  rootDir
) {
  const directories = [rootDir];

  for (
    let index = 0;
    index < directories.length;
    index += 1
  ) {
    const directory =
      directories[index];

    let entries = [];

    try {
      entries = await readdir(
        directory,
        {
          withFileTypes: true,
        }
      );
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      directories.push(
        path.join(
          directory,
          entry.name
        )
      );
    }
  }

  return directories;
}

function closeWatchers() {
  for (const watcher of watchers) {
    watcher.close();
  }

  watchers = [];
}

async function refreshFallbackDirectoryWatchers() {
  if (
    shuttingDown ||
    !fallbackDirectoryWatchMode
  ) {
    return;
  }

  closeWatchers();

  const directories =
    await listDirectories(
      SOURCE_DIR
    );

  for (const directory of directories) {
    addWatcher(directory, false);
  }

  addConfigFileWatchers();

  log(
    "↺",
    `Refreshed fallback watchers across ${directories.length} source directories.`
  );
}

function addConfigFileWatchers() {
  const configFiles = [
    path.join(ROOT, "package.json"),
    path.join(ROOT, "tsconfig.json"),
  ];

  for (const configFile of configFiles) {
    if (!existsSync(configFile)) {
      continue;
    }

    const parentDir =
      path.dirname(configFile);

    const fileName =
      path.basename(configFile);

    const watcher = watch(
      parentDir,
      { persistent: true },
      (eventType, filename) => {
        if (
          !filename ||
          filename.toString() ===
            fileName
        ) {
          scheduleRebuild(
            `${
              path.relative(
                ROOT,
                configFile
              )
            } (${eventType})`
          );
        }
      }
    );

    watcher.on("error", (error) => {
      log(
        "!",
        `Watcher warning: ${error.message}`
      );
    });

    watchers.push(watcher);
  }
}

async function startWatchers() {
  if (!existsSync(SOURCE_DIR)) {
    log(
      "✕",
      "Cannot start dev runtime: src/ does not exist."
    );

    process.exitCode = 1;

    return;
  }

  try {
    addWatcher(SOURCE_DIR, true);

    addConfigFileWatchers();

    log(
      "✓",
      "Watching src/ recursively, plus package.json and tsconfig.json."
    );

    return;
  } catch {
    fallbackDirectoryWatchMode =
      true;

    const directories =
      await listDirectories(
        SOURCE_DIR
      );

    for (const directory of directories) {
      addWatcher(directory, false);
    }

    addConfigFileWatchers();

    log(
      "✓",
      `Watching ${directories.length} source directories with fallback mode.`
    );
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;

  shuttingDown = true;

  if (rebuildTimer) {
    clearTimeout(rebuildTimer);

    rebuildTimer = null;
  }

  if (cli) {
    cli.removeAllListeners("close");
    cli.close();
    cli = null;
  }

  closeWatchers();

  if (
    currentChild &&
    !currentChild.killed
  ) {
    currentChild.kill("SIGTERM");
  }

  if (devServer) {
    devServer.close();
  }

  console.log("");
  console.log("Paideia runtime stopped.");
  console.log("Goodbye!");

  process.exit(exitCode);
}

process.on("SIGINT", () => {
  shutdown(0);
});

process.on("SIGTERM", () => {
  shutdown(0);
});

process.on(
  "uncaughtException",
  (error) => {
    log(
      "✕",
      `Unexpected dev runtime error: ${error.message}`
    );

    shutdown(1);
  }
);

process.on(
  "unhandledRejection",
  (reason) => {
    const message =
      reason instanceof Error
        ? reason.message
        : String(reason);

    log(
      "✕",
      `Unhandled dev runtime rejection: ${message}`
    );

    shutdown(1);
  }
);

printBanner();

await rebuild("startup");

devServer = startDevServer();

await startWatchers();

startInteractiveCli();
