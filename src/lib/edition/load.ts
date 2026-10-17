import { SAMPLE_EDITION } from "@/fixtures/sample-edition";
import type { EditionSnapshot } from "./schema";

// M1: only the sample edition exists. M7 replaces this with a database read
// of the frozen snapshot, keeping the same signature.
export async function loadEdition(id: string): Promise<EditionSnapshot | null> {
  return id === SAMPLE_EDITION.id ? SAMPLE_EDITION : null;
}

export const STATIC_EDITION_IDS = [SAMPLE_EDITION.id];
