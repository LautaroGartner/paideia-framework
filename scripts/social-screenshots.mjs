#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = path.dirname(
  path.dirname(new URL(import.meta.url).pathname)
);
const distRoot = path.join(repoRoot, "dist");
const contextPath = path.join(distRoot, "context.json");
const socialRoot = path.join(repoRoot, "assets", "social");
const chromePath =
  process.env.CHROME_BIN ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

if (!fs.existsSync(contextPath)) {
  throw new Error("dist/context.json not found. Run npm run build first.");
}

if (!fs.existsSync(chromePath)) {
  throw new Error(
    `Chrome not found at ${chromePath}. Set CHROME_BIN to another browser path.`
  );
}

fs.mkdirSync(socialRoot, {
  recursive: true,
});

const chromeProfileRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "paideia-social-chrome-")
);

const context = JSON.parse(fs.readFileSync(contextPath, "utf8"));
const posts = Array.isArray(context.posts) ? context.posts : [];

for (const post of posts) {
  if (typeof post.slug !== "string") {
    continue;
  }

  const htmlPath = path.join(distRoot, post.slug, "index.html");

  if (!fs.existsSync(htmlPath)) {
    continue;
  }

  const outputPath = path.join(socialRoot, `${post.slug}.png`);
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
      `--screenshot=${outputPath}`,
      pathToFileURL(htmlPath).href,
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

  console.log(`[paideia] social screenshot: ${outputPath}`);
}
