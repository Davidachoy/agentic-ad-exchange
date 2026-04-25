import { loadRootEnv } from "@ade/shared/env";
import { z } from "zod";

/**
 * Typed config for the buyer agent. Two LLM transports are supported:
 *
 *   - `aimlapi` (default): OpenAI-compatible chat completions, proxied to
 *     Gemini server-side. Works when Google billing is not provisioned.
 *   - `gemini`: direct Google Gemini API. Stricter for the partner-challenge
 *     submission, but needs a Google Cloud project with billing enabled.
 *
 * `LLM_PROVIDER` selects which of the two adapters the factory wires. The env
 * block for the unselected provider may be empty — the zod schema only
 * requires the active one.
 */
const EXCHANGE_URL_DEFAULT = "http://localhost:4021";

const BaseEnvSchema = z.object({
  EXCHANGE_API_URL: z.string().url().default(EXCHANGE_URL_DEFAULT),
  BUYER_WALLET_ID: z.string().min(1),
  LLM_PROVIDER: z.enum(["aimlapi", "gemini"]).default("aimlapi"),
});

const AimlApiEnvSchema = z.object({
  AIMLAPI_API_KEY: z.string().min(1),
  AIMLAPI_MODEL: z.string().min(1).default("google/gemini-2.0-flash"),
  AIMLAPI_BASE_URL: z.string().url().default("https://api.aimlapi.com/v1"),
});

const GeminiEnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
});

export type BuyerAgentConfig = z.infer<typeof BaseEnvSchema> & {
  aimlapi?: z.infer<typeof AimlApiEnvSchema>;
  gemini?: z.infer<typeof GeminiEnvSchema>;
};

export function loadBuyerConfig(env: NodeJS.ProcessEnv = process.env): BuyerAgentConfig {
  loadRootEnv();
  const base = BaseEnvSchema.safeParse(env);
  if (!base.success) {
    throw new Error(
      `Invalid buyer-agent env: ${base.error.issues
        .map((i) => `${i.path.join(".")} ${i.message}`)
        .join("; ")}`,
    );
  }
  const out: BuyerAgentConfig = base.data;
  if (out.LLM_PROVIDER === "aimlapi") {
    const parsed = AimlApiEnvSchema.safeParse(env);
    if (!parsed.success) {
      throw new Error(
        `LLM_PROVIDER=aimlapi but AIMLAPI env is invalid: ${parsed.error.issues
          .map((i) => `${i.path.join(".")} ${i.message}`)
          .join("; ")}`,
      );
    }
    out.aimlapi = parsed.data;
  } else {
    const parsed = GeminiEnvSchema.safeParse(env);
    if (!parsed.success) {
      throw new Error(
        `LLM_PROVIDER=gemini but GEMINI env is invalid: ${parsed.error.issues
          .map((i) => `${i.path.join(".")} ${i.message}`)
          .join("; ")}`,
      );
    }
    out.gemini = parsed.data;
  }
  return out;
}
