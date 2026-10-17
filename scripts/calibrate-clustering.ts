// Calibrates clustering thresholds for the live embedding model on the
// labelled pairs fixture. Embeds each headline the way production does
// (title + stored description), stores only the pair similarities in the
// fixture (no publisher text beyond headlines), and prints a threshold sweep.
// Usage: npm run cluster:calibrate
import { readFileSync, writeFileSync } from "node:fs";
import { inArray } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { articles } from "../src/db/schema";
import { getEnv } from "../src/lib/env";
import { getEmbedder } from "../src/lib/cluster/embedder";
import { cosine } from "../src/lib/cluster/hash-embedding";
import { keyTerms, overlap } from "../src/lib/cluster/text";

const FIXTURE = "src/lib/cluster/__fixtures__/labelled-pairs.json";

interface Pair {
  a: string;
  b: string;
  same: boolean;
  sims?: Record<string, number>;
}

async function main() {
  const embedder = getEmbedder(getEnv().VOYAGE_API_KEY, { log: console.log });
  const fixture = JSON.parse(readFileSync(FIXTURE, "utf8")) as {
    description: string;
    pairs: Pair[];
  };

  const titles = [...new Set(fixture.pairs.flatMap((p) => [p.a, p.b]))];
  const rows = await getDb()
    .select({ title: articles.title, description: articles.description })
    .from(articles)
    .where(inArray(articles.title, titles));
  const descByTitle = new Map(rows.map((r) => [r.title, r.description]));
  console.log(
    `${titles.length} headlines, ${descByTitle.size} found with stored descriptions`,
  );

  const vectors = await embedder.embed(
    titles.map((t) => ({ title: t, description: descByTitle.get(t) ?? null })),
  );
  const vecByTitle = new Map(titles.map((t, i) => [t, vectors[i]]));

  for (const p of fixture.pairs) {
    const sim = cosine(vecByTitle.get(p.a)!, vecByTitle.get(p.b)!);
    p.sims = { ...p.sims, [embedder.model]: +sim.toFixed(4) };
  }
  writeFileSync(FIXTURE, JSON.stringify(fixture, null, 1) + "\n");

  const data = fixture.pairs.map((p) => ({
    sim: p.sims![embedder.model],
    shared: overlap(keyTerms(p.a), keyTerms(p.b)),
    same: p.same,
  }));
  const results: { acc: number; line: string }[] = [];
  for (let join = 0.5; join <= 0.9001; join += 0.025)
    for (let review = 0.4; review < join; review += 0.025)
      for (const jo of [0, 1])
        for (const ro of [1, 2]) {
          let tp = 0,
            fp = 0,
            fn = 0,
            tn = 0;
          for (const r of data) {
            const pred =
              (r.sim >= join && r.shared >= jo) ||
              (r.sim >= review && r.shared >= ro);
            if (pred && r.same) tp++;
            else if (pred) fp++;
            else if (r.same) fn++;
            else tn++;
          }
          const acc = (tp + tn) / data.length;
          results.push({
            acc,
            line: `acc=${acc.toFixed(3)} p=${(tp / Math.max(1, tp + fp)).toFixed(2)} r=${(tp / Math.max(1, tp + fn)).toFixed(2)} join=${join.toFixed(3)} joinOverlap=${jo} review=${review.toFixed(3)} reviewOverlap=${ro} fp=${fp} fn=${fn}`,
          });
        }
  results.sort((x, y) => y.acc - x.acc);
  console.log(`\nTop settings for ${embedder.model}:`);
  for (const r of results.slice(0, 10)) console.log(r.line);

  const same = data
    .filter((d) => d.same)
    .map((d) => d.sim)
    .sort((a, b) => a - b);
  const diff = data
    .filter((d) => !d.same)
    .map((d) => d.sim)
    .sort((a, b) => a - b);
  const q = (xs: number[], f: number) =>
    xs[Math.floor(f * (xs.length - 1))].toFixed(3);
  console.log(
    `\nsame-story sims: min ${q(same, 0)} p25 ${q(same, 0.25)} median ${q(same, 0.5)}`,
  );
  console.log(
    `different sims:  median ${q(diff, 0.5)} p75 ${q(diff, 0.75)} max ${q(diff, 1)}`,
  );
}

main().finally(closeDb);
