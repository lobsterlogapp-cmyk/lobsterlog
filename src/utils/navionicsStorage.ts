// navionicsStorage.ts — the stored Garmin/Navionics purchase receipt.
//
// UID-NAMESPACED (S167-G Phase 3). Historically this used ONE fixed device-level key,
// `navionics_purchase`, so two accounts on one phone shared a single chart entitlement:
// account A bought Pro, account B signed in on the same handset and the overlay gated true
// off A's receipt. This module now derives its key from the signed-in Firebase auth UID, in
// the SAME SHAPE as the seven DFO stores — `${base}::${uid}` with a fail-closed `::__anon__`
// when there is no identity. Pattern copied from src/utils/dfoStorageKeys.ts (S88); that file
// is DFO-side and was READ ONLY, never edited, never imported.
//
// WHY THE UID IS READ HERE rather than pushed in by a setter: the DFO side keeps an AMBIENT
// uid that useAuth's onAuthStateChanged assigns. Reproducing that would mean editing the DFO
// sign-in path, which Garmin work may not touch — and it would ALSO mean changing
// saveNavionicsPurchase's signature, which is called from inside runNavionicsPurchase, a file
// outside this phase's scope. Reading auth.currentUser here keeps the whole change inside the
// Navionics side and leaves every existing caller's signature untouched.
//
// THE TEARDOWN ESCAPE HATCH — every accessor takes an OPTIONAL explicit uid, for the same
// reason dfoBackup's clearLocalDfoStores(uid) does: sign-out and delete-account run at the
// moment identity is being destroyed. `deleteUser()` fires onAuthStateChanged(null), so after
// it `auth.currentUser` is null and an ambient read would resolve to `::__anon__` and clear
// the wrong (empty) namespace. Teardown callers pass the uid they captured beforehand.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../../firebaseConfig';

// The historical, un-namespaced key. Kept ONLY so the legacy receipt can be found and
// discarded — never written to again.
const NAVIONICS_PURCHASE_BASE = 'navionics_purchase';

export interface NavionicsPurchase {
  purchase_id: string;
  expiration_date: string; // ISO string from Garmin
  plain_transaction_id: string; // store this — needed for refunds
  product_id: string;
  stored_at: string; // ISO string, Date.now() at time of storage
}

// `${base}::${uid}`, or `${base}::__anon__` when there is no identity.
//
// The anon namespace is deliberately NOT the bare base — same reasoning as dfoKey(). Returning
// the bare base for a signed-out read would let it touch the legacy pre-namespacing receipt.
// `__anon__` guarantees a signed-out context reads and writes an isolated empty namespace.
export function navionicsKey(uid?: string | null): string {
  const effective = uid ?? auth.currentUser?.uid ?? null;
  if (!effective) return `${NAVIONICS_PURCHASE_BASE}::__anon__`;
  return `${NAVIONICS_PURCHASE_BASE}::${effective}`;
}

// ── The legacy bare receipt: DISCARDED, not migrated ─────────────────────────────────
// The DFO stores were MIGRATED on first sign-in (adopt-on-sign-in, S88). This one is not,
// and the difference is deliberate:
//
//   1. A DFO store holds the user's OWN records, and the bare key could only have been
//      written by the one account that had been using the device. A Navionics receipt is a
//      PAID ENTITLEMENT with no owner recorded in it. Adopting it to whoever signs in first
//      would hand one account's purchase to another — the exact defect this phase closes.
//   2. A legacy receipt may carry the WRONG TIER. Until S167-G Phase 1 (`13f598a`) every
//      restore provisioned ANNUAL regardless of what the user actually bought, so a monthly
//      subscriber's stored receipt can claim a year. Migrating would preserve that error.
//   3. It costs the user nothing visible. The Navionics overlay has never rendered — the tile
//      URL points at the purchase API host and its token variable does not exist (S167 recon
//      §A1) — so a discarded receipt removes nothing the user has ever seen. RevenueCat
//      remains the source of truth for Pro access, which is untouched.
//
// Swept once per app process, on first access. If the removal throws, the flag stays false so
// the next call retries; a failure is silent and harmless (the bare key is never READ again).
let legacySwept = false;

async function discardLegacyBareReceipt(): Promise<void> {
  if (legacySwept) return;
  try {
    await AsyncStorage.removeItem(NAVIONICS_PURCHASE_BASE);
    legacySwept = true;
  } catch {}
}

export async function saveNavionicsPurchase(
  p: NavionicsPurchase,
  uid?: string | null
): Promise<void> {
  try {
    await discardLegacyBareReceipt();
    await AsyncStorage.setItem(navionicsKey(uid), JSON.stringify(p));
  } catch {}
}

export async function loadNavionicsPurchase(
  uid?: string | null
): Promise<NavionicsPurchase | null> {
  try {
    await discardLegacyBareReceipt();
    const raw = await AsyncStorage.getItem(navionicsKey(uid));
    return raw ? (JSON.parse(raw) as NavionicsPurchase) : null;
  } catch {
    return null;
  }
}

// Wired to sign-out and to delete-account (S167-G Phase 3). Before that it existed and was
// called by nobody, so a receipt outlived both the session and the account.
//
// ⚠ CALL ORDER IS LOad-BEARING. With no uid argument this resolves through auth.currentUser,
// so it must run BEFORE signOut()/deleteUser() — afterwards it would clear `::__anon__` and
// leave the real receipt behind. Teardown paths that cannot guarantee that order must pass
// the captured uid explicitly.
export async function clearNavionicsPurchase(uid?: string | null): Promise<void> {
  try {
    await discardLegacyBareReceipt();
    await AsyncStorage.removeItem(navionicsKey(uid));
  } catch {}
}

export function isNavionicsPurchaseActive(p: NavionicsPurchase | null): boolean {
  if (!p || !p.expiration_date) return false;
  const exp = new Date(p.expiration_date).getTime();
  if (Number.isNaN(exp)) return false;
  return exp > Date.now();
}
