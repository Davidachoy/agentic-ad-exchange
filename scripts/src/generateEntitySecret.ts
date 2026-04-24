import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { banner } from "./logger.js";

/**
 * Generate a 32-byte hex entity secret for Circle Developer-Controlled Wallets.
 * The value is APPENDED to .env.local (created if absent) — never echoed.
 * If CIRCLE_ENTITY_SECRET is already present the script bails rather than overwrite.
 */
function main(): void {
  const { rootDir } = loadRootEnv();
  const envPath = resolve(rootDir, ".env.local");
  if (existsSync(envPath)) {
    const current = readFileSync(envPath, "utf-8");
    if (/^CIRCLE_ENTITY_SECRET=\S+/m.test(current)) {
      banner("Entity Secret", [
        ".env.local already has CIRCLE_ENTITY_SECRET — refusing to overwrite.",
        "Delete the line manually if you really want to regenerate.",
      ]);
      return;
    }
  }

  const hex = randomBytes(32).toString("hex");
  appendFileSync(envPath, `\nCIRCLE_ENTITY_SECRET=${hex}\n`, { mode: 0o600 });

  banner("Entity Secret", [
    `Wrote CIRCLE_ENTITY_SECRET (32 bytes) to ${envPath}`,
    "NEVER commit this file. Register it next:",
    "  pnpm --filter @ade/scripts register:entity-secret",
  ]);
}

main();
