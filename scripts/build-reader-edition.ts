// Builds (or returns) today's edition for a reader by display name, exactly as
// /today does. Useful for verifying a reader's paper from the command line.
//   npm run edition:build -- "Musa Javed"
import { desc, eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { profiles } from "../src/db/schema";
import { getOrBuildEdition } from "../src/lib/edition/build";
import { allStories } from "../src/lib/edition/schema";

async function main() {
  const name = process.argv[2];
  if (!name) throw new Error('usage: npm run edition:build -- "Reader Name"');
  const [reader] = await getDb()
    .select()
    .from(profiles)
    .where(eq(profiles.displayName, name))
    .orderBy(desc(profiles.onboardedAt))
    .limit(1);
  if (!reader) throw new Error(`no reader named ${name}`);

  const started = Date.now();
  const { id, snapshot } = await getOrBuildEdition(reader.userId);
  const stories = allStories(snapshot);
  console.log(
    `edition ${id} · No. ${snapshot.number} · ${snapshot.date} · ${Date.now() - started} ms`,
  );
  console.log(`${stories.length} stories, lead: ${snapshot.lead.headline}`);
  console.log(`sections: ${snapshot.sections.map((s) => s.title).join(", ")}`);
  console.log(`three things: ${snapshot.recall.length}`);
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(closeDb);
