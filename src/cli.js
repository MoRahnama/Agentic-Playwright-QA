import "dotenv/config";
import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { readAgentConfig } from "./agent/config.js";
import { runAgent } from "./agent/runner.js";
import { createDemoServer } from "./server.js";

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.removeListener("error", reject);
      resolve(server.address());
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

const task = process.argv.slice(2).join(" ").trim();
if (!task) {
  console.error('Usage: npm run agent -- "Add a task named Review release notes and mark it complete"');
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
    const server = createDemoServer();
    let browser;
    let context;
    let serverStarted = false;

    try {
      const address = await listen(server, config.port);
      serverStarted = true;
      const baseURL = `http://127.0.0.1:${address.port}`;
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext();
      await context.tracing.start({ screenshots: true, snapshots: true });
      const page = await context.newPage();
      await page.goto(baseURL, { waitUntil: "domcontentloaded" });
      const actions = [];
      console.log(`Agent testing local app at ${baseURL}`);
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

      await mkdir(path.join(projectDirectory, "..", "artifacts"), { recursive: true });
      const timestamp = new Date().toISOString().replaceAll(":", "-");
      const artifactsDirectory = path.join(projectDirectory, "..", "artifacts");
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
          await context.tracing.stop({ path: path.join(projectDirectory, "..", "artifacts", "failed-trace.zip") });
        } catch (traceError) {
          console.error(`Could not save failure trace: ${traceError.message}`);
        }
      }
    } finally {
      if (browser) await browser.close();
      if (serverStarted) await close(server);
    }
  }
}
