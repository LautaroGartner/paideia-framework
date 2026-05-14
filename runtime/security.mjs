import path from "node:path";

export function sendSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
}

export function isMethodAllowed(method) {
  return method === "GET" || method === "HEAD";
}

export function resolveRequestPath(reqUrl, { port, distDir }) {
  const url = new URL(reqUrl ?? "/", `http://localhost:${port}`);
  const pathname = decodeURIComponent(url.pathname);

  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(distDir, safePath);

  const resolved = path.resolve(filePath);
  const resolvedDist = path.resolve(distDir);

  if (!resolved.startsWith(resolvedDist)) {
    return null;
  }

  return resolved;
}
