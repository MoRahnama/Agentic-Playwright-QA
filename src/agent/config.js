export const DEFAULT_MODEL = "gpt-4o-mini";
export const DEFAULT_MAX_STEPS = 16;

export function readAgentConfig(env = process.env) {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required. Copy .env.example to .env and add your API key.");
  }

  const port = Number(env.PORT ?? "4173");
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("PORT must be an integer from 0 to 65535.");
  }

  const maxSteps = Number(env.MAX_AGENT_STEPS ?? String(DEFAULT_MAX_STEPS));
  if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 40) {
    throw new Error("MAX_AGENT_STEPS must be an integer from 1 to 40.");
  }

  return {
    apiKey,
    baseURL: env.OPENAI_BASE_URL?.trim() || undefined,
    model: env.OPENAI_MODEL?.trim() || DEFAULT_MODEL,
    port,
    maxSteps
  };
}
