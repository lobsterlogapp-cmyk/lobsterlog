# RECON A — Multi-day (cross-midnight) trip timestamp bug (Session 89)

Recon only. No code changed. The question was: where exactly is a log blocked from
spanning midnight (sail late on Day 1, haul/landing on Day 2)?

## Short answer

There is no explicit "reject cross-midnight" check anywhere. The trip is blocked
*structurally*: the whole stack — form state, the stored data model, and the XML
generator — carries exactly **one** trip date and combines it with four independent
clock times. A trip that crosses midnight is simply not representable. When the four
times get forced onto a single calendar day, the ordering validators (Rules 29 / 32 /
46, depending on which times straddle midnight) fire a false "before" error — or, worse,
the collapse happens to pass and DFO receives timestamps on the wrong day.

The date-time picker itself is already `datetime` mode (it shows a date wheel and hands
back a full `Date`). The only thing throwing the date away is the form funnelling every
field's chosen date into one shared `dateFished` state.

## Root cause, layer by layer

### Layer 1 — the form keeps ONE date and four times

`src/components/FullDfoForm.tsx`

- Line 161 — the single shared trip date: `const [dateFished, setDateFished] = useState('')`.
- Lines 187–190 — the four fields are stored as **time-only** strings, with no date of
  their own:
  - `timeSailed`
  - `timeStartedHauling`
  - `timeStoppedHauling`
  - `timeOfLanding`
- Lines 123–134 — `formatTime()` returns `HH:MM`; `formatDate()` returns `YYYY-MM-DD`.
  They are always split apart.
- Lines 136–151 — `parseDateTime(dateStr, timeStr)` rebuilds a `Date` from one date plus
  one time. It is the read side of the shared-date coupling.

The read path — `openPicker()` (lines 749–764) — seeds every one of the four pickers from
the **same** `dateFished`:

```
case 'sailed':     current = parseDateTime(dateFished, timeSailed); break;
case 'startHaul':  current = parseDateTime(dateFished, timeStartedHauling); break;
case 'stopHaul':   current = parseDateTime(dateFished, timeStoppedHauling); break;
case 'landing':    current = parseDateTime(dateFished, timeOfLanding); break;
```

The write path — `applyPickerValue()` (lines 777–798) — is the actual root cause. Every
field writes the chosen date back into the one shared `dateFished`, and only its own time
into its own slot:

```
case 'sailed':
  setDateFished(formatDate(d)); setTimeSailed(formatTime(d)); break;
case 'startHaul':
  setDateFished(formatDate(d)); setTimeStartedHauling(formatTime(d)); break;
case 'stopHaul':
  setDateFished(formatDate(d)); setTimeStoppedHauling(formatTime(d)); break;
case 'landing':
  setDateFished(formatDate(d)); setTimeOfLanding(formatTime(d)); break;
```

So whichever field the harvester edits **last** stamps its date onto all four. Set the
landing picker to Day 2 and the sail time is silently reinterpreted as Day 2 as well.
Two calendar days can never coexist.

The picker mode is not the problem. `src/components/FullDfoForm.tsx` lines 1887–1905
render `<DateTimePicker … mode={pickerField === null ? 'date' : 'datetime'} … />` on both
iOS (spinner, in a modal) and Android. For the four timestamp fields `pickerField` is
non-null, so the mode is **`datetime`** — a full date+time picker. Only the standalone
"Date Fished" field (pickerField === null) is `date`-only. The picker returns a full
`Date`; `applyPickerValue` discards its date into the shared bucket.

### Layer 2 — the stored data model has one date field

`src/utils/dfoLogStorage.ts`

- Line 40 — `DfoLog` carries a single `dateFished: string; // "YYYY-MM-DD"`. There is no
  per-field date anywhere on the log.
- Lines 158–161 — `FULL_DFO_REQUIRED_FIELDS` lists `sailTime`, `haulStartTime`,
  `haulEndTime`, `landingTime` — all **time-only** — as required fields; `dateFished` is
  the lone date.
- Lines 75–86 — `saveLog()` is a plain persist. It does **no** timezone or same-day
  normalization; it just writes the object. (So the choke point does not itself assume
  same-day — it faithfully stores whatever single date it is given.)
- Lines 180–183 — on load the single `dateFished` is merged into the `data` map for
  unified lookup, reinforcing one-date-per-log.

### Layer 3 — the generator combines the one date with all four times

`src/utils/dfoXmlGenerator.ts`

- Lines 35–44 — `localToUtcIso(dateStr, timeStr)` combines one date + one time into a UTC
  ISO string. A blank/whitespace time returns `''` (the Session 76 hardening — no midnight
  default), which is correct and unrelated to this bug.
- Lines 86–89 — the generator-layer root cause: all four EFFORT/TRIP/LANDING timestamps
  are built from the **same** `log.dateFished`:

```
const startDt     = localToUtcIso(log.dateFished, d.timeSailed);
const haulStartDt = localToUtcIso(log.dateFished, d.timeStartedHauling);
const haulEndDt   = localToUtcIso(log.dateFished, d.timeStoppedHauling);
const landDt      = localToUtcIso(log.dateFished, d.timeOfLanding);
```

  Even if the form were fixed to carry per-field dates, the generator would still collapse
  them here. This line must change in every candidate fix below.
- Line 382 — the QC-88 transfer timestamp is likewise built from `log.dateFished`
  (`toDate12(localToUtcIso(log.dateFished, d.transferTime ?? ''))`), so it inherits the
  same single-date assumption.
- Lines 66–73 — `toDate12()` renders `date_12` (YYYYMMDDHHMM), the format the cross-checks
  compare on.

## The cross-check validators are NOT the blocker

`src/utils/dfoXmlGenerator.ts`

- Rule 30 (line 759) — effort start not in the future.
- Rule 29 (line 763) — effort start ≥ trip start.
- Rule 32 (line 767) — effort end ≥ effort start.
- Rules 45 / 46 (lines 908 / 911) — landing ≥ trip start, and landing ≥ last effort end.
- Rule 248 (line 929) — transfer date ≥ trip start.

Every one of these compares `date_12` strings with plain lexical `<` / `>`. Because
`date_12` is fixed-width, zero-padded, most-significant-first (YYYY MM DD HH MM), a lexical
string comparison **is** a chronological comparison. So:

- A genuine cross-midnight trip whose four timestamps carried the **correct** dates would
  **pass** all of these — Day 2 00:30 sorts after Day 1 23:00 exactly as it should.
- The validators only fire falsely because Layer 1/2/3 collapse the four times onto one
  date. Example: sail entered at 23:00, haul at 00:30 the next morning, both forced onto
  one date → haul appears 22.5 h *before* sail → Rule 29 (`START_DT is before
  TRIP.START_DT`) trips even though the real trip is perfectly ordered.

Conclusion: the validators need **no change**. They are already correct on full
timestamps. Fixing the single-date collapse is both necessary and sufficient; once the
four timestamps carry real dates, these rules validate a multi-day trip cleanly.

## Secondary same-day assumptions (each needs a touch regardless of design)

- `src/components/FullDfoForm.tsx` lines 1144–1151 — Rule 980, the "landing more than 24 h
  after start" warning, computes both ends from `dateFished`, so it too assumes same-day.
- Quick Capture timers: `handleSailPress` / `handleHaulPress` (lines 680–698) and the
  adopt-time effects (lines 542–563) stamp **time-only** values (`sailStartTime` etc.)
  with no date. Any fix that moves to per-field dates must also decide what date a
  timer-captured time gets (presumably "today at capture", which is what makes a
  real-world midnight crossing happen in the first place).
- `src/utils/dfoXmlGenerator.ts` line 382 — the QC-88 transfer timestamp (noted above).

## Candidate fix designs (not chosen — your call)

### Design A — per-field date companions (minimal correct)

Give each of the four times a date string of its own: `sailDate`, `haulStartDate`,
`haulEndDate`, `landingDate` (or a single struct per field). `applyPickerValue` writes the
field's **own** date instead of the shared `dateFished`. Keep `dateFished` as the trip
anchor (the sail date) for `id` / `TRIP_NUM` / `generateNewLogMeta`. The generator's four
`localToUtcIso` calls (lines 86–89) each read that field's own date.

- Migration is clean: old logs/drafts have only `dateFished`; default each missing
  per-field date to `dateFished` on load → byte-identical output for every existing
  single-day log, zero data loss, no forced re-send.
- Handles arbitrary spans (any number of midnights, sail could even cross too).
- Cost: touches the form state, the `DfoLog` model + required-field checks, and the
  generator. Medium. Validators untouched.

### Design B — a "next day" (+1) toggle per field

Keep the single `dateFished` as the sail/base date; add a small per-field day-offset
(a boolean "next day" on haul start / haul end / landing, or an integer offset). The
generator adds N days when combining.

- Smallest data change; no full datetime model.
- Downsides: clunky UX (the harvester must remember to toggle, at sea, at night), and it
  is redundant with the picker, which is already `datetime` and can express the date
  directly — so you would have two competing ways to set a date. Handles the common single
  crossing but is awkward for a sail that itself crosses or for >1-day gaps. UX-limited.

### Design C — store a full datetime per field (drop the split for these four)

Replace the four time-only strings with four full datetime values (ISO or date_12), so the
shared `dateFished` is no longer consulted for sail/haul/landing at all. `dateFished`
survives only as the log's nominal/anchor date for id and tripNum.

- Cleanest long-term model; the picker already returns exactly this.
- Largest churn: the quick-capture timers (they stamp time-only today), the Rule 980 24 h
  warning, the `sailTime/haulStartTime/haulEndTime/landingTime` required-field entries,
  restore/seed-on-edit, and any i18n/display of the bare time all move to the new shape.
  Migration must split each old `dateFished + time` into a datetime. Biggest blast radius.

## Files and lines touched by this bug (summary)

- `src/components/FullDfoForm.tsx` — 161 (shared date state); 187–190 (four time-only
  states); 123–151 (formatDate/formatTime/parseDateTime); 749–764 (openPicker read side);
  777–798 (applyPickerValue write side — the root cause); 1887–1905 (datetime-mode picker);
  1144–1151 (Rule 980 24 h warning, same-day).
- `src/utils/dfoLogStorage.ts` — 40 (single `dateFished` on DfoLog); 158–161 (required
  time-only fields); 75–86 (saveLog, no normalization); 180–183 (dateFished merged into
  data map).
- `src/utils/dfoXmlGenerator.ts` — 35–44 (localToUtcIso); 86–89 (four timestamps from one
  date — generator root cause); 382 (transfer uses dateFished); 66–73 (toDate12); 747–770
  and 905–931 (Rules 29/30/32/45/46/248 — correct as-is, no change needed).
