import { expect, test } from "@playwright/test";

// Needs Supabase (loaded from .env.local by playwright.config.ts).
test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL,
  "Supabase not configured for this run",
);

test("a new reader starts anonymously and reaches onboarding", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start my paper" }).first().click();

  await expect(page).toHaveURL(/\/onboarding$/, { timeout: 15_000 });
  await expect(
    page.locator('section[aria-label="Headline choice"]'),
  ).toBeVisible({ timeout: 30_000 });

  // The session persists: onboarding is still reachable after a reload.
  await page.reload();
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(
    page.locator('section[aria-label="Headline choice"]'),
  ).toBeVisible({ timeout: 30_000 });
});

test("onboarding without a session sends the visitor home", async ({
  page,
}) => {
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/$/);
});
