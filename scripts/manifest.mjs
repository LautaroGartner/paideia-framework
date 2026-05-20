import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createRuntimeConfig } from "../runtime/config.mjs";
import { validateSystemJson } from "../runtime/validate.mjs";

const ROOT = process.cwd();

const manifestPath = path.join(ROOT, "dist", "system.json");

if (!fs.existsSync(manifestPath)) {
  console.error("[paideia] manifest not found");
  console.error("[paideia] run `paideia build` first");

  process.exit(1);
}

const result = validateSystemJson(createRuntimeConfig());

if (!result.ok) {
  console.error(
    `[paideia] ${result.label} (${result.reason})`
  );

  for (const diagnostic of result.diagnostics ?? []) {
    console.error(
      `[paideia] ${diagnostic.code} at ${diagnostic.path}`
    );
    console.error(`[paideia] ${diagnostic.message}`);
  }

  process.exit(1);
}

console.log(JSON.stringify(result.manifest, null, 2));
