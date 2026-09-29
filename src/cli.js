import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { readAgentConfig } from "./agent/config.js";
import { runAgent } from "./agent/runner.js";

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

const task = process.argv.slice(2).join(" ").trim();
if (!task) {
  console.error('Usage: npm run agent -- "Open the Flight Log section and verify the map is visible"');
  process.exitCode = 2;
} else {
  let config;
  try {
    config = readAgentConfig();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }

  if (config) {
    let browser;
    let context;

    try {
      const baseURL = new URL(config.targetURL).origin;
      const artifactsDirectory = path.join(projectDirectory, "..", "artifacts");
      await mkdir(artifactsDirectory, { recursive: true });
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext();
      await context.tracing.start({ screenshots: true, snapshots: true });
      const page = await context.newPage();
      await page.goto(config.targetURL, { waitUntil: "domcontentloaded" });
      const actions = [];
      console.log(`Agent testing approved public site at ${config.targetURL}`);
      console.log(`Objective: ${task}`);

      const result = await runAgent({
        page,
        baseURL,
        task,
        apiKey: config.apiKey,
        model: config.model,
        apiBaseURL: config.baseURL,
        maxSteps: config.maxSteps,
        onAction: (action) => {
          actions.push({ at: new Date().toISOString(), ...action });
          console.log(`  ${action.tool}${action.error ? ` — ERROR: ${action.error}` : ""}`);
        }
      });
      const timestamp = new Date().toISOString().replaceAll(":", "-");
      await page.screenshot({ path: path.join(artifactsDirectory, `run-${timestamp}.png`), fullPage: true });
      await context.tracing.stop({ path: path.join(artifactsDirectory, `trace-${timestamp}.zip`) });
      context = undefined;
      await writeFile(
        path.join(artifactsDirectory, `run-${timestamp}.json`),
        `${JSON.stringify({ task, baseURL, model: config.model, result, actions }, null, 2)}\n`
      );
      console.log(`\nAgent summary: ${result.summary}`);
      console.log(`Completed in ${result.steps} model turn(s). Run evidence saved under artifacts/.`);
    } catch (error) {
      console.error(`Agent run failed: ${error.message}`);
      process.exitCode = 1;
      if (context) {
        try {
          const timestamp = new Date().toISOString().replaceAll(":", "-");
          await context.tracing.stop({ path: path.join(projectDirectory, "..", "artifacts", `failed-trace-${timestamp}.zip`) });
        } catch (traceError) {
          console.error(`Could not save failure trace: ${traceError.message}`);
        }
      }
    } finally {
      if (browser) await browser.close();
    }
  }
}
