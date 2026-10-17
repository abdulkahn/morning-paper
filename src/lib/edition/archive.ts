import { z } from "zod";
import { editionSnapshotSchema, editionStats } from "./schema";

const editionIdSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);

/** Metadata must be saved with the edition, never inferred from today's profile. */
export const savedEditionSchema = z.object({
  snapshot: editionSnapshotSchema.refine(
    (snapshot) => editionIdSchema.safeParse(snapshot.id).success,
    { message: "Invalid saved edition ID" },
  ),
  title: z.string().min(1).max(160).nullable().default(null),
  pdfAvailable: z.boolean().default(false),
});
export type SavedEdition = z.infer<typeof savedEditionSchema>;

const archiveSchema = z.object({
  editions: z.array(savedEditionSchema),
  // An explicit backend pointer; do not compare dates using the server timezone.
  currentEditionId: z.string().min(1).nullable(),
});
export type ArchiveData = z.infer<typeof archiveSchema>;
export type ArchiveResult =
  { status: "ready"; data: ArchiveData } | { status: "unavailable" | "error" };
export type ArchivedEditionResult =
  | { status: "ready"; edition: SavedEdition; isCurrent: boolean }
  | { status: "missing" | "unavailable" | "error" };

/**
 * M7 integration seam, NOT a new storage system. Implement using the existing
 * reader-scoped Supabase client once edition persistence exists. Each method
 * must authorize the reader through RLS; never use the owner Drizzle client.
 * The loader deliberately has no sample-data fallback in production.
 */
export interface SavedEditionReader {
  list(): Promise<unknown>;
  read(id: string): Promise<unknown>;
}

export async function readArchive(
  reader: SavedEditionReader | null,
): Promise<ArchiveResult> {
  if (!reader) return { status: "unavailable" };
  try {
    const data = archiveSchema.parse(await reader.list());
    const ids = data.editions.map((entry) => entry.snapshot.id);
    if (new Set(ids).size !== ids.length) return { status: "error" };
    // Only edition cards are sorted. Nested sections/stories are untouched.
    const editions = [...data.editions].sort(
      (a, b) =>
        b.snapshot.date.localeCompare(a.snapshot.date) ||
        b.snapshot.number - a.snapshot.number ||
        a.snapshot.id.localeCompare(b.snapshot.id),
    );
    return { status: "ready", data: { ...data, editions } };
  } catch {
    return { status: "error" };
  }
}

export async function readArchivedEdition(
  id: string,
  reader: SavedEditionReader | null,
): Promise<ArchivedEditionResult> {
  if (!editionIdSchema.safeParse(id).success) return { status: "missing" };
  if (!reader) return { status: "unavailable" };
  try {
    const raw = await reader.read(id);
    if (raw === null) return { status: "missing" };
    const result = z
      .object({
        edition: savedEditionSchema,
        isCurrent: z.boolean(),
      })
      .parse(raw);
    if (result.edition.snapshot.id !== id) return { status: "error" };
    return { status: "ready", ...result };
  } catch {
    return { status: "error" };
  }
}

export function archiveSummary(edition: SavedEdition) {
  return {
    ...editionStats(edition.snapshot),
    title: edition.title ?? `${edition.snapshot.readerName}’s Edition`,
    leadHeadline: edition.snapshot.lead.headline,
  };
}
