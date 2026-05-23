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
const packageJsonPath = path.join(packageRoot, "package.json");
const packageBinPath = path.join(packageRoot, "bin", "agentify.mjs");
const packageReadmePath = path.join(packageRoot, "README.md");
const smokeRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "agentify-package-smoke-")
);
const packRoot = path.join(smokeRoot, "pack");
const appRoot = path.join(smokeRoot, "app");

function fail(message, result) {
  console.error(`[agentify-package] ${message}`);

  if (result) {
    console.error(`[agentify-package] command: ${result.command}`);
    console.error(result.output.trim());
  }

  process.exit(1);
}

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

fs.mkdirSync(packRoot, { recursive: true });
fs.mkdirSync(appRoot, { recursive: true });

const npmEnv = {
  ...process.env,
  NPM_CONFIG_CACHE: path.join(smokeRoot, "npm-cache"),
};

try {
  assert.equal(fs.existsSync(packageRoot), true, "package folder should exist");
  assert.equal(fs.existsSync(packageJsonPath), true, "package.json should exist");
  assert.equal(fs.existsSync(packageBinPath), true, "package bin should exist");
  assert.equal(fs.existsSync(packageReadmePath), true, "README should exist");

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  assert.equal(packageJson.name, "agentify");
  assert.equal(packageJson.version, "0.6.0-alpha.1");
  assert.equal(packageJson.bin?.agentify, "./bin/agentify.mjs");

  const readme = fs.readFileSync(packageReadmePath, "utf8");
  assert.ok(readme.includes("system.json"), "README should mention system.json");
  assert.ok(readme.includes("static HTML crawl"), "README should mention static crawl");
  assert.ok(readme.includes("honest receipts"), "README should mention honest receipts");
  assert.ok(readme.includes("limitations"), "README should mention limitations");

  const pack = runSync(
    "npm",
    ["pack", "--pack-destination", packRoot, "--silent"],
    {
      cwd: packageRoot,
      env: npmEnv,
    }
  );
  assert.equal(pack.status, 0, pack.output);

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
  assert.equal(install.status, 0, install.output);

  const agentifyPath = path.join(
    appRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "agentify.cmd" : "agentify"
  );
  const version = runSync(agentifyPath, ["--version"], {
    cwd: appRoot,
  });
  assert.equal(version.status, 0, version.output);
  assert.equal(version.output.trim(), "0.6.0-alpha.1");

  const server = http.createServer((request, response) => {
    if (request.url === "/robots.txt") {
      response.writeHead(200, { "content-type": "text/plain" });
      response.end("User-agent: *\nAllow: /\n");
      return;
    }

    if (request.url === "/about") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end(`<!doctype html>
<html>
  <head>
    <title>About fixture</title>
    <meta name="description" content="About the fixture.">
  </head>
  <body><h1>About</h1></body>
</html>`);
      return;
    }

    response.writeHead(200, { "content-type": "text/html" });
    response.end(`<!doctype html>
<html>
  <head>
    <title>Package fixture</title>
    <meta name="description" content="A fixture for the packaged agentify CLI.">
  </head>
  <body>
    <h1>Package fixture</h1>
    <a href="/about">About</a>
  </body>
</html>`);
  });

  const address = await listen(server);
  const outputDir = path.join(appRoot, "agent");

  try {
    const crawl = await run(
      agentifyPath,
      [
        `http://127.0.0.1:${address.port}/`,
        "--out",
        outputDir,
        "--max-pages",
        "10",
      ],
      {
        cwd: appRoot,
      }
    );
    assert.equal(crawl.status, 0, crawl.output);

    for (const name of [
      "system.json",
      "runtime.json",
      "context.json",
      "llms.txt",
    ]) {
      assert.equal(
        fs.existsSync(path.join(outputDir, name)),
        true,
        `${name} should be generated`
      );
    }

    const runtime = JSON.parse(
      fs.readFileSync(path.join(outputDir, "runtime.json"), "utf8")
    );
    assert.equal(runtime.generator.name, "agentify");
    assert.equal(runtime.generator.version, "0.6.0-alpha.1");
    assert.equal(runtime.renderer, "static-html");
    assert.equal(runtime.crawl.status, "complete");
    assert.equal(runtime.routeCount, 2);
  } finally {
    await close(server);
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  fs.rmSync(smokeRoot, {
    recursive: true,
    force: true,
  });
}

console.log("agentify package smoke passed");
