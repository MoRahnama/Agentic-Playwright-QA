export const DEFAULT_MODEL = "gpt-4o-mini";
export const DEFAULT_MAX_STEPS = 16;
export const DEFAULT_TARGET_URL = "https://moonthemove.top/";
const ALLOWED_TARGET_ORIGIN = "https://moonthemove.top";

export function readAgentConfig(env = process.env) {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required. Copy .env.example to .env and add your API key.");
  }

  const targetURL = env.TARGET_URL?.trim() || DEFAULT_TARGET_URL;
  let parsedTarget;
  try {
    parsedTarget = new URL(targetURL);
  } catch {
    throw new Error("TARGET_URL must be a valid URL.");
  }
  if (parsedTarget.origin !== ALLOWED_TARGET_ORIGIN || parsedTarget.username || parsedTarget.password) {
    throw new Error(`TARGET_URL must use the approved origin ${ALLOWED_TARGET_ORIGIN}.`);
  }

  if (parsedTarget.pathname !== "/" || parsedTarget.search || parsedTarget.hash) {
    throw new Error("TARGET_URL must be the approved website's root URL.");
  }

  const maxSteps = Number(env.MAX_AGENT_STEPS ?? String(DEFAULT_MAX_STEPS));
  if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 40) {
    throw new Error("MAX_AGENT_STEPS must be an integer from 1 to 40.");
  }

  return {
    apiKey,
    baseURL: env.OPENAI_BASE_URL?.trim() || undefined,
    model: env.OPENAI_MODEL?.trim() || DEFAULT_MODEL,
    targetURL: parsedTarget.toString(),
    maxSteps
  };
}
