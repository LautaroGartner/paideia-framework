import {
  mkdirSync,
  rmSync,
  writeFileSync,
} from "fs";
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

function writeArtifact(relativePath: string, contents: string): void {
  const outputPath = path.join("dist", relativePath);

  mkdirSync(path.dirname(outputPath), {
    recursive: true,
  });

  writeFileSync(outputPath, contents);
}

for (const page of site.pages) {
  writeArtifact(
    getSiteOutputPath(page),
    generateSitePage(site, page)
  );
}

for (const post of site.posts) {
  writeArtifact(
    getPostOutputPath(post),
    generatePostPage(site, post)
  );
}

writeArtifact("404.html", generateNotFoundPage(site));
writeArtifact("system.json", generateSiteManifest(site));
writeArtifact("context.json", generateContextJson(site));
writeArtifact(
  "runtime.json",
  generateRuntimeIdentity(site, {
    artifactCount: artifacts.length,
    generatedAt: new Date().toISOString(),
    mode: "production",
  })
);
writeArtifact("llms.txt", generateLlmsText(site));

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
