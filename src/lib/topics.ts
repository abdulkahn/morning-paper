// The fixed topic taxonomy. Small and flat on purpose: ranking, sections and
// interest weights all key off these slugs. Seeded into the `topics` table.

export interface Topic {
  slug: string;
  name: string;
  parent: string | null;
}

export const TOPICS = [
  { slug: "technology", name: "Technology", parent: null },
  { slug: "ai", name: "Artificial Intelligence", parent: "technology" },
  { slug: "robotics", name: "Robotics", parent: "technology" },
  { slug: "semiconductors", name: "Semiconductors", parent: "technology" },
  { slug: "science", name: "Science", parent: null },
  { slug: "health", name: "Health", parent: null },
  { slug: "climate-energy", name: "Climate & Energy", parent: null },
  { slug: "business", name: "Business & Markets", parent: null },
  { slug: "startups", name: "Startups", parent: "business" },
  { slug: "crypto", name: "Crypto", parent: "business" },
  { slug: "pakistan", name: "Pakistan", parent: null },
  { slug: "world", name: "World", parent: null },
  { slug: "politics", name: "Politics", parent: null },
  { slug: "sport", name: "Sport", parent: null },
  { slug: "football", name: "Football", parent: "sport" },
  { slug: "cricket", name: "Cricket", parent: "sport" },
  { slug: "culture", name: "Culture & Entertainment", parent: null },
] as const satisfies readonly Topic[];

export type TopicSlug = (typeof TOPICS)[number]["slug"];

export const TOPIC_SLUGS = TOPICS.map((t) => t.slug) as [
  TopicSlug,
  ...TopicSlug[],
];
