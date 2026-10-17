// Dumps candidate article pairs (by hash-embedding similarity) for labelling
// the clustering evaluation set. Usage: npx tsx --env-file=.env.local scripts/cluster-candidates.ts > pairs.json
import { sql } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { cosine, hashEmbedding } from "../src/lib/cluster/hash-embedding";

async function main() {
  const db = getDb();
  const rows = (await db.execute(sql`
    select id, source_slug, title, description from articles
    where published_at > now() - interval '72 hours'`)) as unknown as {
    id: string;
    source_slug: string;
    title: string;
    description: string | null;
  }[];
  const emb = rows.map((r) => hashEmbedding(r.title, r.description));

  const pairs: { a: string; b: string; sim: number }[] = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const sim = cosine(emb[i], emb[j]);
      if (sim > 0.12)
        pairs.push({
          a: rows[i].title,
          b: rows[j].title,
          sim: +sim.toFixed(3),
        });
    }
  }
  pairs.sort((x, y) => y.sim - x.sim);
  // Top pairs plus a spread across the similarity range.
  const pick = [
    ...pairs.slice(0, 70),
    ...pairs
      .filter(
        (_, k) =>
          k >= 70 && k % Math.max(1, Math.floor(pairs.length / 60)) === 0,
      )
      .slice(0, 60),
  ];
  console.log(JSON.stringify(pick, null, 1));
}

main().finally(closeDb);
