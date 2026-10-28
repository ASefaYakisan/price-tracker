import { expect, test } from "@playwright/test";

test("home page opens and lists the demo products", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Bitcoin (BTC)" }).first()).toBeVisible();
});

test("home page has no horizontal overflow on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/en");
  await expect(page.getByRole("link", { name: "Bitcoin (BTC)" }).first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("product page opens from the list with its price chart", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("link", { name: "Bitcoin (BTC)" }).first().click();
  await expect(page).toHaveURL(/\/en\/products\/9$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Bitcoin (BTC)");
  await expect(page.locator("svg[role=img]").first()).toBeVisible();
});
