// Data-quality report for ingested news. Usage: npm run ingest:report
import { sql } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";

async function main() {
  const db = getDb();

  console.log("\nArticles per source (last 72h):");
  console.table(
    await db.execute(sql`
      select source_slug as source, count(*)::int as articles,
        count(description)::int as with_desc, count(image_url)::int as with_img,
        count(body_text)::int as with_body
      from articles where published_at > now() - interval '72 hours'
      group by 1 order by 2 desc`),
  );

  console.log("Same headline from several feeds (top 5):");
  console.table(
    await db.execute(sql`
      select count(*)::int as copies, min(title) as title
      from articles group by content_hash having count(*) > 1
      order by 1 desc limit 5`),
  );

  console.log("Latest runs:");
  console.table(
    await db.execute(sql`
      select status, stats->>'collected' as collected, stats->>'inserted' as inserted,
        jsonb_array_length(errors) as failed_sources,
        to_char(started_at, 'YYYY-MM-DD HH24:MI') as started,
        round(extract(epoch from finished_at - started_at))::int as seconds
      from pipeline_runs where kind = 'ingest'
      order by started_at desc limit 5`),
  );

  console.log("Skipped items in the latest run:");
  const skips = await db.execute(sql`
    select key as source, value->'skipped' as skipped
    from pipeline_runs, jsonb_each(stats->'perSource')
    where id = (select id from pipeline_runs where kind = 'ingest'
                order by started_at desc limit 1)
      and value->'skipped' <> '{}'::jsonb`);
  console.table(
    skips.map((r) => ({
      source: r.source,
      skipped: JSON.stringify(r.skipped),
    })),
  );
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(closeDb);
