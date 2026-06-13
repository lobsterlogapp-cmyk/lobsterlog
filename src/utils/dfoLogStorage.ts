import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateLgbkUid } from './dfoUids';
import {
  DFO_FMA_LIST,
  DFO_LGRID_BY_FMA,
  DFO_FMA_LGRID_REQUIRED,
  DFO_SUBFORM_REGISTRY,
} from '../utils/dfoConstants';
// --- TYPES ---
export type DfoLogMode = 'full' | 'proposal';
export type DfoLogStatus = 'draft' | 'complete';

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
}

const STORAGE_KEY = '@lobsterlog:dfo_logs';

// --- CORE HELPERS ---

// Load every saved log, newest first
export const loadAllLogs = async (): Promise<DfoLog[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
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
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (err) {
    console.error('Failed to save DFO log:', err);
    return false;
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
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
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
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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

// --- COMPLETION PERCENTAGE ---

// Required fields for the Full DFO form — per subform
export const FULL_DFO_REQUIRED_FIELDS: Record<number, string[]> = {
  88: ['operName', 'startDt', 'fmaId', 'catchWeight', 'trapHauls', 'lgbkUid', 'firstEntryDt', 'crewNb', 'portId'],
  89: ['operName', 'startDt', 'fmaId', 'catchWeight', 'trapHauls', 'lgbkUid', 'firstEntryDt'],
  90: ['operName', 'startDt', 'fmaId', 'lgridCodeId', 'catchWeight', 'trapHauls', 'lgbkUid', 'firstEntryDt', 'crewNb'],
  91: ['operName', 'startDt', 'fmaId', 'catchWeight', 'trapHauls', 'lgbkUid', 'firstEntryDt', 'portId'],
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

const TRANSMISSION_REGISTER_KEY = '@lobsterlog_transmission_register';
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
}

export async function saveTransmissionRecord(record: TransmissionRecord): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(TRANSMISSION_REGISTER_KEY);
    const existing: TransmissionRecord[] = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - THREE_YEARS_MS;
    const pruned = existing.filter(r => r.attemptedAt >= cutoff);
    pruned.push(record);
    await AsyncStorage.setItem(TRANSMISSION_REGISTER_KEY, JSON.stringify(pruned));
  } catch (err) {
    console.error('Failed to save transmission record:', err);
  }
}

export async function loadTransmissionRegister(): Promise<TransmissionRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(TRANSMISSION_REGISTER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// --- XML ARCHIVE (DFO Standard: 3-year retention) ---

const XML_ARCHIVE_KEY = '@lobsterlog_xml_archive';

export interface XmlArchiveEntry {
  logId: string;
  savedAt: number;  // Date.now()
  xml: string;      // full XML string (not SOAP wrapped)
}

export async function saveXmlArchiveEntry(entry: XmlArchiveEntry): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(XML_ARCHIVE_KEY);
    const existing: XmlArchiveEntry[] = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - THREE_YEARS_MS;
    const pruned = existing.filter(e => e.logId !== entry.logId && e.savedAt >= cutoff);
    pruned.push(entry);
    await AsyncStorage.setItem(XML_ARCHIVE_KEY, JSON.stringify(pruned));
  } catch (err) {
    console.error('Failed to save XML archive entry:', err);
  }
}

export async function loadXmlArchive(): Promise<XmlArchiveEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(XML_ARCHIVE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}