import type { z } from "zod";

/**
 * Minimal, framework-agnostic tool shape used by the scaffold agent loop.
 * A later PRP swaps this with LangChain's DynamicStructuredTool — the
 * `name` / `description` / `schema` / `invoke` surface is the same, so the
 * migration is one file per tool.
 *
 * Reason: the third zod generic is `unknown` so schemas using `.default()`
 * still fit — `ZodDefault` has an optional input type but a fully populated
 * output type; the tool loop only cares about the parsed (output) shape.
 */
export interface AgentTool<TIn, TOut> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TIn, z.ZodTypeDef, unknown>;
  outputSchema: z.ZodType<TOut>;
  invoke(input: TIn): Promise<TOut>;
}
