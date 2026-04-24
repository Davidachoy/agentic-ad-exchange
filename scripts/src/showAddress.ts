import { GatewayClient, type SupportedChainName } from "@circle-fin/x402-batching/client";

import { loadScriptsConfig } from "./config.js";
import { banner } from "./logger.js";

/**
 * Print the EOA address derived from `BUYER_PRIVATE_KEY`. Useful between
 * `generate:entity-secret`-style setup and `deposit:gateway` — you need to
 * know which address to fund on https://faucet.circle.com before the
 * Gateway deposit can succeed.
 */
function main(): void {
  const config = loadScriptsConfig();
  if (!config.BUYER_PRIVATE_KEY) {
    banner("Show Address — BUYER_PRIVATE_KEY not set", [
      "Generate one:",
      "  node -e \"console.log('0x' + require('crypto').randomBytes(32).toString('hex'))\"",
      "Add the output to .env.local as BUYER_PRIVATE_KEY, then re-run this command.",
    ]);
    process.exit(1);
  }

  const client = new GatewayClient({
    chain: config.BUYER_CHAIN as SupportedChainName,
    privateKey: config.BUYER_PRIVATE_KEY as `0x${string}`,
  });

  banner("Buyer EOA Address", [
    `Address: ${client.account.address}`,
    `Chain:   ${config.BUYER_CHAIN}`,
    "",
    "Next steps:",
    "  1) Fund this address with USDC on https://faucet.circle.com (Arc Testnet)",
    "  2) pnpm --filter @ade/scripts deposit:gateway",
  ]);
}

main();
