import { randomUUID } from "node:crypto";

import type { SellerAgent } from "@ade/agent-seller";
import type {
  AssistantChatMessage,
  AssistantChatResponse,
  AssistantChatRole,
  DashboardAssistantContext,
} from "@ade/shared";
import { AssistantChatRequestSchema } from "@ade/shared";
import { Router } from "express";
import type { Logger } from "pino";

import { generateAssistantReply } from "../assistant/geminiReply.js";
import { generateSellerChatAgentReply } from "../assistant/sellerChatAgent.js";
import { createAssistantRateLimiter } from "../middleware/rateLimit.js";

export interface AssistantReplyShape {
  role: AssistantChatRole;
  mode?: string;
}

export type AssistantReplyGenerator = (
  messages: AssistantChatMessage[],
  context: DashboardAssistantContext,
  shape: AssistantReplyShape,
) => Promise<AssistantChatResponse>;

/**
 * Composer modes that fire seller tool calls (`listInventory`, `runAuction`).
 * Other modes (ask, configure_deal, block_buyer, analyze) stay on the
 * pure-Gemini text path.
 */
const SELLER_TOOL_MODES = new Set(["set_floor", "run_auction"]);

export interface AssistantRouterDeps {
  gemini: { apiKey: string; model: string } | null;
  rateLimitPerMin: number;
  /** Tests: bypass Gemini and return a fixed payload. */
  replyGenerator?: AssistantReplyGenerator;
  /**
   * Lazy factory for the seller chat agent. Invoked once per qualifying
   * request (role:seller AND mode in SELLER_TOOL_MODES) so the underlying
   * Gemini chat session is fresh per turn — agents/seller's adapter resets
   * on a new user-only history.
   *
   * Tests pass a fake `() => SellerAgent`; production wires
   * `createSellerChatAgentWithGemini`.
   */
  sellerChatAgentFactory?: () => SellerAgent;
  logger: Logger;
}

const DEFAULT_ASSISTANT_RL = 30;

/** Serialize Gemini so rapid consecutive assistant requests do not overlap generateContent. */
let assistantGenerationSerialTail: Promise<void> = Promise.resolve();

function runAssistantGenerationSerialised<T>(task: () => Promise<T>): Promise<T> {
  const run = assistantGenerationSerialTail.then(() => task());
  assistantGenerationSerialTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function createAssistantRouter(deps: AssistantRouterDeps): Router {
  const router = Router();
  const limit = createAssistantRateLimiter(deps.rateLimitPerMin || DEFAULT_ASSISTANT_RL);

  router.post("/assistant/chat", limit, async (req, res, next) => {
    const log = deps.logger.child({ route: "POST /assistant/chat" });
    try {
      const parsed = AssistantChatRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "invalid_request",
          code: "invalid_request" as const,
          details: parsed.error.flatten(),
        });
        return;
      }
      const { messages, context, role, mode } = parsed.data;
      const last = messages[messages.length - 1];
      if (!last || last.role !== "user") {
        res.status(400).json({ error: "last_message_must_be_user", code: "invalid_request" });
        return;
      }

      const useSellerChatAgent =
        !deps.replyGenerator &&
        deps.sellerChatAgentFactory != null &&
        role === "seller" &&
        mode != null &&
        SELLER_TOOL_MODES.has(mode);

      if (!deps.replyGenerator && !useSellerChatAgent && !deps.gemini) {
        log.debug("assistant_chat_skipped_gemini_not_configured");
        res.status(503).json({
          error: "assistant_unavailable",
          code: "gemini_not_configured" as const,
        });
        return;
      }

      const t0 = Date.now();
      const rid = randomUUID();
      const lastPreview =
        last.content.length > 140 ? `${last.content.slice(0, 140)}…` : last.content;
      log.info(
        {
          requestId: rid,
          messageTurns: messages.length,
          contextGeneratedAt: context.generatedAt,
          lastUserPreview: lastPreview,
          generator:
            deps.replyGenerator != null
              ? "stub"
              : useSellerChatAgent
                ? "seller-chat-agent"
                : "gemini",
          role,
          composerMode: mode,
        },
        "assistant_chat_start",
      );

      try {
        const geminiCfg = deps.gemini;
        const shape: AssistantReplyShape = { role, mode };
        const payload = await runAssistantGenerationSerialised(() => {
          if (deps.replyGenerator != null) {
            return deps.replyGenerator(messages, context, shape);
          }
          if (useSellerChatAgent) {
            const agent = deps.sellerChatAgentFactory!();
            return generateSellerChatAgentReply(agent, messages, context, shape);
          }
          return generateAssistantReply(
            { apiKey: geminiCfg!.apiKey, model: geminiCfg!.model, logger: deps.logger },
            messages,
            context,
            shape,
          );
        });
        log.info(
          {
            requestId: rid,
            durationMs: Date.now() - t0,
            replyChars: payload.reply.length,
            blockCount: payload.blocks?.length ?? 0,
          },
          "assistant_chat_ok",
        );
        res.json(payload);
      } catch (err) {
        log.warn(
          {
            err,
            requestId: rid,
            durationMs: Date.now() - t0,
            messageTurns: messages.length,
            lastUserPreview: lastPreview,
          },
          "assistant_chat_model_error",
        );
        res.status(502).json({ error: "model_error", code: "model_error" as const });
      }
    } catch (err) {
      next(err);
    }
  });

  return router;
}
