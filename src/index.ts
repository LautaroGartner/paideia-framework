import {
  mkdirSync,
  rmSync,
  writeFileSync,
} from "fs";
import path from "node:path";

import { validateWritingPosts } from "../runtime/validate-writing.mjs";
import { site } from "./site.js";
import {
  generateContextJson,
  generateLlmsText,
  generateNotFoundPage,
  generatePostPage,
  generateSiteManifest,
  generateSitePage,
  getPostOutputPath,
  getSiteOutputPath,
} from "./site-build.js";

const writingValidation = validateWritingPosts(site.posts);

for (const item of writingValidation.diagnostics) {
  const prefix = item.severity === "warning" ? "warning" : "error";
  console.log(`[paideia] ${prefix}: ${item.code} at ${item.path}`);
  console.log(`[paideia] ${item.message}`);
}

if (!writingValidation.ok) {
  throw new Error("Writing validation failed.");
}

rmSync("dist", {
  force: true,
  recursive: true,
});

mkdirSync("dist", { recursive: true });

for (const page of site.pages) {
  const outputPath = path.join(
    "dist",
    getSiteOutputPath(page)
  );

  mkdirSync(path.dirname(outputPath), {
    recursive: true,
  });

  writeFileSync(outputPath, generateSitePage(site, page));
  console.log(`Generated ${outputPath}`);
}

for (const post of site.posts) {
  const outputPath = path.join(
    "dist",
    getPostOutputPath(post)
  );

  mkdirSync(path.dirname(outputPath), {
    recursive: true,
  });

  writeFileSync(outputPath, generatePostPage(site, post));
  console.log(`Generated ${outputPath}`);
}

writeFileSync("dist/system.json", generateSiteManifest(site));
writeFileSync("dist/llms.txt", generateLlmsText(site));
writeFileSync("dist/context.json", generateContextJson(site));
writeFileSync("dist/404.html", generateNotFoundPage(site));

console.log("Generated dist/system.json");
console.log("Generated dist/llms.txt");
console.log("Generated dist/context.json");
console.log("Generated dist/404.html");
