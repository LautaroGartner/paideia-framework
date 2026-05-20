import {
  mkdirSync,
  rmSync,
  writeFileSync,
} from "fs";
import { createHash } from "node:crypto";
import path from "node:path";

import { validateWritingPosts } from "../runtime/validate-writing.mjs";
import { site } from "./site.js";
import {
  generateContextJson,
  generateLlmsText,
  generateNotFoundPage,
  generatePostPage,
  generateRuntimeIdentity,
  generateSiteManifest,
  generateSitePage,
  getPostOutputPath,
  getSiteOutputPath,
} from "./site-build.js";

const writingValidation = validateWritingPosts(site.posts);

for (const item of writingValidation.diagnostics) {
  const prefix = item.severity === "warning" ? "warning" : "error";
  console.log(`[paideia] ${prefix}: ${item.code} at ${item.path}`);
  console.log(`[paideia] ${item.message}`);
}

if (!writingValidation.ok) {
  throw new Error("Writing validation failed.");
}

rmSync("dist", {
  force: true,
  recursive: true,
});

mkdirSync("dist", { recursive: true });

const artifacts = [
  ...site.pages.map((page) => getSiteOutputPath(page)),
  ...site.posts.map((post) => getPostOutputPath(post)),
  "404.html",
  "system.json",
  "context.json",
  "runtime.json",
  "llms.txt",
];

const contentArtifacts = artifacts.filter(
  (artifact) => artifact !== "runtime.json"
);

const outputs = new Map<string, string>();

function writeArtifact(relativePath: string, contents: string): void {
  const outputPath = path.join("dist", relativePath);

  mkdirSync(path.dirname(outputPath), {
    recursive: true,
  });

  writeFileSync(outputPath, contents);
}

function addArtifact(relativePath: string, contents: string): void {
  outputs.set(relativePath, contents);
}

function buildId(): string {
  const hash = createHash("sha256");

  for (const artifact of contentArtifacts) {
    hash.update(`${artifact}\0`);
    hash.update(outputs.get(artifact) ?? "");
    hash.update("\0");
  }

  return hash.digest("hex").slice(0, 7);
}

for (const page of site.pages) {
  addArtifact(
    getSiteOutputPath(page),
    generateSitePage(site, page)
  );
}

for (const post of site.posts) {
  addArtifact(
    getPostOutputPath(post),
    generatePostPage(site, post)
  );
}

addArtifact("404.html", generateNotFoundPage(site));
addArtifact("system.json", generateSiteManifest(site));
addArtifact("context.json", generateContextJson(site));
addArtifact("llms.txt", generateLlmsText(site));
addArtifact(
  "runtime.json",
  generateRuntimeIdentity(site, {
    artifactCount: artifacts.length,
    buildId: buildId(),
    generatedAt: new Date().toISOString(),
    mode: "production",
  })
);

for (const artifact of artifacts) {
  writeArtifact(artifact, outputs.get(artifact) ?? "");
}

console.log("[paideia] build complete");
console.log("");
console.log("Artifacts:");

for (const artifact of artifacts) {
  console.log(`- ${artifact}`);
}

console.log("");
console.log(`Pages: ${site.pages.length}`);
console.log(`Posts: ${site.posts.length}`);
console.log("Manifest: normalized");
console.log("Diagnostics: passed");
