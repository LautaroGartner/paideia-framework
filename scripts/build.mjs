import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  appRoot,
  assertPackageCheckoutProject,
  packageRoot,
} from "./project.mjs";

assertPackageCheckoutProject("build");

const TSC_BIN = path.join(
  packageRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsc.cmd" : "tsc"
);

const BUILD_ENTRY = path.join(
  packageRoot,
  "build",
  "index.js"
);

const TSCONFIG_PATH = path.join(
  packageRoot,
  "tsconfig.json"
);

function run(bin, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      stdio: "inherit",
      cwd: options.cwd,
      env: {
        ...process.env,
        ...options.env,
      },
    });

    child.on("error", reject);

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${bin} ${args.join(" ")} exited with code ${code ?? 1}`
        )
      );
    });
  });
}

try {
  if (fs.existsSync(TSC_BIN) && fs.existsSync(TSCONFIG_PATH)) {
    await run(TSC_BIN, [], {
      cwd: packageRoot,
    });
  }

  if (!fs.existsSync(BUILD_ENTRY)) {
    throw new Error(
      `build entry not found at ${BUILD_ENTRY}`
    );
  }

  await run(process.execPath, [BUILD_ENTRY], {
    cwd: appRoot,
    env: {
      NODE_ENV: "production",
      PAIDEIA_PACKAGE_ROOT: packageRoot,
    },
  });
} catch (error) {
  console.error(
    `[paideia] build failed: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
  process.exit(1);
}
