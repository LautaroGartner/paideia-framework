import {
  mkdirSync,
  rmSync,
  writeFileSync,
} from "fs";
import path from "node:path";

import { site } from "./site.js";
import {
  generateContextJson,
  generateLlmsText,
  generateSiteManifest,
  generateSitePage,
  getSiteOutputPath,
} from "./site-build.js";

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

writeFileSync("dist/system.json", generateSiteManifest(site));
writeFileSync("dist/llms.txt", generateLlmsText(site));
writeFileSync("dist/context.json", generateContextJson(site));

console.log("Generated dist/system.json");
console.log("Generated dist/llms.txt");
console.log("Generated dist/context.json");
