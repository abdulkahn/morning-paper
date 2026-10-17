import { expect, test } from "@playwright/test";

test("editorial navigation and sample are reachable by keyboard", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#page-content$/);
  const navigation = page.getByRole("navigation", {
    name: "Main navigation",
  });
  await expect(
    navigation.getByRole("link", { name: "Today", exact: true }),
  ).toHaveAttribute("href", "/today");
  await navigation.getByRole("link", { name: /Read a sample/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The Morning Paper",
  );
});

test("landing, paper and archive fit narrow screens under either system color preference", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    for (const route of ["/", "/paper/demo", "/archive"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
});

test("print layout excludes web navigation", async ({ page }) => {
  await page.goto("/print/demo");
  await page.emulateMedia({ media: "print" });
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).not.toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The Morning Paper",
  );
});
