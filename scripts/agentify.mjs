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
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_USER_AGENT = "agentify/0.3";

class AgentifyFetchError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "AgentifyFetchError";
    this.status = details.status ?? null;
    this.statusText = details.statusText ?? "";
    this.url = details.url ?? "";
  }
}

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

function normalizeTimeoutMs(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 1) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.floor(numberValue);
}

function failureFromError(url, error) {
  const status = typeof error?.status === "number"
    ? error.status
    : null;
  const message = error instanceof Error
    ? error.message
    : String(error);

  return {
    url,
    status,
    message,
  };
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

function crawlStatus(failures) {
  return failures.length > 0 ? "partial" : "complete";
}

function createLlmsText({
  sourceUrl,
  title,
  description,
  routes,
  maxPages,
  failures,
}) {
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
    `This v0.3 prototype fetches the homepage and up to ${maxPages} same-origin pages linked from it. It does not crawl recursively beyond the homepage link set.`,
  ];

  if (failures.length > 0) {
    lines.push("");
    lines.push("## Crawl Failures");
    lines.push("");

    for (const failure of failures) {
      const status = failure.status ? `HTTP ${failure.status}` : "failed";

      lines.push(`- ${failure.url}: ${status} (${failure.message})`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function createBundle({
  sourceUrl,
  fetchedAt,
  maxPages,
  pages,
  failures,
  robots,
  timeoutMs,
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
      status: crawlStatus(failures),
      maxDepth: 1,
      maxPages,
      timeoutMs,
      fetched: pages.length,
      failed: failures.length,
      failures,
      sameOriginOnly: true,
      userAgent,
      robots,
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
      status: crawlStatus(failures),
      maxDepth: 1,
      maxPages,
      timeoutMs,
      fetched: pages.length,
      failed: failures.length,
      failures,
      sameOriginOnly: true,
      userAgent,
      robots,
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
    failures,
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
    crawl: {
      status: crawlStatus(failures),
      maxDepth: 1,
      maxPages,
      timeoutMs,
      fetched: pages.length,
      failed: failures.length,
      failures,
      sameOriginOnly: true,
      userAgent,
      robots,
    },
    diagnostics: {
      status: diagnostics.some((item) => item.severity === "error")
        ? "failing"
        : crawlStatus(failures),
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

async function fetchText(url, userAgent, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": userAgent,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new AgentifyFetchError(
        response.statusText || `HTTP ${response.status}`,
        {
          status: response.status,
          statusText: response.statusText,
          url,
        }
      );
    }

    return {
      contentType: response.headers.get("content-type") ?? "",
      text: await response.text(),
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new AgentifyFetchError(
        `fetch timed out after ${timeoutMs}ms`,
        {
          url,
        }
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchHtml(url, userAgent, timeoutMs) {
  const response = await fetchText(url, userAgent, timeoutMs);

  if (!response.contentType.includes("text/html")) {
    throw new AgentifyFetchError(
      `expected HTML response, received ${response.contentType}`,
      {
        url,
      }
    );
  }

  return response.text;
}

async function fetchRobots(source, options) {
  if (typeof options.robotsTxt === "string") {
    return {
      status: "fetched",
      url: new URL("/robots.txt", source).href,
      note: "robots.txt was provided by the caller.",
    };
  }

  if (options.skipRobots) {
    return {
      status: "skipped",
      url: new URL("/robots.txt", source).href,
      note: "robots.txt fetch skipped.",
    };
  }

  const url = new URL("/robots.txt", source).href;

  try {
    const textFetcher = options.textFetcher ??
      ((targetUrl) => fetchText(
        targetUrl,
        options.userAgent ?? DEFAULT_USER_AGENT,
        normalizeTimeoutMs(options.timeoutMs)
      ));
    const result = await textFetcher(url);
    const text = typeof result === "string" ? result : result.text;

    return {
      status: "fetched",
      url,
      bytes: byteLength(text ?? ""),
      note: "robots.txt was fetched for awareness only; v0.3 does not enforce directives yet.",
    };
  } catch (error) {
    return {
      status: "unavailable",
      url,
      failure: failureFromError(url, error),
      note: "robots.txt could not be fetched; v0.3 records this but does not enforce directives.",
    };
  }
}

async function crawlRoutes(sourceUrl, options) {
  const source = new URL(sourceUrl);
  const maxPages = normalizeMaxPages(options.maxPages);
  const timeoutMs = normalizeTimeoutMs(options.timeoutMs);
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  const verbose = Boolean(options.verbose);
  const fetcher = options.fetcher ??
    ((url) => fetchHtml(url, userAgent, timeoutMs));
  const robots = await fetchRobots(source, {
    ...options,
    timeoutMs,
    userAgent,
  });
  const pages = [];
  const failures = [];
  const diagnostics = [];
  const homepageRoute = routeFromUrl(source);

  let homepageHtml = options.html ?? "";

  if (!homepageHtml) {
    try {
      if (verbose) {
        console.log(`[agentify] fetch ${source.href}`);
      }

      homepageHtml = await fetcher(source.href);
    } catch (error) {
      const failure = failureFromError(source.href, error);

      failures.push(failure);
      diagnostics.push({
        severity: "warning",
        code: "route.fetch_failed",
        path: homepageRoute,
        status: failure.status,
        message: failure.message,
      });

      return {
        diagnostics,
        failures,
        maxPages,
        pages,
        robots,
        timeoutMs,
        userAgent,
      };
    }
  }

  const homepage = pageMetadata(homepageRoute, homepageHtml, source);
  pages.push(homepage);
  const discoveredRoutes = extractInternalRoutes(homepageHtml, source.href)
    .filter((route) => route !== homepage.path);
  const queue = [homepage.path, ...discoveredRoutes].slice(0, maxPages);

  for (const route of queue.slice(1)) {
    const url = new URL(route, source);

    try {
      if (verbose) {
        console.log(`[agentify] fetch ${url.href}`);
      }

      const html = await fetcher(url.href);
      pages.push(pageMetadata(route, html, source));
    } catch (error) {
      const failure = failureFromError(url.href, error);

      failures.push(failure);
      diagnostics.push({
        severity: "warning",
        code: "route.fetch_failed",
        path: route,
        status: failure.status,
        message: failure.message,
      });

      if (verbose) {
        const status = failure.status ? ` HTTP ${failure.status}` : "";

        console.log(`[agentify] failed ${url.href}${status}`);
      }
    }
  }

  return {
    diagnostics,
    failures,
    maxPages,
    pages,
    robots,
    timeoutMs,
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
    failures: crawled.failures,
    robots: crawled.robots,
    timeoutMs: crawled.timeoutMs,
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
    timeoutMs: DEFAULT_TIMEOUT_MS,
    userAgent: DEFAULT_USER_AGENT,
    verbose: false,
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

    if (value === "--verbose") {
      options.verbose = true;
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
      "[agentify] usage: node scripts/agentify.mjs <url> [--out agent] [--max-pages 10] [--user-agent agentify/0.3] [--verbose]"
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
