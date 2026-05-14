import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = process.cwd();
const PACKAGE_ROOT = path.dirname(
  path.dirname(fileURLToPath(import.meta.url))
);

function readPackageVersion() {
  const packagePath = path.join(PACKAGE_ROOT, "package.json");
  const raw = fs.readFileSync(packagePath, "utf8");
  const pkg = JSON.parse(raw);

  return pkg.version ?? "0.0.0";
}

export function createRuntimeConfig() {
  const port = Number(process.env.PAIDEIA_PORT ?? 3000);
  const distDir = path.join(ROOT, "dist");

  return {
    framework: "paideia",
    version: readPackageVersion(),
    runtime: "production",
    rootDir: ROOT,
    distDir,
    port,
    url: `http://localhost:${port}`,
  };
}
