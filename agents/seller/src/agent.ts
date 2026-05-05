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

export interface SellerAgentRunResult {
  output: string;
  toolCalls: string[];
  iterations: number;
  /**
   * The most recent tool's parsed output (and tool name). Lets server-side
   * bridges project tool results into UI blocks without re-parsing the
   * tool-message string. Undefined when the agent answered without calling
   * any tool.
   */
  lastToolResult?: { name: string; value: unknown };
}

export interface SellerAgent {
  run(userMessage: string): Promise<SellerAgentRunResult>;
  readonly tools: ReadonlyArray<AgentTool<unknown, unknown>>;
}

export interface CreateSellerAgentDeps {
  llm: LlmAdapter;
  tools: ReadonlyArray<AgentTool<unknown, unknown>>;
  systemPrompt: string;
  maxIterations?: number;
  /**
   * Cap on tool calls per agent.run(). Distinct from `maxIterations` (which
   * also bounds final-answer turns). When `undefined`, only `maxIterations`
   * applies — preserves existing batch-loop behaviour.
   */
  maxToolCalls?: number;
}

export function createSellerAgent(deps: CreateSellerAgentDeps): SellerAgent {
  const cap = deps.maxIterations ?? MAX_AGENT_ITERATIONS;
  const toolCallCap = deps.maxToolCalls;
  const toolIndex = new Map(deps.tools.map((t) => [t.name, t]));

  return {
    tools: deps.tools,
    async run(userMessage): Promise<SellerAgentRunResult> {
      const history: Array<{ role: "user" | "assistant" | "tool"; content: string }> = [
        { role: "user", content: userMessage },
      ];
      const toolCalls: string[] = [];
      let lastToolResult: { name: string; value: unknown } | undefined;
      for (let i = 0; i < cap; i++) {
        const decision = await deps.llm.step({ system: deps.systemPrompt, messages: history });
        if (decision.final !== undefined) {
          return { output: decision.final, toolCalls, iterations: i + 1, lastToolResult };
        }
        if (!decision.toolCall) {
          throw new Error("LLM returned neither a tool call nor a final answer");
        }
        const tool = toolIndex.get(decision.toolCall.name);
        if (!tool) throw new Error(`Unknown tool: ${decision.toolCall.name}`);
        toolCalls.push(tool.name);
        if (toolCallCap !== undefined && toolCalls.length > toolCallCap) {
          throw new Error(`Tool-call cap exceeded (max=${toolCallCap})`);
        }
        const args = tool.inputSchema.parse(decision.toolCall.args);
        const out = await tool.invoke(args);
        const parsedOut = tool.outputSchema.parse(out);
        lastToolResult = { name: tool.name, value: parsedOut };
        history.push({
          role: "tool",
          content: JSON.stringify({ tool: tool.name, out: parsedOut }),
        });
      }
      return { output: "(iteration cap reached)", toolCalls, iterations: cap, lastToolResult };
    },
  };
}
