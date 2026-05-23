import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(
  path.dirname(fileURLToPath(import.meta.url))
);
const packageRoot = path.join(repoRoot, "packages", "agentify");
const smokeRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "agentify-install-smoke-")
);
const packRoot = path.join(smokeRoot, "pack");
const appRoot = path.join(smokeRoot, "app");

function runSync(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    env: options.env ?? process.env,
  });

  return {
    command: `${command} ${args.join(" ")}`,
    status: result.status ?? 1,
    output: `${result.stdout}${result.stderr}`,
  };
}

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: options.env ?? process.env,
    });
    let output = "";

    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("close", (status) => {
      resolve({
        command: `${command} ${args.join(" ")}`,
        status: status ?? 1,
        output,
      });
    });
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve(server.address());
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function assertCommand(result, message) {
  assert.equal(
    result.status,
    0,
    `${message}\n${result.command}\n${result.output}`
  );
}

fs.mkdirSync(packRoot, { recursive: true });
fs.mkdirSync(appRoot, { recursive: true });

const npmEnv = {
  ...process.env,
  NPM_CONFIG_CACHE: path.join(smokeRoot, "npm-cache"),
};

try {
  const pack = runSync(
    "npm",
    ["pack", "--pack-destination", packRoot, "--silent"],
    {
      cwd: packageRoot,
      env: npmEnv,
    }
  );
  assertCommand(pack, "npm pack should succeed");

  const tarball = fs
    .readdirSync(packRoot)
    .find((entry) => entry.endsWith(".tgz"));
  assert.ok(tarball, "npm pack should create a tarball");

  const install = runSync(
    "npm",
    [
      "install",
      "--ignore-scripts",
      path.join(packRoot, tarball),
    ],
    {
      cwd: appRoot,
      env: npmEnv,
    }
  );
  assertCommand(install, "npm install from packed tarball should succeed");

  const version = runSync(
    "npx",
    ["agentify", "--version"],
    {
      cwd: appRoot,
      env: npmEnv,
    }
  );
  assertCommand(version, "npx agentify --version should succeed");
  assert.equal(version.output.trim(), "0.6.0-alpha.1");

  const server = http.createServer((request, response) => {
    if (request.url === "/robots.txt") {
      response.writeHead(200, { "content-type": "text/plain" });
      response.end("User-agent: *\nAllow: /\n");
      return;
    }

    if (request.url === "/docs") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end(`<!doctype html>
<html>
  <head>
    <title>Docs fixture</title>
    <meta name="description" content="Fixture documentation.">
  </head>
  <body>
    <h1>Docs</h1>
    <h2>Install</h2>
  </body>
</html>`);
      return;
    }

    response.writeHead(200, { "content-type": "text/html" });
    response.end(`<!doctype html>
<html>
  <head>
    <title>Install smoke fixture</title>
    <meta name="description" content="A fixture for npx agentify.">
  </head>
  <body>
    <h1>Install smoke fixture</h1>
    <a href="/docs">Docs</a>
  </body>
</html>`);
  });

  const address = await listen(server);

  try {
    const crawl = await run(
      "npx",
      [
        "agentify",
        `http://127.0.0.1:${address.port}/`,
        "--out",
        "./agent",
        "--max-pages",
        "3",
      ],
      {
        cwd: appRoot,
        env: npmEnv,
      }
    );
    assertCommand(crawl, "npx agentify crawl should succeed");

    for (const name of [
      "system.json",
      "runtime.json",
      "context.json",
      "llms.txt",
    ]) {
      assert.equal(
        fs.existsSync(path.join(appRoot, "agent", name)),
        true,
        `${name} should be generated`
      );
    }

    const system = JSON.parse(
      fs.readFileSync(path.join(appRoot, "agent", "system.json"), "utf8")
    );
    const runtime = JSON.parse(
      fs.readFileSync(path.join(appRoot, "agent", "runtime.json"), "utf8")
    );
    const context = JSON.parse(
      fs.readFileSync(path.join(appRoot, "agent", "context.json"), "utf8")
    );
    const llms = fs.readFileSync(
      path.join(appRoot, "agent", "llms.txt"),
      "utf8"
    );

    assert.equal(system.generator.name, "agentify");
    assert.equal(system.artifactSchemaVersion, "0.1");
    assert.equal(context.artifactSchemaVersion, "0.1");
    assert.equal(runtime.artifactSchemaVersion, "0.1");
    assert.equal(runtime.generator.version, "0.6.0-alpha.1");
    assert.equal(context.routeCount, 2);
    assert.equal(runtime.crawl.status, "complete");
    assert.equal(runtime.crawl.fetched, 2);
    assert.equal(runtime.crawl.failed, 0);
    assert.ok(llms.includes("Install smoke fixture"));
  } finally {
    await close(server);
  }
} finally {
  fs.rmSync(smokeRoot, {
    recursive: true,
    force: true,
  });
}

console.log("agentify install smoke passed");
