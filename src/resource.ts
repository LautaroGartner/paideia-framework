import type {
  ResourceSchema,
  ResourceSchemaInput,
} from "./fields.js";

export type ResourceStorage = "local";

export type RuntimeTarget = "browser";

export type PermissionLevel =
  | "public"
  | "authenticated"
  | "admin";

export type ResourcePermissions = {
  create: PermissionLevel;
  update: PermissionLevel;
  delete: PermissionLevel;
  ai: PermissionLevel;
};

export type UpdateResourceAction = {
  name: string;
  label: string;
  type: "update";
  set: Record<string, string>;
  log?: string;
};

export type AiResourceAction = {
  name: string;
  label: string;
  type: "ai";
  capability: "summarizeRecord";
  log?: string;
};

export type ResourceAction =
  | UpdateResourceAction
  | AiResourceAction;

export type Resource = {
  name: string;
  schema: ResourceSchema;
  actions: ResourceAction[];
  storage: ResourceStorage;
  permissions: ResourcePermissions;
  runtimeTarget: RuntimeTarget;
};

export type ResourceConfig = {
  actions?: ResourceAction[];
  storage?: ResourceStorage;
  permissions?: Partial<ResourcePermissions>;
  runtimeTarget?: RuntimeTarget;
};

function normalizePermissions(
  permissions: Partial<ResourcePermissions> = {}
): ResourcePermissions {
  return {
    create: permissions.create ?? "public",
    update: permissions.update ?? "public",
    delete: permissions.delete ?? "public",
    ai: permissions.ai ?? "public",
  };
}

function normalizeRuntimeTarget(
  runtimeTarget?: RuntimeTarget
): RuntimeTarget {
  return runtimeTarget ?? "browser";
}

function normalizeSchema(
  schema: ResourceSchemaInput
): ResourceSchema {
  return Object.fromEntries(
    Object.entries(schema).map(([fieldName, field]) => {
      const normalizedField =
        "toJSON" in field &&
        typeof field.toJSON === "function"
          ? field.toJSON()
          : field;

      return [fieldName, normalizedField];
    })
  ) as ResourceSchema;
}

export function resource(
  name: string,
  schema: ResourceSchemaInput,
  config: ResourceConfig = {}
): Resource {
  return {
    name,
    schema: normalizeSchema(schema),
    actions: config.actions ?? [],
    storage: config.storage ?? "local",
    permissions: normalizePermissions(config.permissions),
    runtimeTarget: normalizeRuntimeTarget(config.runtimeTarget),
  };
}