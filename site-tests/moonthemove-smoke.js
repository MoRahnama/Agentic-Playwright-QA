import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

test("MoonOnTheMove exposes its gallery and flight log", async (t) => {
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto("https://moonthemove.top/", { waitUntil: "domcontentloaded" });

  await page.getByRole("heading", { name: "MoOnTheMove", exact: true }).waitFor();
  await page.getByRole("heading", { name: "Gallery", exact: true }).waitFor();
  await page.getByRole("heading", { name: "Flight Log", exact: true }).waitFor();

  for (const filter of ["All", "Photos", "Videos"]) {
    const button = page.getByRole("button", { name: filter, exact: true });
    await button.click();
    assert.equal(await button.getAttribute("aria-pressed"), "true");
  }

  await page.getByRole("button", { name: /^Open / }).first().click();
  await page.getByRole("dialog", { name: "Media viewer" }).waitFor();
  await page.getByRole("button", { name: "Close viewer", exact: true }).click();

  await page.getByRole("img", { name: /Map showing \d+ flight locations\./ }).waitFor();
  assert.ok(await page.getByRole("button", { name: /, \d+ flights?\.$/ }).count() > 0);
  await page.getByRole("button", { name: "Le Voile de la Mariée, 2 flights.", exact: true }).last().click();
  await page.getByRole("heading", { name: "Le Voile de la Mariée", exact: true }).waitFor();
});
