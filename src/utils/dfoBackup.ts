import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from '@react-native-firebase/firestore';
import { auth } from '../../firebaseConfig';
import { dfoKey, DFO_STORE_BASES } from './dfoStorageKeys';

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
// Source of truth for the store list: docs/RECON_dfo_backup_S84.md. Each entry pairs a
// stable id with the un-namespaced BASE key from DFO_STORE_BASES (dfoStorageKeys.ts — the
// one place key strings are defined). The bases use THREE naming conventions
// (`@lobsterlog:`, `@lobsterlog_`, bare `@form…`), so the set is enumerated, not
// prefix-filtered. The real per-uid AsyncStorage key is derived at call time via
// dfoKey(base, uid) — this module ALWAYS passes uid EXPLICITLY (it can run while the
// ambient uid is being torn down, e.g. clear-on-delete after deleteUser). Deliberately
// EXCLUDED, per the recon + the Phase-1 brief: `@lobsterlog:saved_ports` (legacy free-app
// store) and `@lobsterlog:privacy_accepted` (device-local UX state, not DFO data).
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
  /** the un-namespaced BASE AsyncStorage key (from DFO_STORE_BASES); the real per-uid
   *  key is derived at call time via dfoKey(base, uid) */
  base: string;
}

// The exact 7 DFO-side stores, in a fixed order. Bases come from DFO_STORE_BASES so there
// is no second definition of the key strings anywhere.
export const DFO_BACKUP_STORES: DfoBackupStore[] = [
  { id: 'dfo_logs',              base: DFO_STORE_BASES.dfo_logs },
  { id: 'xml_archive',           base: DFO_STORE_BASES.xml_archive },
  { id: 'transmission_register', base: DFO_STORE_BASES.transmission_register },
  { id: 'captain_profile',       base: DFO_STORE_BASES.captain_profile },
  { id: 'form222_entries',       base: DFO_STORE_BASES.form222_entries },
  { id: 'form233_entries',       base: DFO_STORE_BASES.form233_entries },
  { id: 'saved_crew',            base: DFO_STORE_BASES.saved_crew },
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
      const localKey = dfoKey(store.base, uid);
      const raw = await AsyncStorage.getItem(localKey); // string | null
      const docData: DfoBackupStoreDoc = {
        storeId: store.id,
        key: localKey,
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

// Full restore: read all 7 cloud docs at backups/{uid}/stores/{storeId} and write
// each one's raw blob VERBATIM back to its local AsyncStorage key. Two per-store
// outcomes are kept DISTINCT: a read that THROWS (network/permission) is a hard
// failure; a read that SUCCEEDS but finds no doc / no raw is a valid "this store
// is empty". ANY hard read failure aborts the whole restore with NOTHING written
// locally — we never apply a partial download. Only when all 7 reads succeed do we
// write. Never throws — catches and returns the failure shape.
export async function restoreAllStores(
  uid: string,
): Promise<{ ok: boolean; reason?: string; restoredCount?: number }> {
  // Phase A — fetch all 7 first. Collect into memory only; write nothing yet, so a
  // mid-way read error leaves local untouched. raw is the verbatim string, or null
  // when the cloud doc is absent/empty (a successful read with no data).
  const fetched: { store: DfoBackupStore; raw: string | null }[] = [];
  try {
    const db = getDfoBackupDb();
    for (const store of DFO_BACKUP_STORES) {
      const snap = await getDoc(doc(db, backupDocPath(uid, store.id)));
      if (!snap.exists()) {
        fetched.push({ store, raw: null });   // successful read, no doc → empty
        continue;
      }
      const data = snap.data() as DfoBackupStoreDoc | undefined;
      fetched.push({ store, raw: data && typeof data.raw === 'string' ? data.raw : null });
    }
  } catch (err) {
    console.warn('[dfoBackup] restoreAllStores fetch failed (swallowed):', err);
    return { ok: false, reason: 'fetch_failed' };
  }

  // Phase B — all 7 reads succeeded; apply locally. Apply in TWO batched ops, the
  // closest AsyncStorage gives us to all-or-nothing: one multiSet for the stores
  // that carry data, one multiRemove for the stores that came back empty (removes
  // keep an empty store in the same absent state it would naturally have).
  // restoredCount counts only the stores that actually carried data (pairs.length).
  //
  // HONEST GUARANTEE: multiSet and multiRemove are EACH an individually batched op,
  // but the two TOGETHER are NOT transactional — AsyncStorage has no real
  // transaction. We do the multiSet (data) first, then the multiRemove (empties); a
  // failure BETWEEN the two batches is the residual non-atomic window (data keys
  // written, empty keys not yet cleared). This SHRINKS the torn-write window versus
  // the old per-store setItem/removeItem loop; it does NOT eliminate it. What bounds
  // the residue: the empty-local gate (auto-restore only fires when local is fully
  // empty) and the future manual-restore guard, both of which must account for a
  // half-applied set rather than assume restore is atomic.
  try {
    const pairs: [string, string][] = [];
    const removeKeys: string[] = [];
    for (const { store, raw } of fetched) {
      const localKey = dfoKey(store.base, uid);
      if (raw === null) removeKeys.push(localKey);
      else pairs.push([localKey, raw]); // VERBATIM, not re-serialized
    }
    if (pairs.length) await AsyncStorage.multiSet(pairs);
    if (removeKeys.length) await AsyncStorage.multiRemove(removeKeys);
    return { ok: true, restoredCount: pairs.length };
  } catch (err) {
    console.warn('[dfoBackup] restoreAllStores apply failed (swallowed):', err);
    return { ok: false, reason: 'apply_failed' };
  }
}

// Wipe this UID's ENTIRE cloud backup: delete each of the 7 store docs at
// backups/{uid}/stores/{storeId}, then the parent backups/{uid} doc. Firestore
// does NOT cascade, so every doc is deleted explicitly.
//
// BLOCK-AND-RETRY shaped — the OPPOSITE of the best-effort backup paths. A wipe
// failure MUST be surfaced (returned as { ok: false }), never hidden: the caller
// (Delete Account) aborts deletion on a failure so the account is never deleted
// while a cloud copy survives. This matters because once deleteUser runs the uid
// is gone and the dfo-elog rules (request.auth.uid == uid) make the backup
// permanently unreachable. Any delete throwing returns { ok: false,
// reason: 'wipe_failed' } immediately. Never throws — catches and returns the shape.
export async function wipeAllStores(uid: string): Promise<{ ok: boolean; reason?: string }> {
  try {
    const db = getDfoBackupDb();
    // The 7 store docs — explicit, no cascade. First throw exits to the catch.
    for (const store of DFO_BACKUP_STORES) {
      await deleteDoc(doc(db, backupDocPath(uid, store.id)));
    }
    // The parent backups/{uid} doc, after the 7. deleteDoc on an absent doc is a
    // successful no-op, so this also covers the "delete it if one exists" case.
    await deleteDoc(doc(db, 'backups', uid));
    return { ok: true };
  } catch (err) {
    console.warn('[dfoBackup] wipeAllStores failed (surfaced, NOT swallowed):', err);
    return { ok: false, reason: 'wipe_failed' };
  }
}

// Clear the given account's local DFO data: ONE multiRemove of that uid's 7 namespaced
// DFO store keys. Runs as the FINAL step of a successful Delete Account so deletion
// actually removes the on-device copy — not just the cloud backup + the auth account.
// uid is passed EXPLICITLY (not read from the ambient active uid) because by the time
// this runs deleteUser has already fired and nulled the ambient uid — the caller captures
// the uid before deletion and hands it in, so we clear the RIGHT namespace and never touch
// a coexisting account's data. Best-effort + never throws: by the time this runs the
// account is already deleted, so a failure only leaves stale local data, not an
// inconsistent account.
export async function clearLocalDfoStores(uid: string): Promise<void> {
  try {
    await AsyncStorage.multiRemove(DFO_BACKUP_STORES.map(s => dfoKey(s.base, uid)));
  } catch (err) {
    console.warn('[dfoBackup] clearLocalDfoStores failed (swallowed):', err);
  }
}

// Cheap new-device probe: ONE multiGet of this uid's 7 namespaced backup keys. Returns
// true ONLY when every one is absent (null) — i.e. there is no local DFO data for THIS
// account at all. uid is passed EXPLICITLY so the probe is per-account (a coexisting
// account's data must not make this uid's namespace look non-empty). Reads the
// captain_profile RAW key directly (it's in DFO_BACKUP_STORES), NOT loadCaptainProfile —
// which falls back to EMPTY_PROFILE and would never look empty. On any error returns false
// (unknown state → do NOT auto-restore). Never throws.
export async function isDfoLocalEmpty(uid: string): Promise<boolean> {
  try {
    const keys = DFO_BACKUP_STORES.map(s => dfoKey(s.base, uid));
    const pairs = await AsyncStorage.multiGet(keys);
    return pairs.every(([, value]) => value == null);
  } catch {
    return false;
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
export async function backupNow(alreadyConsented = false): Promise<{ ok: boolean; reason?: string }> {
  try {
    // alreadyConsented = the caller just got explicit per-tap consent in a dialog
    // (the OFF-state one-off). In that case skip the standing-consent gate. The
    // default false preserves the standing-consent check for every other caller.
    if (!alreadyConsented) {
      const consent = await loadBackupConsent();
      if (!consent) return { ok: false, reason: 'consent-off' };
    }
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
