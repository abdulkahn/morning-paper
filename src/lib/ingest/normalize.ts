import { createHash } from "node:crypto";

// Pure helpers that turn untrusted feed/API data into safe, bounded article
// fields. Everything here is deterministic and unit-tested.

export interface NormalizedArticle {
  url: string;
  title: string;
  description: string | null;
  bodyText: string | null;
  imageUrl: string | null;
  author: string | null;
  publishedAt: Date;
  contentHash: string;
}

export type SkipReason =
  "bad_url" | "no_title" | "no_date" | "too_old" | "in_future" | "promo";

export const LIMITS = {
  title: 300,
  description: 2000,
  body: 50_000,
  author: 120,
  maxAgeHours: 72,
  maxFutureMinutes: 30,
} as const;

const TRACKING_PARAM =
  /^(utm_.*|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|ocid|cmpid|ito|at_.*|ns_.*|ref|ref_src|src|CMP|intcmp|guccounter|_ga)$/i;

/** http(s) only; drops fragments and tracking params; stable param order. */
export function canonicalizeUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  const kept = [...url.searchParams.entries()]
    .filter(([key]) => !TRACKING_PARAM.test(key))
    .sort(([a], [b]) => a.localeCompare(b));
  url.search = "";
  for (const [k, v] of kept) url.searchParams.append(k, v);
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }
  return url.toString();
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
  pound: "£",
  euro: "€",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000
        ? String.fromCodePoint(code)
        : match;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

/** Strips markup, decodes entities, collapses whitespace, truncates on a word. */
export function cleanText(
  raw: string | undefined | null,
  max: number,
): string | null {
  if (!raw) return null;
  const text = decodeEntities(
    raw
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/p>/gi, " ")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut}…`;
}

/** Hash of the title with case/punctuation removed, for spotting copies. */
export function titleHash(title: string): string {
  const norm = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  return createHash("sha256").update(norm).digest("hex").slice(0, 32);
}

/** Affiliate coupon/deal posts some feeds mix in with news. */
const PROMO =
  /\b(promo codes?|coupon codes?|coupons?|discount codes?|voucher codes?)\b|\b\d{1,3}% off\b/i;

export function isPromo(title: string): boolean {
  return PROMO.test(title);
}

export function parseDate(raw: string | undefined | null): Date | null {
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : new Date(ms);
}

export function freshness(
  publishedAt: Date,
  now: Date,
): "ok" | "too_old" | "in_future" {
  const ageMs = now.getTime() - publishedAt.getTime();
  if (ageMs > LIMITS.maxAgeHours * 3_600_000) return "too_old";
  if (-ageMs > LIMITS.maxFutureMinutes * 60_000) return "in_future";
  return "ok";
}

export interface RawFields {
  url?: string | null;
  title?: string | null;
  description?: string | null;
  bodyText?: string | null;
  imageUrl?: string | null;
  author?: string | null;
  date?: string | null;
}

export function normalizeArticle(
  raw: RawFields,
  now: Date,
): NormalizedArticle | { skip: SkipReason } {
  const url = canonicalizeUrl(raw.url);
  if (!url) return { skip: "bad_url" };
  const title = cleanText(raw.title, LIMITS.title);
  if (!title) return { skip: "no_title" };
  if (isPromo(title)) return { skip: "promo" };
  const publishedAt = parseDate(raw.date);
  if (!publishedAt) return { skip: "no_date" };
  const fresh = freshness(publishedAt, now);
  if (fresh !== "ok") return { skip: fresh };

  const description = cleanText(raw.description, LIMITS.description);
  return {
    url,
    title,
    // Some feeds repeat the headline as the description.
    description: description && description !== title ? description : null,
    bodyText: cleanText(raw.bodyText, LIMITS.body),
    imageUrl: canonicalizeUrl(raw.imageUrl),
    author: cleanText(raw.author, LIMITS.author),
    publishedAt,
    contentHash: titleHash(title),
  };
}
