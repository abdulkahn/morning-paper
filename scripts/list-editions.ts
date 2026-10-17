// Lists recent editions (id, reader, date) for debugging. Usage: npm run editions
import { desc, eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { editions, profiles } from "../src/db/schema";

async function main() {
  const rows = await getDb()
    .select({
      id: editions.id,
      reader: profiles.displayName,
      date: editions.editionDate,
      number: editions.number,
    })
    .from(editions)
    .innerJoin(profiles, eq(profiles.userId, editions.userId))
    .orderBy(desc(editions.createdAt))
    .limit(10);
  console.table(rows);
}

main().finally(closeDb);
