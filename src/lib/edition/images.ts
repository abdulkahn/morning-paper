import { z } from "zod";

// Browser-only image requests: no server image proxy or page scraping.
const httpsUrl = z
  .url()
  .max(2048)
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  }, "Expected an HTTPS URL without credentials");

export const storyImageSchema = z.object({
  url: httpsUrl,
  alt: z.string().min(1).max(240),
  credit: z.string().min(1).max(100),
  creditUrl: httpsUrl,
  kind: z.enum(["publisher", "topic"]),
});
export type StoryImage = z.infer<typeof storyImageSchema>;

// Fixed, credited topic photographs, never a claim to depict the reported event.
// These are also the presentation fallback for snapshots made before images.
export function topicImage(topic: string): StoryImage | null {
  if (/robot/i.test(topic)) {
    return {
      url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1000&q=80",
      alt: "A white humanoid robot; an illustrative robotics photograph",
      credit: "Alex Knight / Unsplash",
      creditUrl: "https://unsplash.com/photos/2EJCSULRwC8",
      kind: "topic",
    };
  }
  if (
    /semiconductor|artificial intelligence|\bai\b|comput|technology/i.test(
      topic,
    )
  ) {
    return {
      url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80",
      alt: "A close view of an electronic circuit board; an illustrative technology photograph",
      credit: "Alexandre Debiève / Unsplash",
      creditUrl: "https://unsplash.com/photos/FO7JIlwjOtU",
      kind: "topic",
    };
  }
  if (/space|climate|environment/i.test(topic)) {
    return {
      url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1000&q=80",
      alt: "Earth viewed from orbit; an illustrative space photograph",
      credit: "NASA / Unsplash",
      creditUrl: "https://unsplash.com/photos/Q1p7bh3SHj8",
      kind: "topic",
    };
  }
  return null;
}

export function selectStoryImage(
  topic: string,
  candidates: { imageUrl: string | null; name: string; url: string }[],
): StoryImage | null {
  for (const candidate of candidates) {
    const result = storyImageSchema.safeParse({
      url: candidate.imageUrl,
      alt: `Image supplied by ${candidate.name} for this story`,
      credit: candidate.name,
      creditUrl: candidate.url,
      kind: "publisher",
    });
    if (result.success) return result.data;
  }
  return topicImage(topic);
}
