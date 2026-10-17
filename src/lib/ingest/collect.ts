import type { TopicSlug } from "@/lib/topics";
import {
  guardianSearchUrl,
  parseGuardian,
  parseRss,
  type RawArticle,
} from "./adapters";
import {
  normalizeArticle,
  type NormalizedArticle,
  type SkipReason,
} from "./normalize";
import type { SourceDef } from "./sources";

// Fetches every source, isolating failures per source, and returns
// normalised, de-duplicated articles plus per-source stats for the run log.

export interface Fetcher {
  text(url: string): Promise<string>;
  json(url: string): Promise<unknown>;
}

export interface CollectedArticle extends NormalizedArticle {
  sourceSlug: string;
  topicHint: TopicSlug | null;
}

export interface SourceStats {
  fetched: number;
  kept: number;
  skipped: Partial<Record<SkipReason | "duplicate", number>>;
  error?: string;
  /** Not attempted, e.g. API source without a key. */
  disabled?: string;
}

export interface CollectResult {
  articles: CollectedArticle[];
  perSource: Record<string, SourceStats>;
}

export interface CollectOptions {
  fetcher: Fetcher;
  now: Date;
  guardianApiKey?: string;
  concurrency?: number;
}

async function fetchRaw(
  source: SourceDef,
  opts: CollectOptions,
): Promise<RawArticle[] | { disabled: string }> {
  if (source.kind === "guardian_api") {
    if (!opts.guardianApiKey) return { disabled: "GUARDIAN_API_KEY not set" };
    const json = await opts.fetcher.json(
      guardianSearchUrl(source.url, opts.guardianApiKey, opts.now),
    );
    return parseGuardian(json);
  }
  return parseRss(await opts.fetcher.text(source.url));
}

/** Runs `fn` over items with at most `limit` in flight. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

export async function collect(
  sources: SourceDef[],
  opts: CollectOptions,
): Promise<CollectResult> {
  const perSource: Record<string, SourceStats> = {};
  const byUrl = new Map<string, CollectedArticle>();

  const fetched = await mapLimit(
    sources,
    opts.concurrency ?? 6,
    async (source) => {
      try {
        return { source, raw: await fetchRaw(source, opts) };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { source, error: message.slice(0, 300) };
      }
    },
  );

  for (const item of fetched) {
    const { source } = item;
    const stats: SourceStats = { fetched: 0, kept: 0, skipped: {} };
    perSource[source.slug] = stats;
    if ("error" in item) {
      stats.error = item.error;
      continue;
    }
    if ("disabled" in item.raw) {
      stats.disabled = item.raw.disabled;
      continue;
    }
    stats.fetched = item.raw.length;
    for (const raw of item.raw) {
      const result = normalizeArticle(raw, opts.now);
      if ("skip" in result) {
        stats.skipped[result.skip] = (stats.skipped[result.skip] ?? 0) + 1;
        continue;
      }
      const existing = byUrl.get(result.url);
      if (existing) {
        stats.skipped.duplicate = (stats.skipped.duplicate ?? 0) + 1;
        // Prefer the copy that carries full text (Guardian API over RSS).
        if (!existing.bodyText && result.bodyText)
          existing.bodyText = result.bodyText;
        continue;
      }
      byUrl.set(result.url, {
        ...result,
        sourceSlug: source.slug,
        topicHint: raw.topicHint ?? source.topicHint,
      });
      stats.kept++;
    }
  }

  return { articles: [...byUrl.values()], perSource };
}

const USER_AGENT =
  "MorningPaperBot/0.1 (+https://github.com/abdulkahn/morning-paper)";

/** Real network fetcher: 15 s timeout, one retry on network errors and 5xx. */
export function httpFetcher(): Fetcher {
  async function get(url: string): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await fetch(url, {
          headers: { "user-agent": USER_AGENT },
          signal: AbortSignal.timeout(15_000),
        });
        if (res.status >= 500 && attempt === 0) continue;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
      } catch (error) {
        if (
          attempt === 0 &&
          !(error instanceof Error && error.message.startsWith("HTTP"))
        ) {
          continue;
        }
        throw error;
      }
    }
  }
  return {
    text: async (url) => (await get(url)).text(),
    json: async (url) => (await get(url)).json(),
  };
}
