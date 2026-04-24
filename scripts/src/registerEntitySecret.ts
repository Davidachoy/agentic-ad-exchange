import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";

import { loadRootEnv } from "@ade/shared/env";

import { loadScriptsConfig } from "./config.js";
import { banner, log } from "./logger.js";

/**
 * One-time registration of the 32-byte Entity Secret with Circle. The SDK
 * RSA-encrypts it against Circle's public key, POSTs the ciphertext, and
 * writes a recovery file to disk — save that file alongside the secret
 * itself, it is the only way to recover the secret if lost.
 *
 * Idempotency: Circle rejects re-registration of the same secret; we surface
 * that as "already registered" instead of a stack trace.
 */
async function main(): Promise<void> {
  const config = loadScriptsConfig();
  const { rootDir } = loadRootEnv();

  log("Registering entity secret ciphertext with Circle", {
    environment: config.CIRCLE_ENVIRONMENT,
    recoveryFileDir: rootDir,
  });

  try {
    const response = await registerEntitySecretCiphertext({
      apiKey: config.CIRCLE_API_KEY,
      entitySecret: config.CIRCLE_ENTITY_SECRET,
      recoveryFileDownloadPath: rootDir,
    });

    const lines = [
      "Registration complete.",
      `Recovery file written under ${rootDir} (pattern: recovery_file_<timestamp>.dat).`,
      "Move it somewhere safe — this is the only copy Circle will ever give you.",
    ];
    if (!response.data?.recoveryFile) {
      lines.push("Note: SDK response had no recoveryFile field — verify the file landed on disk.");
    }
    banner("Entity Secret Registered", lines);
  } catch (err) {
    if (isAlreadyRegistered(err)) {
      banner("Entity Secret", [
        "Already registered for this API key — nothing to do.",
        "If you meant to rotate the secret, generate a new one and register that.",
      ]);
      return;
    }
    throw err;
  }
}

/**
 * Circle surfaces duplicate-registration as a 409 or a message mentioning
 * the existing ciphertext. Match broadly so we don't miss a phrasing change.
 */
function isAlreadyRegistered(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; response?: { status?: number }; message?: string };
  const status = e.status ?? e.response?.status;
  if (status === 409) return true;
  return typeof e.message === "string" && /already.*(registered|exists)/i.test(e.message);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
