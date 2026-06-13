import AsyncStorage from '@react-native-async-storage/async-storage';

const CAPTAIN_KEY = '@lobsterlog:captain_profile';

export interface CaptainProfile {
  operatorName: string;
  licenceHolderFin: string;
  vesselNumber: string;
  fishingNumber: string;
  fishingArea: string;
  fmaId: number | null;
  totalGearCount: string;
  gearType: string;
  subformId: number;
  regId: number;
  language: 'en' | 'fr';
  units: 'lbs' | 'kg';
  dfoActivated: boolean;
  dfoLicenceNo: string;
  dfoFin: string;
  elogKey: string;
}

export const EMPTY_PROFILE: CaptainProfile = {
  operatorName: '',
  licenceHolderFin: '',
  vesselNumber: '',
  fishingNumber: '',
  fishingArea: '',
  fmaId: null,
  totalGearCount: '',
  gearType: '',
  subformId: 90,
  regId: 1004,
  language: 'en',
  units: 'lbs',
  dfoActivated: false,
  dfoLicenceNo: '',
  dfoFin: '',
  elogKey: '',
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

// --- Privacy acceptance flag (persisted once, never reset) ---

const PRIVACY_KEY = '@lobsterlog:privacy_accepted';

export async function loadPrivacyAccepted(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(PRIVACY_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function savePrivacyAccepted(): Promise<void> {
  try {
    await AsyncStorage.setItem(PRIVACY_KEY, 'true');
  } catch {}
}
