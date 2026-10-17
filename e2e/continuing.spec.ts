import { expect, test } from "@playwright/test";

test("reading updates occupy the right column beneath the sample label", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const route of ["/", "/paper/demo"]) {
    await page.goto(route);
    const sidebar = page.getByRole("complementary", {
      name: "Your reading updates",
    });
    const updates = sidebar.getByRole("region", {
      name: "More on what you read earlier",
    });
    const label = sidebar.getByText("Sample edition · Illustrative content", {
      exact: true,
    });
    await expect(updates).toBeVisible();
    const lead = await page
      .locator(route === "/" ? ".news-home-lead" : ".news-lead")
      .boundingBox();
    const box = await updates.boundingBox();
    const labelBox = await label.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(lead!.x + lead!.width);
    expect(box!.y).toBeGreaterThanOrEqual(labelBox!.y + labelBox!.height);
  }
  await page.goto("/");
  await page
    .getByRole("complementary", { name: "Your reading updates" })
    .getByRole("link", { name: /Read update:/ })
    .click();
  await expect(page).toHaveURL(/\/paper\/demo#story-eu-ai-rules$/);
  await expect(page.locator('[data-story-id="eu-ai-rules"]')).toBeInViewport();
});

test("dedicated updates link to the original story without moving or duplicating full stories", async ({
  page,
}) => {
  await page.goto("/paper/demo");
  const section = page.getByRole("region", {
    name: "More on what you read earlier",
  });
  await expect(section).toBeVisible();
  await expect(section).toContainText("3 updates");
  await expect(section).toContainText("Wednesday, 14 October 2026");
  await expect(section).toContainText("New: Committee approved the proposal.");
  await expect(section.getByRole("heading", { level: 3 })).toHaveCount(1);
  const original = page.locator('[data-story-id="eu-ai-rules"]');
  const originalOrder = await page
    .locator("[data-story-id]")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-story-id")),
    );
  await section.getByRole("link", { name: /Read update:/ }).click();
  await expect(page).toHaveURL(/#story-eu-ai-rules$/);
  await expect(original).toBeInViewport();
  await expect(
    original.getByRole("complementary", { name: "Since you last read" }),
  ).toContainText("3 new facts");
  await page.reload();
  await expect(page.locator("[data-story-id]")).toHaveCount(
    originalOrder.length,
  );
  expect(
    await page
      .locator("[data-story-id]")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-story-id")),
      ),
  ).toEqual(originalOrder);
});

test("updates fit mobile and offer a usable story link", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/paper/demo");
  const section = page.getByRole("region", {
    name: "More on what you read earlier",
  });
  await expect(section).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const link = section.getByRole("link", { name: /Read update:/ });
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-story-id="eu-ai-rules"]')).toBeInViewport();
});

test("historical updates come from the saved edition and absent updates stay hidden", async ({
  page,
}) => {
  test.skip(
    !!process.env.CI,
    "Local archive fixtures are intentionally unavailable in production.",
  );
  await page.goto("/archive/preview/preview-oct-16");
  const updates = page.getByRole("region", {
    name: "More on what you read earlier",
  });
  await expect(updates).toContainText("Wednesday, 14 October 2026");
  await expect(updates).toContainText("Committee approved the proposal.");
  await page.goto("/archive/preview/preview-oct-15");
  await expect(
    page.getByRole("heading", {
      name: "Battery advances bring a quieter future for coastal shipping",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "More on what you read earlier" }),
  ).toHaveCount(0);
});
