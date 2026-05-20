import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT =
  process.env.PAIDEIA_PACKAGE_ROOT ??
  path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function readPackageVersion(): string | null {
  try {
    const packageJson = JSON.parse(
      readFileSync(
        path.join(PACKAGE_ROOT, "package.json"),
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
  readPackageVersion() ?? "1.7.0-rc.1";
