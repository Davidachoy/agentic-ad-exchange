import type {
  AssistantChatMessage,
  AssistantChatResponse,
  DashboardAssistantContext,
} from "@ade/shared";
import { AssistantChatRequestSchema } from "@ade/shared";
import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { Logger } from "pino";

import { generateAssistantReply } from "../assistant/geminiReply.js";
import { createAssistantRateLimiter } from "../middleware/rateLimit.js";

export type AssistantReplyGenerator = (
  messages: AssistantChatMessage[],
  context: DashboardAssistantContext,
) => Promise<AssistantChatResponse>;

export interface AssistantRouterDeps {
  gemini: { apiKey: string; model: string } | null;
  rateLimitPerMin: number;
  /** Tests: bypass Gemini and return a fixed payload. */
  replyGenerator?: AssistantReplyGenerator;
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
      const { messages, context } = parsed.data;
      const last = messages[messages.length - 1];
      if (!last || last.role !== "user") {
        res.status(400).json({ error: "last_message_must_be_user", code: "invalid_request" });
        return;
      }

      if (!deps.replyGenerator && !deps.gemini) {
        log.debug("assistant_chat_skipped_gemini_not_configured");
        res.status(503).json({
          error: "assistant_unavailable",
          code: "gemini_not_configured" as const,
        });
        return;
      }

      const t0 = Date.now();
      const rid = randomUUID();
      const lastPreview = last.content.length > 140 ? `${last.content.slice(0, 140)}…` : last.content;
      log.info(
        {
          requestId: rid,
          messageTurns: messages.length,
          contextGeneratedAt: context.generatedAt,
          lastUserPreview: lastPreview,
          mode: deps.replyGenerator != null ? "stub" : "gemini",
        },
        "assistant_chat_start",
      );

      try {
        const geminiCfg = deps.gemini;
        const payload = await runAssistantGenerationSerialised(() =>
          deps.replyGenerator != null
            ? deps.replyGenerator(messages, context)
            : generateAssistantReply(
                { apiKey: geminiCfg!.apiKey, model: geminiCfg!.model, logger: deps.logger },
                messages,
                context,
              ),
        );
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
