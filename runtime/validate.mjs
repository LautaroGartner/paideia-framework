import fs from "node:fs";
import path from "node:path";

import { normalizeManifestContract } from "./normalize-manifest.mjs";
import { validateManifestContract } from "./validate-manifest.mjs";

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
    let parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false,
        label: "dist/system.json valid",
        reason: "expected object",
      };
    }

    const contract =
      validateManifestContract(parsed);

    if (!contract.ok) {
      const [firstDiagnostic] =
        contract.diagnostics;

      return {
        ok: false,
        label: "dist/system.json contract valid",
        reason:
          firstDiagnostic?.message ??
          "manifest contract invalid",
        diagnostics: contract.diagnostics,
      };
    }

    parsed = normalizeManifestContract(parsed);

    return {
      ok: true,
      label: "dist/system.json contract valid",
      manifest: parsed,
    };
  } catch (error) {
    return {
      ok: false,
      label: "dist/system.json valid",
      reason: error.message,
    };
  }
}

export function validateActionContracts(config) {
  const filePath = path.join(config.distDir, "system.json");

  if (!fs.existsSync(filePath)) {
    return {
      ok: false,
      label: "action contracts valid",
      reason: "dist/system.json missing",
    };
  }

  let manifest;

  try {
    manifest = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return {
      ok: false,
      label: "action contracts valid",
      reason: error.message,
    };
  }

  const actions = manifest?.resource?.actions ?? [];

  if (!Array.isArray(actions)) {
    return {
      ok: false,
      label: "action contracts valid",
      reason: "resource.actions must be an array",
    };
  }

  for (const action of actions) {
    const name = action?.name ?? "unknown";
    const required = ["name", "label", "type", "permission"];

    for (const key of required) {
      if (!action?.[key]) {
        return {
          ok: false,
          label: "action contracts valid",
          reason: `${name} missing ${key}`,
        };
      }
    }

    if (!action.effect || typeof action.effect !== "object") {
      return {
        ok: false,
        label: "action contracts valid",
        reason: `${name} missing effect`,
      };
    }

    if (!action.effect.kind) {
      return {
        ok: false,
        label: "action contracts valid",
        reason: `${name} missing effect.kind`,
      };
    }

    if (!action.events || typeof action.events !== "object") {
      return {
        ok: false,
        label: "action contracts valid",
        reason: `${name} missing events`,
      };
    }

    if (!action.events.success) {
      return {
        ok: false,
        label: "action contracts valid",
        reason: `${name} missing events.success`,
      };
    }

    if (!action.events.denied) {
      return {
        ok: false,
        label: "action contracts valid",
        reason: `${name} missing events.denied`,
      };
    }

    if (action.type === "update" && !action.effect.set) {
      return {
        ok: false,
        label: "action contracts valid",
        reason: `${name} update action missing effect.set`,
      };
    }

    if (
      action.type === "ai" &&
      !String(action.effect.kind).startsWith("ai.")
    ) {
      return {
        ok: false,
        label: "action contracts valid",
        reason: `${name} ai action must use ai.* effect`,
      };
    }
  }

  return {
    ok: true,
    label: "action contracts valid",
  };
}

export function validateActionEventContracts(config) {
  const filePath = path.join(config.distDir, "system.json");

  if (!fs.existsSync(filePath)) {
    return {
      ok: false,
      label: "action event contracts valid",
      reason: "dist/system.json missing",
    };
  }

  let manifest;

  try {
    manifest = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return {
      ok: false,
      label: "action event contracts valid",
      reason: error.message,
    };
  }

  const actions = manifest?.resource?.actions ?? [];

  if (!Array.isArray(actions)) {
    return {
      ok: false,
      label: "action event contracts valid",
      reason: "resource.actions must be an array",
    };
  }

  for (const action of actions) {
    const name = action?.name ?? "unknown";

    if (!action?.events || typeof action.events !== "object") {
      return {
        ok: false,
        label: "action event contracts valid",
        reason: `${name} missing events`,
      };
    }

    if (!action.events.success) {
      return {
        ok: false,
        label: "action event contracts valid",
        reason: `${name} missing events.success`,
      };
    }

    if (!action.events.denied) {
      return {
        ok: false,
        label: "action event contracts valid",
        reason: `${name} missing events.denied`,
      };
    }

    if (
      action.type === "update" &&
      action.events.success !== "action.executed"
    ) {
      return {
        ok: false,
        label: "action event contracts valid",
        reason: `${name} update action must use action.executed`,
      };
    }

    if (
      action.type === "ai" &&
      action.events.success !== "ai.executed"
    ) {
      return {
        ok: false,
        label: "action event contracts valid",
        reason: `${name} ai action must use ai.executed`,
      };
    }

    if (action.events.denied !== "permission.denied") {
      return {
        ok: false,
        label: "action event contracts valid",
        reason: `${name} denied event must use permission.denied`,
      };
    }
  }

  return {
    ok: true,
    label: "action event contracts valid",
  };
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
