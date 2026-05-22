import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { agentify } from "../scripts/agentify.mjs";

const testRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "paideia-agentify-")
);

const pages = new Map([
  [
    "/",
    `<!doctype html>
<html>
  <head>
    <title>Example Site</title>
    <meta name="description" content="A tiny site for agentify.">
  </head>
  <body>
    <h1>Home</h1>
    <a href="/about">About</a>
    <a href="/docs/">Docs</a>
    <a href="/rate-limited">Rate limited</a>
    <a href="https://external.example/ignored">External</a>
    <a href="#fragment">Fragment</a>
  </body>
</html>`,
  ],
  [
    "/about",
    `<!doctype html>
<html>
  <head>
    <title>About</title>
    <meta name="description" content="About this example site.">
  </head>
  <body>
    <h1>About Example</h1>
    <h2>Purpose</h2>
  </body>
</html>`,
  ],
  [
    "/docs",
    `<!doctype html>
<html>
  <head>
    <title>Docs</title>
    <meta name="description" content="Documentation for the example site.">
  </head>
  <body>
    <h1>Docs Home</h1>
  </body>
</html>`,
  ],
]);

try {
  const result = await agentify("https://example.test/", {
    fetchedAt: "2026-05-22T00:00:00.000Z",
    fetcher: async (url) => {
      const route = new URL(url).pathname.replace(/\/$/, "") || "/";
      const html = pages.get(route);

      if (!html) {
        const error = new Error("Too Many Requests");
        error.status = 429;
        throw error;
      }

      return html;
    },
    maxPages: 10,
    outputDir: path.join(testRoot, "agent"),
    robotsTxt: "User-agent: *\nAllow: /\n",
    userAgent: "agentify-test/1.0",
  });

  assert.equal(result.routes.length, 3);

  for (const relativePath of [
    "agent/system.json",
    "agent/runtime.json",
    "agent/context.json",
    "agent/llms.txt",
  ]) {
    assert.equal(
      fs.existsSync(path.join(testRoot, relativePath)),
      true,
      `${relativePath} should exist`
    );
  }

  const system = JSON.parse(
    fs.readFileSync(path.join(testRoot, "agent", "system.json"), "utf8")
  );
  const runtime = JSON.parse(
    fs.readFileSync(path.join(testRoot, "agent", "runtime.json"), "utf8")
  );
  const context = JSON.parse(
    fs.readFileSync(path.join(testRoot, "agent", "context.json"), "utf8")
  );
  const llms = fs.readFileSync(
    path.join(testRoot, "agent", "llms.txt"),
    "utf8"
  );

  assert.equal(system.site.title, "Example Site");
  assert.equal(system.site.description, "A tiny site for agentify.");
  assert.deepEqual(
    system.routes.map((route) => route.path),
    ["/", "/about", "/docs"]
  );
  assert.equal(system.crawl.maxDepth, 1);
  assert.equal(system.crawl.maxPages, 10);
  assert.equal(system.crawl.status, "partial");
  assert.equal(system.crawl.fetched, 3);
  assert.equal(system.crawl.failed, 1);
  assert.equal(system.crawl.failures[0].status, 429);
  assert.ok(system.crawl.failures[0].url.endsWith("/rate-limited"));
  assert.equal(system.crawl.robots.status, "fetched");
  assert.equal(system.crawl.userAgent, "agentify-test/1.0");
  assert.ok(system.capabilities.includes("site.crawled"));
  assert.ok(system.capabilities.includes("routes.discovered"));
  assert.ok(system.capabilities.includes("metadata.extracted"));
  assert.ok(system.capabilities.includes("crawl.receipts"));

  assert.equal(context.generatedAt, "2026-05-22T00:00:00.000Z");
  assert.equal(context.sourceUrl, "https://example.test/");
  assert.equal(context.routeCount, context.routes.length);
  assert.equal(context.failedRouteCount, 1);
  assert.equal(context.site.title, "Example Site");
  assert.deepEqual(context.routeSummaries[1], {
    path: "/about",
    title: "About",
    description: "About this example site.",
    headingCount: 2,
  });
  assert.deepEqual(
    context.routes.map((route) => route.path),
    ["/", "/about", "/docs"]
  );
  assert.deepEqual(context.routes[1], {
    path: "/about",
    title: "About",
    description: "About this example site.",
    headings: ["About Example", "Purpose"],
  });

  assert.equal(runtime.generator.name, "agentify");
  assert.equal(runtime.diagnostics.status, "partial");
  assert.equal(runtime.crawl.status, "partial");
  assert.equal(runtime.crawl.fetched, 3);
  assert.equal(runtime.crawl.failed, 1);
  assert.equal(runtime.crawl.failures[0].status, 429);
  assert.equal(runtime.crawl.sameOriginOnly, true);
  assert.equal(runtime.crawl.userAgent, "agentify-test/1.0");
  assert.deepEqual(
    runtime.artifacts.map((artifact) => artifact.path).sort(),
    ["context.json", "llms.txt", "runtime.json", "system.json"]
  );

  for (const artifact of runtime.artifacts) {
    const contents = fs.readFileSync(
      path.join(testRoot, "agent", artifact.path),
      "utf8"
    );

    assert.equal(
      artifact.bytes,
      Buffer.byteLength(contents, "utf8"),
      `${artifact.path} byte size should match`
    );
  }

  assert.ok(llms.includes("# Example Site"));
  assert.ok(llms.includes("Generated by agentify."));
  assert.ok(llms.includes("## Site Summary"));
  assert.ok(llms.includes("## Crawl Status"));
  assert.ok(llms.includes("Status: partial"));
  assert.ok(llms.includes("- /about"));
  assert.ok(llms.includes("- /docs"));
  assert.ok(llms.includes("## Crawl Failures"));
  assert.ok(llms.includes("HTTP 429"));
  assert.ok(!llms.includes("external.example"));
} finally {
  fs.rmSync(testRoot, {
    recursive: true,
    force: true,
  });
}

console.log("agentify tests passed");
