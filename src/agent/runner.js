import OpenAI from "openai";
import { createAgentTools } from "./tools.js";
import { buildSystemPrompt } from "./prompts.js";

export async function runAgent({ page, baseURL, task, apiKey, model, apiBaseURL, maxSteps, onAction = () => {} }) {
  const client = new OpenAI({ apiKey, baseURL: apiBaseURL });
  const tools = createAgentTools(page, baseURL, onAction);
  const messages = [
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
      if (call.type !== "function") throw new Error("The model requested an unsupported tool type.");
      let result;
      try {
        const args = JSON.parse(call.function.arguments);
        result = await tools.execute(call.function.name, args);
      } catch (error) {
        result = `TOOL ERROR: ${error.message}`;
        onAction({ tool: call.function.name, error: error.message });
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }

  throw new Error(`Agent reached the ${maxSteps}-step limit before completing.`);
}
