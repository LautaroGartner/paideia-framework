#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = path.dirname(
  path.dirname(fileURLToPath(import.meta.url))
);

function readPackageVersion() {
  try {
    const raw = fs.readFileSync(
      path.join(PACKAGE_ROOT, "package.json"),
      "utf8"
    );
    const packageJson = JSON.parse(raw);

    return typeof packageJson.version === "string"
      ? packageJson.version
      : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function decodeHtmlEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, " ");
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  return match
    ? normalizeWhitespace(decodeHtmlEntities(stripTags(match[1])))
    : "";
}

function getAttribute(tag, name) {
  const pattern = new RegExp(
    `${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i"
  );
  const match = tag.match(pattern);

  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}

function extractDescription(html) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of metaTags) {
    const name = getAttribute(tag, "name").toLowerCase();
    const property = getAttribute(tag, "property").toLowerCase();

    if (name === "description" || property === "og:description") {
      return normalizeWhitespace(
        decodeHtmlEntities(getAttribute(tag, "content"))
      );
    }
  }

  return "";
}

function routeFromUrl(url) {
  const pathname = url.pathname.replace(/\/+/g, "/");
  const normalized = pathname.endsWith("/") && pathname !== "/"
    ? pathname.slice(0, -1)
    : pathname;

  return `${normalized}${url.search}`;
}

function extractInternalRoutes(html, sourceUrl) {
  const source = new URL(sourceUrl);
  const routes = new Set(["/"]);
  const anchorTags = html.match(/<a\b[^>]*>/gi) ?? [];

  for (const tag of anchorTags) {
    const href = getAttribute(tag, "href");

    if (!href || href.startsWith("#")) {
      continue;
    }

    let target;

    try {
      target = new URL(href, source);
    } catch {
      continue;
    }

    if (
      target.origin !== source.origin ||
      target.protocol !== source.protocol
    ) {
      continue;
    }

    target.hash = "";
    routes.add(routeFromUrl(target));
  }

  return Array.from(routes).sort();
}

function byteLength(value) {
  return Buffer.byteLength(value, "utf8");
}

function buildIdFor(outputs) {
  const hash = createHash("sha256");

  for (const [name, contents] of Object.entries(outputs).sort()) {
    hash.update(name);
    hash.update("\0");
    hash.update(contents);
    hash.update("\0");
  }

  return hash.digest("hex").slice(0, 7);
}

function createLlmsText({ sourceUrl, title, description, routes }) {
  const lines = [
    `# ${title || sourceUrl}`,
    "",
    "This agent bundle was generated from a public website homepage.",
    "",
    "## Source",
    "",
    sourceUrl,
    "",
    "## Description",
    "",
    description || "No description found.",
    "",
    "## Routes",
    "",
    ...routes.map((route) => `- ${route}`),
    "",
    "## Files",
    "",
    "- system.json: discovered site contract",
    "- runtime.json: generation identity and artifact inventory",
    "- context.json: compact route and metadata summary",
    "- llms.txt: plain-language entrypoint",
    "",
    "## Limits",
    "",
    "This v0.1 prototype fetches one homepage and extracts same-origin links from that page only.",
  ];

  return `${lines.join("\n")}\n`;
}

function createBundle({ sourceUrl, html, fetchedAt }) {
  const parsedUrl = new URL(sourceUrl);
  const title = extractTitle(html);
  const description = extractDescription(html);
  const routes = extractInternalRoutes(html, parsedUrl.href);
  const version = readPackageVersion();
  const capabilities = [
    "site.fetch",
    "routes.discover",
    "agent.context",
    "agent.guide",
    "runtime.identity",
  ];
  const diagnostics = [];

  if (!title) {
    diagnostics.push({
      severity: "warning",
      code: "missing.title",
      message: "Homepage did not include a title.",
    });
  }

  if (!description) {
    diagnostics.push({
      severity: "warning",
      code: "missing.description",
      message: "Homepage did not include a meta description.",
    });
  }

  const context = {
    source: {
      url: parsedUrl.href,
      origin: parsedUrl.origin,
    },
    site: {
      title,
      description,
    },
    routes: routes.map((route) => ({
      path: route,
      source: route === "/" ? "homepage" : "homepage-link",
    })),
    suggestedReadingOrder: [
      "llms.txt",
      "context.json",
      "system.json",
      "runtime.json",
    ],
  };

  const system = {
    generator: {
      name: "agentify",
      version,
    },
    source: {
      url: parsedUrl.href,
      origin: parsedUrl.origin,
    },
    site: {
      title,
      description,
    },
    routes,
    crawl: {
      maxDepth: 1,
      fetchedPages: 1,
      sameOriginOnly: true,
    },
    capabilities,
    diagnostics,
    caveats: [
      "Only the homepage was fetched.",
      "Routes were discovered from same-origin anchor href values.",
      "No private backend behavior was inferred.",
    ],
  };

  const llms = createLlmsText({
    sourceUrl: parsedUrl.href,
    title,
    description,
    routes,
  });

  const partialOutputs = {
    "context.json": `${JSON.stringify(context, null, 2)}\n`,
    "llms.txt": llms,
    "system.json": `${JSON.stringify(system, null, 2)}\n`,
  };

  let runtime = {
    generator: {
      name: "agentify",
      version,
    },
    generatedAt: fetchedAt,
    buildId: buildIdFor(partialOutputs),
    artifacts: [],
    capabilities,
    diagnostics: {
      status: diagnostics.some((item) => item.severity === "error")
        ? "failing"
        : "passing",
      warnings: diagnostics.filter((item) => item.severity === "warning").length,
      errors: diagnostics.filter((item) => item.severity === "error").length,
    },
  };

  let runtimeOutput = `${JSON.stringify(runtime, null, 2)}\n`;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const outputs = {
      ...partialOutputs,
      "runtime.json": runtimeOutput,
    };
    const artifacts = Object.entries(outputs).map(([name, contents]) => ({
      path: name,
      kind: name === "llms.txt" ? "agent-guide" : "agent-metadata",
      bytes: byteLength(contents),
    }));
    const nextRuntime = {
      ...runtime,
      artifacts,
    };
    const nextRuntimeOutput = `${JSON.stringify(nextRuntime, null, 2)}\n`;

    runtime = nextRuntime;

    if (byteLength(nextRuntimeOutput) === byteLength(runtimeOutput)) {
      runtimeOutput = nextRuntimeOutput;
      break;
    }

    runtimeOutput = nextRuntimeOutput;
  }

  const outputs = {
    ...partialOutputs,
    "runtime.json": runtimeOutput,
  };

  return {
    diagnostics,
    outputs,
    routes,
    title,
  };
}

async function fetchHomepage(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "agentify/0.1",
    },
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    throw new Error(`fetch failed with HTTP ${response.status}`);
  }

  if (!contentType.includes("text/html")) {
    throw new Error(`expected HTML response, received ${contentType}`);
  }

  return response.text();
}

function writeBundle(outputDir, outputs) {
  fs.mkdirSync(outputDir, {
    recursive: true,
  });

  for (const [name, contents] of Object.entries(outputs)) {
    fs.writeFileSync(path.join(outputDir, name), contents);
  }
}

export async function agentify(url, options = {}) {
  const sourceUrl = new URL(url).href;
  const outputDir = options.outputDir ?? path.join(process.cwd(), "agent");
  const fetchedAt = options.fetchedAt ?? new Date().toISOString();
  const html = options.html ?? await fetchHomepage(sourceUrl);
  const bundle = createBundle({
    sourceUrl,
    html,
    fetchedAt,
  });

  writeBundle(outputDir, bundle.outputs);

  return {
    ...bundle,
    outputDir,
  };
}

async function main() {
  const url = process.argv[2];

  if (!url) {
    console.error("[agentify] usage: node scripts/agentify.mjs <url>");
    process.exit(1);
  }

  try {
    const result = await agentify(url);
    const warnings = result.diagnostics.filter(
      (item) => item.severity === "warning"
    ).length;
    const errors = result.diagnostics.filter(
      (item) => item.severity === "error"
    ).length;

    console.log(`[agentify] fetched ${result.routes.length} routes`);

    for (const name of [
      "system.json",
      "runtime.json",
      "context.json",
      "llms.txt",
    ]) {
      console.log(`[agentify] wrote agent/${name}`);
    }

    console.log(
      `[agentify] diagnostics: ${warnings} warnings, ${errors} errors`
    );
  } catch (error) {
    console.error(
      `[agentify] failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    process.exit(1);
  }
}

const isCli = process.argv[1]
  ? fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
  : false;

if (isCli) {
  await main();
}
