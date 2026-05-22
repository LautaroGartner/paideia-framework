#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = path.dirname(
  path.dirname(fileURLToPath(import.meta.url))
);
const DEFAULT_MAX_PAGES = 10;
const DEFAULT_USER_AGENT = "agentify/0.2";

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
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, decimal) =>
      String.fromCodePoint(Number.parseInt(decimal, 10))
    )
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

function extractHeadings(html) {
  const matches = html.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi);
  const headings = [];

  for (const match of matches) {
    const heading = normalizeWhitespace(
      decodeHtmlEntities(stripTags(match[1]))
    );

    if (heading) {
      headings.push(heading);
    }
  }

  return headings;
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
  const routes = new Set([routeFromUrl(source)]);
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

function pageMetadata(pathname, html, source) {
  return {
    path: pathname,
    url: new URL(pathname, source).href,
    title: extractTitle(html),
    description: extractDescription(html),
    headings: extractHeadings(html),
  };
}

function normalizeMaxPages(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 1) {
    return DEFAULT_MAX_PAGES;
  }

  return Math.min(Math.floor(numberValue), DEFAULT_MAX_PAGES);
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

function createLlmsText({ sourceUrl, title, description, routes, maxPages }) {
  const lines = [
    `# ${title || sourceUrl}`,
    "",
    "This agent bundle was generated from a public website.",
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
    ...routes.map((route) => {
      const label = route.title ? `: ${route.title}` : "";

      return `- ${route.path}${label}`;
    }),
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
    `This v0.2 prototype fetches the homepage and up to ${maxPages} same-origin pages linked from it. It does not crawl recursively beyond the homepage link set.`,
  ];

  return `${lines.join("\n")}\n`;
}

function createBundle({
  sourceUrl,
  fetchedAt,
  maxPages,
  pages,
  userAgent,
  diagnostics: crawlDiagnostics = [],
}) {
  const parsedUrl = new URL(sourceUrl);
  const homepage = pages[0];
  const title = homepage?.title ?? "";
  const description = homepage?.description ?? "";
  const version = readPackageVersion();
  const capabilities = [
    "site.fetch",
    "routes.discover",
    "routes.metadata",
    "agent.context",
    "agent.guide",
    "runtime.identity",
  ];
  const diagnostics = [...crawlDiagnostics];

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
    crawl: {
      maxDepth: 1,
      maxPages,
      fetchedPages: pages.length,
      sameOriginOnly: true,
      userAgent,
    },
    site: {
      title,
      description,
    },
    routes: pages.map((page) => ({
      path: page.path,
      title: page.title,
      description: page.description,
      headings: page.headings,
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
    routes: pages.map((page) => ({
      path: page.path,
      url: page.url,
      title: page.title,
      description: page.description,
      headings: page.headings,
    })),
    crawl: {
      maxDepth: 1,
      maxPages,
      fetchedPages: pages.length,
      sameOriginOnly: true,
      userAgent,
    },
    capabilities,
    diagnostics,
    caveats: [
      "Only the homepage and same-origin pages linked from it were fetched.",
      "Routes were discovered from homepage anchor href values.",
      "No recursive crawl beyond depth 1 was performed.",
      "No private backend behavior was inferred.",
    ],
  };

  const llms = createLlmsText({
    sourceUrl: parsedUrl.href,
    title,
    description,
    routes: pages,
    maxPages,
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
    routes: pages,
    title,
  };
}

async function fetchHtml(url, userAgent) {
  const response = await fetch(url, {
    headers: {
      "user-agent": userAgent,
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

async function crawlRoutes(sourceUrl, options) {
  const source = new URL(sourceUrl);
  const maxPages = normalizeMaxPages(options.maxPages);
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  const fetcher = options.fetcher ?? ((url) => fetchHtml(url, userAgent));
  const homepageHtml = options.html ?? await fetcher(source.href);
  const homepageRoute = routeFromUrl(source);
  const homepage = pageMetadata(homepageRoute, homepageHtml, source);
  const discoveredRoutes = extractInternalRoutes(homepageHtml, source.href)
    .filter((route) => route !== homepage.path);
  const queue = [homepage.path, ...discoveredRoutes].slice(0, maxPages);
  const pages = [homepage];
  const diagnostics = [];

  for (const route of queue.slice(1)) {
    const url = new URL(route, source);

    try {
      const html = await fetcher(url.href);
      pages.push(pageMetadata(route, html, source));
    } catch (error) {
      diagnostics.push({
        severity: "warning",
        code: "route.fetch_failed",
        path: route,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    diagnostics,
    maxPages,
    pages,
    userAgent,
  };
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
  const crawled = await crawlRoutes(sourceUrl, options);
  const bundle = createBundle({
    sourceUrl,
    fetchedAt,
    maxPages: crawled.maxPages,
    pages: crawled.pages,
    userAgent: crawled.userAgent,
    diagnostics: crawled.diagnostics,
  });

  writeBundle(outputDir, bundle.outputs);

  return {
    ...bundle,
    outputDir,
  };
}

function parseArgs(argv) {
  const options = {
    maxPages: DEFAULT_MAX_PAGES,
    outputDir: path.join(process.cwd(), "agent"),
    userAgent: DEFAULT_USER_AGENT,
  };
  let url = "";

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--out") {
      options.outputDir = path.resolve(argv[index + 1] ?? "");
      index += 1;
      continue;
    }

    if (value === "--max-pages") {
      options.maxPages = normalizeMaxPages(argv[index + 1]);
      index += 1;
      continue;
    }

    if (value === "--user-agent") {
      options.userAgent = argv[index + 1] || DEFAULT_USER_AGENT;
      index += 1;
      continue;
    }

    if (!url) {
      url = value;
    }
  }

  return {
    options,
    url,
  };
}

async function main() {
  const { options, url } = parseArgs(process.argv.slice(2));

  if (!url) {
    console.error(
      "[agentify] usage: node scripts/agentify.mjs <url> [--out agent] [--max-pages 10] [--user-agent agentify/0.2]"
    );
    process.exit(1);
  }

  try {
    const result = await agentify(url, options);
    const warnings = result.diagnostics.filter(
      (item) => item.severity === "warning"
    ).length;
    const errors = result.diagnostics.filter(
      (item) => item.severity === "error"
    ).length;

    console.log(`[agentify] fetched ${result.routes.length} pages`);

    for (const name of [
      "system.json",
      "runtime.json",
      "context.json",
      "llms.txt",
    ]) {
      console.log(
        `[agentify] wrote ${path.join(result.outputDir, name)}`
      );
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
