import type { TopicSlug } from "@/lib/topics";

// Curated, legal, public sources. Reliability over scale: every feed here was
// probed live (npm run ingest:probe) before being enabled. Dropped on
// 2026-10-17: Al Jazeera (fetch failed), VentureBeat (429), Profit (404),
// Nature (no descriptions). `topicHint` is a
// weak prior only; real topics come from classification (M4).

export interface SourceDef {
  slug: string;
  name: string;
  kind: "rss" | "guardian_api";
  url: string;
  /** ISO 3166-1 alpha-2 of the publisher. */
  country: string;
  topicHint: TopicSlug | null;
  /** 0–1 editorial quality prior used by ranking. */
  quality: number;
}

const rss = (
  slug: string,
  name: string,
  url: string,
  country: string,
  topicHint: TopicSlug | null,
  quality = 0.8,
): SourceDef => ({ slug, name, kind: "rss", url, country, topicHint, quality });

export const SOURCES: SourceDef[] = [
  // Global
  rss(
    "bbc-world",
    "BBC News",
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "GB",
    "world",
    0.9,
  ),
  rss(
    "bbc-business",
    "BBC News",
    "https://feeds.bbci.co.uk/news/business/rss.xml",
    "GB",
    "business",
    0.9,
  ),
  rss(
    "bbc-tech",
    "BBC News",
    "https://feeds.bbci.co.uk/news/technology/rss.xml",
    "GB",
    "technology",
    0.9,
  ),
  rss(
    "bbc-science",
    "BBC News",
    "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    "GB",
    "science",
    0.9,
  ),
  rss(
    "bbc-culture",
    "BBC News",
    "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
    "GB",
    "culture",
    0.85,
  ),
  rss(
    "npr-world",
    "NPR",
    "https://feeds.npr.org/1004/rss.xml",
    "US",
    "world",
    0.85,
  ),
  rss(
    "guardian-world",
    "The Guardian",
    "https://www.theguardian.com/world/rss",
    "GB",
    "world",
    0.9,
  ),
  rss(
    "guardian-tech",
    "The Guardian",
    "https://www.theguardian.com/technology/rss",
    "GB",
    "technology",
    0.9,
  ),
  rss(
    "guardian-environment",
    "The Guardian",
    "https://www.theguardian.com/environment/rss",
    "GB",
    "climate-energy",
    0.9,
  ),
  rss(
    "guardian-business",
    "The Guardian",
    "https://www.theguardian.com/business/rss",
    "GB",
    "business",
    0.9,
  ),
  // Technology & AI
  rss(
    "verge",
    "The Verge",
    "https://www.theverge.com/rss/index.xml",
    "US",
    "technology",
    0.8,
  ),
  rss(
    "ars",
    "Ars Technica",
    "https://feeds.arstechnica.com/arstechnica/index",
    "US",
    "technology",
    0.85,
  ),
  rss(
    "techcrunch",
    "TechCrunch",
    "https://techcrunch.com/feed/",
    "US",
    "startups",
    0.8,
  ),
  rss(
    "mit-tr",
    "MIT Technology Review",
    "https://www.technologyreview.com/feed/",
    "US",
    "ai",
    0.9,
  ),
  rss(
    "wired",
    "WIRED",
    "https://www.wired.com/feed/rss",
    "US",
    "technology",
    0.8,
  ),
  rss(
    "ieee-robotics",
    "IEEE Spectrum",
    "https://spectrum.ieee.org/feeds/topic/robotics.rss",
    "US",
    "robotics",
    0.85,
  ),
  // AI & robotics depth (added 2026-10-17 after the first run showed thin coverage)
  rss(
    "techcrunch-ai",
    "TechCrunch",
    "https://techcrunch.com/category/artificial-intelligence/feed/",
    "US",
    "ai",
    0.8,
  ),
  rss(
    "verge-ai",
    "The Verge",
    "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    "US",
    "ai",
    0.8,
  ),
  rss(
    "ars-ai",
    "Ars Technica",
    "https://arstechnica.com/ai/feed/",
    "US",
    "ai",
    0.85,
  ),
  rss(
    "guardian-ai",
    "The Guardian",
    "https://www.theguardian.com/technology/artificialintelligenceai/rss",
    "GB",
    "ai",
    0.9,
  ),
  rss(
    "wired-ai",
    "WIRED",
    "https://www.wired.com/feed/tag/ai/latest/rss",
    "US",
    "ai",
    0.8,
  ),
  rss(
    "mit-news-ai",
    "MIT News",
    "https://news.mit.edu/rss/topic/artificial-intelligence2",
    "US",
    "ai",
    0.85,
  ),
  rss(
    "robot-report",
    "The Robot Report",
    "https://www.therobotreport.com/feed/",
    "US",
    "robotics",
    0.75,
  ),
  // Pakistan
  rss(
    "dawn",
    "Dawn",
    "https://www.dawn.com/feeds/home",
    "PK",
    "pakistan",
    0.85,
  ),
  rss(
    "dawn-business",
    "Dawn",
    "https://www.dawn.com/feeds/business",
    "PK",
    "business",
    0.85,
  ),
  rss(
    "tribune",
    "The Express Tribune",
    "https://tribune.com.pk/feed/home",
    "PK",
    "pakistan",
    0.75,
  ),
  rss("geo", "Geo News", "https://www.geo.tv/rss/1/1", "PK", "pakistan", 0.7),
  rss(
    "brecorder",
    "Business Recorder",
    "https://www.brecorder.com/feeds/latest-news",
    "PK",
    "business",
    0.75,
  ),
  rss(
    "techjuice",
    "TechJuice",
    "https://www.techjuice.pk/feed/",
    "PK",
    "startups",
    0.65,
  ),
  // Sport
  rss(
    "bbc-football",
    "BBC Sport",
    "https://feeds.bbci.co.uk/sport/football/rss.xml",
    "GB",
    "football",
    0.85,
  ),
  rss(
    "bbc-cricket",
    "BBC Sport",
    "https://feeds.bbci.co.uk/sport/cricket/rss.xml",
    "GB",
    "cricket",
    0.85,
  ),
  rss(
    "guardian-football",
    "The Guardian",
    "https://www.theguardian.com/football/rss",
    "GB",
    "football",
    0.85,
  ),
  rss(
    "cricinfo",
    "ESPNcricinfo",
    "https://www.espncricinfo.com/rss/content/story/feeds/0.xml",
    "IN",
    "cricket",
    0.8,
  ),
  // Science, health, crypto
  rss(
    "sciencedaily",
    "ScienceDaily",
    "https://www.sciencedaily.com/rss/all.xml",
    "US",
    "science",
    0.7,
  ),
  rss(
    "bbc-health",
    "BBC News",
    "https://feeds.bbci.co.uk/news/health/rss.xml",
    "GB",
    "health",
    0.9,
  ),
  rss(
    "coindesk",
    "CoinDesk",
    "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "US",
    "crypto",
    0.7,
  ),
  // Full-text API (only used when GUARDIAN_API_KEY is set)
  {
    slug: "guardian-api",
    name: "The Guardian",
    kind: "guardian_api",
    url: "https://content.guardianapis.com/search",
    country: "GB",
    topicHint: null,
    quality: 0.9,
  },
];
