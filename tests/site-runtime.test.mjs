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
assertFileExists("dist/writing/index.html");
assertFileExists("dist/writing/building-paideia/index.html");
assertFileExists("dist/404.html");
assertFileExists("dist/llms.txt");
assertFileExists("dist/context.json");

const context = readJson("dist/context.json");

assert.equal(typeof context.site?.title, "string");
assert.ok(context.site.title.length > 0);
assert.equal(Array.isArray(context.pages), true);
assert.equal(Array.isArray(context.posts), true);

const postHtml = readText(
  "dist/writing/building-paideia/index.html"
);

assert.ok(postHtml.includes("Building Paideia"));

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
