import "dotenv/config";

export const config = {
  // Circle Platform
  circleApiKey: process.env.CIRCLE_API_KEY!,
  circleEntitySecret: process.env.CIRCLE_ENTITY_SECRET!,

  // Developer-Controlled Wallets
  buyerWalletId: process.env.BUYER_WALLET_ID,
  buyerWalletAddress: process.env.BUYER_WALLET_ADDRESS,
  sellerWalletId: process.env.SELLER_WALLET_ID,
  sellerWalletAddress: process.env.SELLER_WALLET_ADDRESS,

  // Exchange server
  sellerEoaAddress: process.env.SELLER_EOA_ADDRESS,
  port: process.env.PORT ?? "3000",

  // Arc blockchain constants
  arcBlockchain: "ARC-TESTNET" as const,
  usdcContract: "0x3600000000000000000000000000000000000000",
  arcExplorerUrl: "https://testnet.arcscan.app",

  // x402 / Circle Gateway
  x402Network: process.env.X402_NETWORK ?? "eip155:5042002",
  circleFacilitatorUrl:
    process.env.CIRCLE_FACILITATOR_URL ?? "https://gateway-api-testnet.circle.com",

  // Buyer agent
  buyerChain: process.env.BUYER_CHAIN ?? "arcTestnet",
  buyerPrivateKey: process.env.BUYER_PRIVATE_KEY,
  exchangeUrl: process.env.EXCHANGE_URL ?? "http://localhost:3000",
} as const;
