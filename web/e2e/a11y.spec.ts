import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const width of [1280, 390]) {
  for (const theme of ["light", "dark"] as const) {
    test.describe(`${width}px ${theme}`, () => {
      test.use({ viewport: { width, height: 900 }, colorScheme: theme });
      for (const path of [
        "/en", "/en/login", "/en/products/9", "/en/alerts",
        "/en/privacy", "/en/terms", "/en/how-to-add", "/ar", "/ar/privacy",
      ]) {
        test(path, async ({ page }) => {
          await page.goto(path);
          await expect(page.locator("main")).toBeVisible();
          await page.evaluate(() => document.fonts.ready);
          const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
            .analyze();
          expect(results.violations.filter(({ impact }) => impact === "critical" || impact === "serious")).toEqual([]);
          expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
        });
      }
    });
  }
}

test("skip link is first, appears on Tab and moves focus to the RTL main content", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/ar");
  const skip = page.locator('a[href="#main-content"]');
  await page.keyboard.press("Tab");
  await expect(skip).toBeFocused();
  expect(await skip.evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThan(44);
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

test("field and faint tokens meet contrast thresholds in every palette and theme", async ({ page }) => {
  await page.goto("/en");
  const ratios = await page.evaluate(() => {
    const luminance = (hex: string) => {
      let value = hex.trim().replace("#", "");
      if (value.length === 3) value = [...value].map(v => v + v).join("");
      const rgb = value.match(/.{2}/g)!.map(v => parseInt(v, 16) / 255)
        .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    };
    const contrast = (a: string, b: string) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const rows = [];
    for (const palette of ["tag", "indigo", "ocean", "forest", "sunset", "lavender"]) {
      for (const theme of ["light", "dark"]) {
        document.documentElement.dataset.palette = palette;
        document.documentElement.dataset.theme = theme;
        const style = getComputedStyle(document.documentElement);
        for (const surface of ["--bg", "--card", "--hover"]) {
          rows.push({ palette, theme, surface,
            field: contrast(style.getPropertyValue("--field-line"), style.getPropertyValue(surface)),
            faint: contrast(style.getPropertyValue("--faint"), style.getPropertyValue(surface)),
          });
        }
      }
    }
    return rows;
  });
  for (const row of ratios) {
    expect(row.field, JSON.stringify(row)).toBeGreaterThanOrEqual(3);
    expect(row.faint, JSON.stringify(row)).toBeGreaterThanOrEqual(4.5);
  }
  await test.info().attach("contrast-ratios", { body: JSON.stringify(ratios, null, 2), contentType: "application/json" });
});

test("keyboard focus stays visible on page controls", async ({ page }) => {
  for (const path of ["/en", "/en/login", "/en/products/9", "/en/alerts"]) {
    await page.goto(path);
    await page.keyboard.press("Tab");
    const controls = page.locator('main input:enabled:visible, main select:enabled:visible, main button:enabled:visible');
    for (const control of await controls.all()) {
      await control.focus();
      await expect(control).toBeFocused();
      expect(await control.evaluate(el => {
        const style = getComputedStyle(el);
        return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2;
      })).toBe(true);
    }
  }
});
