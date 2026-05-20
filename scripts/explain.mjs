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

const manifest = result.manifest;
const framework = manifest.framework ?? {};
const resource = manifest.resource ?? {};
const runtime = manifest.runtime ?? {};
const fields = resource.fields ?? [];
const actions = resource.actions ?? [];
const permissions = resource.permissions ?? {};
const capabilities = manifest.capabilities ?? [];

console.log(`# ${resource.name ?? "Generated System"}`);
console.log("");
console.log("## Framework");
console.log("");
console.log(`- Name: ${framework.name ?? "unknown"}`);
console.log(`- Version: ${framework.version ?? "unknown"}`);
console.log(`- Mode: ${framework.mode ?? "unknown"}`);
console.log("");
console.log("## Resource");
console.log("");
console.log(`- Name: ${resource.name ?? "unknown"}`);
console.log(`- Slug: ${resource.slug ?? "unknown"}`);
console.log("");
console.log("## Fields");
console.log("");

if (fields.length === 0) {
  console.log("- No fields declared.");
} else {
  for (const field of fields) {
    console.log(
      `- ${field.name ?? "unknown"} (${field.type ?? "unknown"})`
    );
  }
}

console.log("");
console.log("## Permissions");
console.log("");

const permissionEntries = Object.entries(permissions);

if (permissionEntries.length === 0) {
  console.log("- No permissions declared.");
} else {
  for (const [action, level] of permissionEntries) {
    console.log(`- ${action}: ${level}`);
  }
}

console.log("");
console.log("## Actions");
console.log("");

if (actions.length === 0) {
  console.log("- No actions declared.");
} else {
  for (const action of actions) {
    console.log(`- ${action.label ?? action.name ?? "unknown"}`);
    console.log(`  - Type: ${action.type ?? "unknown"}`);
    console.log(
      `  - Permission: ${action.permission ?? "unknown"}`
    );
    console.log(
      `  - Effect: ${action.effect?.kind ?? "unknown"}`
    );
    console.log("  - Events:");
    console.log(
      `    - Success: ${action.events?.success ?? "unknown"}`
    );
    console.log(
      `    - Denied: ${action.events?.denied ?? "unknown"}`
    );
  }
}

console.log("");
console.log("## Runtime");
console.log("");
console.log(
  `- Persistence: ${runtime.persistence?.adapter ?? "unknown"}`
);
console.log(
  `- Storage strategy: ${
    runtime.persistence?.strategy ?? "unknown"
  }`
);

console.log("");
console.log("## Capabilities");
console.log("");

if (capabilities.length === 0) {
  console.log("- No capabilities declared.");
} else {
  for (const capability of capabilities) {
    if (typeof capability === "string") {
      console.log(`- ${capability}`);
      continue;
    }

    const name = capability?.name ?? "unknown";
    const source = capability?.source;
    console.log(source ? `- ${name} (${source})` : `- ${name}`);
  }
}
