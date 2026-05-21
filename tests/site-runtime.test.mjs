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
assertFileExists("dist/llms.txt");
assertFileExists("dist/context.json");

const context = readJson("dist/context.json");

assert.equal(typeof context.site?.title, "string");
assert.ok(context.site.title.length > 0);
assert.equal(Array.isArray(context.pages), true);
assert.equal(Array.isArray(context.posts), true);

const postHtml = readText(
  "dist/building-paideia/index.html"
);
const homeHtml = readText("dist/index.html");
const aboutHtml = readText("dist/about/index.html");

assert.ok(postHtml.includes("Building Paideia"));
assert.ok(postHtml.includes("@lautyxgr"));
assert.ok(postHtml.includes("May 20, 2026"));
assert.ok(
  postHtml.includes("1d ago"),
  "post page should include a build-date relative label"
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
  homeHtml.includes('<a href="/about">About</a>'),
  "home page should link to the about page"
);
assert.ok(
  !aboutHtml.includes('<a href="/about">About</a>'),
  "about page should not link to itself in the nav"
);

const system = readJson("dist/system.json");

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

console.log("site runtime tests passed");
