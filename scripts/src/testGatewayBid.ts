import { GatewayClient, type SupportedChainName } from "@circle-fin/x402-batching/client";
import { loadRootEnv } from "@ade/shared/env";

loadRootEnv();

const privateKey = process.env.BUYER_PRIVATE_KEY as `0x${string}`;
const chain = (process.env.BUYER_CHAIN ?? "arcTestnet") as SupportedChainName;
const exchangeUrl = process.env.EXCHANGE_API_URL ?? "http://localhost:4021";
if (!privateKey) throw new Error("BUYER_PRIVATE_KEY not set");

// Intercept fetch to log the second request/response pair
const origFetch = globalThis.fetch;
let requestCount = 0;
// @ts-ignore — patching global fetch for debug tracing
globalThis.fetch = async (input, init) => {
  requestCount++;
  const n = requestCount;
  const url = input.toString();
  if (!url.includes("circle")) {
    console.log(`\n--- fetch #${n} → ${init?.method ?? "GET"} ${url}`);
    const h = (init?.headers ?? {}) as Record<string, string>;
    if (h["Payment-Signature"] ?? h["payment-signature"]) {
      console.log("  [Payment-Signature]: present");
    }
  }
  const res = await origFetch(input, init);
  if (!url.includes("circle")) {
    console.log(`  status: ${res.status} ${res.statusText}`);
    const clone = res.clone();
    const body = await clone.text();
    if (body) console.log(`  body: ${body.slice(0, 300)}`);
  }
  return res;
};

const gateway = new GatewayClient({ chain, privateKey });
console.log("Buyer address:", gateway.address);

const bid = {
  bidId: crypto.randomUUID(),
  buyerAgentId: "smoke-test",
  buyerWallet: gateway.address,
  targeting: { adType: "display", format: "banner", size: "300x250", contextTags: ["test"] },
  bidAmountUsdc: "0.005",
  budgetRemainingUsdc: "1.000000",
  nonce: "0x" + crypto.getRandomValues(new Uint8Array(32)).reduce((h, b) => h + b.toString(16).padStart(2, "0"), ""),
  createdAt: new Date().toISOString(),
};

console.log("\n=== gateway.pay() — $0.001 USDC ===");
try {
  // Reason: GatewayClient already sets Content-Type: application/json internally.
  // Passing it again in headers creates a duplicate that Node.js joins as
  // "application/json, application/json", breaking Express's body-parser.
  const result = await gateway.pay<{ bidId: string }>(`${exchangeUrl}/bid`, {
    method: "POST",
    body: bid,
  });
  console.log("\nSUCCESS");
  console.log("status:", result.status);
  console.log("paid:", result.formattedAmount, "USDC");
  console.log("tx:", result.transaction);
  console.log("data:", result.data);
} catch (err) {
  console.error("\nFAILED:", (err as Error).message);
}
