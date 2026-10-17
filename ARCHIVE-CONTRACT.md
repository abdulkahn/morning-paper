# Previous editions archive — reduced scope

The user calls this M11; PLAN.md currently calls Archive M12. The reduced archive scope in the user's request takes precedence over the older, larger description. Existing recall and backend features belong to the other agent and are preserved.

## Reconciliation

Reviewed main at 130965c against the original archive commit 1df979e. Newer work affected e2e/golden-path.spec.ts and src/lib/edition/build.ts; neither was overwritten. Reused the existing archive routes, snapshot validation, reader-scoped adapter, presentation, and local previews.

The archive now shows only date, lead headline, story count, reading time, current/historical status, Open Edition, and supported PDF capability. Removed duplicate editorial titles and source-count display. The common web design uses a restrained light canvas, serif headlines, sans-serif navigation, thin rules, and black actions inspired by https://www.harvey.ai/. Print retains its own typography and hides web navigation.

## Data and navigation

- `/archive` lists persisted editions through the session-bound Supabase client and RLS. `/archive/[editionId]` reads just the requested saved row. No owner connection, ranking, current preferences, generation, AI, or news queries are used to reconstruct history.
- The existing SavedEditionReader contract remains: list returns `{ editions: [{ snapshot, title, pdfAvailable }], currentEditionId }`; read returns `{ edition, isCurrent }` or null. Snapshot JSON is validated, with nested section/story order preserved. Errors never substitute fixture history.
- Today's marker uses the saved edition_date and the reader profile timezone. A latest edition from yesterday stays archived. Invalid stored timezones fall back to UTC. Timezone is used only for this label, never to regenerate snapshots.
- `/today` owns the existing current-paper flow. `/paper` is a compatibility redirect. Archive and historical views link to `/today`.
- Historical PDF actions remain disabled until the existing PDF route's reader authorization is verified. The original `/api/pdf/demo` remains available. No PDF architecture changes or fake downloads.
- `/archive/preview` and its state/edition routes remain clearly labelled local fixtures, inaccessible outside development. They use the same presentation and validation code, with no additional archive storage.

## Verification boundary

Unit tests cover saved ordering, corrupt/missing data, reader-local dates, and a stale latest edition. Browser tests cover two historical samples, navigation, reload stability, mobile widths, keyboard access, and PDF/print regression. These local fixtures are not proof of live multi-reader RLS or real historical-PDF authorization. Those live checks remain for backend integration.
