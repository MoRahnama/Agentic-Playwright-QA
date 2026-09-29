import test from "node:test";
import assert from "node:assert/strict";
import { readAgentConfig } from "../src/agent/config.js";
import { resolveLocalUrl } from "../src/agent/tools.js";

test("reads required and optional agent settings", () => {
  assert.deepEqual(readAgentConfig({
    OPENAI_API_KEY: " test-key ",
    PORT: "5000",
    MAX_AGENT_STEPS: "8",
    OPENAI_MODEL: "example-model"
  }), {
    apiKey: "test-key",
    baseURL: undefined,
    model: "example-model",
    port: 5000,
    maxSteps: 8
  });
});

test("rejects missing credentials and invalid limits", () => {
  assert.throws(() => readAgentConfig({}), /OPENAI_API_KEY is required/);
  assert.throws(() => readAgentConfig({ OPENAI_API_KEY: "key", PORT: "70000" }), /PORT must be an integer/);
  assert.throws(() => readAgentConfig({ OPENAI_API_KEY: "key", MAX_AGENT_STEPS: "41" }), /MAX_AGENT_STEPS must be an integer/);
});

test("allows only local-origin paths for browser navigation", () => {
  assert.equal(resolveLocalUrl("http://127.0.0.1:4173", "/"), "http://127.0.0.1:4173/");
  assert.throws(() => resolveLocalUrl("http://127.0.0.1:4173", "https://example.com"), /restricted to paths/);
  assert.throws(() => resolveLocalUrl("http://127.0.0.1:4173", "//example.com"), /restricted to paths/);
});
