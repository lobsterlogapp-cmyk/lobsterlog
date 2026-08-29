// exportTransmissionRecord.ts — the harvester's copy of his transmission record (S150B, ruling C1).
//
// WHY THIS EXISTS
// The DFO transmission register and the sent-XML archive are the three-year legal record a
// licence holder must be able to produce for a fishery officer. S150 tried to preserve that by
// RETAINING both stores through Delete Account; that was reverted, because a retained store is
// unreachable — every reader derives its AsyncStorage key from the signed-in uid, and that uid is
// destroyed by deleteUser and never reissued (GATE_S150_PRIVACY_NOTICE.md §O-1). A record the app
// cannot display is not a record.
//
// Ruling C1: on Delete Account the app WRITES THE HARVESTER A PLAIN-TEXT COPY of his record — the
// register as a readable list, plus the sent XML — hands it to him, and then deletes everything.
// Nothing is retained locally; nothing is retained in the cloud.
//
// SHAPE OF THIS MODULE
//   • buildTransmissionRecordExport() is a PURE function: register + archive in, one string out.
//     No storage, no clock, no native calls — so it is fully testable, and it is what the guard
//     suite pins.
//   • writeTransmissionRecordExport() is a thin wrapper that puts that string on disk and hands
//     it to the OS. It is deliberately separate from the builder, but it IS wired: the delete
//     path calls exportTransmissionRecordForDeletion() at src/Hooks/useAuth.ts:166, immediately
//     before wipeAllStores / deleteDoc / deleteUser.
//     S150B STOP 2 is RULED (F-2 + DocumentDir): the file is written where it persists for the
//     life of the install, and a failed export NEVER blocks the deletion — the harvester is
//     entitled to delete his account either way. He is told which happened, both languages.
//
// PLAIN TEXT, NOT MARKDOWN. No asterisks, no backticks, no fences. A fishery officer reads this;
// nothing parses it.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Share } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import type { TransmissionRecord, XmlArchiveEntry } from './dfoLogStorage';
import { dfoKey, DFO_STORE_BASES } from './dfoStorageKeys';

// ── How the language gets in ─────────────────────────────────────────────────────────
// RULED S151 — L-2 (FULL): the WHOLE document is written in the app's language, not just the
// field labels. Reason: this is the only document the app ever hands a man that leaves the phone
// entirely. French field names wrapped around an English legal paragraph is worse than either
// language done properly.
// OVERRULED: L-1 (English only — free, ships today) and L-3 (one bilingual file, which would have
// covered a reader whose language you cannot predict). Recorded as considered, not chosen.
//
// RULED S151B — R2, Option C: the French lives in fr/dfo.json under `export.*` like every other
// string in this app, and the language reaches this module as an INJECTED `t`. This module imports
// no i18n, no clock and no storage; it is handed a function. The default is identity-to-fallback,
// so English output is byte-identical to the pre-S151B file and every existing test still pins it.
// OVERRULED: passing a resolved label map, or a language code, and holding the French in this .ts.
// Both would have been a stronger purity guarantee, and both would have created a SECOND French
// vocabulary invisible to the apostrophe sweep, the space-before-colon check, the EN/FR parity
// check and the proofread pile — all of which read the JSON bundles. Unproofread French on the
// document a fishery officer reads is the worse risk.
//
// ⚠ The purity here is enforced by DISCIPLINE, not by the type: nothing stops a future caller
// injecting a `t` with storage or a clock behind it. Keep `t` a pure string lookup.
export type ExportT = (
  key: string,
  fallback: string,
  vars?: Record<string, string | number>,
) => string;

/** `{{name}}` substitution — what i18next does, reproduced so the English default matches it. */
const applyVars = (s: string, vars?: Record<string, string | number>): string =>
  vars ? s.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;

/** Default: ignore the key, use the English fallback. Keeps the builder usable with no i18n. */
export const DEFAULT_EXPORT_T: ExportT = (_key, fallback, vars) => applyVars(fallback, vars);

// ── Field labels ─────────────────────────────────────────────────────────────────────
// All 16 fields of TransmissionRecord, in interface order. Exported so the set can be
// checked by a test and changed in one place. These are the ENGLISH FALLBACKS; the live label
// comes from EXPORT_FIELD_LABEL_KEYS through the injected `t`.
export const EXPORT_FIELD_LABELS: Record<string, string> = {
  id: 'Record ID',
  logId: 'Log ID',
  attemptedAt: 'Attempted at (UTC)',
  outcome: 'Outcome',
  httpStatus: 'HTTP status',
  errorMessage: 'Error message',
  fileName: 'XML file name',
  confNumber: 'DFO confirmation number',
  xmlSnapshot: 'Sent XML',
  soapSnapshot: 'SOAP envelope',
  vrn: 'Vessel number (VRN)',
  tripNum: 'Trip number',
  xsdValid: 'XSD validation',
  wsErrCode: 'DFO response code',
  kind: 'Report type',
  failureKind: 'Failure kind',
};

// field → i18n key, same 16 keys as EXPORT_FIELD_LABELS. Kept as a separate map rather than
// derived by string-building so a missing key is a compile-time hole, not a silent English label.
export const EXPORT_FIELD_LABEL_KEYS: Record<string, string> = {
  id: 'dfo:export.fieldId',
  logId: 'dfo:export.fieldLogId',
  attemptedAt: 'dfo:export.fieldAttemptedAt',
  outcome: 'dfo:export.fieldOutcome',
  httpStatus: 'dfo:export.fieldHttpStatus',
  errorMessage: 'dfo:export.fieldErrorMessage',
  fileName: 'dfo:export.fieldFileName',
  confNumber: 'dfo:export.fieldConfNumber',
  xmlSnapshot: 'dfo:export.fieldXmlSnapshot',
  soapSnapshot: 'dfo:export.fieldSoapSnapshot',
  vrn: 'dfo:export.fieldVrn',
  tripNum: 'dfo:export.fieldTripNum',
  xsdValid: 'dfo:export.fieldXsdValid',
  wsErrCode: 'dfo:export.fieldWsErrCode',
  kind: 'dfo:export.fieldKind',
  failureKind: 'dfo:export.fieldFailureKind',
};

/** Resolve all 16 labels for the active language in one pass. */
const resolveLabels = (t: ExportT): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const field of Object.keys(EXPORT_FIELD_LABELS)) {
    out[field] = t(EXPORT_FIELD_LABEL_KEYS[field], EXPORT_FIELD_LABELS[field]);
  }
  return out;
};

// ⚠⚠ SECURITY — WHY soapSnapshot IS NOT PRINTED.
// The stored SOAP envelope is the literal body that was POSTed, and it carries
// <p_elogkey>{base64 of the harvester's DFO ELOG key}</p_elogkey>
// (dfoXmlGenerator.ts, buildSaveIncomingFileEnvelope). Base64 is not encryption. This file is
// meant to be emailed, AirDropped or saved to a shared drive, so printing the envelope would
// hand out a DFO credential with the record. The field is ACKNOWLEDGED rather than silently
// dropped — the line below appears in every record block so nothing looks hidden — and the XML
// it wraps IS printed in full from xmlSnapshot, which carries no key.
const SOAP_WITHHELD_KEY = 'dfo:export.soapWithheld';
const SOAP_WITHHELD = 'present, not included (contains your DFO ELOG key)';

const EM = '—'; // em dash, used for "no value"
const RULE = '-'.repeat(72);
const HEAVY = '='.repeat(72);

const pad2 = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD HH:MM:SS UTC — readable, unambiguous, sorts correctly. */
export function formatExportTimestamp(ms: number | undefined | null): string {
  if (ms == null || !Number.isFinite(ms)) return EM;
  const d = new Date(ms);
  return (
    `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ` +
    `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())} UTC`
  );
}

/** Compact UTC stamp for the file name: YYYYMMDDHHMMSS. Mirrors generateDfoXmlFileName's stamp. */
function compactStamp(ms: number): string {
  const d = new Date(ms);
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}`
  );
}

// The app's DFO file names are `${regId}-${licenceNo}-${YYYYMMDDHHMMSS}.XML`
// (generateDfoXmlFileName, dfoXmlGenerator.ts). This is NOT a DFO file — it never goes to DFO —
// so it does not follow §3.10, and deliberately does not look like one. It keeps the same UTC
// stamp idea so a harvester with several exports can tell them apart.
export function transmissionRecordExportFileName(generatedAt: number): string {
  return `LobsterLog-transmission-record-${compactStamp(generatedAt)}.txt`;
}

// ⚠ RULED S151B — R4: THE COLUMN IS SIZED FROM THE LANGUAGE, NOT HARDCODED.
// This was `padEnd(26)`, a number sized for English — the longest English label,
// 'DFO confirmation number', is 23 characters, +1 for the colon +2 for the gap = 26. In French
// the longest is 'Numéro d'enregistrement du bateau (NEB)' at 39, which would not have padded at
// all: the label would have run straight into its value with no gap and the whole French document
// would have read ragged. Deriving the width means adding a 17th field later still lines up.
// The formula reproduces 26 exactly for English, so English output is byte-identical BY
// CONSTRUCTION rather than by a second hardcoded number kept in step by hand.
const padFor = (labels: string[]) => Math.max(...labels.map(l => l.length)) + 3;

const line = (label: string, value: string, pad: number) => `${(label + ':').padEnd(pad)}${value}`;

const OUTCOME_TEXT: Record<string, string> = {
  success: 'Accepted by DFO',
  failure: 'Failed',
};
const OUTCOME_KEYS: Record<string, string> = {
  success: 'dfo:export.outcomeSuccess',
  failure: 'dfo:export.outcomeFailure',
};

const KIND_TEXT: Record<string, string> = {
  logbook: 'Logbook (Form 234)',
  form222: 'Form 222 (marine mammal)',
  form233: 'Form 233 (inactivity)',
};
const KIND_KEYS: Record<string, string> = {
  logbook: 'dfo:export.kindLogbook',
  form222: 'dfo:export.kindForm222',
  form233: 'dfo:export.kindForm233',
};

const FAILURE_TEXT: Record<string, string> = {
  refused: 'DFO rejected it',
  unclear: 'DFO answered but the answer could not be read',
  timeout: 'timed out',
  notSent: 'never left the phone',
};
const FAILURE_KEYS: Record<string, string> = {
  refused: 'dfo:export.failureRefused',
  unclear: 'dfo:export.failureUnclear',
  timeout: 'dfo:export.failureTimeout',
  notSent: 'dfo:export.failureNotSent',
};

/** Look up a coded value's text, falling back to the raw stored code if it is unknown. */
const coded = (
  t: ExportT,
  keys: Record<string, string>,
  text: Record<string, string>,
  code: string,
): string => (keys[code] ? t(keys[code], text[code]) : code);

function renderRecord(
  r: TransmissionRecord,
  index: number,
  total: number,
  L: Record<string, string>,
  pad: number,
  t: ExportT,
): string {
  const out: string[] = [];
  out.push(RULE);
  out.push(t('dfo:export.recordHeading', 'RECORD {{n}} OF {{total}}', { n: index + 1, total }));
  out.push(RULE);
  out.push(line(L.logId, r.logId || EM, pad));
  out.push(line(L.id, r.id || EM, pad));
  out.push(line(L.kind, coded(t, KIND_KEYS, KIND_TEXT, r.kind || 'logbook'), pad));
  out.push(line(L.outcome, coded(t, OUTCOME_KEYS, OUTCOME_TEXT, r.outcome), pad));
  out.push(line(L.attemptedAt, formatExportTimestamp(r.attemptedAt), pad));
  out.push(line(L.confNumber, r.confNumber || EM, pad));
  out.push(line(L.wsErrCode, r.wsErrCode || EM, pad));
  out.push(line(L.fileName, r.fileName || EM, pad));
  out.push(line(L.tripNum, r.tripNum != null ? String(r.tripNum) : EM, pad));
  out.push(line(L.vrn, r.vrn || EM, pad));
  out.push(
    line(
      L.xsdValid,
      r.xsdValid === true
        ? t('dfo:export.xsdPassed', 'Passed')
        : r.xsdValid === false
          ? t('dfo:export.xsdFailed', 'Failed')
          : EM,
      pad,
    ),
  );
  out.push(line(L.httpStatus, r.httpStatus != null ? String(r.httpStatus) : EM, pad));
  out.push(
    line(
      L.failureKind,
      r.failureKind ? coded(t, FAILURE_KEYS, FAILURE_TEXT, r.failureKind) : EM,
      pad,
    ),
  );
  out.push(line(L.errorMessage, r.errorMessage || EM, pad));
  out.push(line(L.soapSnapshot, t(SOAP_WITHHELD_KEY, SOAP_WITHHELD), pad));
  out.push('');
  out.push(`${L.xmlSnapshot}:`);
  out.push(r.xmlSnapshot && r.xmlSnapshot.length ? r.xmlSnapshot : EM);
  out.push('');
  return out.join('\n');
}

export interface TransmissionRecordExportInput {
  /** the transmission register, as stored */
  records: TransmissionRecord[];
  /** the sent-XML archive, as stored (success-only by design) */
  archive: XmlArchiveEntry[];
  /** Firebase auth uid the record belongs to */
  uid: string;
  /** epoch ms; passed in, never read from the clock, so the output is deterministic */
  generatedAt: number;
  /**
   * String lookup for the active language (S151B R2, Option C). Injected, never imported — the
   * caller passes an i18next-backed function. Omit it and the whole document comes out in
   * English, which is what every pre-S151B test pins and what the module does with no i18n
   * present at all. Must be a pure lookup: no storage, no clock.
   */
  t?: ExportT;
}

/**
 * Build the whole export as one plain-text string. PURE — no storage, no clock, no native calls.
 *
 * Every record in the register is rendered, newest first, with every one of the 16
 * TransmissionRecord fields accounted for (soapSnapshot acknowledged but withheld — see
 * SOAP_WITHHELD). The sent-XML archive follows. Failed sends are included: their XML lives on
 * the record's own xmlSnapshot, because the archive is success-only.
 */
export function buildTransmissionRecordExport(input: TransmissionRecordExportInput): string {
  const { records, archive, uid, generatedAt, t = DEFAULT_EXPORT_T } = input;
  const sorted = [...records].sort((a, b) => (b.attemptedAt ?? 0) - (a.attemptedAt ?? 0));
  const accepted = sorted.filter(r => r.outcome === 'success').length;
  const failed = sorted.length - accepted;

  // Resolve every label ONCE, then size the column from the widest one actually used (R4).
  const L = resolveLabels(t);
  const generatedLbl = t('dfo:export.generated', 'Generated');
  const accountLbl = t('dfo:export.account', 'Account');
  const recordsLbl = t('dfo:export.records', 'Records');
  const sentXmlLbl = t('dfo:export.sentXmlDocs', 'Sent XML documents');
  const savedAtLbl = t('dfo:export.savedAt', 'Saved at (UTC)');
  // xmlSnapshot is NOT in this set — it prints as its own heading line, not in the column.
  const pad = padFor([
    ...Object.keys(L)
      .filter(k => k !== 'xmlSnapshot')
      .map(k => L[k]),
    generatedLbl,
    accountLbl,
    recordsLbl,
    sentXmlLbl,
    savedAtLbl,
  ]);

  const out: string[] = [];
  out.push(HEAVY);
  out.push(t('dfo:export.title', 'LOBSTERLOG - TRANSMISSION RECORD'));
  out.push(HEAVY);
  out.push('');
  out.push(line(generatedLbl, formatExportTimestamp(generatedAt), pad));
  out.push(line(accountLbl, uid || EM, pad));
  out.push(
    line(
      recordsLbl,
      t('dfo:export.recordsCount', '{{total}} ({{accepted}} accepted, {{failed}} failed)', {
        total: sorted.length,
        accepted,
        failed,
      }),
      pad,
    ),
  );
  out.push(line(sentXmlLbl, String(archive.length), pad));
  out.push('');
  // One key holding the whole paragraph with its own line breaks, so each language wraps itself.
  out.push(
    t(
      'dfo:export.intro',
      'This is your copy of the reports this device sent to the Department of\n' +
        'Fisheries and Oceans. The law requires you to keep these records for three\n' +
        'years. Keep this file somewhere safe - the app no longer holds them.',
    ),
  );
  out.push('');

  if (sorted.length === 0) {
    out.push(RULE);
    out.push(
      t('dfo:export.noRecords', 'No transmissions were recorded on this device for this account.'),
    );
    out.push(RULE);
    out.push('');
  } else {
    sorted.forEach((r, i) => out.push(renderRecord(r, i, sorted.length, L, pad, t)));
  }

  out.push(HEAVY);
  out.push(t('dfo:export.xmlSectionTitle', 'SENT XML DOCUMENTS'));
  out.push(HEAVY);
  out.push('');
  if (archive.length === 0) {
    out.push(
      t('dfo:export.noArchive', 'No sent XML documents were archived on this device for this account.'),
    );
    out.push('');
  } else {
    const byNewest = [...archive].sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
    byNewest.forEach((e, i) => {
      out.push(RULE);
      out.push(
        t('dfo:export.xmlHeading', 'XML {{n}} OF {{total}}', { n: i + 1, total: byNewest.length }),
      );
      out.push(RULE);
      out.push(line(L.logId, e.logId || EM, pad));
      out.push(line(savedAtLbl, formatExportTimestamp(e.savedAt), pad));
      out.push('');
      out.push(e.xml && e.xml.length ? e.xml : EM);
      out.push('');
    });
  }

  out.push(HEAVY);
  out.push(t('dfo:export.endOfRecord', 'END OF RECORD'));
  out.push(HEAVY);
  return out.join('\n');
}

// ── Putting it on the harvester's phone ──────────────────────────────────────────────
// Reached from the delete path via exportTransmissionRecordForDeletion() below, which the
// Delete Account handler calls at src/Hooks/useAuth.ts:166. The shape mirrors backupNow():
// a typed { ok, reason }, never a throw, so the caller decides policy rather than inheriting
// it from an exception — and the policy, ruled at S150B STOP 2, is that a failed export is
// reported to the harvester but never stops the deletion.
//
// NO NEW DEPENDENCY. react-native-blob-util is already a direct dependency and is already in the
// committed ios/Podfile.lock, so this needs no `expo install` and no native rebuild.
//   • fs.writeFile + fs.dirs.CacheDir  — write the file
//   • iOS   Share.share({ url })       — React Native's own share sheet accepts a file URL
//   • Android ReactNativeBlobUtil.android.actionViewIntent — RN's Share carries no file on Android
export type ExportHandoffResult =
  | { ok: true; path: string; dismissed: boolean }
  | { ok: false; reason: 'write_failed' | 'share_failed'; path?: string };

// ⚠ DocumentDir, NOT CacheDir. S150B shipped this on CacheDir and flagged the choice as open;
// S150C ruling R2 settles it: "the file has to survive and he has to know about it." A cache
// directory is reclaimable by the OS at any time, so a copy written there is not a guarantee.
// DocumentDir persists for the life of the install.
//
// ⚠⚠ SURVIVING IS NOT THE SAME AS BEING REACHABLE — see the gate doc's S150C §C.4. On iOS this
// directory is only browsable in the Files app when UIFileSharingEnabled and
// LSSupportsOpeningDocumentsInPlace are BOTH set. S151 (defect 99) declares both, in
// ios/LobsterLog/Info.plist (the file the build reads) and in app.config.js's ios.infoPlist
// (so a future prebuild does not drop them). R2 therefore reads the right way round again:
// the persisted copy IS the guarantee, and the share sheet is the convenience on top of it.
// ⚠ NOT YET PROVEN ON GLASS — the keys are declared but no build has been cut and no one has
// opened Files and seen the file. Until that walk happens this is a code claim, not a fact.
const exportDir = () => ReactNativeBlobUtil.fs.dirs.DocumentDir;

export async function writeTransmissionRecordExport(
  contents: string,
  fileName: string,
): Promise<ExportHandoffResult> {
  const path = `${exportDir()}/${fileName}`;
  try {
    await ReactNativeBlobUtil.fs.writeFile(path, contents, 'utf8');
  } catch (err) {
    console.warn('[exportTransmissionRecord] write failed:', err);
    return { ok: false, reason: 'write_failed' };
  }
  try {
    if (Platform.OS === 'ios') {
      const res = await Share.share({ url: `file://${path}` });
      // ⚠ 'sharedAction' means an activity was CHOSEN, not that the file was saved. There is no
      // API on either platform that reports whether the harvester actually kept it.
      return { ok: true, path, dismissed: res.action === Share.dismissedAction };
    }
    await ReactNativeBlobUtil.android.actionViewIntent(path, 'text/plain');
    // Android's Share/intent APIs report nothing about the outcome at all.
    return { ok: true, path, dismissed: false };
  } catch (err) {
    // The file is already written and persisted. A failed hand-over is a lost convenience,
    // not a lost record, so this still reports ok — the copy exists either way.
    console.warn('[exportTransmissionRecord] share failed (file is still written):', err);
    return { ok: true, path, dismissed: true };
  }
}

// ── The one call the delete path makes ───────────────────────────────────────────────
// Reads THIS uid's register + archive, builds the file, writes it where it persists, and offers
// the share sheet. Returns a typed outcome and NEVER THROWS — ruling R2: a failed export must
// never block a harvester from deleting his account.
//
// The uid is passed EXPLICITLY rather than read from the ambient active uid. At the call site the
// ambient uid is still set (deleteUser has not run), so either would work today — but explicit
// means this keeps reading the right namespace if the call ever moves, which is exactly the class
// of bug uid-namespacing exists to prevent. Same reasoning as dfoBackup's explicit-uid helpers.
//
// ⚠ RULED S151B — R6 (defect 101): NOTHING TO EXPORT MEANS NO EXPORT.
// Delete Account is NOT a DFO screen — it renders in ordinary Settings (App.tsx:1283, in the
// Account card beside Sign Out, with no dfoActivated gate), so all ~175 free/Pro users reach it.
// Before this gate, every one of them was handed a file and an alert announcing that "your
// transmission record is saved" — a record they had never had, for a Department they had never
// transmitted to. The file was real and its contents said "No transmissions were recorded".
// BOTH stores must be empty. Deliberately not collapsed to one check: a harvester whose register
// was pruned but whose XML archive survives still has a record worth handing him, and vice versa.
// The skip path reaches wipeAllStores exactly as the export path does — R2's never-block-the-
// deletion guarantee is untouched; this changes what he is TOLD, never what is deleted.
export type DeletionExportOutcome =
  | { ok: true; skipped: true }
  | { ok: true; skipped: false; fileName: string; path: string; records: number }
  | { ok: false; reason: 'read_failed' | 'write_failed' };

export async function exportTransmissionRecordForDeletion(
  uid: string,
  generatedAt: number,
  t: ExportT = DEFAULT_EXPORT_T,
): Promise<DeletionExportOutcome> {
  let records: TransmissionRecord[] = [];
  let archive: XmlArchiveEntry[] = [];
  try {
    const [rawRegister, rawArchive] = await Promise.all([
      AsyncStorage.getItem(dfoKey(DFO_STORE_BASES.transmission_register, uid)),
      AsyncStorage.getItem(dfoKey(DFO_STORE_BASES.xml_archive, uid)),
    ]);
    records = rawRegister ? JSON.parse(rawRegister) : [];
    archive = rawArchive ? JSON.parse(rawArchive) : [];
    if (!Array.isArray(records)) records = [];
    if (!Array.isArray(archive)) archive = [];
  } catch (err) {
    console.warn('[exportTransmissionRecord] could not read the register/archive:', err);
    return { ok: false, reason: 'read_failed' };
  }

  // R6 — nothing in either store: write nothing, say nothing, delete as normal.
  if (records.length === 0 && archive.length === 0) {
    return { ok: true, skipped: true };
  }

  const fileName = transmissionRecordExportFileName(generatedAt);
  try {
    const contents = buildTransmissionRecordExport({ records, archive, uid, generatedAt, t });
    const handoff = await writeTransmissionRecordExport(contents, fileName);
    if (!handoff.ok) return { ok: false, reason: 'write_failed' };
    return { ok: true, skipped: false, fileName, path: handoff.path, records: records.length };
  } catch (err) {
    console.warn('[exportTransmissionRecord] export failed:', err);
    return { ok: false, reason: 'write_failed' };
  }
}
