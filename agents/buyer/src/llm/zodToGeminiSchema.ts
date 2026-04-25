import { SchemaType, type Schema } from "@google/generative-ai";
import { z } from "zod";

/**
 * Convert a zod schema into Gemini's Function Calling JSON-Schema subset.
 *
 * Supported: ZodString (incl. enum), ZodNumber, ZodBoolean, ZodObject, ZodArray,
 * ZodEnum, and the ZodOptional / ZodDefault / ZodNullable / ZodEffects wrappers.
 * Unsupported zod features throw — kept deliberately narrow so a wrong-tool-
 * selection bug can't hide behind a silent type coercion.
 */
export function zodToGeminiSchema(schema: z.ZodTypeAny): Schema {
  return convert(schema);
}

interface Unwrapped {
  inner: z.ZodTypeAny;
  optional: boolean;
  nullable: boolean;
}

function unwrap(schema: z.ZodTypeAny): Unwrapped {
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
      // Unwrap `.refine` / `.transform` wrappers — Gemini sees the base shape.
      current = current._def.schema as z.ZodTypeAny;
    } else {
      break;
    }
  }
  return { inner: current, optional, nullable };
}

function convert(schema: z.ZodTypeAny): Schema {
  const { inner, nullable } = unwrap(schema);
  const description = schema.description ?? inner.description;

  if (inner instanceof z.ZodString) {
    return { type: SchemaType.STRING, description, nullable } as Schema;
  }
  if (inner instanceof z.ZodNumber) {
    const checks = (inner._def.checks ?? []) as Array<{ kind: string }>;
    const isInt = checks.some((c) => c.kind === "int");
    return {
      type: isInt ? SchemaType.INTEGER : SchemaType.NUMBER,
      description,
      nullable,
    } as Schema;
  }
  if (inner instanceof z.ZodBoolean) {
    return { type: SchemaType.BOOLEAN, description, nullable } as Schema;
  }
  if (inner instanceof z.ZodEnum) {
    const values = inner._def.values as string[];
    return {
      type: SchemaType.STRING,
      format: "enum",
      enum: values,
      description,
      nullable,
    } as unknown as Schema;
  }
  if (inner instanceof z.ZodArray) {
    const itemSchema = inner._def.type as z.ZodTypeAny;
    return {
      type: SchemaType.ARRAY,
      items: convert(itemSchema),
      description,
      nullable,
    } as Schema;
  }
  if (inner instanceof z.ZodObject) {
    const rawShape = inner._def.shape() as Record<string, z.ZodTypeAny>;
    const properties: Record<string, Schema> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(rawShape)) {
      properties[key] = convert(value);
      if (!unwrap(value).optional) required.push(key);
    }
    const out: Schema = {
      type: SchemaType.OBJECT,
      properties,
      description,
      nullable,
    } as Schema;
    if (required.length > 0) {
      (out as { required?: string[] }).required = required;
    }
    return out;
  }

  throw new Error(
    `zodToGeminiSchema: unsupported zod type "${inner.constructor.name}" — ` +
      `extend the converter or narrow the tool's inputSchema.`,
  );
}
