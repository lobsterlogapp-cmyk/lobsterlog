import AsyncStorage from '@react-native-async-storage/async-storage';

// --- TYPES ---
export type DfoLogMode = 'full' | 'proposal';

export interface DfoLog {
  id: string;              // the Trip ID, e.g. "LL-20260421-001"
  mode: DfoLogMode;        // 'full' or 'proposal' (not shown to user, just stored)
  dateFished: string;      // "YYYY-MM-DD"
  createdAt: number;       // timestamp, for sorting
  data: Record<string, string>; // all the form fields as key/value
}

const STORAGE_KEY = '@lobsterlog:dfo_logs';

// --- HELPERS ---

// Load every saved log, newest first
export const loadAllLogs = async (): Promise<DfoLog[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const logs: DfoLog[] = JSON.parse(raw);
    // Newest first
    return logs.sort((a, b) => b.createdAt - a.createdAt);
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

// Delete a log
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

// Generate the next Trip ID for a given date
// Format: LL-YYYYMMDD-NNN where NNN is sequence number for that date
export const generateNextTripId = async (dateFished: string): Promise<string> => {
  // dateFished is "2026-04-21" → "20260421"
  const datePart = dateFished.replace(/-/g, '');
  const all = await loadAllLogs();
  const sameDay = all.filter((l) => l.id.startsWith(`LL-${datePart}-`));
  const nextSeq = (sameDay.length + 1).toString().padStart(3, '0');
  return `LL-${datePart}-${nextSeq}`;
};