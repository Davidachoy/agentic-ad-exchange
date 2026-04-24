import { Eip3009NonceSchema, GATEWAY_WALLET_ADDRESS, WalletAddressSchema } from "@ade/shared";
import { z } from "zod";

import type { NonceStore } from "../nonces/store.js";

/**
 * EIP-3009 (TransferWithAuthorization) typed-data builder.
 *
 * We only construct the EIP-712 payload here; signing is a separate concern
 * held by wallets/ (or, later, Circle's signer). This keeps the server free
 * of any private-key material and matches PLANNING.md § Trust Model.
 *
 * TODO(post-scaffold): plug an actual signer + chainId check against
 * config.ARC_CHAIN_ID and verifyingContract = USDC on Arc (not Gateway).
 */
export const AuthorizationArgsSchema = z.object({
  from: WalletAddressSchema,
  to: WalletAddressSchema,
  valueUsdcAtomic: z.string().regex(/^\d+$/, "must be integer atomic USDC units"),
  validAfter: z.number().int().nonnegative(),
  validBefore: z.number().int().positive(),
  nonce: Eip3009NonceSchema,
  chainId: z.number().int().positive(),
  verifyingContract: WalletAddressSchema,
});
export type AuthorizationArgs = z.infer<typeof AuthorizationArgsSchema>;

export interface Eip3009TypedData {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  primaryType: "TransferWithAuthorization";
  types: {
    EIP712Domain: { name: string; type: string }[];
    TransferWithAuthorization: { name: string; type: string }[];
  };
  message: {
    from: string;
    to: string;
    value: string;
    validAfter: number;
    validBefore: number;
    nonce: string;
  };
}

/**
 * Build the EIP-712 typed-data object for a USDC TransferWithAuthorization
 * per the EIP-3009 spec (https://eips.ethereum.org/EIPS/eip-3009).
 *
 * The shape is deterministic: same args → exact same output. That makes
 * `buildTypedData` easy to test without a private key.
 */
export function buildTypedData(args: AuthorizationArgs): Eip3009TypedData {
  const parsed = AuthorizationArgsSchema.parse(args);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (parsed.validBefore <= nowSeconds) {
    throw new Error("validBefore must be in the future");
  }
  if (parsed.validAfter > nowSeconds) {
    // Not fatal — authorization is valid later — but warn via throw to keep callers honest.
    // Reason: for a scaffold test harness we surface this as an error so tests fail loudly.
    throw new Error("validAfter must be <= now (authorization not yet valid)");
  }
  return {
    domain: {
      name: "USD Coin",
      version: "2",
      chainId: parsed.chainId,
      verifyingContract: parsed.verifyingContract,
    },
    primaryType: "TransferWithAuthorization",
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    message: {
      from: parsed.from,
      to: parsed.to,
      value: parsed.valueUsdcAtomic,
      validAfter: parsed.validAfter,
      validBefore: parsed.validBefore,
      nonce: parsed.nonce,
    },
  };
}

/**
 * Reserve a nonce before accepting an authorization.
 * Returns false if the nonce was already claimed (replay).
 */
export async function reserveNonce(
  store: NonceStore,
  depositor: string,
  nonce: string,
): Promise<boolean> {
  return store.claim(depositor, nonce);
}

/** The Gateway Wallet contract — the on-chain `from` at settlement time. */
export const GATEWAY_CONTRACT = GATEWAY_WALLET_ADDRESS;
