// Tokenisation shared by the hashing embedding and the keyword-overlap check.

const STOPWORDS = new Set(
  (
    "a an and are as at be been but by for from has have he her his how i in into is it its " +
    "of on or our says said she that the their them there they this to up was we were what " +
    "when where which who will with would you your after over new more than about amid " +
    "could may might not no yes just also can after before out off back first last year years " +
    "day days week weeks today live latest update updates news report reports video watch"
  ).split(" "),
);

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]s\b/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

/**
 * Distinctive terms: capitalised words not at sentence start (a cheap proxy
 * for named entities until LLM extraction runs) plus long rare-ish words.
 */
export function keyTerms(
  title: string,
  description?: string | null,
): Set<string> {
  const out = new Set<string>();
  for (const text of [title, description ?? ""]) {
    const words = text.split(/\s+/);
    words.forEach((w, i) => {
      const clean = w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
      if (clean.length < 3) return;
      const lower = clean.toLowerCase();
      if (STOPWORDS.has(lower)) return;
      const capitalised = /^\p{Lu}/u.test(clean);
      if (
        (capitalised && i > 0) ||
        /^\p{Lu}{2,}$/u.test(clean) ||
        clean.length >= 9
      ) {
        out.add(lower.replace(/['’]s$/, ""));
      }
    });
  }
  return out;
}

export function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}
