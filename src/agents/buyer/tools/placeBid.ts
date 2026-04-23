import { GatewayClient, type SupportedChainName } from "@circle-fin/x402-batching/client";
import { config } from "../../../config.js";

if (!config.buyerPrivateKey) {
  throw new Error("BUYER_PRIVATE_KEY missing — needed to sign Gateway authorizations");
}

// GatewayClient owns the full 402 flow: initial fetch → parse PAYMENT-REQUIRED →
// sign EIP-3009 TransferWithAuthorization with GatewayWalletBatched domain →
// retry with Payment-Signature header → return the response.
// Before first use, buyer must deposit USDC via `npm run script:depositGateway`.
const gateway = new GatewayClient({
  chain: config.buyerChain as SupportedChainName,
  privateKey: config.buyerPrivateKey as `0x${string}`,
});

// Bid clearing-price settlement uses Circle Developer-Controlled Wallets
// (separate rail from Gateway), so we pass the DCW address to the auction.
const BUYER_DCW_ADDRESS = config.buyerWalletAddress ?? gateway.address;

export async function placeBid(params: {
  listingId: string;
  buyerId: string;
  adType: string;
  adFormat: string;
  amount: number;
}) {
  console.log("  💳 Placing bid via Circle Nanopayments...");

  const result = await gateway.pay<{
    success: boolean;
    bid: unknown;
    payment: unknown;
  }>(`${config.exchangeUrl}/auction/bid`, {
    method: "POST",
    body: { ...params, walletAddress: BUYER_DCW_ADDRESS },
  });

  console.log(
    `  ✅ Bid placed! Paid ${result.formattedAmount} USDC` +
      (result.transaction ? ` (settlement tx: ${result.transaction})` : "")
  );

  return result.data;
}
