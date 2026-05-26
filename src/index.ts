import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "fs";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { validateWritingPosts } from "../runtime/validate-writing.mjs";
import type { SiteDefinition } from "./site.js";
import {
  generateContextJson,
  generateFaviconSvg,
  generateLlmsText,
  generateNotFoundPage,
  generatePostPage,
  generateRobotsTxt,
  generateRuntimeIdentity,
  generateSiteManifestWithCapabilities,
  generateSitemapXml,
  generateSitePage,
  getPostOutputPath,
  getSiteOutputPath,
} from "./site-build.js";

async function loadSite(): Promise<SiteDefinition> {
  const siteEntry =
    process.env.PAIDEIA_SITE_ENTRY ?? "./site.js";
  const siteModule = await import(
    siteEntry.startsWith(".")
      ? siteEntry
      : pathToFileURL(siteEntry).href
  );

  if (!siteModule.site) {
    throw new Error(
      `site export not found in ${siteEntry}`
    );
  }

  return siteModule.site as SiteDefinition;
}

const site = await loadSite();
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

const socialAssetsRoot = path.join("assets", "social");
const socialArtifacts = existsSync(socialAssetsRoot)
  ? readdirSync(socialAssetsRoot)
      .filter((entry) => entry.endsWith(".png"))
      .sort()
      .map((entry) => ({
        path: `social/${entry}`,
        kind: "social-image",
        sourcePath: path.join(socialAssetsRoot, entry),
      }))
  : [];

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
    path: "favicon.svg",
    kind: "asset",
  },
  ...socialArtifacts,
  {
    path: "robots.txt",
    kind: "seo",
  },
  {
    path: "sitemap.xml",
    kind: "seo",
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

const outputs = new Map<string, string | Buffer>();

function writeArtifact(relativePath: string, contents: string | Buffer): void {
  const outputPath = path.join("dist", relativePath);

  mkdirSync(path.dirname(outputPath), {
    recursive: true,
  });

  writeFileSync(outputPath, contents);
}

function addArtifact(relativePath: string, contents: string | Buffer): void {
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

function artifactByteLength(value: string | Buffer): number {
  return Buffer.isBuffer(value)
    ? value.length
    : byteLength(value);
}

function artifactInventory() {
  return artifacts.map((artifact) => ({
    path: artifact.path,
    kind: artifact.kind,
    bytes: artifactByteLength(outputs.get(artifact.path) ?? ""),
  }));
}

function postSocialImagePath(slug: string): string | undefined {
  const imagePath = `social/${slug}.png`;

  return outputs.has(imagePath)
    ? imagePath
    : undefined;
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

for (const artifact of socialArtifacts) {
  addArtifact(artifact.path, readFileSync(artifact.sourcePath));
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
    generatePostPage(site, post, {
      imagePath: postSocialImagePath(post.slug),
    })
  );
}

addArtifact("404.html", generateNotFoundPage(site));
addArtifact("favicon.svg", generateFaviconSvg());

addArtifact(
  "system.json",
  generateSiteManifestWithCapabilities(site, runtimeCapabilities)
);
addArtifact("context.json", generateContextJson(site));
addArtifact("llms.txt", generateLlmsText(site));
addArtifact("robots.txt", generateRobotsTxt(site));
addArtifact("sitemap.xml", generateSitemapXml(site));
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
