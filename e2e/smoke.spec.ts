import { expect, test } from "@playwright/test";

test("landing page shows the masthead", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("The Morning Paper");
  await expect(
    page.getByRole("heading", { level: 1, name: "The Morning Paper" }),
  ).toBeVisible();
  await expect(
    page.getByText("A paper that remembers what you already know."),
  ).toBeVisible();
});
