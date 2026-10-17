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
  real,
  smallint,
  text,
  timestamp,
  uuid,
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
