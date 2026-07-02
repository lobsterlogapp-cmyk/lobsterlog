# GATE 1b — Phase 1b results (Session 90)

Two small follow-on edits to the multi-day timestamp work, both in
`src/components/FullDfoForm.tsx`. No commit. `dfoXmlGenerator.ts` was not touched in 1b
(it still carries the Phase 1 per-field-date change).

## Edit 1 — Rule 980 "landing >24h in future" warning repointed

The non-blocking landing-in-future warning (~line 1159) computed the landing datetime from
`dateFished` alone. With per-field dates that is now the sail-start date, not the landing
date, so on a cross-midnight trip it read one day early.

Change: introduced `const landDateStr = landingDate || dateFished;` and the warning now
splits `landDateStr` (falling back to `dateFished` when the landing field has no own date —
old logs, same-day trips, or a landing time set before any date pick). The guard changed
from `if (dateFished && timeOfLanding)` to `if (landDateStr && timeOfLanding)`. Logic is
otherwise identical; still non-blocking, still just an Alert.

## Edit 2 — Quick Capture stamps the companion date from the same now() moment

Before 1b, the Quick Capture buttons stamped a time (via the timer context + the adopt
effects, and via `setTimeOfLanding` for stop-sail) but never a companion date, so a
Quick-Capture midnight crossing fell back to `dateFished`. Now each handler captures a
single `const now = new Date()` at the button press and writes that field's companion date
key alongside the time.

`handleSailPress`:
- Start Sail (if-branch): `setSailDate(formatDate(now))` and `setDateFished(formatDate(now))`
  — sail-start drives the trip's nominal date, matching the picker path. The time is still
  adopted asynchronously via the `sailStartTime` effect (unchanged).
- Stop Sail = landing (else-branch): keeps `setTimeOfLanding(time)` and adds
  `setLandingDate(formatDate(now))`.

`handleHaulPress`:
- Start Haul (if-branch): adds `setHaulStartDate(formatDate(now))`; time still adopted via
  the `haulStartTime` effect.
- Stop Haul (else-branch): adds `setHaulEndDate(formatDate(now))`; time still adopted via
  the guarded `haulEndTime` effect; the existing GPS capture is unchanged.

Design note: the companion date is stamped in the handlers (at the actual button press),
not in the timer-adopt effects. This is deliberate — the effects also fire at mount when
the timer context holds a leftover value (that is why the haul-end effect has its
`haulEndAtMountRef` stale-guard), so stamping a date there could overwrite `dateFished` or a
companion date when merely editing an existing log. Stamping in the handler means the write
happens only on a genuine Quick Capture press. The time (from the timer's captured moment)
and the date (from `new Date()` in the handler) are the same press, so they agree on the
day except in a sub-second midnight-straddle that is not worth engineering around.

## Verification

- tsc: 33/33 (baseline held, zero new errors).
- jest named suites: `blankTimestampGate.oneoff` PASS, `launderSweep.oneoff` PASS
  (2 suites, 4 tests). The `QC-88: FAIL (2)` line in launderSweep output is that test's own
  expected-failure console log, pre-existing and unrelated to this change.
- jest full suite: 17 suites passed, 55 tests passed.

## Scope

Phase 1b changed only `src/components/FullDfoForm.tsx`. The blank-timestamp gate is
unchanged (still keyed on the HH:MM time fields), so a blank timestamp still blocks the
save. Companion dates remain non-required (they resolve to `dateFished` when blank).
Backward-compat is unchanged from Phase 1: old logs load, display, re-open, and re-save
byte-identically; the Quick Capture change only adds a date write on new button presses.
