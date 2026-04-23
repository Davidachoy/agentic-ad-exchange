import { loadScriptsConfig } from "./config.js";
import { banner, log } from "./logger.js";

/**
 * One-time registration of CIRCLE_ENTITY_SECRET with Circle's console.
 * TODO(post-scaffold): call the Circle registration endpoint per
 * https://developers.circle.com/w3s/docs/register-an-entity-secret-ciphertext.
 * Scaffold just validates env and prints the manual-step reminder.
 */
function main(): void {
  const config = loadScriptsConfig();
  log("Loaded config", {
    environment: config.CIRCLE_ENVIRONMENT,
    hasEntitySecret: Boolean(config.CIRCLE_ENTITY_SECRET),
    hasApiKey: Boolean(config.CIRCLE_API_KEY),
  });

  banner("Register Entity Secret", [
    "Scaffold stub — wire real registration in a follow-up PRP.",
    "In the meantime, register manually at:",
    "  https://console.circle.com → Developer → Entity Configuration",
  ]);
}

main();
