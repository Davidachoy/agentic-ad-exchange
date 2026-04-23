import pino, { type Logger } from "pino";

/**
 * Redaction list for every sensitive field name we're likely to see in an
 * auction/settlement context. CLAUDE.md forbids logging secrets; this is
 * the single enforcement point.
 */
const REDACT_PATHS = [
  "CIRCLE_ENTITY_SECRET",
  "CIRCLE_API_KEY",
  "GEMINI_API_KEY",
  "EVM_PRIVATE_KEY",
  "req.headers.authorization",
  "req.headers.cookie",
  "*.entitySecret",
  "*.apiKey",
  "*.privateKey",
  "*.authorization",
  "*.signature",
];

export function createLogger(level = "info"): Logger {
  return pino({
    level,
    redact: { paths: REDACT_PATHS, censor: "[redacted]" },
    serializers: { err: pino.stdSerializers.err },
  });
}

/**
 * Default logger, safe for import at module load. It reads nothing from
 * process.env directly — callers that want a configured level call
 * `createLogger(config.LOG_LEVEL)` with their own config.
 */
export const logger = createLogger();
