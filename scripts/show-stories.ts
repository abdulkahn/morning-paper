// Prints enriched stories with their facts and concepts. Usage: npm run stories [-- N]
import { sql } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";

async function main() {
  const n = Number(process.argv[2] ?? 3);
  const db = getDb();
  const stories = (await db.execute(sql`
    select id, headline, dek, brief, why_it_matters, key_points, importance,
      topic_slug, source_count, article_count
    from story_clusters where enriched_at is not null
    order by enriched_at desc limit ${n}`)) as unknown as Record<string, unknown>[];
  for (const s of stories) {
    console.log(`\n■ [${s.topic_slug}] (importance ${s.importance}, ${s.source_count} sources) ${s.headline}`);
    console.log(`  ${s.dek}`);
    for (const p of (s.brief as string[]) ?? []) console.log(`  ¶ ${p}`);
    console.log(`  Why it matters: ${s.why_it_matters}`);
    for (const k of (s.key_points as string[]) ?? []) console.log(`  • ${k}`);
    const facts = (await db.execute(sql`
      select text, importance, first_seen_at, recall from story_facts
      where cluster_id = ${s.id} order by first_seen_at`)) as unknown as Record<string, unknown>[];
    for (const f of facts) {
      console.log(`  fact(${f.importance}) ${String(f.first_seen_at).slice(0, 16)}: ${f.text}`);
      if (f.recall) console.log(`    recall: ${JSON.stringify(f.recall)}`);
    }
    const cs = (await db.execute(sql`
      select c.name, c.type, c.explainer from concepts c
      join cluster_concepts cc on cc.concept_id = c.id where cc.cluster_id = ${s.id}`)) as unknown as Record<string, unknown>[];
    for (const c of cs) console.log(`  concept [${c.type}] ${c.name}: ${c.explainer}`);
  }
}

main().finally(closeDb);
