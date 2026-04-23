import { assertTestnet, loadScriptsConfig } from "./config.js";
import { banner } from "./logger.js";

/**
 * Top up the demo wallets from the Circle Faucet. Testnet-only; hard-guards
 * via assertTestnet(). TODO(post-scaffold): call https://faucet.circle.com
 * programmatically with buyer/seller wallet addresses.
 */
async function main(): Promise<void> {
  const config = loadScriptsConfig();
  assertTestnet(config);
  banner("Fund Wallets (scaffold stub)", [
    "Manual step until wired:",
    "  1) Open https://faucet.circle.com",
    "  2) Select ARC Testnet",
    "  3) Paste buyer and seller wallet addresses",
    "  4) Request USDC (≈ 0.20 USDC per wallet is plenty for the demo)",
  ]);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
