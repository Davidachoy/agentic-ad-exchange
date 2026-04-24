import { z } from "zod";

/**
 * Standard JSON-Schema subset used by OpenAI-format function tools (including
 * AIMLAPI's chat-completions endpoint). Intentionally narrower than full
 * JSON-Schema so a zod→schema mismatch fails loudly instead of silently
 * dropping a constraint.
 *
 * Supported: ZodString (+ enum), ZodNumber, ZodBoolean, ZodObject, ZodArray,
 * ZodEnum, ZodOptional, ZodDefault, ZodNullable, ZodEffects wrappers.
 */
export interface JsonSchema {
  type?: string | string[];
  description?: string;
  enum?: readonly string[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
}

export function zodToJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  return convert(schema).schema;
}

interface Converted {
  schema: JsonSchema;
  optional: boolean;
}

function unwrap(
  schema: z.ZodTypeAny,
): { inner: z.ZodTypeAny; optional: boolean; nullable: boolean } {
  let current: z.ZodTypeAny = schema;
  let optional = false;
  let nullable = false;
  for (;;) {
    if (current instanceof z.ZodOptional) {
      optional = true;
      current = current._def.innerType as z.ZodTypeAny;
    } else if (current instanceof z.ZodDefault) {
      optional = true;
      current = current._def.innerType as z.ZodTypeAny;
    } else if (current instanceof z.ZodNullable) {
      nullable = true;
      current = current._def.innerType as z.ZodTypeAny;
    } else if (current instanceof z.ZodEffects) {
      current = current._def.schema as z.ZodTypeAny;
    } else {
      break;
    }
  }
  return { inner: current, optional, nullable };
}

function withNullable(type: string, nullable: boolean): string | string[] {
  return nullable ? [type, "null"] : type;
}

function convert(schema: z.ZodTypeAny): Converted {
  const { inner, optional, nullable } = unwrap(schema);
  const description = schema.description ?? inner.description;

  if (inner instanceof z.ZodString) {
    return { schema: { type: withNullable("string", nullable), description }, optional };
  }
  if (inner instanceof z.ZodNumber) {
    const checks = (inner._def.checks ?? []) as Array<{ kind: string }>;
    const isInt = checks.some((c) => c.kind === "int");
    return {
      schema: { type: withNullable(isInt ? "integer" : "number", nullable), description },
      optional,
    };
  }
  if (inner instanceof z.ZodBoolean) {
    return { schema: { type: withNullable("boolean", nullable), description }, optional };
  }
  if (inner instanceof z.ZodEnum) {
    return {
      schema: {
        type: withNullable("string", nullable),
        enum: inner._def.values as readonly string[],
        description,
      },
      optional,
    };
  }
  if (inner instanceof z.ZodArray) {
    return {
      schema: {
        type: withNullable("array", nullable),
        items: convert(inner._def.type as z.ZodTypeAny).schema,
        description,
      },
      optional,
    };
  }
  if (inner instanceof z.ZodObject) {
    const rawShape = inner._def.shape() as Record<string, z.ZodTypeAny>;
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(rawShape)) {
      const child = convert(value);
      properties[key] = child.schema;
      if (!child.optional) required.push(key);
    }
    const out: JsonSchema = {
      type: withNullable("object", nullable),
      properties,
      additionalProperties: false,
      description,
    };
    if (required.length > 0) out.required = required;
    return { schema: out, optional };
  }

  throw new Error(
    `zodToJsonSchema: unsupported zod type "${inner.constructor.name}" — ` +
      `extend the converter or narrow the tool's inputSchema.`,
  );
}
