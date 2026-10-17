# SPEC — The Morning Paper (frozen)

## Problem

News is scattered across sites, apps and newsletters. People consume too much, jump between sources, and can't name what they actually learned.

## Product

**A paper that remembers what you already know.** A finite daily edition assembled by a personal editor with three memories:
interests (what you care about), exposure (which stories you've read and how far), knowledge (concepts you understand, facts you recalled).

## Required (challenge)

1. Onboarding that captures enough to personalize.
2. A fresh personalized paper every day.
3. Full daily paper as a web experience.
4. Downloadable newspaper-style PDF.
5. Access to previous editions.
6. Learns from behavior so future papers reflect what the reader cares about.
7. Room for creative interpretation.

## Core differentiators

- **Since You Last Read** — continuing stories show only facts new since the reader's last read, plus reversals; background collapsed.
- **Reader Knowledge** — concept familiarity per reader; explainers only for unfamiliar concepts.
- **Three Things** — 3-question recall at the end of each edition; misses resurface (Leitner 1/3/7/14 days).
- **Visible editor** — Editor's Note, "Why this is in your paper", Talk to Your Editor with validated diffs.

## Principles

- Finite: fixed budget (5/15/25 min ≈ 5/12/18 stories), ends with "You're caught up."
- Stable: an edition is frozen once generated; behavior shapes only future editions.
- Personalization drives lead story, order, section prominence, tier, explanation depth, stories per section.

## MVP

Real-news ingestion (RSS + Guardian API) · story clustering into threads · fact ledger · onboarding (headline duels, free text, length, live preview) · derived topic weights · transparent weighted ranking · frozen editions · Today's Paper · article reader with brief, key points, background, original links · why-text · explicit + implicit signals · Reader Knowledge · Since You Last Read · Three Things · archive · newspaper PDF · Editor's Note · Talk to Your Editor · demo time-travel/seeding.

## Stretch (only after MVP is green, behind flags)

Outside Your Bubble · So What For You? · Calm Edition · story timeline · knowledge visualization · How the World Covers It · animations.

## Non-goals

Social, comments, messaging, payments, subscriptions, admin dashboard, native app, custom auth, notifications, microservices, Kubernetes, custom ML, multi-agent theatre.

## Golden demo (≤ 5 min)

1. Live onboarding; preview re-ranks; free text; first paper builds with real progress.
2. Lead story with "Why this leads your paper"; open it, see a concept explainer; answer Three Things (miss one).
3. Seeded "Day 3" reader (labelled simulated history): Since You Last Read with new facts + a reversal; side-by-side with a fresh reader.
4. "Day 5": Editor's Note names what changed; My Editor shows interests + knowledge tree; Talk to Editor diff → Apply.
5. Archive shows Day 1 unchanged; download PDF; architecture diagram.

## Acceptance criteria

- Two different readers get different leads/section orders from the same day's clusters.
- Reloading or interacting never reorders today's edition; past editions are byte-stable.
- One accidental click moves a topic weight by ≤ 2 points; explicit feedback visibly shifts tomorrow.
- A story read at T and updated later shows only post-T facts.
- A concept seen many times shows no explainer; an unseen one does.
- A wrong recall answer resurfaces in the next edition.
- PDF has masthead, reader name, date, edition number, lead, sections, columns, page numbers.
- Every external failure (news, LLM, PDF, images) has a working fallback.
