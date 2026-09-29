import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createAgentTools } from "../src/agent/tools.js";
import { createDemoServer } from "../src/server.js";

test("task board supports adding, completing, and filtering tasks", async (t) => {
  const server = createDemoServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const address = server.address();
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${address.port}`);

  await page.getByLabel("Task name").fill("Review release notes");
  await page.getByRole("button", { name: "Add task" }).click();
  await page.getByText("Review release notes", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Mark complete: Review release notes" }).click();
  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await page.getByText("Review release notes", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Active", exact: true }).click();
  await page.getByText("No tasks in this filter.").waitFor();

  const baseURL = `http://127.0.0.1:${address.port}`;
  const tools = createAgentTools(page, baseURL);
  await tools.execute("navigate", { path: "/" });
  await tools.execute("fill", { label: "Task name", value: "Agent-created task" });
  await tools.execute("click", { role: "button", name: "Add task" });
  assert.match(await tools.execute("assert_text", { text: "Agent-created task" }), /^PASS:/);
  await tools.execute("click", { role: "button", name: "Mark complete: Agent-created task" });
  assert.match(
    await tools.execute("assert_visible", { role: "button", name: "Mark active: Agent-created task" }),
    /^PASS:/
  );
  await assert.rejects(tools.execute("navigate", { path: "//example.org" }), /restricted to paths/);
});
