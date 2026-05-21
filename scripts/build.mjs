import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  appRoot,
  isPackageCheckoutProject,
  isPaideiaProject,
  packageRoot,
} from "./project.mjs";

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

const APP_TSC_BIN = path.join(
  appRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsc.cmd" : "tsc"
);

const APP_TSCONFIG_PATH = path.join(
  appRoot,
  "tsconfig.json"
);

const APP_SITE_ENTRY = path.join(
  appRoot,
  "build",
  "site.js"
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
  const isPackageCheckout = isPackageCheckoutProject();

  if (!isPackageCheckout && !isPaideiaProject()) {
    console.error("[paideia] no Paideia project found");
    console.error(
      "[paideia] run `paideia init <name>` to create a Paideia project"
    );
    process.exit(1);
  }

  if (fs.existsSync(TSC_BIN) && fs.existsSync(TSCONFIG_PATH)) {
    await run(TSC_BIN, [], {
      cwd: packageRoot,
    });
  }

  if (!isPackageCheckout) {
    if (!fs.existsSync(APP_TSC_BIN)) {
      throw new Error(
        "TypeScript compiler not found. Run `npm install` and try again."
      );
    }

    if (!fs.existsSync(APP_TSCONFIG_PATH)) {
      throw new Error("tsconfig.json not found");
    }

    await run(APP_TSC_BIN, [], {
      cwd: appRoot,
    });

    if (!fs.existsSync(APP_SITE_ENTRY)) {
      throw new Error(
        `site entry not found at ${APP_SITE_ENTRY}`
      );
    }
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
      ...(!isPackageCheckout
        ? { PAIDEIA_SITE_ENTRY: APP_SITE_ENTRY }
        : {}),
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
