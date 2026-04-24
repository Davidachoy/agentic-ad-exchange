import { MAX_AGENT_ITERATIONS } from "@ade/shared";

import type { AgentTool } from "./tools/types.js";

/**
 * Minimal tool-calling loop. A later PRP swaps this for a real LangGraph
 * `StateGraph` with recursionLimit = MAX_AGENT_ITERATIONS. The iteration cap
 * is enforced here so scaffolded behavior already respects CLAUDE.md.
 */
export interface LlmDecision<TOut = unknown> {
  /** If present, the agent wants to call this tool with these args. */
  toolCall?: { name: string; args: unknown };
  /** If present, the agent is done and this is the final answer. */
  final?: TOut;
}

export interface LlmAdapter {
  /** One LLM turn: receive history, return either a tool call or a final answer. */
  step(input: {
    system: string;
    messages: Array<{ role: "user" | "assistant" | "tool"; content: string }>;
  }): Promise<LlmDecision<string>>;
}

export interface BuyerAgent {
  run(userMessage: string): Promise<{ output: string; toolCalls: string[]; iterations: number }>;
  readonly tools: ReadonlyArray<AgentTool<unknown, unknown>>;
}

export interface CreateBuyerAgentDeps {
  llm: LlmAdapter;
  tools: ReadonlyArray<AgentTool<unknown, unknown>>;
  systemPrompt: string;
  /** Override for tests. Defaults to MAX_AGENT_ITERATIONS (5). */
  maxIterations?: number;
}

export function createBuyerAgent(deps: CreateBuyerAgentDeps): BuyerAgent {
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
        if (!tool) {
          throw new Error(`Unknown tool: ${decision.toolCall.name}`);
        }
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
