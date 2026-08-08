// DFO Form 222 — Marine Mammal Interaction Report
// Generator, validator, and AsyncStorage persistence (3-year retention)

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CaptainProfile } from './captainStorage';
import { buildSaveIncomingFileEnvelope, toCloseTimestamp } from './dfoXmlGenerator';
import { DFO_CIE_ID, DFO_SOFT_VER, clampCoord4 } from './dfoConstants';
import { MV_NOAA_MM_SPECIES, MV_INCIDENT_TYPE, MV_CONFIDENCE_LEVEL, MV_MM_SPECIMENS_CONDITION, MV_MM_LENGTH_CATEGORY } from '../data/reftables';
import { dfoKey, DFO_STORE_BASES } from './dfoStorageKeys';

const THREE_YEARS_MS = 94608000000;

// XSD 39588.222: FORM_VER_ID for the Marine Mammal Interaction form
export const DFO_FORM_VER_ID_222 = 222;

// Real NOAA species codes from MV_NOAA_MM_SPECIES_rel3 (generated reftable) — the
// XSD element is NOAA_SPECIE_COD, keyed by NOAA_SPECIES_CODE (not a DFO CODE_ID).
export const MARINE_MAMMAL_SPECIES: { label: string; codeId: string }[] =
  MV_NOAA_MM_SPECIES.map(s => ({ label: s.descEn, codeId: s.noaaCode }));

export const MARINE_MAMMAL_SPECIES_LABELS: string[] = MARINE_MAMMAL_SPECIES.map(s => s.label);

// Real incident type codes from MV_INCIDENT_TYPE_rel4 (generated reftable) —
// emitted as MM_INTER_INCDNT.INCDNT_TYP_ID (the old E/V/O codes were invented).
export const INTERACTION_TYPES: { label: string; codeId: string }[] =
  MV_INCIDENT_TYPE.map(t => ({ label: t.descEn, codeId: String(t.codeId) }));

export const INTERACTION_TYPE_LABELS: string[] = INTERACTION_TYPES.map(t => t.label);

// Species-identification confidence — MV_CONFIDENCE_LEVEL → MM_INTER.ID_CNFDNCE_ID (opt).
export const CONFIDENCE_LEVELS: { label: string; codeId: string }[] =
  MV_CONFIDENCE_LEVEL.map(c => ({ label: c.descEn, codeId: String(c.codeId) }));
export const CONFIDENCE_LEVEL_LABELS: string[] = CONFIDENCE_LEVELS.map(c => c.label);

// Specimen condition — MV_MM_SPECIMENS_CONDITION → MM_INTER.SPCMN_COND_ID (opt). NOTE: this
// is the marine-mammal condition table, NOT the SAR-side MV_SPECIMENS_CONDITION.
export const SPECIMEN_CONDITIONS: { label: string; codeId: string }[] =
  MV_MM_SPECIMENS_CONDITION.map(c => ({ label: c.descEn, codeId: String(c.codeId) }));
export const SPECIMEN_CONDITION_LABELS: string[] = SPECIMEN_CONDITIONS.map(c => c.label);

// Body length category — MV_MM_LENGTH_CATEGORY → MM_INTER.BDY_LEN_ID (opt).
export const LENGTH_CATEGORIES: { label: string; codeId: string }[] =
  MV_MM_LENGTH_CATEGORY.map(c => ({ label: c.descEn, codeId: String(c.codeId) }));
export const LENGTH_CATEGORY_LABELS: string[] = LENGTH_CATEGORIES.map(c => c.label);

// MV_INCIDENT_TYPE codes the legacy Y/N indicator fields map onto
const INCDNT_DEAD_ANIMAL = '39609';
const INCDNT_ENTANGLEMENT = '39610';
const INCDNT_SICK_OR_INJURED = '39615';

export interface Form222Entry {
  uid: string;
  savedAt: number;
  // Master toggle — when N, no interaction occurred and all detail fields are empty
  interactInd: 'Y' | 'N';
  // Detail fields (required when interactInd = Y)
  reportDate: string;       // YYYY-MM-DD — date report was filed
  interactionDate: string;  // YYYY-MM-DD — date of interaction
  interactionTime: string;  // HH:MM — time of interaction (local)
  lat: string;              // decimal degrees N
  lon: string;              // decimal degrees W (negative)
  speciesLabel: string;     // human-readable label → codeId via MARINE_MAMMAL_SPECIES
  nbAnimals: string;
  interactionTypeLabel: string; // human-readable label → codeId via INTERACTION_TYPES
  injuryInd: 'Y' | 'N';
  deathInd: 'Y' | 'N';
  entangleInd: 'Y' | 'N';
  releaseInd: 'Y' | 'N';    // meaningful only when entangleInd = Y
  gearDamageInd: 'Y' | 'N';
  observerNm: string;
  contactInfo: string;
  remarks: string;           // optional free-text
  // Form 222 T6 free-text fields (XSD 39588.222, all string_150, minOccurs=0). Session 111.
  // Stored as raw text (not codeIds) — additive optional fields; old entries parse unchanged.
  siteDsc?: string;      // → MM_INTER.SITE_DSC        (Location / Emplacement)
  gearDmgRem?: string;   // → MM_INTER.GEAR_DMG_REM    (Remark (lost gear) / Remarque (dommages))
  docRem?: string;       // → MM_INTER.DOC_REM         (Remark / Remarque)
  eventDsc?: string;     // → MM_INTER.EVENT_DSC       (Event description / Description de l'évènement)
  incdntRem?: string;    // → MM_INTER_INCDNT.INCDNT_REM (Remark (Incident type) / Remarque (type d'incident))
  // Optional MM_INTER detail (XSD minOccurs=0) — human-readable labels resolved to codeIds
  // via CONFIDENCE_LEVELS / SPECIMEN_CONDITIONS / LENGTH_CATEGORIES at emit.
  confidenceLabel?: string;   // → ID_CNFDNCE_ID
  specimenCondLabel?: string; // → SPCMN_COND_ID
  lengthCatLabel?: string;    // → BDY_LEN_ID
  // XSD MM_INTER.LGBK_NUM_REF (string_15, mandatory): logbook number the marine
  // mammal interaction report refers to — prefilled with the related log's LGBK_UID
  lgbkNumRef?: string;
  // S125 7b: the real user-caused close timestamp (ISO), stamped at Close & Save. The generator
  // emits DG_CLOSE_DT from THIS (via toCloseTimestamp) instead of stamping now(). Optional +
  // additive — absent → toCloseTimestamp falls back to now (old records/tests unaffected).
  closeDt?: string;
  // S125 7a: lifecycle status, mirroring DfoLog.status. Optional + additive — records saved
  // before this field back-fill to 'complete' at load (they are all sent).
  status?: 'draft' | 'complete';
  sentToDfo: boolean;
  sentAt?: number;
}

export function generateForm222Uid(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let uid = '';
  for (let i = 0; i < 6; i++) uid += chars.charAt(Math.floor(Math.random() * chars.length));
  return uid;
}

export async function saveForm222Entry(entry: Form222Entry): Promise<void> {
  const existing = await loadForm222Entries();
  const cutoff = Date.now() - THREE_YEARS_MS;
  const filtered = existing.filter(e => e.uid !== entry.uid && e.savedAt > cutoff);
  await AsyncStorage.setItem(dfoKey(DFO_STORE_BASES.form222_entries), JSON.stringify([...filtered, entry]));
}

export async function loadForm222Entries(): Promise<Form222Entry[]> {
  try {
    const raw = await AsyncStorage.getItem(dfoKey(DFO_STORE_BASES.form222_entries));
    if (!raw) return [];
    const entries = JSON.parse(raw) as Form222Entry[];
    // S125 7a: back-fill status/sentToDfo for records saved before drafts existed (every such
    // record is a completed send → 'complete'), mirroring dfoLogStorage.loadAllLogs. Sort
    // newest-first so 7c's list and the 7a "re-open restores the most recent draft" path are
    // ordered. No migration — the on-disk shape is only rewritten on the next save/delete.
    return entries
      .map(e => ({ ...e, status: e.status ?? ('complete' as const), sentToDfo: e.sentToDfo ?? false }))
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

// S125 7a: load one entry by uid (mirrors dfoLogStorage.loadLogById). Used by 7c's
// resume-from-list; added now so the store's read surface is complete.
export async function loadForm222EntryByUid(uid: string): Promise<Form222Entry | null> {
  const all = await loadForm222Entries();
  return all.find(e => e.uid === uid) ?? null;
}

// S125 7a: delete one entry by uid (mirrors dfoLogStorage.deleteLog). Used by 7c/Phase 8
// (draft discard / delete). Rewrites the array without the uid.
export async function deleteForm222Entry(uid: string): Promise<void> {
  const existing = await loadForm222Entries();
  await AsyncStorage.setItem(
    dfoKey(DFO_STORE_BASES.form222_entries),
    JSON.stringify(existing.filter(e => e.uid !== uid)),
  );
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function tag(name: string, value: string, indent: string = '  '): string {
  if (!value || !value.trim()) return '';
  return `${indent}<${name}>${xmlEscape(value.trim())}</${name}>\n`;
}

// XSD date_8 = YYYYMMDD for REP_DATE
function toDate8(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
  return dateStr.replace(/-/g, '');
}

// XSD date_12 = YYYYMMDDHHMM for INTERACT_DT (local date + HH:MM time as entered)
function toDate12(dateStr: string, timeStr: string): string {
  const d8 = toDate8(dateStr);
  if (!d8) return '';
  const hhmm = /^\d{1,2}:\d{2}$/.test(timeStr) ? timeStr.replace(':', '').padStart(4, '0') : '0000';
  return d8 + hhmm;
}

// XSD 39588.222: ELOG → GENERAL_INFO + MM_INTER[] → MM_INTER_INCDNT[].
// The legacy INJURY/DEATH/ENTANGLE Y/N indicators have no XSD elements — they map
// onto MM_INTER_INCDNT incident nodes; RELEASE_IND has no equivalent and is folded
// into REM as free text.
export function generateForm222Xml(entry: Form222Entry, profile: CaptainProfile): string {
  const regId = profile.regId ?? 1004;

  let gi = '  <GENERAL_INFO>\n';
  gi += tag('CIE_ID',      DFO_CIE_ID, '    ');
  gi += tag('SOFT_VER',    DFO_SOFT_VER, '    ');
  gi += tag('REG_ID',      String(regId), '    ');
  gi += tag('FIN',         profile.licenceHolderFin, '    ');     // mandatory in F222
  gi += tag('VRN',         profile.vesselNumber, '    '); // mandatory in F222
  gi += tag('FORM_VER_ID', String(DFO_FORM_VER_ID_222), '    ');
  gi += '  </GENERAL_INFO>\n';

  let mm = '  <MM_INTER>\n';
  // REP_DATE is mandatory for both Y and N reports
  mm += tag('REP_DATE', toDate8(entry.reportDate) || toCloseTimestamp().slice(0, 8), '    ');
  mm += tag('INTERACT_IND', entry.interactInd, '    ');

  if (entry.interactInd === 'Y') {
    mm += tag('INTERACT_DT', toDate12(entry.interactionDate, entry.interactionTime), '    ');
    // SITE_DSC (string_150, opt) — XSD sequence: after INTERACT_DT, before LAT.
    mm += tag('SITE_DSC', entry.siteDsc ?? '', '    ');
    // LAT/LONG: typed manually on this form → MODE="M" (Standard v6.1 §11.3).
    // Clamped to ≤4 decimals at emit (XSD LAT/LONG types) to avoid WS1038.
    if (entry.lat.trim()) mm += `    <LAT MODE="M">${xmlEscape(clampCoord4(entry.lat))}</LAT>\n`;
    if (entry.lon.trim()) mm += `    <LONG MODE="M">${xmlEscape(clampCoord4(entry.lon))}</LONG>\n`;
    mm += tag('NAME', entry.observerNm, '    ');
    mm += tag('ADDR', entry.contactInfo, '    ');
    // Interaction occurred during a lobster fishing operation
    mm += tag('TGT_SPECIE_ID', '1312', '    ');
    mm += tag('GEAR_ID', '925', '    ');
  }

  mm += tag('LGBK_NUM_REF', entry.lgbkNumRef || profile.fishingNumber, '    ');

  if (entry.interactInd === 'Y') {
    const specie = MARINE_MAMMAL_SPECIES.find(s => s.label === entry.speciesLabel);
    // Optional trio (XSD minOccurs=0); resolve label → codeId, tag() omits when unset.
    // XSD sequence: NOAA_SPECIE_COD → ID_CNFDNCE_ID → SPCMN_COND_ID → NB_SPCMN_BEST → BDY_LEN_ID.
    const conf = CONFIDENCE_LEVELS.find(c => c.label === entry.confidenceLabel);
    const cond = SPECIMEN_CONDITIONS.find(c => c.label === entry.specimenCondLabel);
    const len  = LENGTH_CATEGORIES.find(c => c.label === entry.lengthCatLabel);
    mm += tag('GEAR_DMG_IND', entry.gearDamageInd, '    ');
    // GEAR_DMG_REM (string_150, opt) — XSD sequence: after the gear indicators (…CAUS_KNOWN_IND), before NOAA_SPECIE_COD.
    mm += tag('GEAR_DMG_REM', entry.gearDmgRem ?? '', '    ');
    mm += tag('NOAA_SPECIE_COD', specie?.codeId ?? '', '    ');
    mm += tag('ID_CNFDNCE_ID', conf?.codeId ?? '', '    ');
    mm += tag('SPCMN_COND_ID', cond?.codeId ?? '', '    ');
    mm += tag('NB_SPCMN_BEST', entry.nbAnimals, '    ');
    // DOC_REM (string_150, opt) — XSD sequence: after the documentation indicators (…OTHR_DOC_IND), before BDY_LEN_ID.
    mm += tag('DOC_REM', entry.docRem ?? '', '    ');
    mm += tag('BDY_LEN_ID', len?.codeId ?? '', '    ');
    // EVENT_DSC (string_150, opt) — XSD sequence: after BDY_LEN, before DG_CLOSE_DT.
    mm += tag('EVENT_DSC', entry.eventDsc ?? '', '    ');
  }

  // S125 7b: DG_CLOSE_DT from the stored close time (Close & Save), not a generation-time now().
  mm += tag('DG_CLOSE_DT', toCloseTimestamp(entry.closeDt), '    ');

  if (entry.interactInd === 'Y') {
    const rem = entry.entangleInd === 'Y'
      ? [entry.remarks.trim(), `Released: ${entry.releaseInd === 'Y' ? 'yes' : 'no'}`].filter(Boolean).join(' — ')
      : entry.remarks;
    mm += tag('REM', rem, '    ');

    // MM_INTER_INCDNT: the selected interaction type plus incidents implied by the
    // legacy Y/N indicators (deduplicated, XSD allows 0..n)
    const codes = new Set<string>();
    const selected = INTERACTION_TYPES.find(t => t.label === entry.interactionTypeLabel);
    if (selected) codes.add(selected.codeId);
    if (entry.entangleInd === 'Y') codes.add(INCDNT_ENTANGLEMENT);
    if (entry.injuryInd === 'Y') codes.add(INCDNT_SICK_OR_INJURED);
    if (entry.deathInd === 'Y') codes.add(INCDNT_DEAD_ANIMAL);
    // INCDNT_REM (string_150, opt) rides the FIRST incident node — the selected
    // interaction type (added to `codes` first, and Set preserves insertion order).
    // XSD sequence within MMinter_incdnt_type: after INCDNT_TYP_ID, before REM.
    Array.from(codes).forEach((code, i) => {
      const incdntRem = i === 0 ? tag('INCDNT_REM', entry.incdntRem ?? '', '      ') : '';
      mm += `    <MM_INTER_INCDNT>\n${tag('INCDNT_TYP_ID', code, '      ')}${incdntRem}    </MM_INTER_INCDNT>\n`;
    });
  }

  mm += '  </MM_INTER>\n';

  return `<?xml version="1.0" encoding="UTF-8"?>\n<ELOG>\n${gi}${mm}</ELOG>`;
}

// Structural check mirroring XSD 39588.222 (nested ELOG/GENERAL_INFO/MM_INTER/
// MM_INTER_INCDNT). Name-based; xmllint against the on-disk XSD remains the authority.
export function validateForm222Xml(
  xml: string,
  tripStartDate?: string, // YYYYMMDD — for Rule 589 cross-check
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const elem = (name: string): string | null => {
    const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`));
    return m ? m[1].trim() : null;
  };
  const isDate8 = (s: string): boolean => /^\d{8}$/.test(s);
  const yyyymmddToDate = (s: string): Date =>
    new Date(parseInt(s.slice(0, 4), 10), parseInt(s.slice(4, 6), 10) - 1, parseInt(s.slice(6, 8), 10));

  if (!/<ELOG>/.test(xml)) errors.push('Missing root element: ELOG');

  // GENERAL_INFO — FIN and VRN are MANDATORY in F222 (unlike Form 234)
  (['GENERAL_INFO', 'CIE_ID', 'SOFT_VER', 'REG_ID', 'FIN', 'VRN', 'FORM_VER_ID'] as const)
    .forEach(name => { if (elem(name) === null) errors.push(`Missing required element: ${name}`); });

  // MM_INTER mandatory members
  (['MM_INTER', 'REP_DATE', 'INTERACT_IND', 'LGBK_NUM_REF', 'DG_CLOSE_DT'] as const)
    .forEach(name => { if (elem(name) === null) errors.push(`Missing required element: ${name}`); });

  const interactInd = elem('INTERACT_IND');
  if (interactInd && !['Y', 'N'].includes(interactInd)) {
    errors.push(`INTERACT_IND must be Y or N, got: ${interactInd}`);
  }

  const repDate = elem('REP_DATE');
  if (repDate !== null && !isDate8(repDate)) errors.push(`REP_DATE must be date_8 YYYYMMDD, got: ${repDate}`);

  const dgClose = elem('DG_CLOSE_DT');
  if (dgClose !== null && !/^\d{14}$/.test(dgClose)) errors.push(`DG_CLOSE_DT must be date_14 YYYYMMDDHHMMSS, got: ${dgClose}`);

  const lgbkRef = elem('LGBK_NUM_REF');
  if (lgbkRef !== null && lgbkRef.length > 15) errors.push(`LGBK_NUM_REF exceeds string_15: ${lgbkRef}`);

  // T6 free-text fields (all string_150, optional) — length backstop mirroring LGBK_NUM_REF.
  (['SITE_DSC', 'GEAR_DMG_REM', 'DOC_REM', 'EVENT_DSC', 'INCDNT_REM'] as const).forEach(name => {
    const v = elem(name);
    if (v !== null && v.length > 150) errors.push(`${name} exceeds string_150: ${v}`);
  });

  // When INTERACT_IND = Y, the detail fields this app always collects are required
  if (interactInd === 'Y') {
    (['INTERACT_DT', 'LAT', 'LONG', 'NAME', 'ADDR', 'NOAA_SPECIE_COD', 'NB_SPCMN_BEST',
      'GEAR_DMG_IND', 'MM_INTER_INCDNT', 'INCDNT_TYP_ID'] as const)
      .forEach(name => { if (elem(name) === null) errors.push(`Missing required element: ${name}`); });

    const interactDt = elem('INTERACT_DT');
    if (interactDt !== null && !/^\d{12}$/.test(interactDt)) {
      errors.push(`INTERACT_DT must be date_12 YYYYMMDDHHMM, got: ${interactDt}`);
    }

    // Date cross-validations (Rules 566/589/590/591/592) on the date_8 portions
    const intD8 = interactDt?.slice(0, 8) ?? '';
    if (repDate && isDate8(repDate) && isDate8(intD8)) {
      const repD = yyyymmddToDate(repDate);
      const intD = yyyymmddToDate(intD8);
      if (repD < intD) errors.push(`Rule 566/590: REP_DATE (${repDate}) must not be before INTERACT_DT (${intD8})`);
      if (intD > repD) errors.push(`Rule 591: INTERACT_DT (${intD8}) must not be after REP_DATE (${repDate})`);
      if (tripStartDate && isDate8(tripStartDate) && intD < yyyymmddToDate(tripStartDate)) {
        errors.push(`Rule 589: INTERACT_DT (${intD8}) must not be before trip start date (${tripStartDate})`);
      }
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      if (repD > yyyymmddToDate(todayStr)) errors.push(`Rule 592: REP_DATE (${repDate}) must not be in the future`);
    }

    // LAT/LONG: XSD 39588.222 latitude 38-72, longitude -148 to -40, ≤4 decimals,
    // MODE attribute required. Ranges match the XSD exactly (the clamp at emit keeps
    // decimals ≤4; the decimal check here is a defensive backstop).
    const latM = xml.match(/<LAT(\s[^>]*)?>([^<]*)<\/LAT>/);
    if (latM) {
      if (!/MODE="(M|G)"/.test(latM[1] ?? '')) errors.push('LAT is missing the required MODE="M"|"G" attribute');
      const v = parseFloat(latM[2]);
      if (isNaN(v) || v < 38 || v > 72) errors.push(`LAT out of XSD range (38 to 72): ${latM[2]}`);
      if (/\.\d{5,}/.test(latM[2])) errors.push(`LAT exceeds 4 decimal places: ${latM[2]}`);
    }
    const longM = xml.match(/<LONG(\s[^>]*)?>([^<]*)<\/LONG>/);
    if (longM) {
      if (!/MODE="(M|G)"/.test(longM[1] ?? '')) errors.push('LONG is missing the required MODE="M"|"G" attribute');
      const v = parseFloat(longM[2]);
      if (isNaN(v) || v < -148 || v > -40) errors.push(`LONG out of XSD range (-148 to -40): ${longM[2]}`);
      if (/\.\d{5,}/.test(longM[2])) errors.push(`LONG exceeds 4 decimal places: ${longM[2]}`);
    }

    // NOAA_SPECIE_COD must exist in MV_NOAA_MM_SPECIES
    const noaa = elem('NOAA_SPECIE_COD');
    if (noaa && !MV_NOAA_MM_SPECIES.some(s => s.noaaCode === noaa)) {
      errors.push(`NOAA_SPECIE_COD ${noaa} is not in MV_NOAA_MM_SPECIES`);
    }

    // Every INCDNT_TYP_ID must exist in MV_INCIDENT_TYPE
    for (const m of xml.matchAll(/<INCDNT_TYP_ID>([^<]*)<\/INCDNT_TYP_ID>/g)) {
      if (!MV_INCIDENT_TYPE.some(t => String(t.codeId) === m[1].trim())) {
        errors.push(`INCDNT_TYP_ID ${m[1]} is not in MV_INCIDENT_TYPE`);
      }
    }

    const nb = elem('NB_SPCMN_BEST');
    if (nb !== null && !/^\d{1,4}$/.test(nb)) errors.push(`NB_SPCMN_BEST must be an integer 0-9999, got: ${nb}`);

    const gd = elem('GEAR_DMG_IND');
    if (gd && !['Y', 'N'].includes(gd)) errors.push(`GEAR_DMG_IND must be Y or N, got: ${gd}`);
  }

  return { valid: errors.length === 0, errors };
}

// SOAP 1.1 SaveIncomingFile envelope (Web Service guide §3.1) — shared builder lives in
// dfoXmlGenerator.ts. fileName per Standard v6.1 §3.10 (generateDfoXmlFileName).
export function generateSoap222Envelope(form222Xml: string, elogKey: string, fileName: string): string {
  return buildSaveIncomingFileEnvelope(elogKey, fileName, form222Xml);
}
