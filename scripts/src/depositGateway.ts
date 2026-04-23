import { GATEWAY_WALLET_ADDRESS } from "@ade/shared";

import { assertTestnet, loadScriptsConfig } from "./config.js";
import { banner, log } from "./logger.js";

/**
 * One-time deposit of USDC into the Circle Gateway Wallet contract.
 *
 * IMPORTANT: on testnet, Circle takes 13–19 minutes to credit after
 * on-chain confirmation (see tutorials/pay-per-call-llm-nanopayments-tutorial.md
 * § Common Issues). This script prints a progress banner and polls.
 *
 * TODO(post-scaffold): implement ERC-20 approve + deposit using the buyer
 * wallet's Circle DCW; then poll Circle's balance endpoint until credited.
 */
async function main(): Promise<void> {
  const config = loadScriptsConfig();
  assertTestnet(config);
  log("Deposit plan", {
    gatewayContract: GATEWAY_WALLET_ADDRESS,
    depositAmountUsdc: config.DEPOSIT_AMOUNT_USDC,
    environment: config.CIRCLE_ENVIRONMENT,
  });

  banner("Gateway Deposit (scaffold stub)", [
    `Target contract: ${GATEWAY_WALLET_ADDRESS}`,
    `Amount:          ${config.DEPOSIT_AMOUNT_USDC} USDC`,
    "Testnet credit delay: 13–19 minutes after on-chain confirmation.",
    "Post-scaffold PRP will:",
    "  1) ERC-20 approve Gateway Wallet for DEPOSIT_AMOUNT_USDC",
    "  2) Call Gateway deposit()",
    "  3) Poll Circle balance every 60s until credited",
  ]);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
