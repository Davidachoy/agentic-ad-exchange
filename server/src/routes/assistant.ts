import { AssistantChatRequestSchema } from "@ade/shared";
import { Router } from "express";

import { generateAssistantReply } from "../assistant/geminiReply.js";
import { createAssistantRateLimiter } from "../middleware/rateLimit.js";

export interface AssistantRouterDeps {
  gemini: { apiKey: string; model: string } | null;
  rateLimitPerMin: number;
}

const DEFAULT_ASSISTANT_RL = 30;

export function createAssistantRouter(deps: AssistantRouterDeps): Router {
  const router = Router();
  const limit = createAssistantRateLimiter(deps.rateLimitPerMin || DEFAULT_ASSISTANT_RL);

  router.post("/assistant/chat", limit, async (req, res, next) => {
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

      if (!deps.gemini) {
        res.status(503).json({
          error: "assistant_unavailable",
          code: "gemini_not_configured" as const,
        });
        return;
      }

      try {
        const reply = await generateAssistantReply(deps.gemini, messages, context);
        res.json({ reply });
      } catch {
        res.status(502).json({ error: "model_error", code: "model_error" as const });
      }
    } catch (err) {
      next(err);
    }
  });

  return router;
}
