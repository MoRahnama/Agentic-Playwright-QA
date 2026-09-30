import test from "node:test";
import assert from "node:assert/strict";
import { createAgentTools } from "../src/agent/tools.js";

interface MockCall {
  method: string;
  [key: string]: unknown;
}

function createMockPage(): { page: Parameters<typeof createAgentTools>[0]; calls: MockCall[] } {
  const calls: MockCall[] = [];
  return {
    calls,
    page: {
      getByRole(role: string, options: { name: string; exact: boolean }) {
        return {
          async click() {
            calls.push({ method: "click", role, ...options });
          },
          async waitFor() {
            calls.push({ method: "waitFor", role, ...options });
          }
        };
      },
      locator(selector: string) {
        return {
          async ariaSnapshot() {
            calls.push({ method: "ariaSnapshot", selector });
            return "Accessible page snapshot";
          },
          async innerText() {
            return "Gallery Flight Log";
          }
        };
      },
      async goto(url: string) {
        calls.push({ method: "goto", url });
        return undefined;
      }
    }
  };
}

test("offers only the read-only browser tools", () => {
  const { page } = createMockPage();
  const tools = createAgentTools(page, "https://moonthemove.top");
  assert.deepEqual(
    tools.definitions.map((tool) => tool.type === "function" ? tool.function.name : "unknown"),
    ["navigate", "inspect_page", "click", "assert_text", "assert_visible"]
  );
});

test("allows gallery and flight-log controls, but blocks writes and external links", async () => {
  const { page, calls } = createMockPage();
  const tools = createAgentTools(page, "https://moonthemove.top");

  await tools.execute("click", { role: "button", name: "Photos" });
  await tools.execute("click", { role: "button", name: "Open Lac aux Américains – Mountain Basin" });
  await tools.execute("click", { role: "button", name: "Close viewer" });
  await tools.execute("click", { role: "button", name: "Killarney Lake, 4 flights." });
  await tools.execute("click", { role: "link", name: "Flight Log" });

  await assert.rejects(tools.execute("click", { role: "button", name: "Upload media" }), /not an approved read-only control/);
  await assert.rejects(tools.execute("click", { role: "link", name: "Instagram" }), /not an approved read-only control/);
  assert.equal(calls.filter((call) => call.method === "click").length, 5);
});

test("inspects and checks visible page content", async () => {
  const { page } = createMockPage();
  const tools = createAgentTools(page, "https://moonthemove.top");
  assert.equal(await tools.execute("inspect_page", {}), "Accessible page snapshot");
  assert.match(await tools.execute("assert_text", { text: "Flight Log" }), /^PASS:/);
  await assert.rejects(tools.execute("assert_text", { text: "Missing section" }), /was not found/);
});
