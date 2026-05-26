import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateAgentify } from "../scripts/agentify.mjs";

const repoRoot = path.dirname(
  path.dirname(fileURLToPath(import.meta.url))
);
const corpusRoot = path.join(repoRoot, "examples", "agentify-corpus");
const corpusManifest = readJson(corpusRoot, "corpus.json");

function readJson(...segments) {
  return JSON.parse(
    fs.readFileSync(path.join(...segments), "utf8")
  );
}

assert.equal(corpusManifest.schemaVersion, "0.1");
assert.equal(Array.isArray(corpusManifest.entries), true);

for (const entry of corpusManifest.entries) {
  const name = entry.id;
  const expected = entry.expectations;
  const entryRoot = path.join(corpusRoot, name);

  for (const artifact of [
    "system.json",
    "runtime.json",
    "context.json",
    "llms.txt",
  ]) {
    assert.equal(
      fs.existsSync(path.join(entryRoot, artifact)),
      true,
      `${name} should include ${artifact}`
    );
  }

  const validation = validateAgentify(entryRoot);
  assert.equal(
    validation.valid,
    true,
    `${name} should validate\n${validation.errors.join("\n")}`
  );

  const runtime = readJson(entryRoot, "runtime.json");

  assert.equal(runtime.sourceUrl, entry.sourceUrl);
  assert.equal(runtime.crawl.status, expected.crawlStatus);
  assert.ok(
    [
      "high",
      "medium",
      "partial",
      "low",
    ].includes(entry.classification.machineReadability),
    `${name} should classify machine readability`
  );
  assert.ok(
    [
      "complete",
      "limited",
      "blocked",
      "failed",
    ].includes(entry.classification.crawlability),
    `${name} should classify crawlability`
  );
  assert.equal(typeof entry.notes, "string");
  assert.ok(entry.notes.length > 0);

  if (typeof expected.minFetched === "number") {
    assert.ok(
      runtime.crawl.fetched >= expected.minFetched,
      `${name} should fetch at least ${expected.minFetched} routes`
    );
  }

  if (expected.sitemapStatus) {
    assert.equal(runtime.crawl.sitemap.status, expected.sitemapStatus);
  }

  if (expected.robotsStatus) {
    assert.equal(runtime.crawl.robots.status, expected.robotsStatus);
  }

  if (expected.failureStatus) {
    assert.equal(
      runtime.crawl.failures[0]?.status,
      expected.failureStatus,
      `${name} should preserve failure status ${expected.failureStatus}`
    );
  }

  for (const code of expected.diagnosticCodes ?? []) {
    assert.ok(
      runtime.diagnostics.codes.includes(code),
      `${name} should include diagnostic code ${code}`
    );
  }
}

assert.deepEqual(
  fs.readdirSync(corpusRoot)
    .filter((entry) => fs.statSync(path.join(corpusRoot, entry)).isDirectory())
    .sort(),
  corpusManifest.entries.map((entry) => entry.id).sort(),
  "corpus directories should match test expectations"
);

console.log("agentify corpus tests passed");
