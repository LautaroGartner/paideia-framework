import http from "node:http";
import fs from "node:fs";

import { isHealthRequest, sendHealthResponse } from "./health.mjs";
import { getContentType } from "./mime.mjs";
import {
  isMethodAllowed,
  resolveRequestPath,
  sendSecurityHeaders,
} from "./security.mjs";

export function createRuntimeServer({ config, logger }) {
  return http.createServer((req, res) => {
    sendSecurityHeaders(res);

    if (isHealthRequest(req.url)) {
      sendHealthResponse(res, config);
      return;
    }

    if (!isMethodAllowed(req.method)) {
      logger.warn("method rejected", {
        method: req.method,
        path: req.url,
      });

      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Method Not Allowed");
      return;
    }

    const filePath = resolveRequestPath(req.url, {
      port: config.port,
      distDir: config.distDir,
    });

    if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      logger.warn("404 request", {
        path: req.url,
      });

      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": getContentType(filePath),
    });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    fs.createReadStream(filePath).pipe(res);
  });
}
