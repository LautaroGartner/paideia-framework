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

function readRuntimeMode() {
  const mode = process.env.PAIDEIA_MODE ?? "production";

  if (mode !== "development" && mode !== "production") {
    return "production";
  }

  return mode;
}

export function createRuntimeConfig() {
  const mode = readRuntimeMode();
  const port = Number(process.env.PAIDEIA_PORT ?? 3000);
  const distDir = path.join(ROOT, "dist");

  return {
    framework: "paideia",
    version: readPackageVersion(),
    mode,
    runtime: mode,
    rootDir: ROOT,
    packageRoot: PACKAGE_ROOT,
    distDir,
    port,
    url: `http://localhost:${port}`,
  };
}
