import fs from "node:fs";
import path from "node:path";

export function validateRuntimeStartup(config) {
  const checks = [
    {
      label: "dist/ exists",
      path: config.distDir,
    },
    {
      label: "dist/index.html exists",
      path: path.join(config.distDir, "index.html"),
    },
    {
      label: "dist/system.json exists",
      path: path.join(config.distDir, "system.json"),
    },
    {
      label: "dist/schema.sql exists",
      path: path.join(config.distDir, "schema.sql"),
    },
  ];

  const failures = checks.filter((check) => !fs.existsSync(check.path));

  return {
    ok: failures.length === 0,
    checks,
    failures,
  };
}

export function validateSystemJson(config) {
  const filePath = path.join(config.distDir, "system.json");

  if (!fs.existsSync(filePath)) {
    return {
      ok: false,
      label: "dist/system.json valid",
      reason: "missing",
    };
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false,
        label: "dist/system.json valid",
        reason: "expected object",
      };
    }

    return {
      ok: true,
      label: "dist/system.json valid",
    };
  } catch (error) {
    return {
      ok: false,
      label: "dist/system.json valid",
      reason: error.message,
    };
  }
}

export function validateSchemaSql(config) {
  const filePath = path.join(config.distDir, "schema.sql");

  if (!fs.existsSync(filePath)) {
    return {
      ok: false,
      label: "dist/schema.sql valid",
      reason: "missing",
    };
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8").trim();

    if (!raw) {
      return {
        ok: false,
        label: "dist/schema.sql valid",
        reason: "empty file",
      };
    }

    if (!raw.toUpperCase().includes("CREATE TABLE")) {
      return {
        ok: false,
        label: "dist/schema.sql valid",
        reason: "missing CREATE TABLE",
      };
    }

    return {
      ok: true,
      label: "dist/schema.sql valid",
    };
  } catch (error) {
    return {
      ok: false,
      label: "dist/schema.sql valid",
      reason: error.message,
    };
  }
}
