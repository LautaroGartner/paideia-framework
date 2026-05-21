import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";

function fileUrl(path) {
  return new URL(`../${path}`, import.meta.url);
}

function readText(path) {
  return fs.readFileSync(fileUrl(path), "utf8");
}

function readJson(path) {
  return JSON.parse(readText(path));
}

const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");
const versionSource = readText("src/version.ts");

assert.match(
  packageJson.version,
  /^\d+\.\d+\.\d+$/,
  "package.json version should be semver"
);

assert.equal(
  packageLock.version,
  packageJson.version,
  "package-lock.json root version should match package.json"
);

assert.equal(
  packageLock.packages?.[""]?.version,
  packageJson.version,
  "package-lock.json package entry should match package.json"
);

assert.ok(
  versionSource.includes(`readPackageVersion() ?? "${packageJson.version}"`),
  "src/version.ts fallback should match package.json"
);

for (const artifactPath of ["dist/runtime.json", "dist/system.json"]) {
  const artifact = readJson(artifactPath);

  assert.equal(
    artifact.framework?.version,
    packageJson.version,
    `${artifactPath} framework version should match package.json`
  );
}

const tag = spawnSync("git", ["tag", "--points-at", "HEAD"], {
  encoding: "utf8",
});

assert.equal(tag.status, 0, tag.stderr);

const releaseTags = tag.stdout
  .trim()
  .split(/\s+/)
  .filter((value) => /^v\d+\.\d+\.\d+$/.test(value));

if (releaseTags.length > 0) {
  assert.ok(
    releaseTags.includes(`v${packageJson.version}`),
    "release tag pointing at HEAD should match package.json"
  );
}

console.log("version consistency tests passed");
