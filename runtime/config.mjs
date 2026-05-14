import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();

function readPackageVersion() {
  const packagePath = path.join(ROOT, "package.json");
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
