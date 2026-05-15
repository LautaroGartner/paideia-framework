import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();

const manifestPath = path.join(ROOT, "dist", "system.json");

if (!fs.existsSync(manifestPath)) {
  console.error("[paideia] manifest not found");
  console.error("[paideia] run `paideia build` first");

  process.exit(1);
}

const manifest = fs.readFileSync(manifestPath, "utf8");

console.log(manifest);
