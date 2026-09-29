import type { ChatCompletionTool } from "openai/resources/chat/completions";

type AllowedRole =
  | "button"
  | "dialog"
  | "heading"
  | "img"
  | "link"
  | "list"
  | "listitem"
  | "navigation"
  | "paragraph"
  | "region";

type ClickableRole = "button" | "link";

export interface AgentAction {
  tool: string;
  path?: string;
  role?: string;
  name?: string;
  text?: string;
  error?: string;
}

type ActionReporter = (action: AgentAction) => void;
type ToolArguments = Record<string, unknown>;

interface BrowserPage {
  goto(url: string, options?: { waitUntil: "domcontentloaded" }): Promise<unknown>;
  getByRole(role: AllowedRole, options: { name: string; exact: true }): {
    click(options?: { timeout: number }): Promise<void>;
    waitFor(options: { state: "visible"; timeout: number }): Promise<void>;
  };
  locator(selector: string): {
    ariaSnapshot(): Promise<string>;
    innerText(): Promise<string>;
  };
}

const allowedRoles: ReadonlySet<string> = new Set([
  "button", "dialog", "heading", "img", "link", "list", "listitem",
  "navigation", "paragraph", "region"
]);
const allowedPaths = new Set(["/", "/#top", "/#gallery", "/#flight-log"]);
const allowedLinks = new Set(["Mo On The Move home", "Gallery", "Flight Log", "View Gallery"]);
const allowedButtons = new Set(["All", "Photos", "Videos", "Close viewer"]);

function requireString(value: unknown, field: string, maxLength = 500): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maxLength) {
    throw new Error(`${field} must be a non-empty string of at most ${maxLength} characters.`);
  }
  return value;
}

export function resolveTargetUrl(baseURL: string, path: string): string {
  requireString(path, "path", 2048);
  const base = new URL(baseURL);
  if (base.origin !== "https://moonthemove.top" || base.protocol !== "https:") {
    throw new Error("The browser is restricted to the approved MoonOnTheMove HTTPS origin.");
  }
  if (!allowedPaths.has(path)) {
    throw new Error("Navigation is restricted to approved sections of the MoonOnTheMove website.");
  }
  const target = new URL(path, baseURL);
  return target.toString();
}

export function createAgentTools(page: BrowserPage, baseURL: string, onAction: ActionReporter = () => {}) {
  const definitions: ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "navigate",
        description: "Open the approved MoonOnTheMove page or one of its gallery and flight-log sections.",
        parameters: {
          type: "object",
          properties: { path: { type: "string", description: "A same-origin path beginning with /" } },
          required: ["path"],
          additionalProperties: false
        }
      }
    },
    {
      type: "function",
      function: {
        name: "inspect_page",
        description: "Read the public page's accessible DOM snapshot to understand visible content and controls.",
        parameters: { type: "object", properties: {}, additionalProperties: false }
      }
    },
    {
      type: "function",
      function: {
        name: "click",
        description: "Click only a read-only gallery filter, media detail button, flight-location marker, or approved same-page section link.",
        parameters: {
          type: "object",
          properties: {
            role: { type: "string", enum: ["button", "link"] },
            name: { type: "string", description: "Exact accessible name of an approved read-only control" }
          },
          required: ["role", "name"],
          additionalProperties: false
        }
      }
    },
    {
      type: "function",
      function: {
        name: "assert_text",
        description: "Assert that the visible page contains the exact text provided; returns PASS or throws on failure.",
        parameters: {
          type: "object",
          properties: { text: { type: "string", description: "Exact visible text to verify" } },
          required: ["text"],
          additionalProperties: false
        }
      }
    },
    {
      type: "function",
      function: {
        name: "assert_visible",
        description: "Assert that an element with this accessible role and exact name is visible.",
        parameters: {
          type: "object",
          properties: {
            role: { type: "string", enum: [...allowedRoles] },
            name: { type: "string", description: "Exact accessible name" }
          },
          required: ["role", "name"],
          additionalProperties: false
        }
      }
    }
  ];

  async function execute(name: string, args: ToolArguments): Promise<string> {
    switch (name) {
      case "navigate": {
        const path = requireString(args.path, "path", 2048);
        const url = resolveTargetUrl(baseURL, path);
        await page.goto(url, { waitUntil: "domcontentloaded" });
        onAction({ tool: name, path });
        return `Opened ${new URL(url).pathname}${new URL(url).hash}`;
      }
      case "inspect_page": {
        const snapshot = await page.locator("body").ariaSnapshot();
        onAction({ tool: name });
        return snapshot.slice(0, 12000);
      }
      case "click": {
        const role = requireString(args.role, "role");
        const accessibleName = requireString(args.name, "name");
        if (!isClickableRole(role) || !isSafeClickTarget(role, accessibleName)) {
          throw new Error(`The ${role} "${accessibleName}" is not an approved read-only control.`);
        }
        await page.getByRole(role, { name: accessibleName, exact: true }).click({ timeout: 5000 });
        onAction({ tool: name, role, name: accessibleName });
        return `Clicked ${role} "${accessibleName}".`;
      }
      case "assert_text": {
        const text = requireString(args.text, "text");
        const bodyText = await page.locator("body").innerText();
        if (!bodyText.includes(text)) throw new Error(`Expected visible text was not found: "${text}".`);
        onAction({ tool: name, text });
        return `PASS: visible page contains "${text}".`;
      }
      case "assert_visible": {
        const role = requireString(args.role, "role");
        const accessibleName = requireString(args.name, "name");
        if (!isAllowedRole(role)) throw new Error(`Unsupported accessible role: ${role}`);
        await page.getByRole(role, { name: accessibleName, exact: true }).waitFor({ state: "visible", timeout: 5000 });
        onAction({ tool: name, role, name: accessibleName });
        return `PASS: ${role} "${accessibleName}" is visible.`;
      }
      default:
        throw new Error(`Unsupported tool: ${name}`);
    }
  }

  return { definitions, execute };
}

function isAllowedRole(role: string): role is AllowedRole {
  return allowedRoles.has(role);
}

function isClickableRole(role: string): role is ClickableRole {
  return role === "button" || role === "link";
}

function isSafeClickTarget(role: ClickableRole, name: string): boolean {
  if (role === "link") return allowedLinks.has(name);
  return allowedButtons.has(name) || name.startsWith("Open ") || /^[^,]+, \d+ flights?\.$/.test(name);
}
