import type {
  SiteDefinition,
  SitePage,
  WritingPost,
} from "./site.js";
import { config } from "./config.js";
import { escapeHtml } from "./utils.js";
import { FRAMEWORK_VERSION } from "./version.js";

const AUTHOR_NAME = "Lautaro Gärtner";
const AUTHOR_USERNAME = "@lautarogartner_";
const X_PROFILE_URL = "https://x.com/lautarogartner_";
const SOURCE_URL = "https://github.com/LautaroGartner/paideia-framework";
const SOCIAL_IMAGE_WIDTH = 1200;
const SOCIAL_IMAGE_HEIGHT = 630;

function normalizePath(pagePath: string): string {
  if (pagePath === "/") {
    return "/";
  }

  return `/${pagePath.replace(/^\/+|\/+$/g, "")}`;
}

function sortPosts(posts: WritingPost[]): WritingPost[] {
  return [...posts].sort((left, right) =>
    right.publishedAt.localeCompare(left.publishedAt)
  );
}

function siteLanguage(site: SiteDefinition): string {
  return site.language ?? "en";
}

function canonicalUrl(
  site: SiteDefinition,
  pagePath: string
): string | null {
  if (!site.url) {
    return null;
  }

  const base = site.url.replace(/\/+$/g, "");
  const normalized = normalizePath(pagePath);

  if (normalized === "/") {
    return `${base}/`;
  }

  return `${base}${normalized}`;
}

function siteAssetUrl(
  site: SiteDefinition,
  assetPath: string
): string | null {
  if (!site.url) {
    return null;
  }

  const base = site.url.replace(/\/+$/g, "");
  const normalized = `/${assetPath.replace(/^\/+/g, "")}`;

  return `${base}${normalized}`;
}

function jsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function renderHead(options: {
  site: SiteDefinition;
  path: string;
  title: string;
  description: string;
  imagePath?: string;
  type?: "website" | "article";
  publishedAt?: string;
  topics?: string[];
  structuredData?: unknown;
}): string {
  const canonical = canonicalUrl(
    options.site,
    options.path
  );
  const author = options.site.author
    ? `\n    <meta name="author" content="${escapeHtml(options.site.author)}">`
    : "";
  const canonicalLink = canonical
    ? `\n    <link rel="canonical" href="${escapeHtml(canonical)}">`
    : "";
  const socialUrl = canonical
    ? `\n    <meta property="og:url" content="${escapeHtml(canonical)}">`
    : "";
  const imageUrl = options.imagePath
    ? siteAssetUrl(options.site, options.imagePath)
    : null;
  const socialImage = imageUrl
    ? `
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:width" content="${SOCIAL_IMAGE_WIDTH}">
    <meta property="og:image:height" content="${SOCIAL_IMAGE_HEIGHT}">
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">`
    : "";
  const articleMeta = options.type === "article"
    ? `${options.publishedAt
        ? `\n    <meta property="article:published_time" content="${escapeHtml(options.publishedAt)}">`
        : ""}${(options.topics ?? [])
        .map((topic) => `\n    <meta property="article:tag" content="${escapeHtml(topic)}">`)
        .join("")}`
    : "";
  const structuredData = options.structuredData
    ? `\n    <script type="application/ld+json">${jsonLd(options.structuredData)}</script>`
    : "";

  return `<meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(options.title)}</title>
    <meta name="description" content="${escapeHtml(options.description)}">
    <meta name="robots" content="index,follow">
    <meta property="og:site_name" content="${escapeHtml(options.site.title)}">
    <meta property="og:type" content="${options.type === "article" ? "article" : "website"}">
    <meta property="og:title" content="${escapeHtml(options.title)}">
    <meta property="og:description" content="${escapeHtml(options.description)}">${socialUrl}${socialImage}${articleMeta}
    <meta name="twitter:card" content="${imageUrl ? "summary_large_image" : "summary"}">
    <meta name="twitter:title" content="${escapeHtml(options.title)}">
    <meta name="twitter:description" content="${escapeHtml(options.description)}">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">${author}${canonicalLink}${structuredData}
    <script>
      (() => {
        function formatRelativeDate(publishedAt, now = new Date()) {
          const published = new Date(publishedAt + "T00:00:00Z");

          if (Number.isNaN(published.getTime())) {
            return "";
          }

          const today = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate()
          ));
          const diffDays = Math.floor(
            (today.getTime() - published.getTime()) / 86400000
          );

          if (diffDays <= 0) return "today";
          if (diffDays === 1) return "1d ago";
          if (diffDays < 30) return diffDays + "d ago";

          const diffMonths = Math.floor(diffDays / 30);

          if (diffMonths === 1) return "1 month ago";
          if (diffMonths < 12) return diffMonths + " months ago";

          const diffYears = Math.floor(diffMonths / 12);

          if (diffYears === 1) return "1 year ago";
          return diffYears + " years ago";
        }

        function updateRelativeDates() {
          for (const label of document.querySelectorAll("[data-relative-date-label]")) {
            const relativeDate = label.querySelector("[data-relative-date]");
            const value = formatRelativeDate(label.dataset.publishedAt);

            if (!relativeDate || !value) {
              continue;
            }

            relativeDate.textContent = value;
            label.hidden = false;
          }
        }

        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", updateRelativeDates, { once: true });
        } else {
          updateRelativeDates();
        }

        const localHosts = new Set(["", "localhost", "127.0.0.1", "::1"]);

        if (localHosts.has(window.location.hostname)) {
          return;
        }

        for (const src of [
          "/_vercel/insights/script.js",
          "/_vercel/speed-insights/script.js",
        ]) {
          const script = document.createElement("script");
          script.defer = true;
          script.src = src;
          document.head.append(script);
        }
      })();
    </script>`;
}

function pageOutputPath(page: SitePage): string {
  const normalized = normalizePath(page.path);

  if (normalized === "/") {
    return "index.html";
  }

  return `${normalized.slice(1)}/index.html`;
}

function postPath(post: WritingPost): string {
  return `/${post.slug}`;
}

function postOutputPath(post: WritingPost): string {
  return `${post.slug}/index.html`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function renderPostTopics(post: WritingPost): string {
  if (!post.topics || post.topics.length === 0) {
    return "";
  }

  return `<p class="post-topics">${post.topics
    .map((topic) => escapeHtml(topic))
    .join(" / ")}</p>`;
}

function renderHeader(
  site: SiteDefinition,
  currentPath: string
): string {
  const label = site.author ?? AUTHOR_NAME;
  const normalizedPath = normalizePath(currentPath);
  const brand =
    normalizedPath === "/"
      ? `<span class="brand">${escapeHtml(label)}</span>`
      : `<a class="brand" href="/">${escapeHtml(label)}</a>`;
  const aboutLink =
    normalizedPath === "/about"
      ? ""
      : `
          <a href="/about">About</a>`;

  return `<header>
        ${brand}
        <nav aria-label="Site">
          ${aboutLink}
          <a href="${escapeHtml(X_PROFILE_URL)}" rel="me">𝕏 Follow me</a>
        </nav>
      </header>`;
}

function renderFooter(options: { generatedBy?: boolean } = {}): string {
  const generatedBy =
    options.generatedBy === false
      ? ""
      : `
        <span class="generated-by">
          Generated by Paideia Framework v${escapeHtml(FRAMEWORK_VERSION)}.
        </span>`;

  return `<footer>
        <span>
          ${escapeHtml(AUTHOR_NAME)}
          <a href="${escapeHtml(X_PROFILE_URL)}" rel="me">${escapeHtml(AUTHOR_USERNAME)}</a>
        </span>
        ${generatedBy}
        <a href="${escapeHtml(SOURCE_URL)}">Source</a>
      </footer>`;
}

function renderAgentFileLinks(): string {
  return `<p class="agent-files">
          <a href="/system.json">system.json</a>
          <a href="/runtime.json">runtime.json</a>
          <a href="/context.json">context.json</a>
          <a href="/llms.txt">llms.txt</a>
        </p>`;
}

function renderBody(value: string): string {
  const blocks = value.trim().split(/\n{2,}/);
  const rendered = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index].trim();

    if (!block) {
      continue;
    }

    if (block.startsWith("```")) {
      const code = block
        .replace(/^```[a-z]*\n?/i, "")
        .replace(/\n?```$/, "");

      rendered.push(`<pre><code>${escapeHtml(code)}</code></pre>`);
      continue;
    }

    if (block.startsWith("## ")) {
      rendered.push(`<h2>${escapeHtml(block.slice(3).trim())}</h2>`);
      continue;
    }

    if (block.startsWith("### ")) {
      rendered.push(`<h3>${escapeHtml(block.slice(4).trim())}</h3>`);
      continue;
    }

    if (block.split("\n").every((line) => line.trim().startsWith("* "))) {
      const items = block
        .split("\n")
        .map((line) => `<li>${escapeHtml(line.trim().slice(2))}</li>`)
        .join("");

      rendered.push(`<ul>${items}</ul>`);
      continue;
    }

    rendered.push(
      `<p>${escapeHtml(block.replace(/\s*\n\s*/g, " "))}</p>`
    );
  }

  return rendered.join("\n        ");
}

function renderStyles(): string {
  return `:root {
        --accent: #5f6f52;
        --bg: #fbfaf7;
        --line: #e8e2d8;
        --muted: #6f6a61;
        --text: #151515;

        color-scheme: light dark;
        font-family:
          ui-sans-serif,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;

        background: var(--bg);
        color: var(--text);
      }

      @media (prefers-color-scheme: dark) {
        :root {
          --accent: #a7b995;
          --bg: #181815;
          --line: #303026;
          --muted: #9b958a;
          --text: #eeeae2;
        }
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
      }

      .shell {
        display: flex;
        flex-direction: column;
        max-width: 42rem;
        min-height: 100vh;
        margin: 0 auto;
        padding: 1.5rem 1.5rem 4rem;
      }

      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;
        margin-bottom: 2.5rem;
        padding-bottom: 8px;
      }

      header a,
      header .brand,
      nav a {
        color: inherit;
        text-decoration: none;
      }

      header a,
      header .brand {
        font-size: 1.125rem;
        font-weight: 700;
        line-height: 1.75rem;
      }

      nav {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
      }

      nav a {
        color: var(--muted);
        display: inline-flex;
        align-items: center;
        font-size: 0.75rem;
        font-weight: 500;
        line-height: 1rem;
        padding: 0.125rem 0.375rem;
        border-radius: 0.75rem;
      }

      main {
        padding-top: 0;
      }

      a:hover {
        color: var(--accent);
        text-decoration: underline;
        text-underline-offset: 3px;
      }

      nav a:hover {
        background: var(--line);
        color: var(--text);
        text-decoration: none;
      }

      footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
        margin-top: auto;
        padding: 0.75rem 0 1.5rem;
        border-top: 1px solid var(--line);
        color: var(--muted);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.75rem;
        line-height: 1rem;
      }

      footer a {
        color: inherit;
      }

      footer a:hover {
        color: var(--accent);
      }

      .generated-by {
        color: var(--muted);
      }

      .page-title,
      .not-found-title {
        margin: 0;
        max-width: 680px;
        font-size: clamp(1.8rem, 5vw, 3rem);
        line-height: 1;
        letter-spacing: 0;
      }

      .page-body p,
      .not-found-copy {
        max-width: 620px;
        margin: 18px 0 0;
        color: var(--text);
        font-size: 1rem;
        line-height: 1.75;
      }

      .not-found-copy {
        line-height: 1.7;
      }

      .post-list {
        display: grid;
        gap: 20px;
        margin-top: 0;
        padding-top: 0;
      }

      .post-list > h2 {
        margin: 0;
        font-size: 1rem;
        letter-spacing: 0;
      }

      .empty-state {
        margin-top: 0;
        font-size: 1rem;
      }

      .post-item {
        display: grid;
        grid-template-columns: 112px minmax(0, 1fr);
        gap: 18px;
        align-items: start;
      }

      time {
        color: var(--muted);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.75rem;
        white-space: nowrap;
      }

      .post-kicker {
        margin: 0 0 5px;
        color: var(--accent);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.72rem;
        letter-spacing: 0.08em;
        line-height: 1.4;
        text-transform: uppercase;
      }

      .post-item h2 {
        margin: 0;
        font-size: 0.875rem;
        font-weight: 560;
        letter-spacing: 0;
        line-height: 1.25rem;
      }

      .post-item h2 a {
        color: inherit;
        text-decoration: none;
      }

      .post-title-link {
        transition: color 0.15s ease;
      }

      .post-item:hover .post-title-link {
        color: var(--accent);
        text-decoration: none;
      }

      .post-topics {
        margin: 5px 0 0;
        color: var(--muted);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.75rem;
        line-height: 1.5;
      }

      .page-body .agent-files {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        max-width: 620px;
        margin: 2rem 0 2.25rem;
        color: #6f6a61;
        font-size: 0.9rem;
        line-height: 1.5;
      }

      .page-body .agent-files a {
        color: inherit;
      }

      .page-body .agent-files a:hover {
        color: var(--accent);
      }

      .meta {
        margin-top: 0;
        color: var(--muted);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.75rem;
        line-height: 1.5;
      }

      .meta a {
        color: inherit;
      }

      .meta a:hover {
        color: var(--accent);
      }

      .post-title {
        margin: 0 0 0.25rem;
        max-width: 100%;
        font-size: 1.5rem;
        line-height: 2rem;
        letter-spacing: 0;
      }

      .description {
        max-width: 100%;
        margin: 0.5rem 0 0;
        color: var(--muted);
        font-size: 1rem;
        font-style: italic;
        line-height: 1.65;
      }

      .post-body {
        margin-top: 0.5rem;
      }

      .post-body p {
        max-width: 100%;
        margin: 1.25rem 0;
        color: var(--text);
        font-size: 1rem;
        line-height: 1.5;
      }

      .post-body h2,
      .post-body h3 {
        max-width: 100%;
        margin: 2rem 0 1rem;
        color: var(--text);
        font-size: 1.25rem;
        line-height: 1.35;
      }

      .post-body ul {
        margin: 1rem 0 1.5rem;
        padding-left: 1.25rem;
      }

      .post-body li {
        margin: 0.45rem 0;
        line-height: 1.55;
      }

      .post-body pre {
        max-width: 100%;
        margin: 1.25rem 0;
        padding: 1rem;
        overflow-x: auto;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: color-mix(in srgb, var(--line) 42%, transparent);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.86rem;
        line-height: 1.6;
      }

      @media (max-width: 640px) {
        .shell {
          padding-top: 0.75rem;
        }

        header {
          align-items: baseline;
          gap: 14px;
          margin-bottom: 1.25rem;
        }

        header .brand {
          font-size: 1rem;
          line-height: 1.5rem;
        }

        nav {
          gap: 24px;
        }

        footer {
          justify-content: space-between;
          gap: 16px;
          margin-top: auto;
          padding: 1rem 0 0;
          border-top: 1px solid var(--line);
          font-size: 0.75rem;
        }

        .generated-by {
          display: none;
        }

        .post-list {
          gap: 24px;
        }

        .post-item {
          grid-template-columns: 1fr;
          gap: 6px;
        }

        .post-item h2 {
          font-weight: 560;
          line-height: 1.42;
        }

        .post-topics {
          max-width: 28rem;
        }

        .post-kicker {
          margin-bottom: 0.75rem;
        }

        .meta {
          margin-top: 0;
          line-height: 1.6;
        }

        .post-title {
          margin-top: 0;
        }

        .description {
          margin-top: 0.5rem;
          font-size: 1rem;
          line-height: 1.6;
        }

        .post-body {
          margin-top: 0.5rem;
        }

        .post-body p {
          line-height: 1.5;
        }
      }`;
}

function renderLayout(options: {
  site: SiteDefinition;
  path: string;
  title: string;
  description: string;
  body: string;
  imagePath?: string;
  type?: "website" | "article";
  publishedAt?: string;
  topics?: string[];
  structuredData?: unknown;
}): string {
  return `<!doctype html>
<html lang="${escapeHtml(siteLanguage(options.site))}">
  <head>
    ${renderHead({
      site: options.site,
      path: options.path,
      title: options.title,
      description: options.description,
      imagePath: options.imagePath,
      type: options.type,
      publishedAt: options.publishedAt,
      topics: options.topics,
      structuredData: options.structuredData,
    })}
    <style>
      ${renderStyles()}
    </style>
  </head>
  <body>
    <div class="shell">
      ${renderHeader(options.site, options.path)}
      <main>
${options.body}
      </main>
      ${renderFooter()}
    </div>
  </body>
</html>
`;
}

function renderPostList(posts: WritingPost[], options: {
  heading?: string;
  limit?: number;
} = {}): string {
  const orderedPosts = sortPosts(posts);

  if (orderedPosts.length === 0) {
    return `
        <section class="post-list" aria-label="Writing">
          <p class="empty-state">No writing published yet.</p>
        </section>`;
  }

  const visiblePosts =
    typeof options.limit === "number"
      ? orderedPosts.slice(0, options.limit)
      : orderedPosts;
  const heading = options.heading
    ? `<h2>${escapeHtml(options.heading)}</h2>`
    : "";

  return `
        <section class="post-list" aria-label="Writing">
          ${heading}
          ${visiblePosts
            .map(
              (post) => `<article class="post-item">
            <time datetime="${escapeHtml(post.publishedAt)}">${escapeHtml(formatDate(post.publishedAt))}</time>
            <div>
              <h2><a class="post-title-link" href="${escapeHtml(postPath(post))}">${escapeHtml(post.title)}</a></h2>
              ${renderPostTopics(post)}
            </div>
          </article>`
            )
            .join("\n          ")}
        </section>`;
}

export function generateFaviconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#050505"/>
  <text x="32" y="40" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="23" font-weight="700" fill="#ffffff">LG</text>
</svg>
`;
}

export function getSiteOutputPath(page: SitePage): string {
  return pageOutputPath(page);
}

export function getPostOutputPath(post: WritingPost): string {
  return postOutputPath(post);
}

export function generateSitePage(
  site: SiteDefinition,
  page: SitePage
): string {
  const title =
    page.path === "/"
      ? site.title
      : `${page.title} - ${AUTHOR_NAME}`;

  const description =
    page.description ?? site.description;
  const isHome = normalizePath(page.path) === "/";
  const isAbout = normalizePath(page.path) === "/about";
  const pageBody = isHome
    ? ""
    : `        <h1 class="page-title">${escapeHtml(page.title)}</h1>
        <div class="page-body">
          ${renderBody(page.body)}
          ${isAbout ? renderAgentFileLinks() : ""}
        </div>`;
  const postList =
    normalizePath(page.path) === "/"
      ? renderPostList(site.posts)
      : "";
  const canonical = canonicalUrl(site, page.path);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": isAbout ? "AboutPage" : "WebSite",
    name: title,
    description,
    url: canonical ?? undefined,
    inLanguage: siteLanguage(site),
    author: site.author
      ? {
          "@type": "Person",
          name: site.author,
          url: site.authorUrl ?? site.url ?? undefined,
        }
      : undefined,
  };

  return renderLayout({
    site,
    path: page.path,
    title,
    description,
    body: `${pageBody}
${postList}`,
    structuredData,
  });
}

export function generatePostPage(
  site: SiteDefinition,
  post: WritingPost,
  options: {
    imagePath?: string;
  } = {}
): string {
  const canonical = canonicalUrl(site, postPath(post));

  return renderLayout({
    site,
    path: postPath(post),
    title: `${post.title} - ${AUTHOR_NAME}`,
    description: post.description,
    imagePath: options.imagePath,
    type: "article",
    publishedAt: post.publishedAt,
    topics: post.topics,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.publishedAt,
      url: canonical ?? undefined,
      mainEntityOfPage: canonical ?? undefined,
      keywords: post.topics ?? [],
      author: {
        "@type": "Person",
        name: site.author ?? AUTHOR_NAME,
        url: site.authorUrl ?? site.url ?? undefined,
      },
      publisher: {
        "@type": "Person",
        name: site.author ?? AUTHOR_NAME,
      },
    },
    body: `        <h1 class="post-title">${escapeHtml(post.title)}</h1>
        <div class="meta"><a href="${escapeHtml(X_PROFILE_URL)}" rel="me">${escapeHtml(AUTHOR_USERNAME)}</a> | <time datetime="${escapeHtml(post.publishedAt)}">${escapeHtml(formatDate(post.publishedAt))}</time><span data-relative-date-label data-published-at="${escapeHtml(post.publishedAt)}" hidden> | <span data-relative-date></span></span></div>
        <p class="description">${escapeHtml(post.description)}</p>
        <div class="post-body">
          ${renderBody(post.body)}
        </div>`,
  });
}

export function generateNotFoundPage(site: SiteDefinition): string {
  return renderLayout({
    site,
    path: "/404",
    title: `Page not found - ${site.title}`,
    description: "The requested page could not be found.",
    body: `        <h1 class="not-found-title">Page not found</h1>
        <p class="not-found-copy">The page you are looking for does not exist yet.</p>`,
  });
}

export function generateSiteManifest(site: SiteDefinition): string {
  return generateSiteManifestWithCapabilities(site, []);
}

export function generateSiteManifestWithCapabilities(
  site: SiteDefinition,
  capabilities: string[]
): string {
  const orderedPosts = sortPosts(site.posts);

  const manifest = {
    framework: {
      name: "Paideia Framework",
      version: FRAMEWORK_VERSION,
      mode: config.mode,
    },
    capabilities,
    site: {
      title: site.title,
      description: site.description,
      url: site.url ?? null,
      author: site.author ?? null,
      language: siteLanguage(site),
      pages: site.pages.map((page) => ({
        path: normalizePath(page.path),
        canonical: canonicalUrl(site, page.path),
        title: page.title,
        description: page.description ?? null,
        nav: page.nav !== false,
        tokenSummary: page.tokenSummary ?? null,
        output: pageOutputPath(page),
      })),
      posts: orderedPosts.map((post) => ({
        slug: post.slug,
        path: postPath(post),
        canonical: canonicalUrl(site, postPath(post)),
        title: post.title,
        topics: post.topics ?? [],
        description: post.description,
        publishedAt: post.publishedAt,
        tokenSummary: post.tokenSummary,
        output: postOutputPath(post),
      })),
    },
    runtime: {
      target: "static-site",
      generation: {
        strategy: "static",
        output: "dist",
      },
      generatedArtifacts: [
        "404.html",
        "favicon.svg",
        "pages",
        "posts",
        "robots.txt",
        "sitemap.xml",
        "system.json",
        "runtime.json",
        "llms.txt",
        "context.json",
      ],
    },
    trust: {
      siteContractExplicit: true,
      generatedArtifactsInspectable: true,
      tokenFriendlyContextAvailable: true,
    },
  };

  return JSON.stringify(manifest, null, 2);
}

export function generateRuntimeIdentity(
  site: SiteDefinition,
  options: {
    artifactCount: number;
    artifacts: Array<{
      path: string;
      kind: string;
      bytes: number;
    }>;
    buildId: string;
    capabilities: string[];
    generatedAt: string;
    mode: "development" | "production";
  }
): string {
  const identity = {
    framework: {
      name: "Paideia Framework",
      version: FRAMEWORK_VERSION,
    },
    build: {
      id: options.buildId,
      generatedAt: options.generatedAt,
      mode: options.mode,
      artifactCount: options.artifactCount,
    },
    capabilities: options.capabilities,
    artifacts: options.artifacts,
    site: {
      pages: site.pages.length,
      posts: site.posts.length,
    },
    runtime: {
      inspectable: true,
      normalizedManifest: true,
      agentReadable: true,
    },
  };

  return JSON.stringify(identity, null, 2);
}

export function generateLlmsText(site: SiteDefinition): string {
  const orderedPosts = sortPosts(site.posts);
  const pages = site.pages
    .map((page) => {
      const summary = page.tokenSummary
        ? ` - ${page.tokenSummary}`
        : "";
      return `- ${page.title}: ${normalizePath(page.path)}${summary}`;
    })
    .join("\n");
  const posts = orderedPosts
    .map(
      (post) =>
        `- ${post.title}: ${postPath(post)} - ${post.tokenSummary}`
    )
    .join("\n");

  return `# ${site.title}

This site is generated by Paideia Framework.

Useful agent entrypoints:
- /system.json - runtime and site contract
- /runtime.json - runtime identity and build metadata
- /context.json - compressed site map and summaries
- /llms.txt - agent guidance

## Site

${site.description}
${site.url ? `\nCanonical site URL: ${site.url}` : ""}
${site.author ? `\nAuthor: ${site.author}` : ""}
Language: ${siteLanguage(site)}

## Pages

${pages}

## Writing

${posts}

## Generated By

Paideia Framework v${FRAMEWORK_VERSION}
`;
}

export function generateContextJson(site: SiteDefinition): string {
  const orderedPosts = sortPosts(site.posts);
  const latestPost = orderedPosts[0] ?? null;

  const context = {
    site: {
      title: site.title,
      description: site.description,
      url: site.url ?? null,
      author: site.author ?? null,
      language: siteLanguage(site),
    },
    pages: site.pages.map((page) => ({
      path: normalizePath(page.path),
      canonical: canonicalUrl(site, page.path),
      title: page.title,
      description:
        page.description ?? site.description,
      tokenSummary:
        page.tokenSummary ?? page.body,
    })),
    posts: orderedPosts.map((post) => ({
      slug: post.slug,
      path: postPath(post),
      canonical: canonicalUrl(site, postPath(post)),
      title: post.title,
      topics: post.topics ?? [],
      publishedAt: post.publishedAt,
      tokenSummary: post.tokenSummary,
    })),
    writing: {
      postCount: orderedPosts.length,
      latestPost: latestPost?.slug ?? null,
    },
    generatedBy: {
      name: "Paideia Framework",
      version: FRAMEWORK_VERSION,
    },
  };

  return JSON.stringify(context, null, 2);
}

export function generateRobotsTxt(site: SiteDefinition): string {
  const sitemapUrl = site.url
    ? `${site.url.replace(/\/+$/g, "")}/sitemap.xml`
    : null;

  let content = `User-agent: *
Allow: /`;

  if (sitemapUrl) {
    content += `\n\nSitemap: ${sitemapUrl}`;
  }

  return content;
}

export function generateSitemapXml(site: SiteDefinition): string {
  if (!site.url) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;
  }

  const baseUrl = site.url.replace(/\/+$/g, "");
  const orderedPosts = sortPosts(site.posts);
  const urls: string[] = [];

  for (const page of site.pages) {
    const canonical = canonicalUrl(site, page.path);
    if (canonical) {
      urls.push(`  <url>
    <loc>${escapeHtml(canonical)}</loc>
  </url>`);
    }
  }

  for (const post of orderedPosts) {
    const canonical = canonicalUrl(site, postPath(post));
    if (canonical) {
      urls.push(`  <url>
    <loc>${escapeHtml(canonical)}</loc>
    <lastmod>${escapeHtml(post.publishedAt)}</lastmod>
  </url>`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;
}
