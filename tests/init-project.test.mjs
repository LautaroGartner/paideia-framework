import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(
  path.dirname(fileURLToPath(import.meta.url))
);

const testRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "paideia-init-")
);

const cliPath = path.join(repoRoot, "cli.mjs");

function run(args) {
  return spawnSync(
    process.execPath,
    [cliPath, ...args],
    {
      cwd: testRoot,
      encoding: "utf8",
    }
  );
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

try {
  const created = run(["init", "my-site"]);

  assert.equal(
    created.status,
    0,
    `${created.stdout}${created.stderr}`
  );

  const projectRoot = path.join(testRoot, "my-site");

  for (const relativePath of [
    "package.json",
    "tsconfig.json",
    "README.md",
    "src/site.ts",
    "src/writing/first-post.ts",
    "src/writing/index.ts",
  ]) {
    assert.equal(
      fs.existsSync(path.join(projectRoot, relativePath)),
      true,
      `${relativePath} should exist`
    );
  }

  const pkg = readJson(path.join(projectRoot, "package.json"));

  assert.equal(pkg.scripts.build, "paideia build");
  assert.equal(pkg.scripts.start, "paideia start");
  assert.equal(pkg.scripts.doctor, "paideia doctor");
  assert.equal(pkg.scripts["new:post"], "paideia new post");

  const occupiedDir = path.join(testRoot, "occupied");

  fs.mkdirSync(occupiedDir);
  fs.writeFileSync(path.join(occupiedDir, "file.txt"), "content");

  const duplicate = run(["init", "occupied"]);

  assert.notEqual(duplicate.status, 0);
  assert.ok(
    `${duplicate.stdout}${duplicate.stderr}`.includes(
      "target directory is not empty"
    )
  );
} finally {
  fs.rmSync(testRoot, {
    recursive: true,
    force: true,
  });
}

console.log("init project tests passed");
