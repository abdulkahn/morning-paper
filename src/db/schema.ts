import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  jsonb,
  pgPolicy,
  pgTable,
  primaryKey,
  integer,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import {
  anonRole,
  authenticatedRole,
  authUid,
  authUsers,
} from "drizzle-orm/supabase";

// Reader-facing tables. Every per-user table has RLS: a reader can only touch
// their own rows through the Supabase client. Workers connect as the database
// owner (DATABASE_URL) and bypass RLS.

const createdAt = timestamp("created_at", { withTimezone: true })
  .notNull()
  .defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow();

const ownRow = (userId: AnyPgColumn) => sql`${authUid} = ${userId}`;

export const topics = pgTable(
  "topics",
  {
    slug: text("slug").primaryKey(),
    name: text("name").notNull(),
    parentSlug: text("parent_slug").references((): AnyPgColumn => topics.slug),
    createdAt,
  },
  () => [
    pgPolicy("topics are public", {
      for: "select",
      to: [anonRole, authenticatedRole],
      using: sql`true`,
    }),
  ],
).enableRLS();

export const profiles = pgTable(
  "profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    displayName: text("display_name"),
    readingMinutes: smallint("reading_minutes").notNull().default(15),
    /** Free text the reader wrote during onboarding; never inferred. */
    readerContext: text("reader_context"),
    timezone: text("timezone").notNull().default("Asia/Karachi"),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => [
    check("profiles_reading_minutes", sql`${t.readingMinutes} in (5, 15, 25)`),
    check(
      "profiles_display_name_len",
      sql`${t.displayName} is null or char_length(${t.displayName}) between 1 and 40`,
    ),
    check(
      "profiles_reader_context_len",
      sql`${t.readerContext} is null or char_length(${t.readerContext}) <= 500`,
    ),
    pgPolicy("read own profile", {
      for: "select",
      to: authenticatedRole,
      using: ownRow(t.userId),
    }),
    pgPolicy("create own profile", {
      for: "insert",
      to: authenticatedRole,
      withCheck: ownRow(t.userId),
    }),
    pgPolicy("update own profile", {
      for: "update",
      to: authenticatedRole,
      using: ownRow(t.userId),
      withCheck: ownRow(t.userId),
    }),
  ],
).enableRLS();

/** Base interest weights from onboarding and Talk-to-Editor (signals are added on top). */
export const userTopicBase = pgTable(
  "user_topic_base",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.userId, { onDelete: "cascade" }),
    topicSlug: text("topic_slug")
      .notNull()
      .references(() => topics.slug),
    baseWeight: real("base_weight").notNull().default(0.5),
    muted: boolean("muted").notNull().default(false),
    updatedAt,
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.topicSlug] }),
    check("user_topic_base_weight_range", sql`${t.baseWeight} between 0 and 1`),
    pgPolicy("manage own topic weights", {
      for: "all",
      to: authenticatedRole,
      using: ownRow(t.userId),
      withCheck: ownRow(t.userId),
    }),
  ],
).enableRLS();

export const EVENT_TYPES = [
  "pair_choice",
  "story_open",
  "story_dwell",
  "original_open",
  "story_skip",
  "more_like_this",
  "less_like_this",
  "follow_story",
  "unfollow_story",
  "mute_topic",
  "unmute_topic",
  "explainer_open",
  "concept_known",
  "recall_answer",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Append-only interaction log. Interest weights are derived from it. */
export const events = pgTable(
  "events",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.userId, { onDelete: "cascade" }),
    type: text("type").notNull().$type<EventType>(),
    topicSlug: text("topic_slug").references(() => topics.slug),
    // Foreign keys to clusters/edition stories are added when those tables exist.
    clusterId: uuid("cluster_id"),
    editionStoryId: uuid("edition_story_id"),
    value: jsonb("value").notNull().default({}),
    createdAt,
  },
  (t) => [
    index("events_user_created_idx").on(t.userId, t.createdAt),
    check(
      "events_type_valid",
      sql.raw(`type in (${EVENT_TYPES.map((e) => `'${e}'`).join(", ")})`),
    ),
    pgPolicy("read own events", {
      for: "select",
      to: authenticatedRole,
      using: ownRow(t.userId),
    }),
    pgPolicy("append own events", {
      for: "insert",
      to: authenticatedRole,
      withCheck: ownRow(t.userId),
    }),
  ],
).enableRLS();

// ---- News pipeline (global, worker-only) ----
// RLS is enabled with no reader policies and no reader grants, so only the
// worker connection (table owner) and service_role can touch these tables.

export const sources = pgTable(
  "sources",
  {
    slug: text("slug").primaryKey(),
    name: text("name").notNull(),
    kind: text("kind").notNull().$type<"rss" | "guardian_api">(),
    url: text("url").notNull(),
    country: text("country").notNull(),
    topicHint: text("topic_hint").references(() => topics.slug),
    quality: real("quality").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt,
    updatedAt,
  },
  (t) => [
    check("sources_kind_valid", sql`${t.kind} in ('rss', 'guardian_api')`),
    check("sources_quality_range", sql`${t.quality} between 0 and 1`),
  ],
).enableRLS();

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceSlug: text("source_slug")
      .notNull()
      .references(() => sources.slug),
    /** Canonical URL (tracking params stripped). Original links point here. */
    url: text("url").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    /** Full text when the source licenses it (Guardian API); never displayed. */
    bodyText: text("body_text"),
    imageUrl: text("image_url"),
    author: text("author"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    language: text("language").notNull().default("en"),
    /** Hash of the normalised title, for spotting syndicated copies. */
    contentHash: text("content_hash").notNull(),
    topicHint: text("topic_hint").references(() => topics.slug),
    embedding: vector("embedding", { dimensions: 1024 }),
    embeddingModel: text("embedding_model"),
    clusterId: uuid("cluster_id").references(
      (): AnyPgColumn => storyClusters.id,
    ),
    clusteredAt: timestamp("clustered_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("articles_url_key").on(t.url),
    index("articles_cluster_idx").on(t.clusterId),
    index("articles_published_idx").on(t.publishedAt),
    index("articles_content_hash_idx").on(t.contentHash),
    check("articles_title_len", sql`char_length(${t.title}) between 1 and 300`),
    check(
      "articles_description_len",
      sql`${t.description} is null or char_length(${t.description}) <= 2000`,
    ),
    check(
      "articles_body_len",
      sql`${t.bodyText} is null or char_length(${t.bodyText}) <= 50000`,
    ),
  ],
).enableRLS();

export const PIPELINE_KINDS = ["ingest", "enrich", "editions"] as const;
export const PIPELINE_STATUSES = [
  "running",
  "succeeded",
  "partial",
  "failed",
] as const;

export const pipelineRuns = pgTable(
  "pipeline_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull().$type<(typeof PIPELINE_KINDS)[number]>(),
    status: text("status")
      .notNull()
      .default("running")
      .$type<(typeof PIPELINE_STATUSES)[number]>(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    stats: jsonb("stats").notNull().default({}),
    errors: jsonb("errors").notNull().default([]),
  },
  (t) => [
    index("pipeline_runs_kind_started_idx").on(t.kind, t.startedAt),
    check(
      "pipeline_runs_kind_valid",
      sql.raw(`kind in (${PIPELINE_KINDS.map((k) => `'${k}'`).join(", ")})`),
    ),
    check(
      "pipeline_runs_status_valid",
      sql.raw(
        `status in (${PIPELINE_STATUSES.map((s) => `'${s}'`).join(", ")})`,
      ),
    ),
  ],
).enableRLS();

/** One developing story. Articles join by embedding similarity (src/lib/cluster). */
export const storyClusters = pgTable(
  "story_clusters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Working title: the first article's headline until enrichment writes one. */
    title: text("title").notNull(),
    topicSlug: text("topic_slug").references(() => topics.slug),
    /** Clusters only ever compare against embeddings from the same model. */
    embeddingModel: text("embedding_model").notNull(),
    centroid: vector("centroid", { dimensions: 1024 }).notNull(),
    keyTerms: text("key_terms")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    articleCount: integer("article_count").notNull().default(0),
    sourceCount: integer("source_count").notNull().default(0),
    // Written by enrichment (worker/enrich.ts); null until enriched.
    headline: text("headline"),
    dek: text("dek"),
    brief: jsonb("brief").$type<string[]>(),
    whyItMatters: text("why_it_matters"),
    keyPoints: jsonb("key_points").$type<string[]>(),
    importance: smallint("importance"),
    enrichedAt: timestamp("enriched_at", { withTimezone: true }),
    enrichedArticleCount: integer("enriched_article_count"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    lastArticleAt: timestamp("last_article_at", {
      withTimezone: true,
    }).notNull(),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("story_clusters_active_idx").on(t.embeddingModel, t.lastArticleAt),
  ],
).enableRLS();

/** Concepts a reader may or may not know (people, orgs, tech, terms...). */
export const concepts = pgTable(
  "concepts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    explainer: text("explainer").notNull(),
    createdAt,
  },
  (t) => [uniqueIndex("concepts_slug_key").on(t.slug)],
).enableRLS();

export const clusterConcepts = pgTable(
  "cluster_concepts",
  {
    clusterId: uuid("cluster_id")
      .notNull()
      .references(() => storyClusters.id, { onDelete: "cascade" }),
    conceptId: uuid("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.clusterId, t.conceptId] })],
).enableRLS();

/**
 * Fact ledger: atomic facts per story with when they first appeared. Powers
 * "Since you last read" (facts newer than the reader's last read) and recall.
 */
export const storyFacts = pgTable(
  "story_facts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clusterId: uuid("cluster_id")
      .notNull()
      .references(() => storyClusters.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    importance: smallint("importance").notNull().default(2),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    /** Optional multiple-choice recall question about this fact. */
    recall: jsonb("recall").$type<{
      question: string;
      options: string[];
      answerIndex: number;
    }>(),
    createdAt,
  },
  (t) => [
    index("story_facts_cluster_idx").on(t.clusterId, t.firstSeenAt),
    check("story_facts_importance", sql`${t.importance} between 1 and 3`),
  ],
).enableRLS();
