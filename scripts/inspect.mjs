import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createRuntimeConfig } from "../runtime/config.mjs";
import {
  validateRuntimeJson,
  validateSystemJson,
} from "../runtime/validate.mjs";

const config = createRuntimeConfig();
const runtimePath = path.join(config.distDir, "runtime.json");

if (!fs.existsSync(runtimePath)) {
  console.error("[paideia] runtime identity not found");
  console.error("[paideia] run `paideia build` first");
  process.exit(1);
}

const runtimeResult = validateRuntimeJson(config);

if (!runtimeResult.ok) {
  console.error(
    `[paideia] ${runtimeResult.label} (${runtimeResult.reason})`
  );
  process.exit(1);
}

const manifestResult = validateSystemJson(config);
const runtime = runtimeResult.runtime;
const manifest = manifestResult.ok
  ? manifestResult.manifest
  : null;

function formatBytes(bytes) {
  if (typeof bytes !== "number" || Number.isNaN(bytes)) {
    return "unknown";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
}

function pad(value, width) {
  return String(value).padEnd(width, " ");
}

function section(title) {
  console.log("");
  console.log(title);
}

function field(label, value) {
  console.log(`  ${pad(label, 14)} ${value}`);
}

function list(values, emptyLabel = "none") {
  if (!values.length) {
    console.log(`  ${emptyLabel}`);
    return;
  }

  for (const value of values) {
    console.log(`  ${value}`);
  }
}

function artifactRows() {
  return (runtime.artifacts ?? []).map((artifact) => ({
    path: artifact.path ?? "unknown",
    kind: artifact.kind ?? "unknown",
    size: formatBytes(artifact.bytes),
  }));
}

function routeRows() {
  const pages = manifest?.site?.pages ?? [];
  const posts = manifest?.site?.posts ?? [];

  return [
    ...pages.map((page) => ({
      path: page.path,
      title: page.title,
      kind: "page",
    })),
    ...posts.map((post) => ({
      path: post.path,
      title: post.title,
      kind: "post",
    })),
  ];
}

function width(rows, key, minimum) {
  return Math.max(
    minimum,
    ...rows.map((row) => String(row[key] ?? "").length)
  );
}

console.log("Paideia Runtime Inspect");
console.log("──────────────────────");

section("Project");
field("Framework", runtime.framework?.name ?? "unknown");
field("Version", runtime.framework?.version ?? "unknown");
field("Title", manifest?.site?.title ?? "unknown");

section("Runtime");
field("Build ID", runtime.build?.id ?? "unknown");
field("Mode", runtime.build?.mode ?? "unknown");
field("Generated At", runtime.build?.generatedAt ?? "unknown");
field(
  "Manifest",
  runtime.runtime?.normalizedManifest ? "normalized" : "raw"
);
field(
  "Diagnostics",
  manifestResult.ok ? "passing" : "failing"
);

section("Routes");
const routes = routeRows();
const routePathWidth = width(routes, "path", 24);

for (const route of routes) {
  console.log(
    `  ${pad(route.path, routePathWidth)}  ${pad(route.kind, 6)} ${route.title ?? ""}`
  );
}

section("Content");
field("Pages", runtime.site?.pages ?? 0);
field("Posts", runtime.site?.posts ?? 0);

section("Artifacts");
const artifacts = artifactRows();
const artifactPathWidth = width(artifacts, "path", 24);
const artifactKindWidth = width(artifacts, "kind", 10);

for (const artifact of artifacts) {
  console.log(
    `  ${pad(artifact.path, artifactPathWidth)}  ${pad(artifact.kind, artifactKindWidth)} ${artifact.size}`
  );
}

section("Capabilities");
list((runtime.capabilities ?? []).map((capability) => `- ${capability}`));

section("Diagnostics");
field(
  "Manifest",
  runtime.runtime?.normalizedManifest ? "normalized" : "raw"
);
field(
  "Status",
  manifestResult.ok ? "passing" : "failing"
);
