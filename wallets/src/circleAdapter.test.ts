import { describe, expect, it, vi } from "vitest";

import { ARC_TESTNET_USDC } from "@ade/shared";

import { buildAdapter, normalizeUsdcAmount } from "./circleAdapter.js";

describe("normalizeUsdcAmount", () => {
  it("passes through an already-canonical 6-decimal string (happy path)", () => {
    expect(normalizeUsdcAmount("0.100000")).toBe("0.100000");
    expect(normalizeUsdcAmount("5")).toBe("5.000000");
    expect(normalizeUsdcAmount("0.01")).toBe("0.010000");
  });

  it("truncates extra precision the Circle API sometimes returns (edge)", () => {
    // Regression: Circle occasionally returns 7+ decimals after transfers.
    // UsdcAmountSchema requires `\.\d{1,6}`, so we truncate deterministically.
    expect(normalizeUsdcAmount("0.1234567890")).toBe("0.123456");
    expect(normalizeUsdcAmount("0.000000123")).toBe("0.000000");
  });

  it("falls back to zero on empty / malformed / negative input (failure)", () => {
    expect(normalizeUsdcAmount(undefined)).toBe("0.000000");
    expect(normalizeUsdcAmount("")).toBe("0.000000");
    expect(normalizeUsdcAmount("not-a-number")).toBe("0.000000");
    expect(normalizeUsdcAmount("-1.23")).toBe("0.000000");
  });
});

describe("buildAdapter.createTransfer — explicit-tokenAddress path", () => {
  const makeClient = () => ({
    createWalletSet: vi.fn(),
    createWallets: vi.fn(),
    getWalletTokenBalance: vi.fn(),
    listTransactions: vi.fn(),
    getWallet: vi.fn().mockResolvedValue({ data: { wallet: { address: "0xBuyer" } } }),
    createTransaction: vi.fn().mockResolvedValue({ data: { id: "tx-99", state: "QUEUED" } }),
    getTransaction: vi.fn(),
  });

  it("passes ARC_TESTNET_USDC as tokenAddress to the Circle SDK (happy path)", async () => {
    const client = makeClient();
    // Reason: SdkClient is an opaque SDK type; cast to any to avoid importing the full SDK shape in tests.
    const adapter = buildAdapter(client as unknown as never);

    await adapter.createTransfer({
      walletId: "w-42",
      destinationAddress: "0xSeller",
      amountUsdc: "0.010000",
    });

    expect(client.createTransaction).toHaveBeenCalledOnce();
    const args = client.createTransaction.mock.calls[0][0] as Record<string, unknown>;
    expect(args.tokenAddress).toBe(ARC_TESTNET_USDC);
    expect(args.blockchain).toBe("ARC-TESTNET");
    expect(args.walletAddress).toBe("0xBuyer");
    expect(args.destinationAddress).toBe("0xSeller");
    expect(args.amount).toEqual(["0.010000"]);
  });

  it("throws when getWallet returns no address (failure)", async () => {
    const client = makeClient();
    client.getWallet.mockResolvedValue({ data: { wallet: {} } });
    const adapter = buildAdapter(client as unknown as never);

    await expect(
      adapter.createTransfer({ walletId: "w-bad", destinationAddress: "0xSeller", amountUsdc: "0.010000" }),
    ).rejects.toThrow("no wallet address");
  });
});
