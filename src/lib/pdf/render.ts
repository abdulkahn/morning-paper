import type { Browser } from "playwright-core";

// Renders a URL to PDF with headless Chromium. On Vercel/Lambda we use the
// slim @sparticuz/chromium build; locally, Playwright's installed Chromium
// (`npx playwright install chromium`) or CHROMIUM_EXECUTABLE_PATH.
// Both packages are imported lazily so a load failure surfaces as a handled
// render error (and the print-page fallback) instead of crashing the route.

const isServerless = !!(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
);

async function launchBrowser(): Promise<Browser> {
  const { chromium } = await import("playwright-core");
  if (isServerless) {
    const { default: serverlessChromium } = await import("@sparticuz/chromium");
    return chromium.launch({
      args: serverlessChromium.args,
      executablePath: await serverlessChromium.executablePath(),
      headless: true,
    });
  }
  return chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  });
}

export async function renderPdfFromUrl(url: string): Promise<Uint8Array> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    const response = await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });
    if (!response?.ok()) {
      throw new Error(
        `print page returned HTTP ${response?.status() ?? "no response"}`,
      );
    }
    // Never print an error page: the real print layout must be present.
    await page.waitForSelector(".print-root", { timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    // Wait (bounded) for photos; drop any that failed so the page never
    // prints a broken-image box. The story still prints without its photo.
    await page.evaluate(async () => {
      const imgs = Array.from(document.images);
      await Promise.race([
        Promise.all(
          imgs.map((img) =>
            img.complete
              ? null
              : new Promise((done) => {
                  img.addEventListener("load", done, { once: true });
                  img.addEventListener("error", done, { once: true });
                }),
          ),
        ),
        new Promise((done) => setTimeout(done, 8000)),
      ]);
      for (const img of imgs) {
        if (!img.complete || img.naturalWidth === 0) {
          (img.closest("[data-photo]") ?? img).remove();
        }
      }
    });
    const pdf = await page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
    });
    return new Uint8Array(pdf);
  } finally {
    await browser.close();
  }
}
