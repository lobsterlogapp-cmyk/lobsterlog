import AsyncStorage from '@react-native-async-storage/async-storage';

// --- TYPES ---
export type DfoLogMode = 'full' | 'proposal';
export type DfoLogStatus = 'draft' | 'complete';

export interface DfoLog {
  id: string;                    // e.g. "LL-20260421-001"
  mode: DfoLogMode;              // 'full' or 'proposal'
  status?: DfoLogStatus;          // 'draft' or 'complete'
  sentToDfo?: boolean;           // true once "Send to DFO" is confirmed
  dateFished: string;            // "YYYY-MM-DD"
  createdAt: number;             // timestamp, for sorting
  data: Record<string, string>;  // all form fields as key/value
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
// Format: LL-YYYYMMDD-NNN where NNN is sequence number for that date
export const generateNextTripId = async (dateFished: string): Promise<string> => {
  const datePart = dateFished.replace(/-/g, '');
  const all = await loadAllLogs();
  const sameDay = all.filter((l) => l.id.startsWith(`LL-${datePart}-`));
  const nextSeq = (sameDay.length + 1).toString().padStart(3, '0');
  return `LL-${datePart}-${nextSeq}`;
};

// --- DRAFT HELPERS ---

// Save a draft (status = 'draft') — all other fields same as saveLog
export const saveDraft = async (log: Omit<DfoLog, 'status'>): Promise<boolean> => {
  return saveLog({ ...log, status: 'draft' });
};

// --- COMPLETION PERCENTAGE ---

// Required fields for the Full DFO form (16 text fields + bait array + bycatch array = 18 total)
const FULL_DFO_REQUIRED_FIELDS = [
  'dateFished', 'crewRegistry', 'departurePort', 'portLanded',
  'timeSailed', 'timeStartedHauling', 'timeStoppedHauling', 'timeOfLanding',
  'soakDuration', 'gridNumber', 'catchWeight', 'trapHauls',
  'vNotchCount', 'gpsLat', 'gpsLng', 'personalUse',
];

// Required fields for the Proposal form (9 text fields + bycatch array = 10 total)
const PROPOSAL_REQUIRED_FIELDS = [
  'dateFished', 'departurePort', 'portLanded', 'crewRegistry',
  'gridNumber', 'catchWeight', 'trapHauls',
  'timeStartedHauling', 'timeStoppedHauling',
];

export const getCompletionPercent = (log: DfoLog): number => {
  const requiredFields = log.mode === 'full'
    ? FULL_DFO_REQUIRED_FIELDS
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