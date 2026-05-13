import type { Resource } from "./resource.js";

export type RuntimeCapability = {
  name: string;
  source: "runtime" | "action" | "ai";
  actions?: string[];
  adapter?: string;
};

export function getResourceCapabilities(
  resource: Resource
): RuntimeCapability[] {
  const capabilities: RuntimeCapability[] = [];

  capabilities.push({
    name: `storage.${resource.storage}`,
    source: "runtime",
    adapter: resource.storage,
  });

  capabilities.push({
    name: `runtime.${resource.runtimeTarget}`,
    source: "runtime",
  });

  capabilities.push({
    name: "record.read",
    source: "runtime",
  });

  capabilities.push({
    name: "record.create",
    source: "runtime",
  });

  capabilities.push({
    name: "record.delete",
    source: "runtime",
  });

  const updateActions = resource.actions.filter(
    (action) => action.type === "update"
  );

  if (updateActions.length > 0) {
    capabilities.push({
      name: "record.update",
      source: "action",
      actions: updateActions.map((action) => action.name),
    });
  }

  const aiActions = resource.actions.filter(
    (action) => action.type === "ai"
  );

  for (const aiAction of aiActions) {
    capabilities.push({
      name: `ai.${aiAction.capability}`,
      source: "ai",
      actions: [aiAction.name],
    });
  }

  return capabilities;
}