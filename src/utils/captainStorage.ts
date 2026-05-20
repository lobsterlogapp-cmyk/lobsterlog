import AsyncStorage from '@react-native-async-storage/async-storage';

const CAPTAIN_KEY = '@lobsterlog:captain_profile';

export interface CaptainProfile {
  operatorName: string;
  licenceHolderFin: string;
  vesselNumber: string;
  fishingNumber: string;
  fishingArea: string;
  totalGearCount: string;
  gearType: string;
}

export const EMPTY_PROFILE: CaptainProfile = {
  operatorName: '',
  licenceHolderFin: '',
  vesselNumber: '',
  fishingNumber: '',
  fishingArea: '',
  totalGearCount: '',
  gearType: '',
};

export async function loadCaptainProfile(): Promise<CaptainProfile> {
  try {
    const raw = await AsyncStorage.getItem(CAPTAIN_KEY);
    return raw ? { ...EMPTY_PROFILE, ...JSON.parse(raw) } : EMPTY_PROFILE;
  } catch {
    return EMPTY_PROFILE;
  }
}

export async function saveCaptainProfile(profile: CaptainProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(CAPTAIN_KEY, JSON.stringify(profile));
  } catch {}
}
