import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(
  path.dirname(fileURLToPath(import.meta.url))
);

const exampleRoot = path.join(
  repoRoot,
  "examples",
  "docs-site"
);

function runProject(args) {
  return spawnSync(
    "npm",
    args,
    {
      cwd: exampleRoot,
      encoding: "utf8",
    }
  );
}

function symlinkForce(target, linkPath, type) {
  fs.rmSync(linkPath, {
    force: true,
    recursive: true,
  });
  fs.symlinkSync(target, linkPath, type);
}

function createLocalInstall() {
  const nodeModules = path.join(exampleRoot, "node_modules");
  const binDir = path.join(nodeModules, ".bin");

  fs.mkdirSync(binDir, {
    recursive: true,
  });

  symlinkForce(
    repoRoot,
    path.join(nodeModules, "paideia-framework"),
    "dir"
  );
  symlinkForce(
    path.join(repoRoot, "cli.mjs"),
    path.join(binDir, "paideia"),
    "file"
  );
  symlinkForce(
    path.join(repoRoot, "node_modules", ".bin", "tsc"),
    path.join(binDir, "tsc"),
    "file"
  );
  symlinkForce(
    path.join(repoRoot, "node_modules", "typescript"),
    path.join(nodeModules, "typescript"),
    "dir"
  );
  symlinkForce(
    path.join(repoRoot, "node_modules", "@types"),
    path.join(nodeModules, "@types"),
    "dir"
  );
}

assert.equal(fs.existsSync(exampleRoot), true);

for (const relativePath of [
  "README.md",
  "package.json",
  "tsconfig.json",
  "src/site.ts",
  "src/writing/getting-started.ts",
  "src/writing/runtime-artifacts.ts",
  "src/writing/index.ts",
]) {
  assert.equal(
    fs.existsSync(path.join(exampleRoot, relativePath)),
    true,
    `${relativePath} should exist`
  );
}

fs.rmSync(path.join(exampleRoot, "build"), {
  recursive: true,
  force: true,
});
fs.rmSync(path.join(exampleRoot, "dist"), {
  recursive: true,
  force: true,
});
fs.rmSync(path.join(exampleRoot, "node_modules"), {
  recursive: true,
  force: true,
});

createLocalInstall();

const built = runProject(["run", "build"]);

assert.equal(
  built.status,
  0,
  `${built.stdout}${built.stderr}`
);

for (const relativePath of [
  "dist/index.html",
  "dist/getting-started/index.html",
  "dist/runtime-artifacts/index.html",
  "dist/runtime.json",
]) {
  assert.equal(
    fs.existsSync(path.join(exampleRoot, relativePath)),
    true,
    `${relativePath} should exist`
  );
}

const inspected = runProject(["run", "inspect"]);

assert.equal(
  inspected.status,
  0,
  `${inspected.stdout}${inspected.stderr}`
);
assert.ok(inspected.stdout.includes("Pages: 2"));
assert.ok(inspected.stdout.includes("Posts: 2"));
assert.ok(inspected.stdout.includes("Diagnostics: passing"));

for (const generatedPath of ["build", "dist", "node_modules"]) {
  fs.rmSync(path.join(exampleRoot, generatedPath), {
    recursive: true,
    force: true,
  });
}

console.log("docs example tests passed");
