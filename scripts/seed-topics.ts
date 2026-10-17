// Idempotently upserts the topic taxonomy. Usage: npm run db:seed
import { sql } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { topics } from "../src/db/schema";
import { TOPICS } from "../src/lib/topics";

async function main() {
  const db = getDb();
  // Parents first so the self-reference is satisfied.
  const ordered = [...TOPICS].sort(
    (a, b) => Number(a.parent !== null) - Number(b.parent !== null),
  );
  await db
    .insert(topics)
    .values(
      ordered.map((t) => ({
        slug: t.slug,
        name: t.name,
        parentSlug: t.parent,
      })),
    )
    .onConflictDoUpdate({
      target: topics.slug,
      set: { name: sql`excluded.name`, parentSlug: sql`excluded.parent_slug` },
    });
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(topics);
  console.log(`topics seeded: ${count}`);
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(closeDb);
