# RECON — Cloud Backup Phase 3 (restore + delete-wipes-cloud) — Session 86

Read-only recon. No code changed. Goal: map where restore would hook in, how to
detect empty-local, what Delete Account does today, whether the deployed rules
allow a cloud wipe, and when a restored local write becomes visible.

- Repo: /Users/jonny/Desktop/LobsterLog (branch main)
- Date: 2026-06-30
- Every claim below is quoted from the real files.

---

## Step 1 — The post-sign-in moment

Sign-in completes inside the auth listener in src/Hooks/useAuth.ts. The uid
becomes known the instant `u` is non-null:

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);                       // line 28 — signed-in state set here
      if (u) {
        setTimeout(async () => {
          ...
          await Purchases.logIn(u.uid); // line 35 — uid in hand
        }, 500);
      } ...
      setLoading(false);                // line 45
    });

The app then renders the signed-in UI from App.tsx. The whole app is gated on
`user`; once it is set the login screen falls away and the main tree renders:

  if (!user)                            // App.tsx line 372
    return (
      <LoginScreen ... />
    );
  // line 391+ : user is set → main app renders

New-vs-returning branch: there is NONE tied to DFO data. The only "exists" check
at sign-in is the free/Pro profile snapshot on the (default) DB, in
src/Hooks/useProfile.ts:

  const profileRef = doc(db, 'users', user.uid, 'settings', 'profile'); // :34
  const unsubProfile = onSnapshot(profileRef, (snap) => {
    if (snap && snap.exists()) {        // line 36 — free/Pro only, NOT DFO
      ...

So a Phase-3 "offer restore" hook would be net-new: there is no existing
new-device branch to slot into. The natural place is right after `setUser(u)`
(uid known) or in App once `user` is set, before the user enters the DFO area.

---

## Step 2 — Empty-local detection (the 7 stores)

All 7 backup stores read with the same shape: AsyncStorage.getItem(KEY), then
`raw ? JSON.parse(raw) : []` (the profile returns EMPTY_PROFILE instead of []).
So "is this store empty" == getItem returns null. The keys are already listed in
DFO_BACKUP_STORES (dfoBackup.ts:40-46), so the cheapest all-7 check is one
AsyncStorage.multiGet of those keys; every value null/empty == empty local.

Per store — key, loader, read line:

1. `@lobsterlog:dfo_logs` — loadAllLogs (dfoLogStorage.ts:53)
   `const raw = await AsyncStorage.getItem(STORAGE_KEY); if (!raw) return [];`

2. `@lobsterlog_xml_archive` — loadXmlArchive (dfoLogStorage.ts:304)
   `const raw = await AsyncStorage.getItem(XML_ARCHIVE_KEY); return raw ? JSON.parse(raw) : [];`

3. `@lobsterlog_transmission_register` — loadTransmissionRegister (dfoLogStorage.ts:260)
   `const raw = await AsyncStorage.getItem(TRANSMISSION_REGISTER_KEY); return raw ? JSON.parse(raw) : [];`

4. `@lobsterlog:captain_profile` — loadCaptainProfile (captainStorage.ts:43)
   `return raw ? { ...EMPTY_PROFILE, ...JSON.parse(raw) } : EMPTY_PROFILE;`
   NOTE: loadCaptainProfile NEVER returns empty — it returns EMPTY_PROFILE when
   absent. For an emptiness test use the raw getItem (null) of CAPTAIN_KEY, not
   the loader's return value.

5. `@form222_entries` — loadForm222Entries (dfoForm222Generator.ts:78)
   `const raw = await AsyncStorage.getItem(STORAGE_KEY); if (!raw) return [];`

6. `@form233_entries` — loadForm233Entries (dfoForm233Generator.ts:44)
   `const raw = await AsyncStorage.getItem(STORAGE_KEY); if (!raw) return [];`

7. `@lobsterlog:saved_crew` — loadCrew (crewStorage.ts:11)
   `const raw = await AsyncStorage.getItem(CREW_KEY); return raw ? JSON.parse(raw) : [];`

Takeaway: a multiGet of the 7 keys gives a cheap, parse-free "all empty?" signal
for the new-device case. Treat null and an empty-array/empty-object string as empty.

---

## Step 3 — Delete Account today

There is exactly ONE account-deletion flow, and it is REAL (a true auth delete),
not an email-request bridge. src/Hooks/useAuth.ts handleDeleteAccount (86-107):

  onPress: async () => {
    try {
      const userRef = doc(db, 'users', user.uid);     // line 97 — (default) DB
      await deleteDoc(userRef);                        // line 98
      await deleteUser(auth.currentUser!);             // line 99 — Firebase auth delete
    } catch (error: any) { ... }
  }

It is wired to the Settings "Delete Account" button in App.tsx:

  <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>  // App.tsx:1089
    ... {t('settings.deleteAccount')}

What it does NOT touch:
- It does not clear any AsyncStorage — the local DFO stores survive on the device.
- It does not reference the dfo-elog backup at all. A grep for delete-side use of
  dfoBackup / backups/ / dfo-elog / getDfoBackupDb returns nothing.

Implication (reported, not acted on): `deleteUser` removes the Firebase auth
account, so the dfo-elog backup at backups/{uid}/** is left orphaned, and because
the rule requires request.auth.uid == uid (Step 4) it becomes permanently
unreachable — no future session can ever match that uid again. A "delete wipes
cloud" therefore has to enumerate and delete the backup store docs BEFORE
deleteUser, while the user is still authenticated. (Side note: deleteDoc only
removes the top-level users/{uid} doc on (default); its logs/settings
subcollections are also left orphaned there — Firestore does not cascade — but
that is free/Pro side, out of scope here.)

---

## Step 4 — Delete permission in the deployed rules

firestore.rules governs the dfo-elog DB. The only matching block (lines 20-23):

  match /backups/{uid}/{document=**} {
    allow read, write: if request.auth != null
                       && request.auth.uid == uid;
  }

The `{document=**}` recursive wildcard matches backups/{uid} AND everything under
it, including backups/{uid}/stores/{storeId}. In Firestore rules `write` is
shorthand for create + update + delete. So: yes, DELETE IS PERMITTED on
backups/{uid}/stores/{storeId} (and on the backups/{uid} doc itself) for the
authenticated owner where request.auth.uid == uid. No separate delete rule is
needed; no rule change is required to wipe.

Reminder (not acted on): Firestore does NOT cascade. There is no real
backups/{uid}/stores "document" to delete that would remove its children, and
deleting backups/{uid} would not remove the store docs beneath it. A wipe must
enumerate each of the 7 backups/{uid}/stores/{storeId} docs and delete each one
individually (the same fixed id set used to write them).

---

## Step 5 — DFO screen mount loads (when a restored write shows up)

Every DFO screen reads its store(s) on MOUNT, and each is conditionally rendered
off App.tsx `view` state, so leaving and returning unmounts then re-mounts it
(fresh read). None has a focus listener.

DfoLogsListScreen — refresh() reads both stores, run on mount:

  const refresh = useCallback(async () => {            // :154
    const all = await loadAllLogs();                   // :156
    ...
    const register = await loadTransmissionRegister(); // :159
    ...
  }, []);
  useEffect(() => { refresh(); }, [refresh, refreshKey]); // :166-168

`refreshKey` is a prop defaulting to 0 (DfoLogsListScreen.tsx:118,129) and App.tsx
does NOT pass it (the render at App.tsx:496-513 passes only onNewLog / onEditLog /
onViewLog / onOpenHistory). So this screen refreshes on mount plus its own
internal refresh() calls after a send/delete (lines 322, 367) — there is no
external "refresh now" lever.

LogHistoryScreen — same pattern, mount-only:
  const all = await loadAllLogs(); ... const register = await loadTransmissionRegister(); // :88,:91
  useEffect(() => { refresh(); }, [refresh, refreshKey]); // :97

CaptainProfileScreen — reads once on mount; it is a modal (onClose), so it
re-reads every time it is opened:
  useEffect(() => { loadCaptainProfile().then(setProfile); }, []); // :66-67

Important: the two form ENTRY stores (@form222_entries / @form233_entries) are NOT
read by any display screen — loadForm222Entries / loadForm233Entries are called
ONLY inside the save-merge in their generators (dfoForm222Generator.ts:72,
dfoForm233Generator.ts:38). The "Form 222/233 register" rows shown in
DfoLogsListScreen and LogHistoryScreen come from the TRANSMISSION REGISTER store,
not from these entry stores. So restoring the two form-entry stores is correct as
data (future sends / dedup / retention) but will not surface on any list UI by
itself; only the restored transmission register makes the form rows reappear.

Visibility verdict for a post-sign-in restore that writes the 7 AsyncStorage keys:
- Written BEFORE the user opens a DFO screen → visible on first open (mount reads
  fresh). No app restart needed.
- A DFO screen already on-screen during the write → it will NOT auto-update (no
  focus listener, no external refreshKey); the user must navigate away and back
  (remount) or restart.
- App restart → always shows the restored data.
- Cleanest design: run restore right after sign-in, before the user enters the
  DFO area, so the first mount of each screen reads the restored data.

---

## Notes / flags

- No unrelated issues were changed. The only pre-existing working-tree item is
  ios/Podfile.lock (modified, untouched) plus untracked docs/*.
- The load-bearing Phase-3 design facts: (a) there is no existing new-device
  branch — restore is a net-new hook after sign-in; (b) a multiGet of the 7 keys
  is the cheap empty-local probe; (c) Delete Account is a real auth delete that
  today leaves the dfo-elog backup orphaned and (post-delete) unreachable, so a
  wipe must run before deleteUser; (d) the rules already permit per-doc delete;
  (e) restored writes show on next mount, so restore-before-navigation avoids any
  restart.
