# GATE — Session 99: non-French screenshot-gate remainder

Date: 2026-07-15. App 1.8.6, tip `1d9a83b` (verified). Phase 0 = recon only; NO source file
touched this phase. HARD RULES in force: NO-GIT (commands written here, Jonny runs),
NO-DFO-POST, REPORT-TO-FILE, PRINT-BEFORE-EDIT, RECON-CAN-OVERTURN-THE-PREMISE, probes/babel
reverted before commit block, CONFIRM GATE every phase.

Platform correction received mid-recon (from Jonny): both the PDF-viewer Close inset and the
Confirm-Trip-Start double header were observed on ANDROID (Pixel 8). Each item below states
iOS reproducibility (by code analysis — no device run this phase) and keeps the proposed fix
platform-guarded or provably iOS-neutral.

---

## Working-tree state at session start (flag only — not acted on)

`git status` at tip 1d9a83b:

- `M docs/CHECKLIST_S97_FR_SWEEP.md` — uncommitted modification (presumably Jonny's checklist
  ticks from the FR device runs). Not mine, not touched. Decide whether to commit it with the
  S99 docs commit or separately.
- Untracked `assets/docs/Enonce_Prerequis_FR.pdf` + `assets/docs/Presrsquisites_Statement_en.pdf`
  — already flagged in GATE_S97_FRENCH.md as not-staged. NEW FLAG: the EN filename is typo'd —
  "Presrsquisites" (→ Prerequisites). Neither file is referenced by any `require()` yet
  (DFO_DOC_SOURCES reads only providers_instructions_{en,fr}.pdf + dfo_instructions_234_7_{en,fr}.pdf,
  all four present AND tracked). Fix the filename before these are ever wired, and decide
  whether/when to commit them.
- Untracked `docs/DIAG_S95_ITEM2.md` — known since S97; still uncommitted.
- `babel.config.js` — clean (no diff). No probes anywhere at session start.

---

## 0.1 — PDF-viewer Close button under the system inset

### Where it lives
The DFO Documents PDF viewer is NOT a separate component — it is an inline `<Modal>` in
**App.tsx:1352–1376**, inside the same `App()` component that holds `docViewerVisible` /
`docViewerUri` and `openDfoDoc()` (App.tsx:449). `react-native-pdf`'s only import in the app
is App.tsx:30.

### Current code (verbatim, App.tsx:1352–1376)
```tsx
      {/* Offline DFO document viewer (S94) — full-screen in-app PDF, no network */}
      <Modal
        visible={docViewerVisible}
        animationType="slide"
        onRequestClose={() => setDocViewerVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 10 }}>
            <TouchableOpacity
              onPress={() => setDocViewerVisible(false)}
              style={{ paddingVertical: 8, paddingHorizontal: 18, backgroundColor: '#1E3A8A', borderRadius: 10 }}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 15 }}>{t('settings.docViewerClose')}</Text>
            </TouchableOpacity>
          </View>
          {docViewerUri && (
            <Pdf
              source={{ uri: docViewerUri, cache: true }}
              style={{ flex: 1, backgroundColor: '#0F172A' }}
              onError={(err) => { console.log('[DFO doc viewer] error:', err); }}
            />
          )}
        </SafeAreaView>
      </Modal>
```

### Why this overlay escapes the app-wide SafeAreaProvider
The `SafeAreaView` here is the **core react-native one** (App.tsx:16), NOT the
react-native-safe-area-context one. Two facts combine:

1. **Core RN `SafeAreaView` is iOS-only** — on Android it renders as a plain `View` (no inset
   applied). It never consults the S95 SafeAreaProvider at all; it's a different mechanism.
2. **`android/gradle.properties` has `edgeToEdgeEnabled=true`** (line 47; S95), so Android app
   content — including RN `Modal` content, which fills the window — draws under the status bar.

Result on Android: the header row starts at y=0, and the Close button sits under the status
bar / camera cutout. The app-wide SafeAreaProvider is fine; this JSX simply never uses it —
it predates S95's insets pattern (S94 build) and was written with the iOS-only primitive.

### iOS reproducibility: **NO (expected)**
On iOS the Modal is full-screen (default `presentationStyle` for a non-transparent Modal) and
core `SafeAreaView` correctly applies the notch/home-indicator insets there — that is exactly
why it looked fine on the iOS sim in S94. Android-only bug. Not a Paper/Fabric issue (both
platforms run New Architecture here); the split is core-SafeAreaView-is-iOS-only + Android
edge-to-edge.

### Proposed minimal fix (Phase 1; PROPOSAL ONLY — nothing applied)
Use the S95 house pattern (insets-driven padding — already proven to work **inside a RN
Modal** by SentLogDetailModal, S95 item 2b). `insets` is already in scope in this component
(App.tsx:177). Swap the core SafeAreaView for a plain View carrying the real insets:

- App.tsx:1358
  `<SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>`
  → `<View style={{ flex: 1, backgroundColor: '#0F172A', paddingTop: insets.top, paddingBottom: insets.bottom }}>`
- App.tsx:1375 `</SafeAreaView>` → `</View>`
- App.tsx:16 — remove `SafeAreaView,` from the `react-native` import list (this Modal is its
  ONLY usage in App.tsx; verified by grep).

iOS-neutrality: on iOS, core SafeAreaView was applying exactly `insets.top` / `insets.bottom`
padding — the replacement applies the same numbers from the same source, so iOS layout is
unchanged (portrait app; left/right insets are 0 in portrait, and the old SafeAreaView's
landscape handling is not exercised). On Android it goes from 0 → real status-bar inset, which
is the fix. Alternative considered and rejected: importing `SafeAreaView` from
react-native-safe-area-context (drop-in, but context-SafeAreaView inside RN `Modal` has known
version quirks; the insets-padding pattern is already device-proven in this exact app).

---

## 0.2 — Confirm Trip Start double header (DIAGNOSIS ONLY)

### Render tree around the header
`dfo-trip` is NOT a navigator screen and NOT a modal — there is no react-navigation anywhere
in these views. It is a plain conditional branch rendered BELOW the always-visible app header:

```
App()  (App.tsx)
├── <View style={[styles.header, { paddingTop: insets.top + 10 }]}>   ← App.tsx:534
│     persistent app header — #1E3A8A, boat name / Capt. / nav icons / DFO ELOG pill
│     (consumes the top inset itself; S95 pattern, GlobalStyles.ts:15–20)
└── <View style={styles.mainContentContainer}>                        ← App.tsx:606
    └── KeyboardAvoidingView
        └── view === 'dfo-trip' → <TripStartConfirmScreen …>          ← App.tsx:654–661
            └── <SafeAreaView style={styles.container}>               ← TripStartConfirmScreen.tsx:67
                │   container: { flex:1, backgroundColor:'#F8FAFC',
                │     paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }  ← :135
                ├── <View style={styles.header}>  ← :69 — the screen's OWN header,
                │     backgroundColor '#1E3A8A' (:138), back chevron + title + subtitle
                ├── <ScrollView> cards …
                └── footer buttons + Edit-Profile Modal
```

### Source of the duplicate — verdict
Checked and eliminated: **no nested navigator** (none exists), **no modal-plus-screen header**
(dfo-trip is inline; the only Modal inside is the Edit-Profile one, closed by default). The
source is the third candidate, an **inset double-application**, plus a color coincidence:

1. TripStartConfirmScreen was written as if it owns the window top (standalone-screen pattern:
   `SafeAreaView` + `paddingTop: StatusBar.currentHeight` on Android), but it renders BELOW
   the persistent app header, which already consumes `insets.top` (App.tsx:534). On Android
   that adds a spurious status-bar-height band of light `#F8FAFC` between the two bars.
2. The screen's own header is the SAME `#1E3A8A` blue as the app header. Dark-blue app header
   → light gap band → second dark-blue header = reads as a doubled/duplicated header.

Sibling comparison confirming the differentiator: DfoLogsListScreen also renders its own
header below the app header (every DFO view does, by design) but has NO
`StatusBar.currentHeight` padding (its container is just `flex:1` + background,
DfoLogsListScreen.tsx:787–790) and its header is white — hence no double-header complaint
there. The Android-only gap band is what makes dfo-trip look broken.

### iOS reproducibility: **NO (expected)**
The stray padding is the `Platform.OS === 'android'` branch (iOS gets 0), and core RN
SafeAreaView applies no inset to a view that sits below the unsafe area — so on iOS the two
blue bars sit flush and read as one tall header. Android-only artifact; again edge-to-edge +
standalone-screen inset pattern, not Fabric.

### Proposed fix (Phase 2; NOT APPLIED — per instructions)
Remove the Android inset padding from the container style
(TripStartConfirmScreen.tsx:135): delete the line
`paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,`.
Follow-on: `Platform` and `StatusBar` imports (:12–13) become unused — remove them from the
import list. iOS-neutrality is by construction: the deleted expression already evaluated to 0
on iOS; the `SafeAreaView` wrapper stays untouched. Android: the gap band disappears and the
screen header sits flush under the app header, matching DfoLogsListScreen/FullDfoForm.

DESIGN FLAG for the gate (not part of the minimal fix): after the gap is removed, dfo-trip
still shows two flush `#1E3A8A` bars (app header + screen header) — same structure as every
other DFO view, but color-identical here. If that still reads as "double header" on the sim
walk, the options are (a) recolor the screen header (e.g. white like DfoLogsListScreen's) or
(b) drop the screen's own header (loses the back chevron + title). Jonny's call at the Phase-2
gate; neither is proposed now.

---

## 0.3 — DFO Documents card gating recon

### The card
App.tsx:1185–1216, inside the `view === 'settings'` branch: a `styles.card` block titled
`t('settings.dfoDocsCard')` with two rows calling `openDfoDoc('providers')` /
`openDfoDoc('dfo234')` (bundled PDFs via expo-asset, offline, S94). **Currently UNCONDITIONAL**
— every signed-in user who opens Settings sees it.

### Every activation state that reaches Settings
`dfoActivated` in App.tsx is `useState<boolean | null>(null)` (:178), re-synced per active uid
(:292–309): signed-out → `false`; signed-in → `null` (undetermined) until this uid's
captain-profile load (after `ensureBareKeyMigration`) resolves → `p.dfoActivated ?? false`.

| State | Who | Card today | Card after Phase-3 gate (`dfoActivated === true`) |
|---|---|---|---|
| `true` | Real DFO user (purchase, restore, or admin DEV-bypass — ALL paths funnel through `profile.dfoActivated=true` via DfoSetupScreen) | shown | shown |
| `false` | Plain free-app user, never activated | shown | hidden — the Rule 2500 case argued below |
| `false` (transient) | Legitimate DFO user on a FRESH device, post-sign-in, cloud restore not yet landed — see flag below | shown | hidden during the window |
| `null` (transient) | Any signed-in user during the per-uid profile load (ms-scale) | shown | hidden momentarily |
| `isAdmin`, `dfoActivated=false` | Admin (role) who hasn't DEV-activated on this device/uid | shown | hidden — dev bypass = flip DEV toggle in DfoSetupScreen, which sets `dfoActivated=true`; so admin regains it in two taps |

Note `isAdmin` (App.tsx:229) is a Firestore-profile role and is INDEPENDENT of
`dfoActivated`; the DEV bypass is not a separate render path — it just writes the same flag.

### Rule 2500 reasoning (on record for qualification)
Rule 2500 requires instructions accessible offline in-app FOR DFO USERS — a user with
dfoActivated=false has no DFO obligations, so hiding the card from them does not violate
Rule 2500.

Supporting consistency point: the DFO ELOG pill itself (App.tsx:588–591) routes a
`dfoActivated=false` user to the paywall/setup screen, not to any DFO function — the app
already treats such a user as having no DFO surface. Gating the docs card on the same flag
makes the Settings card consistent with the app's own definition of "DFO user."

### Flagged state — legitimate DFO user seeing Settings with dfoActivated=false
One real window exists: **fresh device / reinstall, signed in, before cloud restore lands.**
The Phase-1b effect (:292–309) awaits the bare-key migration but NOT `restoreAllStores`
(:248–269, separate best-effort effect); if the restore completes after the profile read,
`dfoActivated` stays `false` until an app restart (or re-activation via setup). During that
window a genuine DFO user would not see the card. Mitigations: (a) the same window already
hides their entire DFO area (pill → setup), so the card is not uniquely lost; (b) it
self-heals on restart; (c) the user can also reach the same instructions via DFO setup →
activation. Judgment: acceptable — but on record here. The transient `null` (undetermined)
state is ms-scale and not meaningful.

HIDE decision: **SAFE to proceed** per the reasoning above. Recommended gate expression for
Phase 3: wrap the card in `{dfoActivated === true && ( … )}` — hides on `false` AND on the
transient `null`, touches no write path, no routing.

---

## 0.4 — Proofreader tally (read-only; the tables are the authority)

Counted every data row in the PROOFREADER REVIEW tables of both docs (markdown headers and
separator lines excluded; neither doc edited).

**docs/GATE_S97_FRENCH.md** — two review sections:
- "18 authored/edited FR strings": 3 tables × 6 rows = **18 rows = 18 strings** ✓ matches its claim.
- "17 new FR strings (Phase 2b)": 11 rows — but the 6-row dialogs table explicitly covers BOTH
  `form222.*` AND `form233.*` (12 keys), + 4 portSelector + 1 privacy gate = **11 rows = 17 strings** ✓.
- S97 subtotal: **29 physical rows representing 35 strings** (claim 35 ✓).

**docs/GATE_S98_FRENCH_FIX.md** — four review sections (claims 26 / 19 / 8 / 25):
- login: **26 rows = 26 strings** ✓. Daily Log home: **19 rows = 19 strings** ✓. History card:
  **8 rows = 8 strings** ✓.
- Chip maps: **17 rows = 25 strings** — the wind table's first row bundles 9 compass points
  ("N / NNE / NE / ENE / E / ESE / SE / SSE / S — identical to code", tagged trivial) into one
  row; 7 more wind rows + 9 condition rows.
- S98 subtotal: **70 physical rows representing 78 strings** (claim ~78 ✓ — exactly 78).

**TRUE TOTAL: 113 strings (in 99 physical table rows).** The running "~113" claim is EXACTLY
right — no drift. Two bundling conventions account for the rows-vs-strings gap of 14
(9-in-1 wind row = +8; dialogs 12-keys-in-6-rows = +6). Caveat for the reviewer handoff: 9 of
the 113 are FR-identical-to-EN wind codes flagged "trivial" in the S98 doc, so the reviewer's
real workload is 104 non-trivial strings.

---

## PHASE 0 GATE — STOPPED. Awaiting explicit "go" (and which phase) from Jonny.

Premise check per item: 0.1 premise CONFIRMED (Android-only, fix identified). 0.2 premise
CONFIRMED with nuance (the literal duplicate is the Android gap band + color-identical
headers; the two-headers-by-design structure is app-wide and untouched by the minimal fix —
design flag recorded above). 0.3 premise CONFIRMED (card is unconditional today; HIDE ruled
safe). 0.4 premise CONFIRMED (~113 → exactly 113).

Phases 1–3 diffs, tsc (33-error baseline / zero new), jest (19 suites / 68 tests), and the
commit blocks will be appended to this doc as each phase is approved. No git run by Claude;
no DFO POST ever.

---

## PHASE 1 — PDF-viewer Close inset fix ✅ applied (awaiting Jonny's sim walk)

Exactly the 0.1 proposal, one file (App.tsx), three hunks:

```diff
@@ -13,7 +13,6 @@ import {
   ScrollView,
   Switch,
   ActivityIndicator,
-  SafeAreaView,
   StatusBar,
   Platform,
   KeyboardAvoidingView,
@@ -1355,7 +1354,9 @@
         animationType="slide"
         onRequestClose={() => setDocViewerVisible(false)}
       >
-        <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
+        {/* S99: insets-driven padding (S95 pattern) — core RN SafeAreaView is iOS-only, so the
+            Close button sat under the Android status bar with edge-to-edge enabled */}
+        <View style={{ flex: 1, backgroundColor: '#0F172A', paddingTop: insets.top, paddingBottom: insets.bottom }}>
           <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 10 }}>
             <TouchableOpacity
               onPress={() => setDocViewerVisible(false)}
@@ -1372,7 +1373,7 @@
               onError={(err) => { console.log('[DFO doc viewer] error:', err); }}
             />
           )}
-        </SafeAreaView>
+        </View>
       </Modal>
```

PRINT-BEFORE-EDIT: current lines matched the 0.1 recon verbatim before each hunk.
GATES: tsc `--noEmit` = **33 errors (baseline, zero new)**; jest = **19 suites / 68 tests, all
pass**. `git diff babel.config.js` empty (never touched); zero probe strings in the diff.

SIM WALK (Jonny): Settings → DFO Documents → open either PDF —
- **Pixel 8**: Close button now fully below the status bar; PDF area ends above the gesture bar.
- **iOS sim**: layout unchanged vs 1.8.6 (Close below the notch, exactly as before).

Phase-1 commit block is written at CLOSEOUT (Phase 4), one commit per phase.

**Phase-1 verification (Jonny, on record): verified on Pixel 8; iOS-neutral confirmed.**

---

## PHASE 2 — Confirm Trip Start double-header fix ✅ applied (awaiting Jonny's sim walk)

Exactly the 0.2 proposal, one file (src/screens/TripStartConfirmScreen.tsx), two hunks:

```diff
@@ -9,8 +9,6 @@ import {
   SafeAreaView,
   Modal,
   ActivityIndicator,
-  Platform,
-  StatusBar,
 } from 'react-native';
@@ -132,7 +130,9 @@ const styles = StyleSheet.create({
   container: {
     flex: 1,
     backgroundColor: '#F8FAFC',
-    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
+    // S99: no window-top inset here — this screen renders BELOW the persistent app header,
+    // which already consumes insets.top (App.tsx). The Android StatusBar.currentHeight
+    // padding drew a spurious gap band between the two headers (the "double header").
   },
```

PRINT-BEFORE-EDIT: line 135 + imports matched the 0.2 recon verbatim (`Platform`/`StatusBar`
had no other usage in the file — grep-verified before removal). The screen's own `SafeAreaView`
wrapper and header are untouched (minimal fix).
GATES: tsc = **33 (baseline, zero new)**; jest = **68/68 pass**; `git diff babel.config.js`
empty; zero probe strings.

SIM WALK (Jonny): DFO ELOG pill → Fill Out New ELOG →
- **Pixel 8**: no light gap band between the app header and the blue "Confirm Trip Start"
  header — bars sit flush, matching the DFO Logs list screen.
- **iOS sim**: unchanged vs 1.8.6 (deleted expression was already 0 on iOS).
- DESIGN FLAG from 0.2 still open: if two flush #1E3A8A bars still read as doubled on the
  Pixel, say so at this gate — recolor/drop options recorded in 0.2; not part of this fix.

---

## PHASE 5 — RECON ONLY: role-gated free DFO activation (no edits made)

**Invariant (carried to Phase 6):** the stored profile shape only gains an optional `role`
VALUE (`'dfo'` as a new allowed string); no existing profile is rewritten; profiles without
the value behave exactly as today.

### 5.1 Profile role schema
Stored in **Firestore `users/{uid}/settings/profile`** as a plain **string field `role`** —
there is NO stored isAdmin boolean anywhere. Read path: useProfile.ts:47 `role: data.role || 'user'`
(onSnapshot at :34–56; also defaulted in initial state :16 and on missing doc :55). Consumers
lowercase-compare the string: App.tsx:222 (`isPro`: `'admin' || 'tester' || subscription==='pro'`)
and App.tsx:229–232 (`isAdmin`: `role === 'admin'`). **No code path writes `role`** — it is
assigned manually in the Firebase console (useProfile's `handleSaveProfile` at :117 rewrites
the whole profile object, but `role` round-trips through state via the `...data` spread, so a
console-set value survives). Therefore adding a `'dfo'` role = set `role: 'dfo'` in the
console; **string-compare in code; migration-free by construction** (absent → `'user'`).

### 5.2 XML Test Harness button
**src/screens/DfoLogsListScreen.tsx:569–578** (entry pill) + **:706–714** (the fullScreen
Modal hosting DfoTestHarnessScreen). Gating: **`{__DEV__ && (…)}` only** — NOT isAdmin, NOT
role. `__DEV__` is compile-time false in a release build, so the button and its subtree
**cannot appear in any release/store build**; it shows for ANY user of a dev build.
**Removal is OPTIONAL** — flag: relevant only if §22 screenshots will be captured on a dev
build, where the pill is visible to whoever holds the phone. Phase 6(c) is Jonny's call on
that basis. (Related, already parked: the Inspect/QR button at :559 is behind `{false &&}` —
never renders anywhere; untouched.)

### 5.3 DEV bypass toggle in DfoSetupScreen
**src/screens/DfoSetupScreen.tsx:43** (`const [devMode, setDevMode] = useState(false)`),
**:156–163** (the DEV pill in the header, rendered only when the `isAdmin` prop is true —
passed from App.tsx:630), **:250/:257** (activate button restyles + relabels to
`setup.previewAs` when devMode), **:262** (Restore button hidden in devMode). What it writes —
the devMode branch of handleActivate (**:62–83**): `saveCaptainProfile({...profile, subformId,
regId, dfoLicenceNo, dfoFin, fishingNumber, licenceHolderFin})` then `onActivated()`.
**FLAG — the devMode branch does NOT write `dfoActivated: true`** (the purchase and restore
branches do, :103/:139). `onActivated()` flips App state for the session, but on a fresh admin
profile the persisted flag stays absent → **the DEV bypass does not survive an app restart**
(unless a previous activation left `dfoActivated:true` to ride the `...profile` spread). The
CLAUDE.md line "admin DEV toggle sets dfoActivated true (writes profile)" is inaccurate on the
persistence half. This is exactly what Phase 6(b)'s read-storage-after-restart gate will catch.

### 5.4 handleActivate + handleRestore (printed in full — DfoSetupScreen.tsx:48–150)
```tsx
  const handleActivate = async () => {
    if (!licenceNo.trim()) {
      Alert.alert('Missing', 'Please enter your Licence Number.');
      return;
    }
    if (!fin.trim()) {
      Alert.alert('Missing', 'Please enter your FIN (Fisher ID Number).');
      return;
    }
    if (!isValidFin(fin.trim())) {
      setFinError('Invalid FIN — must be 9 digits, 5–6 digits, C/D + 7 digits, or DFOCC + 9 digits.');
      return;
    }

    if (devMode) {
      setLoading(true);
      try {
        const regId = DFO_SUBFORM_REGISTRY[selectedSubformId]?.regId ?? 1004;
        const profile = await loadCaptainProfile();
        await saveCaptainProfile({
          ...profile,
          subformId: selectedSubformId,
          regId,
          dfoLicenceNo: licenceNo.trim(),
          dfoFin: fin.trim(),
          fishingNumber: licenceNo.trim(),
          licenceHolderFin: fin.trim(),
        });
        onActivated();
      } catch (e: any) {
        Alert.alert('Dev Error', e.message ?? 'Something went wrong.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const products = await Purchases.getProducts(['dfo_elog_seasonal']);
      if (!products || products.length === 0) {
        Alert.alert('Unavailable', 'The DFO ELOG purchase is not available right now. Please try again later.');
        return;
      }
      await Purchases.purchaseStoreProduct(products[0]);
      const regId = DFO_SUBFORM_REGISTRY[selectedSubformId]?.regId ?? 1004;
      const profile = await loadCaptainProfile();
      await saveCaptainProfile({
        ...profile,
        subformId: selectedSubformId,
        regId,
        dfoLicenceNo: licenceNo.trim(),
        dfoFin: fin.trim(),
        fishingNumber: licenceNo.trim(),
        licenceHolderFin: fin.trim(),
        dfoActivated: true,
      });
      onActivated();
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase Error', e.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!fin.trim()) {
      Alert.alert('Missing', 'Please enter your FIN (Fisher ID Number).');
      return;
    }
    if (!isValidFin(fin.trim())) {
      setFinError('Invalid FIN — must be 9 digits, 5–6 digits, C/D + 7 digits, or DFOCC + 9 digits.');
      return;
    }
    setLoading(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      const hasPurchase = customerInfo.allPurchasedProductIdentifiers?.includes('dfo_elog_seasonal');
      if (hasPurchase) {
        const regId = DFO_SUBFORM_REGISTRY[selectedSubformId]?.regId ?? 1004;
        const profile = await loadCaptainProfile();
        await saveCaptainProfile({
          ...profile,
          subformId: selectedSubformId,
          regId,
          dfoLicenceNo: licenceNo.trim(),
          dfoFin: fin.trim(),
          fishingNumber: licenceNo.trim(),
          licenceHolderFin: fin.trim(),
          dfoActivated: true,
        });
        onActivated();
      } else {
        Alert.alert('Not Found', 'No previous DFO ELOG purchase was found for this account.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not restore purchases.');
    } finally {
      setLoading(false);
    }
  };
```
**Persistence path for `dfoActivated: true`:** `saveCaptainProfile(...)` (captainStorage) →
the per-uid AsyncStorage captain-profile store (`@lobsterlog:captain_profile::<uid>`, S88
namespacing) — NOT Firestore. App.tsx re-reads it per uid at :292–309 into the `dfoActivated`
routing state. This is the SAME path Phase 6(b) must use, including the `dfoActivated: true`
key the devMode branch omits.

### 5.5 Everything gated on admin (complete inventory) — and the 'dfo' role
Repo-wide, the ONLY role string-compares are App.tsx:222 (isPro) and :229 (isAdmin). Every
site downstream of them:
1. **App.tsx:229–232** — `isAdmin` memo (`role === 'admin'`).
2. **App.tsx:630** — `isAdmin` prop into DfoSetupScreen → **DEV pill** (:156–163) → devMode
   branch of handleActivate (5.3/5.4).
3. **App.tsx:1274–1287** — floating **"⚙ DEV: Back to Setup"** button (isAdmin AND already
   inside a dfo view; navigates to dfo-setup).
4. **App.tsx:222–227** — `isPro`: role `'admin'` or `'tester'` (or subscription `'pro'` /
   RevenueCat entitlement) unlocks Pro charts/weather.
No other file consumes a role (grep-verified; DfoTestHarnessScreen is reached only via the
__DEV__ pill; firestore.rules gate by uid, not role). A hypothetical **`role: 'dfo'` matches
NONE of these comparisons** — it gets no DEV pill, no Back-to-Setup, no Pro, no harness.
Confirmed clean.

### 5.6 Every entry point to the DFO surface (side-door sweep)
All `dfo-*` views are plain state-machine branches (no react-navigation, no routes). Entry
points that can SET a dfo view:
1. **The DFO ELOG header pill** — App.tsx:585–600. The ONLY non-admin door.
2. **"⚙ DEV: Back to Setup"** — App.tsx:1280 `setView('dfo-setup')`; isAdmin-gated AND only
   rendered when already inside the DFO area. Not a side door for normal users.
3. **Internal DFO navigation** (App.tsx:626–667: list↔trip↔form↔history↔setup-on-activate) —
   reachable only after entering via 1 or 2.
4. **Deep links: NONE** — no `getInitialURL`/url listener anywhere; `Linking` is used only to
   OPEN external URLs (subscription pages, EULA).
5. **Settings: no DFO navigation** — the DFO Documents card calls `openDfoDoc()` (in-app PDF
   only, no setView); nothing else in Settings touches dfo views. (Phase 3 will gate that card
   on dfoActivated anyway.)
**Conclusion: gating the pill closes the entire non-admin surface** — there is no side door.

### 5.7 What gates the pill post-S91 + proposal
Post-S91 the pill's **render is UNGATED** — every signed-in user sees "DFO ELOG". Only the
TAP is gated (App.tsx:587–592): inside DFO area → exit; `dfoActivated === null` → hold (never
flash setup); `true` → dfo-list; `false` → **dfo-setup (the paywall)**.

**Proposal (Phase 6, minimal, migration-free):**
- **App.tsx** — one new memo beside isAdmin:
  `const canActivateDfoFree = useMemo(() => { const r = typeof profile?.role === 'string' ? profile.role.toLowerCase() : ''; return r === 'admin' || r === 'dfo'; }, [profile]);`
  Profiles without `role` resolve `'user'` → false: no existing profile affected.
- **Activation decision point (6b)** — pass `canActivateDfoFree` into DfoSetupScreen; in
  handleActivate, when true: skip `Purchases.getProducts`/`purchaseStoreProduct` and run the
  SAME `saveCaptainProfile({ …, dfoActivated: true })` write the purchase-success branch uses
  (INCLUDING the `dfoActivated: true` the old devMode branch dropped — see 5.3 flag).
  handleRestore and all Pro-tier RevenueCat code untouched.
- **Pill render (6d — HOLD per instructions)** — proposed gate:
  `{(canActivateDfoFree || dfoActivated === true) && ( <pill/> )}`.
  The `dfoActivated === true` disjunct is deliberate: a user who ever legitimately activated
  (e.g. a paid activation, or a role later revoked) must not be stranded with data behind an
  invisible pill. PRODUCT FLAG for the gate: render-gating the pill removes the DFO
  paywall/purchase entry from ALL normal users — correct for an invite-only rollout, but it
  makes `role:'dfo'` (console-assigned) the only way a new user can ever reach dfo-setup.
  Jonny decides at the 6(d) gate.

### Phase-6 commit slicing (as instructed; each own commit, by risk)
(a) delete DEV toggle from DfoSetupScreen → (b) canActivateDfoFree free-activation path
(gate: read-storage-after-restart proves `dfoActivated` persists, tested with a `role:'dfo'`
account — this specifically catches the 5.3 omission) → (c) XML harness removal (OPTIONAL per
5.2 — dev-build-only cosmetic) → (d) pill + side-door gating — **HOLD** pending Jonny's
decision on the 5.7 product flag. (5.6 found no side doors beyond the pill, so (d) is
pill-only.)

## PHASE 5 GATE — STOPPED. Awaiting explicit "go" (and which of 6a–6d) from Jonny.

**Phase-2 verification (Jonny, on record): verified on Pixel 8.** ⚠️ COLOR CALL AMBIGUOUS —
the go message carried both options still bracketed ("reads fine / recolor header white
first"). NOT recolored; the TripStartConfirm header stays #1E3A8A. If "recolor white first"
was the intent, say so — it's a 2-line style change (own commit or fold into a later round).

**Phase-6 decisions (Jonny, on record):** (a) GO. (b) GO — restart gate required. (c) **SKIPPED
— XML Test Harness retained as-is, `__DEV__`-only** (per the 5.2 finding it cannot appear in a
release build; no code change, decision recorded here). (d) GO — pill render gated on role
admin/dfo; implemented per the 5.7 proposal AS WRITTEN, i.e. `(canActivateDfoFree ||
dfoActivated === true)` — the disjunct keeps an already-activated user (paid, or role later
revoked) from being stranded; if you want STRICT role-only, say so at the 6(d) gate.

---

## COMMIT SEQUENCING (path-staging constraint — why the blocks come in rounds)

Four commits touch **App.tsx** (Phase 1, Phase 3, 6b, 6d) and two touch
**DfoSetupScreen.tsx** (6a, 6b). `git add <path>` stages the WHOLE file, so two uncommitted
phases in one file cannot be separated. Rounds (each ends with Jonny committing + "go"):

- **ROUND 1 (this round — edits applied):** Phase 1 (App.tsx) + Phase 2
  (TripStartConfirmScreen.tsx) + 6a (DfoSetupScreen.tsx) — three disjoint files, blocks below.
- **ROUND 2:** Phase 3 edits (App.tsx docs-card gate) applied only after Round 1 lands; block appended then.
- **ROUND 3:** 6b edits (App.tsx memo/prop + DfoSetupScreen free-activation) + restart gate.
- **ROUND 4:** 6d edits (App.tsx pill gate), then Phase 4 closeout (CLAUDE.md + docs commit + push).

This satisfies "Phases 1–3 blocks sequenced before Phase 6's App.tsx edits": 6b/6d App.tsx
edits are not made until Phases 1 and 3 are committed. (6a has no App.tsx edit; its commit
landing between P2 and P3 is history-cosmetic only.)

---

## PHASE 6a — DEV bypass toggle removed from DfoSetupScreen ✅ applied

One file (src/screens/DfoSetupScreen.tsx), five removals — PRINT-BEFORE-EDIT: every hunk's
current lines matched the Phase-5 recon printout verbatim:
- `devMode` state (:43) and `selectedRegionLabel` (:46 — sole consumer was `previewAs`).
- The entire `if (devMode) {…return;}` branch of handleActivate (:62–83) — the purchase branch
  is now the only path (6b adds the role-gated free path NEXT round).
- The header DEV pill ternary (:156–165) → plain `<View style={styles.headerSpacer} />`.
- `devMode && styles.activateButtonDev` + the `previewAs` label ternary; the Restore button's
  `{!devMode && (…)}` wrapper (now unconditional).
- Styles `activateButtonDev` / `devPill` / `devPillActive` / `devPillText`.

Leftovers, deliberate: the `isAdmin` prop is now UNUSED inside the component (still typed +
still passed from App.tsx:630) — 6b will replace it with `canActivateDfoFree`, keeping this
commit single-file. `setup.previewAs` i18n key orphaned EN+FR (left in place — same precedent
as `setup.harnessButton`, orphaned since S54). `REGIONS`, load/saveCaptainProfile,
DFO_SUBFORM_REGISTRY all still consumed by the surviving branches (grep-verified).

GATES: tsc = **33 (baseline, zero new)**; jest = **19 suites / 68 tests pass**;
`git diff babel.config.js` empty; zero probe strings in any diff.

⚠️ Interim behavior note for the gate: between 6a landing and 6b landing, there is NO free
activation path at all (admin included) — don't test activation on a dev build in that window
and conclude it's broken.

---

## ROUND 1 COMMIT BLOCKS (Jonny runs; one commit per phase; NO push yet — push at closeout)

Pre-flight: `git status` should show exactly these modified: `App.tsx`,
`src/screens/TripStartConfirmScreen.tsx`, `src/screens/DfoSetupScreen.tsx`, plus the
pre-existing `docs/CHECKLIST_S97_FR_SWEEP.md` (NOT staged here) and this gate doc + known
untracked files (committed at closeout). No `new file:` lines expected in any Round-1 commit.
Reminders: read the files-changed count against each block (must be **1**); commit subject on
ONE line with its closing quote before Return.

Commit 1 — Phase 1:
```
git add App.tsx
git status
git commit -m "S99 fix DFO doc viewer Close inset on Android (insets padding, S95 pattern)"
```

Commit 2 — Phase 2:
```
git add src/screens/TripStartConfirmScreen.tsx
git status
git commit -m "S99 remove spurious Android status-bar inset on Confirm Trip Start"
```

Commit 3 — Phase 6a:
```
git add src/screens/DfoSetupScreen.tsx
git status
git commit -m "S99 remove DEV bypass toggle from DfoSetupScreen"
```

After the three commits: `git status` should show ONLY `docs/CHECKLIST_S97_FR_SWEEP.md`
modified + this gate doc modified + the known untracked files. Then give the Round-2 "go".

## ROUND 1 GATE — STOPPED. Awaiting your commits + explicit "go" for Round 2 (Phase 3).

**Round 1 landed (Jonny, on record):** `69b1515` (P1) / `9984c96` (P2) / `42e8b07` (6a),
pushed. **Phase-2 color verdict: flush blue bars read fine on device — NO recolor.** The 0.2
design flag is CLOSED. 6(d) confirmed with the proposal-as-written gate
`(canActivateDfoFree || dfoActivated === true)`.

---

## PHASE 3 — DFO Documents card gated on dfoActivated ✅ applied (awaiting 3-role sim walk)

One file (App.tsx), one hunk: the S94 card block (recon §0.3, lines re-verified verbatim
before edit) is wrapped in `{dfoActivated === true && ( … )}` — hides on `false` AND on the
transient `null` (undetermined) state. Body re-indented only; no row, handler, or
`openDfoDoc` change; no dfoActivated write path or routing touched. Diff stat:
`App.tsx | 35 insertions(+), 30 deletions(-)` (the 32-line block re-indented + gate lines +
the Rule-2500 comment pointing at §0.3 of this doc).

GATES: tsc = **33 (baseline, zero new)**; jest = **19 suites / 68 tests pass**;
babel.config.js diff empty; zero probe strings.

SIM WALK (Jonny — Settings in all three roles):
- **admin** (`role:'admin'`, dfoActivated=true on the test device): card SHOWN.
- **dfoActivated user** (plain role, activated): card SHOWN.
- **plain user** (never activated): card HIDDEN; rest of Settings unchanged (Preferences card
  directly followed by Account card).
- Also worth one glance: sign-out state — card hidden (dfoActivated forced false).

## ROUND 2 COMMIT BLOCK (run after the sim walk passes; files-changed count must be 1)

```
git add App.tsx
git status
git commit -m "S99 gate Settings DFO Documents card on dfoActivated (Rule 2500 reasoning in gate doc)"
```

## ROUND 2 GATE — STOPPED. Commit + "go" starts Round 3 (6b: role-gated free activation).

**Round 2 landed (Jonny, on record):** tip `5647ca1`, pushed. Phase-3 hidden-state verified on
device (no docs card on a non-activated account). Admin/dfoActivated-true SHOWN states ride
the Phase-4 verification record. Phase-2 color verdict re-confirmed: no recolor.

---

## PHASE 6b — role-gated free activation (canActivateDfoFree) ✅ applied (awaiting restart gate)

Two files. PRINT-BEFORE-EDIT: all four target sites matched the Phase-5 recon / post-6a state
verbatim.

**App.tsx** — new `canActivateDfoFree` memo beside `isAdmin` (`role === 'admin' || 'dfo'`,
lowercased string compare; absent role → `'user'` → false, so no existing profile is affected
— invariant holds: no profile is rewritten, the shape only gains an optional role VALUE).
DfoSetupScreen call site passes `canActivateDfoFree={canActivateDfoFree}` (replacing the
`isAdmin` prop left unused by 6a).

**DfoSetupScreen.tsx** — Props `isAdmin?` → `canActivateDfoFree?`; in handleActivate the two
RevenueCat calls (`getProducts` + `purchaseStoreProduct`) are wrapped in
`if (!canActivateDfoFree) { … }`, so a privileged activation skips the purchase and **falls
through to the LITERAL SAME statements** the purchase-success handler runs —
`saveCaptainProfile({ …, dfoActivated: true })` + `onActivated()` — no duplicated write block
(the duplication is exactly how the old DEV bypass lost `dfoActivated`). Non-privileged path:
identical statements in identical order. **handleRestore untouched; all Pro-tier RevenueCat
code untouched** (diff shows no hunks there). Known nuance, accepted: a (near-impossible)
save failure on the free path would surface under the shared 'Purchase Error' alert title.

GATES: tsc = **33 (baseline, zero new)**; jest = **68/68**; babel clean; no probes.

### RESTART GATE (required before the Round-3 commit — role:'dfo' account)
1. Firebase console → `users/{uid}/settings/profile` of a PLAIN test account (no admin, never
   activated) → add field `role: "dfo"` (string).
2. On device/sim signed into that account: DFO pill → dfo-setup renders (note: NO DEV pill —
   6a). Enter Licence + valid FIN → Activate → must activate with **NO purchase sheet** and
   land on dfo-list.
3. **Force-quit the app, relaunch** → tap the DFO pill → must route STRAIGHT to dfo-list
   (dfoActivated persisted — this is the check the old DEV bypass failed).
4. Read-storage proof (iOS sim variant, the banked S90 technique):
   `xcrun simctl get_app_container booted com.Nickerson.LobsterLog data` →
   `Library/Application Support/<bundle>/RCTAsyncLocalStorage_V1/` — the
   `@lobsterlog:captain_profile::<uid>` blob must contain `"dfoActivated":true`.
5. Control: a plain no-role account tapping Activate still gets the RevenueCat purchase flow.

## ROUND 3 COMMIT BLOCK (run after the restart gate passes; files-changed count must be 2)

```
git add App.tsx src/screens/DfoSetupScreen.tsx
git status
git commit -m "S99 role-gated free DFO activation via canActivateDfoFree (admin/dfo), persisted dfoActivated"
```

## ROUND 3 GATE — STOPPED. Commit + "go" starts Round 4 (6d pill gate + Phase 4 closeout).

**Round 3 landed (Jonny, on record):** commit `96a5b72`, pushed. **RESTART GATE PASSED IN
FULL (recorded exactly as stated):** no-purchase activation ✓, persists across force-quit
(still activated, no setup screen) ✓, docs card shown on dfo account / absent on user
account ✓, zero dev chrome on dfo account ✓, control account routes to purchase ("purchase
unavailable", did not activate) ✓.

---

## PHASE 6d — DFO ELOG pill render gated ✅ applied (visibility walk PENDING)

One file (App.tsx), 6 insertions, zero deletions: the `styles.dfoPillRow` block (lines
re-verified verbatim before edit) wrapped in
`{(canActivateDfoFree || dfoActivated === true) && ( … )}` — the approved proposal-as-written
gate. Tap-handler logic inside is untouched (the `dfoActivated === null` hold still applies on
tap). Behavior: role admin/dfo OR an already-activated profile sees the pill; everyone else
has NO DFO entry point (§5.6 sweep found no side doors). Note: during the per-uid profile/
flag loads the pill is briefly absent for a legitimate user, appearing when either signal
resolves — same transient class as the Phase-3 card, self-resolving in ms.

GATES: tsc = **33 (baseline, zero new)**; jest = **68/68**; babel.config.js diff empty; zero
probe strings across the full diff (grep-verified).

SIM WALK (PENDING — Jonny): pill SHOWN on the role:'dfo' account and on any activated
account; pill ABSENT on a plain never-activated account (header right stack collapses
cleanly); admin account SHOWN.

---

## PHASE 4 — CLOSEOUT (CLAUDE.md updated; verification record)

CLAUDE.md updated: S99 session-log row; header "Last updated" line; Pending/waiting-on
(S98 chip gate + FR email + non-French fix-list marked RESOLVED with the exact results;
S99 pendings + submission-package TO DO added); Key-files DfoSetupScreen row; What's-built
S99 entry + DEV-toggle corrective notes; Current goals → "SESSION 100 — TBD".

**Part-1 French verification results (Jonny, device/console-confirmed July 15 — recorded
EXACTLY as stated):**
- (1a) FR save stored windDir "E", weather ["Cloudy","Sunny"] — EN codes in Firestore,
  invariant held.
- (1b) legacy 16-point renders NNO, no key paths.
- (1c) Pas de pêche exclusivity fires, sentinel round-trips.
- (1d) verification email arrived in FRENCH — customized template honored languageCode,
  correcting the S98 caution line; hosted landing page remains English despite &lang=fr —
  ACCEPTED as Firebase-side limitation, screenshot on file.
- **French: DONE.**

**Also on record:** dfoelog@lobsterlog.com signup + role + demo vessel profile still TO DO
before the submission package; XML harness retained (DEV-only); landing-page EN accepted.

**Still PENDING VERIFICATION (not marked done):** 6(d) pill visibility walk; Phase-3
admin-role shown state; iOS sweep of P2/P3/6a/6b/6d.

---

## ROUND 4 COMMIT BLOCKS (Jonny runs — the final two commits + push)

Pre-flight `git status` should show modified: `App.tsx`, `CLAUDE.md`,
`docs/CHECKLIST_S97_FR_SWEEP.md` (yours — NOT staged below, decide separately); untracked:
`docs/GATE_S99_REMAINDER.md` (staged in commit 6 — **will show as `new file:`**),
`docs/DIAG_S95_ITEM2.md` + the two `assets/docs/` PDFs (NOT staged — the EN one has a typo'd
filename "Presrsquisites", fix before ever committing/wiring it).

Commit 5 — Phase 6d (files-changed count must be **1**):
```
git add App.tsx
git status
git commit -m "S99 gate DFO ELOG pill render on role (canActivateDfoFree) or prior activation"
```

Commit 6 — closeout (files-changed count must be **2**; GATE doc appears as `new file:`):
```
git add CLAUDE.md docs/GATE_S99_REMAINDER.md
git status
git commit -m "S99 closeout: CLAUDE.md session log + gate doc"
```

Push (read the range `old..new` in the output — it should span exactly your unpushed
commits; commit subjects each on ONE line with the closing quote before Return):
```
git push
```

## SESSION 99 END — STOPPED. Remaining: 6(d) pill walk, P3 admin shown-state, iOS sweep
(report results next session; anything unconfirmed stays PENDING VERIFICATION).
