export function isHealthRequest(reqUrl) {
  const url = new URL(reqUrl ?? "/", "http://localhost");
  return url.pathname === "/__paideia/health";
}

export function sendHealthResponse(res, config, { head = false } = {}) {
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
  });

  if (head) {
    res.end();
    return;
  }

  res.end(
    JSON.stringify(
      {
        status: "ok",
        framework: config.framework,
        version: config.version,
        runtime: config.runtime,
        dist: "ready",
      },
      null,
      2
    )
  );
}
