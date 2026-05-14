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
  let pathname = "/";

  try {
    const url = new URL(reqUrl ?? "/", `http://localhost:${port}`);
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }

  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(distDir, safePath);

  const resolved = path.resolve(filePath);
  const resolvedDist = path.resolve(distDir);
  const relativePath = path.relative(resolvedDist, resolved);

  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    return null;
  }

  return resolved;
}
