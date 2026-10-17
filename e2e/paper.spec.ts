import { expect, test } from "@playwright/test";

test("sample paper shows masthead, lead, sections and caught-up footer", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "See a sample edition" }).click();
  await expect(page).toHaveURL(/\/paper\/demo$/);

  await expect(page.getByText("Sample Reader’s Edition")).toBeVisible();
  await expect(
    page.getByText(/12 stories · \d+ sources · \d+-minute read/),
  ).toBeVisible();
  await expect(page.getByText("From your editor")).toBeVisible();

  const lead = page.getByRole("article", { name: "Lead story" });
  await expect(lead.getByRole("heading", { level: 2 })).toContainText(
    "humanoid robots",
  );
  await expect(lead.getByLabel("New to you")).toContainText("Embodied AI");

  for (const section of [
    "Artificial Intelligence",
    "Pakistan",
    "Business",
    "Sport",
  ]) {
    await expect(page.getByRole("heading", { name: section })).toBeVisible();
  }
  await expect(page.getByLabel("Since you last read")).toContainText(
    "3 new facts",
  );
  await expect(
    page.getByText("You’re caught up.", { exact: true }),
  ).toBeVisible();
});

test("PDF route returns a newspaper PDF", async ({ request }) => {
  const res = await request.get("/api/pdf/demo");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("application/pdf");
  expect(res.headers()["content-disposition"]).toContain(
    "morning-paper-2026-10-17-no1.pdf",
  );
  const body = await res.body();
  expect(body.subarray(0, 5).toString()).toBe("%PDF-");
  expect(body.length).toBeGreaterThan(50_000);
});

test("unknown editions are 404 on web and PDF", async ({ page, request }) => {
  // With partial prefetching an unlisted param may get the 200 app shell
  // before notFound() streams in, so assert on content, not status (see STATUS.md).
  await page.goto("/paper/does-not-exist");
  await expect(page.getByText("This page could not be found.")).toBeVisible();
  expect((await request.get("/api/pdf/does-not-exist")).status()).toBe(404);
});

test("print layout renders the same edition", async ({ page }) => {
  await page.goto("/print/demo");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The Morning Paper",
  );
  await expect(
    page.getByText("Sample edition — illustrative content."),
  ).toBeVisible();
});
