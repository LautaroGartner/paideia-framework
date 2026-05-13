import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

function readPackageVersion(): string | null {
  try {
    const packageJson = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "package.json"),
        "utf8"
      )
    );

    return typeof packageJson.version === "string"
      ? packageJson.version
      : null;
  } catch {
    return null;
  }
}

export const FRAMEWORK_VERSION =
  readPackageVersion() ?? "1.0.0-experimental";
