import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createRuntimeConfig } from "../runtime/config.mjs";
import {
  validateRuntimeJson,
  validateSystemJson,
} from "../runtime/validate.mjs";

const config = createRuntimeConfig();
const runtimePath = path.join(config.distDir, "runtime.json");

if (!fs.existsSync(runtimePath)) {
  console.error("[paideia] runtime identity not found");
  console.error("[paideia] run `paideia build` first");
  process.exit(1);
}

const runtimeResult = validateRuntimeJson(config);

if (!runtimeResult.ok) {
  console.error(
    `[paideia] ${runtimeResult.label} (${runtimeResult.reason})`
  );
  process.exit(1);
}

const manifestResult = validateSystemJson(config);
const runtime = runtimeResult.runtime;

console.log(`Framework: ${runtime.framework?.name ?? "unknown"}`);
console.log(`Version: ${runtime.framework?.version ?? "unknown"}`);
console.log(`Build ID: ${runtime.build?.id ?? "unknown"}`);
console.log(`Pages: ${runtime.site?.pages ?? 0}`);
console.log(`Posts: ${runtime.site?.posts ?? 0}`);
console.log(`Artifacts: ${runtime.build?.artifactCount ?? 0}`);
console.log(
  `Manifest: ${
    runtime.runtime?.normalizedManifest ? "normalized" : "raw"
  }`
);
console.log(
  `Diagnostics: ${manifestResult.ok ? "passing" : "failing"}`
);
