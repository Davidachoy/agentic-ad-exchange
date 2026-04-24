import { MAX_AGENT_ITERATIONS } from "@ade/shared";

import type { AgentTool } from "./tools/types.js";

export interface LlmDecision<TOut = unknown> {
  toolCall?: { name: string; args: unknown };
  final?: TOut;
}

export interface LlmAdapter {
  step(input: {
    system: string;
    messages: Array<{ role: "user" | "assistant" | "tool"; content: string }>;
  }): Promise<LlmDecision<string>>;
}

export interface SellerAgent {
  run(userMessage: string): Promise<{ output: string; toolCalls: string[]; iterations: number }>;
  readonly tools: ReadonlyArray<AgentTool<unknown, unknown>>;
}

export interface CreateSellerAgentDeps {
  llm: LlmAdapter;
  tools: ReadonlyArray<AgentTool<unknown, unknown>>;
  systemPrompt: string;
  maxIterations?: number;
}

export function createSellerAgent(deps: CreateSellerAgentDeps): SellerAgent {
  const cap = deps.maxIterations ?? MAX_AGENT_ITERATIONS;
  const toolIndex = new Map(deps.tools.map((t) => [t.name, t]));

  return {
    tools: deps.tools,
    async run(userMessage) {
      const history: Array<{ role: "user" | "assistant" | "tool"; content: string }> = [
        { role: "user", content: userMessage },
      ];
      const toolCalls: string[] = [];
      for (let i = 0; i < cap; i++) {
        const decision = await deps.llm.step({ system: deps.systemPrompt, messages: history });
        if (decision.final !== undefined) {
          return { output: decision.final, toolCalls, iterations: i + 1 };
        }
        if (!decision.toolCall) {
          throw new Error("LLM returned neither a tool call nor a final answer");
        }
        const tool = toolIndex.get(decision.toolCall.name);
        if (!tool) throw new Error(`Unknown tool: ${decision.toolCall.name}`);
        toolCalls.push(tool.name);
        const args = tool.inputSchema.parse(decision.toolCall.args);
        const out = await tool.invoke(args);
        const parsedOut = tool.outputSchema.parse(out);
        history.push({
          role: "tool",
          content: JSON.stringify({ tool: tool.name, out: parsedOut }),
        });
      }
      return { output: "(iteration cap reached)", toolCalls, iterations: cap };
    },
  };
}
