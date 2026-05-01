import { createCircleClient } from "@ade/wallets";

import { createApp } from "./app.js";
import { buildBuyerWalletRouting, loadServerConfig } from "./config.js";
import { resolvePersonasFromEnv } from "./demo/runAgentAuction.js";
import { createLogger } from "./logger.js";
import { createGatewayAdapter, type GatewayMiddlewareAdapter } from "./middleware/nanopayments.js";

function main(): void {
  const config = loadServerConfig();
  const logger = createLogger(config.LOG_LEVEL);

  // Reason: Circle config (API key + entity secret) is optional at server start
  // so the server boots cleanly in dev without a funded wallet set. The auction
  // route returns status:"failed" receipts when circleClient is null.
  let circleClient = null;
  try {
    circleClient = createCircleClient({ env: process.env });
  } catch {
    logger.warn("Circle wallet config incomplete — POST /auction/run will store failed receipts");
  }

  let gateway: GatewayMiddlewareAdapter | undefined;
  if (config.SELLER_WALLET_ADDRESS) {
    gateway = createGatewayAdapter({
      sellerAddress: config.SELLER_WALLET_ADDRESS,
      facilitatorUrl: config.GATEWAY_FACILITATOR_URL,
    });
    logger.info({ sellerAddress: config.SELLER_WALLET_ADDRESS }, "gateway_nanopayments_enabled");
  } else {
    logger.warn("SELLER_WALLET_ADDRESS not set — POST /bid has no payment gate");
  }

  const buyerWalletRouting = buildBuyerWalletRouting(config);
  const personas = resolvePersonasFromEnv(process.env);
  const gemini = config.GEMINI_API_KEY
    ? { apiKey: config.GEMINI_API_KEY, model: config.GEMINI_MODEL }
    : undefined;

  const { app } = createApp({
    corsAllowOrigins: config.CORS_ALLOW_ORIGINS,
    bidRateLimitPerMin: config.BID_RATE_LIMIT_PER_MIN,
    circleClient,
    buyerWalletId: config.BUYER_WALLET_ID,
    gateway,
    buyerWalletRouting,
    demo: {
      exchangeUrl: `http://localhost:${config.PORT}`,
      personas,
      gemini,
      buyerPrivateKey: config.BUYER_PRIVATE_KEY as `0x${string}` | undefined,
      mode: config.DEMO_MODE,
    },
    autoClearDelayMs: config.AUCTION_AUTO_CLEAR_DELAY_MS,
    logger,
  });

  app.listen(config.PORT, () => {
    logger.info(
      {
        port: config.PORT,
        env: config.NODE_ENV,
        corsAllowOrigins: config.CORS_ALLOW_ORIGINS,
        gatewayEnabled: Boolean(gateway),
        personaWallets: buyerWalletRouting.size,
        demoEnabled: Boolean(gemini && personas.length > 0),
        demoMode: config.DEMO_MODE,
        autoClearDelayMs: config.AUCTION_AUTO_CLEAR_DELAY_MS,
      },
      "exchange_server_listening",
    );
  });
}

main();
