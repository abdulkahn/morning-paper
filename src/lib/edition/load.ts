import { eq } from "drizzle-orm";
import { SAMPLE_EDITION } from "@/fixtures/sample-edition";
import { editionSnapshotSchema, type EditionSnapshot } from "./schema";

// Loads a frozen edition by id: the sample fixture, or a stored edition.
// Stored editions are addressed by unguessable UUIDs (also used by the PDF
// renderer, which has no session); the web pages additionally check ownership.

export const STATIC_EDITION_IDS = [SAMPLE_EDITION.id];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadEdition(
  id: string,
): Promise<(EditionSnapshot & { userId?: string }) | null> {
  if (id === SAMPLE_EDITION.id) return SAMPLE_EDITION;
  if (!UUID.test(id)) return null;
  const [{ getDb }, { editions }] = await Promise.all([
    import("@/db"),
    import("@/db/schema"),
  ]);
  const [row] = await getDb()
    .select({ snapshot: editions.snapshot, userId: editions.userId })
    .from(editions)
    .where(eq(editions.id, id));
  if (!row) return null;
  return { ...editionSnapshotSchema.parse(row.snapshot), userId: row.userId };
}
