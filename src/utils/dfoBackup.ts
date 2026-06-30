import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFirestore, doc, setDoc } from '@react-native-firebase/firestore';
import { auth } from '../../firebaseConfig';

// ─────────────────────────────────────────────────────────────────────────────
// DFO backup/restore — foundation module (Session 84, Phase 1).
//
// This module knows TWO things and nothing else yet:
//   1. the exact set of DFO-side AsyncStorage stores we mirror to the cloud, and
//   2. the dfo-elog per-UID Firestore path those stores live under.
//
// Phase 1 wires NOTHING into the save or send paths — there are no read/write
// calls to Firestore here. Phase 2 adds best-effort write-through; Phase 3 adds
// restore. The store list + path shape are fixed here so both later phases agree.
//
// Source of truth for the store list: docs/RECON_dfo_backup_S84.md. The keys use
// THREE different naming conventions (`@lobsterlog:`, `@lobsterlog_`, and bare
// `@form222_entries`), so the set is hardcoded — a prefix filter would silently
// miss the two form stores. Deliberately EXCLUDED, per the recon + the Phase-1
// brief: `@lobsterlog:saved_ports` (legacy free-app store) and
// `@lobsterlog:privacy_accepted` (device-local UX state, not DFO data).
// ─────────────────────────────────────────────────────────────────────────────

// The named Firestore database that holds DFO backup data: dfo-elog
// (northamerica-northeast1). This is NOT (default) — (default) holds the free/Pro
// data the rest of the app uses, and backup/restore never touches it.
export const DFO_BACKUP_DB_ID = 'dfo-elog';

// One DFO-side store to back up: a stable id (used as the Firestore document id)
// paired with its AsyncStorage key copied verbatim from the recon.
export interface DfoBackupStore {
  /** stable id — the Firestore document id under the user's backup path */
  id: string;
  /** the AsyncStorage key, verbatim from docs/RECON_dfo_backup_S84.md */
  asyncStorageKey: string;
}

// The exact 7 DFO-side stores, in a fixed order. Keys are verbatim from the recon.
export const DFO_BACKUP_STORES: DfoBackupStore[] = [
  { id: 'dfo_logs',              asyncStorageKey: '@lobsterlog:dfo_logs' },
  { id: 'xml_archive',           asyncStorageKey: '@lobsterlog_xml_archive' },
  { id: 'transmission_register', asyncStorageKey: '@lobsterlog_transmission_register' },
  { id: 'captain_profile',       asyncStorageKey: '@lobsterlog:captain_profile' },
  { id: 'form222_entries',       asyncStorageKey: '@form222_entries' },
  { id: 'form233_entries',       asyncStorageKey: '@form233_entries' },
  { id: 'saved_crew',            asyncStorageKey: '@lobsterlog:saved_crew' },
];

// What one backed-up store looks like as a Firestore document. `raw` is the
// AsyncStorage value copied VERBATIM (the exact JSON string, or null when the
// store has never been written) — Phase 2 round-trips this byte-for-byte so
// nested typed fields (gridId / statSectId / displays inside the DfoLog `data`
// blob) survive without reconstruction. `updatedAt` is stamped at write time
// (Phase 2), hence optional here.
export interface DfoBackupStoreDoc {
  storeId: string;
  key: string;
  raw: string | null;
  updatedAt?: number;
}

// ── dfo-elog per-UID path shape ──────────────────────────────────────────────
// All backup data lives under the signed-in user's Firebase auth UID:
//     backups/{uid}/stores/{storeId}
// one document per store. Free/Pro data (on the (default) database) is untouched.
export const backupCollectionPath = (uid: string): string =>
  `backups/${uid}/stores`;

export const backupDocPath = (uid: string, storeId: string): string =>
  `backups/${uid}/stores/${storeId}`;

// Handle to the dfo-elog named database. Defined here so Phase 2/3 share one
// definition. NOT called anywhere in Phase 1 — no cloud I/O happens yet.
export function getDfoBackupDb() {
  return getFirestore(getApp(), DFO_BACKUP_DB_ID);
}

// ── Local consent flag ───────────────────────────────────────────────────────
// Backup is OFF until the harvester turns it on. Stored as its OWN AsyncStorage
// key, kept out of CaptainProfile on purpose: the profile is itself a backed-up
// store, and consent is a per-device decision, not DFO data that should sync.
const BACKUP_CONSENT_KEY = '@lobsterlog:dfo_backup_consent';

// Returns the harvester's backup consent. Defaults to false (OFF) when the flag
// has never been written — nothing backs up until this returns true.
export async function loadBackupConsent(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(BACKUP_CONSENT_KEY);
    return v === 'true';
  } catch {
    return false;
  }
}

// Persists the backup consent locally. Written immediately on toggle so the
// choice survives an app restart independent of the profile Save button.
export async function saveBackupConsent(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(BACKUP_CONSENT_KEY, enabled ? 'true' : 'false');
  } catch {
    /* best-effort; a failed write just leaves the prior value in place */
  }
}

// ── Cloud write (Phase 2 Step A) ─────────────────────────────────────────────
// NON-NEGOTIABLE: a backup cloud-write failure must NEVER propagate into a save
// or a send. Every entry point below either swallows its own errors (returns a
// flag, never throws) or is fire-and-forget with a terminal .catch().

// Full snapshot: read all 7 DFO stores from AsyncStorage and write each one's
// raw blob VERBATIM to backups/{uid}/stores/{storeId} in the dfo-elog database.
// The raw string is stored untouched (or null when the store is empty) — never
// parsed/reconstructed — so the data round-trips byte-for-byte on restore.
// Wrapped whole in try/catch → { ok: false } on any error; never throws.
export async function backupAllStores(uid: string): Promise<{ ok: boolean }> {
  try {
    const db = getDfoBackupDb();
    const now = Date.now();
    for (const store of DFO_BACKUP_STORES) {
      const raw = await AsyncStorage.getItem(store.asyncStorageKey); // string | null
      const docData: DfoBackupStoreDoc = {
        storeId: store.id,
        key: store.asyncStorageKey,
        raw,            // VERBATIM — exact AsyncStorage value, not re-serialized
        updatedAt: now,
      };
      await setDoc(doc(db, backupDocPath(uid, store.id)), docData);
    }
    return { ok: true };
  } catch (err) {
    console.warn('[dfoBackup] backupAllStores failed (swallowed):', err);
    return { ok: false };
  }
}

// Fire-and-forget hook entry point. Called from DFO save/send sites. Returns
// void synchronously; the actual work runs detached. It can NOT throw and can
// NOT surface a rejected promise — the terminal .catch() guarantees that even if
// something unexpected rejected, nothing in a save/send path ever sees it.
//   (a) consent OFF  → do nothing
//   (b) no Firebase uid (signed out) → do nothing
//   (c) otherwise back up; log success/failure to console only.
export function triggerBackup(): void {
  (async () => {
    const consent = await loadBackupConsent();
    if (!consent) return;                         // (a) OFF
    const uid = auth.currentUser?.uid;
    if (!uid) return;                             // (b) no account
    const result = await backupAllStores(uid);    // (c) never throws
    if (result.ok) console.log('[dfoBackup] write-through backup complete');
    else console.warn('[dfoBackup] write-through backup failed (swallowed)');
  })().catch(() => { /* unreachable by design — belt-and-suspenders */ });
}

// MANUAL path for the "Back up now" button. Same gates as triggerBackup, but
// AWAITED and it RETURNS a result so the button can show feedback. This is the
// ONLY place a backup result surfaces to the UI. Still never throws.
export async function backupNow(): Promise<{ ok: boolean; reason?: string }> {
  try {
    const consent = await loadBackupConsent();
    if (!consent) return { ok: false, reason: 'consent-off' };
    const uid = auth.currentUser?.uid;
    if (!uid) return { ok: false, reason: 'no-account' };
    const result = await backupAllStores(uid);
    if (result.ok) {
      console.log('[dfoBackup] manual backup complete');
      return { ok: true };
    }
    console.warn('[dfoBackup] manual backup failed');
    return { ok: false, reason: 'offline' };
  } catch (err) {
    console.warn('[dfoBackup] backupNow failed (swallowed):', err);
    return { ok: false, reason: 'offline' };
  }
}
