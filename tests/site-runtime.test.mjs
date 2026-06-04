import assert from "node:assert/strict";
import fs from "node:fs";

function fileUrl(path) {
  return new URL(`../${path}`, import.meta.url);
}

function assertFileExists(path) {
  assert.equal(
    fs.existsSync(fileUrl(path)),
    true,
    `${path} should exist`
  );
}

function readText(path) {
  return fs.readFileSync(fileUrl(path), "utf8");
}

function readJson(path) {
  return JSON.parse(readText(path));
}

assertFileExists("dist/index.html");
assertFileExists("dist/about/index.html");
assertFileExists("dist/building-paideia/index.html");
assertFileExists(
  "dist/generated-systems-should-explain-themselves/index.html"
);
assertFileExists("dist/404.html");
assertFileExists("dist/favicon.svg");
assertFileExists("dist/social/building-paideia.png");
assertFileExists("dist/robots.txt");
assertFileExists("dist/sitemap.xml");
assertFileExists("dist/llms.txt");
assertFileExists("dist/context.json");

const context = readJson("dist/context.json");

assert.equal(typeof context.site?.title, "string");
assert.ok(context.site.title.length > 0);
assert.equal(Array.isArray(context.pages), true);
assert.equal(Array.isArray(context.posts), true);

for (const post of context.posts) {
  const imagePath = `dist/social/${post.slug}.png`;
  const html = readText(`dist/${post.slug}/index.html`);
  const absoluteImageUrl =
    `https://www.lautarogartner.com/social/${post.slug}.png`;

  assertFileExists(imagePath);
  assert.ok(
    html.includes(`<meta property="og:image" content="${absoluteImageUrl}">`),
    `${post.slug} should include an Open Graph social image`
  );
  assert.ok(
    html.includes(`<meta name="twitter:image" content="${absoluteImageUrl}">`),
    `${post.slug} should include a Twitter social image`
  );
  assert.ok(
    html.includes('<meta name="twitter:card" content="summary_large_image">'),
    `${post.slug} should use a large Twitter card`
  );
}

const postHtml = readText(
  "dist/building-paideia/index.html"
);
const homeHtml = readText("dist/index.html");
const aboutHtml = readText("dist/about/index.html");

assert.ok(postHtml.includes("Building Paideia"));
assert.ok(postHtml.includes("@lautyxgr"));
assert.ok(postHtml.includes("May 20, 2026"));
assert.ok(
  postHtml.includes('data-relative-date-label data-published-at="2026-05-20" hidden'),
  "post page should include a runtime relative-date label"
);
assert.ok(
  postHtml.includes("function updateRelativeDates()"),
  "post page should include the relative-date updater"
);
assert.equal(
  /\|\s+\d+d ago<\/div>/.test(postHtml),
  false,
  "post page should not bake stale relative dates into static HTML"
);
assert.ok(
  postHtml.includes('/_vercel/insights/script.js'),
  "post page should include the Vercel Web Analytics script"
);
assert.ok(
  postHtml.includes('/_vercel/speed-insights/script.js'),
  "post page should include the Vercel Speed Insights script"
);
assert.ok(
  homeHtml.includes('<meta property="og:type" content="website">'),
  "home page should include Open Graph website metadata"
);
assert.ok(
  homeHtml.includes('<meta name="twitter:card" content="summary">'),
  "home page should include Twitter card metadata"
);
assert.ok(
  homeHtml.includes('<script type="application/ld+json">'),
  "home page should include structured data"
);
assert.ok(
  postHtml.includes('<meta property="og:type" content="article">'),
  "post page should include Open Graph article metadata"
);
assert.ok(
  postHtml.includes('<meta property="og:image" content="https://www.lautarogartner.com/social/building-paideia.png">'),
  "post page should include a social preview image"
);
assert.ok(
  postHtml.includes('<meta name="twitter:card" content="summary_large_image">'),
  "post page should use a large Twitter card when an image is available"
);
assert.ok(
  postHtml.includes('<meta property="article:published_time" content="2026-05-20">'),
  "post page should include published time metadata"
);
assert.ok(
  postHtml.includes('"@type":"BlogPosting"'),
  "post page should include BlogPosting structured data"
);
assert.ok(
  homeHtml.includes('<a href="/about">About</a>'),
  "home page should link to the about page"
);
assert.ok(
  !aboutHtml.includes('<a href="/about">About</a>'),
  "about page should not link to itself in the nav"
);

const system = readJson("dist/system.json");
const runtime = readJson("dist/runtime.json");
const robots = readText("dist/robots.txt");
const sitemap = readText("dist/sitemap.xml");

assert.equal(
  typeof system.site,
  "object",
  "system.json.site should exist"
);
assert.equal(
  Array.isArray(system.site?.posts),
  true,
  "system.json.site.posts should exist"
);

assert.ok(
  system.runtime?.generatedArtifacts?.includes("robots.txt"),
  "system.json should list robots.txt as a generated artifact"
);
assert.ok(
  system.runtime?.generatedArtifacts?.includes("sitemap.xml"),
  "system.json should list sitemap.xml as a generated artifact"
);
assert.ok(
  runtime.artifacts.some((artifact) => artifact.path === "robots.txt"),
  "runtime.json should include robots.txt in the artifact inventory"
);
assert.ok(
  runtime.artifacts.some((artifact) => artifact.path === "sitemap.xml"),
  "runtime.json should include sitemap.xml in the artifact inventory"
);
assert.ok(
  robots.includes("Sitemap:"),
  "robots.txt should advertise the sitemap"
);
assert.ok(
  sitemap.includes("<urlset"),
  "sitemap.xml should include a urlset"
);

console.log("site runtime tests passed");
