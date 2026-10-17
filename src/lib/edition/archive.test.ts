import { describe, expect, it } from "vitest";
import {
  ARCHIVE_PREVIEW_EDITIONS,
  archivePreviewReader,
} from "@/fixtures/archive-preview";
import {
  archiveSummary,
  readArchive,
  readArchivedEdition,
  currentEditionIdForDate,
  type SavedEditionReader,
} from "./archive";
import { allStories, editionStats } from "./schema";
import { editionDateInTimeZone } from "./format";

describe("saved edition archive", () => {
  it("never marks yesterday's latest saved edition as today's paper", () => {
    const rows = [{ id: "yesterday", edition_date: "2026-10-16" }];
    expect(currentEditionIdForDate(rows, "2026-10-17")).toBeNull();
    expect(
      currentEditionIdForDate(
        [...rows, { id: "today", edition_date: "2026-10-17" }],
        "2026-10-17",
      ),
    ).toBe("today");
    expect(currentEditionIdForDate([], "2026-10-17")).toBeNull();
  });

  it("uses reader-local dates across midnight, including a deterministic timezone fallback", () => {
    const now = new Date("2026-10-16T21:00:00Z");
    expect(editionDateInTimeZone(now, "Asia/Karachi")).toBe("2026-10-17");
    expect(editionDateInTimeZone(now, "America/Los_Angeles")).toBe(
      "2026-10-16",
    );
    expect(editionDateInTimeZone(now, "invalid-zone")).toBe("2026-10-16");
  });
  it("sorts editions newest first without changing nested snapshot content", async () => {
    const before = JSON.stringify(ARCHIVE_PREVIEW_EDITIONS);
    const result = await readArchive(archivePreviewReader);
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.data.editions.map((entry) => entry.snapshot.date)).toEqual([
      "2026-10-17",
      "2026-10-16",
      "2026-10-15",
    ]);
    for (const entry of result.data.editions) {
      expect(JSON.stringify(entry)).toBe(
        JSON.stringify(
          ARCHIVE_PREVIEW_EDITIONS.find(
            (saved) => saved.snapshot.id === entry.snapshot.id,
          ),
        ),
      );
    }
    expect(JSON.stringify(ARCHIVE_PREVIEW_EDITIONS)).toBe(before);
  });

  it("reopens two historical snapshots byte-stably without any preference input", async () => {
    for (const id of ["preview-oct-15", "preview-oct-16"]) {
      const expected = ARCHIVE_PREVIEW_EDITIONS.find(
        (e) => e.snapshot.id === id,
      )!;
      const result = await readArchivedEdition(id, archivePreviewReader);
      if (result.status !== "ready")
        throw new Error("Missing historical fixture");
      expect(result.isCurrent).toBe(false);
      expect(JSON.stringify(result.edition)).toBe(JSON.stringify(expected));
      expect(allStories(result.edition.snapshot).map((s) => s.id)).toEqual(
        allStories(expected.snapshot).map((s) => s.id),
      );
    }
  });

  it("keeps current-edition identity explicit, independent of server date", async () => {
    const result = await readArchivedEdition(
      "preview-oct-17",
      archivePreviewReader,
    );
    expect(result.status === "ready" && result.isCurrent).toBe(true);
  });

  it("reports empty, unavailable, missing and failures distinctly", async () => {
    const empty: SavedEditionReader = {
      list: async () => ({ editions: [], currentEditionId: null }),
      read: async () => null,
    };
    const failed: SavedEditionReader = {
      list: async () => {
        throw new Error("private DB error");
      },
      read: async () => {
        throw new Error("private DB error");
      },
    };
    expect(await readArchive(null)).toEqual({ status: "unavailable" });
    expect(await readArchivedEdition("saved-id", null)).toEqual({
      status: "unavailable",
    });
    expect(await readArchive(empty)).toEqual({
      status: "ready",
      data: { editions: [], currentEditionId: null },
    });
    expect(await readArchivedEdition("missing", empty)).toEqual({
      status: "missing",
    });
    expect(await readArchivedEdition("../invalid", empty)).toEqual({
      status: "missing",
    });
    expect(await readArchive(failed)).toEqual({ status: "error" });
    expect(await readArchivedEdition("saved-id", failed)).toEqual({
      status: "error",
    });
  });

  it("rejects corrupt payloads, duplicate identities and mismatched retrieval IDs", async () => {
    const edition = ARCHIVE_PREVIEW_EDITIONS[0];
    const corrupt: SavedEditionReader = {
      list: async () => ({
        editions: [edition, edition],
        currentEditionId: null,
      }),
      read: async () => ({ edition, isCurrent: false }),
    };
    expect(await readArchive(corrupt)).toEqual({ status: "error" });
    expect(await readArchivedEdition("different-id", corrupt)).toEqual({
      status: "error",
    });
    expect(
      await readArchive({
        ...corrupt,
        list: async () => ({
          editions: [{ snapshot: {} }],
          currentEditionId: null,
        }),
      }),
    ).toEqual({ status: "error" });
  });

  it("derives metadata from frozen content and preserves a saved editorial title", () => {
    const entry = ARCHIVE_PREVIEW_EDITIONS[0];
    expect(archiveSummary(entry)).toEqual({
      ...editionStats(entry.snapshot),
      title: entry.title,
      leadHeadline: entry.snapshot.lead.headline,
    });
    expect(archiveSummary({ ...entry, title: null }).title).toBe(
      "Sample Reader’s Edition",
    );
  });
});
