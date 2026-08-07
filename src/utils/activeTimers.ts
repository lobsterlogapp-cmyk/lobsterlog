import AsyncStorage from '@react-native-async-storage/async-storage';

const SAIL_KEY = '@lobsterlog:sail_start';
const HAUL_KEY = '@lobsterlog:haul_start';

// S124: a running Quick Capture timer is scoped to the log it was started on. We persist
// { ms, logId } so a timer only surfaces/resumes on its own log and can be cleared when that
// log is deleted. `logId` is optional — the legacy proposal form starts timers without one
// (they stay unscoped, exactly as before).
export interface ActiveTimer { ms: number; logId?: string; }

const persist = async (key: string, ms: number, logId?: string): Promise<void> => {
  await AsyncStorage.setItem(key, JSON.stringify({ ms, logId }));
};

// Back-compat: entries written before S124 were a bare number string (no logId). Parse both
// shapes — a legacy bare-number timer loads with logId undefined (unscoped, same as before).
const load = async (key: string): Promise<ActiveTimer | null> => {
  const v = await AsyncStorage.getItem(key);
  if (!v) return null;
  try {
    const parsed = JSON.parse(v);
    if (typeof parsed === 'number') return { ms: parsed };
    if (parsed && typeof parsed.ms === 'number') return { ms: parsed.ms, logId: parsed.logId };
    return null;
  } catch {
    const n = Number(v);
    return isNaN(n) ? null : { ms: n };
  }
};

export const persistSailStart = (ms: number, logId?: string): Promise<void> => persist(SAIL_KEY, ms, logId);
export const persistHaulStart = (ms: number, logId?: string): Promise<void> => persist(HAUL_KEY, ms, logId);

export const clearSailStart = (): Promise<void> => AsyncStorage.removeItem(SAIL_KEY);
export const clearHaulStart = (): Promise<void> => AsyncStorage.removeItem(HAUL_KEY);

export const loadSailStart = (): Promise<ActiveTimer | null> => load(SAIL_KEY);
export const loadHaulStart = (): Promise<ActiveTimer | null> => load(HAUL_KEY);
