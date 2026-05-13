import type {
  AiResourceAction,
  Resource,
} from "./resource.js";

import { config } from "./config.js";
import { slugify } from "./utils.js";
import { FRAMEWORK_VERSION } from "./version.js";
import { getResourceCapabilities } from "./capabilities.js";
import { generateApiContract } from "./api.js";

export function generateSystemManifest(
  resource: Resource
): string {
  const resourceSlug = slugify(resource.name);

  const aiActions = resource.actions.filter(
    (action): action is AiResourceAction =>
      action.type === "ai"
  );

  const capabilities = getResourceCapabilities(resource);

  const api = generateApiContract(resource);

  const aiCapabilities = Array.from(
    new Set(
      aiActions.map((action) => action.capability)
    )
  );

  const generatedSections = ["form", "table"];
  if (config.inspect) {
    generatedSections.push("inspect-panel");
  }

  const manifest = {
    framework: {
      name: "Paideia Framework",
      version: FRAMEWORK_VERSION,
      mode: config.mode,
    },

    resource: {
      name: resource.name,
      slug: resourceSlug,
      permissions: resource.permissions,

      fields: Object.entries(resource.schema).map(
        ([fieldName, field]) => ({
          name: fieldName,
          label: field.label ?? fieldName,
          type: field.type,
          required: Boolean(field.required),
          minLength:
            typeof field.minLength === "number"
              ? field.minLength
              : null,
          maxLength:
            typeof field.maxLength === "number"
              ? field.maxLength
              : null,
          options:
            Array.isArray(field.options)
              ? field.options
              : null,
        })
      ),

      actions: resource.actions.map((action) => {
        if (action.type === "ai") {
          return {
            name: action.name,
            label: action.label,
            type: action.type,
            capability: action.capability,
            log: action.log ?? null,
          };
        }

        return {
          name: action.name,
          label: action.label,
          type: action.type,
          set: action.set,
          log: action.log ?? null,
        };
      }),
    },

    runtime: {
      target: resource.runtimeTarget,

      persistence: {
        adapter: resource.storage,
        strategy:
          resource.storage === "local"
            ? "localStorage"
            : "unknown",
        scope:
          resource.storage === "local"
            ? "browser-local"
            : "unknown",
        namespacedByResource: true,
      },

      composition: {
        layout: "stack",
        generatedSections: generatedSections,
      },

      generatedInterface: {
        form: true,
        table: true,
        validation: true,
      },

      events: [
        "record.created",
        "record.deleted",
        "records.cleared",
        "validation.failed",
        "action.executed",
        "ai.executed",
        "permission.denied",
      ],

      developerTools: {
        inspectPanel: config.inspect,
        frameworkLog: config.logs,
      },
    },

    capabilities,

    api,

    ai: {
      enabled: aiActions.length > 0,

      capabilities: aiCapabilities,

      declaredActions: aiActions.map((action) => ({
        name: action.name,
        label: action.label,
        capability: action.capability,
      })),

      guarantees: {
        requiresExplicitDeclaration: true,
        doesNotRunByDefault: true,
        generatedUiOnlyWhenDeclared: true,
        silentMutation: false,
      },
    },

    trust: {
      generatedArtifactsInspectable: true,
      aiBehaviorManifested: true,
      devToolingEnvironmentAware: true,
      persistenceIsVisible: true,
      permissionsManifested: true,
      permissionsEnforced: true,
      runtimeTargetManifested: true,
      apiContractManifested: true,
    },
  };

  return JSON.stringify(manifest, null, 2);
}
