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
  assert.equal(packageJson.name, "@lautarogartner/agentify");
  assert.equal(packageJson.version, "0.7.1-alpha.2");
  assert.equal(packageJson.bin?.agentify, "bin/agentify.mjs");

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
  assert.equal(version.output.trim(), "0.7.1-alpha.2");

  const server = http.createServer((request, response) => {
    if (request.url === "/robots.txt") {
      response.writeHead(200, { "content-type": "text/plain" });
      response.end("User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n");
      return;
    }

    if (request.url === "/sitemap.xml") {
      response.writeHead(200, { "content-type": "application/xml" });
      response.end(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>http://127.0.0.1/</loc></url>
</urlset>`);
      return;
    }

    if (request.url === "/rate-limited") {
      response.writeHead(429, { "content-type": "text/plain" });
      response.end("Too Many Requests");
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
    <a href="/rate-limited">Rate limited</a>
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
    assert.ok(
      crawl.output.includes("[agentify] warnings:"),
      "crawl output should show warnings"
    );
    assert.ok(
      crawl.output.includes("- http.429 (Too Many Requests)"),
      "crawl output should show HTTP 429 warning"
    );
    assert.ok(
      crawl.output.includes("[agentify] output:"),
      "crawl output should group written artifacts"
    );

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
    assert.equal(runtime.generator.version, "0.7.1-alpha.2");
    assert.deepEqual(runtime.renderer, {
      mode: "static-html",
      javascriptExecuted: false,
    });
    assert.equal(runtime.crawl.status, "partial");
    assert.equal(runtime.routeCount, 2);
    assert.equal(runtime.crawl.failed, 1);
    assert.equal(runtime.crawl.receipts.length, 2);
    assert.equal(runtime.crawl.sitemap.status, "fetched");
    assert.equal(runtime.crawl.sitemap.discoveredVia, "default");
    assert.equal(runtime.crawl.sitemap.receipt.status, 200);
    assert.equal(runtime.crawl.receipts[0].status, 200);
    assert.match(runtime.artifacts[0].sha256, /^[a-f0-9]{64}$/);

    const inspect = await run(agentifyPath, ["inspect", outputDir], {
      cwd: appRoot,
    });
    assert.equal(inspect.status, 0, inspect.output);
    assert.ok(
      inspect.output.includes("Source: "),
      "inspect output should show source"
    );
    assert.ok(
      inspect.output.includes("Status: partial"),
      "inspect output should show crawl status"
    );
    assert.ok(
      inspect.output.includes("- http.429 (Too Many Requests)"),
      "inspect output should show HTTP 429 warning"
    );
    assert.ok(
      inspect.output.includes("- javascript: disabled"),
      "inspect output should show renderer JavaScript mode"
    );

    const explain = await run(agentifyPath, ["explain", outputDir], {
      cwd: appRoot,
    });
    assert.equal(explain.status, 0, explain.output);
    assert.ok(
      explain.output.includes("Agentify Runtime Explanation"),
      "explain output should have a title"
    );
    assert.ok(
      explain.output.includes("Renderer\n  static-html"),
      "explain output should show renderer mode"
    );
    assert.ok(
      explain.output.includes("javascript executed: no"),
      "explain output should show JavaScript execution"
    );
    assert.ok(
      explain.output.includes("status: partial"),
      "explain output should show crawl status"
    );
    assert.ok(
      explain.output.includes("validation: passed"),
      "explain output should show validation status"
    );
    assert.ok(
      explain.output.includes("sitemap.xml: yes"),
      "explain output should show sitemap discovery"
    );
    assert.ok(
      explain.output.includes("runtime.json"),
      "explain output should list runtime artifact"
    );

    const validate = await run(agentifyPath, ["validate", outputDir], {
      cwd: appRoot,
    });
    assert.equal(validate.status, 0, validate.output);
    assert.ok(
      validate.output.includes("[agentify] validation passed"),
      "validate output should confirm valid artifacts"
    );
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
