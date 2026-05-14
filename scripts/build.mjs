import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();

const TSC_BIN = path.join(
  ROOT,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsc.cmd" : "tsc"
);

function run(bin, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      stdio: "inherit",
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
  await run(TSC_BIN, []);
  await run("node", [path.join(ROOT, "build", "index.js")], {
    env: {
      NODE_ENV: "production",
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
