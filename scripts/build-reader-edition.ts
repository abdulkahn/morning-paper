// TESTING TOOL (command line only — not reachable from the website; needs the
// local DATABASE_URL). Builds a named reader's paper exactly as /today does.
//
//   npm run edition:build -- "Musa Javed"              build or show today's paper
//   npm run edition:build -- "Musa Javed" --rebuild    delete TODAY's paper for
//                                                      this one reader, rebuild it
//   npm run edition:build -- "Musa Javed" --next-day   build a simulated
//                                                      next-day paper (+24 h)
//   --id <uuid>   pick a reader by id when several share a name
//
// In the live product a generated daily edition is frozen; this exists only
// so testers can see ranking changes without creating new readers.
import { and, desc, eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { editions, profiles } from "../src/db/schema";
import { editionDateFor, getOrBuildEdition } from "../src/lib/edition/build";
import { allStories } from "../src/lib/edition/schema";

function arg(flag: string) {
  const i = process.argv.indexOf(flag);
  return i > 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const name = process.argv[2];
  const id = arg("--id");
  if (!name || name.startsWith("--")) {
    throw new Error(
      'usage: npm run edition:build -- "Reader Name" [--rebuild] [--next-day] [--id <uuid>]',
    );
  }
  const db = getDb();
  const matches = await db
    .select()
    .from(profiles)
    .where(id ? eq(profiles.userId, id) : eq(profiles.displayName, name))
    .orderBy(desc(profiles.onboardedAt));
  if (!matches.length) throw new Error(`no reader found for ${id ?? name}`);
  if (matches.length > 1 && !id) {
    console.log(
      `${matches.length} readers are called "${name}"; using the most recently onboarded.`,
    );
    console.log(
      "Pass --id to pick another:",
      matches.map((m) => m.userId).join(", "),
    );
  }
  const reader = matches[0];

  const nextDay = process.argv.includes("--next-day");
  const asOf = nextDay ? new Date(Date.now() + 24 * 36e5) : new Date();

  if (process.argv.includes("--rebuild")) {
    const date = editionDateFor(asOf, reader.timezone);
    const removed = await db
      .delete(editions)
      .where(
        and(eq(editions.userId, reader.userId), eq(editions.editionDate, date)),
      )
      .returning({ id: editions.id });
    console.log(
      `removed ${removed.length} edition(s) dated ${date} for ${reader.displayName}`,
    );
  }

  const started = Date.now();
  const { id: editionId, snapshot } = await getOrBuildEdition(reader.userId, {
    asOf,
  });
  const stories = allStories(snapshot);
  console.log(
    `edition ${editionId} · No. ${snapshot.number} · ${snapshot.date}${nextDay ? " (simulated next day)" : ""} · ${Date.now() - started} ms`,
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
