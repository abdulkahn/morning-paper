import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

// Email + password accounts. The confirmation email itself can't be opened in
// a test, so log-in uses an account pre-confirmed via the admin API (no email
// is sent) and deleted afterwards.

test("sign-up validates the form before contacting Supabase", async ({
  page,
}) => {
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Test Reader");
  await page.getByLabel("Email").fill("reader@example.com");
  await page.getByLabel("Password").fill("short");
  // Bypass the browser's own minlength check to exercise server validation.
  await page
    .locator('input[name="password"]')
    .evaluate((el) => el.removeAttribute("minlength"));
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(
    page.getByText("Use at least 8 characters for your password."),
  ).toBeVisible({
    timeout: 15_000,
  });
});

test.describe("log in with a confirmed account", () => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY,
    "needs Supabase admin access",
  );

  const email = `e2e-${Date.now()}@morning-paper.test`;
  const password = "correct-horse-battery";
  let userId: string | undefined;
  const admin = () =>
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
      },
    );

  test.beforeAll(async () => {
    const { data, error } = await admin().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Email Reader" },
    });
    if (error) throw error;
    userId = data.user.id;
  });

  test.afterAll(async () => {
    if (userId) await admin().auth.admin.deleteUser(userId);
  });

  test("wrong password is rejected, right one opens onboarding, log out works", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(
      page.getByText("That email and password don't match."),
    ).toBeVisible({
      timeout: 15_000,
    });

    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    // New account: profile created from the sign-up name, then onboarding.
    await expect(page).toHaveURL(/\/onboarding$/, { timeout: 30_000 });
    await expect(
      page.locator('section[aria-label="Headline choice"]'),
    ).toBeVisible({
      timeout: 30_000,
    });

    await page.goto("/editor");
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
  });
});
