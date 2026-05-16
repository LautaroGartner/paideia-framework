function normalizeFields(fields) {
  if (Array.isArray(fields)) {
    return fields.map((field) => ({
      ...field,
      required: field.required ?? false,
      nullable: field.nullable ?? false,
      default: field.default ?? null,
    }));
  }

  return Object.entries(fields).map(([name, field]) => ({
    name,
    ...field,
    required: field.required ?? false,
    nullable: field.nullable ?? false,
    default: field.default ?? null,
  }));
}

function normalizeActions(actions = []) {
  return actions.map((action) => ({
    ...action,
    description: action.description ?? null,
  }));
}

export function normalizeManifestContract(manifest) {
  return {
    ...manifest,
    resource: {
      ...manifest.resource,
      fields: normalizeFields(manifest.resource.fields),
      actions: normalizeActions(
        manifest.resource.actions
      ),
    },
  };
}
