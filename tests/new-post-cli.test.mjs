import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(
  path.dirname(fileURLToPath(import.meta.url))
);

const testRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "paideia-new-post-")
);

const cliPath = path.join(repoRoot, "cli.mjs");

function run(args) {
  return spawnSync(
    process.execPath,
    [cliPath, ...args],
    {
      cwd: testRoot,
      encoding: "utf8",
    }
  );
}

try {
  const created = run(["new", "post", "My Test Post"]);

  assert.equal(
    created.status,
    0,
    `${created.stdout}${created.stderr}`
  );

  const postPath = path.join(
    testRoot,
    "src",
    "writing",
    "my-test-post.ts"
  );

  assert.equal(fs.existsSync(postPath), true);

  const generated = fs.readFileSync(postPath, "utf8");

  assert.ok(generated.includes('slug: "my-test-post"'));
  assert.ok(generated.includes('title: "My Test Post"'));

  const duplicate = run(["new", "post", "My Test Post"]);

  assert.notEqual(duplicate.status, 0);
  assert.ok(
    `${duplicate.stdout}${duplicate.stderr}`.includes("post already exists")
  );

  const missingTitle = run(["new", "post"]);

  assert.notEqual(missingTitle.status, 0);
  assert.ok(
    `${missingTitle.stdout}${missingTitle.stderr}`.includes(
      'usage: paideia new post "Post title"'
    )
  );
} finally {
  fs.rmSync(testRoot, {
    recursive: true,
    force: true,
  });
}

console.log("new post CLI tests passed");
