import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateLgbkUid } from './dfoUids';
import { dfoKey, DFO_STORE_BASES } from './dfoStorageKeys';
import {
  DFO_FMA_LIST,
  DFO_LGRID_BY_FMA,
  DFO_FMA_LGRID_REQUIRED,
  DFO_SUBFORM_REGISTRY,
} from '../utils/dfoConstants';
// --- TYPES ---
export type DfoLogMode = 'full' | 'proposal';
export type DfoLogStatus = 'draft' | 'complete';

// Per-section REM (note) text, grouped at the human-section level. Each key fans out to
// one or more XSD REM nodes in dfoXmlGenerator.ts (T1 Logbook test):
//   trip -> TRIP | bait -> BAIT_USED | haul -> EFFORT + EFFORT_BY_GEAR + EFFORT_DETAIL |
//   catch -> CATCH | landing -> LANDING | hlin -> HLIN | hlout -> HLOUT | pcons -> PCONS |
//   transfer -> TRANSFER + TRANSFER_DTL (QC-88 only) | sar -> SAR
// All optional, free text, type string_2000 (max 2000 chars) in the XSD.
export interface LogRemarks {
  trip?: string;
  bait?: string;
  haul?: string;
  catch?: string;
  landing?: string;
  hlin?: string;
  hlout?: string;
  pcons?: string;
  transfer?: string;
  sar?: string;
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
  condId?: string;        // MV_SPECIMENS_CONDITION codeId → SPCMN_COND_ID
  closeDt?: string;       // S124: per-block DG_CLOSE_DT (ISO) — SAR closes one block at a time
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
  nbSpcmnBrd?: string;                           // MAR 38b CATCH count (Rule 654)
  vNotchCount?: string; nbVntchYou?: string;     // QC FMA-gated v-notch counts
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

// Delete a log by id
export const deleteLog = async (id: string): Promise<boolean> => {
  try {
    const existing = await loadAllLogs();
    const filtered = existing.filter((l) => l.id !== id);
    await AsyncStorage.setItem(dfoKey(DFO_STORE_BASES.dfo_logs), JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error('Failed to delete DFO log:', err);
    return false;
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
  fmaId: number;            // NaN when absent — the hlFma test below is false for NaN
  baitCount: number;
  bycatchYes: boolean;
  bycatchCount: number;
  personalUse: string;
  sarYes: boolean;
  transferYes: boolean;
  hlinCompany: string; hlinConfirmNo: string;
  hloutCompany: string; hloutConfirmNo: string;
}

export function usedDataGroupKeys(v: DataGroupInputs): string[] {
  const hlFma = v.fmaId === 28599 || v.fmaId === 1595;
  const used: Record<string, boolean> = {
    dgCloseEffort: true,    // always used (Rule: EFFORT present; no-haul omits the NODE separately)
    dgCloseLanding: true,   // LANDING always used (port landed is mandatory)
    dgCloseBaitUsed: v.baitCount > 0,
    dgClosePconsBycatch: v.bycatchYes && v.bycatchCount > 0,
    dgClosePconsPersonal: v.personalUse.trim().length > 0,
    dgCloseSar: v.sarYes,
    dgCloseTransfer: v.subformId === 88 && v.transferYes,
    dgCloseHlin: hlFma && !!(v.hlinCompany || v.hlinConfirmNo),
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
    fmaId: Number(d.fmaId),
    baitCount: len(d.baitEntries),
    bycatchYes: d.bycatchYes === 'true',
    bycatchCount: len(d.bycatchEntries),
    personalUse: d.personalUse ?? '',
    sarYes: d.sarYes === 'true',
    transferYes: d.transferYes === 'true',
    hlinCompany: d.hlinCompany ?? '', hlinConfirmNo: d.hlinConfirmNo ?? '',
    hloutCompany: d.hloutCompany ?? '', hloutConfirmNo: d.hloutConfirmNo ?? '',
  };
}

// The send-path guard's refusal list: used groups whose data map carries NO real close stamp.
// Non-empty ⇒ the send must refuse and name these sections (loud, not lossy).
export function unclosedUsedGroupKeys(log: Pick<DfoLog, 'subformId' | 'data'>): string[] {
  return usedDataGroupKeys(dataGroupInputsFromLog(log)).filter(k => !log.data[k]);
}

// --- COMPLETION PERCENTAGE ---

// Required fields for the Full DFO form — per subform
export const FULL_DFO_REQUIRED_FIELDS: Record<number, string[]> = {
  88: ['operName', 'startDt', 'fmaId', 'gridId', 'catchWeight', 'trapHauls', 'lgbkUid', 'firstEntryDt', 'crewNb', 'portId', 'gpsCoords', 'sailTime', 'haulStartTime', 'haulEndTime', 'landingTime'],
  89: ['operName', 'startDt', 'fmaId', 'catchWeight', 'trapHauls', 'lgbkUid', 'firstEntryDt', 'gpsCoords', 'sailTime', 'haulStartTime', 'haulEndTime', 'landingTime'],
  90: ['operName', 'startDt', 'fmaId', 'lgridCodeId', 'catchWeight', 'trapHauls', 'lgbkUid', 'firstEntryDt', 'crewNb', 'sailTime', 'haulStartTime', 'haulEndTime', 'landingTime'],
  91: ['operName', 'startDt', 'fmaId', 'catchWeight', 'trapHauls', 'lgbkUid', 'firstEntryDt', 'portId', 'trapSize', 'gearSubtypeId', 'statSectId', 'nbSpcmnKept', 'sailTime', 'haulStartTime', 'haulEndTime', 'landingTime'],
};

export function getRequiredFields(subformId: number): string[] {
  return FULL_DFO_REQUIRED_FIELDS[subformId] ?? FULL_DFO_REQUIRED_FIELDS[90];
}

// Required fields for the Proposal form (9 text fields + bycatch array = 10 total)
const PROPOSAL_REQUIRED_FIELDS = [
  'dateFished', 'departurePort', 'portLanded', 'crewRegistry',
  'gridNumber', 'catchWeight', 'trapHauls',
  'timeStartedHauling', 'timeStoppedHauling',
];

export const getCompletionPercent = (log: DfoLog): number => {
  const requiredFields = log.mode === 'full'
    ? getRequiredFields(log.subformId ?? 90)
    : PROPOSAL_REQUIRED_FIELDS;

  // Merge dateFished into data map for unified lookup
  const dataWithTop: Record<string, string> = {
    dateFished: log.dateFished,
    ...log.data,
  };

  let filled = 0;
  for (const field of requiredFields) {
    const val = dataWithTop[field];
    if (val && val.trim() !== '') filled++;
  }

  // Array fields: bait (full only) + bycatch (both)
  const arrayTotal = log.mode === 'full' ? 2 : 1;
  let arrayFilled = 0;

  try {
    const bycatch = JSON.parse(log.data.bycatchEntries || '[]');
    if (bycatch.length > 0) arrayFilled++;
  } catch { /* noop */ }

  if (log.mode === 'full') {
    try {
      const bait = JSON.parse(log.data.baitEntries || '[]');
      if (bait.length > 0) arrayFilled++;
    } catch { /* noop */ }
  }

  const total = requiredFields.length + arrayTotal;
  return Math.round(((filled + arrayFilled) / total) * 100);
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
}

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