import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { createAgentTools, type AgentAction } from "./tools.js";
import { buildSystemPrompt } from "./prompts.js";

export interface RunAgentOptions {
  page: Parameters<typeof createAgentTools>[0];
  baseURL: string;
  task: string;
  apiKey: string;
  model: string;
  apiBaseURL?: string;
  maxSteps: number;
  onAction?: (action: AgentAction) => void;
}

export interface AgentRunResult {
  summary: string;
  steps: number;
}

export async function runAgent({
  page,
  baseURL,
  task,
  apiKey,
  model,
  apiBaseURL,
  maxSteps,
  onAction = () => {}
}: RunAgentOptions): Promise<AgentRunResult> {
  const client = new OpenAI({ apiKey, baseURL: apiBaseURL });
  const tools = createAgentTools(page, baseURL, onAction);
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt(baseURL) },
    { role: "user", content: task }
  ];

  for (let step = 1; step <= maxSteps; step += 1) {
    const response = await client.chat.completions.create({
      model,
      messages,
      tools: tools.definitions,
      tool_choice: "auto"
    });
    const message = response.choices[0]?.message;
    if (!message) throw new Error("The model returned an empty response.");
    messages.push(message);

    const calls = message.tool_calls ?? [];
    if (calls.length === 0) {
      return { summary: message.content ?? "Agent finished without a text summary.", steps: step };
    }

    for (const call of calls) {
      let result: string;
      const toolName = call.type === "function" ? call.function.name : "unknown";
      try {
        if (call.type !== "function") {
          throw new Error("The model requested an unsupported custom tool.");
        }
        const args: unknown = JSON.parse(call.function.arguments);
        if (!isToolArguments(args)) {
          throw new Error("Tool arguments must be a JSON object.");
        }
        result = await tools.execute(call.function.name, args);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result = `TOOL ERROR: ${message}`;
        onAction({ tool: toolName, error: message });
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }

  throw new Error(`Agent reached the ${maxSteps}-step limit before completing.`);
}

function isToolArguments(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
