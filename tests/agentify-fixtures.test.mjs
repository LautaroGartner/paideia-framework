import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateAgentify } from "../scripts/agentify.mjs";

const repoRoot = path.dirname(
  path.dirname(fileURLToPath(import.meta.url))
);
const fixturesRoot = path.join(repoRoot, "packages", "agentify", "fixtures");
const expectedFixtures = [
  "complete-static-site",
  "missing-metadata-site",
  "partial-js-site",
  "rate-limited-site",
  "redirected-site",
];

function readRuntime(name) {
  return JSON.parse(
    fs.readFileSync(
      path.join(fixturesRoot, name, "runtime.json"),
      "utf8"
    )
  );
}

for (const name of expectedFixtures) {
  const fixtureRoot = path.join(fixturesRoot, name);

  for (const artifact of [
    "system.json",
    "runtime.json",
    "context.json",
    "llms.txt",
  ]) {
    assert.equal(
      fs.existsSync(path.join(fixtureRoot, artifact)),
      true,
      `${name} should include ${artifact}`
    );
  }

  const validation = validateAgentify(fixtureRoot);
  assert.equal(
    validation.valid,
    true,
    `${name} should validate\n${validation.errors.join("\n")}`
  );
}

const complete = readRuntime("complete-static-site");
assert.equal(complete.crawl.status, "complete");
assert.equal(complete.diagnostics.warnings, 0);
assert.equal(complete.crawl.receipts.length, 2);
assert.equal(complete.crawl.sitemap.status, "fetched");

const partialJs = readRuntime("partial-js-site");
assert.equal(partialJs.crawl.status, "complete");
assert.ok(partialJs.diagnostics.codes.includes("js.required"));

const rateLimited = readRuntime("rate-limited-site");
assert.equal(rateLimited.crawl.status, "partial");
assert.equal(rateLimited.crawl.failures[0].status, 429);
assert.ok(rateLimited.diagnostics.codes.includes("crawl.partial"));
assert.ok(rateLimited.diagnostics.codes.includes("route.fetch_failed"));

const missingMetadata = readRuntime("missing-metadata-site");
assert.ok(missingMetadata.diagnostics.codes.includes("missing.title"));
assert.ok(missingMetadata.diagnostics.codes.includes("missing.description"));

const redirected = readRuntime("redirected-site");
assert.equal(redirected.crawl.receipts[0].redirected, true);
assert.deepEqual(redirected.crawl.receipts[0].redirectChain, [
  "https://redirect.fixture.agentify.test/",
  "https://redirect.fixture.agentify.test/final",
]);

console.log("agentify fixture tests passed");
