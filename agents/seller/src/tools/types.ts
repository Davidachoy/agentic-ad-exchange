import type { z } from "zod";

/**
 * Reason: third zod generic is `unknown` so schemas using `.default()`
 * still fit — ZodDefault has an optional input type but a fully populated
 * output type.
 */
export interface AgentTool<TIn, TOut> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TIn, z.ZodTypeDef, unknown>;
  outputSchema: z.ZodType<TOut>;
  invoke(input: TIn): Promise<TOut>;
}
