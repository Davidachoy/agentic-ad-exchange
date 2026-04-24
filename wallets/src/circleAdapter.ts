import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

import type { CircleSdkAdapter } from "./circle.js";
import type { WalletsConfig } from "./config.js";

/**
 * The DCW blockchain identifier used by every call in this adapter. Demo
 * settlements run only on Arc testnet — mainnet actions must go through a
 * dedicated PRP + CONFIRM_MAINNET escape hatch (see scripts/src/config.ts).
 */
const ARC_BLOCKCHAIN = "ARC-TESTNET" as const;

type SdkClient = ReturnType<typeof initiateDeveloperControlledWalletsClient>;

/**
 * Real Circle-SDK-backed adapter. Every method maps SDK response shape to the
 * zod-parsed adapter shape consumed by `createCircleClient`. Callers never
 * see a `response.data.*` shape — the zod parse in `circle.ts` enforces it.
 */
export function createRealCircleSdk(config: WalletsConfig): CircleSdkAdapter {
  const client = initiateDeveloperControlledWalletsClient({
    apiKey: config.CIRCLE_API_KEY,
    entitySecret: config.CIRCLE_ENTITY_SECRET,
  });
  return buildAdapter(client);
}

export function buildAdapter(client: SdkClient): CircleSdkAdapter {
  return {
    async createWalletSet({ name }) {
      const response = await client.createWalletSet({ name });
      const walletSetId = response.data?.walletSet?.id;
      if (!walletSetId) {
        throw new Error("Circle createWalletSet returned no walletSet.id");
      }
      return { walletSetId };
    },

    async createWallet({ walletSetId, blockchain }) {
      const response = await client.createWallets({
        walletSetId,
        // Reason: SDK types restrict blockchain to a string enum; caller
        // has been validated upstream. Cast keeps the adapter signature
        // agnostic of the SDK's Blockchain union.
        blockchains: [blockchain as unknown as never],
        count: 1,
        accountType: "EOA",
      });
      const wallet = response.data?.wallets?.[0];
      if (!wallet?.id || !wallet?.address) {
        throw new Error("Circle createWallets returned no wallet");
      }
      return {
        walletId: wallet.id,
        address: wallet.address,
        blockchain: wallet.blockchain ?? blockchain,
      };
    },

    async getWalletBalance({ walletId }) {
      const response = await client.getWalletTokenBalance({ id: walletId });
      const balances = response.data?.tokenBalances ?? [];
      const usdc = balances.find((b) => (b.token?.symbol ?? "").toUpperCase() === "USDC");
      return {
        walletId,
        usdc: normalizeUsdcAmount(usdc?.amount),
        asOf: new Date().toISOString(),
      };
    },

    async listTransactions({ walletId }) {
      const response = await client.listTransactions({ walletIds: [walletId] });
      const txs = response.data?.transactions ?? [];
      return txs.map((tx) => ({
        transactionId: tx.id,
        txHash: tx.txHash,
        status: mapStatus(tx.state),
      }));
    },

    async createTransfer({ walletId, destinationAddress, amountUsdc }) {
      // Resolve walletAddress from walletId so we can call the SDK via the
      // walletAddress + blockchain path, which per PRP Assumption #3 accepts
      // an implicit USDC token on ARC-TESTNET (no tokenAddress required).
      const walletResp = await client.getWallet({ id: walletId });
      const walletAddress = walletResp.data?.wallet?.address;
      if (!walletAddress) {
        throw new Error(`Circle getWallet(${walletId}) returned no wallet address`);
      }
      const response = await client.createTransaction({
        amount: [amountUsdc],
        destinationAddress,
        walletAddress,
        blockchain: ARC_BLOCKCHAIN,
        fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      });
      const id = response.data?.id;
      if (!id) {
        throw new Error("Circle createTransaction returned no transaction id");
      }
      return { transactionId: id, status: mapStatus(response.data?.state) };
    },

    async getTransaction({ transactionId }) {
      const response = await client.getTransaction({ id: transactionId });
      const tx = response.data?.transaction;
      if (!tx?.id) {
        throw new Error(`Circle getTransaction(${transactionId}) returned no transaction`);
      }
      return {
        transactionId: tx.id,
        txHash: tx.txHash,
        state: tx.state,
        blockchain: tx.blockchain,
      };
    },
  };
}

/**
 * Coerce whatever Circle returns for `tokenBalances[].amount` into the
 * `^\d+(?:\.\d{1,6})?$` shape that `UsdcAmountSchema` (shared) expects.
 * Reason: the SDK sometimes returns more than 6 fractional digits or
 * scientific notation on long-tail token accounts — both would make the
 * downstream zod parse throw, which breaks `getBalance` entirely.
 */
export function normalizeUsdcAmount(raw: string | undefined | null): string {
  const s = (raw ?? "").trim();
  if (!s) return "0.000000";
  // Scientific notation → fixed-point via Number (demo-scale; sub-cent precision is enough).
  const source = /[eE]/.test(s) ? toFixedFromScientific(s) : s;
  if (source.startsWith("-")) return "0.000000";
  const unsigned = source.startsWith("+") ? source.slice(1) : source;
  const [wholeRaw, fracRaw = ""] = unsigned.split(".");
  const whole = wholeRaw && /^\d+$/.test(wholeRaw) ? wholeRaw.replace(/^0+(?=\d)/, "") : "0";
  if (fracRaw && !/^\d*$/.test(fracRaw)) return `${whole || "0"}.000000`;
  const frac = (fracRaw + "000000").slice(0, 6);
  return `${whole || "0"}.${frac}`;
}

function toFixedFromScientific(s: string): string {
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return "0";
  return n.toFixed(6);
}

/**
 * Collapse the DCW state set to the TransactionRefSchema's 4-value enum.
 * Reason: `TransactionRefSchema` predates this adapter and covers the
 * `transfer` + `listTransactions` surfaces; richer state reporting is
 * available via `waitForTx` + `TransactionReceiptSchema`.
 */
function mapStatus(state: string | undefined): "queued" | "sent" | "confirmed" | "failed" {
  switch (state) {
    case "COMPLETE":
    case "CONFIRMED":
    case "CLEARED":
      return "confirmed";
    case "SENT":
    case "INITIATED":
      return "sent";
    case "FAILED":
    case "CANCELLED":
    case "DENIED":
    case "STUCK":
      return "failed";
    case "QUEUED":
    default:
      return "queued";
  }
}
