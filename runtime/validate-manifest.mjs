function isObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function diagnostic(
  code,
  path,
  message,
  details = {}
) {
  return {
    code,
    severity: details.severity ?? "error",
    path,
    message,
    ...details,
  };
}

function result(diagnostics) {
  return {
    ok: !diagnostics.some(
      (item) => item.severity === "error"
    ),
    diagnostics,
  };
}

function isNonEmptyString(value) {
  return (
    typeof value === "string" &&
    value.length > 0
  );
}

function normalizeFields(fields) {
  if (Array.isArray(fields)) {
    return fields.map((field, index) => ({
      field,
      path: `resource.fields[${index}]`,
    }));
  }

  if (!isObject(fields)) {
    return [];
  }

  return Object.entries(fields).map(
    ([name, field]) => ({
      field: isObject(field)
        ? { name, ...field }
        : field,
      path: `resource.fields.${name}`,
    })
  );
}

function validateSiteContract(site, diagnostics) {
  if (!isObject(site)) {
    diagnostics.push(
      diagnostic(
        "MISSING_SITE_CONTRACT",
        "site",
        "Manifest must include a site contract.",
        {
          received: site,
        }
      )
    );
    return;
  }

  if (!isNonEmptyString(site.title)) {
    diagnostics.push(
      diagnostic(
        "INVALID_SITE_TITLE",
        "site.title",
        "site.title must be a non-empty string.",
        {
          received: site.title,
        }
      )
    );
  }

  if (!isNonEmptyString(site.description)) {
    diagnostics.push(
      diagnostic(
        "INVALID_SITE_DESCRIPTION",
        "site.description",
        "site.description must be a non-empty string.",
        {
          received: site.description,
        }
      )
    );
  }

  if (!Array.isArray(site.pages)) {
    diagnostics.push(
      diagnostic(
        "INVALID_SITE_PAGES",
        "site.pages",
        "site.pages must be an array.",
        {
          received: site.pages,
        }
      )
    );
    return;
  }

  site.pages.forEach((page, index) => {
    const pagePath = `site.pages[${index}]`;

    if (!isObject(page)) {
      diagnostics.push(
        diagnostic(
          "INVALID_SITE_PAGE",
          pagePath,
          "Every site page must be an object.",
          {
            received: page,
          }
        )
      );
      return;
    }

    for (const key of ["path", "title", "output"]) {
      if (!isNonEmptyString(page[key])) {
        diagnostics.push(
          diagnostic(
            "INVALID_SITE_PAGE_FIELD",
            `${pagePath}.${key}`,
            `Every site page must include a non-empty ${key}.`,
            {
              received: page[key],
            }
          )
        );
      }
    }
  });

  if (
    site.posts !== undefined &&
    !Array.isArray(site.posts)
  ) {
    diagnostics.push(
      diagnostic(
        "INVALID_SITE_POSTS",
        "site.posts",
        "site.posts must be an array when present.",
        {
          received: site.posts,
        }
      )
    );
    return;
  }

  (site.posts ?? []).forEach((post, index) => {
    const postPath = `site.posts[${index}]`;

    if (!isObject(post)) {
      diagnostics.push(
        diagnostic(
          "INVALID_SITE_POST",
          postPath,
          "Every site post must be an object.",
          {
            received: post,
          }
        )
      );
      return;
    }

    for (const key of [
      "slug",
      "path",
      "title",
      "description",
      "publishedAt",
      "tokenSummary",
      "output",
    ]) {
      if (!isNonEmptyString(post[key])) {
        diagnostics.push(
          diagnostic(
            "INVALID_SITE_POST_FIELD",
            `${postPath}.${key}`,
            `Every site post must include a non-empty ${key}.`,
            {
              received: post[key],
            }
          )
        );
      }
    }
  });
}

export function validateManifestContract(manifest) {
  const diagnostics = [];

  if (!isObject(manifest)) {
    diagnostics.push(
      diagnostic(
        "INVALID_MANIFEST_ROOT",
        "$",
        "Manifest must be a JSON object.",
        {
          received: Array.isArray(manifest)
            ? "array"
            : typeof manifest,
        }
      )
    );

    return result(diagnostics);
  }

  if (!isObject(manifest.framework)) {
    diagnostics.push(
      diagnostic(
        "MISSING_FRAMEWORK_CONTRACT",
        "framework",
        "Manifest must include framework metadata.",
        {
          received: manifest.framework,
        }
      )
    );
  } else {
    if (
      manifest.framework.name !== "Paideia Framework"
    ) {
      diagnostics.push(
        diagnostic(
          "INVALID_FRAMEWORK_NAME",
          "framework.name",
          "framework.name must be Paideia Framework.",
          {
            expected: "Paideia Framework",
            received: manifest.framework.name,
          }
        )
      );
    }

    if (
      !isNonEmptyString(
        manifest.framework.version
      )
    ) {
      diagnostics.push(
        diagnostic(
          "INVALID_FRAMEWORK_VERSION",
          "framework.version",
          "framework.version must be a non-empty string.",
          {
            received:
              manifest.framework.version,
          }
        )
      );
    }

    if (
      !["development", "production"].includes(
        manifest.framework.mode
      )
    ) {
      diagnostics.push(
        diagnostic(
          "INVALID_FRAMEWORK_MODE",
          "framework.mode",
          "framework.mode must be development or production.",
          {
            expected: [
              "development",
              "production",
            ],
            received:
              manifest.framework.mode,
          }
        )
      );
    }
  }

  const hasSiteContract = isObject(manifest.site);

  if (hasSiteContract) {
    validateSiteContract(
      manifest.site,
      diagnostics
    );
  } else if (!isObject(manifest.resource)) {
    diagnostics.push(
      diagnostic(
        "MISSING_RESOURCE_CONTRACT",
        "resource",
        "Manifest must include a resource contract.",
        {
          received: manifest.resource,
        }
      )
    );
  } else {
    if (
      !isNonEmptyString(manifest.resource.name)
    ) {
      diagnostics.push(
        diagnostic(
          "INVALID_RESOURCE_NAME",
          "resource.name",
          "resource.name must be a non-empty string.",
          {
            received: manifest.resource.name,
          }
        )
      );
    }

    if (
      !isNonEmptyString(manifest.resource.slug)
    ) {
      diagnostics.push(
        diagnostic(
          "INVALID_RESOURCE_SLUG",
          "resource.slug",
          "resource.slug must be a non-empty string.",
          {
            received: manifest.resource.slug,
          }
        )
      );
    }

    const fields = manifest.resource.fields;

    if (
      !Array.isArray(fields) &&
      !isObject(fields)
    ) {
      diagnostics.push(
        diagnostic(
          "INVALID_RESOURCE_FIELDS",
          "resource.fields",
          "resource.fields must be an array or object.",
          {
            received: fields,
          }
        )
      );
    } else {
      for (const {
        field,
        path,
      } of normalizeFields(fields)) {
        if (!isObject(field)) {
          diagnostics.push(
            diagnostic(
              "INVALID_RESOURCE_FIELD",
              path,
              "Every manifest field must be an object.",
              {
                received: field,
              }
            )
          );

          continue;
        }

        if (!isNonEmptyString(field.name)) {
          diagnostics.push(
            diagnostic(
              "INVALID_RESOURCE_FIELD_NAME",
              `${path}.name`,
              "Every manifest field must include a non-empty name.",
              {
                received: field.name,
              }
            )
          );
        }

        if (!isNonEmptyString(field.type)) {
          diagnostics.push(
            diagnostic(
              "INVALID_RESOURCE_FIELD_TYPE",
              isNonEmptyString(field.name)
                ? `resource.fields.${field.name}.type`
                : `${path}.type`,
              "Every manifest field must include a non-empty type.",
              {
                received: field.type,
              }
            )
          );
        }
      }
    }

    const actions =
      manifest.resource.actions ?? [];

    if (!Array.isArray(actions)) {
      diagnostics.push(
        diagnostic(
          "INVALID_RESOURCE_ACTIONS",
          "resource.actions",
          "resource.actions must be an array when present.",
          {
            received: actions,
          }
        )
      );
    } else {
      actions.forEach((action, index) => {
        const actionPath =
          isObject(action) &&
          isNonEmptyString(action.name)
            ? `resource.actions.${action.name}`
            : `resource.actions[${index}]`;

        if (!isObject(action)) {
          diagnostics.push(
            diagnostic(
              "INVALID_ACTION_CONTRACT",
              actionPath,
              "Every action contract must be an object.",
              {
                received: action,
              }
            )
          );

          return;
        }

        if (!isNonEmptyString(action.name)) {
          diagnostics.push(
            diagnostic(
              "INVALID_ACTION_NAME",
              `${actionPath}.name`,
              "Every action contract must include a non-empty name.",
              {
                received: action.name,
              }
            )
          );
        }

        if (!isNonEmptyString(action.label)) {
          diagnostics.push(
            diagnostic(
              "INVALID_ACTION_LABEL",
              `${actionPath}.label`,
              "Every action contract must include a non-empty label.",
              {
                received: action.label,
              }
            )
          );
        }

        if (
          !["update", "ai"].includes(action.type)
        ) {
          diagnostics.push(
            diagnostic(
              "INVALID_ACTION_TYPE",
              `${actionPath}.type`,
              "Action contract type must be update or ai.",
              {
                expected: ["update", "ai"],
                received: action.type,
              }
            )
          );
        }
      });
    }
  }

  if (!isObject(manifest.runtime)) {
    diagnostics.push(
      diagnostic(
        "MISSING_RUNTIME_CONTRACT",
        "runtime",
        "Manifest must include runtime metadata.",
        {
          received: manifest.runtime,
        }
      )
    );
  } else {
    if (hasSiteContract) {
      if (manifest.runtime.target !== "static-site") {
        diagnostics.push(
          diagnostic(
            "INVALID_STATIC_SITE_TARGET",
            "runtime.target",
            "Static site manifests must use runtime.target static-site.",
            {
              expected: "static-site",
              received: manifest.runtime.target,
            }
          )
        );
      }

      if (!isObject(manifest.runtime.generation)) {
        diagnostics.push(
          diagnostic(
            "MISSING_STATIC_SITE_GENERATION",
            "runtime.generation",
            "Static site manifests must include generation metadata.",
            {
              received:
                manifest.runtime.generation,
            }
          )
        );
      }
    } else if (!isObject(manifest.runtime.persistence)) {
      diagnostics.push(
        diagnostic(
          "MISSING_RUNTIME_PERSISTENCE",
          "runtime.persistence",
          "Manifest must include runtime persistence metadata.",
          {
            received:
              manifest.runtime.persistence,
          }
        )
      );
    } else if (
      typeof manifest.runtime.persistence
        .adapter !== "string"
    ) {
      diagnostics.push(
        diagnostic(
          "INVALID_RUNTIME_PERSISTENCE_ADAPTER",
          "runtime.persistence.adapter",
          "runtime.persistence.adapter must be a string.",
          {
            received:
              manifest.runtime.persistence
                .adapter,
          }
        )
      );
    }

    if (
      !hasSiteContract &&
      !isObject(
        manifest.runtime.generatedInterface
      )
    ) {
      diagnostics.push(
        diagnostic(
          "MISSING_GENERATED_INTERFACE",
          "runtime.generatedInterface",
          "Manifest must include generated interface metadata.",
          {
            received:
              manifest.runtime
                .generatedInterface,
          }
        )
      );
    }
  }

  return result(diagnostics);
}
