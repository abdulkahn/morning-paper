import Parser from "rss-parser";
import { z } from "zod";
import type { TopicSlug } from "@/lib/topics";
import type { RawFields } from "./normalize";

// Source adapters: turn a fetched response body into raw article fields.
// Each adapter validates shape and never trusts the payload.

export interface RawArticle extends RawFields {
  /** Per-item topic hint (e.g. Guardian section), overrides the source's. */
  topicHint?: TopicSlug | null;
}

type MediaNode = { $?: { url?: string; medium?: string; type?: string } };
type FeedItem = {
  mediaContent?: MediaNode | MediaNode[];
  mediaThumbnail?: MediaNode | MediaNode[];
};

const parser = new Parser<Record<string, never>, FeedItem>({
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
    ],
  },
});

function firstMediaUrl(node: MediaNode | MediaNode[] | undefined) {
  const list = Array.isArray(node) ? node : node ? [node] : [];
  for (const n of list) {
    const type = n.$?.type ?? n.$?.medium ?? "image";
    if (n.$?.url && type.startsWith("image")) return n.$.url;
  }
  return null;
}

export async function parseRss(xml: string): Promise<RawArticle[]> {
  const feed = await parser.parseString(xml);
  return feed.items.map((item) => ({
    url: item.link ?? (item.guid?.startsWith("http") ? item.guid : null),
    title: item.title,
    description: item.contentSnippet ?? item.summary ?? item.content,
    imageUrl:
      firstMediaUrl(item.mediaContent) ??
      firstMediaUrl(item.mediaThumbnail) ??
      (item.enclosure?.type?.startsWith("image") ? item.enclosure.url : null),
    author: item.creator ?? (item as { author?: string }).author,
    date: item.isoDate ?? item.pubDate,
  }));
}

const guardianResponse = z.object({
  response: z.object({
    status: z.literal("ok"),
    results: z.array(
      z.object({
        webUrl: z.string(),
        webTitle: z.string(),
        webPublicationDate: z.string(),
        sectionId: z.string().optional(),
        fields: z
          .object({
            trailText: z.string().optional(),
            bodyText: z.string().optional(),
            thumbnail: z.string().optional(),
            byline: z.string().optional(),
          })
          .optional(),
      }),
    ),
  }),
});

const GUARDIAN_SECTIONS: Record<string, TopicSlug> = {
  technology: "technology",
  science: "science",
  environment: "climate-energy",
  business: "business",
  money: "business",
  football: "football",
  sport: "sport",
  world: "world",
  "us-news": "world",
  "uk-news": "world",
  politics: "politics",
  "global-development": "world",
  society: "health",
  culture: "culture",
  film: "culture",
  music: "culture",
  books: "culture",
};

export function guardianSearchUrl(base: string, apiKey: string, now: Date) {
  const url = new URL(base);
  const from = new Date(now.getTime() - 48 * 3_600_000);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("page-size", "50");
  url.searchParams.set("order-by", "newest");
  url.searchParams.set("from-date", from.toISOString().slice(0, 10));
  url.searchParams.set("show-fields", "trailText,bodyText,thumbnail,byline");
  return url.toString();
}

export function parseGuardian(json: unknown): RawArticle[] {
  const parsed = guardianResponse.parse(json);
  return parsed.response.results.map((r) => ({
    url: r.webUrl,
    title: r.webTitle,
    description: r.fields?.trailText,
    bodyText: r.fields?.bodyText,
    imageUrl: r.fields?.thumbnail,
    author: r.fields?.byline,
    date: r.webPublicationDate,
    topicHint: r.sectionId ? (GUARDIAN_SECTIONS[r.sectionId] ?? null) : null,
  }));
}
