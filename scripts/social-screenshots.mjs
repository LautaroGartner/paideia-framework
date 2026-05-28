#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = path.dirname(
  path.dirname(new URL(import.meta.url).pathname)
);
const appRoot = process.env.PAIDEIA_APP_ROOT
  ? path.resolve(process.env.PAIDEIA_APP_ROOT)
  : repoRoot;
const distRoot = path.join(appRoot, "dist");
const contextPath = path.join(distRoot, "context.json");
const socialRoot = path.join(appRoot, "assets", "social");
const chromePath =
  process.env.CHROME_BIN ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const force = process.argv.includes("--force");

if (!fs.existsSync(contextPath)) {
  throw new Error("dist/context.json not found. Run npm run build first.");
}

fs.mkdirSync(socialRoot, {
  recursive: true,
});

const context = JSON.parse(fs.readFileSync(contextPath, "utf8"));
const posts = Array.isArray(context.posts) ? context.posts : [];
const captures = posts
  .filter((post) => typeof post.slug === "string")
  .map((post) => ({
    htmlPath: path.join(distRoot, post.slug, "index.html"),
    outputPath: path.join(socialRoot, `${post.slug}.png`),
    slug: post.slug,
  }))
  .filter((post) => fs.existsSync(post.htmlPath))
  .filter((post) => force || !fs.existsSync(post.outputPath));

if (captures.length === 0) {
  console.log("[paideia] social screenshots: all article images present");
  process.exit(0);
}

if (!fs.existsSync(chromePath)) {
  throw new Error(
    `Chrome not found at ${chromePath}. Set CHROME_BIN to another browser path.`
  );
}

const chromeProfileRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "paideia-social-chrome-")
);

for (const post of captures) {
  const result = spawnSync(
    chromePath,
    [
      "--headless=new",
      "--disable-background-networking",
      "--disable-crash-reporter",
      "--disable-gpu",
      "--hide-scrollbars",
      "--run-all-compositor-stages-before-draw",
      `--user-data-dir=${chromeProfileRoot}`,
      "--virtual-time-budget=1000",
      "--window-size=1200,630",
      `--screenshot=${post.outputPath}`,
      pathToFileURL(post.htmlPath).href,
    ],
    {
      encoding: "utf8",
      timeout: 12000,
    }
  );

  if (result.status !== 0) {
    throw new Error(
      `Failed to capture ${post.slug}\n${result.stdout}${result.stderr}`
    );
  }

  const stats = fs.statSync(post.outputPath);

  if (stats.size === 0) {
    throw new Error(`Failed to capture ${post.slug}: empty screenshot`);
  }

  console.log(`[paideia] social screenshot: ${post.outputPath}`);
}
