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
  generateSiteManifestWithCapabilities,
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

const runtimeCapabilities = [
  "site.static",
  "writing.posts",
  "runtime.inspect",
  "runtime.identity",
  "runtime.artifactInventory",
  "manifest.validate",
  "manifest.normalize",
  "diagnostics.manifest",
  "diagnostics.writing",
  "agent.context",
  "agent.guide",
];

const artifacts = [
  ...site.pages.map((page) => ({
    path: getSiteOutputPath(page),
    kind: "page",
  })),
  ...site.posts.map((post) => ({
    path: getPostOutputPath(post),
    kind: "post",
  })),
  {
    path: "404.html",
    kind: "fallback",
  },
  {
    path: "system.json",
    kind: "contract",
  },
  {
    path: "context.json",
    kind: "agent-context",
  },
  {
    path: "runtime.json",
    kind: "runtime-identity",
  },
  {
    path: "llms.txt",
    kind: "agent-guide",
  },
];

const contentArtifacts = artifacts.filter(
  (artifact) => artifact.path !== "runtime.json"
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
    hash.update(`${artifact.path}\0`);
    hash.update(outputs.get(artifact.path) ?? "");
    hash.update("\0");
  }

  return hash.digest("hex").slice(0, 7);
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function artifactInventory() {
  return artifacts.map((artifact) => ({
    path: artifact.path,
    kind: artifact.kind,
    bytes: byteLength(outputs.get(artifact.path) ?? ""),
  }));
}

function addRuntimeIdentity(): void {
  let runtimeIdentity = "";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    addArtifact("runtime.json", runtimeIdentity);

    const nextRuntimeIdentity = generateRuntimeIdentity(site, {
      artifactCount: artifacts.length,
      artifacts: artifactInventory(),
      buildId: buildId(),
      capabilities: runtimeCapabilities,
      generatedAt: new Date().toISOString(),
      mode: "production",
    });

    if (byteLength(nextRuntimeIdentity) === byteLength(runtimeIdentity)) {
      addArtifact("runtime.json", nextRuntimeIdentity);
      return;
    }

    runtimeIdentity = nextRuntimeIdentity;
  }

  addArtifact("runtime.json", runtimeIdentity);
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
addArtifact(
  "system.json",
  generateSiteManifestWithCapabilities(site, runtimeCapabilities)
);
addArtifact("context.json", generateContextJson(site));
addArtifact("llms.txt", generateLlmsText(site));
addRuntimeIdentity();

for (const artifact of artifacts) {
  writeArtifact(artifact.path, outputs.get(artifact.path) ?? "");
}

console.log("[paideia] build complete");
console.log("");
console.log("Artifacts:");

for (const artifact of artifacts) {
  console.log(`- ${artifact.path}`);
}

console.log("");
console.log(`Pages: ${site.pages.length}`);
console.log(`Posts: ${site.posts.length}`);
console.log("Manifest: normalized");
console.log("Diagnostics: passed");
