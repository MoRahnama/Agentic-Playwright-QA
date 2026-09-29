import { expect, test } from "@playwright/test";

test("gallery filters, media details, and flight-log locations work", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "MoOnTheMove", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gallery", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Flight Log", exact: true })).toBeVisible();

  const photosFilter = page.getByRole("button", { name: "Photos", exact: true });
  await photosFilter.click();
  await expect(photosFilter).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Open Cap-Chat – Sunset Coast Motion", exact: true })).toHaveCount(0);

  const videosFilter = page.getByRole("button", { name: "Videos", exact: true });
  await videosFilter.click();
  await expect(videosFilter).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Open Cap-Chat – Sunset Coast Motion", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.getByRole("button", { name: /^Open / }).first().click();
  await expect(page.getByRole("dialog", { name: "Media viewer" })).toBeVisible();
  await page.getByRole("button", { name: "Close viewer", exact: true }).click();

  await expect(page.getByRole("img", { name: /Map showing \d+ flight locations\./ })).toBeVisible();
  await page.getByRole("button", { name: "Le Voile de la Mariée, 2 flights.", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: "Le Voile de la Mariée", exact: true })).toBeVisible();
});
