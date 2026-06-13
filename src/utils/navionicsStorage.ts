import AsyncStorage from '@react-native-async-storage/async-storage';

const NAVIONICS_PURCHASE_KEY = 'navionics_purchase';

export interface NavionicsPurchase {
  purchase_id: string;
  expiration_date: string; // ISO string from Garmin
  plain_transaction_id: string; // store this — needed for refunds
  product_id: string;
  stored_at: string; // ISO string, Date.now() at time of storage
}

export async function saveNavionicsPurchase(p: NavionicsPurchase): Promise<void> {
  try {
    await AsyncStorage.setItem(NAVIONICS_PURCHASE_KEY, JSON.stringify(p));
  } catch {}
}

export async function loadNavionicsPurchase(): Promise<NavionicsPurchase | null> {
  try {
    const raw = await AsyncStorage.getItem(NAVIONICS_PURCHASE_KEY);
    return raw ? (JSON.parse(raw) as NavionicsPurchase) : null;
  } catch {
    return null;
  }
}

export async function clearNavionicsPurchase(): Promise<void> {
  try {
    await AsyncStorage.removeItem(NAVIONICS_PURCHASE_KEY);
  } catch {}
}

export function isNavionicsPurchaseActive(p: NavionicsPurchase | null): boolean {
  if (!p || !p.expiration_date) return false;
  const exp = new Date(p.expiration_date).getTime();
  if (Number.isNaN(exp)) return false;
  return exp > Date.now();
}
