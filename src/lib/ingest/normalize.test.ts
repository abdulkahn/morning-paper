import { describe, expect, it } from "vitest";
import {
  canonicalizeUrl,
  cleanText,
  decodeEntities,
  freshness,
  normalizeArticle,
  titleHash,
} from "./normalize";

const NOW = new Date("2026-10-17T06:00:00Z");

describe("canonicalizeUrl", () => {
  it("strips tracking params, fragments and trailing slashes", () => {
    expect(
      canonicalizeUrl(
        "https://WWW.Example.com/news/story/?utm_source=rss&id=7&fbclid=x&a=1#top",
      ),
    ).toBe("https://www.example.com/news/story?a=1&id=7");
  });

  it("keeps meaningful params in a stable order", () => {
    expect(canonicalizeUrl("https://example.com/a?b=2&a=1")).toBe(
      canonicalizeUrl("https://example.com/a?a=1&b=2"),
    );
  });

  it("rejects non-http and malformed URLs", () => {
    expect(canonicalizeUrl("javascript:alert(1)")).toBeNull();
    expect(canonicalizeUrl("ftp://example.com/x")).toBeNull();
    expect(canonicalizeUrl("not a url")).toBeNull();
    expect(canonicalizeUrl(undefined)).toBeNull();
  });
});

describe("cleanText", () => {
  it("removes markup and scripts and decodes entities", () => {
    expect(
      cleanText(
        '<p>Rates <b>rise</b> &amp; markets&nbsp;fall</p><script>alert("x")</script>',
        200,
      ),
    ).toBe("Rates rise & markets fall");
  });

  it("collapses whitespace and returns null for empty input", () => {
    expect(cleanText("  a \n\t b  ", 10)).toBe("a b");
    expect(cleanText("<p> </p>", 10)).toBeNull();
    expect(cleanText(null, 10)).toBeNull();
  });

  it("truncates on a word boundary", () => {
    const out = cleanText("one two three four five six seven", 20);
    expect(out).toBe("one two three four…");
    expect(out!.length).toBeLessThanOrEqual(20);
  });

  it("decodes numeric entities", () => {
    expect(decodeEntities("It&#8217;s &#x2014; ok")).toBe("It’s — ok");
  });
});

describe("titleHash", () => {
  it("ignores case and punctuation", () => {
    expect(titleHash("EU approves AI Act!")).toBe(
      titleHash("eu approves ai act"),
    );
    expect(titleHash("EU approves AI Act")).not.toBe(
      titleHash("EU rejects AI Act"),
    );
  });
});

describe("freshness", () => {
  it("accepts recent items and rejects stale or future ones", () => {
    expect(freshness(new Date("2026-10-16T06:00:00Z"), NOW)).toBe("ok");
    expect(freshness(new Date("2026-10-13T05:00:00Z"), NOW)).toBe("too_old");
    expect(freshness(new Date("2026-10-17T08:00:00Z"), NOW)).toBe("in_future");
  });
});

describe("normalizeArticle", () => {
  const base = {
    url: "https://example.com/story?utm_medium=rss",
    title: "Headline &amp; more",
    description: "<p>Summary</p>",
    date: "2026-10-17T05:00:00Z",
  };

  it("produces bounded, clean fields", () => {
    const a = normalizeArticle(base, NOW);
    expect(a).toMatchObject({
      url: "https://example.com/story",
      title: "Headline & more",
      description: "Summary",
      bodyText: null,
      imageUrl: null,
    });
  });

  it("drops a description that just repeats the title", () => {
    const a = normalizeArticle(
      { ...base, description: "Headline & more" },
      NOW,
    );
    expect("skip" in a ? null : a.description).toBeNull();
  });

  it("reports why an item was skipped", () => {
    expect(normalizeArticle({ ...base, url: "mailto:x@y.z" }, NOW)).toEqual({
      skip: "bad_url",
    });
    expect(normalizeArticle({ ...base, title: "  " }, NOW)).toEqual({
      skip: "no_title",
    });
    expect(normalizeArticle({ ...base, date: "yesterday-ish" }, NOW)).toEqual({
      skip: "no_date",
    });
    expect(
      normalizeArticle({ ...base, date: "2026-10-01T00:00:00Z" }, NOW),
    ).toEqual({
      skip: "too_old",
    });
  });
});
