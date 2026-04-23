import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { config } from "../config.js";

const client = initiateDeveloperControlledWalletsClient({
  apiKey: config.circleApiKey,
  entitySecret: config.circleEntitySecret,
});

export async function transferUSDC(
  senderAddress: string,
  destinationAddress: string,
  amountUsdc: string
) {
  const response = await client.createTransaction({
    amount: [amountUsdc],
    destinationAddress,
    tokenAddress: config.usdcContract,
    blockchain: config.arcBlockchain,
    walletAddress: senderAddress,
    fee: {
      type: "level",
      config: { feeLevel: "MEDIUM" },
    },
  });

  const txId = (response.data as any)?.id;
  console.log("TX ID:", txId);
  return txId as string;
}

export async function getBalance(walletId: string) {
  const response = await client.getWalletTokenBalance({ id: walletId });
  return response.data?.tokenBalances;
}

export async function waitForTx(txId: string, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const tx = (await client.getTransaction({ id: txId })).data?.transaction;
    if (tx?.state === "COMPLETE") return tx;
    if (tx?.state === "FAILED") throw new Error(`TX failed: ${txId}`);
    console.log(`  [${i + 1}/${maxAttempts}] state: ${tx?.state}`);
  }
  throw new Error("TX timeout");
}
