import { loadRootEnv } from "@ade/shared/env";
import { GatewayClient, type SupportedChainName } from "@circle-fin/x402-batching/client";

loadRootEnv();

const privateKey = process.env.BUYER_PRIVATE_KEY as `0x${string}`;
const chain = (process.env.BUYER_CHAIN ?? "arcTestnet") as SupportedChainName;

const client = new GatewayClient({ chain, privateKey });
console.log("Buyer address:", client.address);
const bal = await client.getBalances();
console.log("Wallet USDC:", bal.wallet.formatted);
console.log("Gateway available:", bal.gateway.formattedAvailable);
console.log("Gateway total:", bal.gateway.formattedTotal);
