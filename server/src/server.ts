import { createApp } from "./app.js";
import { loadServerConfig } from "./config.js";
import { createLogger } from "./logger.js";

function main(): void {
  const config = loadServerConfig();
  const logger = createLogger(config.LOG_LEVEL);
  const { app } = createApp({
    corsAllowOrigins: config.CORS_ALLOW_ORIGINS,
    bidRateLimitPerMin: config.BID_RATE_LIMIT_PER_MIN,
  });

  app.listen(config.PORT, () => {
    logger.info(
      {
        port: config.PORT,
        env: config.NODE_ENV,
        corsAllowOrigins: config.CORS_ALLOW_ORIGINS,
      },
      "exchange_server_listening",
    );
  });
}

main();
