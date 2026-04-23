import { createCircleClient } from "@ade/wallets";

import { assertTestnet, loadScriptsConfig } from "./config.js";
import { banner, log } from "./logger.js";

async function main(): Promise<void> {
  const config = loadScriptsConfig();
  assertTestnet(config);
  const client = createCircleClient({ env: process.env });
  log("Creating wallet set", { environment: config.CIRCLE_ENVIRONMENT });

  // TODO(post-scaffold): the scaffold stub throws — swap in real SDK call.
  try {
    const result = await client.createWalletSet("ade-demo");
    banner("Wallet Set Created", [
      `walletSetId: ${result.walletSetId}`,
      "Add this to .env.local as WALLET_SET_ID.",
    ]);
  } catch (err) {
    banner("Wallet Set (scaffold stub)", [
      "The CircleSdkAdapter is not wired yet.",
      "Post-scaffold PRP will swap scaffoldStubSdk → real Circle SDK.",
      `error: ${(err as Error).message}`,
    ]);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
