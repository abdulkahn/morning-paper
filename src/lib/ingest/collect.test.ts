import { describe, expect, it } from "vitest";
import { collect, type Fetcher } from "./collect";
import type { SourceDef } from "./sources";

const NOW = new Date("2026-10-17T06:00:00Z");

// Synthetic feed covering the awkward cases real feeds throw at us.
const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel><title>Sample</title>
  <item>
    <title>Robots learn from one demo</title>
    <link>https://news.example.com/robots/?utm_source=rss</link>
    <description><![CDATA[<p>Labs report <b>one-shot</b> learning.</p>]]></description>
    <pubDate>Sat, 17 Oct 2026 04:00:00 GMT</pubDate>
    <dc:creator>A. Writer</dc:creator>
    <media:thumbnail url="https://img.example.com/robots.jpg" width="240" height="135"/>
  </item>
  <item>
    <title>Robots learn from one demo</title>
    <link>https://news.example.com/robots</link>
    <pubDate>Sat, 17 Oct 2026 04:05:00 GMT</pubDate>
  </item>
  <item>
    <title>Old story</title>
    <link>https://news.example.com/old</link>
    <pubDate>Mon, 05 Oct 2026 04:00:00 GMT</pubDate>
  </item>
  <item>
    <title>No date story</title>
    <link>https://news.example.com/nodate</link>
  </item>
</channel></rss>`;

const GUARDIAN = {
  response: {
    status: "ok",
    results: [
      {
        webUrl: "https://www.theguardian.com/technology/2026/oct/17/chips",
        webTitle: "Chip packaging capacity to double",
        webPublicationDate: "2026-10-17T03:00:00Z",
        sectionId: "technology",
        fields: {
          trailText: "Shortage <strong>easing</strong>",
          bodyText: "Full body text.",
        },
      },
    ],
  },
};

const src = (slug: string, kind: SourceDef["kind"] = "rss"): SourceDef => ({
  slug,
  name: slug,
  kind,
  url: `https://feeds.example.com/${slug}`,
  country: "GB",
  topicHint: "technology",
  quality: 0.8,
});

function fakeFetcher(
  map: Record<string, string | Error>,
  json: unknown = GUARDIAN,
): Fetcher {
  return {
    async text(url) {
      const body = map[url];
      if (body instanceof Error) throw body;
      if (body === undefined) throw new Error("HTTP 404");
      return body;
    },
    async json() {
      return json;
    },
  };
}

describe("collect", () => {
  it("normalises, de-duplicates and explains skips", async () => {
    const { articles, perSource } = await collect([src("a")], {
      fetcher: fakeFetcher({ "https://feeds.example.com/a": FEED }),
      now: NOW,
    });
    expect(articles).toHaveLength(1);
    expect(articles[0]).toMatchObject({
      url: "https://news.example.com/robots",
      description: "Labs report one-shot learning.",
      imageUrl: "https://img.example.com/robots.jpg",
      author: "A. Writer",
      sourceSlug: "a",
      topicHint: "technology",
    });
    expect(perSource.a).toEqual({
      fetched: 4,
      kept: 1,
      skipped: { duplicate: 1, too_old: 1, no_date: 1 },
    });
  });

  it("isolates a failing source and keeps the rest", async () => {
    const { articles, perSource } = await collect(
      [src("down"), src("up"), src("junk")],
      {
        fetcher: fakeFetcher({
          "https://feeds.example.com/down": new Error("fetch failed"),
          "https://feeds.example.com/up": FEED,
          "https://feeds.example.com/junk": "<html>not a feed",
        }),
        now: NOW,
      },
    );
    expect(articles).toHaveLength(1);
    expect(perSource.down.error).toBe("fetch failed");
    expect(perSource.junk.error).toBeTruthy();
    expect(perSource.up.kept).toBe(1);
  });

  it("skips the Guardian API without a key and uses it with one", async () => {
    const without = await collect([src("guardian", "guardian_api")], {
      fetcher: fakeFetcher({}),
      now: NOW,
    });
    expect(without.perSource.guardian.disabled).toMatch(/GUARDIAN_API_KEY/);

    const withKey = await collect([src("guardian", "guardian_api")], {
      fetcher: fakeFetcher({}),
      now: NOW,
      guardianApiKey: "test",
    });
    expect(withKey.articles[0]).toMatchObject({
      title: "Chip packaging capacity to double",
      description: "Shortage easing",
      bodyText: "Full body text.",
      topicHint: "technology",
    });
  });

  it("treats a malformed API payload as a source error", async () => {
    const { perSource } = await collect([src("guardian", "guardian_api")], {
      fetcher: fakeFetcher({}, { response: { status: "error" } }),
      now: NOW,
      guardianApiKey: "test",
    });
    expect(perSource.guardian.error).toBeTruthy();
  });
});
