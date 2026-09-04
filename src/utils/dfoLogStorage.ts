import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateLgbkUid } from './dfoUids';
import { dfoKey, DFO_STORE_BASES } from './dfoStorageKeys';
import {
  DFO_FMA_LIST,
  DFO_LGRID_BY_FMA,
  DFO_FMA_LGRID_REQUIRED,
  DFO_SUBFORM_REGISTRY,
  getDfoBaitTypeList,
} from '../utils/dfoConstants';
import {
  containerProgress,
  requiredGroups,
  latestEffortEnd,
  EFFORT_LEVEL_KEYS,
  RequirementContext,
  FieldValues,
} from './dfoRequirements';
// --- TYPES ---
export type DfoLogMode = 'full' | 'proposal';
export type DfoLogStatus = 'draft' | 'complete';

// --- S153 Phase 1: the weight unit a data group was CLOSED in ---
// R1: a weight is converted to kilograms and STORED that way when its section closes, so a
// stored weight is only interpretable beside the unit it was sealed in. R2: that unit then
// freezes with the number — a later toggle change touches neither. R4: different groups in
// one log may therefore carry different units, and (S153 founder ruling A) so may two rows
// of one card, because the tag follows `closeDt` exactly rather than inventing a card level.
//
// The tag rides the SAME shape as the stamp it pairs with, never a parallel one:
//   • bait / bycatch rows      -> row field `closeUnit`, beside the row's own `closeDt`
//   • efforts 2+               -> ExtraEffortNode.closeUnit, beside that node's `closeDt`
//   • effort 1, personal use,  -> flat data-map keys `<dgCloseKey>Unit`, beside the flat
//     transfer, hail-in           stamp (effort 1 has no node; it lives in the legacy keys)
//   • SAR blocks (S153B)       -> block 1: flat `sarCloseUnit`, beside its flat `sarCloseDt`;
//                                 blocks 2+: `ExtraSarDetail.closeUnit`, beside their own
//                                 `closeDt`. SAR is the one group that needs BOTH shapes,
//                                 because block 1 lives in flat keys and blocks 2+ in an array.
// HLOUT and LANDING seal no weight, so they carry no tag. (Until S153B SAR was in that list
// too — SAR.WT had no field and no emit; it now seals SAR.WT like any other weight.)
export type WeightUnit = 'lbs' | 'kg';

// R5: an ABSENT tag means POUNDS. Every weight closed under pre-S153 code is untagged, and
// pre-S153 code converted lbs->kg at emit reading the live toggle — so pounds is what those
// numbers are unless something says otherwise. Anything that is not exactly 'kg' reads as
// pounds: undefined, '', a legacy value, or garbage. Fail toward the old behaviour.
export function closedWeightUnit(tag: string | undefined): WeightUnit {
  return tag === 'kg' ? 'kg' : 'lbs';
}

// --- S153 Phase 3: what unit the STORED NUMBER is in — a different question ---
// closedWeightUnit above answers "which unit was the harvester working in when he sealed
// this?" — that is the LABEL's question (R2/R6). THIS answers "what is the number in the
// database?", which is the EMIT's question, and the two are NOT the same:
//
//   closed on lbs -> Phase 2 divided at close -> STORED kilograms, tag 'lbs'
//   closed on kg  -> nothing to divide        -> STORED kilograms, tag 'kg'
//   pre-S153      -> no conversion ever ran   -> STORED pounds,    NO TAG
//
// So the stored number is kilograms whenever a tag is PRESENT, whatever the tag says, and
// pounds only when there is none (R5). Reading the tag's value here instead would re-divide
// every lbs-closed weight — 100 lb out as 20.58 kg. That is the double conversion.
export function storedWeightUnit(tag: string | undefined): WeightUnit {
  return tag ? 'kg' : 'lbs';
}

// --- S153 Phase 2: the conversion, in ONE place ---
// Pounds per kilogram. Until S153 this number appeared exactly once in the repo (kgStr, at
// emit); R1 moves the conversion to close, so it lives HERE and Phase 3 points kgStr at it.
// It must never be written a second time — a second copy is a second rounding rule.
export const LBS_PER_KG = 2.20462;

// How many decimal places a converted weight is STORED with. Deliberately more than the two
// the wire carries (S153 founder ruling, Phase 5 §5.1).
//
// WHY NOT 2. The emit has always rounded to 2dp and still does, so 2dp of kilograms is all DFO
// ever sees. But storing only 2dp throws away what the harvester typed: 40 lb becomes 18.14 kg,
// and 18.14 kg read back is 39.99 lb. A man who typed 40 would reopen a card he can no longer
// edit and find 39.99 on it. Six places make the round-trip exact for every value tested,
// while kgStr's toFixed(2) at emit keeps the bytes identical to pre-S153.
//
// ACCEPTED COST, on the record: storage is no longer the wire format — 45.359291 stored,
// 45.36 sent. One is a deterministic rounding of the other, applied at emit and nowhere else.
export const STORED_KG_DECIMALS = 6;

// Convert a stored weight string to kilograms, given the unit it is currently in.
// • from 'kg'  -> returned untouched. Converting an already-converted number is THE failure
//   mode this whole build exists to prevent, so it is refused here, not guarded at call sites.
// • blank, non-numeric or negative -> returned EXACTLY as-is. kgStr's own guard already drops
//   these at emit, and a close must not invent a value where the harvester typed none.
// • otherwise -> divided and kept to STORED_KG_DECIMALS places, so the value can be shown back
//   in the unit it was closed in without drift (R2 + Option 2).
export function weightToKg(value: string, from: WeightUnit): string {
  if (from === 'kg') return value;
  const n = parseFloat(value);
  if (!isFinite(n) || n < 0) return value;
  return (n / LBS_PER_KG).toFixed(STORED_KG_DECIMALS);
}

// --- S153 Phase 5: DISPLAY ---
// Trailing zeros carry no meaning after a decimal point, and none at all without one — '100'
// must never become '1'. Used for every weight shown to the harvester.
export function formatWeight(value: string): string {
  const s = value.trim();
  if (!s.includes('.')) return s;
  return s.replace(/0+$/, '').replace(/\.$/, '');
}

// The inverse of weightToKg, for DISPLAY ONLY — never for storage and never for the emit.
// A CLOSED section stores kilograms (R1) but must be shown in the unit it was closed in
// (R2 + founder ruling Option 2), so this converts back. Two decimal places then stripped:
// with STORED_KG_DECIMALS behind it, a typed 40 comes back as exactly '40', which is the
// whole reason storage keeps more places than the wire.
export function weightFromKg(value: string, to: WeightUnit): string {
  const n = parseFloat(value);
  if (!isFinite(n)) return value;
  return formatWeight((to === 'kg' ? n : n * LBS_PER_KG).toFixed(2));
}

// R8 — the toggle flipped while a section was OPEN. An open section's number is held in the
// unit currently selected (founder ruling Option A: state holds what he typed), so a flip
// rewrites it once, here, and nothing is deleted. Blank and non-numeric pass through
// untouched: a flip must never turn an empty box into a declared 0, which under Rule 789
// would be a real quantity the harvester never entered.
export function convertOpenWeight(value: string, from: WeightUnit, to: WeightUnit): string {
  if (from === to) return value;
  const n = parseFloat(value);
  if (!isFinite(n)) return value;
  return formatWeight((to === 'kg' ? n / LBS_PER_KG : n * LBS_PER_KG).toFixed(2));
}

// --- S153 Phase 5: R8 across a remount ---
// R8 says an open section's weight converts when the toggle flips. The toggle lives on the
// free app's Settings screen, and App.tsx renders FullDfoForm ONLY on view 'dfo-demo' — so
// going to Settings UNMOUNTS the form. A flip is therefore never seen mid-session; it is
// always discovered at the next mount. That is why the draft has to record which unit its
// OPEN values are currently in: without it, a value typed as 100 lb would be silently read
// as 100 kg after a flip, and sealed that way at the next close.
//
// This key does NOT weaken founder ruling A (open values carry no per-section tag). It records
// ONE unit for the whole draft — the unit the toggle was on when those values were last
// written — which is exactly what "it lives in the toggle" means once the toggle can change
// behind the form's back.
export const DRAFT_WEIGHT_UNIT_KEY = 'draftWeightUnit';

// The open weights, by where they live. Closed ones are excluded by their own stamp.
function openWeightPlan(d: Record<string, string | undefined>) {
  const closed = (k: string) => !!d[k];
  return {
    effort1Open: !closed('dgCloseEffort'),
    personalOpen: !closed('dgClosePconsPersonal'),
    transferOpen: !closed('dgCloseTransfer'),
    hlinOpen: !closed('dgCloseHlin'),
    // S153B: SAR block 1 lives in the flat keys, so its open-ness is its own stamp — plus the
    // legacy dgCloseSar, which sealed every block at once and must not be re-united either.
    sar1Open: !closed('sarCloseDt') && !closed('dgCloseSar'),
    // ...and that legacy card stamp closes blocks 2+ as well, so it gates their arm too. In
    // practice a dgCloseSar log predates SAR.WT and carries no weight to re-unit, but the
    // predicate must say what it means rather than rely on that.
    sarCardOpen: !closed('dgCloseSar'),
  };
}

// Re-express a draft's OPEN weights in `to`, returning ONLY the changed keys (or null when
// nothing moves). Pure: the caller decides what to do with the result. Closed groups and
// closed rows are never touched — they are sealed, and sealed means sealed (R2).
export function reunitOpenWeights(
  data: Record<string, string | undefined>,
  to: WeightUnit,
): Record<string, string> | null {
  const from: WeightUnit = data[DRAFT_WEIGHT_UNIT_KEY] === 'kg' ? 'kg'
    : data[DRAFT_WEIGHT_UNIT_KEY] === 'lbs' ? 'lbs' : to;
  if (from === to) return null;
  const out: Record<string, string> = { [DRAFT_WEIGHT_UNIT_KEY]: to };
  const conv = (v: string | undefined) => convertOpenWeight(v ?? '', from, to);
  const { effort1Open, personalOpen, transferOpen, hlinOpen, sar1Open, sarCardOpen } = openWeightPlan(data);

  if (effort1Open && data.catchWeight) out.catchWeight = conv(data.catchWeight);
  // S153B (R8): SAR.WT on block 1. Without this a weight typed as 40 under pounds would be
  // read as 40 KILOGRAMS after a toggle flip and sealed that way at the next close — the exact
  // silent corruption DRAFT_WEIGHT_UNIT_KEY exists to prevent, and the reason SAR could not
  // simply be left out of this function when the field was built.
  if (sar1Open && data.sarWt) out.sarWt = conv(data.sarWt);
  if (personalOpen && data.personalUse) out.personalUse = conv(data.personalUse);
  if (transferOpen && data.transferWt) out.transferWt = conv(data.transferWt);
  if (hlinOpen && data.hlinTotalWeight) out.hlinTotalWeight = conv(data.hlinTotalWeight);

  // Effort 1's extra trap groups close with effort 1.
  if (effort1Open) {
    try {
      const rows = JSON.parse(data.extraEffortDetails || '[]') as ExtraEffortDetail[];
      if (Array.isArray(rows) && rows.length) {
        out.extraEffortDetails = JSON.stringify(
          rows.map(r => (r.catchWeight ? { ...r, catchWeight: conv(r.catchWeight) } : r)));
      }
    } catch { /* noop */ }
  }
  // Efforts 2+ each close on their own stamp.
  try {
    const nodes = JSON.parse(data.extraEffortNodes || '[]') as ExtraEffortNode[];
    if (Array.isArray(nodes) && nodes.length) {
      out.extraEffortNodes = JSON.stringify(nodes.map(n => (n.closeDt ? n : {
        ...n,
        details: (n.details ?? []).map(r => (r.catchWeight ? { ...r, catchWeight: conv(r.catchWeight) } : r)),
      })));
    }
  } catch { /* noop */ }
  // S153B: SAR blocks 2+ close individually, so each open block re-units on its own — the
  // bait/bycatch row rule, applied to the extraSars array.
  if (sarCardOpen) {
    try {
      const blocks = JSON.parse(data.extraSars || '[]') as ExtraSarDetail[];
      if (Array.isArray(blocks) && blocks.length) {
        out.extraSars = JSON.stringify(
          blocks.map(b => (b.closeDt || !b.wt ? b : { ...b, wt: conv(b.wt) })));
      }
    } catch { /* noop */ }
  }
  // Bait and bycatch rows close individually (founder ruling A).
  for (const key of ['baitEntries', 'bycatchEntries'] as const) {
    try {
      const rows = JSON.parse(data[key] || '[]') as { lbs?: string; closeDt?: string }[];
      if (Array.isArray(rows) && rows.length) {
        out[key] = JSON.stringify(rows.map(r => (r.closeDt || !r.lbs ? r : { ...r, lbs: conv(r.lbs) })));
      }
    } catch { /* noop */ }
  }
  return out;
}

// --- S153 Phase 2: one PURE sealer per weight-sealing data group ---
// WHY THESE EXIST AS SEPARATE EXPORTED FUNCTIONS
// The close handlers live inside FullDfoForm, and this repo has no way to render that
// component under jest — so a conversion written inline there could not be tested, and a
// mutation of it could not be watched. These are the same pattern the close STAMPS already
// use (stampOpenRows / stampOpenEfforts / stampOpenSarBlocks): pure, exported, called by the
// component. One per group, so breaking one fails exactly one named test.
// The three scalar sealers are deliberately one-line wrappers over weightToKg. They share the
// arithmetic; what they buy is separability — a change to hail-in's handling cannot silently
// move personal use, and a mutation of one is caught by one test.

// BAIT_USED.BT_WT — the bait card. Rows close individually (founder ruling A), so a row that
// already carries its own closeDt is returned untouched: it keeps the number AND the unit it
// was closed with (R2). `onlyIndex` seals a single row; null seals every open row.
export function sealBaitRowWeights<T extends { lbs: string; closeDt?: string; closeUnit?: WeightUnit }>(
  rows: T[], unit: WeightUnit, onlyIndex: number | null = null,
): T[] {
  return rows.map((r, i) => {
    if (r.closeDt) return r;
    if (onlyIndex !== null && i !== onlyIndex) return r;
    return { ...r, lbs: weightToKg(r.lbs, unit), closeUnit: unit };
  });
}

// PCONS.WT (bycatch) — identical row shape, its own function so it is its own mutation site.
export function sealBycatchRowWeights<T extends { lbs: string; closeDt?: string; closeUnit?: WeightUnit }>(
  rows: T[], unit: WeightUnit, onlyIndex: number | null = null,
): T[] {
  return rows.map((r, i) => {
    if (r.closeDt) return r;
    if (onlyIndex !== null && i !== onlyIndex) return r;
    return { ...r, lbs: weightToKg(r.lbs, unit), closeUnit: unit };
  });
}

// CATCH.KEPT_WT for EFFORT 1 — which owns two homes: the top-level catchWeight (trap group 1)
// and every extraEffortDetails row (groups 2..n of the same effort). They close together, so
// they convert together. Effort 1 has no node, so its tag is the flat dgCloseEffortUnit.
export function sealEffort1Weights(
  catchWeight: string, details: ExtraEffortDetail[], unit: WeightUnit,
): { catchWeight: string; details: ExtraEffortDetail[]; unit: WeightUnit } {
  return {
    catchWeight: catchWeight ? weightToKg(catchWeight, unit) : catchWeight,
    details: details.map(d => (d.catchWeight ? { ...d, catchWeight: weightToKg(d.catchWeight, unit) } : d)),
    unit,
  };
}

// CATCH.KEPT_WT for EFFORTS 2+ — each node seals its OWN trap groups and carries its own tag
// beside its own closeDt. Skip-never-restamp, as above.
export function sealEffortNodeWeights(
  nodes: ExtraEffortNode[], unit: WeightUnit, onlyIndex: number | null = null,
): ExtraEffortNode[] {
  return nodes.map((n, i) => {
    if (n.closeDt) return n;
    if (onlyIndex !== null && i !== onlyIndex) return n;
    return {
      ...n,
      closeUnit: unit,
      details: (n.details ?? []).map(d => (d.catchWeight ? { ...d, catchWeight: weightToKg(d.catchWeight, unit) } : d)),
    };
  });
}

// SAR.WT for BLOCK 1 — the legacy flat sar* keys, which have no node to carry anything. The
// scalar-sealer shape (see the three below), separate from the array sealer so a mutation of
// block 1's conversion fails its own test and not the other blocks'. Its unit tag is the flat
// `sarCloseUnit`, written beside block 1's own `sarCloseDt` by the caller.
export function sealSarBlock1Weight(value: string, unit: WeightUnit): string {
  return weightToKg(value, unit);
}

// SAR.WT for BLOCKS 2+ — one ExtraSarDetail each. SAR blocks close individually (S135 ruling
// 4), so this is the bait/bycatch ROW shape, not the section shape: a block that already
// carries its own closeDt is returned untouched, keeping the number AND the unit it was closed
// with (R2). `onlyIndex` seals a single block; null seals every open one.
// The tag is written even when the block has no weight, exactly as sealBaitRowWeights tags a
// row it seals: the tag records the unit the BLOCK closed in, and a blank weight simply has
// nothing for it to interpret (kgStr drops an empty value at emit either way).
export function sealSarBlockWeights(
  blocks: ExtraSarDetail[], unit: WeightUnit, onlyIndex: number | null = null,
): ExtraSarDetail[] {
  return blocks.map((b, i) => {
    if (b.closeDt) return b;
    if (onlyIndex !== null && i !== onlyIndex) return b;
    return { ...b, wt: weightToKg(b.wt ?? '', unit), closeUnit: unit };
  });
}

// PCONS.WT (personal use) — MAR-90 only.
export function sealPersonalUseWeight(value: string, unit: WeightUnit): string {
  return weightToKg(value, unit);
}

// TRANSFER_DTL.WT — QC-88 only.
export function sealTransferWeight(value: string, unit: WeightUnit): string {
  return weightToKg(value, unit);
}

// HLIN.TOT_WT_ONBRD — 38b/41 hail only.
export function sealHailInWeight(value: string, unit: WeightUnit): string {
  return weightToKg(value, unit);
}

// Per-section REM (note) text, grouped at the human-section level. Each key fans out to
// one or more XSD REM nodes in dfoXmlGenerator.ts (T1 Logbook test):
//   trip -> TRIP | haul -> EFFORT + EFFORT_BY_GEAR + EFFORT_DETAIL | catch -> CATCH |
//   landing -> LANDING | hlin -> HLIN | hlout -> HLOUT |
//   personalUse -> the Personal Use PCONS node | transfer -> TRANSFER + TRANSFER_DTL (QC-88) |
//   sar -> SAR (legacy shared fallback for a block without its own note, S135)
// S142 (defect 44): 'bait' and 'pcons' are RETIRED. They lost their edit boxes in S134 when
// bait and bycatch notes went per row, and S142 removed the generator fallbacks that were
// still reading them — so nothing on any screen writes them and nothing in the emit reads
// them. The fields stay on the type so stored logs still parse and round-trip unchanged.
// All optional, free text, type string_2000 (max 2000 chars) in the XSD.
export interface LogRemarks {
  trip?: string;
  bait?: string;        // RETIRED (S142) — no edit box, no emit; parsed for round-trip only
  haul?: string;
  catch?: string;
  landing?: string;
  hlin?: string;
  hlout?: string;
  pcons?: string;       // RETIRED (S142) — no edit box, no emit; parsed for round-trip only
  personalUse?: string;
  transfer?: string;
  sar?: string;
}

// --- S142 (defect 44): ONE key list for LogRemarks, and it cannot drift from the type ---
// The defect this kills: FullDfoForm's loader carried a SECOND, hand-written list of note
// names. S134 Phase 3 added `personalUse` to the type, the lock map, the screen and the
// generator — and not to that list. The note was saved correctly, dropped on the way back
// in, and then erased by the next save.
//
// REMARK_KEY_PRESENCE is typed Record<keyof LogRemarks, true>, so TypeScript REFUSES to
// compile if a field is added to LogRemarks and not added here. There is now no second
// list to forget it in.
const REMARK_KEY_PRESENCE: Record<keyof LogRemarks, true> = {
  trip: true, bait: true, haul: true, catch: true, landing: true, hlin: true,
  hlout: true, pcons: true, personalUse: true, transfer: true, sar: true,
};
export const LOG_REMARK_KEYS = Object.keys(REMARK_KEY_PRESENCE) as (keyof LogRemarks)[];

// Rebuild a log's note state for the form, one entry per LogRemarks key. Absent → ''.
// Used by FullDfoForm.hydrateFromLog on BOTH load paths (opening a saved log, and the S95
// crash-safety restore), so neither path can drift from the other or from the type.
//
// CARVE-OUT — 'catch' and 'haul' are the ONE non-uniform pair, and deliberately so. The
// screen has a SINGLE Catch & Effort NOTE box that writes both keys with the same text
// (FullDfoForm's effort note field), because the generator reads 'haul' for EFFORT +
// EFFORT_BY_GEAR + EFFORT_DETAIL and 'catch' for CATCH — one note, four XSD slots. Seeding
// both from one value keeps that invariant true on the way back in; preferring 'catch' then
// 'haul' means a log saved by any past version returns with the pair agreeing.
export function seedRemarksFromLog(log: DfoLog): LogRemarks {
  const r = log.remarks ?? {};
  const out: LogRemarks = {};
  for (const k of LOG_REMARK_KEYS) out[k] = r[k] ?? '';
  const ce = r.catch ?? r.haul ?? '';
  out.catch = ce;
  out.haul = ce;
  return out;
}

// S121 multi-grid: one ADDITIONAL catch-effort block (EFFORT_DETAIL 2..n + its CATCH).
// Block 1 stays the legacy top-level data keys, so old logs and single-grid logs are
// untouched; blocks 2+ ride data.extraEffortDetails as a JSON array of these. All values
// are strings, matching the DfoLog.data map convention. The *Display twins are UI labels
// (grid number / section name); only the *Id/code fields reach the XML.
// S121 multi-SAR: one ADDITIONAL species-at-risk encounter (SAR node 2..n). Block 1 stays
// the legacy d.sar* keys; blocks 2+ ride data.extraSars as a JSON array of these. Emitted
// only when SAR_IND='Y' (same gate as block 1). `speciesOther`/`what` are UI-only, matching
// the block-1 fields that never reach the XML.
export interface ExtraSarDetail {
  species?: string;       // MV_SAR_LIST codeId → SAR.SPECIE_ID
  speciesOther?: string;  // UI-only free text (no XSD element)
  what?: string;          // UI-only description (stored, not emitted — matches block 1)
  lat?: string; lng?: string; gpsSrc?: string;
  date?: string; time?: string;   // YYYY-MM-DD / HH:MM → SAR_DT
  nbSpcmn?: string;
  // S153B: SAR.WT — "Total estimated weight" (XML_dictionary ELEMENT_ID 545, UOM 59, the same
  // unit of measure as CATCH.KEPT_WT / BAIT_USED.BT_WT / PCONS.WT). Optional in all four
  // regions (Subforms_requirements_234.xlsx row 36) and optional in the XSD (sar_type: WT
  // minOccurs=0, type `weight`). Sits between nbSpcmn and condId to mirror the XSD sequence
  // and the dictionary's ELEMENT_ORDER, so the field list and the emit read in the same order.
  wt?: string;
  condId?: string;        // MV_SPECIMENS_CONDITION codeId → SPCMN_COND_ID
  closeDt?: string;       // S124: per-block DG_CLOSE_DT (ISO) — SAR closes one block at a time
  // S153B: the unit THIS block's wt was closed in, beside this block's own closeDt (R1/R2).
  // Same shape and same rule as ExtraEffortNode.closeUnit. Absent = pounds (R5).
  closeUnit?: WeightUnit;
  note?: string;          // S135: per-block REM text; absent → falls back to rem.sar at emit
}

export interface ExtraEffortDetail {
  lgridCodeId?: string; lgridDisplay?: string;   // MAR settlement grid
  gridId?: string; gridDisplay?: string;         // QC grid (MV_GRID codeId)
  statSectId?: string; statSectDisplay?: string; // NL statistical section
  catchWeight?: string;
  trapHauls?: string;
  soakDuration?: string;                         // days in UI; minutes on the wire
  gpsLat?: string; gpsLng?: string; gpsSrc?: string;
  trapSize?: string;                             // NL TRP_SZ_ID
  nbSpcmnKept?: string;                          // NL CATCH count (Rule 976)
  // S154 (U2): CATCH.NB_SPCMN_DISC — the number of specimens thrown back. Optional on QC(88)
  // and NL(91), Blocked on GLF(89) and MAR(90) (Subforms_requirements_234.xlsx row 95,
  // Element_id 197). Sits between nbSpcmnKept and nbSpcmnBrd to mirror the XSD catch_type
  // sequence (KEPT_WT → NB_SPCMN_KEPT → NB_SPCMN_DISC → SPECIE_FRM_ID → NB_SPCMN_BRD), so the
  // field list and the emit read in the same order — the ExtraSarDetail.wt convention (S153B).
  nbSpcmnDisc?: string;                          // QC/NL CATCH count (row 95; Rules 630/789)
  nbSpcmnBrd?: string;                           // MAR 38b CATCH count (Rule 654)
  vNotchCount?: string; nbVntchYou?: string;     // QC FMA-gated v-notch counts
}

// S136 multi-effort: one ADDITIONAL fishing effort (EFFORT node 2..n — Rule 1050; XSD
// trip_type EFFORT 0..unbounded). ⚠ NAMING: this is the EFFORT level — a separate haul
// time window with its own licence, area, indicators and closure. It is NOT the trap-group
// level: `ExtraEffortDetail` above (state `extraEfforts`, data key `extraEffortDetails`)
// repeats EFFORT_DETAIL *within* one effort. The two levels never share a bare name —
// everything at this level says "Node".
// Effort 1 stays in the legacy flat data keys (fmaId, timeStartedHauling, sarYes, mmYes,
// dgCloseEffort, extraEffortDetails, remarks.haul/catch…); efforts 2+ ride
// data.extraEffortNodes as a JSON array of these, written only when a second effort exists
// (the S121/S135 additive pattern, third use). All values are strings per the data-map
// convention. Effort 1's note lives in log.remarks (haul/catch), so `note` here serves
// efforts 2+ only; it fans out inside its effort exactly as effort 1's does (S136 §1.2
// ruling: EFFORT.REM + EFFORT_BY_GEAR.REM + each EFFORT_DETAIL.REM + each CATCH.REM).
export interface ExtraEffortNode {
  haulStartDate?: string; haulStartTime?: string;  // → EFFORT.START_DT (own date + HH:MM)
  haulEndDate?: string;   haulEndTime?: string;    // → EFFORT.END_DT
  fmaId?: string;                                  // → EFFORT.FMA_ID (also gates the region fields)
  licNo?: string;                                  // → EFFORT.LIC_NO; blank → profile licence
  sarYes?: string;                                 // 'true'/'false' → SAR_IND Y/N
  mmYes?: string;                                  // 'true'/'false' → MM_INTER_IND Y/N
  gearSubtypeId?: string;                          // NL → EFFORT_BY_GEAR.GEAR_SBTYP_ID
  note?: string;                                   // per-effort REM text (fans out, see above)
  closeDt?: string;                                // per-effort DG_CLOSE_DT (ISO)
  closeUnit?: WeightUnit;                          // S153: unit this effort's KEPT_WT closed in
  details?: ExtraEffortDetail[];                   // its OWN trap groups (EFFORT_DETAIL 1..n)
}

export interface DfoLog {
  id: string;                    // e.g. "LL-20260421-001"
  lgbkUid: string;               // Rule 181: 6 random uppercase letters, permanent per log
  firstEntryDt: string;          // ISO UTC timestamp when log was first created
  mode: DfoLogMode;              // 'full' or 'proposal'
  status?: DfoLogStatus;         // 'draft' or 'complete'
  sentToDfo?: boolean;           // true once "Send to DFO" is confirmed
  dateFished: string;            // "YYYY-MM-DD"
  createdAt: number;             // timestamp, for sorting
  data: Record<string, string>;  // all form fields as key/value
  subformId?: number;            // 88 | 89 | 90 | 91 — defaults to 90 (MAR) if missing
  regId?: number;                // 1006 | 1014 | 1004 | 1002
  tripNum?: number;              // Rule 48: sequential per vessel trip, allocated at creation
  remarks?: LogRemarks;          // optional per-section REM notes (T1); rides along, no migration
}

// --- CORE HELPERS ---

// Load every saved log, newest first
export const loadAllLogs = async (): Promise<DfoLog[]> => {
  try {
    const raw = await AsyncStorage.getItem(dfoKey(DFO_STORE_BASES.dfo_logs));
    if (!raw) return [];
    const logs: DfoLog[] = JSON.parse(raw);
    // Back-fill status and sentToDfo for any logs saved before these fields existed
    const withDefaults = logs.map(l => ({
          ...l,
          status: l.status ?? ('complete' as DfoLogStatus),
          sentToDfo: l.sentToDfo ?? false,
          lgbkUid: l.lgbkUid ?? generateLgbkUid(),
          firstEntryDt: l.firstEntryDt ?? new Date(l.createdAt).toISOString(),
          subformId: l.subformId ?? 90,
          regId: l.regId ?? 1004,
        }));
    return withDefaults.sort((a, b) => b.createdAt - a.createdAt);
  } catch (err) {
    console.error('Failed to load DFO logs:', err);
    return [];
  }
};

// Save a new log OR update an existing one (by id)
export const saveLog = async (log: DfoLog): Promise<boolean> => {
  try {
    const existing = await loadAllLogs();
    const withoutThisId = existing.filter((l) => l.id !== log.id);
    const updated = [...withoutThisId, log];
    await AsyncStorage.setItem(dfoKey(DFO_STORE_BASES.dfo_logs), JSON.stringify(updated));
    return true;
  } catch (err) {
    console.error('Failed to save DFO log:', err);
    return false;
  }
};

// --- CRASH-SAFETY SCRATCH DRAFT (S95, Item 2) ---
// A single uid-namespaced in-progress snapshot, written debounced while a NEW log is being entered,
// so an app crash mid-entry can't destroy the trip. Cleared on successful save/back (and therefore
// before any send — a log must be saved before it can be sent). Intentionally NOT in DFO_STORE_BASES:
// it is transient device-local crash-safety, not user data to back up / migrate / wipe; the dfoKey()
// uid-namespacing keeps it account-isolated. Best-effort: never throws into a caller.
const ACTIVE_DRAFT_BASE = '@lobsterlog:dfo_active_draft';

export const saveActiveDraft = async (log: DfoLog): Promise<void> => {
  try {
    await AsyncStorage.setItem(dfoKey(ACTIVE_DRAFT_BASE), JSON.stringify(log));
  } catch (err) {
    console.error('Failed to write active draft:', err);
  }
};

export const loadActiveDraft = async (): Promise<DfoLog | null> => {
  try {
    const raw = await AsyncStorage.getItem(dfoKey(ACTIVE_DRAFT_BASE));
    if (!raw) return null;
    return JSON.parse(raw) as DfoLog;
  } catch (err) {
    console.error('Failed to read active draft:', err);
    return null;
  }
};

export const clearActiveDraft = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(dfoKey(ACTIVE_DRAFT_BASE));
  } catch (err) {
    console.error('Failed to clear active draft:', err);
  }
};

// Load a single log by its id
export const loadLogById = async (id: string): Promise<DfoLog | null> => {
  const all = await loadAllLogs();
  return all.find((l) => l.id === id) || null;
};

// --- S160: delete a log by id — REFUSED for sent logs and for logs with any closed group ---
// The refusal lives HERE, in the function, not only in the hidden button (Gate 0 condition 1;
// the effortDeleteRefused / S140 P3 pattern): a future caller that skips the render gate can
// no longer destroy a closed-untransmitted data group (Standard v6.1 A.1.2). Refusal is a
// returned result the caller can act on — never a throw, never a silent no-op.
//   'sent'        — checked FIRST, so a sent log (whose groups are also closed) names the
//                   truer reason. S124 ruled sent logs undeletable; stricter than A.1.2
//                   permits for transmitted groups, which "may" allows.
//   'closedGroup' — the A.1.2 prohibition itself, via hasAnyClosedGroup (the one predicate).
//   'error'       — the storage layer failed; nothing was destroyed.
//
// --- S160 Phase 2: THE DEV FLAG (⚠ SHIP BLOCKER — see BUILD_S160_DELETE_GATING.md GATE 2) ---
// The ONE build-time override for the delete gate, for capture-sim cleanup only. Checked in
// exactly ONE place (the guard below) — a second check site is a second copy of the rule.
//
//   • DEFAULT IS OFF — `__DEV__ && false` — so dev sims walk the PRODUCTION behaviour. A bare
//     `__DEV__` here would put Delete back on every dev build and the gate could never be
//     seen on glass.
//   • TO USE: flip the second word to `true` for the cleanup session, flip it back after.
//     The pin test in deleteGating.oneoff.test.ts asserts the flag is false, so a forgotten
//     flip turns jest RED — the ledger has an automated tooth, not just a note.
//   • THE WALL: `__DEV__` is inlined to false by Metro in every release bundle, so the whole
//     expression constant-folds to false at BUILD time whatever the second word says — the
//     bypass cannot exist in a shipped bundle. A role check is a curtain; this is the wall.
export const DEV_ALLOW_DELETE_CLOSED: boolean = __DEV__ && false;

// Deleting an id that does not exist stays ok BUT carries `notFound: true` (Gate 1 ruling,
// superseding Gate 0's plain idempotent-ok): a wrong-id bug must never look like a successful
// delete. Nothing is written on that path — there is nothing to remove.
// On a REAL delete, a matching S95 crash-scratch (same id) is cleared too — otherwise a crash
// survivor could offer to "restore" a log the harvester just deleted (resurrection orphan).
// A scratch for a DIFFERENT id is left alone, and a refused delete never touches the scratch
// (the crash snapshot must survive a refusal). Best-effort: a scratch failure never fails the
// delete — the scratch is transient device-local crash-safety, not user data.
// The transmission register and xml_archive are untouched on every path — §13.4 requires it.
export type DeleteRefusal = 'sent' | 'closedGroup' | 'error';
export type DeleteLogResult =
  | { ok: true; notFound?: true }
  | { ok: false; reason: DeleteRefusal };

export const deleteLog = async (id: string): Promise<DeleteLogResult> => {
  try {
    const existing = await loadAllLogs();
    const target = existing.find((l) => l.id === id);
    if (!target) return { ok: true, notFound: true };
    // The refusal routes through THE one decision (destructionOffered — which owns the sole
    // dev-flag check). Sent named first: the truer reason. notFound above and the scratch
    // hygiene below apply to a dev delete too (that IS the sim cleanup).
    if (!destructionOffered(target.sentToDfo === true, hasAnyClosedGroup(target))) {
      return { ok: false, reason: target.sentToDfo === true ? 'sent' : 'closedGroup' };
    }
    const filtered = existing.filter((l) => l.id !== id);
    await AsyncStorage.setItem(dfoKey(DFO_STORE_BASES.dfo_logs), JSON.stringify(filtered));
    try {
      const scratch = await loadActiveDraft();
      if (scratch?.id === id) await clearActiveDraft();
    } catch { /* best-effort — the delete itself already succeeded */ }
    return { ok: true };
  } catch (err) {
    console.error('Failed to delete DFO log:', err);
    return { ok: false, reason: 'error' };
  }
};

// Mark a log as sent to DFO
export const markSentToDfo = async (id: string): Promise<boolean> => {
  try {
    const existing = await loadAllLogs();
    const updated = existing.map(l => l.id === id ? { ...l, sentToDfo: true } : l);
    await AsyncStorage.setItem(dfoKey(DFO_STORE_BASES.dfo_logs), JSON.stringify(updated));
    return true;
  } catch (err) {
    console.error('Failed to mark log as sent:', err);
    return false;
  }
};

// Generate the next Trip ID for a given date
export const generateNewLogMeta = async (dateFished: string, subformId: number = 90): Promise<{
  id: string;
  lgbkUid: string;
  firstEntryDt: string;
  subformId: number;
  regId: number;
  tripNum: number;
}> => {
  const datePart = dateFished.replace(/-/g, '');
  const all = await loadAllLogs();
  const sameDay = all.filter((l) => l.id.startsWith(`LL-${datePart}-`));
  const nextSeq = (sameDay.length + 1).toString().padStart(3, '0');
  const regId = DFO_SUBFORM_REGISTRY[subformId]?.regId ?? 1004;
  // Rule 48: trip number allocated automatically and sequentially per new vessel trip.
  // Logs saved before tripNum existed count via all.length so numbering never collides.
  const tripNum = Math.max(all.length, ...all.map(l => l.tripNum ?? 0)) + 1;
  return {
    id: `LL-${datePart}-${nextSeq}`,
    lgbkUid: generateLgbkUid(),
    firstEntryDt: new Date().toISOString(),
    subformId,
    regId,
    tripNum,
  };
};

// --- DRAFT HELPERS ---

// Save a draft (status = 'draft') — all other fields same as saveLog
export const saveDraft = async (log: Omit<DfoLog, 'status'>): Promise<boolean> => {
  return saveLog({ ...log, status: 'draft' });
};

// --- S125 Phase 9: the SINGLE per-data-group "used" definition ---
// One formula, two callers (ruling 2): FullDfoForm.openUsedGroups (the Close & Save controls, from
// live state) and the send-path guard (from a stored log). Keeping it single-sourced is what stops
// a group being silently dropped from a file. Keys are the generator's dgClose* data-map keys.
export interface DataGroupInputs {
  subformId: number;
  // S137: hail-area qualification is ANY effort's FMA ∈ {38b, 41} — callers compute it via
  // the single-sourced fishesHailArea predicate, never a local FMA comparison.
  hailFma: boolean;
  effortYes: boolean;       // S128 Phase 5: false on a no-haul (setting) day → EFFORT omitted
  baitCount: number;
  bycatchYes: boolean;
  bycatchCount: number;
  personalUse: string;
  sarYes: boolean;
  transferYes: boolean;
  hlinCompany: string; hlinConfirmNo: string;
  // S153 Phase 4 (R9): a typed hail-in WEIGHT makes the group used. Until S153 the formula
  // named only company and confirmation number, so a 38b harvester who typed just the total
  // weight had no close door — the weight sat stored, unconvertible and untaggable, because
  // nothing could ever seal it. R1 needs every weight to pass a close, so the weight now
  // counts. Accepted cost (founder ruling R9): typing a weight and changing your mind leaves
  // a group that must be closed before the log can be sent.
  hlinTotalWeight: string;
  hloutCompany: string; hloutConfirmNo: string;
}

export function usedDataGroupKeys(v: DataGroupInputs): string[] {
  const hlFma = v.hailFma;
  const used: Record<string, boolean> = {
    // S128 Phase 5: EFFORT is used only when a haul is declared — on a no-haul day the generator
    // omits the whole EFFORT node (dfoXmlGenerator: `if (d.effortYes !== 'false')`), so counting
    // it "used" over-counted the open sections and stamped an orphan close nothing reads.
    dgCloseEffort: v.effortYes,
    dgCloseLanding: true,   // LANDING always used (port landed is mandatory)
    dgCloseBaitUsed: v.baitCount > 0,
    dgClosePconsBycatch: v.bycatchYes && v.bycatchCount > 0,
    dgClosePconsPersonal: v.subformId === 90 && v.personalUse.trim().length > 0,
    // SAR lives inside EFFORT — the generator gates it on effortYes too, so it can't be "used"
    // on a no-haul day even if a stale sarYes survived a haul→no-haul toggle.
    dgCloseSar: v.effortYes && v.sarYes,
    dgCloseTransfer: v.subformId === 88 && v.transferYes,
    dgCloseHlin: hlFma && !!(v.hlinCompany || v.hlinConfirmNo || v.hlinTotalWeight),
    dgCloseHlout: hlFma && !!(v.hloutCompany || v.hloutConfirmNo),
  };
  return Object.keys(used).filter(k => used[k]);
}

// Data-side adapter: build the inputs from a stored log's data map (the same representation the
// generator reads). Single-sourced so the "data map → used" mapping lives in exactly one place.
export function dataGroupInputsFromLog(log: Pick<DfoLog, 'subformId' | 'data'>): DataGroupInputs {
  const d = log.data;
  const len = (s?: string) => { try { return (JSON.parse(s || '[]') as unknown[]).length; } catch { return 0; } };
  return {
    subformId: log.subformId ?? 90,
    hailFma: fishesHailArea(d),
    // Matches the generator's gate exactly: missing key (old logs) = haul, only 'false' = no-haul.
    effortYes: d.effortYes !== 'false',
    baitCount: len(d.baitEntries),
    bycatchYes: d.bycatchYes === 'true',
    bycatchCount: len(d.bycatchEntries),
    personalUse: d.personalUse ?? '',
    // S136 Phase 4: SAR_IND is per-effort — the trip-level SAR pool is "used" (and emitted)
    // when ANY effort answered Yes, matching the generator's gate exactly. Single-effort
    // logs behave identically (effort 1's sarYes IS d.sarYes).
    sarYes: effortsFromData(d).some(e => e.sarYes === 'true'),
    transferYes: d.transferYes === 'true',
    hlinCompany: d.hlinCompany ?? '', hlinConfirmNo: d.hlinConfirmNo ?? '',
    hlinTotalWeight: d.hlinTotalWeight ?? '',
    hloutCompany: d.hloutCompany ?? '', hloutConfirmNo: d.hloutConfirmNo ?? '',
  };
}

// S134: bait — and, since Phase 3, bycatch — close PER ROW (per-occurrence closure, §5).
// A row-based group counts as closed when the legacy card-level stamp exists OR every
// stored row carries its own closeDt. One definition, two callers per group (the send
// guard below and FullDfoForm's openUsedGroups) — keep them on this helper so they can't drift.
export function rowsAllClosed(entriesJson?: string): boolean {
  try {
    const rows = JSON.parse(entriesJson || '[]') as { closeDt?: string }[];
    return rows.length > 0 && rows.every(r => !!r.closeDt);
  } catch { return false; }
}
// Bait-named alias kept so the S134 bait-pilot call sites and tests stay untouched.
export const baitRowsAllClosed = rowsAllClosed;

// S160: the ANY-row twin, for the delete gate. rowsAllClosed answers the SEND question ("is
// this group finished?"); this answers the DESTRUCTION question ("is anything in here sealed?")
// — Standard v6.1 A.1.2 prohibits destroying a closed-untransmitted group, and one closed row
// is one closed occurrence. Same failure posture as rowsAllClosed: an unparseable array reads
// as no-row-closures (the legacy card keys in hasAnyClosedGroup stay armed either way).
export function rowsAnyClosed(entriesJson?: string): boolean {
  try {
    const rows = JSON.parse(entriesJson || '[]') as { closeDt?: string }[];
    return rows.some(r => !!r.closeDt);
  } catch { return false; }
}

// S134 T1: stamp every still-open row with `stamp`; rows that already carry their own
// closeDt are untouched (skip, never restamp). Serves bait AND bycatch (S134 Phase 3),
// three callers each in FullDfoForm: the card's close-all button, the group's member of
// the form-level Close & Save All (both of which write NO card-level stamp — only rows
// have close states), and the adopt-on-add path that converts a legacy card-level stamp
// into per-row stamps (same value → identical emitted bytes) so a newly added row can
// never inherit a close.
export function stampOpenRows(entriesJson: string | undefined, stamp: string): string {
  try {
    const rows = JSON.parse(entriesJson || '[]') as { closeDt?: string }[];
    return JSON.stringify(rows.map(r => (r.closeDt ? r : { ...r, closeDt: stamp })));
  } catch { return entriesJson ?? '[]'; }
}
// Bait-named alias kept so the S134 bait-pilot call sites and tests stay untouched.
export const stampOpenBaitRows = stampOpenRows;

// S135: SAR closes PER BLOCK (§5 per-occurrence closure — the bait/bycatch pattern, but
// SAR's occurrences are NOT one uniform JSON array: block 1 lives as flat d.sar* keys with
// its own stamp/note in the new flat d.sarCloseDt / d.sarNote keys (ruling 1 — block 1
// does not move into extraSars), blocks 2+ ride d.extraSars. This is THE one reader that
// synthesizes the uniform block list, mirroring the synthesis the generator's <SAR> loop
// has done since S121. The emit, the send-guard escape below, and FullDfoForm's close-all
// all read THIS list, so they cannot disagree about what a "block" is.
export function sarBlocksFromData(d: Record<string, string | undefined>): ExtraSarDetail[] {
  let extraSars: ExtraSarDetail[] = [];
  try {
    const parsed = JSON.parse(d.extraSars || '[]');
    if (Array.isArray(parsed)) extraSars = parsed;
  } catch { /* noop */ }
  return [
    { species: d.sarSpecies, lat: d.sarLat, lng: d.sarLng, gpsSrc: d.sarGpsSrc,
      date: d.sarDate, time: d.sarTime, nbSpcmn: d.sarNbSpcmn, condId: d.sarCondId,
      // S153B: block 1's weight and its unit tag, synthesised onto the uniform block exactly
      // as its closeDt/note are — so the emit reads s.wt / s.closeUnit for EVERY block and
      // never branches on block 1. The tag is narrowed the same way effortsFromData narrows
      // dgCloseEffortUnit: anything that is not 'kg'/'lbs' becomes undefined, which reads as
      // pounds (R5) — which is what every pre-S153B block is.
      wt: d.sarWt,
      closeUnit: d.sarCloseUnit === 'kg' ? 'kg' : d.sarCloseUnit === 'lbs' ? 'lbs' : undefined,
      closeDt: d.sarCloseDt || undefined, note: d.sarNote || undefined },
    ...extraSars,
  ];
}

// True when EVERY SAR block carries its own close stamp. Block 1 is always in the reader's
// list, so this is never vacuously true — an unstamped block 1 keeps the group open.
export function sarBlocksAllClosed(d: Record<string, string | undefined>): boolean {
  return sarBlocksFromData(d).every(b => !!b.closeDt);
}

// S135 Phase 2: the close-all-visibility / toggle-lockout predicates, single-sourced so the
// UI and the tests read the same rule. A block counts as closed by its own stamp OR by the
// legacy card-level dgCloseSar, which closed every block at once — so a legacy-closed log
// has nothing open and at least one thing closed.
export function sarBlocksAnyClosed(d: Record<string, string | undefined>): boolean {
  return !!d.dgCloseSar || sarBlocksFromData(d).some(b => !!b.closeDt);
}
export function sarBlocksAnyOpen(d: Record<string, string | undefined>): boolean {
  return !d.dgCloseSar && sarBlocksFromData(d).some(b => !b.closeDt);
}

// S135 Phase 2: stamp every still-open SAR block with `stamp` — block 1 via the flat
// sarCloseDt (kept if already set, never restamped), blocks 2+ via stampOpenRows (same
// skip-never-restamp rule). ONE definition for both writers (the SAR card's close-all and
// the form-level Close & Save All), mirroring stampOpenRows for bait/bycatch.
export function stampOpenSarBlocks(
  sarCloseDt: string | undefined,
  extraSarsJson: string | undefined,
  stamp: string,
): { sarCloseDt: string; extraSars: string } {
  return {
    sarCloseDt: sarCloseDt || stamp,
    extraSars: stampOpenRows(extraSarsJson, stamp),
  };
}

// S136 Phase 1: THE one reader that synthesizes the uniform effort list, mirroring
// sarBlocksFromData. Effort 1 is synthesized first from the legacy flat keys — including
// its trap groups (the legacy top-level detail fields as group 1, then extraEffortDetails),
// which until S136 the generator synthesized locally — then efforts 2+ from
// data.extraEffortNodes. The emit, the send guard and the close-all all read THIS list, so
// they cannot disagree about what an "effort" is. Effort 1's note is NOT here (it lives in
// log.remarks, which `d` cannot see) — the generator branches on index 0 for notes.
export function effortsFromData(d: Record<string, string | undefined>): ExtraEffortNode[] {
  let extraDetails: ExtraEffortDetail[] = [];
  try {
    const parsed = JSON.parse(d.extraEffortDetails || '[]');
    if (Array.isArray(parsed)) extraDetails = parsed;
  } catch { /* noop */ }
  let extraNodes: ExtraEffortNode[] = [];
  try {
    const parsed = JSON.parse(d.extraEffortNodes || '[]');
    if (Array.isArray(parsed)) extraNodes = parsed;
  } catch { /* noop */ }
  return [
    {
      haulStartDate: d.haulStartDate, haulStartTime: d.timeStartedHauling,
      haulEndDate: d.haulEndDate, haulEndTime: d.timeStoppedHauling,
      fmaId: d.fmaId,
      // S136 Phase 3 (ruling 5): effort 1's licence can be edited on the card; the override
      // rides the flat d.licNo key (absent on every pre-S136 log → profile licence, the
      // legacy behavior, byte-identical).
      licNo: d.licNo || undefined,
      sarYes: d.sarYes, mmYes: d.mmYes,
      gearSubtypeId: d.gearSubtypeId,
      closeDt: d.dgCloseEffort || undefined,
      // S153 Phase 3: effort 1's unit tag lives in the flat key, exactly as its stamp does.
      // Synthesized here so the EMIT can read ef.closeUnit uniformly for every effort and
      // never has to know that effort 1 is the legacy shape. Left undefined when absent, so
      // "untagged" stays distinguishable from "tagged lbs" — both read as pounds (R5).
      closeUnit: d.dgCloseEffortUnit === 'kg' ? 'kg' : d.dgCloseEffortUnit === 'lbs' ? 'lbs' : undefined,
      details: [
        {
          lgridCodeId: d.lgridCodeId, gridId: d.gridId, statSectId: d.statSectId,
          catchWeight: d.catchWeight, trapHauls: d.trapHauls, soakDuration: d.soakDuration,
          gpsLat: d.gpsLat, gpsLng: d.gpsLng, gpsSrc: d.gpsSrc, trapSize: d.trapSize,
          nbSpcmnKept: d.nbSpcmnKept, nbSpcmnDisc: d.nbSpcmnDisc, nbSpcmnBrd: d.nbSpcmnBrd,
          vNotchCount: d.vNotchCount, nbVntchYou: d.nbVntchYou,
        },
        ...extraDetails,
      ],
    },
    ...extraNodes,
  ];
}

// True when EVERY effort carries its own close stamp (effort 1's = the legacy
// dgCloseEffort). Effort 1 is always in the reader's list, so this is never vacuously true.
export function effortsAllClosed(d: Record<string, string | undefined>): boolean {
  return effortsFromData(d).every(e => !!e.closeDt);
}

export function effortsAnyOpen(d: Record<string, string | undefined>): boolean {
  return effortsFromData(d).some(e => !e.closeDt);
}

// S136 Phase 4 extraction (ruled): the toggle-refusal predicates live HERE, single-sourced
// the way sarBlocksAnyClosed was in S135 — the component calls them, it does not own the
// logic. All three read the ONE effort reader, so the refusals and the emit can never
// disagree about what an "effort" is.

// True when ANY effort carries a close stamp (effort 1's = the flat dgCloseEffort, via the
// reader). This is the "Did you haul gear?" No-refusal condition (§4.2 ruling): a closed
// effort is irreversible (§5.2.1), so the wipe must be refused. NOTE: anyClosed is NOT
// !effortsAnyOpen — with two efforts one closed and one open, both are true.
export function effortsAnyClosed(d: Record<string, string | undefined>): boolean {
  return effortsFromData(d).some(e => !!e.closeDt);
}

// True when an effort OTHER than reader-index exceptIdx (0 = effort 1) answers SAR = Yes.
// While another effort says Yes, the trip-level SAR pool stays emitted, so this effort's
// flag may flip to No freely — no wipe, no refusal.
export function sarYesOnAnotherEffort(d: Record<string, string | undefined>, exceptIdx: number): boolean {
  return effortsFromData(d).some((e, i) => i !== exceptIdx && e.sarYes === 'true');
}

// The SAR flip-to-No refusal for the effort at reader-index exceptIdx: refused when this
// is the LAST effort answering Yes AND any SAR block is closed (own stamp or the legacy
// card stamp) — dropping the last Yes would take the closed, irreversible blocks out of
// the emit (the S128 hole). With another effort still Yes the pool stands and the flip is
// free; with only open blocks the wipe behaves as before.
export function sarNoToggleRefused(d: Record<string, string | undefined>, exceptIdx: number): boolean {
  return !sarYesOnAnotherEffort(d, exceptIdx) && sarBlocksAnyClosed(d);
}

// S140 P3 (design ruling 6): deleting a CLOSED fishing effort is refused inside the
// function itself, not only at the render-hidden trash icon — a future caller that skips
// the render gate can no longer launder a closed effort's stamp through the slide-up.
// uiIdx 0 = effort 1 (the flat dgCloseEffort stamp); 1+ = extraEffortNodes[uiIdx-1].
export function effortDeleteRefused(
  uiIdx: number,
  dgCloseEffort: string | undefined,
  extraEffortNodesJson: string | undefined,
): boolean {
  if (uiIdx === 0) return !!dgCloseEffort;
  try {
    const nodes = JSON.parse(extraEffortNodesJson || '[]') as Array<{ closeDt?: string }>;
    return !!nodes[uiIdx - 1]?.closeDt;
  } catch {
    return false;
  }
}

// --- S160: THE DELETE GATE (Standard v6.1, Appendix A.1.2) ---
// "Deletion prohibited: This data group is closed and has not yet been transmitted. Data must
// be transmitted before it can be destroyed." Destroying a whole log destroys every data group
// in it, so a log containing ANY closed group refuses. This is the ONE predicate the deleteLog
// guard and every Delete door read (S159 P6 pattern: the guard reads the same rule the button
// reads, never a second copy) — effortDeleteRefused above is the same idea one level down.
//
// STRICT BY RULING (Gate 0): any stamp anywhere refuses — including a stamp on a group the log
// no longer *uses* (an effortYes flipped to 'false' after dgCloseEffort was stamped). A.1.2
// keys on the group's STATUS, not on whether the current answers still emit it, and §5.2.1
// makes a closure irreversible. That is why this is NOT derived from usedDataGroupKeys.
//
// The card-level keys listed here are the flat stamps with no per-occurrence reader of their
// own. dgCloseEffort and dgCloseSar are deliberately ABSENT from the list: the effort and SAR
// readers below already fold them in (effort 1's stamp IS dgCloseEffort; the legacy dgCloseSar
// closed every block at once), and naming them twice would be a second copy of that rule.
// The legacy bait/bycatch card stamps ARE here: nothing writes them since S134, but a legacy
// log still carries them, and they must refuse even if its rows array is empty or unreadable.
const CARD_LEVEL_CLOSE_KEYS = [
  'dgCloseLanding', 'dgClosePconsPersonal', 'dgCloseTransfer',
  'dgCloseHlin', 'dgCloseHlout',
  'dgCloseBaitUsed', 'dgClosePconsBycatch',
] as const;

export function hasAnyClosedGroup(log: Pick<DfoLog, 'data'>): boolean {
  const d = log.data ?? {};
  return effortsAnyClosed(d)               // dgCloseEffort + every effort 2+ closeDt
      || sarBlocksAnyClosed(d)             // dgCloseSar + sarCloseDt + every extraSars closeDt
      || rowsAnyClosed(d.baitEntries)      // per-row bait closures (S134)
      || rowsAnyClosed(d.bycatchEntries)   // per-row bycatch closures (S134 P3)
      || CARD_LEVEL_CLOSE_KEYS.some(k => !!d[k]);
}

// --- S160 Phase 3/3B: THE decision, in ONE place ---
// Ruling A's sentence + A.1.2 + the dev flag: a thing that is SENT, or that contains anything
// CLOSED, offers no delete — and the dev flag is the only thing that puts it back. This is
// the ONE functional check site of DEV_ALLOW_DELETE_CLOSED (Phase 3B tightened Phase 2's
// "one check site in deleteLog" to "one check site, full stop" — deleteLog and both form
// guards and all five doors route through here). Per Phase 3B item 2: the decision is never
// re-written per form; only each form's field census differs (the adapters below).
export function destructionOffered(sent: boolean, anyClosed: boolean): boolean {
  return DEV_ALLOW_DELETE_CLOSED || (!sent && !anyClosed);
}

// 234 adapter — the three logbook Delete doors in DfoLogsListScreen render off this.
export function deleteOffered(log: Pick<DfoLog, 'data' | 'sentToDfo'>): boolean {
  return destructionOffered(log.sentToDfo === true, hasAnyClosedGroup(log));
}

// Form-entry adapter (222 = MM_INTER, 233 = REPORT — each a SINGLE data group, so its whole
// census is one closeDt). Structural fields only, the Form222LinkView precedent: importing
// the entry types here would close the dfoLogStorage → generators → dfoXmlGenerator cycle
// (the S90 clampCoord4 hazard class).
export function formEntryDeleteOffered(e: { sentToDfo?: boolean; closeDt?: string }): boolean {
  return destructionOffered(e.sentToDfo === true, !!e.closeDt);
}

// S160 Phase 4 (the effortDeleteRefused pattern, one level down): a row/block-level action —
// edit OR delete — is refused once the target carries its OWN closeDt or sits under the
// legacy card-level stamp. Pure and exported because FullDfoForm cannot render under jest:
// the five call sites (deleteBait, deleteBycatch, openBaitEdit, openBycatchEdit,
// removeSarBlock) are belt-and-braces BEHIND buttons the closed row never draws, so this
// function's tests are their only automated evidence. A missing row refuses too — acting on
// an index that resolves to nothing is never right.
// ⚠ DELIBERATELY NO DEV-FLAG OVERRIDE: this is §5.1 rule 6 irreversibility (defect-140
// territory, founder-ruled untouched at S159). The dev flag governs whole-LOG destruction
// for sim cleanup only; a flag arm here would be a second functional check site AND an
// unruled change to the closed-row lockout.
export function closedRowActionRefused(
  row: { closeDt?: string } | undefined,
  cardStamp: string | undefined,
): boolean {
  return !row || !!row.closeDt || !!cardStamp;
}

// S137 Phase 6: true when ANY effort answered marine-mammal Yes — effort 1's flat mmYes and
// the extras' node flags, through the ONE effort reader (the sarYes twin at the callers above).
export function mmYesOnAnyEffort(d: Record<string, string | undefined>): boolean {
  return effortsFromData(d).some(e => e.mmYes === 'true');
}

// S137 hail conformance (Rules 2024/2025): the hail groups are required when ANY effort
// fishes area 38b (28599) or area 41 (1595) — never effort 1's flat key alone. ONE
// definition for every gate (render, save, used-groups, emit); a second definition of this
// test is how the multi-effort hole existed.
export function fishesHailArea(d: Record<string, string | undefined>): boolean {
  return effortsFromData(d).some(e => Number(e.fmaId) === 28599 || Number(e.fmaId) === 1595);
}

// Rules 660/661 trigger (ETA_DT / TOT_WT_ONBRD): mandatory when any effort fishes 38b,
// entry blocked otherwise — 41 alone does NOT qualify.
export function fishes38b(d: Record<string, string | undefined>): boolean {
  return effortsFromData(d).some(e => Number(e.fmaId) === 28599);
}

// S137 Phase 6: a minimal structural view of a Form 222 entry. Deliberately NOT the
// Form222Entry type — importing it would close the cycle dfoLogStorage →
// dfoForm222Generator → dfoXmlGenerator → dfoLogStorage (the S90 clampCoord4 hazard class).
export interface Form222LinkView {
  interactInd: string;
  status?: string;
  sentToDfo?: boolean;
  closeDt?: string;
  lgbkNumRef?: string;
}

// S137 Phase 6: the logs that owe a marine-mammal declaration — the red-button condition
// (rulings R-D/R-E/R-F). A log owes when (a) any effort answered MM Yes, (b) it is closed
// (status 'complete' — sent logs are complete too, so they stay in), and (c) no QUALIFYING
// 222 names its lgbkUid. Qualifying = a Yes-declaration that is not a draft by the list's
// own S125 classification: sent, or complete with a real Close & Save stamp (closeDt) —
// pre-S125 sent records lack closeDt, which is why the sentToDfo arm exists. An N-entry
// never discharges (R-F), and deleting the qualifying 222 re-opens the debt because this
// is computed live from both stores (R-G).
export function logsOwingForm222<
  T extends { status?: DfoLogStatus; lgbkUid: string; data: Record<string, string | undefined> },
>(
  logs: T[],
  entries: Form222LinkView[],
): T[] {
  const cleared = new Set(
    entries
      .filter(e =>
        e.interactInd === 'Y' &&
        (e.sentToDfo === true || (e.status === 'complete' && !!e.closeDt)) &&
        !!e.lgbkNumRef)
      .map(e => e.lgbkNumRef as string),
  );
  return logs.filter(l =>
    l.status === 'complete' && mmYesOnAnyEffort(l.data) && !cleared.has(l.lgbkUid));
}

// Stamp every still-open effort with `stamp` — effort 1 via the flat dgCloseEffort (kept if
// already set, never restamped), efforts 2+ via their own closeDt (same skip rule). ONE
// definition for both writers (the per-card close-all and the form-level Close & Save All),
// mirroring stampOpenSarBlocks.
export function stampOpenEfforts(
  dgCloseEffort: string | undefined,
  extraEffortNodesJson: string | undefined,
  stamp: string,
): { dgCloseEffort: string; extraEffortNodes: string } {
  let nodes: ExtraEffortNode[] = [];
  try {
    const parsed = JSON.parse(extraEffortNodesJson || '[]');
    if (Array.isArray(parsed)) nodes = parsed;
  } catch { /* noop */ }
  return {
    dgCloseEffort: dgCloseEffort || stamp,
    extraEffortNodes: JSON.stringify(nodes.map(e => (e.closeDt ? e : { ...e, closeDt: stamp }))),
  };
}

// The send-path guard's refusal list: used groups whose data map carries NO real close stamp.
// Non-empty ⇒ the send must refuse and name these sections (loud, not lossy).
// S134: the row-based groups (bait; bycatch since Phase 3) are also satisfied by
// all-rows-closed — nothing writes their card keys any more (legacy logs only), so a log
// whose rows were each closed individually must not be refused.
// S135: SAR joins them — closed when the legacy card stamp exists OR every block from
// sarBlocksFromData carries its own stamp.
// S136: EFFORT closes PER OCCURRENCE — dgCloseEffort is effort 1's OWN stamp, not a
// card-level one, so the effort key is judged on the whole list: unclosed whenever ANY
// effort from effortsFromData lacks its stamp (a set dgCloseEffort no longer satisfies the
// guard while an effort 2+ is open). Single-effort legacy logs behave identically (their
// one effort's closeDt IS dgCloseEffort).
export function unclosedUsedGroupKeys(log: Pick<DfoLog, 'subformId' | 'data'>): string[] {
  return usedDataGroupKeys(dataGroupInputsFromLog(log)).filter(k => {
    if (k === 'dgCloseEffort') return !effortsAllClosed(log.data);
    return !log.data[k]
      && !(k === 'dgCloseBaitUsed' && rowsAllClosed(log.data.baitEntries))
      && !(k === 'dgClosePconsBycatch' && rowsAllClosed(log.data.bycatchEntries))
      && !(k === 'dgCloseSar' && sarBlocksAllClosed(log.data));
  });
}

// --- S128 Phase 1: per-section REM note lock (§5.2.1 irreversibility) ---
// Once a data group's DG_CLOSE_DT is stamped, NOTHING that group transmits can change —
// and that includes its REM note. This maps each LogRemarks note key to the data-group
// close key(s) whose stamp freezes it. A note is locked the moment ANY group it transmits
// into is closed (founder ruling S128: 'pcons' rides BOTH PCONS occurrences — Bycatch AND
// Personal Use — so either close freezes it). 'trip' has no close control (never locked)
// and is intentionally absent from the map.
// S134: 'bait' is absent too — bait notes are PER ROW now (each row's note rides the row,
// locked by that row's own close). The legacy card-level rem.bait has no edit surface any
// more (the bait card's Add-a-note affordance was removed), so it needs no lock entry.
// S134 Phase 3: 'pcons' is absent for the same reason — bycatch notes are per row, and the
// Interactions & Other header note affordance was removed. Personal Use gained its OWN note
// ('personalUse'), locked by the Personal Use close (it stays a single occurrence with a
// single card-level close).
// S142 (defect 44): neither 'bait' nor 'pcons' EMITS any more either — the generator
// fallbacks that read them are gone. Nothing writes them and nothing reads them; they need
// no lock entry because there is nothing left to lock.
// S135 Phase 2: 'sar' is absent too — SAR notes are PER BLOCK now (block 1's rides the flat
// sarNote key, blocks 2+ ride their extraSars item; each locks with its own block's close).
// The legacy shared rem.sar has no edit surface any more and still emits as the fallback.
export const NOTE_CLOSE_KEYS: Record<string, string[]> = {
  landing:     ['dgCloseLanding'],
  catch:       ['dgCloseEffort'],   // the Catch & Effort note writes catch+haul, all inside EFFORT
  haul:        ['dgCloseEffort'],   // (haul is written together with catch; same close group)
  personalUse: ['dgClosePconsPersonal'],
  transfer:    ['dgCloseTransfer'],
  hlin:        ['dgCloseHlin'],
  hlout:       ['dgCloseHlout'],
};

// True when the note for `noteKey` may no longer change because a group it transmits into
// is already closed. `closes` is the DG_CLOSE_DT stamp map (data-map keys → ISO stamp).
export function isNoteLocked(noteKey: string, closes: Record<string, string>): boolean {
  return (NOTE_CLOSE_KEYS[noteKey] ?? []).some(k => !!closes[k]);
}

// --- COMPLETION METER (S141 P4: table-driven) ---
// The old FULL_DFO_REQUIRED_FIELDS list (the close-all button's private authority) and both
// getCompletionPercent functions are RETIRED — the shared table (dfoRequirements.ts) is the
// one authority. The meter counts the table-MANDATORY fields for THIS log's own context
// (its region, each effort's own FMA, the landing, the answered toggles); a filled-but-
// invalid value does not count. 100% therefore means the bottom Close-&-Save-All button
// will accept the log — the bar and the button agree by construction.
//
// Per the R-C ruling, used-but-OPTIONAL groups never inflate the denominator: bait rows,
// bycatch rows and Personal Use add units only while something in them is actually MISSING
// (an incomplete legacy row keeps the bar honest without penalising a normal complete row),
// and a Yes on the bycatch question adds one unit until a row exists (the R-B footer check's
// meter twin).

// Required fields for the legacy Proposal form (9 text fields + bycatch array = 10 total).
// The proposal form is its own product surface (175 live users) — out of the DFO table's
// jurisdiction, so its list stays.
const PROPOSAL_REQUIRED_FIELDS = [
  'dateFished', 'departurePort', 'portLanded', 'crewRegistry',
  'gridNumber', 'catchWeight', 'trapHauls',
  'timeStartedHauling', 'timeStoppedHauling',
];

export interface CompletionDetails { filled: number; total: number; pct: number }

const crewCountFromJson = (json?: string): number => {
  try {
    const arr = JSON.parse(json || '[]');
    return Array.isArray(arr) ? arr.length : 0;
  } catch { return 0; }
};

const indFromStored = (v?: string): string => (v === 'true' ? 'Y' : v === 'false' ? 'N' : '');

export const getCompletionDetails = (log: DfoLog): CompletionDetails => {
  if (log.mode !== 'full') {
    // Legacy proposal meter, unchanged in behaviour.
    const data: Record<string, string> = { dateFished: log.dateFished, ...log.data };
    const filled = PROPOSAL_REQUIRED_FIELDS.filter(f => data[f] && data[f].trim() !== '').length;
    let arrayFilled = 0;
    try { if (JSON.parse(log.data.bycatchEntries || '[]').length > 0) arrayFilled++; } catch { /* noop */ }
    const total = PROPOSAL_REQUIRED_FIELDS.length + 1;
    return { filled: filled + arrayFilled, total, pct: Math.round(((filled + arrayFilled) / total) * 100) };
  }

  const d = log.data ?? {};
  const subformId = log.subformId ?? 90;
  const efforts = effortsFromData(d);
  const effortYes = d.effortYes !== 'false';
  const effortFmaIds = effortYes
    ? efforts.map(e => Number(e.fmaId)).filter(n => Number.isFinite(n) && n > 0)
    : [];
  const firstFma = effortFmaIds.length ? effortFmaIds[0] : null;
  const ctx: RequirementContext = { subformId, fmaId: firstFma, effortFmaIds };

  let filled = 0;
  let total = 0;
  const add = (p: { filled: number; total: number }) => { filled += p.filled; total += p.total; };
  // Missing-only units (see the R-C note above): count the gap, never the filled part.
  const addMissingOnly = (missingCount: number) => { total += missingCount; };

  // TRIP — dates/times, the region-gated departure port and crew, the bycatch toggle.
  const crewCount = crewCountFromJson(d.crewRegistry);
  add(containerProgress('trip', ctx, {
    startDt: log.dateFished || d.dateFished,
    // S147 Phase 1: sailDate rides alongside startDt (which stays bound to dateFished) — the
    // wire carries `sailDate || dateFished`. Threaded here in lockstep with the close doors:
    // containerProgress discounts an isInvalid field, so a meter given less than the door gets
    // would read 100% on a log the door refuses.
    sailDate: d.sailDate,
    sailTime: d.timeSailed,
    departurePort: d.departurePort,
    crewNb: crewCount > 0 ? String(crewCount) : '',
    bycatchAnswered: indFromStored(d.bycatchYes),
  }));

  // EFFORT(s) — each with its own FMA; effort-level fields once, group fields per trap group.
  if (effortYes) {
    efforts.forEach(e => {
      const eFma = Number(e.fmaId) || null;
      const eCtx: RequirementContext = { subformId, fmaId: eFma, effortFmaIds };
      const level: FieldValues = {
        fmaId: e.fmaId ?? '',
        haulStartTime: e.haulStartTime ?? '', haulEndTime: e.haulEndTime ?? '',
        // S147 Phase 1: each effort's own window dates + the fallback base, matching the
        // close doors and the emit (dfoXmlGenerator :274/:275).
        haulStartDate: e.haulStartDate ?? '', haulEndDate: e.haulEndDate ?? '',
        dateFished: log.dateFished || d.dateFished,
        // S147 Phase 3: the trip half, matching the close doors exactly — containerProgress
        // discounts an invalid field, so a meter given less than the door sees would read 100%
        // on a log the door refuses.
        sailDate: d.sailDate, sailTime: d.timeSailed,
        sarInd: indFromStored(e.sarYes), mmInterInd: indFromStored(e.mmYes),
        gearSubtypeId: e.gearSubtypeId ?? '',
      };
      const groups = (e.details?.length ? e.details : [{}]) as Record<string, string | undefined>[];
      groups.forEach((g, gi) => {
        const values: FieldValues = {
          ...level,
          catchWeight: g.catchWeight ?? '', trapHauls: g.trapHauls ?? '',
          soakDuration: g.soakDuration ?? '',
          gpsLat: g.gpsLat ?? '', gpsLng: g.gpsLng ?? '',
          gridId: g.gridId ?? '', lgridCodeId: g.lgridCodeId ?? '', statSectId: g.statSectId ?? '',
          vNotchCount: g.vNotchCount ?? '', nbVntchYou: g.nbVntchYou ?? '',
          nbSpcmnBrd: g.nbSpcmnBrd ?? '', nbSpcmnKept: g.nbSpcmnKept ?? '',
          trapSize: g.trapSize ?? '',
        };
        add(containerProgress('effort', eCtx, values,
          gi > 0 ? { skip: EFFORT_LEVEL_KEYS } : undefined));
      });
    });

    // SAR blocks — mandatory once any effort answered Yes.
    if (efforts.some(e => e.sarYes === 'true')) {
      sarBlocksFromData(d).forEach(b => {
        add(containerProgress('sar', ctx, {
          sarDate: b.date ?? '', sarTime: b.time ?? '', sarSpecies: b.species ?? '',
          sarNbSpcmn: b.nbSpcmn ?? '', sarCondId: b.condId ?? '',
          sarLat: b.lat ?? '', sarLng: b.lng ?? '',
        }));
      });
    }
  }

  // LANDING — port landed is mandatory on all four regions (the old list's known hole).
  // S147: the values here are the SAME set the Landing close door builds (landingValues() in
  // FullDfoForm). containerProgress discounts a field its isInvalid rejects, so any key the door
  // has and the meter lacks is a log the door refuses while the bar still reads 100%.
  const lastEnd = latestEffortEnd(efforts, log.dateFished || d.dateFished || '');
  add(containerProgress('landing', ctx, {
    // S147 Phase 1: landingDate + the fallback base beside the time (generator :98).
    portId: d.portLanded, landingTime: d.timeOfLanding,
    landingDate: d.landingDate, dateFished: log.dateFished || d.dateFished,
    sailDate: d.sailDate, sailTime: d.timeSailed,  // S147 Phase 3 — Rule 45
    // S147 Run 4 — Rule 46. Ungated on effortYes, exactly like the door: on a no-haul day the
    // haul times are blank, latestEffortEnd returns null, and the comparison is simply not made.
    lastEffortEndDate: lastEnd?.date ?? '', lastEffortEndTime: lastEnd?.time ?? '',
  }));

  // HAIL — only when the logbook must carry the groups (MAR with a 38b/41 effort).
  if (requiredGroups(ctx).includes('hlin')) {
    add(containerProgress('hlin', ctx, {
      hlinCompany: d.hlinCompany, hlinConfirmNo: d.hlinConfirmNo,
      hlinEta: d.hlinEta, hlinTotalWeight: d.hlinTotalWeight,
    }));
    add(containerProgress('hlout', ctx, {
      hloutCompany: d.hloutCompany, hloutConfirmNo: d.hloutConfirmNo,
    }));
  }

  // TRANSFER (QC 88) — counted only when a transfer is being recorded; the carrier VRN
  // alone is counted whenever the carrier question is Yes (it is mandatory regardless of
  // whether a transfer rides the trip — Rule 642).
  const transferValues: FieldValues = {
    // S147 Phase 5a: the fifth companion date completes the Phase 1 threading — the meter reads
    // the same pair the close doors do, so it cannot count a field the door would refuse.
    transferTime: d.transferTime, transferDate: d.transferDate,
    dateFished: log.dateFished || d.dateFished,
    sailDate: d.sailDate, sailTime: d.timeSailed,  // S147 Phase 3 — Rule 248
    transferWt: d.transferWt,
    // S154D (feed site F3 of three): the SOURCE pair and both vessel names. The meter counts
    // the FROM pair as one mandatory unit exactly like the TO pair, so omitting these keys
    // here would raise the denominator and never the numerator — a QC transfer that the close
    // door accepts would sit forever at 95%. This was caught by completionMeter's own test,
    // which is the only reason a missed feed is visible at all: the other two feeds are inside
    // a React component and no test in this repo can see them.
    transferFromVrn: d.transferFromVrn, transferFromPndNum: d.transferFromPndNum,
    transferFromVname: d.transferFromVname, transferToVname: d.transferToVname,
    transferToVrn: d.transferToVrn, transferToPndNum: d.transferToPndNum,
    carrierVrn: d.carrierVrn, useCrInd: d.useCrInd,
  };
  if (subformId === 88) {
    if (d.transferYes === 'true') {
      add(containerProgress('transfer', ctx, transferValues));
    } else if (d.useCrInd === 'Y') {
      add(containerProgress('transfer', ctx, transferValues, { only: new Set(['carrierVrn']) }));
    }
  }

  // Bycatch Yes with no rows yet: one open unit (the footer refuses this — R-B).
  let bycatchRows: Record<string, string | undefined>[] = [];
  try {
    const parsed = JSON.parse(d.bycatchEntries || '[]');
    if (Array.isArray(parsed)) bycatchRows = parsed;
  } catch { /* noop */ }
  if (d.bycatchYes === 'true' && bycatchRows.length === 0) addMissingOnly(1);

  // Row-based optional groups: only what is MISSING counts (see the R-C note above).
  bycatchRows.forEach(r => {
    // S158 (R3): specieSzId added — the meter counts what the close door counts. Leaving it out
    // would show a Gulf log at 100% while a row still refuses to close.
    const p = containerProgress('bycatchRow', ctx, {
      species: r.species ?? '', lbs: r.lbs ?? '', usage: r.usage ?? '',
      specieSzId: r.specieSzId ?? '',
    });
    addMissingOnly(p.total - p.filled);
  });
  let baitRows: Record<string, string | undefined>[] = [];
  try {
    const parsed = JSON.parse(d.baitEntries || '[]');
    if (Array.isArray(parsed)) baitRows = parsed;
  } catch { /* noop */ }
  baitRows.forEach(r => {
    // The bait-condition formula keys on the row's bait-type codeId; resolve it from the
    // stored label the same way the footer does.
    const codeId = getDfoBaitTypeList(subformId).find(b => b.label === r.type)?.codeId ?? 0;
    const p = containerProgress('baitRow', ctx, {
      type: r.type ?? '', lbs: r.lbs ?? '',
      condition: r.condition != null ? String(r.condition) : '',
      baitTypeCodeId: String(codeId),
      // S159 (R4): the meter counts what the close door counts (the S158 R3 principle) —
      // an Other(814) row's blank note must show as missing, not as 100%.
      note: r.note ?? '',
    });
    addMissingOnly(p.total - p.filled);
  });

  const pct = total === 0 ? 100 : Math.round((filled / total) * 100);
  return { filled, total, pct };
};

// --- LAST LOG HELPER ---

// Returns the single most recent completed log (any form type),
// used to pre-fill crew and ports on a new log.
export const loadLastLog = async (): Promise<DfoLog | null> => {
  const all = await loadAllLogs(); // already sorted newest first
  return all.find(l => l.status === 'complete') ?? null;
};

// --- TRANSMISSION REGISTER (DFO Standard: 3-year retention) ---

const THREE_YEARS_MS = 94608000000;

export interface TransmissionRecord {
  id: string;           // same as the DfoLog id it belongs to
  logId: string;        // DfoLog.id
  attemptedAt: number;  // Date.now()
  outcome: 'success' | 'failure';
  httpStatus?: number;  // HTTP status code if available
  errorMessage?: string;
  fileName?: string;    // transmitted XML file name (Standard v6.1 §13.3.1)
  confNumber?: string;  // <CONF> from WS_RESP, when the service returned one
  xmlSnapshot: string;  // the full XML string that was sent
  soapSnapshot: string; // the full SOAP envelope that was sent
  // §13.3.1 register snapshot — point-in-time values captured at send (Session 60).
  // These are NOT re-derived at display time: they record what was true when sent.
  vrn?: string;         // vessel registration number (captainProfile.vesselNumber at send)
  tripNum?: number;     // DfoLog.tripNum at send (Rule 48 sequential trip number)
  xsdValid?: boolean;   // result of validateElogXml() run before the POST
  wsErrCode?: string;   // parsed WS_RESP <ERR> (e.g. 'WS0000' on success)
  kind?: 'logbook' | 'form222' | 'form233';  // discriminator for Scope B register display
  // S148 R-F: WHY the send failed, as a language-neutral marker — never a translated sentence.
  // A stored sentence is frozen in whatever language it was written in for the three years the
  // record is retained; this marker is translated at the render site instead, so the badge and
  // the Transmission Result sheet follow a mid-session language change. Absent on success, and
  // absent on every record written before S148 — those fall back to their stored errorMessage.
  failureKind?: SendFailureKind;
}

// S148 R-F / R-D. Four markers for the five ways a send can fail: conditions 1 (HTTP 4xx/5xx) and
// 3 (SOAP_FAULT / NO_CONF / NO_WS_RESP) deliberately share 'unclear', because the harvester's next
// move is the same in both — wait, tap Retry — and a distinction he cannot act on is noise on a wet
// deck. The technical difference between them still shows in full in errorMessage, the raw row.
// 'timeout' and 'notSent' are the two markers 9afeadd already ships in the logbook card's in-memory
// failedSends state; reused verbatim so the app has ONE vocabulary for this, not two.
export type SendFailureKind =
  | 'refused'   // DFO answered and rejected it     (condition 2)
  | 'unclear'   // DFO answered but we can't read the answer, or the server errored (1 and 3)
  | 'timeout'   // our own 30-second AbortController fired (condition 4)
  | 'notSent';  // the request never left the phone  (condition 5)

// S148 R-F — marker to i18n KEY NAME, never to text. Storage stays translation-free (the S61
// isProfileComplete precedent: hand back key names, let the screen call t()). Both the badge and
// the Transmission Result sheet read the SAME stored marker through these two maps, which is what
// guarantees they can differ in how much they say but never in what they say happened.
export const SEND_FAILURE_BADGE_KEY: Record<SendFailureKind, string> = {
  refused: 'logs.sendFailedRefused',
  unclear: 'logs.sendFailedUnclear',
  timeout: 'logs.sendFailedTimeout',
  notSent: 'logs.sendFailedNotSent',
};

export const SEND_FAILURE_SHEET_KEY: Record<SendFailureKind, string> = {
  refused: 'logs.sheetFailedRefused',
  unclear: 'logs.sheetFailedUnclear',
  timeout: 'logs.sheetFailedTimeout',
  notSent: 'logs.sheetFailedNotSent',
};

// True only for a marker this app actually wrote. Records written before S148 carry no marker at
// all, and they must still render sensibly — they fall back to their stored errorMessage (R-E), so
// nothing on a historical record can come out blank.
export const isSendFailureKind = (v: unknown): v is SendFailureKind =>
  v === 'refused' || v === 'unclear' || v === 'timeout' || v === 'notSent';

export async function saveTransmissionRecord(record: TransmissionRecord): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(dfoKey(DFO_STORE_BASES.transmission_register));
    const existing: TransmissionRecord[] = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - THREE_YEARS_MS;
    const pruned = existing.filter(r => r.attemptedAt >= cutoff);
    pruned.push(record);
    await AsyncStorage.setItem(dfoKey(DFO_STORE_BASES.transmission_register), JSON.stringify(pruned));
  } catch (err) {
    console.error('Failed to save transmission record:', err);
  }
}

export async function loadTransmissionRegister(): Promise<TransmissionRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(dfoKey(DFO_STORE_BASES.transmission_register));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function transmissionKind(
  record: Pick<TransmissionRecord, 'kind' | 'logId'>
): 'logbook' | 'form222' | 'form233' {
  // Prefer the explicit kind field when present (new records stamp it).
  if (record.kind) return record.kind;
  // Fall back to the logId prefix so pre-existing records (e.g. the S70
  // live 222/233 sends) classify with no migration / no re-send.
  if (record.logId.startsWith('FORM222-')) return 'form222';
  if (record.logId.startsWith('FORM233-')) return 'form233';
  return 'logbook';
}

// --- XML ARCHIVE (DFO Standard: 3-year retention) ---

export interface XmlArchiveEntry {
  logId: string;
  savedAt: number;  // Date.now()
  xml: string;      // full XML string (not SOAP wrapped)
}

export async function saveXmlArchiveEntry(entry: XmlArchiveEntry): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(dfoKey(DFO_STORE_BASES.xml_archive));
    const existing: XmlArchiveEntry[] = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - THREE_YEARS_MS;
    const pruned = existing.filter(e => e.logId !== entry.logId && e.savedAt >= cutoff);
    pruned.push(entry);
    await AsyncStorage.setItem(dfoKey(DFO_STORE_BASES.xml_archive), JSON.stringify(pruned));
  } catch (err) {
    console.error('Failed to save XML archive entry:', err);
  }
}

export async function loadXmlArchive(): Promise<XmlArchiveEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(dfoKey(DFO_STORE_BASES.xml_archive));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}