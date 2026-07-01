# RECON — DFO storage uid-namespacing (Session 87, READ-ONLY)

Scope: inventory only. No code changed this session. Goal of the eventual build is to
uid-scope the 7 DFO AsyncStorage stores so two accounts can COEXIST on one device — each
sees only its own logs + settings, free sign-in/out, no data loss. Today all 7 keys are
fixed (device-level), so account A's data is visible to account B on the same phone.

Authority for every file:line below is a direct grep/read of the working tree at commit
b036bf2 (S86, in sync with origin/main).

---

## 0. Tree state at recon time (NOT clean — flagged, not touched)

`git status` was NOT clean. Deviations, none of which I touched and none of which affect
this read-only recon:

- Modified: `ios/Podfile.lock` (unrelated build artifact).
- Untracked: 15 `docs/*.md` files — all prior recon/audit reports (RECON_*, *_AUDIT_*),
  i.e. the same never-committed-doc pattern this session follows. This new file
  (`docs/RECON_namespacing_S87.md`) joins them as the 16th untracked doc.

Branch is up to date with origin/main. The prompt expected a clean tree; it isn't. Surfaced
per your "stop and tell me" instruction — I made no change to any of it. You own git.

---

## 1. The 7 in-scope stores — definition + naming

Each key is defined as a SINGLE module-level constant in its owning storage file, AND is
independently re-declared as a verbatim string literal in `dfoBackup.ts`'s
`DFO_BACKUP_STORES` array. So every in-scope key has exactly TWO definition sites (owner
const + dfoBackup literal) and ZERO scattered inline literals at call sites — all reads and
writes go through accessor functions.

Three different key conventions are in play (a prefix filter cannot enumerate them — this is
why dfoBackup hardcodes the set):

- `@lobsterlog:` (colon) — captain_profile, dfo_logs, saved_crew
- `@lobsterlog_` (underscore) — xml_archive, transmission_register
- bare `@form…` — form222_entries, form233_entries

Per-store definition sites:

- **captain_profile** `@lobsterlog:captain_profile`
  - `captainStorage.ts:3` — DEFINITION (`const CAPTAIN_KEY`)
  - `dfoBackup.ts:44` — DEFINITION (DFO_BACKUP_STORES literal)
- **dfo_logs** `@lobsterlog:dfo_logs`
  - `dfoLogStorage.ts:48` — DEFINITION (`const STORAGE_KEY`)
  - `dfoBackup.ts:41` — DEFINITION (DFO_BACKUP_STORES literal)
- **xml_archive** `@lobsterlog_xml_archive`
  - `dfoLogStorage.ts:283` — DEFINITION (`const XML_ARCHIVE_KEY`)
  - `dfoBackup.ts:42` — DEFINITION (DFO_BACKUP_STORES literal)
- **transmission_register** `@lobsterlog_transmission_register`
  - `dfoLogStorage.ts:224` — DEFINITION (`const TRANSMISSION_REGISTER_KEY`)
  - `dfoBackup.ts:43` — DEFINITION (DFO_BACKUP_STORES literal)
- **form222_entries** `@form222_entries`
  - `dfoForm222Generator.ts:11` — DEFINITION (`const STORAGE_KEY`)
  - `dfoBackup.ts:45` — DEFINITION (DFO_BACKUP_STORES literal)
  - `dfoBackup.ts:19` — comment mention only (not a use)
- **form233_entries** `@form233_entries`
  - `dfoForm233Generator.ts:10` — DEFINITION (`const STORAGE_KEY`)
  - `dfoBackup.ts:46` — DEFINITION (DFO_BACKUP_STORES literal)
- **saved_crew** `@lobsterlog:saved_crew`
  - `crewStorage.ts:3` — DEFINITION (`const CREW_KEY`)
  - `dfoBackup.ts:47` — DEFINITION (DFO_BACKUP_STORES literal)

Important consequence for the build: there are TWO sources of truth per key. `dfoBackup.ts`
already drives backup/restore/wipe/clear/empty-probe off `DFO_BACKUP_STORES.map(s =>
s.asyncStorageKey)`, so making THAT array uid-derived fixes all five dfoBackup call sites at
once. But the owning modules (captainStorage, dfoLogStorage, crewStorage, the two form
generators) each hold their OWN private const and never read DFO_BACKUP_STORES — those are
separate edits and must be kept in lockstep with the backup list or backup will target a
different key than the app reads/writes.

---

## 2. The 2 excluded stores — where touched (do NOT namespace)

- **saved_ports** `@lobsterlog:saved_ports` (legacy free-app store)
  - DEFINITION: `portStorage.ts:3` (`const PORT_KEY`)
  - Accessors: `loadPorts` (portStorage.ts:10), `savePorts` (portStorage.ts:19)
  - Call sites: `loadPorts` imported/used only in `LobsterLogProposalForm.tsx:43` (the
    legacy free-app proposal form). `savePorts` has NO call site anywhere. `PortSelector.tsx:10`
    imports only the `Port` TYPE. Confirms legacy/free-app — correctly excluded.
- **dfo_backup_consent** `@lobsterlog:dfo_backup_consent` (per-device consent flag)
  - DEFINITION: `dfoBackup.ts:83` (`const BACKUP_CONSENT_KEY`)
  - Accessors: `loadBackupConsent` (dfoBackup.ts:87), `saveBackupConsent` (dfoBackup.ts:98)
  - Call sites: `CaptainProfileScreen.tsx:68` (load → toggle state) and `:76` (save on
    toggle); also read internally by `triggerBackup`/`backupNow` in dfoBackup.ts. A per-device
    decision, deliberately NOT DFO data — correctly excluded.

### Other device-level keys found but NOT in either list (informational)

These also exist as fixed device-level keys and would likewise be shared across accounts on
one device, but they are out of the stated scope. Noting so the decision to leave them is
deliberate, not an oversight:

- `@lobsterlog:privacy_accepted` — `captainStorage.ts:84` (PRIVACY_KEY); device UX flag.
- `@lobsterlog:sail_start` / `@lobsterlog:haul_start` — `activeTimers.ts:3-4`; running-timer state.
- `user_language` — `i18n/index.ts:6`; `language_picker_shown` — `LanguagePickerScreen.tsx:16`;
  `navionics_purchase` — `navionicsStorage.ts:3`. All device/UX/entitlement, not DFO data.

---

## 3. Every AsyncStorage accessor call in src/ (key it operates on)

Full sweep of getItem/setItem/removeItem/mergeItem/multiGet/multiSet/multiRemove/getAllKeys/clear.
NO call anywhere uses a raw inline key literal, and NO key is string-built/concatenated. Every
call targets either a module-level const or `store.asyncStorageKey` from the fixed
DFO_BACKUP_STORES list. mergeItem / getAllKeys / clear are NOT used anywhere in the app.

In-scope-store calls:

- captain_profile (CAPTAIN_KEY): `captainStorage.ts:45` getItem, `:54` setItem
- dfo_logs (STORAGE_KEY): `dfoLogStorage.ts:55` getItem, `:81` setItem, `:100` setItem, `:113` setItem
- transmission_register (TRANSMISSION_REGISTER_KEY): `dfoLogStorage.ts:249` getItem, `:254` setItem, `:262` getItem
- xml_archive (XML_ARCHIVE_KEY): `dfoLogStorage.ts:293` getItem, `:298` setItem, `:306` getItem
- form222_entries (STORAGE_KEY): `dfoForm222Generator.ts:75` setItem, `:80` getItem
- form233_entries (STORAGE_KEY): `dfoForm233Generator.ts:41` setItem, `:46` getItem
- saved_crew (CREW_KEY): `crewStorage.ts:13` getItem, `:22` setItem

The DYNAMIC / variable-keyed calls (the easy-to-miss ones — all in dfoBackup.ts, all keyed off
the fixed DFO_BACKUP_STORES list, NOT inline literals):

- `dfoBackup.ts:121` — getItem(`store.asyncStorageKey`) inside the backup loop
- `dfoBackup.ts:189` — multiSet(`pairs`) on restore (keys from DFO_BACKUP_STORES)
- `dfoBackup.ts:190` — multiRemove(`removeKeys`) on restore
- `dfoBackup.ts:237` — multiRemove(`DFO_BACKUP_STORES.map(...)`) — clearLocalDfoStores
- `dfoBackup.ts:252` — multiGet(`keys`) — isDfoLocalEmpty

Excluded-store / out-of-scope calls (for completeness): saved_ports `portStorage.ts:12/21`;
dfo_backup_consent `dfoBackup.ts:89/100`; privacy_accepted `captainStorage.ts:88/97`;
sail/haul `activeTimers.ts:8/12/17/21/26/31`; navionics `navionicsStorage.ts:15/21/30`;
language `i18n/index.ts:32/39`; language_picker `LanguagePickerScreen.tsx:25`; and the raw
`AsyncStorage.getItem('language_picker_shown')` at `App.tsx:238` (inline literal, but
out-of-scope UX flag).

---

## 4. Thread-uid-through map — accessor functions and EVERY call site

This is the leak-surface map. For each store, the wrapping accessor(s) and every place the
app invokes them. A missed caller = a silent isolation hole. "internal" = called from within
the owning module (will be fixed automatically when the module's const becomes uid-derived).

### dfo_logs — `dfoLogStorage.ts` (the widest thread)
Accessors: `loadAllLogs` (:53), `saveLog` (:76), `loadLogById` (:90), `deleteLog` (:96),
`markSentToDfo` (:109), `saveDraft` (:151, wraps saveLog), `generateNewLogMeta` (:122, reads
via loadAllLogs), `loadLastLog` (:217, reads via loadAllLogs). All eight touch the one
@lobsterlog:dfo_logs key.

External call sites:
- `FullDfoForm.tsx` — saveLog :642, :662, :1170; loadLogById :363; generateNewLogMeta :497, :527;
  loadLastLog :503; imports saveDraft :39 (back-autosave path)
- `LobsterLogProposalForm.tsx` (legacy free-app form, still writes the SAME store) — saveLog
  :216, :469; loadLogById :223; loadLastLog :283
- `DfoLogsListScreen.tsx` — loadAllLogs :156, :222; deleteLog :366; markSentToDfo :318
- `LogHistoryScreen.tsx` — loadAllLogs :88
- `InspectionModeScreen.tsx` — loadAllLogs :31
- `Form222Screen.tsx` — loadLastLog :127 (prefills LGBK_NUM_REF from the last log)
- `DfoDemoScreen.tsx:23` — calls `formRef.current.saveDraft()` (FullDfoForm imperative handle,
  which routes to the dfo_logs writers)
- internal: loadAllLogs at dfoLogStorage.ts:78,91,98,111,131,218

### captain_profile — `captainStorage.ts` (widest after dfo_logs; only store read at App root)
Accessors: `loadCaptainProfile` (:43), `saveCaptainProfile` (:52). (`isProfileComplete` :75 is
pure — no storage.)

External call sites:
- `App.tsx` — loadCaptainProfile :237; saveCaptainProfile :366, :373, :380
- `DfoSetupScreen.tsx` — loadCaptainProfile :65, :93, :129; saveCaptainProfile :66, :94, :130
- `CaptainProfileScreen.tsx` — loadCaptainProfile :67; saveCaptainProfile :118
- `FullDfoForm.tsx` — loadCaptainProfile :493
- `DfoLogsListScreen.tsx` — loadCaptainProfile :204
- `Form222Screen.tsx` — loadCaptainProfile :125
- `Form233Screen.tsx` — loadCaptainProfile :75
- `TripStartConfirmScreen.tsx` — loadCaptainProfile :33
- `DfoTestHarnessScreen.tsx` — loadCaptainProfile :117, :166 (DEV-only)
- `InspectionModeScreen.tsx` — loadCaptainProfile :30

### transmission_register — `dfoLogStorage.ts`
Accessors: `saveTransmissionRecord` (:247), `loadTransmissionRegister` (:260).
(`transmissionKind` :269 is pure.)

External call sites:
- `DfoLogsListScreen.tsx` — saveTransmissionRecord :200, :316; loadTransmissionRegister :159
- `LogHistoryScreen.tsx` — loadTransmissionRegister :91
- `submitDfoXml.ts` — saveTransmissionRecord :165, :176, :195, :201 (form 222/233 send path)

### xml_archive — `dfoLogStorage.ts`
Accessors: `saveXmlArchiveEntry` (:291), `loadXmlArchive` (:304).

External call sites:
- `DfoLogsListScreen.tsx` — saveXmlArchiveEntry :317
- `submitDfoXml.ts` — saveXmlArchiveEntry :196
- `loadXmlArchive` — **ZERO call sites anywhere** (defined but never read; dead reader today).
  Namespacing it is still required for write-side isolation, but nothing in the app surfaces it.

### form222_entries — `dfoForm222Generator.ts`
Accessors: `saveForm222Entry` (:71), `loadForm222Entries` (:78).

External call sites:
- `Form222Screen.tsx` — saveForm222Entry :294
- `loadForm222Entries` — only internal (dfoForm222Generator.ts:72, called by the save fn).
  No screen reads the 222 entries list directly; the register screens read the transmission
  register instead.

### form233_entries — `dfoForm233Generator.ts`
Accessors: `saveForm233Entry` (:37), `loadForm233Entries` (:44).

External call sites:
- `Form233Screen.tsx` — saveForm233Entry :181
- `loadForm233Entries` — only internal (dfoForm233Generator.ts:38). Same pattern as 222.

### saved_crew — `crewStorage.ts`
Accessors: `loadCrew` (:11), `saveCrew` (:20), `addCrewMember` (:26), `deleteCrewMember` (:36).

External call sites (all in one component):
- `CrewSelector.tsx` — loadCrew :30; addCrewMember :47; deleteCrewMember :60
- internal: loadCrew at crewStorage.ts:27,37; saveCrew at :32,38

### All 7 at once — `dfoBackup.ts` (already abstracted over the key list)
`backupAllStores` (:116), `restoreAllStores` (:144), `wipeAllStores` (:209),
`clearLocalDfoStores` (:235), `isDfoLocalEmpty` (:249) all iterate
`DFO_BACKUP_STORES.map(s => s.asyncStorageKey)`. These are the single chokepoint that, once
the list is uid-derived, cover backup/restore/wipe/clear/empty-probe for every store
simultaneously. Their external callers are in section 6.

---

## 5. Definition shape — chokepoint vs scattered

Verdict: NO store has scattered inline literals. Every store is chokepointed behind ONE
module-level const plus a small set of accessor functions; not a single call site passes a raw
key string. This is the low-risk shape for namespacing — the keys live in 7 const declarations
(one per owning module) plus the 7 DFO_BACKUP_STORES literals.

The one structural wrinkle is DUPLICATION, not scattering: each key string is written twice
(owning module const + dfoBackup.ts DFO_BACKUP_STORES literal), and the rest of the app reads
keys from NEITHER a single shared module — each owning file hardcodes its own const, and
dfoBackup hardcodes its own parallel list. There is no `dfoStorageKeys.ts` shared source of
truth. So "where is each key defined" has two answers per key that must not drift.

`dfoBackup.ts` is the only file that treats the key set as data (the DFO_BACKUP_STORES array),
and `clearLocalDfoStores` (:235) already carries a comment (lines 226-234) noting it is
written against the array specifically so it "stays correct once those keys become per-uid."
That intent is real but only covers the dfoBackup-owned call sites; the owning-module consts
are untouched by it.

Risk ranking by thread width (number of call sites / files to convert):
- captain_profile — ~20 call sites across 10 files (incl. App.tsx root, DfoSetup ×6). Highest.
- dfo_logs — ~18 call sites across 7 files (incl. the legacy proposal form). High.
- transmission_register — ~6 call sites across 3 files. Medium.
- xml_archive — 2 writer call sites, 0 readers. Low.
- saved_crew — 3 call sites, all in CrewSelector.tsx. Low.
- form222_entries — 1 external call site. Lowest.
- form233_entries — 1 external call site. Lowest.

---

## 6. Sign-out, restore-on-sign-in, and delete — current fixed-key assumptions

### Sign-out — `src/Hooks/useAuth.ts` (capital H)
`handleSignOut = () => signOut(auth)` (useAuth.ts:90). It clears NOTHING locally — no DFO
keys, no anything. This is the crux of today's leak: after account A signs out, all 7 DFO
stores remain on-device under the fixed keys, so when account B signs in, B reads A's logs,
profile, register, crew, and forms. (RevenueCat logOut fires via the onAuthStateChanged
branch at useAuth.ts:48, but that is entitlements, not DFO storage.)

Implication for the build: with per-uid keys, sign-out can stay a no-op clear (each uid's data
sits in its own namespace and is simply not read by another uid) — coexistence, NOT
clear-on-sign-out. That is the stated goal. The behavior change is entirely in how keys are
derived, not in adding a wipe to sign-out.

### Restore-on-sign-in — `App.tsx:206-229`
A `useEffect` keyed on `user?.uid`, guarded by `restoredUidRef` (once per uid per session):
- `App.tsx:219` — `if (!(await isDfoLocalEmpty())) return;` — the empty-local gate
- `App.tsx:220` — `const result = await restoreAllStores(uid);`
Both `isDfoLocalEmpty` and `restoreAllStores` read/write the 7 FIXED keys today (via
DFO_BACKUP_STORES). So the gate currently means "is there ANY DFO data on this device,
regardless of which account it belongs to." Under namespacing this must become per-uid
(`isDfoLocalEmpty(uid)` over that uid's namespace), or the gate will misfire: account A's
data on the device makes the gate read non-empty and SUPPRESSES account B's legitimate
restore. Sequencing of migration vs this restore is the key correctness question (see §7).

### Delete flow — `useAuth.ts:115-152` (confirmReauthDelete) + `dfoBackup.ts`
Order today: reauth → `wipeAllStores(user.uid)` (cloud, block-and-retry) → `deleteDoc(users/uid)`
→ `deleteUser` → `clearLocalDfoStores()` (useAuth.ts:148). `clearLocalDfoStores` (dfoBackup.ts:235)
multiRemoves the 7 FIXED keys. Under namespacing this must clear the SIGNED-IN uid's namespaced
keys only — deleting account A on a shared device must NOT wipe account B's local data. Because
clearLocalDfoStores already derives its key list from DFO_BACKUP_STORES, making that list
uid-scoped fixes this call site for free (the existing comment anticipates exactly this), PROVIDED
the uid in scope at delete time is the account being deleted.

Note: `dfoUids.ts` is unrelated — it only generates DFO LGBK_UID/REPORT_UID strings (Rule 181),
NOT storage-key uids. Name collision only; not a namespacing helper.

---

## 7. Migration surface — what's on-device today, and the options

### What exists today
For the current single DFO account, all 7 stores sit under the fixed device-level keys with NO
account scoping: dfo_logs (the harvester's logs + drafts, the data:Record blob with all field
values, remarks, sentToDfo, lgbkUid, tripNum), captain_profile (operator/licence/FIN/VRN/
elogKey/region/units/language), xml_archive + transmission_register (3-year DFO retention
records — regulatory), form222_entries + form233_entries (marine-mammal + inactivity entries),
and saved_crew. Cloud backup MAY hold a copy under backups/{uid} in the dfo-elog DB, but ONLY
if the harvester turned consent ON (default OFF, dfoBackup.ts:83-94) — so for many users the
ONLY copy of this data is the local fixed keys. That is what makes migration load-bearing: get
it wrong and a user with consent OFF loses their logbook.

On first launch after the namespacing update, that fixed-key data must end up readable under
the currently-signed-in uid's namespace without loss. The complication: the device may launch
SIGNED OUT (Firebase restores auth async; the fixed-key data has no uid stamped on it, so the
app cannot prove which account it belongs to before someone signs in).

### Options (enumerated, NOT chosen)

1. **Eager copy-then-delete on first authenticated launch.** When a uid first becomes known
   after the update, copy each fixed key → its uid-namespaced key, then remove the fixed key.
   Risk: ownership ambiguity — the first uid to sign in claims the legacy data even if it
   belonged to a different account; if launched signed-out, migration must defer; no
   transaction means a crash mid-copy can half-migrate (some keys moved, some not). Pairs
   badly with the restore gate unless sequenced (see option 6 note).

2. **Adopt-on-first-sign-in (claim).** Leave fixed keys untouched until a uid signs in;
   that uid "adopts" the legacy blob into its namespace (copy then delete the fixed keys).
   Same wrong-account risk as (1) if the user signs in with a second account first, but it
   never runs unauthenticated. Simplest mental model for "the existing data belongs to whoever
   logs in first."

3. **Read-through fallback (no move).** Namespaced accessors first read the uid key; on miss,
   fall back to the legacy fixed key (and optionally lazily migrate it). Risk: without a
   single "owner uid" guard, the fallback leaks legacy data into EVERY account that reads on a
   miss — directly re-introducing the leak. Also spreads fallback logic into all 7 modules.

4. **One-time migration with an explicit owner record.** Persist a "migration done + owning
   uid" marker; only that uid ever sees the legacy data (via move or guarded fallback).
   Removes the wrong-account leak of (3) but adds marker/owner bookkeeping and an edge case
   when the owner uid never signs in again.

5. **Abandon legacy + rely on cloud restore.** Treat fixed keys as orphaned; signed-in users
   re-populate their namespace from the dfo-elog backup. Risk: DATA LOSS for every user with
   consent OFF (the majority by default) — their only copy is the local fixed keys. Likely a
   non-starter alone, but viable as a fallback layered under (1)/(2)/(4).

6. **Hybrid: migrate-before-gate.** Any of (1/2/4) but explicitly ordered BEFORE the App.tsx
   restore gate runs for that uid, so the empty-local probe sees the post-migration namespace.
   Without this ordering, isDfoLocalEmpty(uid) on a fresh namespace reads empty → auto-restore
   pulls cloud data into the new namespace while the un-migrated legacy local blob sits
   orphaned (invisible, not lost) — or, worse, the two interleave. The migration vs restore
   ordering is the single most important correctness decision regardless of which option is
   picked.

Cross-cutting risks to weigh for any option: no AsyncStorage transaction (every move is
non-atomic — same torn-write caveat dfoBackup already documents for restore); the
signed-out-at-launch window; the irregular three-convention key names (the migrator must
enumerate the exact 7, not prefix-scan); and keeping the owning-module consts and
DFO_BACKUP_STORES in lockstep so migration moves the same key the app later reads.

---

## 8. One-line build implications (not a plan — pointers for next session)

- Two definition sites per key (owning const + DFO_BACKUP_STORES) must both become uid-derived
  and stay in lockstep, or backup targets a different key than the app.
- dfoBackup.ts's five functions are a ready-made chokepoint (already list-driven); the five
  owning modules are five separate const→function conversions.
- captain_profile and dfo_logs are the wide threads (~20 and ~18 call sites); the form stores
  and crew are trivial; xml_archive has no reader.
- Sign-out stays a no-op for coexistence; the App.tsx restore gate and delete's
  clearLocalDfoStores must both go per-uid; migration must be ordered before the restore gate.
