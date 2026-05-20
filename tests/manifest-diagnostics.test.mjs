import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { validateManifestContract } from "../runtime/validate-manifest.mjs";
import { validateSystemJson } from "../runtime/validate.mjs";

const requiredCapabilities = [
  "site.static",
  "runtime.identity",
  "manifest.validate",
  "manifest.normalize",
  "agent.context",
  "agent.guide",
];

function readFixture(name) {
  return JSON.parse(
    fs.readFileSync(
      new URL(
        `./fixtures/manifest-diagnostics/${name}`,
        import.meta.url
      ),
      "utf8"
    )
  );
}

function readContractFixture(name) {
  return JSON.parse(
    fs.readFileSync(
      new URL(`./fixtures/${name}`, import.meta.url),
      "utf8"
    )
  );
}

function validateSystemJsonFixture(manifest) {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "paideia-manifest-")
  );

  try {
    fs.writeFileSync(
      path.join(tempDir, "system.json"),
      JSON.stringify(manifest)
    );

    return validateSystemJson({
      distDir: tempDir,
    });
  } finally {
    fs.rmSync(tempDir, {
      recursive: true,
      force: true,
    });
  }
}

function assertDiagnostic(result, code, diagnosticPath) {
  assert.equal(result.ok, false);
  assert.ok(
    result.diagnostics.some(
      (item) =>
        item.code === code &&
        item.path === diagnosticPath
    ),
    `expected ${code} at ${diagnosticPath}`
  );
}

const cases = [
  [
    "missing-framework.json",
    "MISSING_FRAMEWORK_CONTRACT",
    "framework",
  ],
  [
    "invalid-framework-mode.json",
    "INVALID_FRAMEWORK_MODE",
    "framework.mode",
  ],
  [
    "invalid-resource-fields.json",
    "INVALID_RESOURCE_FIELDS",
    "resource.fields",
  ],
  [
    "missing-field-type.json",
    "INVALID_RESOURCE_FIELD_TYPE",
    "resource.fields.title.type",
  ],
  [
    "invalid-action-type.json",
    "INVALID_ACTION_TYPE",
    "resource.actions.badAction.type",
  ],
];

for (const [fixture, code, diagnosticPath] of cases) {
  const result = validateManifestContract(readFixture(fixture));
  assertDiagnostic(result, code, diagnosticPath);
}

const systemResult = validateSystemJsonFixture(
  readFixture("invalid-action-type.json")
);

assertDiagnostic(
  systemResult,
  "INVALID_ACTION_TYPE",
  "resource.actions.badAction.type"
);

const duplicateCapabilities = validateSystemJsonFixture({
  ...readContractFixture("manifest-valid.json"),
  capabilities: [
    ...requiredCapabilities,
    "runtime.identity",
  ],
});

assert.equal(duplicateCapabilities.ok, false);
assert.equal(
  duplicateCapabilities.reason,
  "system.json capabilities must not contain duplicates"
);

const missingCapabilities = validateSystemJsonFixture({
  ...readContractFixture("manifest-valid.json"),
  capabilities: requiredCapabilities.filter(
    (capability) => capability !== "agent.guide"
  ),
});

assert.equal(missingCapabilities.ok, false);
assert.equal(
  missingCapabilities.reason,
  "system.json capabilities missing agent.guide"
);

console.log("manifest diagnostic tests passed");
