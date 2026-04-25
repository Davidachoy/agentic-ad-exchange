import { createCircleClient } from "@ade/wallets";

import { createApp } from "./app.js";
import { buildBuyerWalletRouting, loadServerConfig } from "./config.js";
import { resolvePersonasFromEnv } from "./demo/runAgentAuction.js";
import { createLogger } from "./logger.js";

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
    buyerWalletRouting,
    demo: {
      exchangeUrl: `http://localhost:${config.PORT}`,
      sellerWallet: config.SELLER_WALLET_ADDRESS,
      personas,
      gemini,
    },
  });

  app.listen(config.PORT, () => {
    logger.info(
      {
        port: config.PORT,
        env: config.NODE_ENV,
        corsAllowOrigins: config.CORS_ALLOW_ORIGINS,
        personaWallets: buyerWalletRouting.size,
        demoEnabled: Boolean(gemini && config.SELLER_WALLET_ADDRESS && personas.length > 0),
      },
      "exchange_server_listening",
    );
  });
}

main();
