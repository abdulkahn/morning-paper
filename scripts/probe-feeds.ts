// Fetches every RSS source once and reports item counts and freshness.
// Usage: npm run ingest:probe
import Parser from "rss-parser";
import { SOURCES } from "../src/lib/ingest/sources";

const parser = new Parser();

async function probe(url: string) {
  const started = Date.now();
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "MorningPaperBot/0.1 (+https://github.com/abdulkahn/morning-paper)",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const feed = await parser.parseString(await res.text());
  const dates = feed.items
    .map((i) => Date.parse(i.isoDate ?? i.pubDate ?? ""))
    .filter((d) => !Number.isNaN(d));
  const newest = dates.length ? Math.max(...dates) : NaN;
  const hoursOld = Number.isNaN(newest)
    ? "?"
    : ((Date.now() - newest) / 36e5).toFixed(1);
  const withDesc = feed.items.filter(
    (i) => (i.contentSnippet ?? "").length > 40,
  ).length;
  return `${feed.items.length} items, newest ${hoursOld}h old, ${withDesc} with description, ${Date.now() - started}ms`;
}

async function main() {
  const results = await Promise.allSettled(
    SOURCES.filter((s) => s.kind === "rss").map(
      async (s) => [s.slug, await probe(s.url)] as const,
    ),
  );
  const rssSources = SOURCES.filter((s) => s.kind === "rss");
  results.forEach((r, i) => {
    const slug = rssSources[i].slug.padEnd(22);
    console.log(
      r.status === "fulfilled"
        ? `OK   ${slug} ${r.value[1]}`
        : `FAIL ${slug} ${String(r.reason).slice(0, 120)}`,
    );
  });
}

main();
