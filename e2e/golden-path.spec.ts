import { expect, test } from "@playwright/test";

// The golden path as a real reader: start -> onboarding -> first paper -> open
// a story -> feedback -> Three Things -> PDF. Needs Supabase + enriched
// stories, so it runs locally against the real project and skips in CI.
test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.DATABASE_URL,
  "needs Supabase and an enriched database",
);
test.setTimeout(120_000);

test("new reader gets a personalised paper and can use it", async ({
  page,
  request,
}) => {
  // Start anonymously.
  await page.goto("/");
  await page.getByRole("button", { name: "Start my paper" }).first().click();
  await expect(page).toHaveURL(/\/onboarding$/, { timeout: 20_000 });

  // Six headline duels (always pick the first option), then name + length.
  const duel = page
    .locator('section[aria-label="Headline choice"] button')
    .first();
  const nameField = page.getByPlaceholder("Your name");
  await duel.waitFor({ timeout: 30_000 }); // duels stream in after the shell
  for (let i = 0; i < 6 && !(await nameField.isVisible()); i++) {
    await duel.click();
  }
  await nameField.fill("Golden Path");
  await page.getByText("5 minutes", { exact: true }).click();
  await page.getByRole("button", { name: "Build my first paper" }).click();

  // First paper: masthead, editor's note, lead story.
  await expect(page).toHaveURL(/\/today$/, { timeout: 30_000 });
  await expect(page.getByText(/Golden Path.s Edition/)).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByLabel("From your editor")).toContainText(
    "This is your first paper",
  );
  await expect(page.getByRole("article", { name: "Lead story" })).toBeVisible();

  const storyLinks = page.locator('a[href^="/story/"]');
  const firstStory = await storyLinks.first().getAttribute("href");
  expect(firstStory).toBeTruthy();
  const editionId = firstStory!.split("/")[2];

  // Reloading never reorders today's paper.
  const hrefs = () =>
    storyLinks.evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  const before = await hrefs();
  await page.reload();
  await expect(storyLinks.first()).toBeVisible({ timeout: 30_000 });
  expect(await hrefs()).toEqual(before);

  // Three Things: answer the first question.
  const question = page.getByTestId("recall-question").first();
  if (await question.isVisible().catch(() => false)) {
    await question.getByRole("button").first().click();
    await expect(question.getByText(/Correct|Not quite/)).toBeVisible({
      timeout: 15_000,
    });
  }

  // Open a story, give feedback.
  await page.goto(firstStory!);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("Read the original reporting")).toBeVisible();
  await page.getByRole("button", { name: "More like this" }).click();
  await expect(page.getByText(/will reflect this/)).toBeVisible({
    timeout: 20_000,
  });

  // My Editor: the model is visible and can be changed in plain words.
  await page.goto("/editor");
  await expect(page.getByTestId("interest-list")).toBeVisible({
    timeout: 30_000,
  });
  await page
    .getByLabel("Instruction for your editor")
    .fill("Less politics, more AI research and Pakistani startups.");
  await page.getByRole("button", { name: "Ask" }).click();
  const preview = page.getByTestId("editor-preview");
  await expect(preview).toContainText("→", { timeout: 30_000 });
  await page.getByRole("button", { name: "Apply to future papers" }).click();
  await expect(page.getByText(/Your future editions will reflect/)).toBeVisible(
    {
      timeout: 20_000,
    },
  );

  // The paper downloads as a newspaper PDF.
  const pdf = await request.get(`/api/pdf/${editionId}`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
});
