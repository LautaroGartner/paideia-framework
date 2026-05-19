import assert from "node:assert/strict";
import { validateWritingPosts } from "../runtime/validate-writing.mjs";

const valid = validateWritingPosts([
  {
    slug: "building-paideia",
    title: "Building Paideia",
    description: "Why I started building Paideia.",
    publishedAt: "2026-05-19",
    body: "Hello.",
    tokenSummary: "Introductory post about Paideia.",
  },
]);

assert.equal(valid.ok, true);
assert.deepEqual(valid.diagnostics, []);

const invalid = validateWritingPosts([
  {
    slug: "duplicate",
    title: "",
    description: "",
    publishedAt: "today",
    body: "",
    tokenSummary: "",
  },
  {
    slug: "duplicate",
    title: "Second",
    description: "Second.",
    publishedAt: "2026-05-19",
    body: "Body.",
    tokenSummary: "Summary.",
  },
]);

assert.equal(invalid.ok, false);
assert.ok(
  invalid.diagnostics.some((item) => item.code === "DUPLICATE_POST_SLUG")
);
assert.ok(
  invalid.diagnostics.some((item) => item.code === "MISSING_POST_TITLE")
);
assert.ok(
  invalid.diagnostics.some((item) => item.code === "INVALID_POST_DATE")
);

console.log("writing validation tests passed");
