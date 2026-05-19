import assert from "node:assert/strict";
import fs from "node:fs";

import { validateManifestContract } from "../runtime/validate-manifest.mjs";
import { normalizeManifestContract } from "../runtime/normalize-manifest.mjs";

function readFixture(name) {
  return JSON.parse(
    fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8")
  );
}

const validManifest = readFixture("manifest-valid.json");
const validResult = validateManifestContract(validManifest);

assert.equal(validResult.ok, true);
assert.deepEqual(validResult.diagnostics, []);

const normalized = normalizeManifestContract(validManifest);

assert.equal(Array.isArray(normalized.resource.fields), true);
assert.equal(normalized.resource.fields[0].required, false);
assert.equal(normalized.resource.fields[0].nullable, false);
assert.equal(normalized.resource.fields[0].default, null);

const invalidManifest = readFixture("manifest-invalid-multiple-errors.json");
const invalidResult = validateManifestContract(invalidManifest);

assert.equal(invalidResult.ok, false);
assert.ok(invalidResult.diagnostics.length >= 2);

console.log("manifest contract tests passed");
