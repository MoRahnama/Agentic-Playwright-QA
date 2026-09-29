# Agentic Playwright QA

A Node.js learning project demonstrating how an AI model can choose safe browser actions and use Playwright to check a real website. The current target is the public [MoonOnTheMove drone gallery and flight log](https://moonthemove.top/).

## What happens

1. You give the agent a browser-testing goal.
2. Node.js sends the goal and a limited menu of browser tools to an OpenAI-compatible model.
3. The model chooses a tool, such as inspecting the page, selecting a gallery filter, or opening a media detail.
4. Node.js validates the request and Playwright performs the action in Chromium.
5. The resulting page snapshot or assertion result is returned to the model, which can choose another allowed action.
6. The agent reports what it observed. A claim from the model is not proof; check assertion results and run evidence.

This choose, act, observe, and repeat cycle is what makes the program agentic. The model makes decisions within the tools the program permits; it does not get arbitrary computer access.

## Safety boundary

- The browser is restricted to `https://moonthemove.top/` and a short list of same-page sections.
- Available actions are read-only: inspect public content, use gallery filters, open media details, select flight-location markers, and check page content.
- There is no form-filling tool. The agent is not permitted to log in, upload, edit, delete, contact anyone, submit forms, follow external links, or change persistent data.
- Visible page snapshots and your test objective are sent to the configured AI API provider. Use public content only. Do not place secrets, credentials, or private information in a test objective.
- The local screenshots, traces, and action logs are stored under the ignored `artifacts/` folder.

Do not use this starter against another origin or expand its allowed actions without reviewing the safety rules. A local or staging test target is preferable before any future testing that changes data.

## Requirements

- Node.js 20 or newer
- npm
- Chromium installed for Playwright
- An API key for an OpenAI-compatible API to run the LLM agent

## Setup

In PowerShell, from the project folder:

```powershell
npm install
npx playwright install chromium
Copy-Item .env.example .env
```

Set `OPENAI_API_KEY` in `.env`. Never commit or share this file. The default model is `gpt-4o-mini`; `OPENAI_BASE_URL` and `OPENAI_MODEL` can select a compatible provider and model.

## Run the agent

```powershell
npm run agent -- "Open the Flight Log section and verify that the map and its flight locations are visible"
```

The program opens the approved site in headless Chromium. Each successful run saves a screenshot, a Playwright trace, and a JSON action log to `artifacts/`. Review those files and the recorded assertions; the model's final summary alone is not a pass/fail result.

## Tests

Run deterministic unit tests without an API key or live-site traffic:

```powershell
npm test
```

Run the optional browser smoke test against the live public site:

```powershell
npm run test:site
```

The live test requires Chromium and an internet connection. It loads the homepage, checks headings and filters, opens and closes a media detail, and selects a flight-log marker. It does not call the AI API or modify site data.

## Project layout

```text
.github/copilot-instructions.md  Repository rules, including no automatic push
src/
  agent/                         Agent config, prompt, browser tools, and loop
  cli.js                         Browser launch and evidence capture
test/                            Local, deterministic unit tests
site-tests/                      Opt-in live website smoke test
artifacts/                       Generated evidence; ignored by Git
local-only/                      Personal notes; ignored by Git
```

`local-only/` is for personal learning material, not project documentation. It is excluded from Git so its contents will not be pushed with the repository.

## License

MIT. See [LICENSE](LICENSE).
