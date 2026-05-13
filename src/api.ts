import type { Resource } from "./resource.js";

import { slugify } from "./utils.js";

export type GeneratedApiContract = {
  enabled: boolean;

  resource: string;

  routes: {
    method: string;
    path: string;
    capability: string;
  }[];
};

export function generateApiContract(
  resource: Resource
): GeneratedApiContract {
  const slug = slugify(resource.name);

  return {
    enabled: false,

    resource: slug,

    routes: [
      {
        method: "GET",
        path: `/api/${slug}s`,
        capability: "record.read",
      },

      {
        method: "POST",
        path: `/api/${slug}s`,
        capability: "record.create",
      },

      {
        method: "PATCH",
        path: `/api/${slug}s/:id`,
        capability: "record.update",
      },

      {
        method: "DELETE",
        path: `/api/${slug}s/:id`,
        capability: "record.delete",
      },
    ],
  };
}
