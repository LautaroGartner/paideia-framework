import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createRuntimeConfig } from "../runtime/config.mjs";
import {
  validateRuntimeStartup,
  validateSchemaSql,
  validateSystemJson,
} from "../runtime/validate.mjs";

const config = createRuntimeConfig();
const result = validateRuntimeStartup(config);

let failed = false;

function checkReadableFile(label, filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`• ${label} not created yet`);
    return;
  }

  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    console.log(`✓ ${label} readable`);
  } catch {
    console.log(`✗ ${label} readable`);
    failed = true;
  }
}

console.log("[paideia] running doctor\n");

for (const check of result.checks) {
  if (fs.existsSync(check.path)) {
    console.log(`✓ ${check.label}`);
  } else {
    console.log(`✗ ${check.label}`);
    failed = true;
  }
}

const systemJson = validateSystemJson(config);

if (systemJson.ok) {
  console.log(`✓ ${systemJson.label}`);
} else {
  console.log(`✗ ${systemJson.label} (${systemJson.reason})`);
  failed = true;
}

const schemaSql = validateSchemaSql(config);

if (schemaSql.ok) {
  console.log(`✓ ${schemaSql.label}`);
} else {
  console.log(`✗ ${schemaSql.label} (${schemaSql.reason})`);
  failed = true;
}

const logsDir = path.join(
  config.rootDir,
  ".paideia",
  "logs"
);

checkReadableFile(
  ".paideia/logs/runtime.log",
  path.join(logsDir, "runtime.log")
);

checkReadableFile(
  ".paideia/logs/crash.log",
  path.join(logsDir, "crash.log")
);

console.log("");

if (failed) {
  console.log("[paideia] doctor found issues");
  process.exit(1);
}

console.log("[paideia] doctor passed");
