import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();

const schemaPath = path.join(ROOT, "dist", "schema.sql");

if (!fs.existsSync(schemaPath)) {
  console.error("[paideia] schema not found");
  console.error("[paideia] run `paideia build` first");

  process.exit(1);
}

const schema = fs.readFileSync(schemaPath, "utf8");

console.log(schema);
