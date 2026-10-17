import { expect, test } from "@playwright/test";

test("topic photographs align with stories and survive failed image requests", async ({
  page,
}) => {
  await page.route("https://images.unsplash.com/**", (route) => route.abort());
  await page.goto("/paper/demo");
  const lead = page.getByRole("article", { name: "Lead story", exact: true });
  await expect(lead.getByRole("status")).toContainText(
    "Photograph unavailable",
  );
  await expect(lead.locator("figcaption")).toContainText(
    "Topic photograph · Alex Knight / Unsplash",
  );
  const before = await lead.getByRole("heading").innerText();
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(lead.getByRole("heading")).toHaveText(before);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("photographs have alt text, credit and a stable landscape frame", async ({
  page,
}) => {
  await page.route("https://images.unsplash.com/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#a4b4a8"/></svg>',
    }),
  );
  await page.goto("/paper/demo");
  const lead = page.getByRole("article", { name: "Lead story", exact: true });
  const image = lead.getByRole("img");
  await expect(image).toHaveAttribute("alt", /robot/i);
  await expect
    .poll(() =>
      image.evaluate((element) => (element as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(
    lead.getByRole("link", { name: "Alex Knight / Unsplash" }),
  ).toHaveAttribute("href", "https://unsplash.com/photos/2EJCSULRwC8");
  const frame = await lead.locator(".story-visual-frame").boundingBox();
  expect(frame!.width / frame!.height).toBeCloseTo(1.5, 1);
});

test("headline entrance plays once and respects reduced motion", async ({
  page,
}) => {
  await page.goto("/");
  const headline = page
    .getByRole("heading", { level: 1 })
    .locator(".headline-reveal")
    .first();
  await expect(headline).toHaveCSS("animation-name", "headline-enter");
  await expect(headline).toHaveCSS("animation-iteration-count", "1");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(headline).toHaveCSS("animation-name", "none");
  await page.goto("/paper/demo");
  await expect(
    page
      .getByRole("article", { name: "Lead story", exact: true })
      .getByRole("heading"),
  ).toHaveCSS("animation-name", "none");
});
