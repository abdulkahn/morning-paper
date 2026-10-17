import { expect as baseExpect, test } from "@playwright/test";

// Allow streamed reader data to settle without changing global test settings.
const expect = baseExpect.configure({ timeout: 15_000 });
test.setTimeout(60_000);

test("archive navigation works without a reader's saved editions", async ({
  page,
}) => {
  await page.goto("/archive");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your archive",
  );
  // No session is created here. An unconnected, empty, or failed backend must
  // all remain usable, and must never silently substitute fixture history.
  await expect(
    page.getByRole("region", { name: /Archive (status|error)/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Open Edition/ })).toHaveCount(0);
  await page.getByRole("link", { name: "Return to Today’s Paper" }).click();
  await expect(page).toHaveURL(/\/paper$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Today’s Paper",
  );
  await page.getByRole("link", { name: "Back to Archive" }).click();
  await expect(page).toHaveURL(/\/archive$/);
});

test("invalid archived IDs have a helpful not-found state", async ({
  page,
}) => {
  await page.goto("/archive/bad.id");
  await expect(page.getByText("We couldn’t find that edition.")).toBeVisible();
  await page.getByRole("link", { name: "Back to Archive" }).click();
  await expect(page).toHaveURL(/\/archive$/);
});

test("sample paper links to the archive without changing PDF support", async ({
  page,
}) => {
  await page.goto("/paper/demo");
  await expect(
    page.getByRole("link", { name: "Download PDF" }),
  ).toHaveAttribute("href", "/api/pdf/demo");
  await page.getByRole("link", { name: "Back to Archive" }).click();
  await expect(page).toHaveURL(/\/archive$/);
});

test("production never serves local fixture history", async ({ page }) => {
  test.skip(!process.env.CI, "Production server is used by CI");
  await page.goto("/archive/preview");
  await expect(page.getByText("We couldn’t find that edition.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Open Edition/ })).toHaveCount(0);
});

test.describe("local archive visual development", () => {
  test.skip(!!process.env.CI, "Fixture preview is development-only");

  test("saved edition metadata, dates, current marker and honest PDFs", async ({
    page,
  }) => {
    await page.goto("/archive/preview");
    await expect(
      page.getByText(/All editions are illustrative samples/),
    ).toBeVisible();
    await expect(page.getByText("2 past editions")).toBeVisible();
    const editions = page
      .getByRole("region", { name: "Saved editions" })
      .getByRole("article");
    await expect(editions).toHaveCount(3);
    await expect(editions.nth(0)).toContainText("Current edition");
    await expect(editions.nth(1)).toContainText(
      "The chips behind a changing world",
    );
    await expect(editions.nth(1)).toContainText(
      "12 stories · 6 sources · 13 min",
    );
    await expect(
      editions.nth(1).getByRole("button", { name: /PDF unavailable/ }),
    ).toBeDisabled();
    await expect(
      editions.nth(0).getByRole("button", { name: /PDF unavailable/ }),
    ).toBeDisabled();
    await expect(page.getByRole("link", { name: /^PDF/ })).toHaveCount(0);
    await expect(editions.nth(1).locator("time")).toHaveAttribute(
      "datetime",
      "2026-10-16",
    );
  });

  test("two historical editions preserve lead, section and mixed-tier story ordering on reopen", async ({
    page,
  }) => {
    const cases = [
      {
        id: "preview-oct-16",
        lead: "Semiconductor policy changes the outlook for AI researchers",
        firstSection: "Artificial Intelligence",
        firstStory: "ai-tutors",
      },
      {
        id: "preview-oct-15",
        lead: "Battery advances bring a quieter future for coastal shipping",
        firstSection: "Sport",
        firstStory: "football-weekend",
      },
    ];
    for (const entry of cases) {
      await page.goto("/archive/preview");
      await page.locator(`a[href="/archive/preview/${entry.id}"]`).click();
      await expect(
        page.getByRole("complementary", { name: "Historical edition" }),
      ).toContainText("Archived edition");
      await expect(
        page.getByRole("article", { name: "Lead story" }).getByRole("heading"),
      ).toHaveText(entry.lead);
      const sections = page.getByRole("main").locator(":scope > section");
      await expect(sections.first().getByRole("heading").first()).toHaveText(
        entry.firstSection,
      );
      await expect(
        page.getByRole("main").locator("[data-story-id]").first(),
      ).toHaveAttribute("data-story-id", entry.firstStory);
      const headings = page.getByRole("main").locator("h2, h3");
      const before = await headings.allTextContents();
      // An unrelated local preference edit must not reconstruct saved content.
      await page.evaluate(() =>
        localStorage.setItem("archive-test-preferences", "changed"),
      );
      await page.reload();
      await expect(headings).toHaveText(before);
      await page.getByRole("link", { name: "Back to Archive" }).click();
      await expect(page).toHaveURL(/\/archive\/preview$/);
    }
    await page.getByRole("link", { name: "Today’s Paper" }).click();
    await expect(page).toHaveURL(/\/archive\/preview\/preview-oct-17$/);
    await expect(
      page.getByRole("complementary", { name: "Historical edition" }),
    ).toHaveCount(0);
  });

  test("empty, failure, loading and missing states", async ({ page }) => {
    await page.goto("/archive/preview/empty");
    await expect(
      page.getByText("Your archive is just getting started."),
    ).toBeVisible();
    await page.getByRole("link", { name: "Return to Today’s Paper" }).click();
    await expect(page).toHaveURL(/\/archive\/preview\/preview-oct-17$/);
    await page.goto("/archive/preview/error");
    await expect(
      page.getByText("We couldn’t open your archive."),
    ).toBeVisible();
    await page.getByRole("link", { name: "Try again" }).click();
    await expect(
      page.getByRole("region", { name: "Saved editions" }),
    ).toBeVisible();
    await page.goto("/archive/preview/loading");
    await expect(page.getByRole("status")).toContainText(
      "Opening your collected editions",
    );
    await page.goto("/archive/preview/not-an-edition");
    await expect(
      page.getByText("We couldn’t find that edition."),
    ).toBeVisible();
  });

  test("mobile archive and historical reader fit the viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const url of [
      "/archive/preview",
      "/archive/preview/preview-oct-16",
      "/archive/preview/empty",
    ]) {
      await page.goto(url);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  });
});
