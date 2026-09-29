import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const appDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), "demo-app");
const assets = new Map([
  ["/", { file: "index.html", type: "text/html; charset=utf-8" }],
  ["/app.js", { file: "app.js", type: "text/javascript; charset=utf-8" }]
]);

export function createDemoServer() {
  return createServer(async (request, response) => {
    const asset = assets.get(new URL(request.url ?? "/", "http://localhost").pathname);

    if (!asset || request.method !== "GET") {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    try {
      const content = await readFile(path.join(appDirectory, asset.file));
      response.writeHead(200, {
        "content-type": asset.type,
        "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
        "x-content-type-options": "nosniff"
      });
      response.end(content);
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("Unable to load the demo application.");
      console.error("Failed to serve demo application:", error);
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number.parseInt(process.env.PORT ?? "4173", 10);
  const server = createDemoServer();

  server.listen(port, "127.0.0.1", () => {
    console.log(`Demo app listening at http://127.0.0.1:${port}`);
  });
}
