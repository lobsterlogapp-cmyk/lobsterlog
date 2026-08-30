// DFO ELOG XML Generator — conforms to DFO Standard v6.1
// No correction/amendment mechanism (Session 48 decision): every transmission is a new
// completed log, read-only after sending.
// All weights in kg. Dates: XSD date_12 = YYYYMMDDHHMM, date_14 = YYYYMMDDHHMMSS (UTC,
// digits only). Flat ISO-8601 fields still inside TRIP are S2/S3 scope.

import forge from 'node-forge';
import { DfoLog, ExtraSarDetail, ExtraEffortNode, sarBlocksFromData, effortsFromData, fishesHailArea, storedWeightUnit, LBS_PER_KG } from './dfoLogStorage';
import type { WeightUnit } from './dfoLogStorage';
import { CaptainProfile } from './captainStorage';
import { getDfoBaitTypeList, baitConditionState, getDfoPconsSpeciesList, DFO_SPECIE_FRM_ID, DFO_PCONS_OTHER_SIZE_ID, DFO_GEAR_ID, DFO_SOFT_VER, DFO_CIE_ID, DFO_FORM_VER_ID, DFO_HLIN_COMPANY_LIST, DFO_HLOUT_COMPANY_LIST, DFO_FMA_HLIN_REQUIRED, DFO_FMA_LGRID_REQUIRED, DFO_SUBFORM_REGISTRY, DFO_FMA_38B, DFO_FMA_NB_VNTCH, DFO_FMA_NB_VNTCH_YOU, DFO_FMA_STAT_SECT_REQUIRED, DFO_STAT_SECT_BY_FMA, DFO_FMA_GRID_MAP, DFO_GRID_BLOCKED_FMA, clampCoord4, effortCoordsEntryAllowed } from './dfoConstants';
import { MV_PARTNERSHIP_TYPE, MV_GRID } from '../data/reftables';

export function generateReportUid(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let uid = '';
  for (let i = 0; i < 6; i++) {
    uid += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return uid;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Combines dateFished (YYYY-MM-DD) and a HH:MM time into a UTC ISO 8601 string,
// treating the inputs as device-local time. A blank/whitespace time returns '' (NOT a
// midnight default), so the absence surfaces structurally — tag() drops the element and
// the min:1 checks fire — instead of being laundered into junk 00:00 (Session 76).
function localToUtcIso(dateStr: string, timeStr: string): string {
  if (!dateStr) return '';
  const [y, mo, d] = dateStr.split('-').map(Number);
  if (isNaN(y) || isNaN(mo) || isNaN(d)) return '';
  if (!timeStr || !timeStr.trim()) return '';
  const parts = timeStr.split(':').map(Number);
  const h = isNaN(parts[0]) ? 0 : parts[0];
  const mi = isNaN(parts[1]) ? 0 : parts[1];
  return new Date(y, mo - 1, d, h, mi, 0, 0).toISOString();
}

// allowZero: a typed 0 is a declarable quantity ONLY where a rule says so. Five callers
// pass it: CATCH.KEPT_WT (Rule 2020 zero-catch + Rules 630/631, S120) and — per Rule 789
// (FS234.txt:365-377), which says a declared 0 must survive and a blank must never be read
// as a 0 — BAIT_USED.BT_WT, both PCONS.WT sites and TRANSFER_DTL.WT (S152A). The DEFAULT
// STAYS false: HLIN.TOT_WT_ONBRD is deliberately NOT in Rule 789's element list and keeps
// it, so a 0 still suppresses that element. See docs/GATE_S152A_RULE_789_ZERO.md.
// S153 Phase 3: the unit is no longer the LIVE toggle — it is the unit the value was CLOSED
// and STORED in (R1/R2), read from that group's own tag. A value already in kilograms is
// emitted as-is; only a pounds value is divided. DOUBLE CONVERSION is the failure mode this
// signature exists to prevent: passing a boolean off captainProfile.units, as this function
// did until S153, would re-divide a number Phase 2 had already converted.
// UNTAGGED reads as pounds (R5, via storedWeightUnit at the call sites) — which is exactly
// what the pre-S153 emit did for a log stored under an lbs profile, so those bytes do not move.
// The arithmetic and the rounding are unchanged; only the source of the decision moved.
function kgStr(value: string, storedUnit: WeightUnit, allowZero: boolean = false): string {
  const n = parseFloat(value);
  if (isNaN(n) || (allowZero ? n < 0 : n <= 0)) return '';
  return (storedUnit === 'lbs' ? n / LBS_PER_KG : n).toFixed(2);
}

function tag(name: string, value: string, indent: string = '  '): string {
  if (!value || !value.trim()) return '';
  return `${indent}<${name}>${xmlEscape(value.trim())}</${name}>\n`;
}

// XSD date_14 = YYYYMMDDHHMMSS (UTC, digits only)
export function toCloseTimestamp(isoStr?: string): string {
  const dt = isoStr ? new Date(isoStr) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}` +
         `${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}${pad(dt.getUTCSeconds())}`;
}

// XSD date_12 = YYYYMMDDHHMM (UTC, digits only — no '-'/'T'/':'/'Z'/ms)
function toDate12(isoStr: string): string {
  if (!isoStr) return '';
  const dt = new Date(isoStr);
  if (isNaN(dt.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}` +
         `${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}`;
}

export function generateElogXml(log: DfoLog, captainProfile: CaptainProfile): string {
  const d = log.data;
  // Per-section REM notes (T1). Grouped at the human-section level; some keys fan out to
  // several XSD nodes (haul → EFFORT/EFFORT_BY_GEAR/EFFORT_DETAIL; transfer → TRANSFER/
  // TRANSFER_DTL). tag() drops empty/blank values, so an absent note emits NOTHING — this
  // keeps the mandatory-only (T2) output byte-identical when no remarks are present.
  // S142 (defect 44): rem.bait and rem.pcons are RETIRED and are read NOWHERE below. Bait
  // and bycatch notes ride their own rows (S134) and Personal Use has its own key; a row or
  // a card with no note of its own now emits no REM rather than borrowing a retired one.
  const rem = log.remarks ?? {};
  // S153 Phase 3: captainProfile.units is NO LONGER read here. The live toggle decides what an
  // OPEN section does (R3/R8); what a CLOSED section emits is decided by that group's own tag,
  // read at each site below. A log cannot be sent with a used group still open (the send guard
  // refuses), so every weight reaching this generator is closed and therefore tagged — or is a
  // pre-S153 log with no tag, which reads as pounds (R5).
  const subformId = log.subformId ?? 90;
  const regId = log.regId ?? 1004;

  // Multi-day trips (S90): each timestamp uses its OWN date so a trip can span midnight.
  // The per-field date falls back to log.dateFished when absent — old (pre-S90) logs,
  // quick-capture (time set, date never picked), and same-day trips all resolve to the
  // trip's nominal date, so existing single-day logs emit byte-identically.
  const startDt     = localToUtcIso(d.sailDate || log.dateFished, d.timeSailed);
  const landDt      = localToUtcIso(d.landingDate || log.dateFished, d.timeOfLanding);

  let crewNb = '';
  try {
    const crew = JSON.parse(d.crewRegistry || '[]');
    if (Array.isArray(crew) && crew.length > 0) crewNb = String(crew.length);
  } catch { /* noop */ }

  // S136 multi-effort: uniform per-EFFORT view via THE one reader (effortsFromData,
  // dfoLogStorage — mirrors sarBlocksFromData). Effort 1 is synthesized from the legacy
  // flat d.* keys — including its trap groups (the S121 block-1 synthesis moved into the
  // reader) — so every pre-S136 log and every single-effort log emits byte-identically;
  // efforts 2+ come from the additive d.extraEffortNodes JSON array. XSD allows EFFORT
  // 0..unbounded per TRIP (Rule 1050); EFFORT_DETAIL 1..9999 per EFFORT_BY_GEAR.
  const efforts: ExtraEffortNode[] = effortsFromData(d);

  // BAIT_USED — XSD bait_used_type: BT_TYP_ID, BT_WT, BT_COND_ID?, DG_CLOSE_DT, REM?
  // One repeating <BAIT_USED> node per bait entry.
  let baitXml = '';
  try {
    const baitList = getDfoBaitTypeList(subformId);
    // S134: rows may carry their OWN closeDt/note (per-occurrence closure, §5 — DFO ruling
    // Aug 17). The STAMP still falls back to the card-level dgCloseBaitUsed for legacy rows
    // without their own. The NOTE does not — see the REM line below.
    // S153: closeUnit is the unit this row's lbs was CONVERTED AND STORED in at its own close.
    const entries: { type: string; lbs: string; condition?: number; closeDt?: string; closeUnit?: WeightUnit; note?: string }[] = JSON.parse(d.baitEntries || '[]');
    // S125 Phase 9: DG_CLOSE_DT ONLY from a real stored stamp — no now() fallback. Absent → tag()
    // drops the element (used-but-unclosed is refused before the send by unclosedUsedGroupKeys).
    const baitCloseDt = d.dgCloseBaitUsed ? toCloseTimestamp(d.dgCloseBaitUsed) : '';
    baitXml = entries.map(e => {
      const match = baitList.find(b => b.label === e.type);
      const typeCode = match ? String(match.codeId) : '0';
      // Rule 789: a typed 0 is a declared quantity. Without allowZero it returned '' and the
      // guard below deleted the whole BAIT_USED row — type, condition, close stamp and note.
      const wtKg = kgStr(e.lbs, storedWeightUnit(e.closeUnit), true);
      if (!wtKg) return '';
      // BT_COND_ID: conditional per bait type/region (Item 13, Rules 3060 MAR / 984 QC-GLF /
      // NL-block). Emit only where the rule makes condition mandatory AND a value was captured;
      // tag() drop-empty keeps the blocked case absent (T2-safe). codeId resolved as for BT_TYP_ID.
      const condMandatory = baitConditionState(subformId, match ? match.codeId : 0) === 'mandatory';
      const condStr = condMandatory && e.condition != null ? String(e.condition) : '';
      return `    <BAIT_USED>\n` +
             tag('BT_TYP_ID',   typeCode, '      ') +
             tag('BT_WT',       wtKg, '      ') +
             tag('BT_COND_ID',  condStr, '      ') +
             tag('DG_CLOSE_DT', e.closeDt ? toCloseTimestamp(e.closeDt) : baitCloseDt, '      ') +
             // S142 (defect 44): the row's OWN note, or nothing. The old `|| rem.bait`
             // fallback is REMOVED — rem.bait is retired (no edit box since S134), so it
             // could only ever speak for a note box the harvester had left empty. Do not
             // restore it: nothing should fill a remark slot from a value no screen owns.
             tag('REM',         e.note ?? '', '      ') +
             `    </BAIT_USED>\n`;
    }).join('');
  } catch { /* noop */ }

  let pconsXml = '';
  try {
    const pconsList = getDfoPconsSpeciesList(subformId);
    // S134 Phase 3: bycatch rows may carry their OWN closeDt/note (per-occurrence closure,
    // §5 — the bait pattern). The STAMP still falls back to the card-level
    // dgClosePconsBycatch for legacy rows without their own. The NOTE does not — see the
    // REM lines below.
    // S153: closeUnit as on the bait row above.
    const bycatch: { species: string; lbs: string; usage?: string; closeDt?: string; closeUnit?: WeightUnit; note?: string }[] = JSON.parse(d.bycatchEntries || '[]');
    // S124 Phase 2: PCONS closes per occurrence — one for the bycatch block, one for personal
    // use (Rule 1505, §5.2.1). S125 Phase 9: each DG_CLOSE_DT comes ONLY from its real stored
    // stamp — no now() fallback (the legacy shared `dgClosePcons` fallback is gone). Absent → the
    // conditional emit below omits the element (used-but-unclosed is refused before the send).
    const bycatchClose = d.dgClosePconsBycatch ? toCloseTimestamp(d.dgClosePconsBycatch) : '';
    const personalClose = d.dgClosePconsPersonal ? toCloseTimestamp(d.dgClosePconsPersonal) : '';
    const parts: string[] = [];

    for (const e of bycatch) {
      const match = pconsList.find(p => p.label === e.species);
      const specieId = match ? String(match.codeId) : '0';
      // Rule 789: a typed 0 is a declared quantity. Without allowZero the guard below
      // dropped the whole bycatch PCONS row — species, size, usage, close stamp and note.
      const wt = kgStr(e.lbs, storedWeightUnit(e.closeUnit), true);
      if (!wt) continue;
      const szId = specieId === '1312' ? '826' : String(DFO_PCONS_OTHER_SIZE_ID);
      // SPECIE_SZ_ID: Mandatory for GLF(89) ONLY; Blocked for QC(88)/MAR(90)/NL(91) per
      // Subforms_requirements_234.xlsx row 56 (Session 59 recon — the sheet is stricter
      // than the XSD, which lists it optional). Overturns the earlier 88/89/91-emit
      // resolution. Lobster 826 / non-lobster 10670 value logic unchanged for the 89 case.
      const szLine = subformId === 89 ? `      <SPECIE_SZ_ID>${szId}</SPECIE_SZ_ID>\n` : '';
      const usgLine = subformId === 90 && e.usage ? `      <USG_ID>${xmlEscape(e.usage)}</USG_ID>\n` : '';
      // S134 Phase 3: the row's own stamp wins; the card-level stamp is the fallback.
      const rowClose = e.closeDt ? toCloseTimestamp(e.closeDt) : bycatchClose;
      parts.push(
        `    <PCONS>\n` +
        `      <SPECIE_ID>${xmlEscape(specieId)}</SPECIE_ID>\n` +
        `      <SPECIE_FRM_ID>${DFO_SPECIE_FRM_ID}</SPECIE_FRM_ID>\n` +
        szLine +
        `      <WT>${wt}</WT>\n` +
        usgLine +
        (rowClose ? `      <DG_CLOSE_DT>${rowClose}</DG_CLOSE_DT>\n` : '') +
        // S142 (defect 44): the row's OWN note, or nothing. The old `|| rem.pcons` fallback
        // is REMOVED — rem.pcons is retired (no edit box since S134 Phase 3). Do not
        // restore it: nothing should fill a remark slot from a value no screen owns.
        tag('REM', e.note ?? '', '      ') +
        `    </PCONS>\n`
      );
    }

    // S134: personal-use PCONS is MAR(90)-ONLY — its hardcoded USG_ID (37822) is Blocked on
    // 88/89/91 (Subforms_requirements_234.xlsx row 58), so the whole node is withheld there.
    // A stored value on a blocked subform is ignored on read, never cleared (ruling D3).
    // Rule 789: a typed 0 is a declared quantity. Without allowZero the gate below withheld
    // the whole personal-use PCONS node, including its own note.
    const personalUseWt = kgStr(d.personalUse ?? '', storedWeightUnit(d.dgClosePconsPersonalUnit), true);
    if (subformId === 90 && personalUseWt) {
      // No SPECIE_SZ_ID here: it is GLF(89)-only (row 56) and this node is now MAR(90)-only,
      // so the old 89 szLine became unreachable and was removed (S134; '' on 90 before).
      parts.push(
        `    <PCONS>\n` +
        `      <SPECIE_ID>1312</SPECIE_ID>\n` +
        `      <SPECIE_FRM_ID>${DFO_SPECIE_FRM_ID}</SPECIE_FRM_ID>\n` +
        `      <WT>${personalUseWt}</WT>\n` +
        `      <USG_ID>37822</USG_ID>\n` +
        (personalClose ? `      <DG_CLOSE_DT>${personalClose}</DG_CLOSE_DT>\n` : '') +
        // S134 Phase 3 (B4): Personal Use has its OWN note.
        // S142 (defect 44): the old `|| rem.pcons` fallback is REMOVED. It was putting the
        // retired Interactions/bycatch note into the Personal Use record on any log that
        // carried one — two such files were already sent. Personal Use now transmits its own
        // note or nothing at all. Do not restore the fallback.
        tag('REM', rem.personalUse ?? '', '      ') +
        `    </PCONS>\n`
      );
    }

    pconsXml = parts.join('');
  } catch { /* noop */ }

  // Y/N indicators are per-EFFORT (S136): 'true'/'false' → Y/N, anything else (unanswered)
  // → '' so tag() drops the element and the validator blocks the send upstream.
  const indYN = (v?: string) => (v === 'true' ? 'Y' : (v === 'false' ? 'N' : ''));
  // LOST_GEAR_IND de-emitted in 234.12 (maxOccurs 1→0, Blocked) — no longer derived.

  // GENERAL_INFO — XSD general_info_type xs:sequence:
  //   CIE_ID, SOFT_VER, REG_ID, FIN, VRN, FORM_VER_ID, SUBFORM_ID
  let generalInfo = '';
  generalInfo += tag('CIE_ID',      DFO_CIE_ID, '    ');
  generalInfo += tag('SOFT_VER',    DFO_SOFT_VER, '    ');
  generalInfo += tag('REG_ID',      String(regId), '    ');
  generalInfo += tag('FIN',         captainProfile.licenceHolderFin, '    ');
  generalInfo += tag('VRN',         captainProfile.vesselNumber, '    ');
  generalInfo += tag('FORM_VER_ID', String(DFO_FORM_VER_ID), '    ');
  generalInfo += tag('SUBFORM_ID',  String(subformId), '    ');

  // TRIP — XSD trip_type xs:sequence (scalar members):
  //   TRIP_NUM, OPER_NAME, START_DT, CREW_NB?, PORT_ID?, OBS_TRIP_NUM?, FIRST_ENTRY_DT,
  //   USE_CR_IND?, PRTNSHP_ID?, LGBK_UID, REM?
  let trip = '';
  // TRIP_NUM: Rule 48 — sequential per vessel trip, allocated at log creation
  trip += tag('TRIP_NUM',  String(log.tripNum ?? 1), '    ');
  trip += tag('OPER_NAME', captainProfile.operatorName, '    ');
  trip += tag('START_DT',  toDate12(startDt), '    ');
  // CREW_NB: Mandatory for QC(88) and MAR(90), Blocked for GLF(89) and NL(91)
  if (subformId === 88 || subformId === 90) trip += tag('CREW_NB', crewNb, '    ');
  // PORT_ID (departure): Mandatory for QC(88)/NL(91), Blocked for GLF(89)/MAR(90).
  // Integer MV_PORT codeId emitted by the DfoPortSelector (Phase 2).
  if (subformId === 88 || subformId === 91) trip += tag('PORT_ID', d.departurePortCodeId, '    ');
  // OBS_TRIP_NUM: Optional for MAR(90) only, Blocked for 88/89/91
  if (subformId === 90) trip += tag('OBS_TRIP_NUM', d.obsTripNum ?? '', '    ');
  trip += tag('FIRST_ENTRY_DT', toCloseTimestamp(log.firstEntryDt || undefined), '    ');
  // USE_CR_IND / PRTNSHP_ID: Mandatory for QC(88) only, Blocked for 89/90/91.
  // USE_CR_IND initial value 'N' (Rule 639); PRTNSHP_ID from MV_PARTNERSHIP_TYPE.
  if (subformId === 88) {
    trip += tag('USE_CR_IND', d.useCrInd === 'Y' ? 'Y' : 'N', '    ');
    trip += tag('PRTNSHP_ID', d.prtnshpId ?? '', '    ');
  }
  trip += tag('LGBK_UID', log.lgbkUid, '    ');
  // REM: TRIP-level note (last child of trip_type scalar sequence, before sub-nodes)
  trip += tag('REM', rem.trip ?? '', '    ');

  // EFFORT — XSD effort_type xs:sequence, ONE NODE PER EFFORT (S136, Rule 1050):
  //   START_DT, END_DT, LIC_NO, FMA_ID, SAR_IND, MM_INTER_IND,
  //   DG_CLOSE_DT, REM?, TGT_SPECIES, EFFORT_BY_GEAR+
  //   (LOST_GEAR_IND removed — 234.12 XSD sets it maxOccurs=0/Blocked; de-emitted S93)
  // Effort 1 = the legacy flat keys (synthesized by effortsFromData), so a single-effort
  // log emits byte-identically to pre-S136; efforts 2+ append their own complete nodes.
  let effort = '';
  efforts.forEach((ef, ei) => {
  // Per-effort haul window (S90 multi-day: each timestamp's own date, dateFished fallback)
  const efStartDt = localToUtcIso(ef.haulStartDate || log.dateFished, ef.haulStartTime ?? '');
  const efEndDt   = localToUtcIso(ef.haulEndDate || log.dateFished, ef.haulEndTime ?? '');
  // The effort's own FMA gates its region fields; effort 1's is the legacy d.fmaId.
  const efFma = Number(ef.fmaId);
  // Note fan-out (S136 §1.2 ruling): each effort's note reaches the same four slots
  // effort 1's does today. Effort 1's text lives in log.remarks (haul/catch, same text
  // since the UI writes both); efforts 2+ carry ONE note on the record.
  const haulNote  = ei === 0 ? (rem.haul ?? '') : (ef.note ?? '');
  const catchNote = ei === 0 ? (rem.catch ?? '') : (ef.note ?? '');
  effort += `    <EFFORT>\n`;
  effort += tag('START_DT',      toDate12(efStartDt), '      ');
  effort += tag('END_DT',        toDate12(efEndDt), '      ');
  // LIC_NO: the XSD's only licence element (string_18, mandatory) — per effort (Rule 1050
  // footnote: licence-by-licence efforts), falling back to the profile licence. Effort 1
  // always transmits the profile licence (legacy behavior; its licNo is never set).
  effort += tag('LIC_NO',        ef.licNo || captainProfile.fishingNumber, '      ');
  effort += tag('FMA_ID',        ef.fmaId ?? '', '      ');
  // SAR_IND/MM_INTER_IND are mandatory Y/N PER EFFORT — empty means unanswered, the
  // element is simply omitted here and the send must be blocked upstream (S4 validator).
  // LOST_GEAR_IND is NOT emitted (234.12 Blocked, maxOccurs=0) — emitting it desyncs the
  // sequence and DFO returns WS1038 (surfacing on the next sibling MM_INTER_IND).
  effort += tag('SAR_IND',       indYN(ef.sarYes), '      ');
  effort += tag('MM_INTER_IND',  indYN(ef.mmYes), '      ');
  // DG_CLOSE_DT: per effort (§5.2.1 — EFFORT closes per occurrence). Effort 1's closeDt IS
  // the legacy d.dgCloseEffort (synthesized by the reader); no now() fallback (S125 P9).
  effort += tag('DG_CLOSE_DT',   ef.closeDt ? toCloseTimestamp(ef.closeDt) : '', '      ');
  // REM: the effort note fans across EFFORT, EFFORT_BY_GEAR and EFFORT_DETAIL (same text)
  effort += tag('REM', haulNote, '      ');
  // TGT_SPECIES: 1312 = lobster
  effort += `      <TGT_SPECIES>\n${tag('SPECIE_ID', '1312', '        ')}      </TGT_SPECIES>\n`;
  effort += `      <EFFORT_BY_GEAR>\n`;
  // GEAR_ID: 925 = Pot/Trap (Rule 270, mandatory all subforms)
  effort += tag('GEAR_ID', String(DFO_GEAR_ID), '        ');
  // GEAR_SBTYP_ID: Mandatory for NL(91), Blocked for QC/GLF/MAR (88/89/90) — per effort
  if (subformId === 91) effort += tag('GEAR_SBTYP_ID', ef.gearSubtypeId ?? '', '        ');
  // REM: EFFORT_BY_GEAR note (after GEAR_SBTYP_ID, before EFFORT_DETAIL) — same note text
  effort += tag('REM', haulNote, '        ');
  // S121: one <EFFORT_DETAIL> per catch-effort block (trap group). Each effort carries its
  // OWN trap groups (ef.details); effort 1's index 0 is the legacy block, so with one
  // effort and no extras the loop runs once and the output is byte-identical to pre-S121.
  (ef.details ?? []).forEach((det, di) => {
  effort += `        <EFFORT_DETAIL>\n`;
  // SOAKED_DUR: blocked for MAR (subform 90) per subforms requirements v234.11.
  // UI captures DAYS (Rule 286); the wire unit is MINUTES (XML dictionary
  // UNIT_OF_MEASURE_ID 11850 = MIN), so convert days → minutes here.
  // Rule 165 cap (216 h = 12960 min) is enforced by the validator.
  if (subformId !== 90) {
    const soakDays = parseFloat(det.soakDuration ?? '');
    const soakMin = isNaN(soakDays) || soakDays <= 0 ? '' : String(Math.round(soakDays * 1440));
    effort += tag('SOAKED_DUR', soakMin, '          ');
  }
  // NB_VNTCH — Rule 624 carries both directions over one 28-FMA list: mandatory there, blocked
  // everywhere else. Correct as written; NOT part of the S145 defect-51 fix.
  if (subformId === 88 && DFO_FMA_NB_VNTCH.has(efFma)) {
    effort += tag('NB_VNTCH', det.vNotchCount ?? '', '          ');
  }
  // NB_VNTCH_YOU — Rule 625 permits it across 47 FMAs (28 QC + 19 NL); Rule 626 mandates it on
  // the 28. On the 19 NL FMAs it is OPTIONAL, so a blank is the normal case there — tag() drops
  // an empty value, so nothing is emitted and the element is simply absent (XSD minOccurs=0).
  if (DFO_FMA_NB_VNTCH_YOU.has(efFma)) {
    effort += tag('NB_VNTCH_YOU', det.nbVntchYou ?? '', '          ');
  }
  effort += tag('NB_GEAR_HLD',  det.trapHauls ?? '', '          ');
  // LGRID_ID: Optional for MAR(90) ONLY; Blocked for QC(88)/GLF(89)/NL(91) per
  // Subforms_requirements_234.xlsx row 85 (Session 59 recon). Subform-gated to 90 with
  // the value-gate AND-ed in — tag() emits nothing when the block's lgridCodeId is empty,
  // so it only appears on 90 when populated.
  if (subformId === 90) effort += tag('LGRID_ID', det.lgridCodeId ?? '', '          ');
  // GRID_ID: QC(88) only, FMA-gated (NOT subform-gated like LGRID). Mandatory for required
  // (non-blocked) QC FMAs — those in DFO_FMA_GRID_MAP (Rule 1012). The 29 Rule-1011 blocked
  // FMAs are absent from the map, so the gate is false and nothing emits (Rule 1011). Value =
  // stored MV_GRID code_id; value-gate AND-ed via tag(). XSD sequence: after LGRID_ID, before
  // GEAR_GRP_NUM (EFFORT_DETAIL_SPEC). Map digit (613x="4"/614x="1") is enforced by the validator.
  if (subformId === 88 && ef.fmaId != null && (efFma in DFO_FMA_GRID_MAP)) {
    effort += tag('GRID_ID', det.gridId ?? '', '          ');
  }
  // GEAR_GRP_NUM: sequential from 1 per EFFORT node (Rule 609x) — the block index
  effort += tag('GEAR_GRP_NUM', String(di + 1), '          ');
  // LAT/LONG per subform — Subforms_requirements rows 82/83 + Rule 3059 (S110 G1 fix):
  //   QC(88)/GLF(89): Mandatory (rows 82/83) — emit whenever captured;
  //   MAR(90): Rule 3059 — FMA 38b only (mandatory there, blocked in all other MAR FMAs);
  //   NL(91): Blocked (rows 82/83) — never emitted, even if coords exist on an old draft.
  // MODE attribute per Standard v6.1 §11.3: G = GPS-captured, M = manual
  // entry/edit (open question 3 resolution; gpsSrc tracked per block by FullDfoForm).
  // S136 UI round: the SAME single-sourced gate the entry fields use (dfoConstants) —
  // identical logic to the previous inline expression, so the emitted bytes cannot move.
  const emitEffortCoords = effortCoordsEntryAllowed(subformId, efFma);
  if (emitEffortCoords && det.gpsLat && det.gpsLng) {
    const coordMode = det.gpsSrc === 'gps' ? 'G' : 'M';
    // Clamp to the XSD's ≤4-decimal LAT/LONG limit at emit (shared clampCoord4), matching
    // the 222 form path — a high-precision GPS read would otherwise draw WS1038. Emit-only.
    effort += `          <LAT MODE="${coordMode}">${xmlEscape(clampCoord4(det.gpsLat))}</LAT>\n`;
    effort += `          <LONG MODE="${coordMode}">${xmlEscape(clampCoord4(det.gpsLng))}</LONG>\n`;
  }
  // TRP_SZ_ID: Mandatory for NL(91), Blocked for QC/GLF/MAR (88/89/90) per
  // Subforms_requirements_234.xlsx row 79. Values constrained to 39682=Standard /
  // 39683=Large (Rule 611, DFO_TRAP_SIZE_LIST). XSD sequence: after LONG, before CATCH.
  if (subformId === 91) effort += tag('TRP_SZ_ID', det.trapSize ?? '', '          ');
  // STAT_SECT_ID: Mandatory for the Rule 621 FMAs, Blocked elsewhere (Rule 608). Unlike
  // LGRID/TRP_SZ_ID this is FMA-GATED, NOT subform-gated — emit only when the effort FMA is
  // in DFO_FMA_STAT_SECT_REQUIRED (those 17 FMAs are all NL-91). Value-gate AND-ed in via
  // tag() (blank → absent). XSD sequence: after TRP_SZ_ID, before REM.
  if (DFO_FMA_STAT_SECT_REQUIRED.has(efFma)) effort += tag('STAT_SECT_ID', det.statSectId ?? '', '          ');
  // REM: EFFORT_DETAIL note (last child before CATCH) — same effort-note text
  effort += tag('REM', haulNote, '          ');
  effort += `          <CATCH>\n`;
  effort += tag('SPECIE_ID',     '1312', '            ');
  // KEPT_WT: a typed 0 must emit as 0.00 (Rule 2020 — "the fisher must enter 0 in the
  // quantity kept" — with Rules 630/631 making KEPT_WT mandatory on the lobster CATCH).
  effort += tag('KEPT_WT',       kgStr(det.catchWeight ?? '', storedWeightUnit(ef.closeUnit), true), '            ');
  // NB_SPCMN_KEPT: NL(91) only — mandatory for the lobster catch (Rule 976), blocked for
  // the non-lobster case (Rule 977) and for QC/GLF/MAR (Subforms row 93). Every CATCH
  // node is the lobster target (Rule 2020), so the gate is subform-only (S110 Phase 2).
  // XSD catch_type sequence: after KEPT_WT, before SPECIE_FRM_ID.
  if (subformId === 91) {
    effort += tag('NB_SPCMN_KEPT', det.nbSpcmnKept ?? '', '            ');
  }
  effort += tag('SPECIE_FRM_ID', String(DFO_SPECIE_FRM_ID), '            ');
  // NB_SPCMN_BRD: lobster in MAR(90) FMA 38b only — mandatory there (Rule 654),
  // blocked for every other FMA (Rule 655) and species (Rule 653)
  if (subformId === 90 && efFma === DFO_FMA_38B) {
    effort += tag('NB_SPCMN_BRD', det.nbSpcmnBrd ?? '', '            ');
  }
  // REM: CATCH note (last child of catch_type)
  effort += tag('REM', catchNote, '            ');
  effort += `          </CATCH>\n`;
  effort += `        </EFFORT_DETAIL>\n`;
  });
  effort += `      </EFFORT_BY_GEAR>\n`;
  effort += `    </EFFORT>\n`;
  });

  // TRIP data groups in XSD trip_type order:
  //   BAIT_USED, SAR, HLIN, HLOUT, PCONS, EFFORT, LANDING, TRANSFER
  let body = '';
  body += baitXml;
  // SAR — XSD sar_type sequence: SAR_DT, LAT, LONG, SPECIE_ID, NB_SPCMN, WT?, SPCMN_COND_ID,
  // DG_CLOSE_DT, REM?. Emitted ONLY when SAR_IND='Y' (the indicator gates the detail node);
  // absent when N/null. LAT/LONG carry the required MODE attr (§11.3): G=GPS, M=manual
  // (d.sarGpsSrc, mirrors EFFORT_DETAIL). WT optional → omitted. DG_CLOSE_DT auto-stamps.
  // S124 Phase 6: SAR_IND lives in EFFORT, so SAR interactions only exist with a haul. When
  // no effort is declared, suppress the SAR detail nodes too — no orphan SAR without its SAR_IND.
  // S136: with per-effort indicators, the trip-level SAR pool emits when ANY effort answered
  // Yes (the XML cannot attribute a SAR to an effort — RECON_S136 B4). Single-effort logs
  // behave identically (effort 1's sarYes IS d.sarYes).
  if (d.effortYes !== 'false' && efforts.some(e => e.sarYes === 'true')) {
    // S121 multi-SAR: block 1 = the legacy d.sar* fields; blocks 2+ = the additive
    // d.extraSars JSON array (XSD allows SAR 0..unbounded under TRIP). A single-SAR log
    // emits byte-identically to pre-S121.
    // S135: the synthesis moved into sarBlocksFromData — the SAME reader the send guard
    // (and the close-all) use, so the emit and the guard cannot disagree about the block
    // list. Block 1 now also carries its own closeDt/note from the flat
    // d.sarCloseDt / d.sarNote keys (absent on legacy logs → the fallbacks below).
    const sars: ExtraSarDetail[] = sarBlocksFromData(d);
    sars.forEach(s => {
      const sarMode = s.gpsSrc === 'gps' ? 'G' : 'M';
      body += `    <SAR>\n`;
      body += tag('SAR_DT', toDate12(localToUtcIso(s.date ?? '', s.time ?? '')), '      ');
      body += `      <LAT MODE="${sarMode}">${xmlEscape(s.lat ?? '')}</LAT>\n`;
      body += `      <LONG MODE="${sarMode}">${xmlEscape(s.lng ?? '')}</LONG>\n`;
      body += tag('SPECIE_ID',     s.species ?? '', '      ');
      body += tag('NB_SPCMN',      s.nbSpcmn ?? '', '      ');
      body += tag('SPCMN_COND_ID', s.condId ?? '', '      ');
      // S124 Phase 2: one closure per SAR block (Rule 1503, §5.2.1). Block 1's close rides the
      // legacy d.dgCloseSar; blocks 2..n carry their own s.closeDt. Absent → falls back to
      // d.dgCloseSar exactly as before, so existing logs emit byte-identically.
      body += tag('DG_CLOSE_DT',   (s.closeDt || d.dgCloseSar) ? toCloseTimestamp(s.closeDt || d.dgCloseSar) : '', '      ');
      // S135: each block emits its OWN note; the legacy shared rem.sar is the fallback
      // (the bait shape), so a pre-S135 log emits byte-identically.
      body += tag('REM',           s.note || (rem.sar ?? ''), '      ');
      body += `    </SAR>\n`;
    });
  }
  // HLIN/HLOUT: Rules 2024/2025/1018 — emit only when ANY effort fishes FMA 28599 (38b) or
  // 1595 (41). S137 (STOP-5-approved gate-condition change): the rules say "a fishing
  // effort", so the gate rides the single-sourced any-effort predicate, matching the render
  // and save gates exactly — the effort-1-only test silently dropped the hail on logs whose
  // 38b/41 effort was the second one.
  if (fishesHailArea(d)) {
    if (d.hlinCompany || d.hlinConfirmNo) {
      // HLIN_CIE_ID: integer company code via label→codeId lookup (Rule 27).
      // S142 defect 52 (F2): an unmatched company emits NOTHING, never the old '0'. There is
      // no company '0' in Mv_service_provider, so '0' was a false statement that DFO's schema
      // happily accepted and transmitted. An omitted element is the truth — and because the
      // spec below has HLIN_CIE_ID at min:1, validateElogXml already refuses the file. The
      // fisherman is DECLINING to name a company (the picker is on the card, starred, and
      // stores the EN label on tap), so there is nothing to substitute: Rule 27's list has no
      // "none" code and — unlike Rule 93's HLOUT list — no DFO IVR entry to borrow either.
      const hlinCie = DFO_HLIN_COMPANY_LIST.find(c => c.label === d.hlinCompany);
      body += `    <HLIN>\n`;
      body += tag('HLIN_CIE_ID',  hlinCie ? String(hlinCie.codeId) : '', '      ');
      body += tag('HLIN_NUM',     d.hlinConfirmNo ?? '', '      ');
      body += tag('ETA_DT',       toDate12(d.hlinEta ?? ''), '      ');
      body += tag('TOT_WT_ONBRD', kgStr(d.hlinTotalWeight ?? '', storedWeightUnit(d.dgCloseHlinUnit)), '      ');
      body += tag('DG_CLOSE_DT',  d.dgCloseHlin ? toCloseTimestamp(d.dgCloseHlin) : '', '      ');
      body += tag('REM',          rem.hlin ?? '', '      ');
      body += `    </HLIN>\n`;
    }
    if (d.hloutCompany || d.hloutConfirmNo) {
      // HLOUT_CIE_ID: Rule 93's four codes. Same '' fallback and the same reasoning as HLIN
      // above — deliberately identical, so a blank company behaves the same on both hails.
      const hloutCie = DFO_HLOUT_COMPANY_LIST.find(c => c.label === d.hloutCompany);
      body += `    <HLOUT>\n`;
      body += tag('HLOUT_CIE_ID', hloutCie ? String(hloutCie.codeId) : '', '      ');
      body += tag('HLOUT_NUM',    d.hloutConfirmNo ?? '', '      ');
      body += tag('DG_CLOSE_DT',  d.dgCloseHlout ? toCloseTimestamp(d.dgCloseHlout) : '', '      ');
      body += tag('REM',          rem.hlout ?? '', '      ');
      body += `    </HLOUT>\n`;
    }
  }
  body += pconsXml;
  // S124 Phase 6: EFFORT is optional (XSD minOccurs=0, Rule 1051). When the harvester declares
  // no haul (effortYes==='false' — a setting day), EVERY effort node is omitted, taking its
  // FMA_ID / SAR_IND / MM_INTER_IND / catch / haul times / GPS with it — a no-haul day has
  // zero efforts even if a stale extraEffortNodes survived (ruling 6: the toggle is the one
  // haul declaration). Any other value (incl. absent, for pre-S124 logs) keeps the efforts,
  // so an ordinary hauling log emits byte-identically.
  if (d.effortYes !== 'false') body += effort;
  // LANDING — XSD landing_type: START_DT, PORT_ID, VRN?, DG_CLOSE_DT, REM?
  if (landDt) {
    body += `    <LANDING>\n`;
    body += tag('START_DT', toDate12(landDt), '      ');
    // PORT_ID (landing): XSD-mandatory for ALL subforms (landing_type). Integer MV_PORT
    // codeId emitted by the DfoPortSelector (Phase 2) — closes open question 4.
    body += tag('PORT_ID', d.portLandedCodeId, '      ');
    // LANDING.VRN: carrier vessel — mandatory when USE_CR_IND='Y' (Rule 642),
    // blocked otherwise (Rule 641)
    if (subformId === 88 && d.useCrInd === 'Y') body += tag('VRN', d.carrierVrn ?? '', '      ');
    body += tag('DG_CLOSE_DT', d.dgCloseLanding ? toCloseTimestamp(d.dgCloseLanding) : '', '      ');
    body += tag('REM', rem.landing ?? '', '      ');
    body += `    </LANDING>\n`;
  }
  // TRANSFER / TRANSFER_DTL: QC(88) only, Blocked for GLF/MAR/NL (89/90/91).
  // FROM side is always this vessel (Rule 251: one of FROM_VRN/FROM_PND_NUM);
  // TO side is a vessel VRN or a pond number, never both (Rule 252).
  // TRANSFER_DTL: lobster only (Rule 249: SPECIE_ID 1312), Round (Rule 250: 4691).
  if (subformId === 88 && d.transferYes === 'true') {
    // Rule 789: a typed 0 is a declared quantity. Without allowZero the guard below deleted
    // the entire TRANSFER subtree — date, both vessel numbers, close stamp and BOTH copies of
    // the harvester's own note. A QC transfer declared at 0 lb left no trace it happened.
    const trnsfWtKg = kgStr(d.transferWt ?? '', storedWeightUnit(d.dgCloseTransferUnit), true);
    // S147 Phase 5a (CG-6): the transfer carries its OWN date, like the other four timestamps
    // (S90). BYTE-IDENTICAL for every stored log — no log written before this change has a
    // transferDate, so `d.transferDate` is undefined and the `||` falls back to log.dateFished,
    // which is exactly what this line read before. A transfer recorded after midnight now emits
    // its own date instead of the trip's nominal one — a corrected value, not a format change.
    const trnsfDt = toDate12(localToUtcIso(d.transferDate || log.dateFished, d.transferTime ?? ''));
    if (trnsfWtKg) {
      body += `    <TRANSFER>\n`;
      body += tag('TRNSF_DT', trnsfDt, '      ');
      body += tag('FROM_VRN', captainProfile.vesselNumber, '      ');
      if (d.transferToPndNum) body += tag('TO_PND_NUM', d.transferToPndNum, '      ');
      else body += tag('TO_VRN', d.transferToVrn ?? '', '      ');
      body += tag('DG_CLOSE_DT', d.dgCloseTransfer ? toCloseTimestamp(d.dgCloseTransfer) : '', '      ');
      // REM: 'transfer' note fans across TRANSFER and TRANSFER_DTL (same text). On TRANSFER
      // it is the last child before TRANSFER_DTL per transfer_type sequence.
      body += tag('REM', rem.transfer ?? '', '      ');
      body += `      <TRANSFER_DTL>\n`;
      body += tag('SPECIE_ID', '1312', '        ');
      body += tag('SPECIE_FRM_ID', String(DFO_SPECIE_FRM_ID), '        ');
      body += tag('WT', trnsfWtKg, '        ');
      body += tag('REM', rem.transfer ?? '', '        ');
      body += `      </TRANSFER_DTL>\n`;
      body += `    </TRANSFER>\n`;
    }
  }

  // <ELOG> carries NO attributes — the only one the XSD allows is NODE_ID, which is
  // DFO-internal and must never be emitted.
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
         `<ELOG>\n` +
         `  <GENERAL_INFO>\n${generalInfo}  </GENERAL_INFO>\n` +
         `  <TRIP>\n${trip}${body}  </TRIP>\n` +
         `</ELOG>`;
}

// ── Structural validation against the DFO Form 234 XSD (39673.234.xsd) ─────────────
// React Native has no native XSD validator, so this parses the document into a tree and
// walks it against a declarative mirror of the XSD complex-type sequences (S4 rewrite —
// the old flat, name-based checks predate the GENERAL_INFO/TRIP/EFFORT restructure).

interface XmlNode {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}

// Minimal parser for this generator's own output: element-only or text-only nodes,
// double-quoted attributes, no comments/CDATA/PIs (the XML declaration is stripped).
// Returns the root node, or an error string if the document is malformed.
function parseXml(xml: string): XmlNode | string {
  const src = xml.replace(/^\s*<\?xml[^?]*\?>\s*/, '');
  const tokenRe = /<(\/?)([A-Za-z_][\w]*)((?:\s+[\w]+="[^"]*")*)\s*(\/?)>|([^<]+)/g;
  const root: XmlNode = { name: '#root', attrs: {}, children: [], text: '' };
  const stack: XmlNode[] = [root];
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(src)) !== null) {
    const [, close, name, attrStr, selfClose, text] = m;
    const top = stack[stack.length - 1];
    if (text !== undefined) {
      if (text.trim()) top.text += text.trim();
      continue;
    }
    if (close) {
      if (top.name !== name) return `Malformed XML: </${name}> does not match open <${top.name}>`;
      stack.pop();
      continue;
    }
    const attrs: Record<string, string> = {};
    const attrRe = /([\w]+)="([^"]*)"/g;
    let a: RegExpExecArray | null;
    while ((a = attrRe.exec(attrStr || '')) !== null) attrs[a[1]] = a[2];
    const node: XmlNode = { name, attrs, children: [], text: '' };
    top.children.push(node);
    if (!selfClose) stack.push(node);
  }
  if (stack.length !== 1) return `Malformed XML: unclosed <${stack[stack.length - 1].name}>`;
  if (root.children.length !== 1) return 'Malformed XML: expected a single root element';
  return root.children[0];
}

// Leaf value types mirroring the XSD simple types
type LeafType = 'string' | 'int' | 'id' | 'date_12' | 'date_14' | 'ind_yn' | 'weight' | 'lat' | 'long';

const LEAF_CHECKS: Record<LeafType, { ok: (v: string) => boolean; want: string }> = {
  string:  { ok: v => v.length > 0, want: 'a non-empty string' },
  int:     { ok: v => /^\d+$/.test(v), want: 'a non-negative integer' },
  // integer_10 code-table ids are 1-based (e.g. BT_TYP_ID minInclusive=1) — catches the
  // '0' fallback emitted when a label→codeId lookup fails
  id:      { ok: v => /^\d+$/.test(v) && Number(v) >= 1, want: 'a positive integer code' },
  date_12: { ok: v => /^\d{4}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])[0-5]\d$/.test(v), want: 'date_12 (YYYYMMDDHHMM)' },
  date_14: { ok: v => /^\d{4}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])[0-5]\d[0-5]\d$/.test(v), want: 'date_14 (YYYYMMDDHHMMSS)' },
  ind_yn:  { ok: v => v === 'Y' || v === 'N', want: 'Y or N' },
  weight:  { ok: v => /^\d{1,6}(\.\d{1,3})?$/.test(v), want: 'a weight (max 6 integer digits, 3 decimals)' },
  lat:     { ok: v => /^\d{1,2}(\.\d{1,4})?$/.test(v) && Number(v) >= 38 && Number(v) <= 72, want: 'latitude 38–72, max 4 decimals' },
  long:    { ok: v => /^-\d{1,3}(\.\d{1,4})?$/.test(v) && Number(v) >= -148 && Number(v) <= -40, want: 'longitude -148…-40, max 4 decimals' },
};

interface ChildSpec {
  name: string;
  min: number;
  max: number; // Infinity = unbounded
  type?: LeafType;        // leaf element with a typed text value
  children?: ChildSpec[]; // complex element with an ordered xs:sequence
  // neither type nor children → contents not validated (e.g. TRANSFER, deferred Item 18)
}

const CATCH_SPEC: ChildSpec[] = [
  { name: 'SPECIE_ID',     min: 1, max: 1, type: 'id' },
  { name: 'KEPT_WT',       min: 0, max: 1, type: 'weight' },
  { name: 'NB_SPCMN_KEPT', min: 0, max: 1, type: 'int' },
  { name: 'NB_SPCMN_DISC', min: 0, max: 1, type: 'int' },
  { name: 'SPECIE_FRM_ID', min: 1, max: 1, type: 'id' },
  { name: 'NB_SPCMN_BRD',  min: 0, max: 1, type: 'int' },
  { name: 'REM',           min: 0, max: 1, type: 'string' },
];

const EFFORT_DETAIL_SPEC: ChildSpec[] = [
  { name: 'SOAKED_DUR',   min: 0, max: 1, type: 'int' },
  { name: 'NB_VNTCH',     min: 0, max: 1, type: 'int' },
  { name: 'NB_VNTCH_YOU', min: 0, max: 1, type: 'int' },
  { name: 'NB_GEAR_HLD',  min: 1, max: 1, type: 'int' },
  { name: 'LGRID_ID',     min: 0, max: 1, type: 'id' },
  { name: 'GRID_ID',      min: 0, max: 1, type: 'id' },
  { name: 'GEAR_GRP_NUM', min: 1, max: 1, type: 'int' },
  { name: 'LAT',          min: 0, max: 1, type: 'lat' },
  { name: 'LONG',         min: 0, max: 1, type: 'long' },
  { name: 'TRP_SZ_ID',    min: 0, max: 1, type: 'id' },
  { name: 'STAT_SECT_ID', min: 0, max: 1, type: 'id' },
  { name: 'REM',          min: 0, max: 1, type: 'string' },
  { name: 'CATCH',        min: 1, max: Infinity, children: CATCH_SPEC },
];

const EFFORT_SPEC: ChildSpec[] = [
  { name: 'START_DT',      min: 1, max: 1, type: 'date_12' },
  { name: 'END_DT',        min: 1, max: 1, type: 'date_12' },
  { name: 'LIC_NO',        min: 1, max: 1, type: 'string' },
  { name: 'FMA_ID',        min: 1, max: 1, type: 'id' },
  { name: 'SAR_IND',       min: 1, max: 1, type: 'ind_yn' },
  // LOST_GEAR_IND: 234.12 Blocked (XSD maxOccurs=0). min:0 lets the de-emitted doc pass;
  // max:0 rejects it if ever present (blocked-direction guard), matching the XSD.
  { name: 'LOST_GEAR_IND', min: 0, max: 0, type: 'ind_yn' },
  { name: 'MM_INTER_IND',  min: 1, max: 1, type: 'ind_yn' },
  { name: 'DG_CLOSE_DT',   min: 1, max: 1, type: 'date_14' },
  { name: 'REM',           min: 0, max: 1, type: 'string' },
  { name: 'TGT_SPECIES',   min: 1, max: 1, children: [
    { name: 'SPECIE_ID', min: 1, max: 1, type: 'id' },
  ] },
  { name: 'EFFORT_BY_GEAR', min: 1, max: Infinity, children: [
    { name: 'GEAR_ID',       min: 1, max: 1, type: 'id' },
    { name: 'GEAR_SBTYP_ID', min: 0, max: 1, type: 'id' },
    { name: 'REM',           min: 0, max: 1, type: 'string' },
    { name: 'EFFORT_DETAIL', min: 1, max: 9999, children: EFFORT_DETAIL_SPEC },
  ] },
];

const TRIP_SPEC: ChildSpec[] = [
  { name: 'TRIP_NUM',       min: 1, max: 1, type: 'int' },
  { name: 'OPER_NAME',      min: 1, max: 1, type: 'string' },
  { name: 'START_DT',       min: 1, max: 1, type: 'date_12' },
  { name: 'CREW_NB',        min: 0, max: 1, type: 'int' },
  // PORT_ID is an integer code in the XSD; free-text names will fail here until the
  // ports name→code retype lands (open question 4)
  { name: 'PORT_ID',        min: 0, max: 1, type: 'id' },
  { name: 'OBS_TRIP_NUM',   min: 0, max: 1, type: 'string' },
  { name: 'FIRST_ENTRY_DT', min: 1, max: 1, type: 'date_14' },
  { name: 'USE_CR_IND',     min: 0, max: 1, type: 'ind_yn' },
  { name: 'PRTNSHP_ID',     min: 0, max: 1, type: 'id' },
  { name: 'LGBK_UID',       min: 1, max: 1, type: 'string' },
  { name: 'REM',            min: 0, max: 1, type: 'string' },
  { name: 'BAIT_USED', min: 0, max: Infinity, children: [
    { name: 'BT_TYP_ID',   min: 1, max: 1, type: 'id' },
    { name: 'BT_WT',       min: 1, max: 1, type: 'weight' },
    { name: 'BT_COND_ID',  min: 0, max: 1, type: 'id' },
    { name: 'DG_CLOSE_DT', min: 1, max: 1, type: 'date_14' },
    { name: 'REM',         min: 0, max: 1, type: 'string' },
  ] },
  { name: 'SAR', min: 0, max: Infinity, children: [
    { name: 'SAR_DT',        min: 1, max: 1, type: 'date_12' },
    { name: 'LAT',           min: 1, max: 1, type: 'lat' },
    { name: 'LONG',          min: 1, max: 1, type: 'long' },
    { name: 'SPECIE_ID',     min: 1, max: 1, type: 'id' },
    { name: 'NB_SPCMN',      min: 1, max: 1, type: 'int' },
    { name: 'WT',            min: 0, max: 1, type: 'weight' },
    { name: 'SPCMN_COND_ID', min: 1, max: 1, type: 'id' },
    { name: 'DG_CLOSE_DT',   min: 1, max: 1, type: 'date_14' },
    { name: 'REM',           min: 0, max: 1, type: 'string' },
  ] },
  { name: 'HLIN', min: 0, max: Infinity, children: [
    { name: 'HLIN_CIE_ID',  min: 1, max: 1, type: 'id' },
    { name: 'HLIN_NUM',     min: 1, max: 1, type: 'string' },
    { name: 'ETA_DT',       min: 0, max: 1, type: 'date_12' },
    { name: 'TOT_WT_ONBRD', min: 0, max: 1, type: 'weight' },
    { name: 'DG_CLOSE_DT',  min: 1, max: 1, type: 'date_14' },
    { name: 'REM',          min: 0, max: 1, type: 'string' },
  ] },
  { name: 'HLOUT', min: 0, max: Infinity, children: [
    { name: 'HLOUT_CIE_ID', min: 1, max: 1, type: 'id' },
    { name: 'HLOUT_NUM',    min: 1, max: 1, type: 'string' },
    { name: 'DG_CLOSE_DT',  min: 1, max: 1, type: 'date_14' },
    { name: 'REM',          min: 0, max: 1, type: 'string' },
  ] },
  { name: 'PCONS', min: 0, max: Infinity, children: [
    { name: 'SPECIE_ID',     min: 1, max: 1, type: 'id' },
    { name: 'SPECIE_FRM_ID', min: 1, max: 1, type: 'id' },
    { name: 'SPECIE_SZ_ID',  min: 0, max: 1, type: 'id' },
    { name: 'WT',            min: 1, max: 1, type: 'weight' },
    { name: 'USG_ID',        min: 0, max: 1, type: 'id' },
    { name: 'DG_CLOSE_DT',   min: 1, max: 1, type: 'date_14' },
    { name: 'REM',           min: 0, max: 1, type: 'string' },
  ] },
  { name: 'EFFORT', min: 0, max: Infinity, children: EFFORT_SPEC },
  { name: 'LANDING', min: 0, max: Infinity, children: [
    { name: 'START_DT',    min: 1, max: 1, type: 'date_12' },
    // XSD-mandatory; min 0 here only so the overlay below can emit a more specific
    // error message (pointing at open question 4) than the generic structural one
    { name: 'PORT_ID',     min: 0, max: 1, type: 'id' },
    { name: 'VRN',         min: 0, max: 1, type: 'string' },
    { name: 'DG_CLOSE_DT', min: 1, max: 1, type: 'date_14' },
    { name: 'REM',         min: 0, max: 1, type: 'string' },
  ] },
  // TRANSFER — XSD transfer_type (QC-88 only; Rules 248-252)
  { name: 'TRANSFER', min: 0, max: Infinity, children: [
    { name: 'TRNSF_DT',     min: 1, max: 1, type: 'date_12' },
    { name: 'FROM_VRN',     min: 0, max: 1, type: 'string' },
    { name: 'FROM_VNAME',   min: 0, max: 1, type: 'string' },
    { name: 'FROM_PND_NUM', min: 0, max: 1, type: 'string' },
    { name: 'TO_VRN',       min: 0, max: 1, type: 'string' },
    { name: 'TO_VNAME',     min: 0, max: 1, type: 'string' },
    { name: 'TO_PND_NUM',   min: 0, max: 1, type: 'string' },
    { name: 'DG_CLOSE_DT',  min: 1, max: 1, type: 'date_14' },
    { name: 'REM',          min: 0, max: 1, type: 'string' },
    { name: 'TRANSFER_DTL', min: 1, max: Infinity, children: [
      { name: 'SPECIE_ID',     min: 1, max: 1, type: 'id' },
      { name: 'SPECIE_FRM_ID', min: 1, max: 1, type: 'id' },
      { name: 'WT',            min: 1, max: 1, type: 'weight' },
      { name: 'REM',           min: 0, max: 1, type: 'string' },
    ] },
  ] },
];

const ELOG_SPEC: ChildSpec[] = [
  { name: 'GENERAL_INFO', min: 1, max: 1, children: [
    { name: 'CIE_ID',      min: 1, max: 1, type: 'id' },
    { name: 'SOFT_VER',    min: 1, max: 1, type: 'string' },
    { name: 'REG_ID',      min: 1, max: 1, type: 'id' },
    { name: 'FIN',         min: 1, max: 1, type: 'string' },
    { name: 'VRN',         min: 1, max: 1, type: 'string' },
    { name: 'FORM_VER_ID', min: 1, max: 1, type: 'id' },
    { name: 'SUBFORM_ID',  min: 1, max: 1, type: 'id' },
  ] },
  { name: 'TRIP', min: 1, max: Infinity, children: TRIP_SPEC },
];

function validateNode(node: XmlNode, spec: ChildSpec, path: string, errors: string[]): void {
  // Attributes: the only attribute anywhere in the XSD is DFO-internal NODE_ID (never
  // emitted) plus the required MODE="M"|"G" on LAT/LONG
  const isCoord = node.name === 'LAT' || node.name === 'LONG';
  for (const a of Object.keys(node.attrs)) {
    if (!(isCoord && a === 'MODE')) errors.push(`${path}: attribute ${a} is not allowed`);
  }
  if (isCoord) {
    const mode = node.attrs['MODE'];
    if (mode !== 'M' && mode !== 'G') errors.push(`${path}: requires MODE="M" or MODE="G", got "${mode ?? ''}"`);
  }

  if (spec.type) {
    if (node.children.length > 0) {
      errors.push(`${path}: expected a value, found child elements`);
      return;
    }
    const check = LEAF_CHECKS[spec.type];
    if (!check.ok(node.text)) errors.push(`${path}: expected ${check.want}, got "${node.text}"`);
    return;
  }
  if (!spec.children) return; // contents intentionally unvalidated (TRANSFER)
  if (node.text) errors.push(`${path}: unexpected text content "${node.text}"`);
  validateSequence(node, spec.children, path, errors);
}

// Walks an element's children against an ordered xs:sequence with occurrence bounds.
// Anything left over after the sequence is consumed is unexpected or out of order.
function validateSequence(node: XmlNode, specs: ChildSpec[], path: string, errors: string[]): void {
  let i = 0;
  for (const cs of specs) {
    let count = 0;
    while (i < node.children.length && node.children[i].name === cs.name) {
      const childPath = cs.max === 1 ? `${path}.${cs.name}` : `${path}.${cs.name}[${count + 1}]`;
      validateNode(node.children[i], cs, childPath, errors);
      count++;
      i++;
    }
    if (count < cs.min) errors.push(`${path}: missing required <${cs.name}>`);
    if (count > cs.max) errors.push(`${path}: too many <${cs.name}> (${count}, max ${cs.max})`);
  }
  for (; i < node.children.length; i++) {
    errors.push(`${path}: unexpected or out-of-order element <${node.children[i].name}>`);
  }
}

// S142 defect 52: turn validateElogXml's hail errors into the two close keys the send screen
// names in deck words. Only the ACTIONABLE ones qualify — a missing group (Rules 2024/2025)
// or a mandatory child missing inside a group that IS present (which is what the '0'
// company fix now surfaces: an unmatched company emits no HLIN_CIE_ID at all). The blocked
// direction is deliberately excluded: "this group should not be here" is not a card the
// harvester can go and finish, so it stays in the raw validation list.
export function hailGateSections(errors: string[]): string[] {
  const groups = [['HLIN', 'dgCloseHlin'], ['HLOUT', 'dgCloseHlout']] as const;
  return groups
    .filter(([group]) => errors.some(e =>
      e.includes(`: ${group} is required on a MAR(90) logbook`) ||
      (e.includes(`.${group}[`) && e.includes('missing required <'))))
    .map(([, closeKey]) => closeKey);
}

export function validateElogXml(xml: string, subformId: number): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const parsed = parseXml(xml);
  if (typeof parsed === 'string') return { valid: false, errors: [parsed] };
  if (parsed.name !== 'ELOG') return { valid: false, errors: [`Root element must be ELOG, got <${parsed.name}>`] };

  validateNode(parsed, { name: 'ELOG', min: 1, max: 1, children: ELOG_SPEC }, 'ELOG', errors);

  // ── Subform overlays (Subforms_requirements_234.xlsx v234.11) ──
  const get = (n: XmlNode, name: string): XmlNode[] => n.children.filter(c => c.name === name);

  const generalInfo = get(parsed, 'GENERAL_INFO')[0];
  if (generalInfo) {
    const sub = get(generalInfo, 'SUBFORM_ID')[0];
    if (sub && sub.text !== String(subformId)) {
      errors.push(`GENERAL_INFO.SUBFORM_ID is ${sub.text} but the log says ${subformId}`);
    }
    // Rule 985 (+979a-d): subform ↔ DFO administrative region cross-check
    const reg = get(generalInfo, 'REG_ID')[0];
    const expectedRegId = DFO_SUBFORM_REGISTRY[subformId]?.regId;
    if (reg && expectedRegId !== undefined && reg.text !== String(expectedRegId)) {
      errors.push(`GENERAL_INFO.REG_ID must be ${expectedRegId} for subform ${subformId} (Rule 985), got ${reg.text}`);
    }
  }

  // Current UTC moment as date_12 — date_12 strings are fixed-width digits, so
  // lexicographic comparison is chronological comparison
  const nowP = (n: number) => String(n).padStart(2, '0');
  const nowD = new Date();
  const nowDate12 =
    `${nowD.getUTCFullYear()}${nowP(nowD.getUTCMonth() + 1)}${nowP(nowD.getUTCDate())}` +
    `${nowP(nowD.getUTCHours())}${nowP(nowD.getUTCMinutes())}`;
  const isDate12 = (s: string) => /^\d{12}$/.test(s);

  get(parsed, 'TRIP').forEach((trip, ti) => {
    const p = `TRIP[${ti + 1}]`;
    // CREW_NB: Mandatory for QC(88)/MAR(90), Blocked for GLF(89)/NL(91)
    const crewNbNode = get(trip, 'CREW_NB')[0];
    if ((subformId === 88 || subformId === 90) && !crewNbNode) {
      errors.push(`${p}: CREW_NB is required for QC(88)/MAR(90)`);
    }
    // Rule 444: crew count between 1 and 20
    if (crewNbNode) {
      const n = Number(crewNbNode.text);
      if (!Number.isInteger(n) || n < 1 || n > 20) {
        errors.push(`${p}: CREW_NB must be between 1 and 20 (Rule 444), got ${crewNbNode.text}`);
      }
    }
    // Rule 181: LGBK_UID = six random uppercase letters
    const lgbk = get(trip, 'LGBK_UID')[0];
    if (lgbk && !/^[A-Z]{6}$/.test(lgbk.text)) {
      errors.push(`${p}: LGBK_UID must be 6 uppercase letters A-Z (Rule 181), got "${lgbk.text}"`);
    }
    // TRIP.PORT_ID: Mandatory for QC(88)/NL(91), Blocked for GLF(89)/MAR(90)
    if ((subformId === 88 || subformId === 91) && get(trip, 'PORT_ID').length === 0) {
      errors.push(`${p}: PORT_ID is required for QC(88)/NL(91)`);
    }
    // USE_CR_IND / PRTNSHP_ID: Mandatory for QC(88), Blocked for 89/90/91
    const useCr = get(trip, 'USE_CR_IND')[0];
    const prtnshp = get(trip, 'PRTNSHP_ID')[0];
    if (subformId === 88) {
      if (!useCr) errors.push(`${p}: USE_CR_IND is required for QC(88)`);
      if (!prtnshp) errors.push(`${p}: PRTNSHP_ID is required for QC(88)`);
      else if (!MV_PARTNERSHIP_TYPE.some(t => String(t.codeId) === prtnshp.text)) {
        errors.push(`${p}: PRTNSHP_ID ${prtnshp.text} is not in MV_PARTNERSHIP_TYPE`);
      }
    } else {
      if (useCr) errors.push(`${p}: USE_CR_IND is blocked for subform ${subformId}`);
      if (prtnshp) errors.push(`${p}: PRTNSHP_ID is blocked for subform ${subformId}`);
    }

    const tripStart = get(trip, 'START_DT')[0]?.text ?? '';
    let lastEffortEnd = '';

    const efforts = get(trip, 'EFFORT');
    // S124 Phase 6: EFFORT is optional (XSD minOccurs=0, Rule 1051). A no-haul day (setting
    // day) legitimately has zero EFFORT — accept its absence. When present, it is fully
    // validated below; the save gate ensures the fields are filled once a haul is declared.
    efforts.forEach((ef, ei) => {
      const ep = `${p}.EFFORT[${ei + 1}]`;
      const efStart = get(ef, 'START_DT')[0]?.text ?? '';
      const efEnd = get(ef, 'END_DT')[0]?.text ?? '';
      const efFma = Number(get(ef, 'FMA_ID')[0]?.text ?? 0);
      // Rule 30: effort start must not be in the future
      if (isDate12(efStart) && efStart > nowDate12) {
        errors.push(`${ep}: START_DT is in the future (Rule 30)`);
      }
      // Rule 29: effort start ≥ trip start
      if (isDate12(efStart) && isDate12(tripStart) && efStart < tripStart) {
        errors.push(`${ep}: START_DT is before TRIP.START_DT (Rule 29)`);
      }
      // Rule 32: effort end ≥ effort start
      if (isDate12(efStart) && isDate12(efEnd) && efEnd < efStart) {
        errors.push(`${ep}: END_DT is before START_DT (Rule 32)`);
      }
      if (isDate12(efEnd) && efEnd > lastEffortEnd) lastEffortEnd = efEnd;

      get(ef, 'EFFORT_BY_GEAR').forEach((ebg, gi) => {
        const gp = `${ep}.EFFORT_BY_GEAR[${gi + 1}]`;
        // GEAR_SBTYP_ID: Mandatory for NL(91), Blocked for 88/89/90
        if (subformId === 91 && get(ebg, 'GEAR_SBTYP_ID').length === 0) {
          errors.push(`${gp}: GEAR_SBTYP_ID is required for NL(91)`);
        }
        if (subformId !== 91 && get(ebg, 'GEAR_SBTYP_ID').length > 0) {
          errors.push(`${gp}: GEAR_SBTYP_ID is blocked for subform ${subformId}`);
        }
        get(ebg, 'EFFORT_DETAIL').forEach((ed, di) => {
          const dp = `${gp}.EFFORT_DETAIL[${di + 1}]`;
          const soakedNode = get(ed, 'SOAKED_DUR')[0];
          // SOAKED_DUR: required for 88/89/91, blocked for MAR(90)
          if (subformId === 90 && soakedNode) {
            errors.push(`${dp}: SOAKED_DUR is blocked for MAR(90)`);
          }
          if (subformId !== 90 && !soakedNode) {
            errors.push(`${dp}: SOAKED_DUR is required for QC/GLF/NL`);
          }
          // Rule 165: soaked duration ≤ 216 hours (wire unit is minutes → 12960)
          if (soakedNode && Number(soakedNode.text) > 12960) {
            errors.push(`${dp}: SOAKED_DUR exceeds 216 hours / 12960 minutes (Rule 165), got ${soakedNode.text}`);
          }
          // TRP_SZ_ID: Mandatory for NL(91), Blocked for 88/89/90 per subforms
          // requirements v234.11 row 79 (matches the generator gate above).
          const hasTrpSz = get(ed, 'TRP_SZ_ID').length > 0;
          if (subformId === 91 && !hasTrpSz) {
            errors.push(`${dp}: TRP_SZ_ID is mandatory for NL(91)`);
          }
          if (subformId !== 91 && hasTrpSz) {
            errors.push(`${dp}: TRP_SZ_ID is blocked for subform ${subformId}`);
          }
          // LGRID_ID — S143 defect 54: the MANDATORY direction of Rule 619. The lobster
          // settlement grid is mandatory when the effort FMA is one of the 13 codes 1581-1593
          // (LFA 27-38; LFA 34 = 1589). The close gate has demanded this since S140 P3
          // (dfoRequirements.ts lgridCodeId) but the send gate had no mandatory direction at all,
          // so a Rule-619 log with no grid transmitted.
          //
          // NOT CLOSED HERE — NF-1, deferred to its own session by ruling: Rule 619 also BLOCKS
          // the grid on every FMA outside the 13, including the MAR areas LFA 40 (1594), LFA 41
          // (1595) and 38b (28599). The blocked direction below is still scoped by SUBFORM
          // (Subforms row 85), so those three MAR areas still pass. Closing it invalidates
          // fixtures in seven suites, two of which are deliberate byte pins
          // (multiGrid PRE_S121_BASELINE_90, sarMulti's pre-multi-SAR baseline).
          // Not a live leak: DFO_LGRID_BY_FMA holds exactly the 13 codes, so the app's own grid
          // picker cannot offer a settlement grid outside them.
          const lgrid = get(ed, 'LGRID_ID').length > 0;
          if (subformId === 90 && DFO_FMA_LGRID_REQUIRED.has(efFma) && !lgrid) {
            errors.push(`${dp}: LGRID_ID is mandatory for this FMA (Rule 619)`);
          }
          if (subformId !== 90 && lgrid) {
            errors.push(`${dp}: LGRID_ID is blocked for subform ${subformId}`);
          }
          // GRID_ID (Rules 1011 / 1012 / 613x-614x): QC(88) only, FMA-gated (mirrors the emit).
          // Rule 1011 — blocked (must be absent) when the FMA is in DFO_GRID_BLOCKED_FMA.
          // Rule 1012 — mandatory (must be present) when the FMA is in DFO_FMA_GRID_MAP.
          // Rule 613x/614x — when present, the grid's MV_GRID DESC_FRE first char must equal the
          // FMA's map digit DFO_FMA_GRID_MAP[FMA] ("4" → 613x, "1" → 614x).
          const gridNode = get(ed, 'GRID_ID')[0];
          if (subformId === 88) {
            const gridReqDigit = DFO_FMA_GRID_MAP[efFma];
            if (DFO_GRID_BLOCKED_FMA.has(efFma) && gridNode) {
              errors.push(`${dp}: GRID_ID is blocked for this FMA (Rule 1011)`);
            }
            if (gridReqDigit && !gridNode) {
              errors.push(`${dp}: GRID_ID is mandatory for this FMA (Rule 1012)`);
            }
            if (gridReqDigit && gridNode) {
              const grid = MV_GRID.find(g => String(g.codeId) === gridNode.text);
              const ruleNo = gridReqDigit === '4' ? '613x' : '614x';
              if (!grid || grid.descFr.charAt(0) !== gridReqDigit) {
                errors.push(`${dp}: GRID_ID ${gridNode.text} is not valid for this FMA (Rule ${ruleNo})`);
              }
            }
          }
          // STAT_SECT_ID (Rules 621 + 622): FMA-gated, NOT subform-gated (mirrors the emit).
          // Rule 621 — mandatory when the effort FMA is in DFO_FMA_STAT_SECT_REQUIRED, blocked
          // (must be absent) otherwise. Rule 622 — when present, the (FMA, section) pair must
          // exist in MV_STAT_SECTION_VS_FMA, i.e. statSectId ∈ DFO_STAT_SECT_BY_FMA[FMA].
          const statSectNode = get(ed, 'STAT_SECT_ID')[0];
          const statSectReq = DFO_FMA_STAT_SECT_REQUIRED.has(efFma);
          if (statSectReq && !statSectNode) {
            errors.push(`${dp}: STAT_SECT_ID is mandatory for this FMA (Rule 621)`);
          }
          if (!statSectReq && statSectNode) {
            errors.push(`${dp}: STAT_SECT_ID is blocked for this FMA (Rule 621)`);
          }
          if (statSectReq && statSectNode) {
            const validSects = (DFO_STAT_SECT_BY_FMA[efFma] ?? []).map(r => String(r.statSectCodeId));
            if (!validSects.includes(statSectNode.text)) {
              errors.push(`${dp}: STAT_SECT_ID ${statSectNode.text} is not valid for this FMA (Rule 622)`);
            }
          }
          // Rules 623-626: NB_VNTCH / NB_VNTCH_YOU — FMA-conditional (the lists carry the region).
          const vntch = get(ed, 'NB_VNTCH').length > 0;
          const vntchYou = get(ed, 'NB_VNTCH_YOU').length > 0;
          // NB_VNTCH — Rule 624 states BOTH directions over ONE 28-FMA list, so mandatory and
          // blocked are true complements and one expression answers both. Unchanged by S145.
          const vntchFma = subformId === 88 && DFO_FMA_NB_VNTCH.has(efFma);
          if (vntchFma && !vntch) errors.push(`${dp}: NB_VNTCH is mandatory for this FMA (Rule 624)`);
          if (!vntchFma && vntch) errors.push(`${dp}: NB_VNTCH is blocked for this FMA/subform (Rule 623)`);
          // NB_VNTCH_YOU — S145 defect 51: mandatory and permitted are DIFFERENT sets here, so the
          // two directions need two tests against two lists. Rule 626 mandates it on its 28 FMAs
          // (DFO_FMA_NB_VNTCH, the QC set); Rule 625 blocks it outside its 47 (DFO_FMA_NB_VNTCH_YOU).
          // The 19 FMAs between the two — NL LFA 01-14c — are OPTIONAL: neither test fires, so the
          // element may be present or absent and this validator says nothing either way. One
          // expression cannot answer both questions once the sets diverge; it would be wrong in one
          // direction whichever way it was written.
          const vntchYouMandatory = DFO_FMA_NB_VNTCH.has(efFma);
          const vntchYouPermitted = DFO_FMA_NB_VNTCH_YOU.has(efFma);
          if (vntchYouMandatory && !vntchYou) errors.push(`${dp}: NB_VNTCH_YOU is mandatory for this FMA (Rule 626)`);
          if (!vntchYouPermitted && vntchYou) errors.push(`${dp}: NB_VNTCH_YOU is blocked for this FMA (Rule 625)`);
          // Rule 3059: MAR(90) — LAT/LONG mandatory in FMA 38b (28599), blocked otherwise
          const hasLat = get(ed, 'LAT').length > 0;
          const hasLong = get(ed, 'LONG').length > 0;
          if (subformId === 90 && efFma === 28599 && (!hasLat || !hasLong)) {
            errors.push(`${dp}: LAT and LONG are mandatory for MAR FMA 38b (Rule 3059)`);
          }
          if (subformId === 90 && efFma !== 28599 && (hasLat || hasLong)) {
            errors.push(`${dp}: LAT/LONG are blocked outside MAR FMA 38b (Rule 3059)`);
          }
          // Subforms_requirements rows 82/83 (S110 G1): LAT/LONG Mandatory for QC(88)/GLF(89),
          // Blocked for NL(91). MAR is governed by Rule 3059 above.
          if ((subformId === 88 || subformId === 89) && (!hasLat || !hasLong)) {
            errors.push(`${dp}: LAT and LONG are mandatory for subform ${subformId} (rows 82/83)`);
          }
          if (subformId === 91 && (hasLat || hasLong)) {
            errors.push(`${dp}: LAT/LONG are blocked for NL(91) (rows 82/83)`);
          }
          // Rules 653/654/655: NB_SPCMN_BRD — lobster in MAR 38b only
          get(ed, 'CATCH').forEach((c, ci) => {
            const specie = get(c, 'SPECIE_ID')[0]?.text ?? '';
            const brd = get(c, 'NB_SPCMN_BRD').length > 0;
            const brdAllowed = subformId === 90 && efFma === 28599 && specie === '1312';
            if (brdAllowed && !brd) {
              errors.push(`${dp}.CATCH[${ci + 1}]: NB_SPCMN_BRD is mandatory for lobster in MAR FMA 38b (Rule 654)`);
            }
            if (!brdAllowed && brd) {
              errors.push(`${dp}.CATCH[${ci + 1}]: NB_SPCMN_BRD is blocked outside lobster/MAR FMA 38b (Rules 653/655)`);
            }
            // KEPT_WT (Rules 631 + 2020): MANDATORY on a lobster CATCH. Rule 631 makes the kept
            // weight mandatory whenever the species caught is lobster (1312); Rule 2020 closes
            // the no-catch case — "the fisher must enter 0 in the quantity kept" — so a zero is
            // typed, never an absence. S143 defect 53: the close gate has demanded this since
            // S140 P3 but the send gate had no direction at all.
            // Keyed on the SPECIES, deliberately NOT on CATCH_SPEC's min: Rule 978a BLOCKS
            // KEPT_WT for non-lobster/non-crab species on subforms 88 and 91, so a blanket
            // min:1 would be wrong the moment a non-lobster CATCH node exists. Same shape as
            // the Rule 654 check above.
            if (specie === '1312' && get(c, 'KEPT_WT').length === 0) {
              errors.push(`${dp}.CATCH[${ci + 1}]: KEPT_WT is mandatory for a lobster catch (Rules 631/2020)`);
            }
            // NB_SPCMN_KEPT / NB_SPCMN_DISC: blocked for MAR(90) per subforms
            // requirements v234.11 (Kane, Session 56); the generator never emits them.
            if (subformId === 90 && get(c, 'NB_SPCMN_KEPT').length > 0) {
              errors.push(`${dp}.CATCH[${ci + 1}]: NB_SPCMN_KEPT is blocked for MAR(90)`);
            }
            if (subformId === 90 && get(c, 'NB_SPCMN_DISC').length > 0) {
              errors.push(`${dp}.CATCH[${ci + 1}]: NB_SPCMN_DISC is blocked for MAR(90)`);
            }
            // NB_SPCMN_KEPT (S110 Phase 2): blocked for QC(88)/GLF(89) too (Subforms row 93);
            // NL(91) — mandatory on the lobster catch (Rule 976), blocked on any
            // non-lobster catch (Rule 977).
            const kept = get(c, 'NB_SPCMN_KEPT').length > 0;
            if ((subformId === 88 || subformId === 89) && kept) {
              errors.push(`${dp}.CATCH[${ci + 1}]: NB_SPCMN_KEPT is blocked for subform ${subformId} (row 93)`);
            }
            if (subformId === 91 && specie === '1312' && !kept) {
              errors.push(`${dp}.CATCH[${ci + 1}]: NB_SPCMN_KEPT is mandatory for NL lobster catches (Rule 976)`);
            }
            if (subformId === 91 && specie !== '1312' && kept) {
              errors.push(`${dp}.CATCH[${ci + 1}]: NB_SPCMN_KEPT is blocked for non-lobster catches (Rule 977)`);
            }
          });
        });
      });
    });

    // ── Rules 2024/2025 (S142 defect 52): the hail groups on a MAR-90 38b/41 logbook ──
    // "If the logbook is Subform_id: 90 MAR_Lobster and includes a fishing effort made in
    //  fishing area 38b (Effort.Fma_id=28599) or in fishing area 41 (Effort.Fma_id=1595)
    //  then the logbook must include at least one occurrence of the data group HLIN
    //  [HLOUT]. Otherwise, data group HLIN [HLOUT] must be blocked."
    //    — FS-NAT-234-12-EN L243-252 / FS-NAT-234-12-FR L257-268
    //
    // The close gate has enforced this since 247f9c5 — specifically the whole-log Close &
    // Save All door at FullDfoForm.tsx:3611-3618, which on a MAR-90 log with hailRequired
    // (= fishesHailArea) runs missingInContainer('hlin'/'hlout') and refuses on blank
    // fields. (requiredGroups() in the shared table answers the same question for the
    // COMPLETION METER, dfoLogStorage.ts:800 — it is not what the close door calls.)
    // This is that door's send-side twin: the close gate reads the app's data map, so a log
    // that reached the send by any other route was never asked the question. The XSD cannot
    // catch it either — HLIN/HLOUT are minOccurs="0" there (mirrored in TRIP_SPEC), because
    // a schema has no way to say "unless the log fished 38b".
    //
    // The condition is single-sourced with the close gate at the level of the FMA SET:
    // fishesHailArea() takes the data map and cannot be called on parsed XML, so both gates
    // share DFO_FMA_HLIN_REQUIRED instead — ONE definition of {28599, 1595}, never a local
    // comparison. Note this is the 38b-OR-41 set: fishes38b (38b only) serves Rules 660/661
    // and would let an LFA-41-only trip through.
    const hailFma = efforts.some(ef =>
      DFO_FMA_HLIN_REQUIRED.has(Number(get(ef, 'FMA_ID')[0]?.text ?? 0)));
    const hailRequired = subformId === 90 && hailFma;
    ([['HLIN', 'Rule 2024'], ['HLOUT', 'Rule 2025']] as const).forEach(([group, rule]) => {
      const count = get(trip, group).length;
      if (hailRequired && count === 0) {
        errors.push(`${p}: ${group} is required on a MAR(90) logbook with a fishing effort in FMA 38b or 41 (${rule})`);
      }
      // The blocked direction of the same sentence: no qualifying effort (or a non-MAR
      // subform, where the requirements matrix marks both groups Blocked) means the group
      // must not appear at all. The generator's own gate already prevents this; the
      // validator says so about the bytes.
      if (!hailRequired && count > 0) {
        errors.push(`${p}: ${group} is blocked on subform ${subformId} without a fishing effort in FMA 38b or 41 (${rule})`);
      }
    });

    // A completed fishing day with effort + catch must record a landing. The generator
    // gates the whole <LANDING> node on a present landing time (if (landDt)); with the
    // Session 76 blank-time hardening a blank landingTime drops the node entirely, and
    // LANDING is min:0 in TRIP_SPEC so the structural walk stays silent. Backstop it:
    // effort+catch present but no LANDING node → error. (handleSave's S75 required-field
    // check guards the normal save path; this covers draft-load / import / future callers.)
    const hasEffortWithCatch = efforts.some(ef =>
      get(ef, 'EFFORT_BY_GEAR').some(ebg =>
        get(ebg, 'EFFORT_DETAIL').some(ed => get(ed, 'CATCH').length > 0)));
    if (hasEffortWithCatch && get(trip, 'LANDING').length === 0) {
      errors.push(`${p}: LANDING is required when effort and catch are present`);
    }

    // Rules 45/46: landing must follow trip start and the last effort end
    get(trip, 'LANDING').forEach((l, li) => {
      const landStart = get(l, 'START_DT')[0]?.text ?? '';
      if (isDate12(landStart) && isDate12(tripStart) && landStart < tripStart) {
        errors.push(`${p}.LANDING[${li + 1}]: START_DT is before TRIP.START_DT (Rule 45)`);
      }
      if (isDate12(landStart) && isDate12(lastEffortEnd) && landStart < lastEffortEnd) {
        errors.push(`${p}.LANDING[${li + 1}]: START_DT is before the last EFFORT.END_DT (Rule 46)`);
      }
      // Rules 641/642: LANDING.VRN mandatory iff USE_CR_IND='Y', blocked otherwise
      const landVrn = get(l, 'VRN').length > 0;
      const carrierYes = useCr?.text === 'Y';
      if (carrierYes && !landVrn) errors.push(`${p}.LANDING[${li + 1}]: VRN is required when USE_CR_IND='Y' (Rule 642)`);
      if (!carrierYes && landVrn) errors.push(`${p}.LANDING[${li + 1}]: VRN is blocked when USE_CR_IND is not 'Y' (Rule 641)`);
    });

    // TRANSFER: QC(88) only (blocked for 89/90/91); Rules 248/249/250/251/252
    const transfers = get(trip, 'TRANSFER');
    if (subformId !== 88 && transfers.length > 0) {
      errors.push(`${p}: TRANSFER is blocked for subform ${subformId}`);
    }
    transfers.forEach((tr, tri) => {
      const tp = `${p}.TRANSFER[${tri + 1}]`;
      const trnsfDt = get(tr, 'TRNSF_DT')[0]?.text ?? '';
      if (isDate12(trnsfDt) && isDate12(tripStart) && trnsfDt < tripStart) {
        errors.push(`${tp}: TRNSF_DT is before TRIP.START_DT (Rule 248)`);
      }
      const fromCount = get(tr, 'FROM_VRN').length + get(tr, 'FROM_PND_NUM').length;
      if (fromCount !== 1) errors.push(`${tp}: exactly one of FROM_VRN or FROM_PND_NUM is required (Rule 251)`);
      const toCount = get(tr, 'TO_VRN').length + get(tr, 'TO_PND_NUM').length;
      if (toCount !== 1) errors.push(`${tp}: exactly one of TO_VRN or TO_PND_NUM is required (Rule 252)`);
      get(tr, 'TRANSFER_DTL').forEach((dtl, di) => {
        const sp = get(dtl, 'SPECIE_ID')[0]?.text;
        if (sp !== '1312') errors.push(`${tp}.TRANSFER_DTL[${di + 1}]: SPECIE_ID must be 1312 (Rule 249)`);
        const frm = get(dtl, 'SPECIE_FRM_ID')[0]?.text;
        if (frm !== '4691') errors.push(`${tp}.TRANSFER_DTL[${di + 1}]: SPECIE_FRM_ID must be 4691 (Rule 250)`);
      });
    });

    // PCONS.SPECIE_SZ_ID: blocked for MAR(90) per subforms requirements v234.11
    // (Kane, Session 56). Optional in the XSD; the generator omits it for MAR.
    if (subformId === 90) {
      get(trip, 'PCONS').forEach((pc, pci) => {
        if (get(pc, 'SPECIE_SZ_ID').length > 0) {
          errors.push(`${p}.PCONS[${pci + 1}]: SPECIE_SZ_ID is blocked for MAR(90)`);
        }
      });
    }
    // PCONS.SPECIE_SZ_ID, remaining subforms: Mandatory for GLF(89) ONLY; Blocked for
    // QC(88)/NL(91) per Subforms_requirements_234.xlsx row 56 (Session 59 recon — the
    // sheet is stricter than the XSD, which lists it optional; overturns the earlier
    // 88/89/91-emit ruling). Completes the per-subform overlay alongside the MAR(90)
    // block above; the generator now emits SPECIE_SZ_ID only for 89.
    get(trip, 'PCONS').forEach((pc, pci) => {
      const hasSz = get(pc, 'SPECIE_SZ_ID').length > 0;
      if (subformId === 89 && !hasSz) {
        errors.push(`${p}.PCONS[${pci + 1}]: SPECIE_SZ_ID is mandatory for GLF(89)`);
      }
      if ((subformId === 88 || subformId === 91) && hasSz) {
        errors.push(`${p}.PCONS[${pci + 1}]: SPECIE_SZ_ID is blocked for subform ${subformId}`);
      }
    });

    // LANDING.PORT_ID is XSD-mandatory for ALL subforms — the DFO endpoint will reject
    // a LANDING without it, so the validator must block the send rather than green-light
    // a document xmllint rejects
    get(trip, 'LANDING').forEach((l, li) => {
      if (get(l, 'PORT_ID').length === 0) {
        errors.push(
          `${p}.LANDING[${li + 1}]: PORT_ID required — open question 4 (port codes) ` +
          `must be resolved before this subform can transmit.`
        );
      }
    });
  });

  return { valid: errors.length === 0, errors };
}

// Rule 33: the period covered by one fishing effort must not overlap the period of
// another previously entered fishing effort UNDER THE SAME LICENCE. S136: per-effort —
// every effort of the current log is checked against every other effort, both WITHIN the
// current log and across every saved log. Windows use each effort's own dates (the S90
// companion-date fallback, matching the emit — pre-S136 this read only dateFished, so a
// midnight-crossing window was mis-measured; pre-send check only, no byte impact).
// Licence: an effort's blank licNo means the profile licence, so blank compares equal to
// blank (legacy logs all compare as one licence — unchanged behavior). Returns the
// conflicting log's id (the current log's own id for a within-log overlap), or null.
export function findEffortOverlap(current: DfoLog, all: DfoLog[]): string | null {
  const windows = (l: DfoLog): { s: number; e: number; lic: string }[] =>
    effortsFromData(l.data ?? {}).flatMap(ef => {
      const s = Date.parse(localToUtcIso(ef.haulStartDate || l.dateFished, ef.haulStartTime ?? ''));
      const e = Date.parse(localToUtcIso(ef.haulEndDate || l.dateFished, ef.haulEndTime ?? ''));
      return isNaN(s) || isNaN(e) || e <= s ? [] : [{ s, e, lic: ef.licNo || '' }];
    });
  const overlaps = (a: { s: number; e: number; lic: string }, b: { s: number; e: number; lic: string }) =>
    a.lic === b.lic && a.s < b.e && b.s < a.e;
  const cur = windows(current);
  if (cur.length === 0) return null;
  // Within-log: any two of the current log's own efforts overlapping (same licence)
  for (let i = 0; i < cur.length; i++) {
    for (let j = i + 1; j < cur.length; j++) {
      if (overlaps(cur[i], cur[j])) return current.id;
    }
  }
  for (const other of all) {
    if (other.id === current.id) continue;
    for (const w of windows(other)) {
      if (cur.some(c => overlaps(c, w))) return other.id;
    }
  }
  return null;
}

// --- DFO Web Service transmission (ELOG_Web_Service_3_6_Eng.pdf §3.1 SaveIncomingFile) ---

// UTF-8 string → base64. All three SaveIncomingFile params are base64 (guide §3.1.2.1).
function toBase64(s: string): string {
  return forge.util.encode64(forge.util.encodeUtf8(s));
}

// SOAP 1.1 — HTTP POST, Content-Type: text/xml; charset=utf-8, plus this SOAPAction header
export const DFO_SOAP_ACTION_SAVE = 'http://www.dfo-mpo.gc.ca/SaveIncomingFile';

// DFO UAT (test) web-service endpoint — the live .asmx hit successfully in Session 53
// (SaveIncomingFile → WS0000, CONF 162836). Production URL still pending from DFO.
// Single source of truth; imported by DfoLogsListScreen + DfoTestHarnessScreen.
export const DFO_UAT_ENDPOINT = 'https://inter-w01-uat.dfo-mpo.gc.ca/ws/ElogXMLFileTransfer/ElogXMLFileTransfer.asmx';

// S128 Phase 2(a): a DFO licence number is CHAR(18) in the XML data dictionary (LIC_NO,
// ELEMENT_ID 307 — legend "Char = Alphanumeric characters"): alphanumeric, 1–18 chars.
// Derived from LIC_NO's own definition, NOT copied from the VRN pattern (which is 1–12).
// Exported for the licence inputs (DfoSetupScreen / CaptainProfileScreen) and used as the
// §3.10 file-name backstop below.
export function isValidDfoLicence(s: string): boolean {
  return /^[A-Za-z0-9]{1,18}$/.test(s);
}

// XML file name per Standard v6.1 §3.10: [RegionalID]-[LicenceNumber]-[YYYYMMDDHHMMSS].XML
// Timestamp is generation time, UTC, 14 digits, no separators. Uncompressed .XML (no 7z).
export function generateDfoXmlFileName(regId: number, licenceNo: string, when: Date = new Date()): string {
  // S128 Phase 2(b): NEVER emit a name that violates §3.10 — the dash is the field SEPARATOR,
  // so a dash (or any non-alphanumeric) in the licence, or a non-numeric Regional ID, breaks
  // the three-field structure. Founder ruling: REJECT (block the send), never silently strip
  // (a mangled licence would misidentify the file). This is a backstop for already-stored
  // pre-validator values; the licence inputs reject bad characters at entry.
  if (!Number.isInteger(regId) || regId <= 0) {
    throw new Error(`Cannot build DFO file name: invalid Regional ID "${regId}".`);
  }
  if (!isValidDfoLicence(licenceNo)) {
    throw new Error(
      `Cannot build DFO file name: licence number "${licenceNo}" must be letters and digits only ` +
      `(maximum 18 characters). Correct it in your Captain Profile before sending.`
    );
  }
  const p = (n: number) => String(n).padStart(2, '0');
  const ts =
    `${when.getUTCFullYear()}${p(when.getUTCMonth() + 1)}${p(when.getUTCDate())}` +
    `${p(when.getUTCHours())}${p(when.getUTCMinutes())}${p(when.getUTCSeconds())}`;
  return `${regId}-${licenceNo}-${ts}.XML`;
}

// S128 Phase 3: the file name's only varying field is a UTC timestamp at SECOND resolution,
// so two sends in the same second from one account collide (observed live S112; WS1034 can't
// be relied on to catch it). §3.10 mandates EXACTLY three fields, so uniqueness can't be an
// appended token — instead advance the generation second until the name is not already used
// by this account. `usedNames` = every file name in this account's transmission register
// (successes AND failures; the register is the ONLY local store that records file names —
// XmlArchiveEntry does not). The register is a bounded, finite set, so this resolves in a
// couple of steps in practice; the loop cap is a pure runaway backstop. The first build also
// applies the Phase 2 §3.10 guard (throws on a bad licence / Regional ID).
export function generateUniqueDfoXmlFileName(
  regId: number,
  licenceNo: string,
  usedNames: Iterable<string>,
  when: Date = new Date(),
): string {
  const used = usedNames instanceof Set ? usedNames : new Set(usedNames);
  let ms = when.getTime();
  for (let step = 0; step < 100000; step++) {
    const name = generateDfoXmlFileName(regId, licenceNo, new Date(ms));
    if (!used.has(name)) return name;
    ms += 1000; // bump one second and try again
  }
  // Unreachable in practice (every second for >24h taken); prefer the base name to looping.
  return generateDfoXmlFileName(regId, licenceNo, when);
}

// SOAP 1.1 envelope invoking SaveIncomingFile. Auth is the ELOG key alone;
// CIE_ID and SOFT_VER travel only inside the ELOG XML (GENERAL_INFO), never the envelope.
// Base64 values are XML-safe, so no escaping is needed.
// Live UAT WSDL (fetched June 13, 2026) overrides this to http://www.dfo-mpo.gc.ca —
// using the WSDL value since that's what the running service enforces. Discrepancy with
// guide §3.1.2.2.1 noted for follow-up with Kane.
export function buildSaveIncomingFileEnvelope(elogKey: string, fileName: string, xmlBody: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <SaveIncomingFile xmlns="http://www.dfo-mpo.gc.ca">
      <p_elogkey>${toBase64(elogKey)}</p_elogkey>
      <p_filename>${toBase64(fileName)}</p_filename>
      <p_body>${toBase64(xmlBody)}</p_body>
    </SaveIncomingFile>
  </soap:Body>
</soap:Envelope>`;
}

// elogKey = harvester key issued by DFO (stored in secure storage, never hardcoded)
// fileName from generateDfoXmlFileName() — the service validates it server-side
export function generateSoapEnvelope(elogXml: string, elogKey: string, fileName: string): string {
  return buildSaveIncomingFileEnvelope(elogKey, fileName, elogXml);
}

// --- ValidateElogKey (guide §3.2) — read-only ELOG key check, no XML document ---

export const DFO_SOAP_ACTION_VALIDATE = 'http://www.dfo-mpo.gc.ca/ValidateElogKey';

// §3.2.1: the key must be uppercase before base64 (lowercase encodes differently and the
// service rejects it), and must be at least 24 characters.
export function buildValidateElogKeyEnvelope(elogKey: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ValidateElogKey xmlns="http://www.dfo-mpo.gc.ca">
      <p_elogkey>${toBase64(elogKey.trim().toUpperCase())}</p_elogkey>
    </ValidateElogKey>
  </soap:Body>
</soap:Envelope>`;
}

// Error-code messages from guide §4 (the codes ValidateElogKey can return)
const VALIDATE_KEY_MESSAGES: Record<string, string> = {
  WS1001: 'ELOG key not provided in the SOAP statement',
  WS1003: 'ELOG key not found in the DFO database',
  WS1031: 'DFO Web service is out of order, please retry later',
  WS1036: 'A problem occurred while decoding the base64 string of the ELOG key',
};

// §3.2.3: response is a WS_RESP doc with only <ERR>; the key is valid iff ERR = WS1000.
// As with SaveIncomingFile, the doc usually arrives XML-escaped inside the SOAP result.
export function parseValidateElogKeyResponse(text: string): {
  valid: boolean;
  errorCode?: string;
  errorMessage?: string;
} {
  if (/<(soap:)?Fault[\s>]/i.test(text)) {
    const msg = text.match(/<faultstring[^>]*>([\s\S]*?)<\/faultstring>/i)?.[1]?.trim();
    return { valid: false, errorCode: 'SOAP_FAULT', errorMessage: msg ?? 'SOAP fault' };
  }
  let body = text;
  if (!/<WS_RESP>/i.test(body) && /&lt;WS_RESP&gt;/i.test(body)) {
    body = body
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  }
  const err = body.match(/<ERR\s*>\s*([^<]*)<\/\s*ERR\s*>/i)?.[1]?.trim();
  if (err === 'WS1000') return { valid: true };
  if (err) return { valid: false, errorCode: err, errorMessage: VALIDATE_KEY_MESSAGES[err] ?? `DFO Web Service error ${err}` };
  return { valid: false, errorCode: 'NO_WS_RESP', errorMessage: 'No WS_RESP document in response' };
}
