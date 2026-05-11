import AsyncStorage from '@react-native-async-storage/async-storage';

const SAIL_KEY = '@lobsterlog:sail_start';
const HAUL_KEY = '@lobsterlog:haul_start';

// Store the Unix ms timestamp when a timer starts
export const persistSailStart = async (ms: number): Promise<void> => {
  await AsyncStorage.setItem(SAIL_KEY, String(ms));
};

export const persistHaulStart = async (ms: number): Promise<void> => {
  await AsyncStorage.setItem(HAUL_KEY, String(ms));
};

// Clear when stopped
export const clearSailStart = async (): Promise<void> => {
  await AsyncStorage.removeItem(SAIL_KEY);
};

export const clearHaulStart = async (): Promise<void> => {
  await AsyncStorage.removeItem(HAUL_KEY);
};

// Load on app boot — returns null if not running
export const loadSailStart = async (): Promise<number | null> => {
  const v = await AsyncStorage.getItem(SAIL_KEY);
  return v ? Number(v) : null;
};

export const loadHaulStart = async (): Promise<number | null> => {
  const v = await AsyncStorage.getItem(HAUL_KEY);
  return v ? Number(v) : null;
};