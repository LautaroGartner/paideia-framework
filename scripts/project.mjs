import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const packageRoot = path.dirname(
  path.dirname(fileURLToPath(import.meta.url))
);

export const appRoot = process.cwd();

function realpathOrSelf(targetPath) {
  try {
    return fs.realpathSync(targetPath);
  } catch {
    return targetPath;
  }
}

export function isPackageCheckoutProject(
  projectRoot = appRoot
) {
  return (
    realpathOrSelf(projectRoot) ===
    realpathOrSelf(packageRoot)
  );
}

export function assertPackageCheckoutProject(command) {
  if (isPackageCheckoutProject()) {
    return;
  }

  console.error("[paideia] no Paideia project found");
  console.error(
    `[paideia] \`paideia ${command}\` currently works inside a Paideia project checkout only`
  );
  console.error(
    "[paideia] run this command from the Paideia checkout for now"
  );
  console.error(
    "[paideia] external project scaffolding will be handled by `paideia new` later"
  );

  process.exit(1);
}
