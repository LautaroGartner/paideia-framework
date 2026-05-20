import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function fileUrl(path) {
  return new URL(`../${path}`, import.meta.url);
}

const repoRoot = fileURLToPath(fileUrl("."));
const distRoot = path.join(repoRoot, "dist");

function readText(path) {
  return fs.readFileSync(fileUrl(path), "utf8");
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function listDistFiles(dir = distRoot) {
  return fs
    .readdirSync(dir, {
      withFileTypes: true,
    })
    .flatMap((entry) => {
      const entryPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return listDistFiles(entryPath);
      }

      return [
        path.relative(distRoot, entryPath),
      ];
    })
    .sort();
}

assert.equal(
  fs.existsSync(fileUrl("dist/runtime.json")),
  true,
  "dist/runtime.json should exist"
);

const runtime = readJson("dist/runtime.json");

assert.equal(
  runtime.framework?.name,
  "Paideia Framework"
);
assert.equal(typeof runtime.framework?.version, "string");
assert.equal(typeof runtime.build?.generatedAt, "string");
assert.equal(runtime.build?.mode, "production");
assert.equal(typeof runtime.build?.artifactCount, "number");
assert.equal(typeof runtime.site?.pages, "number");
assert.equal(typeof runtime.site?.posts, "number");
assert.equal(runtime.runtime?.inspectable, true);
assert.equal(runtime.runtime?.normalizedManifest, true);
assert.equal(runtime.runtime?.agentReadable, true);

assert.equal(
  runtime.build.artifactCount,
  listDistFiles().length,
  "artifactCount should match generated dist files"
);

const inspect = spawnSync("node", ["cli.mjs", "inspect"], {
  cwd: repoRoot,
  encoding: "utf8",
});

assert.equal(inspect.status, 0, inspect.stderr);
assert.ok(inspect.stdout.includes("Framework: Paideia Framework"));
assert.ok(inspect.stdout.includes("Manifest: normalized"));
assert.ok(inspect.stdout.includes("Diagnostics: passing"));

console.log("runtime identity tests passed");
