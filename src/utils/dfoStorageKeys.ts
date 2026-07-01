// dfoStorageKeys.ts — the ONE source of truth for DFO AsyncStorage key derivation.
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
// NO migration logic lives here — that is Phase 2. This phase is plumbing only.

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
