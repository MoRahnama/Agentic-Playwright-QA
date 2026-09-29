# Agentic Playwright QA

A small, runnable portfolio project demonstrating how an LLM agent can explore and test a web UI with Playwright. The model chooses from a narrow set of browser tools; Playwright performs the real UI interactions and checks.

## What it demonstrates

- Node.js ES modules and an OpenAI-compatible chat-completions client.
- Model-driven tool selection for navigating, inspecting, filling, clicking, and asserting.
- Playwright accessibility locators instead of brittle CSS selectors.
- A local demo app and a deterministic end-to-end test that needs no API key.
- Bounded agent turns, a small explicit tool allowlist, and same-origin navigation checks.
- Screenshot, trace, and JSON action log artifacts for each successful agent run.

The agent only tests the included local task board. It cannot execute model-generated code or navigate to arbitrary websites. This is a learning project, not a production autonomous-testing service.

## Requirements

- Node.js 20 or newer
- npm
- A Chromium browser installed for Playwright
- An API key for an OpenAI-compatible API to run the agent (not needed for deterministic tests)

## Setup

```powershell
npm install
npx playwright install chromium
Copy-Item .env.example .env
```

Set `OPENAI_API_KEY` in `.env`. Never commit `.env` or paste a real key into an issue or source file. The default model is `gpt-4o-mini`; change `OPENAI_MODEL` and, if needed, `OPENAI_BASE_URL` for a compatible provider.

## Try it

In one terminal, run the app:

```powershell
npm start
```

Open `http://127.0.0.1:4173` to explore it manually. In another terminal, run the agent:

```powershell
npm run agent -- "Add a task named Review release notes, mark it complete, and verify it appears in Completed"
```

The agent runner starts its own isolated demo server on `AGENT_PORT` (default `0`, which selects an available port), launches headless Chromium, and saves successful run evidence to `artifacts/`. The standalone server uses `PORT` (default `4173`). Stop a manually started demo server with Ctrl+C.

Run the API-key-free checks:

```powershell
npm test
```

Run the browser end-to-end test:

```powershell
npm run test:e2e
```

## Agent tool contract

| Tool | Purpose |
| --- | --- |
| `navigate` | Open a path on the local demo app only |
| `inspect_page` | Read the accessible page snapshot |
| `click` | Click by accessible role and exact name |
| `fill` | Fill by exact accessible label |
| `assert_text` | Confirm visible text on the page |
| `assert_visible` | Confirm a role/name locator is visible |

`MAX_AGENT_STEPS` limits model turns (default 16, maximum 40). Tool arguments are validated, action failures are returned to the model, and the run fails if the step limit is reached.

## Project layout

```text
src/
  agent/       Agent configuration, prompt, tool contract, and loop
  demo-app/    Local task-board target application
  cli.js       Agent runner and evidence capture
  server.js    Local-only static demo server
test/          Configuration, safety, and browser behavior tests
artifacts/     Generated run logs, screenshots, and Playwright traces (gitignored)
```

## Good next practice tasks

1. Add a `delete task` workflow and a deterministic test for it.
2. Add a seeded defect, such as a filter that displays the wrong task state, and see whether the agent catches it.
3. Add an explicit test plan output before the first browser action.
4. Add retry policy and a machine-readable pass/fail result based on assertions rather than the agent's final prose.
5. Compare two compatible models on the same task and record tool-call count and verified outcome.

## Limitations

The model may choose an inefficient path or fail to complete an ambiguous objective. A final language-model summary alone is not proof of success: inspect the action log, screenshot, trace, and assertion results. Never point this starter project at a production system or provide credentials for a site.

## License

MIT. See [LICENSE](LICENSE).
