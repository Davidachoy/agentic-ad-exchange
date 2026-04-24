import { GATEWAY_WALLET_ADDRESS } from "@ade/shared";
import { GatewayClient, type SupportedChainName } from "@circle-fin/x402-batching/client";

import { assertTestnet, loadScriptsConfig, type ScriptsConfig } from "./config.js";
import { banner, log } from "./logger.js";

/**
 * Deposit USDC into the Circle Gateway Wallet contract, then poll until
 * Circle's testnet pipeline credits the balance. Testnet credit takes
 * 13–19 minutes (see tutorials/pay-per-call-llm-nanopayments-tutorial.md
 * § Common Issues) — we poll every `pollIntervalMs`, bounded by
 * `DEPOSIT_TIMEOUT_MS` (default 25 min).
 */

export interface DepositGatewayClient {
  getBalances(): Promise<GatewayBalances>;
  deposit(amount: string): Promise<{ depositTxHash?: string }>;
}

export interface GatewayBalances {
  wallet: { formatted: string };
  gateway: { formattedAvailable: string };
}

export interface DepositGatewayDeps {
  config?: ScriptsConfig;
  client?: DepositGatewayClient;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  pollIntervalMs?: number;
}

export interface DepositGatewayResult {
  depositTxHash?: string;
  before: GatewayBalances;
  after: GatewayBalances;
}

const DEFAULT_POLL_INTERVAL_MS = 60_000;

export async function runDepositGateway(
  deps: DepositGatewayDeps = {},
): Promise<DepositGatewayResult> {
  const config = deps.config ?? loadScriptsConfig();
  assertTestnet(config);

  if (!config.BUYER_PRIVATE_KEY) {
    throw new Error(
      [
        "Missing BUYER_PRIVATE_KEY. Setup:",
        "  1) Generate a key:  node -e \"console.log('0x' + require('crypto').randomBytes(32).toString('hex'))\"",
        "  2) Paste the output into .env.local as BUYER_PRIVATE_KEY=0x...",
        "  3) Print the EOA address to fund:  pnpm --filter @ade/scripts show:address",
        "  4) Fund that address on https://faucet.circle.com (Arc Testnet)",
        "  5) Re-run:  pnpm --filter @ade/scripts deposit:gateway",
      ].join("\n"),
    );
  }

  const client = deps.client ?? buildLiveClient(config);
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? defaultSleep;
  const pollIntervalMs = deps.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;

  log("Deposit plan", {
    gatewayContract: GATEWAY_WALLET_ADDRESS,
    depositAmountUsdc: config.DEPOSIT_AMOUNT_USDC,
    chain: config.BUYER_CHAIN,
    timeoutMs: config.DEPOSIT_TIMEOUT_MS,
  });

  const before = await client.getBalances();
  const baselineAtomic = toUsdcAtomic(before.gateway.formattedAvailable);
  const targetAtomic = baselineAtomic + toUsdcAtomic(config.DEPOSIT_AMOUNT_USDC);

  log("Submitting deposit", {
    walletBefore: before.wallet.formatted,
    gatewayBefore: before.gateway.formattedAvailable,
  });
  const submitted = await client.deposit(config.DEPOSIT_AMOUNT_USDC);
  log("Deposit submitted", { depositTxHash: submitted.depositTxHash });

  const started = now();
  let after: GatewayBalances = before;
  while (now() - started < config.DEPOSIT_TIMEOUT_MS) {
    await sleep(pollIntervalMs);
    after = await client.getBalances();
    log("Poll", {
      wallet: after.wallet.formatted,
      gateway: after.gateway.formattedAvailable,
      elapsedMs: now() - started,
    });
    if (toUsdcAtomic(after.gateway.formattedAvailable) >= targetAtomic) {
      banner("Gateway Deposit Credited", [
        `Deposit tx: ${submitted.depositTxHash ?? "(not reported)"}`,
        `Gateway before: ${before.gateway.formattedAvailable} USDC`,
        `Gateway after:  ${after.gateway.formattedAvailable} USDC`,
      ]);
      return { depositTxHash: submitted.depositTxHash, before, after };
    }
  }

  throw new Error(
    `Deposit not credited within ${config.DEPOSIT_TIMEOUT_MS}ms — Circle testnet typically credits in 13–19 min. Tx hash: ${submitted.depositTxHash ?? "(not reported)"}`,
  );
}

function buildLiveClient(config: ScriptsConfig): DepositGatewayClient {
  // Reason: BUYER_PRIVATE_KEY is already regex-validated by loadScriptsConfig
  // as ^0x[a-f0-9]{64}$. The `0x${string}` template type is just a narrower
  // brand the viem/x402 SDK uses; cast here rather than threading the brand
  // through our config type.
  const privateKey = config.BUYER_PRIVATE_KEY as `0x${string}`;
  return new GatewayClient({
    chain: config.BUYER_CHAIN as SupportedChainName,
    privateKey,
  });
}

function toUsdcAtomic(formatted: string): bigint {
  const [whole = "0", frac = ""] = formatted.split(".");
  const padded = (frac + "000000").slice(0, 6);
  return BigInt(whole) * 1_000_000n + BigInt(padded);
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const isEntry =
  typeof process !== "undefined" &&
  typeof process.argv[1] === "string" &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isEntry) {
  runDepositGateway().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
