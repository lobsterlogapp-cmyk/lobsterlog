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

/** SAR coordinates are emitted RAW (no clamp), so the validator's full lat/long leaf check
 *  applies: range AND ≤4 decimals (dfoXmlGenerator LEAF_CHECKS lat/long, verbatim). */
const sarLatOk = (v: string) => /^\d{1,2}(\.\d{1,4})?$/.test(v.trim()) && latInRange(v);
const sarLongOk = (v: string) => /^-\d{1,3}(\.\d{1,4})?$/.test(v.trim()) && longInRange(v);

/** Rule 444 (validator): crew count 1–20. */
const crewCountOk = (v: string) => /^\d+$/.test(v.trim()) && num(v) >= 1 && num(v) <= 20;

/** Rule 953 (233 validator): six uppercase letters A–Z. */
const ref233Ok = (v: string) => /^[A-Z]{6}$/.test(v.trim());

const simpleInvalid = (fieldKey: string, ok: (v: string) => boolean) =>
  (values: FieldValues) => !blank(values[fieldKey]) && !ok(String(values[fieldKey]));

// ─── State helpers ──────────────────────────────────────────────────────────

const per = (map: Record<number, RequirementState>) =>
  (ctx: RequirementContext) => map[ctx.subformId] ?? 'blocked';

const MMMM = per({ 88: 'mandatory', 89: 'mandatory', 90: 'mandatory', 91: 'mandatory' });

/** The app's main catch row is always lobster; absent species defaults to lobster. */
const isLobster = (values: FieldValues, key: string) =>
  String(values[key] ?? LOBSTER_SPECIE_ID).trim() === LOBSTER_SPECIE_ID;

const anyEffort38b = (ctx: RequirementContext) =>
  (ctx.effortFmaIds ?? []).includes(DFO_FMA_38B);

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

  // ── EFFORT — one entry set per effort / trap group, evaluated with its OWN FMA ──
  { fieldKey: 'fmaId', container: 'effort', labelKey: 'form234.fishingAreaLabel',
    kind: 'per-subform', state: MMMM, note: 'EFFORT.FMA_ID (row 64).' },
  { fieldKey: 'haulStartTime', container: 'effort', labelKey: 'form234.timeStartedHaulingLabel',
    kind: 'per-subform', state: MMMM, note: 'EFFORT.START_DT (row 62).' },
  { fieldKey: 'haulEndTime', container: 'effort', labelKey: 'form234.timeStoppedHaulingLabel',
    kind: 'per-subform', state: MMMM, note: 'EFFORT.END_DT (row 63).' },
  { fieldKey: 'sarInd', container: 'effort', labelKey: 'form234.sarIndLabel',
    kind: 'answered', state: MMMM,
    note: 'EFFORT.SAR_IND (row 67) — starts null by Rule 602; pass "" while unanswered.' },
  { fieldKey: 'mmInterInd', container: 'effort', labelKey: 'form234.mmInterIndLabel',
    kind: 'answered', state: MMMM,
    note: 'EFFORT.MM_INTER_IND (row 68) — starts null by Rule 602; pass "" while unanswered.' },
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
    state: ctx => (ctx.subformId === 88 && DFO_FMA_NB_VNTCH_YOU.has(ctx.fmaId ?? 0)
      ? 'mandatory' : 'blocked'),
    note: 'EFFORT_DETAIL.NB_VNTCH_YOU — Rules 625/626. Matches today’s app: the NL-optional ' +
      'reading (S139B A1.3) is its own future session by ruling 7. Tier-1 field.' },
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
  { fieldKey: 'sarCondId', container: 'sar', labelKey: 'form234.sarCondLabel',
    kind: 'per-subform', state: MMMM, note: 'SAR.SPCMN_COND_ID.' },
  { fieldKey: 'sarGps', container: 'sar', labelKey: 'form234.gpsLocationLabel',
    kind: 'per-subform', state: MMMM,
    isFilled: values => !blank(values.sarLat) && !blank(values.sarLng),
    isInvalid: values =>
      (!blank(values.sarLat) && !sarLatOk(String(values.sarLat))) ||
      (!blank(values.sarLng) && !sarLongOk(String(values.sarLng))),
    checkDescribe: 'latitude 38–72, longitude −148 to −40, max 4 decimals (SAR coordinates ' +
      'are emitted unclamped, so the decimal limit applies here unlike effort GPS)',
    note: 'SAR.LAT/LONG.' },

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
    kind: 'per-subform', state: MMMM, note: 'LANDING.START_DT (row 101).' },

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
    note: 'TRANSFER.TRNSF_DT (row 105).' },
  { fieldKey: 'transferWt', container: 'transfer', labelKey: 'form234.transferWtLabel',
    kind: 'per-subform', state: per({ 88: 'mandatory' }),
    note: 'TRANSFER_DTL.WT (row 117).' },
  { fieldKey: 'transferToVrn', container: 'transfer', labelKey: 'form234.transferToVrnLabel',
    kind: 'exactly-one-of-a-pair', pairWith: 'transferToPndNum',
    state: per({ 88: 'mandatory' }),
    note: 'Rule 252: exactly one of TO_VRN / TO_PND_NUM. (The FROM pair, Rule 251, is ' +
      'app-supplied — the profile’s own vessel number.)' },
  { fieldKey: 'transferToPndNum', container: 'transfer', labelKey: 'form234.transferToPndNumLabel',
    kind: 'exactly-one-of-a-pair', pairWith: 'transferToVrn',
    state: per({ 88: 'mandatory' }), note: 'Rule 252 — see transferToVrn.' },
  { fieldKey: 'carrierVrn', container: 'transfer', labelKey: 'form234.carrierVrnLabel',
    kind: 'depends-on-another-answer',
    state: (ctx, values) => (ctx.subformId === 88 && String(values.useCrInd ?? '') === 'Y'
      ? 'mandatory' : 'blocked'),
    note: 'LANDING.VRN — Rule 642 mandates it when the carrier question is Yes; Rule 641 ' +
      'blocks it otherwise. A LANDING element that SEALS UNDER THE TRANSFER CLOSE (recon-' +
      'proven). Tier-1 field (on logs that also record a transfer).' },
  { fieldKey: 'transferFrom', container: 'transfer', labelKey: null, kind: 'app-supplied',
    state: per({ 88: 'mandatory' }),
    note: 'Rule 251 FROM pair — the app writes the profile’s own vessel number.' },

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
  { fieldKey: 'reportDate', container: 'form222', labelKey: null, kind: 'app-supplied',
    state: MMMM, note: 'MM_INTER.REP_DATE — auto-defaulted to today, can never be blank.' },
  { fieldKey: 'gearDamageInd', container: 'form222', labelKey: null, kind: 'app-supplied',
    state: MMMM, note: 'GEAR_DMG_IND — defaulted N by the screen, can never be blank.' },
  // Rule 593 members keyed on the interaction answer (Rule 594 blocks the set when N):
  ...([
    ['interactionDate', 'form222.interactionDateLabel', 'INTERACT_DT date half'],
    ['interactionTime', 'form222.interactionTimeLabel', 'INTERACT_DT time half'],
    ['speciesLabel', 'form222.speciesLabel', 'NOAA_SPECIE_COD'],
    ['interactionTypeLabel', 'form222.interactionTypeLabel', 'MM_INTER_INCDNT.INCDNT_TYP_ID (Rule 1027)'],
    ['nbAnimals', 'form222.nbAnimalsLabel', 'NB_SPCMN_BEST'],
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
    kind: 'per-subform', state: MMMM, note: 'REPORT_DTL.END_DT (CSV REQUIRED=Y).' },
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
      out.push({ fieldKey: e.fieldKey, labelKey: e.labelKey ?? e.fieldKey, reason: 'invalid' });
    }
  }
  return out;
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
