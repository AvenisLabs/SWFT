# SWFT Summary Log

## 2026-08-08 — Discord webhook tagging: Kp-6 threshold + daily reports never tag

- Changed the Discord mention/tag behavior across notification embeds:
  - `buildImmediateEmbed` and `buildSummaryEmbed` (`workers/cron-ingest/src/lib/notif-embeds.ts`) now only include the channel's configured mention when the relevant Kp value (event Kp for immediate, peak Kp in the batch for summary) is >= 6. Events between Kp 5 and 6 still post normally, just without a tag.
  - `buildOffHoursDigestEmbed` now never tags, regardless of the channel's mention setting or peak Kp in the buffered batch — it's a daily-style digest, not a time-sensitive alert.
  - Scheduled K-index pushes (`dispatch-kindex-pushes.ts`) now pass `null` for mention instead of the channel's configured mention, so the daily scheduled K-index report never tags. The on-demand "one-time push" endpoint (manually triggered from the admin UI) is left unchanged and still respects the channel's mention.
- Added regression tests in `tests/notif-embeds.test.ts` covering: mention included at Kp >= 6, mention omitted for Kp 5-6, summary tagging gated on peak Kp, and off-hours digest never tagging even with a configured mention and high peak Kp.
- Validation: `npx vitest run` (162 tests passed), `npx tsc --noEmit -p workers/cron-ingest` (clean), `npx svelte-check` (0 errors, 0 warnings).
- Rotated `summarylog.md` — previous log (last entry 2026-05-17) renamed to `summarylog_2026-05-17.md`.
