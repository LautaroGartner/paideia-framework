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
assert.match(runtime.build?.id, /^[0-9a-f]{7,16}$/);
assert.equal(typeof runtime.build?.generatedAt, "string");
assert.equal(runtime.build?.mode, "production");
assert.equal(typeof runtime.build?.artifactCount, "number");
assert.equal(Array.isArray(runtime.artifacts), true);
assert.equal(typeof runtime.site?.pages, "number");
assert.equal(typeof runtime.site?.posts, "number");
assert.equal(runtime.runtime?.inspectable, true);
assert.equal(runtime.runtime?.normalizedManifest, true);
assert.equal(runtime.runtime?.agentReadable, true);

assert.equal(
  runtime.build.artifactCount,
  runtime.artifacts.length,
  "artifactCount should match runtime artifact inventory"
);

assert.deepEqual(
  runtime.artifacts.map((artifact) => artifact.path).sort(),
  listDistFiles(),
  "artifact inventory should match generated dist files"
);

for (const artifact of runtime.artifacts) {
  const artifactPath = path.join(distRoot, artifact.path);

  assert.equal(typeof artifact.path, "string");
  assert.equal(typeof artifact.kind, "string");
  assert.equal(typeof artifact.bytes, "number");
  assert.equal(
    artifact.bytes,
    fs.statSync(artifactPath).size,
    `${artifact.path} byte count should match file size`
  );
}

assert.ok(
  runtime.artifacts.some(
    (artifact) =>
      artifact.path === "runtime.json" &&
      artifact.kind === "runtime-identity"
  )
);

const inspect = spawnSync("node", ["cli.mjs", "inspect"], {
  cwd: repoRoot,
  encoding: "utf8",
});

assert.equal(inspect.status, 0, inspect.stderr);
assert.ok(inspect.stdout.includes("Framework: Paideia Framework"));
assert.ok(inspect.stdout.includes(`Build ID: ${runtime.build.id}`));
assert.ok(inspect.stdout.includes("Artifact kinds:"));
assert.ok(inspect.stdout.includes("Manifest: normalized"));
assert.ok(inspect.stdout.includes("Diagnostics: passing"));

const firstBuildId = runtime.build.id;
const rebuild = spawnSync("npm", ["run", "build"], {
  cwd: repoRoot,
  encoding: "utf8",
});

assert.equal(rebuild.status, 0, rebuild.stderr);

const rebuiltRuntime = readJson("dist/runtime.json");

assert.equal(
  rebuiltRuntime.build?.id,
  firstBuildId,
  "build id should remain stable across unchanged builds"
);

console.log("runtime identity tests passed");
