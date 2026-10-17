import { SAMPLE_EDITION } from "./sample-edition";
import { editionSnapshotSchema } from "@/lib/edition/schema";
import type { SavedEdition, SavedEditionReader } from "@/lib/edition/archive";

// Local visual development ONLY. The preview route refuses production access.
// These are illustrative snapshots, never stored as a real reader's history.
const older = structuredClone(SAMPLE_EDITION);
older.id = "preview-oct-15";
older.number = 1;
older.date = "2026-10-15";
older.lead.headline =
  "Battery advances bring a quieter future for coastal shipping";
older.lead.topic = "Energy";
older.lead.dek =
  "An illustrative saved edition for testing the archive layout.";
older.sections.reverse();

const yesterday = structuredClone(SAMPLE_EDITION);
yesterday.id = "preview-oct-16";
yesterday.number = 2;
yesterday.date = "2026-10-16";
yesterday.lead.headline =
  "Semiconductor policy changes the outlook for AI researchers";
yesterday.lead.topic = "Semiconductors";
yesterday.lead.dek =
  "An illustrative saved edition for testing the archive layout.";
// Intentionally mixed tiers: the paper must retain this exact stored order.
const [first, second, third, fourth] = yesterday.sections[0].stories;
yesterday.sections[0].stories = [fourth, third, first, second];

const today = structuredClone(SAMPLE_EDITION);
today.id = "preview-oct-17";
today.number = 3;

export const ARCHIVE_PREVIEW_EDITIONS: SavedEdition[] = [
  {
    snapshot: editionSnapshotSchema.parse(older),
    title: "A new current in clean energy",
    pdfAvailable: false,
  },
  {
    snapshot: editionSnapshotSchema.parse(today),
    title: "AI & robotics lead your Saturday edition",
    pdfAvailable: false,
  },
  {
    snapshot: editionSnapshotSchema.parse(yesterday),
    title: "The chips behind a changing world",
    pdfAvailable: false,
  },
];

export const archivePreviewReader: SavedEditionReader = {
  async list() {
    return structuredClone({
      editions: ARCHIVE_PREVIEW_EDITIONS,
      currentEditionId: "preview-oct-17",
    });
  },
  async read(id) {
    const edition = ARCHIVE_PREVIEW_EDITIONS.find(
      (entry) => entry.snapshot.id === id,
    );
    return edition
      ? structuredClone({ edition, isCurrent: id === "preview-oct-17" })
      : null;
  },
};
