#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const AGENTIFY_VERSION = "0.7.1-alpha.2";
const ARTIFACT_SCHEMA_VERSION = "0.1";
const DEFAULT_MAX_PAGES = 10;
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_DELAY_MS = 0;
const DEFAULT_RETRIES = 0;
const DEFAULT_USER_AGENT = "agentify/0.6";
const RENDERER_MODE = "static-html";
const RENDERER = {
  mode: RENDERER_MODE,
  javascriptExecuted: false,
};
const LIMITATIONS = {
  javascriptNotExecuted: true,
  recursiveCrawl: false,
  privateBehaviorInferred: false,
  robotsEnforced: false,
};
const REQUIRED_ARTIFACTS = [
  "context.json",
  "llms.txt",
  "runtime.json",
  "system.json",
];
const RUNTIME_HASH_PLACEHOLDER = "0".repeat(64);

class AgentifyFetchError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "AgentifyFetchError";
    this.status = details.status ?? null;
    this.statusText = details.statusText ?? "";
    this.url = details.url ?? "";
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

function scriptCount(html) {
  return (html.match(/<script\b/gi) ?? []).length;
}

function extractVisibleText(html) {
  return normalizeWhitespace(
    decodeHtmlEntities(
      stripTags(
        html
          .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
          .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      )
    )
  );
}

function detectJavascriptRequired(html, metadata) {
  if (scriptCount(html) === 0) {
    return false;
  }

  const visibleText = extractVisibleText(html);
  const hasAppShell = /\bid\s*=\s*["'](?:__next|app|root|svelte)["']/i
    .test(html);
  const hasJavascriptNotice =
    /<noscript\b[\s\S]*?(javascript|enable scripts|requires js|requires javascript)/i
      .test(html);
  const hasSparseMetadata = !metadata.title &&
    !metadata.description &&
    metadata.headings.length === 0;

  return hasJavascriptNotice ||
    (hasAppShell && visibleText.length < 240) ||
    (hasSparseMetadata && visibleText.length < 160);
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

function extractCanonicalUrl(html, source) {
  const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];

  for (const tag of linkTags) {
    const rel = getAttribute(tag, "rel").toLowerCase();

    if (rel.split(/\s+/).includes("canonical")) {
      const href = getAttribute(tag, "href");

      if (!href) {
        return "";
      }

      try {
        return new URL(href, source).href;
      } catch {
        return "";
      }
    }
  }

  return "";
}

function extractSitemapLinks(html, source) {
  const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];
  const urls = [];

  for (const tag of linkTags) {
    const rel = getAttribute(tag, "rel").toLowerCase();

    if (!rel.split(/\s+/).includes("sitemap")) {
      continue;
    }

    const href = getAttribute(tag, "href");

    if (!href) {
      continue;
    }

    try {
      urls.push(new URL(href, source).href);
    } catch {
      // Ignore malformed discovery hints.
    }
  }

  return urls;
}

function extractRobotsSitemaps(text, source) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*sitemap\s*:\s*(.+?)\s*$/i)?.[1] ?? "")
    .filter(Boolean)
    .map((url) => {
      try {
        return new URL(url, source).href;
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

function pageMetadata(pathname, html, source) {
  const canonical = extractCanonicalUrl(html, new URL(pathname, source));
  const metadata = {
    path: pathname,
    url: new URL(pathname, source).href,
    canonical,
    title: extractTitle(html),
    description: extractDescription(html),
    headings: extractHeadings(html),
  };

  return {
    ...metadata,
    renderer: RENDERER_MODE,
    javascriptRequired: detectJavascriptRequired(html, metadata),
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

function normalizeDelayMs(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return DEFAULT_DELAY_MS;
  }

  return Math.floor(numberValue);
}

function normalizeRetries(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return DEFAULT_RETRIES;
  }

  return Math.floor(numberValue);
}

function normalizeSourceUrl(value) {
  const input = String(value ?? "").trim();

  if (!input) {
    throw new TypeError("URL is required");
  }

  return new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(input)
    ? input
    : `https://${input}`).href;
}

function diagnosticLabel(diagnostic) {
  if (diagnostic.status) {
    return `http.${diagnostic.status}`;
  }

  return diagnostic.code;
}

function formatWarning(diagnostic) {
  const label = diagnosticLabel(diagnostic);
  const detail = diagnostic.status === 429
    ? "Too Many Requests"
    : diagnostic.message;

  return detail ? `${label} (${detail})` : label;
}

function warningDiagnostics(diagnostics) {
  return diagnostics.filter((item) => item.severity === "warning");
}

function errorDiagnostics(diagnostics) {
  return diagnostics.filter((item) => item.severity === "error");
}

function uniqueWarningLines(diagnostics) {
  return Array.from(
    new Set(warningDiagnostics(diagnostics).map(formatWarning))
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
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

function rendererMode(renderer) {
  return typeof renderer === "string"
    ? renderer
    : renderer?.mode ?? "unknown";
}

function runtimeHashInput(runtimeText) {
  const runtime = JSON.parse(runtimeText);
  runtime.artifacts = (runtime.artifacts ?? []).map((artifact) => {
    if (artifact.path !== "runtime.json") {
      return artifact;
    }

    return {
      ...artifact,
      sha256: RUNTIME_HASH_PLACEHOLDER,
    };
  });

  return `${JSON.stringify(runtime, null, 2)}\n`;
}

function artifactEntries(outputs) {
  return Object.entries(outputs)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, contents]) => ({
      path: name,
      kind: name === "llms.txt" ? "agent-guide" : "agent-metadata",
      bytes: byteLength(contents),
      sha256: name === "runtime.json"
        ? sha256(runtimeHashInput(contents))
        : sha256(contents),
    }));
}

function crawlStatus(failures) {
  return failures.length > 0 ? "partial" : "complete";
}

function compactRouteSummary(page) {
  return {
    path: page.path,
    title: page.title,
    description: page.description,
    headingCount: page.headings.length,
    status: page.receipt?.status ?? null,
    contentType: page.receipt?.contentType ?? "",
    javascriptRequired: page.javascriptRequired,
  };
}

function routeReceipt(page) {
  return {
    path: page.path,
    url: page.url,
    finalUrl: page.receipt?.finalUrl ?? page.url,
    status: page.receipt?.status ?? null,
    statusText: page.receipt?.statusText ?? "",
    contentType: page.receipt?.contentType ?? "",
    timingMs: page.receipt?.timingMs ?? null,
    redirected: page.receipt?.redirected ?? false,
    redirectChain: page.receipt?.redirectChain ?? [],
    canonical: page.canonical,
    discoveredVia: page.discoveredVia ?? "",
    depth: page.depth ?? 0,
  };
}

function textReceipt(url, response) {
  return {
    url,
    finalUrl: response.finalUrl ?? url,
    status: response.status ?? 200,
    statusText: response.statusText ?? "OK",
    contentType: response.contentType ?? "",
    timingMs: response.timingMs ?? null,
    redirected: response.redirected ?? false,
    redirectChain: response.redirectChain ?? [],
  };
}

function routeArtifact(page, includeUrl = false) {
  const route = {
    path: page.path,
    title: page.title,
    description: page.description,
    headings: page.headings,
    renderer: page.renderer,
    javascriptRequired: page.javascriptRequired,
    status: page.receipt?.status ?? null,
    contentType: page.receipt?.contentType ?? "",
    canonical: page.canonical,
    discoveredVia: page.discoveredVia ?? "",
    depth: page.depth ?? 0,
  };

  if (includeUrl) {
    route.url = page.url;
  }

  return route;
}

function pageDiagnostics(page, isHomepage = false) {
  const diagnostics = [];
  const label = isHomepage ? "Homepage" : `Route ${page.path}`;

  if (!page.title) {
    diagnostics.push({
      severity: "warning",
      code: "missing.title",
      path: page.path,
      message: `${label} did not include a title.`,
    });
  }

  if (!page.description) {
    diagnostics.push({
      severity: "warning",
      code: "missing.description",
      path: page.path,
      message: `${label} did not include a meta description.`,
    });
  }

  if (page.javascriptRequired) {
    diagnostics.push({
      severity: "warning",
      code: "js.required",
      path: page.path,
      message: `${label} appears to require JavaScript for meaningful static content.`,
    });
  }

  return diagnostics;
}

function diagnosticCodes(diagnostics) {
  return Array.from(new Set(diagnostics.map((item) => item.code))).sort();
}

function normalizedWarnings(diagnostics) {
  return diagnostics
    .filter((item) => item.severity === "warning")
    .map((item) => {
      const warning = {
        code: item.code,
        path: item.path ?? "*",
        message: item.message,
      };

      if (typeof item.status !== "undefined") {
        warning.status = item.status;
      }

      return warning;
    });
}

function diagnosticsSummary(diagnostics, failures) {
  return {
    status: diagnostics.some((item) => item.severity === "error")
      ? "failing"
      : crawlStatus(failures),
    warnings: diagnostics.filter((item) => item.severity === "warning").length,
    errors: diagnostics.filter((item) => item.severity === "error").length,
    codes: diagnosticCodes(diagnostics),
  };
}

function createLlmsText({
  sourceUrl,
  title,
  description,
  routes,
  maxPages,
  failures,
  fetchedAt,
  diagnostics,
}) {
  const status = crawlStatus(failures);
  const codes = diagnosticCodes(diagnostics);
  const lines = [
    `# ${title || sourceUrl}`,
    "",
    "Generated by agentify.",
    "",
    "## Site Summary",
    "",
    description || "No description found.",
    "",
    "## Source",
    "",
    sourceUrl,
    "",
    "## Crawl Status",
    "",
    `Status: ${status}`,
    `Generated at: ${fetchedAt}`,
    `Routes fetched: ${routes.length}`,
    `Routes failed: ${failures.length}`,
    `Renderer: ${rendererMode(RENDERER)}`,
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
    `This prototype uses the ${rendererMode(RENDERER)} renderer: it fetches HTML, does not execute JavaScript, and crawls up to ${maxPages} same-origin pages linked from the homepage.`,
    "Robots.txt is fetched for awareness only and is not enforced yet.",
  ];

  if (codes.length > 0) {
    lines.push("");
    lines.push("## Warning Codes");
    lines.push("");

    for (const code of codes) {
      lines.push(`- ${code}`);
    }
  }

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
  sitemap,
  timeoutMs,
  delayMs,
  retries,
  userAgent,
  diagnostics: crawlDiagnostics = [],
}) {
  const parsedUrl = new URL(sourceUrl);
  const homepage = pages[0];
  const title = homepage?.title ?? "";
  const description = homepage?.description ?? "";
  const version = AGENTIFY_VERSION;
  const capabilities = [
    "site.crawled",
    "routes.discovered",
    "metadata.extracted",
    "agent.context",
    "agent.guide",
    "crawl.receipts",
  ];
  const diagnostics = [...crawlDiagnostics];

  if (failures.length > 0) {
    diagnostics.push({
      severity: "warning",
      code: "crawl.partial",
      message: "One or more discovered routes failed to fetch.",
    });
  }

  for (const [index, page] of pages.entries()) {
    diagnostics.push(...pageDiagnostics(page, index === 0));
  }

  const warnings = normalizedWarnings(diagnostics);
  const diagnosticsStatus = diagnosticsSummary(diagnostics, failures);
  const receipts = pages.map(routeReceipt);
  const context = {
    artifactSchemaVersion: ARTIFACT_SCHEMA_VERSION,
    generatedAt: fetchedAt,
    sourceUrl: parsedUrl.href,
    generator: {
      name: "agentify",
      version,
    },
    renderer: RENDERER,
    limitations: LIMITATIONS,
    routeCount: pages.length,
    failedRouteCount: failures.length,
    warningCodes: diagnosticCodes(diagnostics),
    warnings,
    source: {
      url: parsedUrl.href,
      origin: parsedUrl.origin,
    },
    crawl: {
      status: crawlStatus(failures),
      maxDepth: 1,
      maxPages,
      timeoutMs,
      delayMs,
      retries,
      fetched: pages.length,
      failed: failures.length,
      failures,
      receipts,
      sitemap,
      sameOriginOnly: true,
      userAgent,
      robots,
    },
    site: {
      title,
      description,
    },
    routeSummaries: pages.map(compactRouteSummary),
    routes: pages.map((page) => routeArtifact(page)),
    suggestedReadingOrder: [
      "llms.txt",
      "context.json",
      "system.json",
      "runtime.json",
    ],
  };

  const system = {
    artifactSchemaVersion: ARTIFACT_SCHEMA_VERSION,
    generator: {
      name: "agentify",
      version,
    },
    generatedAt: fetchedAt,
    sourceUrl: parsedUrl.href,
    renderer: RENDERER,
    limitations: LIMITATIONS,
    routeCount: pages.length,
    failedRouteCount: failures.length,
    source: {
      url: parsedUrl.href,
      origin: parsedUrl.origin,
    },
    site: {
      title,
      description,
    },
    routes: pages.map((page) => routeArtifact(page, true)),
    crawl: {
      status: crawlStatus(failures),
      maxDepth: 1,
      maxPages,
      timeoutMs,
      delayMs,
      retries,
      fetched: pages.length,
      failed: failures.length,
      failures,
      receipts,
      sitemap,
      sameOriginOnly: true,
      userAgent,
      robots,
    },
    capabilities,
    diagnostics: diagnosticsStatus,
    warnings,
    caveats: [
      "Only the homepage and same-origin pages linked from it were fetched.",
      "Routes were discovered from homepage anchor href values.",
      "No recursive crawl beyond depth 1 was performed.",
      "JavaScript was not executed.",
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
    fetchedAt,
    diagnostics,
  });

  const partialOutputs = {
    "context.json": `${JSON.stringify(context, null, 2)}\n`,
    "llms.txt": llms,
    "system.json": `${JSON.stringify(system, null, 2)}\n`,
  };

  let runtime = {
    artifactSchemaVersion: ARTIFACT_SCHEMA_VERSION,
    generator: {
      name: "agentify",
      version,
    },
    generatedAt: fetchedAt,
    sourceUrl: parsedUrl.href,
    renderer: RENDERER,
    limitations: LIMITATIONS,
    routeCount: pages.length,
    failedRouteCount: failures.length,
    buildId: buildIdFor(partialOutputs),
    artifacts: [],
    capabilities,
    crawl: {
      status: crawlStatus(failures),
      maxDepth: 1,
      maxPages,
      timeoutMs,
      delayMs,
      retries,
      fetched: pages.length,
      failed: failures.length,
      failures,
      receipts,
      sitemap,
      sameOriginOnly: true,
      userAgent,
      robots,
    },
    diagnostics: diagnosticsStatus,
    warnings,
  };

  let runtimeOutput = `${JSON.stringify(runtime, null, 2)}\n`;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const outputs = {
      ...partialOutputs,
      "runtime.json": runtimeOutput,
    };
    const artifacts = artifactEntries(outputs).map((artifact) => (
      artifact.path === "runtime.json"
        ? { ...artifact, sha256: RUNTIME_HASH_PLACEHOLDER }
        : artifact
    ));
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

  const finalArtifacts = artifactEntries({
    ...partialOutputs,
    "runtime.json": runtimeOutput,
  });
  runtime = {
    ...runtime,
    artifacts: finalArtifacts,
  };
  runtimeOutput = `${JSON.stringify(runtime, null, 2)}\n`;

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
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": userAgent,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new AgentifyFetchError(
        response.status === 429
          ? "Server returned 429 Too Many Requests. Try again later, lower --max-pages, add --delay-ms, or use a site-approved user agent."
          : response.statusText || `HTTP ${response.status}`,
        {
          status: response.status,
          statusText: response.statusText,
          url,
        }
      );
    }

    return {
      contentType: response.headers.get("content-type") ?? "",
      finalUrl: response.url || url,
      redirected: Boolean(response.redirected),
      redirectChain: response.url && response.url !== url
        ? [url, response.url]
        : [],
      status: response.status,
      statusText: response.statusText,
      timingMs: Date.now() - startedAt,
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

async function fetchTextWithRetry(url, userAgent, timeoutMs, retries, delayMs) {
  let attempt = 0;

  while (true) {
    try {
      return await fetchText(url, userAgent, timeoutMs);
    } catch (error) {
      attempt += 1;

      if (attempt > retries) {
        throw error;
      }

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }
}

async function fetchHtmlWithRetry(url, userAgent, timeoutMs, retries, delayMs) {
  const response = await fetchTextWithRetry(url, userAgent, timeoutMs, retries, delayMs);

  if (!response.contentType.includes("text/html")) {
    throw new AgentifyFetchError(
      `expected HTML response, received ${response.contentType}`,
      {
        url,
      }
    );
  }

  return {
    html: response.text,
    receipt: {
      url,
      finalUrl: response.finalUrl,
      status: response.status,
      statusText: response.statusText,
      contentType: response.contentType,
      timingMs: response.timingMs,
      redirected: response.redirected,
      redirectChain: response.redirectChain,
    },
  };
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

function normalizeFetchHtmlResult(url, result, startedAt) {
  if (typeof result === "string") {
    return {
      html: result,
      receipt: {
        url,
        finalUrl: url,
        status: 200,
        statusText: "OK",
        contentType: "text/html",
        timingMs: Date.now() - startedAt,
        redirected: false,
        redirectChain: [],
      },
    };
  }

  return {
    html: result.html ?? result.text ?? "",
    receipt: {
      url,
      finalUrl: result.receipt?.finalUrl ?? result.finalUrl ?? url,
      status: result.receipt?.status ?? result.status ?? 200,
      statusText: result.receipt?.statusText ?? result.statusText ?? "OK",
      contentType: result.receipt?.contentType ?? result.contentType ?? "text/html",
      timingMs: result.receipt?.timingMs ?? result.timingMs ?? Date.now() - startedAt,
      redirected: result.receipt?.redirected ?? result.redirected ?? false,
      redirectChain: result.receipt?.redirectChain ?? result.redirectChain ?? [],
    },
  };
}

async function fetchRouteHtml(fetcher, url) {
  const startedAt = Date.now();
  const result = await fetcher(url);

  return normalizeFetchHtmlResult(url, result, startedAt);
}

async function fetchRobots(source, options) {
  if (typeof options.robotsTxt === "string") {
    const url = new URL("/robots.txt", source).href;

    return {
      status: "fetched",
      url,
      bytes: byteLength(options.robotsTxt),
      sitemaps: extractRobotsSitemaps(options.robotsTxt, source),
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
      ((targetUrl) => fetchTextWithRetry(
        targetUrl,
        options.userAgent ?? DEFAULT_USER_AGENT,
        normalizeTimeoutMs(options.timeoutMs),
        normalizeRetries(options.retries),
        normalizeDelayMs(options.delayMs)
      ));
    const result = await textFetcher(url);
    const text = typeof result === "string" ? result : result.text;

    return {
      status: "fetched",
      url,
      bytes: byteLength(text ?? ""),
      receipt: typeof result === "string" ? null : textReceipt(url, result),
      sitemaps: extractRobotsSitemaps(text, source),
      note: "robots.txt was fetched for awareness only; v0.6 does not enforce directives yet.",
    };
  } catch (error) {
    return {
      status: "unavailable",
      url,
      failure: failureFromError(url, error),
      note: "robots.txt could not be fetched; v0.6 records this but does not enforce directives.",
    };
  }
}

async function fetchSitemap(source, homepageHtml, robots, options) {
  const defaultUrl = new URL("/sitemap.xml", source).href;
  const linkedUrls = extractSitemapLinks(homepageHtml, source);
  const candidates = Array.from(new Set([
    defaultUrl,
    ...(robots.sitemaps ?? []),
    ...linkedUrls,
  ]));

  if (typeof options.sitemapXml === "string") {
    return {
      status: "fetched",
      url: candidates[0] ?? defaultUrl,
      bytes: byteLength(options.sitemapXml),
      candidateUrls: candidates,
      discoveredVia: "provided",
      note: "sitemap.xml was provided by the caller.",
    };
  }

  if (options.skipSitemap) {
    return {
      status: "skipped",
      url: defaultUrl,
      candidateUrls: candidates,
      note: "sitemap.xml fetch skipped.",
    };
  }

  const textFetcher = options.textFetcher ??
    ((targetUrl) => fetchTextWithRetry(
      targetUrl,
      options.userAgent ?? DEFAULT_USER_AGENT,
      normalizeTimeoutMs(options.timeoutMs),
      normalizeRetries(options.retries),
      normalizeDelayMs(options.delayMs)
    ));
  let lastFailure = null;

  for (const url of candidates) {
    try {
      const result = await textFetcher(url);
      const text = typeof result === "string" ? result : result.text;

      return {
        status: "fetched",
        url,
        bytes: byteLength(text ?? ""),
        candidateUrls: candidates,
        discoveredVia: url === defaultUrl
          ? "default"
          : robots.sitemaps?.includes(url)
            ? "robots.txt"
            : "homepage-link",
        receipt: typeof result === "string" ? null : textReceipt(url, result),
        note: "sitemap.xml was fetched for discovery awareness.",
      };
    } catch (error) {
      lastFailure = failureFromError(url, error);
    }
  }

  return {
    status: "unavailable",
    url: candidates[0] ?? defaultUrl,
    candidateUrls: candidates,
    failure: lastFailure,
    note: "sitemap.xml could not be fetched from discovered candidates.",
  };
}

async function crawlRoutes(sourceUrl, options) {
  const source = new URL(sourceUrl);
  const maxPages = normalizeMaxPages(options.maxPages);
  const timeoutMs = normalizeTimeoutMs(options.timeoutMs);
  const delayMs = normalizeDelayMs(options.delayMs);
  const retries = normalizeRetries(options.retries);
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  const verbose = Boolean(options.verbose);
  const fetcher = options.fetcher ??
    ((url) => fetchHtmlWithRetry(url, userAgent, timeoutMs, retries, delayMs));
  const robots = await fetchRobots(source, {
    ...options,
    timeoutMs,
    userAgent,
    delayMs,
    retries,
  });
  let sitemap = {
    status: "unavailable",
    url: new URL("/sitemap.xml", source).href,
    candidateUrls: [new URL("/sitemap.xml", source).href],
    note: "sitemap.xml was not checked because the homepage was unavailable.",
  };
  const pages = [];
  const failures = [];
  const diagnostics = [];
  const homepageRoute = routeFromUrl(source);

  let homepageHtml = options.html ?? "";
  let homepageReceipt = {
    url: source.href,
    finalUrl: source.href,
    status: 200,
    statusText: "OK",
    contentType: "text/html",
    timingMs: 0,
    redirected: false,
    redirectChain: [],
  };

  if (!homepageHtml) {
    try {
      if (verbose) {
        console.log(`[agentify] fetch ${source.href}`);
      }

      const fetched = await fetchRouteHtml(fetcher, source.href);
      homepageHtml = fetched.html;
      homepageReceipt = fetched.receipt;
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
        sitemap,
        timeoutMs,
        delayMs,
        retries,
        userAgent,
      };
    }
  }

  const homepage = {
    ...pageMetadata(homepageRoute, homepageHtml, source),
    depth: 0,
    discoveredVia: "source",
    receipt: homepageReceipt,
  };
  pages.push(homepage);
  sitemap = await fetchSitemap(source, homepageHtml, robots, {
    ...options,
    timeoutMs,
    userAgent,
    delayMs,
    retries,
  });
  const discoveredRoutes = extractInternalRoutes(homepageHtml, source.href)
    .filter((route) => route !== homepage.path);
  const queue = [homepage.path, ...discoveredRoutes].slice(0, maxPages);

  for (const route of queue.slice(1)) {
    const url = new URL(route, source);

    try {
      if (verbose) {
        console.log(`[agentify] fetch ${url.href}`);
      }

      const fetched = await fetchRouteHtml(fetcher, url.href);
      pages.push({
        ...pageMetadata(route, fetched.html, source),
        depth: 1,
        discoveredVia: "homepage-anchor",
        receipt: fetched.receipt,
      });
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
    sitemap,
    timeoutMs,
    delayMs,
    retries,
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
  const sourceUrl = normalizeSourceUrl(url);
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
    sitemap: crawled.sitemap,
    timeoutMs: crawled.timeoutMs,
    delayMs: crawled.delayMs,
    retries: crawled.retries,
    userAgent: crawled.userAgent,
    diagnostics: crawled.diagnostics,
  });

  writeBundle(outputDir, bundle.outputs);

  return {
    ...bundle,
    outputDir,
  };
}

export function inspectAgentify(outputDir = path.join(process.cwd(), "agent")) {
  const runtimePath = path.join(outputDir, "runtime.json");
  const runtime = JSON.parse(fs.readFileSync(runtimePath, "utf8"));
  const renderer = rendererMode(runtime.renderer);

  return {
    sourceUrl: runtime.sourceUrl ?? "",
    status: runtime.crawl?.status ?? runtime.diagnostics?.status ?? "unknown",
    routeCount: runtime.routeCount ?? 0,
    failedRouteCount: runtime.failedRouteCount ?? runtime.crawl?.failed ?? 0,
    warnings: runtime.warnings ?? [],
    renderer,
    javascriptExecuted: typeof runtime.renderer?.javascriptExecuted === "boolean"
      ? runtime.renderer.javascriptExecuted
      : runtime.limitations?.javascriptNotExecuted === true
        ? false
        : null,
  };
}

function readArtifact(outputDir, name) {
  const filePath = path.join(outputDir, name);
  const text = fs.readFileSync(filePath, "utf8");

  return {
    name,
    path: filePath,
    text,
    json: name.endsWith(".json") ? JSON.parse(text) : null,
  };
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

export function validateAgentify(outputDir = path.join(process.cwd(), "agent")) {
  const errors = [];
  const warnings = [];
  const artifacts = new Map();

  for (const name of REQUIRED_ARTIFACTS) {
    try {
      artifacts.set(name, readArtifact(outputDir, name));
    } catch (error) {
      errors.push(`${name} is missing or unreadable: ${
        error instanceof Error ? error.message : String(error)
      }`);
    }
  }

  if (errors.length > 0) {
    return {
      errors,
      valid: false,
      warnings,
    };
  }

  const context = artifacts.get("context.json").json;
  const runtime = artifacts.get("runtime.json").json;
  const system = artifacts.get("system.json").json;

  for (const [name, artifact] of artifacts) {
    if (name.endsWith(".json") &&
      artifact.json?.artifactSchemaVersion !== ARTIFACT_SCHEMA_VERSION) {
      errors.push(`${name} artifactSchemaVersion must be ${ARTIFACT_SCHEMA_VERSION}`);
    }
  }

  for (const [name, artifact] of [
    ["context.json", context],
    ["runtime.json", runtime],
    ["system.json", system],
  ]) {
    if (artifact?.generator?.name !== "agentify") {
      errors.push(`${name} generator.name must be agentify`);
    }

    if (rendererMode(artifact?.renderer) !== RENDERER_MODE) {
      errors.push(`${name} renderer.mode must be ${RENDERER_MODE}`);
    }

    if (artifact?.renderer?.javascriptExecuted !== false) {
      errors.push(`${name} renderer.javascriptExecuted must be false`);
    }
  }

  if (runtime.routeCount !== context.routeCount ||
    runtime.routeCount !== system.routeCount) {
    errors.push("routeCount must match across runtime, context, and system");
  }

  if (runtime.failedRouteCount !== context.failedRouteCount ||
    runtime.failedRouteCount !== system.failedRouteCount) {
    errors.push(
      "failedRouteCount must match across runtime, context, and system"
    );
  }

  const artifactEntriesByPath = new Map(
    (runtime.artifacts ?? []).map((artifact) => [artifact.path, artifact])
  );

  for (const name of REQUIRED_ARTIFACTS) {
    const artifact = artifactEntriesByPath.get(name);
    const entry = artifacts.get(name);

    if (!artifact) {
      errors.push(`runtime.json artifacts must include ${name}`);
      continue;
    }

    if (artifact.bytes !== byteLength(entry.text)) {
      errors.push(`${name} byte count does not match runtime.json`);
    }

    if (!isSha256(artifact.sha256)) {
      errors.push(`${name} sha256 must be a 64-character hex digest`);
      continue;
    }

    const expectedHash = name === "runtime.json"
      ? sha256(runtimeHashInput(entry.text))
      : sha256(entry.text);

    if (artifact.sha256 !== expectedHash) {
      errors.push(`${name} sha256 does not match file contents`);
    }
  }

  if ((runtime.crawl?.receipts ?? []).length !== runtime.routeCount) {
    errors.push("runtime.json crawl.receipts length must match routeCount");
  }

  for (const receipt of runtime.crawl?.receipts ?? []) {
    if (typeof receipt.url !== "string" || !receipt.url) {
      errors.push("crawl receipt url is required");
    }

    if (typeof receipt.status !== "number") {
      errors.push(`crawl receipt for ${receipt.path ?? "unknown"} needs status`);
    }

    if (typeof receipt.contentType !== "string") {
      errors.push(
        `crawl receipt for ${receipt.path ?? "unknown"} needs contentType`
      );
    }
  }

  if (runtime.artifactSchemaVersion !== context.artifactSchemaVersion ||
    runtime.artifactSchemaVersion !== system.artifactSchemaVersion) {
    errors.push("artifactSchemaVersion must match across JSON artifacts");
  }

  if (runtime.artifactSchemaVersion !== ARTIFACT_SCHEMA_VERSION) {
    warnings.push(
      `validator supports artifactSchemaVersion ${ARTIFACT_SCHEMA_VERSION}`
    );
  }

  return {
    errors,
    valid: errors.length === 0,
    warnings,
  };
}

export function explainAgentify(outputDir = path.join(process.cwd(), "agent")) {
  const runtime = readArtifact(outputDir, "runtime.json").json;
  const validation = validateAgentify(outputDir);

  return {
    artifacts: REQUIRED_ARTIFACTS,
    artifactSchemaVersion: runtime.artifactSchemaVersion ?? "",
    crawl: {
      failed: runtime.crawl?.failed ?? runtime.failedRouteCount ?? 0,
      fetched: runtime.crawl?.fetched ?? runtime.routeCount ?? 0,
      status: runtime.crawl?.status ?? runtime.diagnostics?.status ?? "unknown",
    },
    discovery: {
      robotsTxt: runtime.crawl?.robots?.status === "fetched",
      sitemapXml: runtime.crawl?.sitemap?.status === "fetched",
    },
    renderer: {
      javascriptExecuted: typeof runtime.renderer?.javascriptExecuted === "boolean"
        ? runtime.renderer.javascriptExecuted
        : null,
      mode: rendererMode(runtime.renderer),
    },
    sourceUrl: runtime.sourceUrl ?? "",
    validation,
    warnings: runtime.warnings ?? [],
  };
}

function parseArgs(argv) {
  const options = {
    maxPages: DEFAULT_MAX_PAGES,
    outputDir: path.join(process.cwd(), "agent"),
    timeoutMs: DEFAULT_TIMEOUT_MS,
    delayMs: DEFAULT_DELAY_MS,
    retries: DEFAULT_RETRIES,
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

    if (value === "--delay-ms") {
      options.delayMs = normalizeDelayMs(argv[index + 1]);
      index += 1;
      continue;
    }

    if (value === "--retries") {
      options.retries = normalizeRetries(argv[index + 1]);
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

function printHelp() {
  console.log(`agentify ${AGENTIFY_VERSION}

Usage:
  agentify <url> [--out agent] [--max-pages 10] [--user-agent agentify/0.6] [--delay-ms 0] [--retries 0] [--verbose]
  agentify explain [agent]
  agentify inspect [agent]
  agentify validate [agent]

Options:
  --out <dir>          Write artifacts to this directory
  --max-pages <count>  Maximum same-origin pages to fetch
  --user-agent <ua>    User agent to send while fetching
  --delay-ms <ms>      Wait between retries when fetching pages
  --retries <count>    Retry failed fetches up to this many times
  --verbose            Print each fetch attempt
  --version            Show agentify version
  --help               Show this help`);
}

function printOutputPaths(outputDir) {
  console.log("[agentify] output:");

  for (const name of [
    "system.json",
    "runtime.json",
    "context.json",
    "llms.txt",
  ]) {
    console.log(`- ${path.join(outputDir, name)}`);
  }
}

function printDiagnostics(diagnostics) {
  const warnings = uniqueWarningLines(diagnostics);
  const errors = errorDiagnostics(diagnostics);

  if (warnings.length > 0) {
    console.log("[agentify] warnings:");

    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  } else {
    console.log("[agentify] warnings: 0");
  }

  console.log(`[agentify] errors: ${errors.length}`);
}

function printInspect(summary) {
  console.log(`Source: ${summary.sourceUrl}`);
  console.log(`Status: ${summary.status}`);
  console.log("");
  console.log("Routes:");
  console.log(`- discovered: ${summary.routeCount}`);
  console.log(`- failed: ${summary.failedRouteCount}`);
  console.log("");
  console.log("Warnings:");

  if (summary.warnings.length > 0) {
    for (const warning of summary.warnings) {
      console.log(`- ${formatWarning(warning)}`);
    }
  } else {
    console.log("- none");
  }

  console.log("");
  console.log("Renderer:");
  console.log(`- ${summary.renderer}`);

  if (summary.javascriptExecuted !== null) {
    console.log(
      `- javascript: ${summary.javascriptExecuted ? "enabled" : "disabled"}`
    );
  }
}

function printValidation(result) {
  if (result.valid) {
    console.log("[agentify] validation passed");
  } else {
    console.log("[agentify] validation failed");
  }

  if (result.errors.length > 0) {
    console.log("[agentify] errors:");

    for (const error of result.errors) {
      console.log(`- ${error}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log("[agentify] warnings:");

    for (const warning of result.warnings) {
      console.log(`- ${warning}`);
    }
  }
}

function yesNo(value) {
  return value ? "yes" : "no";
}

function printExplain(summary) {
  console.log("Agentify Runtime Explanation");
  console.log("----------------------------");
  console.log("");
  console.log("Source");
  console.log(`  ${summary.sourceUrl}`);
  console.log("");
  console.log("Renderer");
  console.log(`  ${summary.renderer.mode}`);
  console.log(
    `  javascript executed: ${yesNo(summary.renderer.javascriptExecuted)}`
  );
  console.log("");
  console.log("Crawl");
  console.log(`  status: ${summary.crawl.status}`);
  console.log(`  pages fetched: ${summary.crawl.fetched}`);
  console.log(`  failed routes: ${summary.crawl.failed}`);
  console.log("");
  console.log("Discovery");
  console.log(`  robots.txt: ${yesNo(summary.discovery.robotsTxt)}`);
  console.log(`  sitemap.xml: ${yesNo(summary.discovery.sitemapXml)}`);
  console.log("");
  console.log("Warnings");

  if (summary.warnings.length > 0) {
    for (const warning of summary.warnings) {
      console.log(`  - ${formatWarning(warning)}`);
    }
  } else {
    console.log("  none");
  }

  console.log("");
  console.log("Artifacts");

  for (const artifact of summary.artifacts) {
    console.log(`  ${artifact}`);
  }

  console.log("");
  console.log("Integrity");
  console.log(
    `  validation: ${summary.validation.valid ? "passed" : "failed"}`
  );
  console.log(`  artifact schema: ${summary.artifactSchemaVersion}`);
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return;
  }

  if (argv.includes("--version") || argv.includes("-v")) {
    console.log(AGENTIFY_VERSION);
    return;
  }

  if (argv[0] === "explain") {
    try {
      const summary = explainAgentify(path.resolve(argv[1] ?? "agent"));

      printExplain(summary);

      if (!summary.validation.valid) {
        process.exit(1);
      }
    } catch (error) {
      console.error(
        `[agentify] explain failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      process.exit(1);
    }

    return;
  }

  if (argv[0] === "inspect") {
    try {
      printInspect(inspectAgentify(path.resolve(argv[1] ?? "agent")));
    } catch (error) {
      console.error(
        `[agentify] inspect failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      process.exit(1);
    }

    return;
  }

  if (argv[0] === "validate") {
    try {
      const result = validateAgentify(path.resolve(argv[1] ?? "agent"));

      printValidation(result);

      if (!result.valid) {
        process.exit(1);
      }
    } catch (error) {
      console.error(
        `[agentify] validate failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      process.exit(1);
    }

    return;
  }

  const { options, url } = parseArgs(argv);

  if (!url) {
    printHelp();
    process.exit(1);
  }

  try {
    const result = await agentify(url, options);

    console.log(`[agentify] fetched ${result.routes.length} pages`);
    printDiagnostics(result.diagnostics);
    printOutputPaths(result.outputDir);
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
  ? fs.realpathSync(fileURLToPath(import.meta.url)) ===
      fs.realpathSync(path.resolve(process.argv[1]))
  : false;

if (isCli) {
  await main();
}
