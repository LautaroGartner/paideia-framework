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

function runProject(projectRoot, args) {
  return spawnSync(
    "npm",
    args,
    {
      cwd: projectRoot,
      encoding: "utf8",
    }
  );
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function symlinkForce(target, linkPath, type) {
  fs.rmSync(linkPath, {
    force: true,
    recursive: true,
  });
  fs.symlinkSync(target, linkPath, type);
}

function createLocalInstall(projectRoot) {
  const nodeModules = path.join(projectRoot, "node_modules");
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

  assert.equal(pkg.name, "my-site");
  assert.equal(pkg.version, "0.1.0");
  assert.equal(pkg.private, true);
  assert.equal(pkg.scripts.build, "paideia build");
  assert.equal(pkg.scripts.start, "paideia start");
  assert.equal(pkg.scripts.doctor, "paideia doctor");
  assert.equal(pkg.scripts.inspect, "paideia inspect");
  assert.equal(pkg.scripts["new:post"], "paideia new post");

  const readme = fs.readFileSync(
    path.join(projectRoot, "README.md"),
    "utf8"
  );

  assert.ok(readme.includes("# My Site"));
  assert.ok(readme.includes("Generated with Paideia Framework."));
  assert.ok(readme.includes("npm install"));
  assert.ok(readme.includes("npm run build"));
  assert.ok(readme.includes("npm run start"));
  assert.ok(readme.includes('npm run new:post -- "My Post"'));
  assert.ok(readme.includes("Posts live in `src/writing/`."));
  assert.ok(readme.includes("npm run inspect"));
  assert.ok(readme.includes("npm run doctor"));
  assert.ok(readme.includes("dist/"));
  assert.ok(readme.includes("runtime.json"));
  assert.ok(readme.includes("system.json"));
  assert.ok(readme.includes("context.json"));
  assert.ok(readme.includes("llms.txt"));

  const site = fs.readFileSync(
    path.join(projectRoot, "src", "site.ts"),
    "utf8"
  );

  assert.ok(site.includes('title: "My Site"'));
  assert.ok(
    site.includes('description: "A small site generated with Paideia."')
  );
  assert.ok(site.includes('author: "Your Name"'));
  assert.ok(site.includes('url: "https://example.com"'));

  createLocalInstall(projectRoot);

  const built = runProject(projectRoot, ["run", "build"]);

  assert.equal(
    built.status,
    0,
    `${built.stdout}${built.stderr}`
  );

  const inspected = runProject(projectRoot, ["run", "inspect"]);

  assert.equal(
    inspected.status,
    0,
    `${inspected.stdout}${inspected.stderr}`
  );
  assert.ok(inspected.stdout.includes("Framework: Paideia Framework"));
  assert.ok(inspected.stdout.includes("Pages: 2"));
  assert.ok(inspected.stdout.includes("Posts: 1"));

  const named = run(["init", "Fancy Site_2026!"]);

  assert.equal(
    named.status,
    0,
    `${named.stdout}${named.stderr}`
  );

  const namedProjectRoot = path.join(testRoot, "Fancy Site_2026!");
  const namedPkg = readJson(
    path.join(namedProjectRoot, "package.json")
  );
  const namedReadme = fs.readFileSync(
    path.join(namedProjectRoot, "README.md"),
    "utf8"
  );

  assert.equal(namedPkg.name, "fancy-site-2026");
  assert.ok(namedReadme.includes("# Fancy Site 2026"));

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
