// dfoStorageKeys.ts — the ONE source of truth for DFO AsyncStorage key derivation.
//
import AsyncStorage from '@react-native-async-storage/async-storage';
//
// Phase 1 of DFO storage namespacing (Session 87). Historically the 7 DFO stores used
// FIXED, device-level keys (e.g. `@lobsterlog:dfo_logs`), so two accounts on one phone
// shared one set of logs/settings — account A's data leaked into account B. This module
// makes every DFO key derive from the currently signed-in Firebase auth UID, so accounts
// COEXIST: each uid reads/writes only its own namespace.
//
// Two ways a uid reaches a key:
//   • UI accessors (captainStorage, dfoLogStorage, crew, the two form generators) read the
//     AMBIENT active uid set by useAuth's onAuthStateChanged — they never take a uid arg.
//   • backup/restore/delete (dfoBackup) pass the uid EXPLICITLY, because they can run at
//     moments where the ambient uid is being torn down (e.g. clear-on-delete after
//     deleteUser has nulled identity).
//
// Phase 2 (Session 88) adds migrateBareKeysToUid() at the bottom — co-located here because
// this is the one place that knows BOTH the bare (pre-namespacing) and the ::uid forms.

// ── Ambient active uid ───────────────────────────────────────────────────────────────
// Set once from useAuth's onAuthStateChanged (the single place identity is set/cleared,
// and the app gates all DFO screens behind user != null — so this is always populated
// before any DFO screen can read a key). null when signed out.
let activeDfoUid: string | null = null;

export function setActiveDfoUid(uid: string | null): void {
  activeDfoUid = uid;
}

export function getActiveDfoUid(): string | null {
  return activeDfoUid;
}

// ── The 7 DFO store base keys ────────────────────────────────────────────────────────
// Verbatim copies of the historical fixed keys — the un-namespaced BASE that dfoKey()
// suffixes with the uid. Three naming conventions on purpose (they are the real existing
// keys); do NOT normalize them. Frozen so no caller can mutate the set.
export const DFO_STORE_BASES = Object.freeze({
  captain_profile: '@lobsterlog:captain_profile',
  dfo_logs: '@lobsterlog:dfo_logs',
  xml_archive: '@lobsterlog_xml_archive',
  transmission_register: '@lobsterlog_transmission_register',
  form222_entries: '@form222_entries',
  form233_entries: '@form233_entries',
  saved_crew: '@lobsterlog:saved_crew',
} as const);

// ── Key derivation ───────────────────────────────────────────────────────────────────
// Returns the uid-namespaced AsyncStorage key for a base.
//   • uid passed          → `${base}::${uid}`            (explicit — backup/restore/delete)
//   • no uid, ambient set  → `${base}::${activeDfoUid}`  (UI accessors)
//   • no uid at all        → `${base}::__anon__`         (FAIL-CLOSED empty namespace)
//
// The fail-closed anon namespace is deliberate: it is NEVER the bare base. Pre-namespacing
// data lives under the bare base; returning the bare base here would let a signed-out (or
// pre-migration) read silently touch that legacy data. `__anon__` guarantees a signed-out
// context reads/writes an isolated empty namespace instead.
export function dfoKey(base: string, uid?: string | null): string {
  const effective = uid ?? activeDfoUid;
  if (!effective) return `${base}::__anon__`;
  return `${base}::${effective}`;
}

// ── Phase 2: one-time bare-key → uid-namespace migration ─────────────────────────────
// Adopt-on-sign-in. Pre-namespacing data lives under the BARE keys (DFO_STORE_BASES.*, no
// ::uid suffix). On the first sign-in after the namespacing update, the signed-in uid ADOPTS
// that legacy single-account data into its own namespace, then the adopted bare keys are
// cleared — the cleared bare keys ARE the done-signal (no separate migration marker). The
// FIRST uid to sign in claims the data; a later account finds the bare keys already gone.
//
// Phase 2b: adoption is EMPTY-SLOT-ONLY and per-key. A bare key is adopted only when its
// ::uid target is currently null/empty; if the target already holds data, that key is SKIPPED
// entirely (not copied, not cleared) so migration can NEVER overwrite existing per-uid data.
// This also makes the call order-insensitive vs. any concurrent per-uid write.
//
// Copy-verify-clear so a crash can never lose data:
//   PHASE A — for each bare key WITH data whose ::uid target is EMPTY, copy bare → ::uid
//             (one multiSet of just those keys). Non-empty targets are skipped.
//   PHASE B — re-read every ADOPTED ::uid key; confirm it matches. ANY mismatch → return
//             verify_failed and DELETE NOTHING (bare data survives for a retry).
//   PHASE C — only after all verifies pass, clear ONLY the adopted bare keys (one
//             multiRemove). Skipped bare keys are LEFT in place, untouched.
// Never throws — any exception returns an error result with nothing deleted.
export async function migrateBareKeysToUid(
  uid: string,
): Promise<{ migrated: boolean; count: number; error?: string }> {
  try {
    const bases = Object.values(DFO_STORE_BASES);
    // Read every bare key (raw base string, NO uid → the un-namespaced legacy key).
    const barePairs = await AsyncStorage.multiGet(bases);

    // Keep only the stores that actually carry legacy data.
    const withData: [string, string][] = [];
    for (const [base, value] of barePairs) {
      if (value != null) withData.push([base, value]);
    }
    if (withData.length === 0) {
      return { migrated: false, count: 0 }; // common post-migration path — cheap
    }

    // EMPTY-SLOT GATE — read the ::uid targets for the bares-with-data in one batch, then
    // adopt ONLY those whose target is null/empty. A populated target means this uid already
    // has its own data for that store → skip (never overwrite; never clear the bare key).
    const targetByKey = new Map(
      await AsyncStorage.multiGet(withData.map(([base]) => dfoKey(base, uid))),
    );
    const adopted: { base: string; nsKey: string; value: string }[] = [];
    for (const [base, value] of withData) {
      const nsKey = dfoKey(base, uid);
      if (targetByKey.get(nsKey) == null) {
        adopted.push({ base, nsKey, value }); // target empty → safe to adopt
      }
      // else: target already populated → SKIP (no copy, no clear)
    }
    if (adopted.length === 0) {
      return { migrated: false, count: 0 }; // every legacy store's target already has data
    }

    // PHASE A — copy bare → ::uid for the adopted (empty-target) keys only.
    const namespacedPairs: [string, string][] = adopted.map(
      (a): [string, string] => [a.nsKey, a.value],
    );
    await AsyncStorage.multiSet(namespacedPairs);

    // PHASE B — verify every ADOPTED ::uid key holds exactly what we intended to write.
    const verifyByKey = new Map(
      await AsyncStorage.multiGet(namespacedPairs.map(([k]) => k)),
    );
    const allVerified = namespacedPairs.every(([k, v]) => verifyByKey.get(k) === v);
    if (!allVerified) {
      return { migrated: false, count: 0, error: 'verify_failed' }; // delete nothing
    }

    // PHASE C — verified: clear ONLY the adopted bare keys (the done-signal). Skipped bares
    // (target was non-empty) are LEFT in place, untouched.
    await AsyncStorage.multiRemove(adopted.map(a => a.base));
    return { migrated: true, count: adopted.length };
  } catch {
    return { migrated: false, count: 0, error: 'exception' };
  }
}
