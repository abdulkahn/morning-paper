import { z } from "zod";

// The frozen snapshot of one edition. Web (/paper) and print (/print → PDF)
// both render from this shape, so an edition looks the same everywhere and
// never changes after it is generated.

export const storyTierSchema = z.enum(["lead", "major", "standard", "brief"]);
export type StoryTier = z.infer<typeof storyTierSchema>;

export const sourceRefSchema = z.object({
  name: z.string().min(1).max(80),
  url: z.url(),
});

export const explainerSchema = z.object({
  term: z.string().min(1).max(60),
  text: z.string().min(1).max(200),
});

export const continuingSchema = z.object({
  /** ISO timestamp of the reader's previous read of this story. */
  lastReadAt: z.iso.datetime(),
  newFacts: z.array(z.string().min(1).max(240)).max(6),
  changedFacts: z.array(z.string().min(1).max(240)).max(4),
});

export const storySnapshotSchema = z.object({
  id: z.string().min(1),
  clusterId: z.string().min(1),
  tier: storyTierSchema,
  topic: z.string().min(1).max(40),
  headline: z.string().min(1).max(160),
  dek: z.string().min(1).max(280),
  brief: z.array(z.string().min(1).max(1200)).max(4),
  keyPoints: z.array(z.string().min(1).max(240)).max(5),
  whyInPaper: z.string().max(160).nullable(),
  continuing: continuingSchema.nullable(),
  explainers: z.array(explainerSchema).max(2),
  sources: z.array(sourceRefSchema).min(1).max(8),
  publishedAt: z.iso.datetime(),
  readMinutes: z.number().positive().max(10),
});
export type StorySnapshot = z.infer<typeof storySnapshotSchema>;

export const sectionSnapshotSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1).max(40),
  stories: z.array(storySnapshotSchema).min(1),
});
export type SectionSnapshot = z.infer<typeof sectionSnapshotSchema>;

export const editionSnapshotSchema = z
  .object({
    id: z.string().min(1),
    number: z.number().int().positive(),
    /** Local calendar date of the edition, YYYY-MM-DD. */
    date: z.iso.date(),
    readerName: z.string().min(1).max(40),
    /** True for fixture/sample editions so the UI can label them honestly. */
    isSample: z.boolean(),
    editorNote: z.string().max(600).nullable(),
    lead: storySnapshotSchema,
    sections: z.array(sectionSnapshotSchema),
  })
  .refine((e) => e.lead.tier === "lead", {
    message: "lead story must have tier 'lead'",
    path: ["lead", "tier"],
  })
  .refine(
    (e) => e.sections.every((s) => s.stories.every((st) => st.tier !== "lead")),
    {
      message: "only the lead story may have tier 'lead'",
      path: ["sections"],
    },
  );
export type EditionSnapshot = z.infer<typeof editionSnapshotSchema>;

export function allStories(edition: EditionSnapshot): StorySnapshot[] {
  return [edition.lead, ...edition.sections.flatMap((s) => s.stories)];
}

export interface EditionStats {
  stories: number;
  sources: number;
  readingMinutes: number;
}

/** Derived, never stored, so the masthead numbers can't drift from content. */
export function editionStats(edition: EditionSnapshot): EditionStats {
  const stories = allStories(edition);
  const sources = new Set(
    stories.flatMap((s) => s.sources.map((src) => src.name)),
  );
  const minutes = stories.reduce((sum, s) => sum + s.readMinutes, 0);
  return {
    stories: stories.length,
    sources: sources.size,
    readingMinutes: Math.round(minutes),
  };
}
