import { expect, test } from "@playwright/test";
import en from "../src/i18n/dictionaries/en";
import { fill } from "../src/i18n/config";
import { money } from "../src/lib/format";

for (const path of ["/en/privacy", "/en/terms", "/tr/privacy", "/en/how-to-add"]) {
  test(`${path} serves a readable page`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(main.getByRole("heading", { level: 1 })).toContainText(/\S/);
    await expect(main.locator("p").first()).toBeVisible();
    await expect(main.locator("p").first()).toContainText(/\S/);
  });
}

test("an unknown address shows a 404 and a working home link", async ({ page }) => {
  await page.goto("/en/bu-sayfa-yok");
  const main = page.getByRole("main");
  await expect(main.getByText("404", { exact: true })).toBeVisible();
  await expect(main.getByRole("heading", { level: 1 })).toHaveText(en.errors.notFoundTitle);
  await main.getByRole("link", { name: en.common.allItems, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/?$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("demo alerts offer both directions and explain the chosen target", async ({ page }) => {
  await page.goto("/en/products/9");
  await page.getByRole("link", { name: en.product.setAlert, exact: true }).click();
  const section = page.locator("#alert");
  const direction = section.getByRole("combobox", { name: en.alertForm.direction });
  await expect(direction).toHaveValue("below");
  await expect(direction.getByRole("option", { name: en.alertForm.atOrBelow, exact: true })).toHaveCount(1);
  await expect(direction.getByRole("option", { name: en.alertForm.atOrAbove, exact: true })).toHaveCount(1);

  for (const value of ["below", "above"] as const) {
    await direction.selectOption(value);
    await expect(direction).toHaveValue(value);
    await section.getByRole("textbox", { name: en.common.email, exact: true }).fill("smoke@example.com");
    await section.getByRole("spinbutton").fill("100");
    const responsePromise = page.waitForResponse(response => response.url().endsWith("/api/alerts") && response.request().method() === "POST");
    await section.getByRole("button", { name: en.alertForm.create, exact: true }).click();
    const response = await responsePromise;
    expect(response.ok()).toBe(true);
    expect(response.request().postDataJSON().direction).toBe(value);
    expect((await response.json()).demo).toBe(true);
    // The explanation is shown after submission, not when the select changes.
    await expect(section).toContainText(fill(value === "above" ? en.alertForm.willEmailAbove : en.alertForm.willEmail, {
      email: "smoke@example.com", price: money(100, "USD", "en"),
    }));
    if (value === "below") await section.getByRole("button", { name: en.alertForm.addAnother, exact: true }).click();
  }
});

test("a signed-out profile asks the visitor to sign in", async ({ page }) => {
  await page.goto("/en/profile");
  const signIn = page.getByRole("main").getByRole("link", { name: en.nav.signIn, exact: true });
  await expect(signIn).toBeVisible();
  await expect(signIn).toHaveAttribute("href", "/en/login?next=%2Fprofile");
  await signIn.click();
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fprofile$/);
});
