import process from "node:process";

import { createRuntimeConfig } from "../runtime/config.mjs";
import {
  crash,
  error,
  info,
  warn,
} from "../runtime/logger.mjs";
import { createRuntimeServer } from "../runtime/server.mjs";
import { validateRuntimeStartup } from "../runtime/validate.mjs";

const config = createRuntimeConfig();
let shuttingDown = false;

function assertRuntimeReady(config) {
  const result = validateRuntimeStartup(config);

  if (!result.ok) {
    for (const failure of result.failures) {
      error("startup validation failed", {
        check: failure.label,
      });
    }

    console.error("[paideia] error: runtime startup validation failed");
    console.error("[paideia] run `npm run build` and try again");
    process.exit(1);
  }
}

info("booting production runtime");
assertRuntimeReady(config);

const server = createRuntimeServer({
  config,
  logger: { warn },
});

server.listen(config.port, () => {
  info("serving dist/", {
    port: config.port,
    url: config.url,
  });
});

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  info(`${signal} received`, {
    signal,
  });

  info("shutting down runtime");

  server.close((shutdownError) => {
    if (shutdownError) {
      error("shutdown error", {
        error: shutdownError.message,
      });
      process.exit(1);
    }

    info("runtime stopped cleanly");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("uncaughtException", (uncaughtError) => {
  crash("uncaught exception", {
    name: uncaughtError.name,
    message: uncaughtError.message,
    stack: uncaughtError.stack,
  });

  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  crash("unhandled rejection", {
    reason: String(reason),
  });

  process.exit(1);
});
