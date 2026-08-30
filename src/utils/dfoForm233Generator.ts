// DFO Form 233 — Inactivity Report
// Generator, validator, and AsyncStorage persistence (3-year retention)

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CaptainProfile } from './captainStorage';
import { buildSaveIncomingFileEnvelope, toCloseTimestamp } from './dfoXmlGenerator';
import { DFO_CIE_ID, DFO_SOFT_VER } from './dfoConstants';
import { dfoKey, DFO_STORE_BASES } from './dfoStorageKeys';

const THREE_YEARS_MS = 94608000000;

// XSD 43792.233 (xsd_start_date 2022-06-13): FORM_VER_ID for the Inactivity Report
export const DFO_FORM_VER_ID_233 = 233;

// Picker choices only — XSD REASON is free text (string_2000), no code table
export const INACTIVITY_REASONS = ['Weather', 'Mechanical', 'Personal', 'Other'];

export interface Form233Entry {
  uid: string;
  savedAt: number;
  periodStartDate: string;   // YYYY-MM-DD
  periodEndDate: string;     // YYYY-MM-DD
  reason: string;            // human-readable label
  // S152F (defect 59): these two are STILL SNAPSHOTTED at save time and still written on every
  // save — but they are NO LONGER EMITTED. The generator reads FIN and LIC_NO from the live
  // captain profile, so a 233 cannot carry identity from two different moments. They are kept as
  // the record of what the harvester was shown when he closed the form, and because every entry
  // saved before S152F carries them and those records live three years. Do not re-wire them into
  // the emit, and do not remove them from the type.
  licenceNo: string;         // snapshotted at save time — historical record, NOT emitted
  fin: string;               // snapshotted at save time — historical record, NOT emitted
  remarks?: string;          // → REPORT.REM (string_2000, optional) — Session 111; additive
  reportDtlRemarks?: string; // → REPORT_DTL.REM (string_2000, optional) — Session 112; additive
  logbookUidRefered?: string; // → REPORT.LOGBOOK_UID_REFERED (string_6, optional; "REFERED" is DFO's schema spelling) — S116; additive
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

export function generateForm233Uid(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let uid = '';
  for (let i = 0; i < 6; i++) uid += chars.charAt(Math.floor(Math.random() * chars.length));
  return uid;
}

export async function saveForm233Entry(entry: Form233Entry): Promise<void> {
  const existing = await loadForm233Entries();
  const cutoff = Date.now() - THREE_YEARS_MS;
  const filtered = existing.filter(e => e.uid !== entry.uid && e.savedAt > cutoff);
  await AsyncStorage.setItem(dfoKey(DFO_STORE_BASES.form233_entries), JSON.stringify([...filtered, entry]));
}

export async function loadForm233Entries(): Promise<Form233Entry[]> {
  try {
    const raw = await AsyncStorage.getItem(dfoKey(DFO_STORE_BASES.form233_entries));
    if (!raw) return [];
    const entries = JSON.parse(raw) as Form233Entry[];
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
export async function loadForm233EntryByUid(uid: string): Promise<Form233Entry | null> {
  const all = await loadForm233Entries();
  return all.find(e => e.uid === uid) ?? null;
}

// S125 7a: delete one entry by uid (mirrors dfoLogStorage.deleteLog). Used by 7c/Phase 8
// (draft discard / delete). Rewrites the array without the uid.
export async function deleteForm233Entry(uid: string): Promise<void> {
  const existing = await loadForm233Entries();
  await AsyncStorage.setItem(
    dfoKey(DFO_STORE_BASES.form233_entries),
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

// XSD date_12 = YYYYMMDDHHMM. The entry stores calendar dates; the inactivity period
// covers whole days, so the start opens at 0000 and the end closes at 2359.
function toDate12FromCalendarDate(dateStr: string, hhmm: '0000' | '2359'): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
  return dateStr.replace(/-/g, '') + hhmm;
}

// XSD 43792.233: ELOG → GENERAL_INFO + REPORT[] → REPORT_DTL[].
// REPORT_UID legitimately exists in F233 (string_6, mandatory) — unlike Form 234.
export function generateForm233Xml(entry: Form233Entry, profile: CaptainProfile): string {
  const regId = profile.regId ?? 1004;
  const startDt = toDate12FromCalendarDate(entry.periodStartDate, '0000');
  const endDt   = toDate12FromCalendarDate(entry.periodEndDate, '2359');

  let gi = '  <GENERAL_INFO>\n';
  gi += tag('CIE_ID',      DFO_CIE_ID, '    ');
  gi += tag('SOFT_VER',    DFO_SOFT_VER, '    ');
  gi += tag('REG_ID',      String(regId), '    ');
  // S152F (defect 59): FIN reads the LIVE profile, like REG_ID and VRN either side of it. It used
  // to read entry.fin — the copy frozen into the record at close — so a 233 sent after the
  // harvester corrected his profile carried the old FIN beside the new vessel number: one document
  // describing him at two different moments, with the two mandatory fields being the stale ones.
  // Ruling: all four identity fields come from one source, matching the 234 (:242) and the 222
  // (:198). entry.fin is still stored, as the record of what he was shown at close — see the type.
  gi += tag('FIN',         profile.licenceHolderFin, '    ');
  gi += tag('VRN',         profile.vesselNumber, '    ');
  gi += tag('FORM_VER_ID', String(DFO_FORM_VER_ID_233), '    ');
  gi += '  </GENERAL_INFO>\n';

  let dtl = '    <REPORT_DTL>\n';
  dtl += tag('START_DT', startDt, '      ');
  dtl += tag('END_DT',   endDt, '      ');
  // S152F (defect 59): LIC_NO reads the LIVE profile — the other half of the same fix as FIN
  // above. Same source the 234 uses for this element (dfoXmlGenerator :297).
  dtl += tag('LIC_NO',   profile.fishingNumber, '      ');
  dtl += tag('REASON',   entry.reason, '      ');
  // REM (string_2000, opt) — REPORT_DTL-level note. XSD report_dtl_type sequence: LAST child,
  // after REASON. Distinct from REPORT.REM above — the two carry separate text (never the same).
  dtl += tag('REM',      entry.reportDtlRemarks ?? '', '      ');
  dtl += '    </REPORT_DTL>\n';

  let report = '  <REPORT>\n';
  report += tag('REPORT_UID',  entry.uid || generateForm233Uid(), '    ');
  // LOGBOOK_UID_REFERED (string_6, opt) — XSD report_type sequence: between REPORT_UID and
  // DG_CLOSE_DT. Rule 953: refers to TRIP.LGBK_UID of another logbook, six uppercase A-Z.
  // Blank → tag() drops the element entirely (an empty tag is schema-invalid, minLength 1).
  report += tag('LOGBOOK_UID_REFERED', entry.logbookUidRefered ?? '', '    ');
  // S125 7b: DG_CLOSE_DT from the stored close time (Close & Save), not a generation-time now().
  report += tag('DG_CLOSE_DT', toCloseTimestamp(entry.closeDt), '    ');
  // REM (string_2000, opt) — REPORT-level "Comments on the inactivity". XSD report_type
  // sequence: after DG_CLOSE_DT, before REPORT_DTL. (REPORT_DTL.REM left unused.)
  report += tag('REM', entry.remarks ?? '', '    ');
  report += dtl;
  report += '  </REPORT>\n';

  return `<?xml version="1.0" encoding="UTF-8"?>\n<ELOG>\n${gi}${report}</ELOG>`;
}

// Structural check mirroring XSD 43792.233 (nested ELOG/GENERAL_INFO/REPORT/REPORT_DTL).
// Name-based like the other in-app validators — xmllint against the on-disk XSD remains
// the authority; this exists to block obviously broken documents before transmission.
export function validateForm233Xml(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const elem = (name: string): string | null => {
    const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`));
    return m ? m[1].trim() : null;
  };

  if (!/<ELOG>/.test(xml)) errors.push('Missing root element: ELOG');

  // Mandatory elements per the XSD (FIN/VRN/REM/LOGBOOK_UID_REFERED are optional)
  (['GENERAL_INFO', 'CIE_ID', 'SOFT_VER', 'REG_ID', 'FORM_VER_ID',
    'REPORT', 'REPORT_UID', 'DG_CLOSE_DT', 'REPORT_DTL',
    'START_DT', 'END_DT', 'LIC_NO', 'REASON'] as const)
    .forEach(name => { if (elem(name) === null) errors.push(`Missing required element: ${name}`); });

  const intFields: [string, RegExp, string][] = [
    ['CIE_ID',      /^\d{1,10}$/,  'integer_10'],
    ['REG_ID',      /^\d{1,10}$/,  'integer_10'],
    ['FORM_VER_ID', /^\d{1,10}$/,  'integer_10'],
    ['DG_CLOSE_DT', /^\d{14}$/,    'date_14 (YYYYMMDDHHMMSS)'],
    ['START_DT',    /^\d{12}$/,    'date_12 (YYYYMMDDHHMM)'],
    ['END_DT',      /^\d{12}$/,    'date_12 (YYYYMMDDHHMM)'],
  ];
  for (const [name, re, label] of intFields) {
    const v = elem(name);
    if (v !== null && !re.test(v)) errors.push(`${name} is not valid ${label}: ${v}`);
  }

  const uid = elem('REPORT_UID');
  if (uid !== null && !/^.{1,6}$/.test(uid)) errors.push(`REPORT_UID must be 1-6 characters (string_6): ${uid}`);

  // LOGBOOK_UID_REFERED is optional — NO presence check. When present, Rule 953 requires
  // exactly six uppercase letters A-Z (it refers to TRIP.LGBK_UID of another logbook).
  const lgbkRef = elem('LOGBOOK_UID_REFERED');
  if (lgbkRef !== null && !/^[A-Z]{6}$/.test(lgbkRef))
    errors.push(`LOGBOOK_UID_REFERED must be six uppercase letters A-Z (Rule 953): ${lgbkRef}`);

  const start = elem('START_DT');
  const end = elem('END_DT');
  if (start && end && /^\d{12}$/.test(start) && /^\d{12}$/.test(end) && end < start)
    errors.push('END_DT is before START_DT');

  // REM appears at TWO optional levels — REPORT.REM (report_type) and REPORT_DTL.REM
  // (report_dtl_type), both string_2000. elem('REM') only sees the first, so length-check each
  // level by name (S112: two REMs now emit; a single first-match check left the second unbounded).
  const remIn = (fragment: string): string | null => {
    const m = fragment.match(/<REM>([\s\S]*?)<\/REM>/);
    return m ? m[1].trim() : null;
  };
  const dtlMatch = xml.match(/<REPORT_DTL>([\s\S]*?)<\/REPORT_DTL>/);
  const reportRem = remIn(xml.replace(/<REPORT_DTL>[\s\S]*?<\/REPORT_DTL>/g, '')); // REPORT.REM (outside DTL)
  const dtlRem = dtlMatch ? remIn(dtlMatch[1]) : null;                              // REPORT_DTL.REM
  if (reportRem !== null && reportRem.length > 2000) errors.push(`REPORT.REM exceeds string_2000: ${reportRem}`);
  if (dtlRem !== null && dtlRem.length > 2000) errors.push(`REPORT_DTL.REM exceeds string_2000: ${dtlRem}`);

  return { valid: errors.length === 0, errors };
}

// SOAP 1.1 SaveIncomingFile envelope (Web Service guide §3.1) — shared builder lives in
// dfoXmlGenerator.ts. fileName per Standard v6.1 §3.10 (generateDfoXmlFileName).
// NOTE: success responses for Form 233 carry <REPORT_UID> (one per report) instead of
// <LGBK_UID> — parseDfoSoapResponse already collects both.
export function generateSoap233Envelope(form233Xml: string, elogKey: string, fileName: string): string {
  return buildSaveIncomingFileEnvelope(elogKey, fileName, form233Xml);
}
