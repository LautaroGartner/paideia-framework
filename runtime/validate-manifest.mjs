function isObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function fail(message, details = {}) {
  return {
    ok: false,
    error: {
      code: "INVALID_MANIFEST_CONTRACT",
      message,
      details,
    },
  };
}

function pass() {
  return { ok: true };
}

export function validateManifestContract(manifest) {
  if (!isObject(manifest)) {
    return fail("Manifest must be a JSON object.");
  }

  if (!isObject(manifest.framework)) {
    return fail("Manifest must include framework metadata.", {
      path: "framework",
    });
  }

  if (manifest.framework.name !== "Paideia Framework") {
    return fail("Manifest framework.name is invalid.", {
      path: "framework.name",
      expected: "Paideia Framework",
      received: manifest.framework.name,
    });
  }

  if (
    typeof manifest.framework.version !== "string" ||
    manifest.framework.version.length === 0
  ) {
    return fail(
      "Manifest framework.version must be a non-empty string.",
      {
        path: "framework.version",
      }
    );
  }

  if (
    !["development", "production"].includes(
      manifest.framework.mode
    )
  ) {
    return fail(
      "Manifest framework.mode must be development or production.",
      {
        path: "framework.mode",
        received: manifest.framework.mode,
      }
    );
  }

  if (!isObject(manifest.resource)) {
    return fail("Manifest must include a resource contract.", {
      path: "resource",
    });
  }

  if (
    typeof manifest.resource.name !== "string" ||
    manifest.resource.name.length === 0
  ) {
    return fail(
      "Manifest resource.name must be a non-empty string.",
      {
        path: "resource.name",
      }
    );
  }

  if (
    typeof manifest.resource.slug !== "string" ||
    manifest.resource.slug.length === 0
  ) {
    return fail(
      "Manifest resource.slug must be a non-empty string.",
      {
        path: "resource.slug",
      }
    );
  }

  const fields = manifest.resource.fields;

  if (!Array.isArray(fields) && !isObject(fields)) {
    return fail(
      "Manifest resource.fields must be an array or object.",
      {
        path: "resource.fields",
      }
    );
  }

  const normalizedFields = Array.isArray(fields)
    ? fields
    : Object.entries(fields).map(([name, field]) => ({
        name,
        ...field,
      }));

  for (const field of normalizedFields) {
    if (!isObject(field)) {
      return fail("Every manifest field must be an object.", {
        path: "resource.fields",
      });
    }

    if (
      typeof field.name !== "string" ||
      field.name.length === 0
    ) {
      return fail(
        "Every manifest field must include a non-empty name.",
        {
          path: "resource.fields[].name",
        }
      );
    }

    if (
      typeof field.type !== "string" ||
      field.type.length === 0
    ) {
      return fail(
        "Every manifest field must include a non-empty type.",
        {
          path: `resource.fields.${field.name}.type`,
        }
      );
    }
  }

  if (!isObject(manifest.runtime)) {
    return fail("Manifest must include runtime metadata.", {
      path: "runtime",
    });
  }

  if (!isObject(manifest.runtime.persistence)) {
    return fail(
      "Manifest must include runtime persistence metadata.",
      {
        path: "runtime.persistence",
      }
    );
  }

  if (
    typeof manifest.runtime.persistence.adapter !== "string"
  ) {
    return fail(
      "Manifest runtime.persistence.adapter must be a string.",
      {
        path: "runtime.persistence.adapter",
      }
    );
  }

  if (!isObject(manifest.runtime.generatedInterface)) {
    return fail(
      "Manifest must include generated interface metadata.",
      {
        path: "runtime.generatedInterface",
      }
    );
  }

  const actions = manifest.resource.actions ?? [];

  if (!Array.isArray(actions)) {
    return fail(
      "Manifest resource.actions must be an array when present.",
      {
        path: "resource.actions",
      }
    );
  }

  for (const action of actions) {
    if (!isObject(action)) {
      return fail(
        "Every action contract must be an object.",
        {
          path: "resource.actions[]",
        }
      );
    }

    if (
      typeof action.name !== "string" ||
      action.name.length === 0
    ) {
      return fail(
        "Every action contract must include a non-empty name.",
        {
          path: "resource.actions[].name",
        }
      );
    }

    if (
      typeof action.label !== "string" ||
      action.label.length === 0
    ) {
      return fail(
        "Every action contract must include a non-empty label.",
        {
          path: `resource.actions.${action.name}.label`,
        }
      );
    }

    if (!["update", "ai"].includes(action.type)) {
      return fail(
        "Action contract type must be update or ai.",
        {
          path: `resource.actions.${action.name}.type`,
          received: action.type,
        }
      );
    }
  }

  return pass();
}
