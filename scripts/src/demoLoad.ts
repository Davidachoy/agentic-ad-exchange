import { banner } from "./logger.js";

/**
 * Demo driver — will issue ≥ 50 bid/auction cycles against the local Exchange
 * so the hackathon demo satisfies the "≥ 50 on-chain transactions" gate.
 *
 * TODO(post-scaffold): implement in a follow-up PRP — this stub only prints
 * the checklist so scaffolding doesn't block feature work.
 */
function main(): void {
  banner("Demo Load (scaffold stub)", [
    "Will drive ≥ 50 auctions against http://localhost:4021 in a follow-up PRP.",
    "Until then, run the buyer and seller agents manually from their packages.",
  ]);
}

main();
