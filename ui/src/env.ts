/**
 * UI-side env accessor. Only VITE_* vars are visible to the browser bundle —
 * these must NEVER hold a secret. See CLAUDE.md § Security.
 */
import { z } from "zod";

const UiEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().default("/api"),
});

export const uiEnv = UiEnvSchema.parse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
});
