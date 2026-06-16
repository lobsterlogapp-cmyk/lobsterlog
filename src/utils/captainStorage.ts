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

// Profile fields the DFO send genuinely needs, paired with the i18n label key the
// harvester already sees on the Captain Profile screen (common namespace — reused,
// not duplicated). gearType / language / units are intentionally NOT here — they
// don't block a send. Storage stays i18n-free: the caller translates these keys.
const REQUIRED_PROFILE_FIELDS: { key: keyof CaptainProfile; labelKey: string }[] = [
  { key: 'operatorName',     labelKey: 'profile.operatorNameLabel' },
  { key: 'licenceHolderFin', labelKey: 'profile.finLabel' },
  { key: 'fishingNumber',    labelKey: 'profile.fishingLicenceLabel' },
  { key: 'vesselNumber',     labelKey: 'profile.vesselNumberLabel' },
  { key: 'elogKey',          labelKey: 'profile.elogKeyLabel' },
  { key: 'fishingArea',      labelKey: 'profile.fishingAreaLabel' },
  { key: 'totalGearCount',   labelKey: 'profile.totalGearLabel' },
];

// Returns whether the profile has everything a DFO submission requires, plus the
// i18n label keys of anything still blank — for a plain-language pre-send prompt.
// Returns keys (not text) so the storage layer never imports t().
export function isProfileComplete(profile: CaptainProfile): { complete: boolean; missing: string[] } {
  const missing = REQUIRED_PROFILE_FIELDS
    .filter(f => !String(profile[f.key] ?? '').trim())
    .map(f => f.labelKey);
  return { complete: missing.length === 0, missing };
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
