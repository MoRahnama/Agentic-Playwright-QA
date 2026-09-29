import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_TARGET_URL, readAgentConfig } from "../src/agent/config.js";
import { resolveTargetUrl } from "../src/agent/tools.js";

test("reads required and optional agent settings", () => {
  assert.deepEqual(readAgentConfig({
    OPENAI_API_KEY: " test-key ",
    MAX_AGENT_STEPS: "8",
    OPENAI_MODEL: "example-model"
  }), {
    apiKey: "test-key",
    baseURL: undefined,
    model: "example-model",
    targetURL: DEFAULT_TARGET_URL,
    maxSteps: 8
  });
});

test("rejects missing credentials and invalid limits", () => {
  assert.throws(() => readAgentConfig({}), /OPENAI_API_KEY is required/);
  assert.throws(() => readAgentConfig({ OPENAI_API_KEY: "key", MAX_AGENT_STEPS: "41" }), /MAX_AGENT_STEPS must be an integer/);
  assert.throws(() => readAgentConfig({ OPENAI_API_KEY: "key", TARGET_URL: "https://example.com/" }), /approved origin/);
  assert.throws(() => readAgentConfig({ OPENAI_API_KEY: "key", TARGET_URL: "http://moonthemove.top/" }), /approved origin/);
});

test("allows only approved same-site routes", () => {
  const origin = "https://moonthemove.top";
  assert.equal(resolveTargetUrl(origin, "/"), `${origin}/`);
  assert.equal(resolveTargetUrl(origin, "/#flight-log"), `${origin}/#flight-log`);
  assert.throws(() => resolveTargetUrl(origin, "https://example.com"), /approved sections/);
  assert.throws(() => resolveTargetUrl(origin, "//example.com"), /approved sections/);
  assert.throws(() => resolveTargetUrl("https://example.com", "/"), /approved MoonOnTheMove/);
});
