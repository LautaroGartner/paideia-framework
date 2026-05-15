import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createRuntimeConfig } from "../runtime/config.mjs";
import {
  validateActionContracts,
  validateActionEventContracts,
  validateRuntimeStartup,
  validateSchemaSql,
  validateSystemJson,
} from "../runtime/validate.mjs";

const config = createRuntimeConfig();
const result = validateRuntimeStartup(config);

let failed = false;
let passed = 0;
let failedCount = 0;
let skipped = 0;

function printFix(message) {
  console.log(`  → ${message}`);
}

function pass(label) {
  console.log(`✓ ${label}`);
  passed += 1;
}

function fail(label, fix) {
  console.log(`✗ ${label}`);

  if (fix) {
    printFix(fix);
  }

  failed = true;
  failedCount += 1;
}

function skip(label) {
  console.log(`• ${label}`);
  skipped += 1;
}

function checkReadableFile(label, filePath) {
  if (!fs.existsSync(filePath)) {
    skip(`${label} not created yet`);
    return;
  }

  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    pass(`${label} readable`);
  } catch {
    fail(
      `${label} readable`,
      "check `.paideia/` file permissions"
    );
  }
}

console.log("[paideia] running doctor\n");

for (const check of result.checks) {
  if (fs.existsSync(check.path)) {
    pass(check.label);
  } else {
    fail(check.label, "run `paideia build`");
  }
}

const systemJson = validateSystemJson(config);

if (systemJson.ok) {
  pass(systemJson.label);
} else {
  fail(
    `${systemJson.label} (${systemJson.reason})`,
    "run `paideia build` to regenerate dist/system.json"
  );
}

const actionContracts = validateActionContracts(config);

if (actionContracts.ok) {
  pass(actionContracts.label);
} else {
  fail(
    `${actionContracts.label} (${actionContracts.reason})`,
    "run `paideia build` to regenerate dist/system.json"
  );
}

const actionEventContracts = validateActionEventContracts(config);

if (actionEventContracts.ok) {
  pass(actionEventContracts.label);
} else {
  fail(
    `${actionEventContracts.label} (${actionEventContracts.reason})`,
    "run `paideia build` to regenerate dist/system.json"
  );
}

const schemaSql = validateSchemaSql(config);

if (schemaSql.ok) {
  pass(schemaSql.label);
} else {
  fail(
    `${schemaSql.label} (${schemaSql.reason})`,
    "run `paideia build` to regenerate dist/schema.sql"
  );
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
console.log("[paideia] doctor summary");
console.log(`✓ passed: ${passed}`);
console.log(`✗ failed: ${failedCount}`);
console.log(`• skipped: ${skipped}`);
console.log("");

if (failed) {
  console.log("[paideia] doctor found issues");
  process.exit(1);
}

console.log("[paideia] doctor passed");
