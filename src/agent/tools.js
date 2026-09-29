const allowedRoles = new Set([
  "button", "checkbox", "heading", "link", "list", "listitem", "navigation",
  "paragraph", "radio", "textbox"
]);

function requireString(value, field, maxLength = 500) {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maxLength) {
    throw new Error(`${field} must be a non-empty string of at most ${maxLength} characters.`);
  }
  return value;
}

export function resolveLocalUrl(baseURL, path) {
  requireString(path, "path", 2048);
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("Navigation is restricted to paths on the local demo app.");
  }
  const target = new URL(path, baseURL);
  if (target.origin !== new URL(baseURL).origin) {
    throw new Error("Navigation is restricted to the local demo app origin.");
  }
  return target.toString();
}

export function createAgentTools(page, baseURL, onAction = () => {}) {
  const definitions = [
    {
      type: "function",
      function: {
        name: "navigate",
        description: "Open a path within the local demo app. Use '/' to open the task board.",
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
        description: "Read the current page's accessible DOM snapshot to understand visible content and controls.",
        parameters: { type: "object", properties: {}, additionalProperties: false }
      }
    },
    {
      type: "function",
      function: {
        name: "click",
        description: "Click one visible control identified by its accessible role and exact accessible name.",
        parameters: {
          type: "object",
          properties: {
            role: { type: "string", enum: [...allowedRoles] },
            name: { type: "string", description: "Exact accessible name of the control" }
          },
          required: ["role", "name"],
          additionalProperties: false
        }
      }
    },
    {
      type: "function",
      function: {
        name: "fill",
        description: "Fill a form control identified by its exact accessible label.",
        parameters: {
          type: "object",
          properties: {
            label: { type: "string", description: "Exact accessible label" },
            value: { type: "string", description: "Text to enter, up to 500 characters" }
          },
          required: ["label", "value"],
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

  async function execute(name, args) {
    switch (name) {
      case "navigate": {
        const url = resolveLocalUrl(baseURL, args.path);
        await page.goto(url, { waitUntil: "domcontentloaded" });
        onAction({ tool: name, path: args.path });
        return `Opened ${new URL(url).pathname}`;
      }
      case "inspect_page": {
        const snapshot = await page.locator("body").ariaSnapshot();
        onAction({ tool: name });
        return snapshot.slice(0, 12000);
      }
      case "click": {
        const role = requireString(args.role, "role");
        const accessibleName = requireString(args.name, "name");
        if (!allowedRoles.has(role)) throw new Error(`Unsupported accessible role: ${role}`);
        await page.getByRole(role, { name: accessibleName, exact: true }).click({ timeout: 5000 });
        onAction({ tool: name, role, name: accessibleName });
        return `Clicked ${role} "${accessibleName}".`;
      }
      case "fill": {
        const label = requireString(args.label, "label");
        const value = requireString(args.value, "value", 500);
        await page.getByLabel(label, { exact: true }).fill(value, { timeout: 5000 });
        onAction({ tool: name, label });
        return `Filled "${label}".`;
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
        if (!allowedRoles.has(role)) throw new Error(`Unsupported accessible role: ${role}`);
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
