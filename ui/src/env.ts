/**
 * UI-side env accessor. Only VITE_* vars are visible to the browser bundle —
 * these must NEVER hold a secret. See CLAUDE.md § Security.
 */
import { z } from "zod";

const UiEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().default("/api"),
  // Reason: public on-chain seller DCW address. Bundle-safe — never holds a secret.
  // Used only to render the "View all on Arcscan" header link in SettlementLedger.
  VITE_SELLER_WALLET_ADDRESS: z.string().optional(),
});

const blankToUndefined = (v: unknown): unknown =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

export const uiEnv = UiEnvSchema.parse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_SELLER_WALLET_ADDRESS: blankToUndefined(import.meta.env.VITE_SELLER_WALLET_ADDRESS),
});
