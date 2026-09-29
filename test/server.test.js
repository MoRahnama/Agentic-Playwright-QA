import test from "node:test";
import assert from "node:assert/strict";
import { createDemoServer } from "../src/server.js";

test("serves the demo app and rejects unlisted routes", async (t) => {
  const server = createDemoServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const address = server.address();
  const baseURL = `http://127.0.0.1:${address.port}`;
  const home = await fetch(baseURL);
  assert.equal(home.status, 200);
  assert.match(home.headers.get("content-type"), /text\/html/);
  assert.match(home.headers.get("content-security-policy"), /default-src 'self'/);
  assert.match(await home.text(), /Task Board/);

  const script = await fetch(`${baseURL}/app.js`);
  assert.equal(script.status, 200);
  assert.match(await script.text(), /addEventListener\("submit"/);

  assert.equal((await fetch(`${baseURL}/missing`)).status, 404);
  assert.equal((await fetch(baseURL, { method: "POST" })).status, 404);
});
