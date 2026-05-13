export type FieldType = "string" | "email" | "number" | "select";

export type FieldSchema = {
  type: FieldType;
  label?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  options?: string[];
};

export type ResourceSchema = Record<string, FieldSchema>;

export type ResourceSchemaInput = Record<string, FieldSchema | FieldBuilder>;

type FieldConfig = Omit<FieldSchema, "type">;

export class FieldBuilder {
  private schema: FieldSchema;

  constructor(type: FieldType, label?: string) {
    this.schema = {
      type,
    };

    if (label) {
      this.schema.label = label;
    }
  }

  label(label: string): this {
    this.schema.label = label;
    return this;
  }

  required(): this {
    this.schema.required = true;
    return this;
  }

  optional(): this {
    this.schema.required = false;
    return this;
  }

  min(length: number): this {
    this.schema.minLength = length;
    return this;
  }

  max(length: number): this {
    this.schema.maxLength = length;
    return this;
  }

  placeholder(placeholder: string): this {
    this.schema.placeholder = placeholder;
    return this;
  }

  choices(options: string[]): this {
    this.schema.options = options;
    return this;
  }

  toJSON(): FieldSchema {
    return {
      ...this.schema,
    };
  }
}

function applyConfig(builder: FieldBuilder, config: FieldConfig): FieldSchema {
  if (config.label !== undefined) {
    builder.label(config.label);
  }

  if (config.required === true) {
    builder.required();
  }

  if (config.required === false) {
    builder.optional();
  }

  if (config.minLength !== undefined) {
    builder.min(config.minLength);
  }

  if (config.maxLength !== undefined) {
    builder.max(config.maxLength);
  }

  if (config.placeholder !== undefined) {
    builder.placeholder(config.placeholder);
  }

  if (config.options !== undefined) {
    builder.choices(config.options);
  }

  return builder.toJSON();
}

export function string(label?: string): FieldBuilder {
  return new FieldBuilder("string", label);
}

export function email(label?: string): FieldBuilder {
  return new FieldBuilder("email", label);
}

export function number(label?: string): FieldBuilder {
  return new FieldBuilder("number", label);
}

export function select(options: string[], label?: string): FieldBuilder {
  return new FieldBuilder("select", label).choices(options);
}

export function stringField(config: FieldConfig = {}): FieldSchema {
  return applyConfig(new FieldBuilder("string"), config);
}

export function emailField(config: FieldConfig = {}): FieldSchema {
  return applyConfig(new FieldBuilder("email"), config);
}

export function numberField(config: FieldConfig = {}): FieldSchema {
  return applyConfig(new FieldBuilder("number"), config);
}

export function selectField(
  options: string[],
  config: Omit<FieldConfig, "options"> = {}
): FieldSchema {
  return applyConfig(new FieldBuilder("select").choices(options), config);
}
