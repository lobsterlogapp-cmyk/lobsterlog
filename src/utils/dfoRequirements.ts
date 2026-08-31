// dfoRequirements.ts — the shared DFO required-field table (S140 P1).
//
// ONE place in the code that answers: for THIS container, on THIS subform, with THIS
// fishing area, given what's already entered in it — which fields must hold a value
// before the container may be sealed, and what is each field called on screen?
//
// Design authority: docs/DESIGN_S139_SINGLE_SOURCE_AND_CLOSE_GATE.md (fully ruled).
// DFO authority behind every entry: Subforms_requirements_234.xlsx (region columns
// QC 88 / GLF 89 / MAR 90 / NL 91) + the FS-NAT-234-12 / 222-1 / 233-2 fact-sheet rules,
// as verified in docs/RECON_S139B_VERIFICATION.md.
//
// P1 is DARK: nothing on screen reads this module yet. The asterisks (P2), the close
// gates (P3/P3b) and the footer/meter (P4) repoint here in later phases. The send
// validators (validateElogXml / validateForm222Xml / validateForm233Xml) deliberately
// stay independent — the agreement test in __tests__/dfoRequirements.oneoff.test.ts
// cross-checks this table against them so the two sources cannot drift unnoticed.
//
// Value checks carry ONLY the ranges/formats the send validators already apply —
// nothing new, so a value this table accepts can never bounce at send on a range the
// table should have known about, and a value it rejects would have bounced anyway.

import {
  DFO_FMA_38B,
  DFO_FMA_LGRID_REQUIRED,
  DFO_FMA_HLIN_REQUIRED,
  DFO_FMA_NB_VNTCH,
  DFO_FMA_NB_VNTCH_YOU,
  DFO_GRID_BLOCKED_FMA,
  DFO_FMA_GRID_MAP,
  DFO_FMA_STAT_SECT_REQUIRED,
  effortCoordsEntryAllowed,
  baitConditionState,
  clampCoord4,
} from './dfoConstants';

// ─── Types ──────────────────────────────────────────────────────────────────

export type RequirementState = 'mandatory' | 'optional' | 'blocked';

export type RequirementKind =
  | 'per-subform'                // fixed M/O/B per region, straight from the spreadsheet matrix
  | 'by-fishing-area'            // flips M/B by the container's own FMA (rule sets in dfoConstants)
  | 'depends-on-another-answer'  // decided by a sibling field's value (formula stored here)
  | 'exactly-one-of-a-pair'      // precisely one of two fields must hold a value
  | 'answered'                   // must be answered Y or N; deliberately starts unanswered (Rule 602)
  | 'app-supplied';              // DFO-required but app-filled — documented, never gated
// (An eighth concern, whole-group-required, is not a field: see requiredGroups().)

export type DfoContainerId =
  | 'trip'         // Trip Information — never closes (DFO §5.2.1 omits TRIP); footer/send only
  | 'effort'       // one effort / trap group — evaluated with ITS OWN FMA and values
  | 'sar'          // one species-at-risk block
  | 'baitRow'      // one bait row
  | 'bycatchRow'   // one bycatch row
  | 'landing'
  | 'hlin'
  | 'hlout'
  | 'transfer'     // NOTE: carrier VRN rides this container — it seals under the transfer close
  | 'personalUse'
  | 'form222'      // the whole Form 222 (MM_INTER)
  | 'form233';     // the whole Form 233 (REPORT)

export interface RequirementContext {
  subformId: number;
  /** The container's OWN fishing area — each effort/trap group passes its own (per-block). */
  fmaId?: number | null;
  /** FMAs of every effort on the logbook — the hail rules (660/661, 2024/2025) key on these. */
  effortFmaIds?: number[];
}

/** Current values of the container's fields, keyed by fieldKey. Blank/null/undefined = empty. */
export type FieldValues = Record<string, string | null | undefined>;

export interface FieldRequirement {
  fieldKey: string;
  container: DfoContainerId;
  /** Existing i18n key in the dfo namespace (bilingual for free); null = app-supplied, never shown. */
  labelKey: string | null;
  kind: RequirementKind;
  /** Resolve mandatory/optional/blocked for this context (+ sibling values for depends kinds). */
  state: (ctx: RequirementContext, values: FieldValues) => RequirementState;
  /** exactly-one-of-a-pair: the sibling fieldKey (both members carry the link). */
  pairWith?: string;
  /** Presence override for composite fields (default: values[fieldKey] non-blank). */
  isFilled?: (values: FieldValues) => boolean;
  /** Invalid-value test on a FILLED field — send-validator ranges/formats only, nothing new. */
  isInvalid?: (values: FieldValues) => boolean;
  /** Plain-language description of the value check, for messages and tests. */
  checkDescribe?: string;
  /** S147: which message explains an 'invalid' for THIS values set. One field can fail for more
   *  than one reason — a haul start can be in the future OR before the sail — and the bullet has
   *  to say which, so the ENTRY chooses rather than the screen guessing from the fieldKey.
   *  Returns an i18n key, or null when the generic label is enough. */
  invalidKey?: (values: FieldValues) => string | null;
  /** DFO basis / quirks worth keeping next to the entry. */
  note?: string;
}

export interface MissingField {
  fieldKey: string;
  labelKey: string;
  /** blank = required and empty · invalid = filled but fails the send-validator range/format ·
   *  pair-none / pair-both = the exactly-one-of pair holds zero / two values. */
  reason: 'blank' | 'invalid' | 'pair-none' | 'pair-both';
  /** For pair reasons: the other member's label key. */
  pairLabelKey?: string;
  /** S147: the entry's own explanation for an 'invalid', when it supplied one (invalidKey).
   *  The close doors render this instead of the bare label. */
  detailKey?: string;
  /** S147 Run 5: interpolation for detailKey, when the sentence names something (a log id). */
  detailParams?: Record<string, string>;
}

// ─── Value checks (send-validator ranges/formats, verbatim — nothing new) ───

const LOBSTER_SPECIE_ID = '1312';

const num = (v: string | null | undefined) => Number(String(v ?? '').trim());
const blank = (v: string | null | undefined) => !String(v ?? '').trim();

/** Rule 165 via the validator: soak emits in minutes and >12960 (216 h) is rejected; a
 *  non-positive value is not emitted at all. In the app's UI unit (days): 0 < days ≤ 9.
 *  Decimals pass — the validator accepts any emitted minute count ≤ 12960, so requiring
 *  whole days would be a NEW check, which the design forbids. */
const soakOk = (v: string) => { const n = num(v); return Number.isFinite(n) && n > 0 && n <= 9; };

/** Effort / Form-222 coordinates are clamped to ≤4 decimals at emit (clampCoord4), so only
 *  the XSD RANGE can bounce a typed value: lat 38–72, long −148…−40. */
const latInRange = (v: string) => { const n = num(v); return Number.isFinite(n) && n >= 38 && n <= 72; };
const longInRange = (v: string) => { const n = num(v); return Number.isFinite(n) && n >= -148 && n <= -40; };

/** S153B (U5) — SPECIES-AT-RISK COORDINATES HAVE THEIR OWN, MUCH NARROWER WINDOW.
 *
 *  Until S153B these reused latInRange/longInRange — the XSD's 38–72 / −148…−40, which is the
 *  window for a FISHING EFFORT. DFO gives a species-at-risk interaction its own box, and it is
 *  roughly a third the size. Rules 172 and 173 of the 234.12 fact sheet, quoted verbatim from
 *  both language editions:
 *
 *    EN (FS-NAT-234-12-EN.txt:712–719)
 *      172 SAR LAT  — "The latitude of the interaction with the species at risk (Sar.Lat) must
 *                      be greater than or equal to 39.0000 (deg) and less than or equal to
 *                      53.0000 (deg)"
 *      173 SAR LONG — "The longitude of the interaction with the species at risk (Sar.Long)
 *                      must be greater than or equal to -70.8167 (deg) and less than or equal
 *                      to -52.0000 (deg)"
 *
 *    FR (FS-NAT-234-12-FR.txt:759–766)
 *      172 — "La latitude de l'interaction avec l'espèce en péril(Sar.Lat) doit être supérieure
 *             ou égale à 39.0000 (deg) et inférieure ou égale à 53.0000 (deg)"
 *      173 — "La longitude de l'interaction avec l'espèce en péril(Sar.La) doit être supérieure
 *             ou égale à -70.8167 (deg) et inférieure ou égale à -52.0000 (deg)"
 *
 *  ⚠ BOTH BOUNDS ARE INCLUSIVE, in both languages — "greater than or EQUAL", "less than or
 *  EQUAL" / "supérieure ou ÉGALE", "inférieure ou ÉGALE". A position sitting exactly on
 *  39.0000, 53.0000, -70.8167 or -52.0000 is therefore ACCEPTED, not refused. Hence >= and <=,
 *  never > and <. `Number('-70.8167') === -70.8167` exactly (same double, same literal), so the
 *  awkward bound compares true rather than falling foul of floating point.
 *
 *  (DFO's FR text writes "Sar.La" in Rule 173 — a typo in their document. The Nœud/Élément
 *  columns say SAR / LONG and the EN edition says Sar.Long. It is the longitude.)
 *
 *  These are DELIBERATELY NOT applied to the send validator's LEAF_CHECKS.lat/long: those are
 *  the XSD's own bounds and are shared with EFFORT_DETAIL, where 38–72 is correct. The refusal
 *  belongs at the close door, where the field can still be edited (S153B ruling L3). */
const sarLatInRange = (v: string) => { const n = num(v); return Number.isFinite(n) && n >= 39 && n <= 53; };
const sarLongInRange = (v: string) => { const n = num(v); return Number.isFinite(n) && n >= -70.8167 && n <= -52; };

/** S153B ruling R-c — CHECK THE BOX ONLY, TRIM SILENTLY, NO PRECISION REFUSAL.
 *
 *  The ≤4-decimal regexes these used to carry are GONE, and the range is judged on the CLAMPED
 *  value rather than the raw string. Two consequences, both intended:
 *
 *  1. A high-precision coordinate is no longer refused. Phase 3 put the SAR emit through
 *     clampCoord4, so those digits are discarded before anything is transmitted — refusing a
 *     man over digits the app itself throws away is telling him off for nothing. This is the
 *     answer the effort card already gives (see its own entry, and the test that pins it:
 *     "clampCoord4 launders this at emit — rejecting it would be a NEW check").
 *  2. Judging the clamped value is what keeps a position like -70.81674 legal: raw, it sits
 *     just outside Rule 173's floor; clamped — which is what DFO actually receives — it is
 *     exactly -70.8167, on the boundary, and the boundary is inclusive.
 *
 *  ACCEPTED COST, on the record (founder): this removes a refusal that shipped, so he is no
 *  longer told about excess precision — the app simply shortens his number; and it judges a
 *  value he did not type, where every other entry in this table judges the literal field value.
 *
 *  Shape is still covered: clampCoord4 returns a non-numeric input untouched, and num() then
 *  yields NaN, so 'abc' and '44.5N' are refused by Number.isFinite. A longitude missing its
 *  minus is refused by the range, not by a pattern. */
const sarLatOk = (v: string) => sarLatInRange(clampCoord4(v));
const sarLongOk = (v: string) => sarLongInRange(clampCoord4(v));

/** S153B — the XSD `weight` simple type as a MAGNITUDE range: 0 ≤ v ≤ 999999.999.
 *
 *  ⚠ Deliberately NOT a decimal-count check, though the XSD pattern allows three places and
 *  `LEAF_CHECKS.weight` enforces exactly that. `kgStr` ends `.toFixed(2)` for every weight the
 *  app emits, so decimals CANNOT reach the wire out of range whatever is typed — only an
 *  integer part over six digits, or a negative, can bust the type, and that is what this asks.
 *  A three-decimal regex would buy nothing at the wire and would refuse a correctly sealed
 *  `18.143881` — a closed weight stores kilograms at STORED_KG_DECIMALS (6) places.
 *
 *  0 is IN range: Rule 789 names Sar.Wt among the elements a harvester may use to declare a
 *  quantity of 0, so a typed zero is a real declaration and must pass. */
const weightOk = (v: string) => {
  const n = num(v);
  return Number.isFinite(n) && n >= 0 && n <= 999999.999;
};

/** Rule 444 (validator): crew count 1–20. */
const crewCountOk = (v: string) => /^\d+$/.test(v.trim()) && num(v) >= 1 && num(v) <= 20;

/** Rule 953 (233 validator): six uppercase letters A–Z. */
const ref233Ok = (v: string) => /^[A-Z]{6}$/.test(v.trim());

const simpleInvalid = (fieldKey: string, ok: (v: string) => boolean) =>
  (values: FieldValues) => !blank(values[fieldKey]) && !ok(String(values[fieldKey]));

// ─── S147: the clock comparisons (Rules 30/32/29/45/248) ────────────────────
//
// These are the SIX send-time date rules moved to the close doors, where the losing half can
// still be edited. They are ordinary `isInvalid` entries — the same mechanism the table already
// uses for the three date checks it shipped with (reportDate, interactionDate, periodEndDate).

/** One stored date+time as a comparable instant, resolved EXACTLY as the generator resolves it:
 *  the field's OWN companion date, falling back to the trip's nominal date
 *  (dfoXmlGenerator :97 / :274 / :275 / :98 / :512). Epoch milliseconds, so the ordering here is
 *  the ordering on the wire even across a daylight-saving change — the same shape
 *  findEffortOverlap already uses for Rule 33.
 *
 *  Returns null when either half is missing or malformed. That is CG-8: a comparison that
 *  cannot be made is not made, and no message is shown. A blank mandatory time already has its
 *  own asterisk and its own blank refusal; saying it twice would be noise. */
const stampMs = (v: FieldValues, dateKey: string, timeKey: string): number | null => {
  const time = String(v[timeKey] ?? '').trim();
  const date = String(v[dateKey] ?? '').trim() || String(v.dateFished ?? '').trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const ms = new Date(y, mo - 1, d, h, mi, 0, 0).getTime();
  return Number.isFinite(ms) ? ms : null;
};

/** The haul start carries TWO rules, so the entry must say which one failed: Rule 30 (not in the
 *  future) is checked before Rule 29 (not before the trip start), because a haul stamped next
 *  month is a wrong date, not an ordering problem, and naming the sail time would mislead. */
const haulStartProblem = (v: FieldValues): string | null => {
  const start = stampMs(v, 'haulStartDate', 'haulStartTime');
  if (start === null) return null;
  if (start > Date.now()) return 'form234.haulStartFutureError';        // Rule 30
  const trip = stampMs(v, 'sailDate', 'sailTime');
  if (trip !== null && start < trip) return 'form234.haulStartOrderError'; // Rule 29
  return null;
};

/** Rule 32 — the haul cannot end before it started (both halves on the same card) — and then
 *  Rule 46 from the EFFORT side: this haul cannot end after the landing.
 *
 *  ⚠ Rule 46 is deliberately checked from BOTH sides. The landing entry asks "is this landing
 *  before the latest haul end?"; this one asks "does THIS haul end after the landing?". Same
 *  inequality, two subjects — and that is the whole point: each door reports the half that lives
 *  on the card being closed, so the refusal always names something still editable. With only one
 *  side built, closing Landing first and the effort second seals both halves before the conflict
 *  is ever mentioned, and the log can never be sent or repaired. */
const haulEndProblem = (v: FieldValues): string | null => {
  const end = stampMs(v, 'haulEndDate', 'haulEndTime');
  const start = stampMs(v, 'haulStartDate', 'haulStartTime');
  if (end !== null && start !== null && end < start) return 'form234.haulEndOrderError';   // Rule 32
  const land = stampMs(v, 'landingDate', 'landingTime');
  if (end !== null && land !== null && end > land) return 'form234.haulEndAfterLandingError'; // Rule 46
  return null;
};

/** Rules 45 and 248 — a landing, and a QC transfer, cannot precede the trip start. Both compare
 *  against the trip half, which never seals (TRIP has no close door), so the harvester always has
 *  an editable side whichever door reports it. */
const beforeTripStart = (v: FieldValues, dateKey: string, timeKey: string): boolean => {
  const own = stampMs(v, dateKey, timeKey);
  const trip = stampMs(v, 'sailDate', 'sailTime');
  return own !== null && trip !== null && own < trip;
};

/** S147 Run 4 — Rule 46 needs the LATEST end across EVERY effort, and `FieldValues` is
 *  string-valued: it cannot carry an array. So the caller reduces the efforts to one date/time
 *  pair first and passes it as two ordinary keys. The reduction lives here, next to `stampMs`,
 *  so the close doors and the completion meter can never compute "latest" differently.
 *
 *  Takes the plain shape rather than importing the effort type: `dfoLogStorage` imports THIS
 *  module, so importing back would be a cycle. Callers pass `effortsFromData(...)`, which is the
 *  one reader and already returns objects with these two fields. */
export function latestEffortEnd(
  efforts: { haulEndDate?: string; haulEndTime?: string }[],
  dateFished: string,
): { date: string; time: string } | null {
  let best: { date: string; time: string; ms: number } | null = null;
  for (const e of efforts) {
    const date = e.haulEndDate ?? '';
    const time = e.haulEndTime ?? '';
    const ms = stampMs({ haulEndDate: date, haulEndTime: time, dateFished }, 'haulEndDate', 'haulEndTime');
    if (ms === null) continue;                       // an unfinished effort is not "the latest"
    if (!best || ms > best.ms) best = { date: date || dateFished, time, ms };
  }
  return best ? { date: best.date, time: best.time } : null;
}

/** Rule 45 then Rule 46, in that order, on the landing. Rule 45 (before the SAIL) is reported
 *  first: a landing stamped before the boat left is a wrong date, and pointing at a haul time
 *  would send the harvester to the wrong card. */
const landingProblem = (v: FieldValues): string | null => {
  if (beforeTripStart(v, 'landingDate', 'landingTime')) return 'form234.landingOrderError';
  const land = stampMs(v, 'landingDate', 'landingTime');
  const lastEnd = stampMs(v, 'lastEffortEndDate', 'lastEffortEndTime');
  if (land !== null && lastEnd !== null && land < lastEnd) return 'form234.landingBeforeHaulError';
  return null;
};

// ─── State helpers ──────────────────────────────────────────────────────────

const per = (map: Record<number, RequirementState>) =>
  (ctx: RequirementContext) => map[ctx.subformId] ?? 'blocked';

const MMMM = per({ 88: 'mandatory', 89: 'mandatory', 90: 'mandatory', 91: 'mandatory' });

/** The app's main catch row is always lobster; absent species defaults to lobster. */
const isLobster = (values: FieldValues, key: string) =>
  String(values[key] ?? LOBSTER_SPECIE_ID).trim() === LOBSTER_SPECIE_ID;

const anyEffort38b = (ctx: RequirementContext) =>
  (ctx.effortFmaIds ?? []).includes(DFO_FMA_38B);

// ─── The one clock rule that is NOT in this table, and why ──────────────────
//
// Rule 33 (a fishing effort must not overlap another effort under the same licence) is enforced by
// findEffortOverlap() in dfoXmlGenerator.ts, called directly by the close doors and by the send —
// NOT by an entry here. That is a deliberate, ruled exception (S147 BE-1), not an oversight, and
// the next person should not "tidy" it into the table or copy the pattern for anything else.
//
// It cannot live here for three reasons, all structural:
//   1. It compares against EVERY OTHER SAVED LOG. This table's only input is FieldValues, which is
//      Record<string, string | null | undefined> — it cannot carry an array of logs, and
//      RequirementContext has no room either.
//   2. Reading those logs is asynchronous (loadAllLogs); missingInContainer is synchronous.
//   3. The comparison is per-LOG, not per-container: it has no single owning field to hang an
//      isInvalid on.
//
// Everything else in the clock family (Rules 30/32/29/45/46/248) compares fields the caller already
// holds, so those ARE entries here. If a future rule only needs values in hand, it belongs in the
// table; Rule 33 is the exception precisely because it reaches outside the log.

// ─── The table ──────────────────────────────────────────────────────────────

export const DFO_REQUIREMENTS_TABLE: FieldRequirement[] = [
  // ── TRIP — never closes (fact sheet §5.2.1 omits TRIP); footer/send enforcement only ──
  { fieldKey: 'startDt', container: 'trip', labelKey: 'form234.dateFishedLabel',
    kind: 'per-subform', state: MMMM,
    note: 'TRIP.START_DT date half (row 16); rides the same element as sailTime.' },
  { fieldKey: 'sailTime', container: 'trip', labelKey: 'form234.timeSailedLabel',
    kind: 'per-subform', state: MMMM, note: 'TRIP.START_DT time half (row 16).' },
  { fieldKey: 'departurePort', container: 'trip', labelKey: 'form234.departurePortLabel',
    kind: 'per-subform', state: per({ 88: 'mandatory', 91: 'mandatory' }),
    note: 'TRIP.PORT_ID (row 19): M on 88/91, Blocked on 89/90.' },
  { fieldKey: 'crewNb', container: 'trip', labelKey: 'form234.crewRegistryLabel',
    kind: 'per-subform', state: per({ 88: 'mandatory', 90: 'mandatory' }),
    isInvalid: simpleInvalid('crewNb', crewCountOk),
    checkDescribe: 'crew count 1–20 (Rule 444)',
    note: 'TRIP.CREW_NB (row 18): M on 88/90, Blocked on 89/91. Value = the member count.' },
  { fieldKey: 'operName', container: 'trip', labelKey: null, kind: 'app-supplied',
    state: MMMM, note: 'Profile-sourced; enforced by the pre-send profile gate.' },
  { fieldKey: 'lgbkUid', container: 'trip', labelKey: null, kind: 'app-supplied',
    state: MMMM, note: 'App-generated (Rule 181).' },
  { fieldKey: 'firstEntryDt', container: 'trip', labelKey: null, kind: 'app-supplied',
    state: MMMM, note: 'App-stamped (row 23).' },
  { fieldKey: 'tripNum', container: 'trip', labelKey: null, kind: 'app-supplied',
    state: MMMM, note: 'App-sequential (Rule 48).' },
  { fieldKey: 'useCrInd', container: 'trip', labelKey: null, kind: 'app-supplied',
    state: per({ 88: 'mandatory' }),
    note: 'QC carrier question — app defaults N (Rule 639), can never be blank.' },
  { fieldKey: 'prtnshpId', container: 'trip', labelKey: null, kind: 'app-supplied',
    state: per({ 88: 'mandatory' }), note: 'QC partnership — app pre-selects 39468.' },
  { fieldKey: 'bycatchAnswered', container: 'trip', labelKey: 'form234.bycatchShortLabel',
    kind: 'answered', state: MMMM,
    note: 'App-chrome usage question (were there bycatch? → is the PCONS group used) — not a ' +
      'DFO element. Save-gated today (handleSave), converging at P4; starred since the S140 ' +
      'P3 ruling so the mark and the block are one claim. Rule 1051 untouched: answering No ' +
      'uses nothing.' },

  // ── EFFORT — one entry set per effort / trap group, evaluated with its OWN FMA ──
  { fieldKey: 'fmaId', container: 'effort', labelKey: 'form234.fishingAreaLabel',
    kind: 'per-subform', state: MMMM, note: 'EFFORT.FMA_ID (row 64).' },
  { fieldKey: 'haulStartTime', container: 'effort', labelKey: 'form234.timeStartedHaulingLabel',
    kind: 'per-subform', state: MMMM,
    isInvalid: values => haulStartProblem(values) !== null,
    invalidKey: haulStartProblem,
    checkDescribe: 'not in the future (Rule 30) and not before the trip start (Rule 29)',
    note: 'EFFORT.START_DT (row 62). S147: carries Rules 30 and 29 — the send validator has ' +
      'refused both since S51 (dfoXmlGenerator :908/:912), but only after the log was sealed.' },
  { fieldKey: 'haulEndTime', container: 'effort', labelKey: 'form234.timeStoppedHaulingLabel',
    kind: 'per-subform', state: MMMM,
    isInvalid: values => haulEndProblem(values) !== null,
    invalidKey: haulEndProblem,
    checkDescribe: 'not before the haul start (Rule 32) and not after the landing (Rule 46)',
    note: 'EFFORT.END_DT (row 63). S147: Rule 32 (dfoXmlGenerator :916) and the EFFORT side of ' +
      'Rule 46 (:1157). The Rule 46 twin on landingTime is not optional — see haulEndProblem.' },
  { fieldKey: 'sarInd', container: 'effort', labelKey: 'form234.sarIndShortLabel',
    kind: 'answered', state: MMMM,
    note: 'EFFORT.SAR_IND (row 67) — starts null by Rule 602; pass "" while unanswered. ' +
      'labelKey is the SHORT form (S140 P3 ruling: toggle bullets read as labels, not ' +
      'sentences); the on-screen question stays form234.sarIndLabel.' },
  { fieldKey: 'mmInterInd', container: 'effort', labelKey: 'form234.mmIndShortLabel',
    kind: 'answered', state: MMMM,
    note: 'EFFORT.MM_INTER_IND (row 68) — starts null by Rule 602; short labelKey per the ' +
      'S140 P3 ruling (see sarInd).' },
  { fieldKey: 'trapHauls', container: 'effort', labelKey: 'form234.trapHaulsLabel',
    kind: 'per-subform', state: MMMM, note: 'EFFORT_DETAIL.NB_GEAR_HLD (row 80).' },
  { fieldKey: 'catchWeight', container: 'effort', labelKey: 'form234.catchWeightLabel',
    kind: 'depends-on-another-answer',
    state: (_ctx, values) => (isLobster(values, 'catchSpecieId') ? 'mandatory' : 'optional'),
    note: 'CATCH.KEPT_WT — Rule 631 mandates it whenever the species is lobster; the app’s ' +
      'main catch row is always lobster, so in practice always mandatory. Rule 2020: a zero ' +
      'must be typed, never assumed.' },
  { fieldKey: 'soakDuration', container: 'effort', labelKey: 'form234.soakDurationLabel',
    kind: 'per-subform',
    state: per({ 88: 'mandatory', 89: 'mandatory', 91: 'mandatory' }),
    isInvalid: simpleInvalid('soakDuration', soakOk),
    checkDescribe: 'more than 0 and at most 9 days / 216 hours (Rules 165/286)',
    note: 'EFFORT_DETAIL.SOAKED_DUR (row 81): M/M/B/M — Blocked on MAR 90. Tier-1 field: the ' +
      'old save gate never checked block 1.' },
  { fieldKey: 'gpsCoords', container: 'effort', labelKey: 'form234.gpsLocationLabel',
    kind: 'by-fishing-area',
    state: ctx => (effortCoordsEntryAllowed(ctx.subformId, ctx.fmaId) ? 'mandatory' : 'blocked'),
    isFilled: values => !blank(values.gpsLat) && !blank(values.gpsLng),
    isInvalid: values =>
      (!blank(values.gpsLat) && !latInRange(String(values.gpsLat))) ||
      (!blank(values.gpsLng) && !longInRange(String(values.gpsLng))),
    checkDescribe: 'latitude 38–72, longitude −148 to −40 (XSD ranges; clamped to 4 decimals at emit)',
    note: 'EFFORT_DETAIL.LAT/LONG — rows 82/83 (M on 88/89, B on 91) + Rule 3059 (MAR: M on ' +
      '38b, B elsewhere). Same gate as entry (effortCoordsEntryAllowed) so entry, mark and ' +
      'requirement can never disagree. Tier-1 on MAR 38b.' },
  { fieldKey: 'gridId', container: 'effort', labelKey: 'form234.gridLabel',
    kind: 'by-fishing-area',
    state: ctx => (ctx.subformId === 88 && (ctx.fmaId ?? 0) in DFO_FMA_GRID_MAP
      ? 'mandatory' : 'blocked'),
    note: 'EFFORT_DETAIL.GRID_ID — Rule 1012 mandates it for the 11 map FMAs, Rule 1011 blocks ' +
      'it for the other 29 QC LFAs; the two sets partition all 40.' },
  { fieldKey: 'lgridCodeId', container: 'effort', labelKey: 'form234.lgridLabel',
    kind: 'by-fishing-area',
    state: ctx => (ctx.subformId === 90 && DFO_FMA_LGRID_REQUIRED.has(ctx.fmaId ?? 0)
      ? 'mandatory' : 'blocked'),
    note: 'EFFORT_DETAIL.LGRID_ID — Rule 619 mandates the settlement grid for the 13 LFAs ' +
      '27–38 (LFA 34 included); blocked otherwise. DFO-mandatory, not app-strict.' },
  { fieldKey: 'statSectId', container: 'effort', labelKey: 'form234.statSectLabel',
    kind: 'by-fishing-area',
    state: ctx => (DFO_FMA_STAT_SECT_REQUIRED.has(ctx.fmaId ?? 0) ? 'mandatory' : 'blocked'),
    note: 'EFFORT_DETAIL.STAT_SECT_ID — Rule 621, FMA-gated exactly like the validator (the 17 ' +
      'FMAs are NL-only in practice).' },
  { fieldKey: 'vNotchCount', container: 'effort', labelKey: 'form234.nbVntchLabel',
    kind: 'by-fishing-area',
    state: ctx => (ctx.subformId === 88 && DFO_FMA_NB_VNTCH.has(ctx.fmaId ?? 0)
      ? 'mandatory' : 'blocked'),
    note: 'EFFORT_DETAIL.NB_VNTCH — Rule 624 (28-FMA list) carries both directions. A zero ' +
      'must be typed (Rule 789). Tier-1 field.' },
  { fieldKey: 'nbVntchYou', container: 'effort', labelKey: 'form234.nbVntchYouLabel',
    kind: 'by-fishing-area',
    state: ctx => (DFO_FMA_NB_VNTCH.has(ctx.fmaId ?? 0) ? 'mandatory'
      : DFO_FMA_NB_VNTCH_YOU.has(ctx.fmaId ?? 0) ? 'optional' : 'blocked'),
    note: 'EFFORT_DETAIL.NB_VNTCH_YOU — Rules 625/626, the only three-state field in this ' +
      'table. Rule 625 BLOCKS it outside its 47-FMA list; Rule 626 makes it MANDATORY on its ' +
      '28 (the QC set, identical to Rule 624’s). The 19 FMAs inside 625 but outside 626 — NL ' +
      'LFA 01–14c — are therefore OPTIONAL: no rule forbids the entry and none compels it. ' +
      'Confirmed independently by Subforms_requirements_234.xlsx row 88, which marks NL(91) ' +
      '“Optional” in words. Gated by FMA alone (S145): both lists already carry the region, ' +
      'so asking subformId as well would only re-introduce defect 51. Tier-1 field.' },
  { fieldKey: 'nbSpcmnBrd', container: 'effort', labelKey: 'form234.nbSpcmnBrdLabel',
    kind: 'by-fishing-area',
    state: (ctx, values) => (ctx.subformId === 90 && ctx.fmaId === DFO_FMA_38B &&
      isLobster(values, 'catchSpecieId') ? 'mandatory' : 'blocked'),
    note: 'CATCH.NB_SPCMN_BRD — Rule 654: lobster in MAR 38b only; blocked otherwise ' +
      '(653/655). Tier-1 field.' },
  { fieldKey: 'nbSpcmnKept', container: 'effort', labelKey: 'form234.nbSpcmnKeptLabel',
    kind: 'depends-on-another-answer',
    state: (ctx, values) => (ctx.subformId === 91
      ? (isLobster(values, 'catchSpecieId') ? 'mandatory' : 'blocked') : 'blocked'),
    note: 'CATCH.NB_SPCMN_KEPT — NL 91: Rule 976 mandates it on the lobster catch, 977 blocks ' +
      'it otherwise; row 93 blocks it on 88/89/90.' },
  { fieldKey: 'nbSpcmnDisc', container: 'effort', labelKey: 'form234.nbSpcmnDiscLabel',
    kind: 'per-subform',
    state: per({ 88: 'optional', 91: 'optional' }),   // 89/90 fall through to 'blocked'
    isInvalid: simpleInvalid('nbSpcmnDisc', v => /^\d{1,4}$/.test(v.trim())),
    checkDescribe: 'a whole number from 0 to 9999',
    note: 'CATCH.NB_SPCMN_DISC — Optional on QC 88 and NL 91, Blocked on GLF 89 and MAR 90 ' +
      '(Subforms_requirements_234.xlsx row 95, Element_id 197; same verdict in the French ' +
      'sheet and in the pre-2026-08-14 package). Two rules name it and NEITHER makes it ' +
      'mandatory: Rule 630 pairs it with KEPT_WT as an either/or that Rule 631 already ' +
      'satisfies on every lobster catch, and Rule 789 governs how a typed value behaves, not ' +
      'whether one is required. So it is UNMARKED by construction — the sarWt shape (S153B): ' +
      'isFieldRequired only returns true for “mandatory”, so no asterisk; missingInContainer ' +
      'reports a blank only when the state is mandatory, so no close-gate demand; ' +
      'containerProgress counts only mandatory entries, so the completion meter does not move ' +
      'and getCompletionDetails needs no entry for it. It is here for the one thing an ' +
      'optional field still owes — a TYPED value must be valid — exactly as logbookUidRefered ' +
      'is (S117): a trap group seals under the effort close and its body then renders ' +
      'pointerEvents:"none", so a sealed bad count is a permanently unsendable logbook with ' +
      'nothing left to edit. The check MIRRORS the send validator’s own cap ' +
      '(dfoXmlGenerator NB_SPCMN_DISC /^\\d{1,4}$/, S154 Option A) rather than choosing a ' +
      'range — same regex, same bound, so the door can never be narrower than the send door. ' +
      'Rule 789 names this element, so a typed 0 is a real declaration and passes.' },
  { fieldKey: 'trapSize', container: 'effort', labelKey: 'form234.trapSizeLabel',
    kind: 'per-subform', state: per({ 91: 'mandatory' }),
    note: 'EFFORT_DETAIL.TRP_SZ_ID (row 79): NL only.' },
  { fieldKey: 'gearSubtypeId', container: 'effort', labelKey: 'form234.gearSubtypeLabel',
    kind: 'per-subform', state: per({ 91: 'mandatory' }),
    note: 'EFFORT_BY_GEAR.GEAR_SBTYP_ID (row 75): NL only.' },
  { fieldKey: 'targetSpecies', container: 'effort', labelKey: null, kind: 'app-supplied',
    state: MMMM, note: 'TGT_SPECIES.SPECIE_ID — constant 1312.' },
  { fieldKey: 'gearId', container: 'effort', labelKey: null, kind: 'app-supplied',
    state: MMMM, note: 'EFFORT_BY_GEAR.GEAR_ID — constant 925 (Rule 270).' },

  // ── SAR — one entry set per species-at-risk block ──
  { fieldKey: 'sarDateTime', container: 'sar', labelKey: 'form234.dateTimeLabel',
    kind: 'per-subform', state: MMMM,
    isFilled: values => !blank(values.sarDate) && !blank(values.sarTime),
    note: 'SAR.SAR_DT (rows 32–38: the whole SAR set is M×4 once a block exists).' },
  { fieldKey: 'sarSpecies', container: 'sar', labelKey: 'form234.speciesLabel',
    kind: 'per-subform', state: MMMM, note: 'SAR.SPECIE_ID.' },
  { fieldKey: 'sarNbSpcmn', container: 'sar', labelKey: 'form234.sarNbSpcmnLabel',
    kind: 'per-subform', state: MMMM, note: 'SAR.NB_SPCMN.' },
  { fieldKey: 'sarWt', container: 'sar', labelKey: 'form234.sarWtLabel',
    kind: 'per-subform',
    state: () => 'optional',
    isInvalid: simpleInvalid('sarWt', weightOk),
    checkDescribe: 'a weight from 0 to 999999.999',
    note: 'SAR.WT — Optional on all four subforms (Subforms_requirements_234.xlsx row 36) and ' +
      'minOccurs=0 in the XSD, so it is UNMARKED by construction: isFieldRequired only returns ' +
      'true for “mandatory”, so no asterisk; missingInContainer only reports a blank when the ' +
      'state is mandatory, so no close-gate demand; containerProgress counts only mandatory ' +
      'entries, so the completion meter does not move. It is here for the one thing an optional ' +
      'field still owes — a TYPED value must be valid — exactly as logbookUidRefered is ' +
      '(S117): a SAR block closes irreversibly and its body then renders pointerEvents:"none", ' +
      'so a sealed bad weight is a permanently unsendable log with nothing left to edit. ' +
      'Rule 789 names Sar.Wt, so a typed 0 is a real declaration and passes.' },
  { fieldKey: 'sarCondId', container: 'sar', labelKey: 'form234.sarCondLabel',
    kind: 'per-subform', state: MMMM, note: 'SAR.SPCMN_COND_ID.' },
  { fieldKey: 'sarGps', container: 'sar', labelKey: 'form234.gpsLocationLabel',
    kind: 'per-subform', state: MMMM,
    isFilled: values => !blank(values.sarLat) && !blank(values.sarLng),
    isInvalid: values =>
      (!blank(values.sarLat) && !sarLatOk(String(values.sarLat))) ||
      (!blank(values.sarLng) && !sarLongOk(String(values.sarLng))),
    checkDescribe: 'latitude 39–53, longitude −70.8167 to −52, max 4 decimals',
    note: 'SAR.LAT/LONG — the range is DFO Rules 172/173, which give a species-at-risk ' +
      'interaction its OWN window, roughly a third the size of the effort card’s XSD ' +
      'range (38–72 / −148…−40). Both bounds inclusive, so a position exactly on 39.0000, ' +
      '53.0000, −70.8167 or −52.0000 is accepted. The decimal limit is retained pending ' +
      'S153B ruling R-c; since Phase 3 clamped the SAR emit it no longer changes what DFO ' +
      'receives.' },

  // ── BAIT ROW — the add-sheet makes a blank row unconstructable; kept for uniformity ──
  { fieldKey: 'type', container: 'baitRow', labelKey: 'form234.baitTypeLabel',
    kind: 'per-subform', state: MMMM, note: 'BAIT_USED.BT_TYP_ID (row 26).' },
  { fieldKey: 'lbs', container: 'baitRow', labelKey: 'form234.weightLbsLabel',
    kind: 'per-subform', state: MMMM, note: 'BAIT_USED.BT_WT (row 28).' },
  { fieldKey: 'condition', container: 'baitRow', labelKey: 'form234.baitConditionLabel',
    kind: 'depends-on-another-answer',
    state: (ctx, values) =>
      baitConditionState(ctx.subformId, Number(values.baitTypeCodeId ?? 0)),
    note: 'BAIT_USED.BT_COND_ID — Rules 984 (QC/GLF: mandatory only for herring/mackerel) and ' +
      '3060 (MAR: blocked only for refuse/electronic/synthetic) run in opposite directions; ' +
      'the existing baitConditionState formula is absorbed unchanged. Pass the row’s bait ' +
      'type codeId as values.baitTypeCodeId.' },

  // ── BYCATCH ROW — same add-sheet armour ──
  { fieldKey: 'species', container: 'bycatchRow', labelKey: 'form234.speciesLabel',
    kind: 'per-subform', state: MMMM, note: 'PCONS.SPECIE_ID (row 54).' },
  { fieldKey: 'lbs', container: 'bycatchRow', labelKey: 'form234.weightLbsLabel',
    kind: 'per-subform', state: MMMM, note: 'PCONS.WT (row 57).' },
  { fieldKey: 'usage', container: 'bycatchRow', labelKey: 'form234.usageLabel',
    kind: 'per-subform', state: per({ 90: 'mandatory' }),
    note: 'PCONS.USG_ID (row 58): MAR only.' },
  { fieldKey: 'specieSzId', container: 'bycatchRow', labelKey: null, kind: 'app-supplied',
    state: per({ 89: 'mandatory' }),
    note: 'PCONS.SPECIE_SZ_ID (row 56): GLF-mandatory, but the app derives it (826 lobster / ' +
      '10670 unsized) — never typed, can never be blank.' },

  // ── LANDING ──
  { fieldKey: 'portId', container: 'landing', labelKey: 'form234.portLandedLabel',
    kind: 'per-subform', state: MMMM,
    note: 'LANDING.PORT_ID (row 100): Mandatory on all four regions. Tier-1 on 89/90 (the old ' +
      'save gate omitted it there).' },
  { fieldKey: 'landingTime', container: 'landing', labelKey: 'form234.timeOfLandingLabel',
    kind: 'per-subform', state: MMMM,
    isInvalid: values => landingProblem(values) !== null,
    invalidKey: landingProblem,
    checkDescribe: 'not before the trip start (Rule 45) and not before the last haul ended (Rule 46)',
    note: 'LANDING.START_DT (row 101). S147: Rules 45 (dfoXmlGenerator :1154) and 46 (:1157). ' +
      'Rule 46 reads lastEffortEndDate/Time — the caller reduces every effort to that one pair ' +
      'via latestEffortEnd(). Its twin lives on haulEndTime; both are required (see there).' },

  // ── HAIL — group presence itself is requiredGroups(); these are the members once used ──
  { fieldKey: 'hlinCompany', container: 'hlin', labelKey: 'form234.companyLabel',
    kind: 'per-subform', state: per({ 90: 'mandatory' }),
    note: 'HLIN.HLIN_CIE_ID (row 42): MAR only.' },
  { fieldKey: 'hlinConfirmNo', container: 'hlin', labelKey: 'form234.confirmNoLabel',
    kind: 'per-subform', state: per({ 90: 'mandatory' }),
    note: 'HLIN.HLIN_NUM (row 43). A company-picked, confirmation-pending card stays open ' +
      'until the number arrives — the correct state.' },
  { fieldKey: 'hlinEta', container: 'hlin', labelKey: 'form234.etaLabel',
    kind: 'by-fishing-area',
    state: ctx => (ctx.subformId === 90 && anyEffort38b(ctx) ? 'mandatory' : 'blocked'),
    note: 'HLIN.ETA_DT — Rule 660: mandatory when any effort fished 38b; blocked otherwise. ' +
      'Keys on the logbook’s effort FMAs (ctx.effortFmaIds), not the container.' },
  { fieldKey: 'hlinTotalWeight', container: 'hlin', labelKey: 'form234.totalWeightLabel',
    kind: 'by-fishing-area',
    state: ctx => (ctx.subformId === 90 && anyEffort38b(ctx) ? 'mandatory' : 'blocked'),
    note: 'HLIN.TOT_WT_ONBRD — Rule 661, same 38b key as ETA.' },
  { fieldKey: 'hloutCompany', container: 'hlout', labelKey: 'form234.companyLabel',
    kind: 'per-subform', state: per({ 90: 'mandatory' }),
    note: 'HLOUT.HLOUT_CIE_ID (row 49): MAR only.' },
  { fieldKey: 'hloutConfirmNo', container: 'hlout', labelKey: 'form234.confirmNoLabel',
    kind: 'per-subform', state: per({ 90: 'mandatory' }),
    note: 'HLOUT.HLOUT_NUM (row 50). No ETA/weight on HLOUT (rows 44/45 are HLIN-only).' },

  // ── TRANSFER (QC 88) — the carrier fields ride this close (recon-proven quirk) ──
  { fieldKey: 'transferTime', container: 'transfer', labelKey: 'form234.transferTimeLabel',
    kind: 'per-subform', state: per({ 88: 'mandatory' }),
    isInvalid: values => beforeTripStart(values, 'transferDate', 'transferTime'),
    invalidKey: () => 'form234.transferOrderError',
    checkDescribe: 'not before the trip start (Rule 248)',
    note: 'TRANSFER.TRNSF_DT (row 105). S147: Rule 248 (dfoXmlGenerator :1175). Only correct ' +
      'because Phase 5a gave the transfer its own date — before that, an after-midnight ' +
      'transfer was stamped with the trip date and this check would have refused a legal trip.' },
  { fieldKey: 'transferWt', container: 'transfer', labelKey: 'form234.transferWtLabel',
    kind: 'per-subform', state: per({ 88: 'mandatory' }),
    note: 'TRANSFER_DTL.WT (row 117).' },
  // S154D: the SOURCE pair. Rule 251 is the twin of Rule 252 below, and the French fact
  // sheet is what makes "exactly" unambiguous — « un seul des deux éléments suivants DOIT
  // OBLIGATOIREMENT contenir une valeur » (FS-NAT-234-12-FR:1901-1906). Rows 106/107 of
  // Subforms_requirements_234.xlsx, Optional QC-88 / Blocked elsewhere per element; the rule
  // is what makes the PAIR mandatory once a transfer exists.
  // transferFromVrn is listed FIRST so a broken pair reports under its key, matching the TO
  // pair's behaviour (the engine names whichever member it meets first).
  // ⚠ This REPLACES the old `transferFrom` app-supplied row, which documented the generator
  // writing the harvester's own vessel number into FROM_VRN unasked. R1 ended that: the box
  // is his to fill, so the requirement is a real pair now instead of a note about a default.
  { fieldKey: 'transferFromVrn', container: 'transfer', labelKey: 'form234.transferFromVrnLabel',
    kind: 'exactly-one-of-a-pair', pairWith: 'transferFromPndNum',
    state: per({ 88: 'mandatory' }),
    note: 'Rule 251: exactly one of FROM_VRN / FROM_PND_NUM once the TRANSFER node exists.' },
  { fieldKey: 'transferFromPndNum', container: 'transfer', labelKey: 'form234.transferFromPndNumLabel',
    kind: 'exactly-one-of-a-pair', pairWith: 'transferFromVrn',
    state: per({ 88: 'mandatory' }),
    note: 'Rule 251 — see transferFromVrn. DFO’s dictionary (XML_dictionary.csv:767) says to ' +
      'write 0 when the pond has no number, so "0" is a VALUE here and satisfies the pair.' },
  { fieldKey: 'transferToVrn', container: 'transfer', labelKey: 'form234.transferToVrnLabel',
    kind: 'exactly-one-of-a-pair', pairWith: 'transferToPndNum',
    state: per({ 88: 'mandatory' }),
    note: 'Rule 252: exactly one of TO_VRN / TO_PND_NUM.' },
  { fieldKey: 'transferToPndNum', container: 'transfer', labelKey: 'form234.transferToPndNumLabel',
    kind: 'exactly-one-of-a-pair', pairWith: 'transferToVrn',
    state: per({ 88: 'mandatory' }), note: 'Rule 252 — see transferToVrn.' },
  // The two vessel NAMES: Optional on QC (rows 108/111), Blocked elsewhere, named by no rule
  // (R5: no format check). They are checked-when-typed for LENGTH only, the sarWt /
  // logbookUidRefered pattern — a sealed over-long name is the same dead end as a sealed
  // blank, and the close door can name the field where the send validator can only name the
  // element. R6: plain text, never starred.
  { fieldKey: 'transferFromVname', container: 'transfer', labelKey: 'form234.transferFromVnameLabel',
    kind: 'per-subform',
    state: per({ 88: 'optional' }),
    isInvalid: simpleInvalid('transferFromVname', v => v.length <= 50),
    checkDescribe: 'at most 50 characters',
    note: 'TRANSFER.FROM_VNAME — string_50 (XSD :379), minOccurs=0, Optional QC-88 only ' +
      '(row 108). Unmarked by construction: isFieldRequired only returns true for mandatory.' },
  { fieldKey: 'transferToVname', container: 'transfer', labelKey: 'form234.transferToVnameLabel',
    kind: 'per-subform',
    state: per({ 88: 'optional' }),
    isInvalid: simpleInvalid('transferToVname', v => v.length <= 50),
    checkDescribe: 'at most 50 characters',
    note: 'TRANSFER.TO_VNAME — string_50 (XSD :382), minOccurs=0, Optional QC-88 only ' +
      '(row 111).' },
  { fieldKey: 'carrierVrn', container: 'transfer', labelKey: 'form234.carrierVrnLabel',
    kind: 'depends-on-another-answer',
    state: (ctx, values) => (ctx.subformId === 88 && String(values.useCrInd ?? '') === 'Y'
      ? 'mandatory' : 'blocked'),
    note: 'LANDING.VRN — Rule 642 mandates it when the carrier question is Yes; Rule 641 ' +
      'blocks it otherwise. A LANDING element that SEALS UNDER THE TRANSFER CLOSE (recon-' +
      'proven). Tier-1 field (on logs that also record a transfer).' },

  // ── PERSONAL USE — close button only renders when non-blank; the check is a formality ──
  { fieldKey: 'personalUse', container: 'personalUse', labelKey: 'form234.personalUseLabel',
    kind: 'per-subform', state: MMMM,
    note: 'PCONS.WT on the personal-use node (row 57) — mandatory once the group is used.' },

  // ── FORM 222 (whole-form close) — the Rule-593 set as captured by the app ──
  { fieldKey: 'interactInd', container: 'form222', labelKey: 'form222.interactIndLabel',
    kind: 'answered', state: MMMM,
    note: 'MM_INTER.INTERACT_IND (CSV REQUIRED=Y). The screen defaults it N — pass its value.' },
  { fieldKey: 'lgbkNumRef', container: 'form222', labelKey: 'form222.lgbkNumRefLabel',
    kind: 'per-subform', state: MMMM,
    note: 'MM_INTER.LGBK_NUM_REF (CSV REQUIRED=Y) — prefilled but editable, so gated.' },
  { fieldKey: 'reportDate', container: 'form222', labelKey: 'form222.reportDateLabel',
    kind: 'per-subform', state: MMMM,
    isInvalid: values => {
      // Rule 592 exactly as the send validator applies it: only on the Y-path, and only
      // when an interaction date is present (the check lives inside that guard there).
      const r = String(values.reportDate ?? '').trim();
      const d = String(values.interactionDate ?? '').trim();
      return String(values.interactInd ?? '') === 'Y' &&
        /^\d{4}-\d{2}-\d{2}$/.test(r) && /^\d{4}-\d{2}-\d{2}$/.test(d) &&
        r > new Date().toISOString().slice(0, 10);
    },
    checkDescribe: 'must not be in the future (Rule 592, S141 P3b ruling 2)',
    note: 'MM_INTER.REP_DATE (CSV REQUIRED=Y) — prefilled to today and editable, so the ' +
      'blank check is inert (S140 P2 ruling 1); the future check (ruling 2, S141 P3b) is not.' },
  { fieldKey: 'gearDamageInd', container: 'form222', labelKey: 'form222.gearDamageIndLabel',
    kind: 'answered',
    state: (_ctx, values) =>
      (String(values.interactInd ?? '') === 'Y' ? 'mandatory' : 'blocked'),
    note: 'MM_INTER.GEAR_DMG_IND — Rule 593 mandatory when INTERACT_IND=Y; Rule 594 blocks it ' +
      'when N. S152D: was kind app-supplied ("defaulted N by the screen, can never be blank"), ' +
      'which is exactly why it was never gated and never starred — the app answered a mandatory ' +
      'DFO question on the harvester\'s behalf. It now starts unanswered and he must answer it.' },
  // Rule 593 members keyed on the interaction answer (Rule 594 blocks the set when N):
  ...([
    ['interactionTime', 'form222.interactionTimeLabel', 'INTERACT_DT time half'],
    ['speciesLabel', 'form222.speciesLabel', 'NOAA_SPECIE_COD'],
    ['interactionTypeLabel', 'form222.interactionTypeLabel', 'MM_INTER_INCDNT.INCDNT_TYP_ID (Rule 1027)'],
    ['observerNm', 'form222.observerNmLabel', 'NAME'],
    ['contactInfo', 'form222.contactInfoLabel', 'ADDR'],
    // The five ruled-in (ruling 3): exist as inputs, Rule-593-mandatory when Y, previously
    // unmarked and unchecked anywhere.
    ['siteDsc', 'form222.siteDscLabel', 'SITE_DSC (ruling 3)'],
    ['eventDsc', 'form222.eventDscLabel', 'EVENT_DSC (ruling 3)'],
    ['confidenceLabel', 'form222.confidenceLabel', 'ID_CNFDNCE_ID (ruling 3)'],
    ['specimenCondLabel', 'form222.specimenCondLabel', 'SPCMN_COND_ID (ruling 3)'],
    ['lengthCatLabel', 'form222.lengthCatLabel', 'BDY_LEN_ID (ruling 3)'],
  ] as Array<[string, string, string]>).map(([fieldKey, labelKey, element]): FieldRequirement => ({
    fieldKey, container: 'form222', labelKey,
    kind: 'depends-on-another-answer',
    state: (_ctx, values) =>
      (String(values.interactInd ?? '') === 'Y' ? 'mandatory' : 'blocked'),
    note: `${element} — Rule 593 mandatory when INTERACT_IND=Y; Rule 594 blocks it when N.`,
  })),
  // interactionDate and nbAnimals sit outside the map because they carry the send
  // validator's own value checks (S141 P3b ruling 2) on top of the Rule-593 state.
  { fieldKey: 'interactionDate', container: 'form222', labelKey: 'form222.interactionDateLabel',
    kind: 'depends-on-another-answer',
    state: (_ctx, values) => (String(values.interactInd ?? '') === 'Y' ? 'mandatory' : 'blocked'),
    isInvalid: values => {
      const d = String(values.interactionDate ?? '').trim();
      const r = String(values.reportDate ?? '').trim();
      return /^\d{4}-\d{2}-\d{2}$/.test(d) && /^\d{4}-\d{2}-\d{2}$/.test(r) && d > r;
    },
    checkDescribe: 'must not be after the report date (Rules 566/590/591, S141 P3b ruling 2)',
    note: 'INTERACT_DT date half — Rule 593 mandatory when INTERACT_IND=Y; Rule 594 blocks it when N.' },
  { fieldKey: 'nbAnimals', container: 'form222', labelKey: 'form222.nbAnimalsLabel',
    kind: 'depends-on-another-answer',
    state: (_ctx, values) => (String(values.interactInd ?? '') === 'Y' ? 'mandatory' : 'blocked'),
    isInvalid: simpleInvalid('nbAnimals', v => /^\d{1,4}$/.test(v.trim())),
    checkDescribe: 'a whole number of at most 4 digits — the validator’s NB_SPCMN_BEST 0–9999 ' +
      'check (S141 P3b ruling 2)',
    note: 'NB_SPCMN_BEST — Rule 593 mandatory when INTERACT_IND=Y; Rule 594 blocks it when N.' },
  { fieldKey: 'lat', container: 'form222', labelKey: 'form222.latLabel',
    kind: 'depends-on-another-answer',
    state: (_ctx, values) => (String(values.interactInd ?? '') === 'Y' ? 'mandatory' : 'blocked'),
    isInvalid: simpleInvalid('lat', latInRange),
    checkDescribe: 'latitude 38–72 (XSD range; clamped to 4 decimals at emit)',
    note: 'LAT — Rule 593 when Y.' },
  { fieldKey: 'lon', container: 'form222', labelKey: 'form222.lonLabel',
    kind: 'depends-on-another-answer',
    state: (_ctx, values) => (String(values.interactInd ?? '') === 'Y' ? 'mandatory' : 'blocked'),
    isInvalid: simpleInvalid('lon', longInRange),
    checkDescribe: 'longitude −148 to −40 (XSD range; clamped to 4 decimals at emit)',
    note: 'LONG — Rule 593 when Y.' },

  // ── FORM 233 (whole-form close) ──
  { fieldKey: 'periodStartDate', container: 'form233', labelKey: 'form233.startDateLabel',
    kind: 'per-subform', state: MMMM, note: 'REPORT_DTL.START_DT (CSV REQUIRED=Y).' },
  { fieldKey: 'periodEndDate', container: 'form233', labelKey: 'form233.endDateLabel',
    kind: 'per-subform', state: MMMM,
    isInvalid: values => {
      // The validator's END_DT-before-START_DT refusal (S141 P3b ruling 2). Start emits
      // at 0000 and end at 2359, so only a strictly earlier end DATE can trip it.
      const s = String(values.periodStartDate ?? '').trim();
      const e = String(values.periodEndDate ?? '').trim();
      return /^\d{4}-\d{2}-\d{2}$/.test(s) && /^\d{4}-\d{2}-\d{2}$/.test(e) && e < s;
    },
    checkDescribe: 'must not be before the start date (the validator’s END_DT order check)',
    note: 'REPORT_DTL.END_DT (CSV REQUIRED=Y).' },
  { fieldKey: 'reason', container: 'form233', labelKey: 'form233.reasonLabel',
    kind: 'per-subform', state: MMMM, note: 'REPORT_DTL.REASON (CSV REQUIRED=Y).' },
  { fieldKey: 'logbookUidRefered', container: 'form233', labelKey: 'form233.logbookUidRefLabel',
    kind: 'per-subform',
    state: () => 'optional',
    isInvalid: simpleInvalid('logbookUidRefered', ref233Ok),
    checkDescribe: 'six uppercase letters A–Z (Rule 953)',
    note: 'REPORT.LOGBOOK_UID_REFERED — optional, but a sealed typo is a permanently ' +
      'unsendable 233, so the format is checked whenever typed.' },
  { fieldKey: 'fin', container: 'form233', labelKey: null, kind: 'app-supplied',
    state: MMMM, note: 'Rule 961 makes FIN mandatory (non-Arctic) — profile-sourced.' },
  { fieldKey: 'licNo', container: 'form233', labelKey: null, kind: 'app-supplied',
    state: MMMM, note: 'REPORT_DTL.LIC_NO — profile-sourced.' },
];

// ─── The three query functions ──────────────────────────────────────────────

export function fieldRequirement(
  fieldKey: string,
  container?: DfoContainerId,
): FieldRequirement | undefined {
  return DFO_REQUIREMENTS_TABLE.find(
    e => e.fieldKey === fieldKey && (container === undefined || e.container === container),
  );
}

/** S141 P4 (W-2), exported at S147 Run 5 so it has ONE definition and can be tested.
 *  A bullet is "mixed" when it reports a value that is WRONG rather than missing — an invalid
 *  range/format, or the exactly-one pair with both sides filled. The close refusal's heading
 *  switches on this: all-blank keeps "these required fields are still blank"; any mixed bullet
 *  switches to "still blank or incorrect". */
export const missingFieldIsMixed = (m: MissingField): boolean =>
  m.reason === 'invalid' || m.reason === 'pair-both';

/** S147 Run 5 — a refusal bullet from a check that lives OUTSIDE this table, in the shape the
 *  close doors already handle.
 *
 *  ⚠ THIS IS THE DOCUMENTED COST OF THE BE-1 EXCEPTION. A table entry carries its own reason, so
 *  the refusal heading learns for free that a bullet is "incorrect" rather than "blank". A check
 *  outside the table has no MissingField and therefore tells the heading nothing — which is exactly
 *  what went wrong with Rule 33: its bullet appeared under « Ces champs obligatoires sont encore
 *  vides: » (blank only) although the haul times were filled and merely clashed with another log.
 *  A card header must not contradict the fields inside it (the S142 rule).
 *
 *  Every out-of-table check routes its bullet through here, so it rejoins the same rails as every
 *  table bullet and the heading cannot be told the wrong thing again. If a second out-of-table
 *  check is ever added, use this — do not push a bare string. */
export function outOfTableInvalid(
  detailKey: string,
  detailParams: Record<string, string>,
): MissingField {
  return { fieldKey: detailKey, labelKey: detailKey, reason: 'invalid', detailKey, detailParams };
}

/** Question 1 — what an asterisk needs: is this field mandatory here, right now?
 *  App-supplied fields answer false (they are documentation, never marked or gated). */
export function isFieldRequired(
  fieldKey: string,
  ctx: RequirementContext,
  values: FieldValues = {},
  container?: DfoContainerId,
): boolean {
  const e = fieldRequirement(fieldKey, container);
  if (!e || e.kind === 'app-supplied') return false;
  return e.state(ctx, values) === 'mandatory';
}

const isFilled = (e: FieldRequirement, values: FieldValues): boolean =>
  e.isFilled ? e.isFilled(values) : !blank(values[e.fieldKey]);

/** Question 2 — what a gate needs: every field in this container that is required-and-blank,
 *  filled-but-invalid, or a broken exactly-one-of pair. Empty array = safe to seal. */
export function missingInContainer(
  container: DfoContainerId,
  ctx: RequirementContext,
  values: FieldValues,
): MissingField[] {
  const out: MissingField[] = [];
  const entries = DFO_REQUIREMENTS_TABLE.filter(e => e.container === container);
  const pairDone = new Set<string>();

  for (const e of entries) {
    if (e.kind === 'app-supplied') continue;

    if (e.kind === 'exactly-one-of-a-pair') {
      if (pairDone.has(e.fieldKey)) continue;
      const partner = entries.find(p => p.fieldKey === e.pairWith);
      pairDone.add(e.fieldKey);
      if (partner) pairDone.add(partner.fieldKey);
      if (e.state(ctx, values) !== 'mandatory') continue;
      const count = [e, partner].filter(x => x && isFilled(x, values)).length;
      if (count !== 1) {
        out.push({
          fieldKey: e.fieldKey,
          labelKey: e.labelKey ?? e.fieldKey,
          pairLabelKey: partner?.labelKey ?? undefined,
          reason: count === 0 ? 'pair-none' : 'pair-both',
        });
      }
      continue;
    }

    const state = e.state(ctx, values);
    if (state === 'mandatory' && !isFilled(e, values)) {
      out.push({ fieldKey: e.fieldKey, labelKey: e.labelKey ?? e.fieldKey, reason: 'blank' });
      continue;
    }
    // A typed value must be valid even when the field is optional (a sealed invalid value is
    // the same dead end as a sealed blank) — but a blocked field is never checked.
    if (state !== 'blocked' && isFilled(e, values) && e.isInvalid?.(values)) {
      const detailKey = e.invalidKey?.(values) ?? undefined;
      out.push({
        fieldKey: e.fieldKey, labelKey: e.labelKey ?? e.fieldKey, reason: 'invalid',
        ...(detailKey ? { detailKey } : {}),
      });
    }
  }
  return out;
}

/** Fields that live at the EFFORT level (asked once per fishing effort); everything else in
 *  the effort container repeats per trap group. Shared by the close gates, the footer
 *  close-all and the completion meter so the three can never disagree about the split. */
export const EFFORT_LEVEL_KEYS = new Set([
  'fmaId', 'haulStartTime', 'haulEndTime', 'sarInd', 'mmInterInd', 'gearSubtypeId',
]);

/** Question 4 — what the completion meter needs: of this container's MANDATORY fields in
 *  this context, how many are filled (and valid)? Pairs count as ONE unit, filled when
 *  exactly one member holds a value. App-supplied fields never count. `skip`/`only` let a
 *  caller split one container across repetitions (per-trap-group vs per-effort fields) or
 *  count a single member (the QC carrier VRN outside a recorded transfer). */
export function containerProgress(
  container: DfoContainerId,
  ctx: RequirementContext,
  values: FieldValues,
  opts?: { skip?: Set<string>; only?: Set<string> },
): { filled: number; total: number } {
  let filled = 0;
  let total = 0;
  const entries = DFO_REQUIREMENTS_TABLE.filter(e => e.container === container &&
    (!opts?.skip || !opts.skip.has(e.fieldKey)) &&
    (!opts?.only || opts.only.has(e.fieldKey)));
  const pairDone = new Set<string>();
  for (const e of entries) {
    if (e.kind === 'app-supplied') continue;
    if (e.kind === 'exactly-one-of-a-pair') {
      if (pairDone.has(e.fieldKey)) continue;
      const partner = entries.find(p => p.fieldKey === e.pairWith);
      pairDone.add(e.fieldKey);
      if (partner) pairDone.add(partner.fieldKey);
      if (e.state(ctx, values) !== 'mandatory') continue;
      total += 1;
      if ([e, partner].filter(x => x && isFilled(x, values)).length === 1) filled += 1;
      continue;
    }
    if (e.state(ctx, values) !== 'mandatory') continue;
    total += 1;
    // A filled-but-invalid value does not count as done — the close doors refuse it, so a
    // meter that counted it would read 100% on a log the buttons reject.
    if (isFilled(e, values) && !e.isInvalid?.(values)) filled += 1;
  }
  return { filled, total };
}

/** Question 3 — which whole groups must exist on the logbook: today, the two hail groups on
 *  a MAR log with a 38b/41 effort (Rules 2024/2025). */
export function requiredGroups(ctx: RequirementContext): DfoContainerId[] {
  if (ctx.subformId === 90 &&
      (ctx.effortFmaIds ?? []).some(fma => DFO_FMA_HLIN_REQUIRED.has(fma))) {
    return ['hlin', 'hlout'];
  }
  return [];
}
