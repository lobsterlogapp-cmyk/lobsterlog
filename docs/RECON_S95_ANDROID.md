# RECON — Android stabilization (Session 95)

**Scope:** RECON ONLY. No source file changed. Line numbers verified on disk 2026-07-06.
Files traced: `src/components/FullDfoForm.tsx`, `src/screens/Form222Screen.tsx`,
`src/screens/Form233Screen.tsx`, `src/components/LobsterLogProposalForm.tsx`,
`src/utils/dfoXmlGenerator.ts`, `src/utils/dfoLogStorage.ts`, `src/utils/dfoStorageKeys.ts`,
`App.tsx`, `src/styles/GlobalStyles.ts`, `android/app/src/main/AndroidManifest.xml`,
`android/gradle.properties`, `app.config.js`, and the installed
`node_modules/@react-native-community/datetimepicker@8.4.4`.

Four confirmed Pixel-8 (physical, release build) symptoms are traced below:
(1) datetime-picker crash on OK, (2) in-progress log lost on crash, (3) headers under the
status bar, (4) keyboard covers focused inputs. **(3) and (4) share ONE root cause — see §5.**

---

## ITEM 1 — Datetime picker crash (root cause PROVEN at the library level)

### The crash, end to end
Reported stack: `TypeError: Cannot read property 'dismiss' of undefined at
RNDateTimePickerAndroid`, from a hook-effect unmount cleanup, on tapping OK on the start-sail-time
picker of a new Form 234 log. Traced to the installed package:

1. **`mode="datetime"` is not a valid Android mode.** `constants.js:36` `ANDROID_MODE = { date,
   time }`; `datetime` exists ONLY in `IOS_MODE` (`constants.js:40-44`).
2. **On open it silently degrades to date-only.** `getOpenPicker(mode)` sends `datetime` through the
   `default:` branch (`androidUtils.js:77`) which opens `pickers[ANDROID_MODE.date]`
   (`androidUtils.js:93`) — the DATE picker. `validateAndroidProps` (`androidUtils.js:110-131`) does
   NOT reject `datetime`, so there is no warning. → This is exactly the "renders date-only on
   Android" behaviour flagged in S81 (`docs/RECON_form_pickers_S81.md` §A(4)).
3. **On OK / unmount it crashes.** Tapping OK fires `onChange` → the app sets `pickerVisible=false`
   → the inline `<DateTimePicker>` unmounts → its cleanup effect runs:
   `datetimepicker.android.js:46` `return () => DateTimePickerAndroid.dismiss(mode, design);` →
   `DateTimePickerAndroid.android.js:136` `return pickers[mode].dismiss();`. With `mode='datetime'`,
   `pickers` is `{ date, time }` (`picker.android.js:9-12`), so `pickers['datetime']` is `undefined`
   → `undefined.dismiss()` → **the exact reported TypeError**.

**Confirmed root cause:** the Android inline mount passes `mode="datetime"` for every time-bearing
field. This is a hard, deterministic crash on OK — not intermittent. The date-only path
(`mode="date"`) is safe on Android; only the time-bearing (`datetime`) path crashes.

### Every DateTimePicker usage (whole tree)
| File | mount | mode expression | crashes on Android? |
|---|---|---|---|
| `src/components/FullDfoForm.tsx` | iOS Modal `:1858` / **Android inline `:1870`** | `pickerField === null ? 'date' : 'datetime'` (`:1860`/**`:1872`**) | **YES** — all 6 time-bearing fields |
| `src/screens/Form222Screen.tsx` | iOS Modal `:698` / **Android inline `:710`** | `pickerField === 'interaction' ? 'datetime' : 'date'` (`:700`/**`:712`**) | **YES** — the `interaction` field |
| `src/components/LobsterLogProposalForm.tsx` | iOS Modal `:858` / **Android inline `:870`** | `pickerField === null ? 'date' : 'datetime'` (`:860`/**`:872`**) | **YES** — but legacy free-app (see below) |
| `src/screens/Form233Screen.tsx` | iOS Modal `:339` / Android inline `:351` | `"date"` (hardcoded, `:341`/`:353`) | No (date-only) |
| `App.tsx` | inline `:725` | `"date"` (hardcoded) | No (free-app history nav) |
| `src/components/TrawlHistoryModal.tsx` | inline `:163` | `"date"` (hardcoded) | No (free-app date nav) |

**FullDfoForm current line numbers** (S81's numbers have shifted; these are today's):
- import `:16`; `PickerField` union `:153` = `'sailed'|'startHaul'|'stopHaul'|'landing'|'mmTime'|'sarTime'`
  (`lostGearTime` removed in S93).
- state: `pickerVisible :341`, `pickerField :342`, `pickerDate :343`, `tempDate :344`.
- `openPicker(field) :746-760`; `handlePickerChange :762-771` (Android applies immediately, dismiss-aware,
  `:764-767`; iOS stages `tempDate`, `:768-770`); `applyPickerValue(d) :773-794`.
- iOS Modal block `:1846-1868` (Done → `applyPickerValue(tempDate)`); Android inline block `:1869-1875`.
- Time-bearing fields (→ `datetime`): `sailed`,`startHaul`,`stopHaul`,`landing`,`mmTime`,`sarTime`.
  Date-only (→ `date`, safe): `pickerField === null` (Date Fished).

**S81 pattern (the shape to fix):** `docs/RECON_form_pickers_S81.md` §A documents the declarative
iOS-Modal / Android-inline split with `mode={pickerField === null ? 'date' : 'datetime'}` — the
exact construct that crashes. That doc's "compatibility note" (formatDate→`YYYY-MM-DD`,
formatTime→`HH:MM`) is the format contract the fix must preserve.

### Proposed fix — platform-split, Android two-step date→time (RECOMMENDED: imperative API)
Keep iOS exactly as-is (Modal + spinner + `mode="datetime"` + Done→`applyPickerValue(tempDate)`).
Replace the Android **datetime** path with the package's imperative `DateTimePickerAndroid.open()`
API, run as two sequential valid-mode dialogs:

1. `DateTimePickerAndroid.open({ value: current, mode: 'date', is24Hour: true, onChange })`
2. in that onChange, on `event.type === 'set'`, chain
   `DateTimePickerAndroid.open({ value: pickedDate, mode: 'time', is24Hour: true, onChange })`
3. on the time `set`, combine into ONE `Date`
   (`new Date(y, mo, d, h, mi)`) and call the **same** `applyPickerValue(combined)`.

**Why imperative, not sequential declarative pickers:** the imperative API does NOT mount the
`RNDateTimePickerAndroid` component, so the crashing unmount-cleanup effect
(`datetimepicker.android.js:46`) never runs at all. It is the package-documented Android
alternative. (Option B — render `mode='date'` then `mode='time'` inline via a two-stage state — also
avoids the crash since both are valid Android modes, but re-enters the declarative lifecycle and
needs more state. Not recommended.)

**Identical output format on BOTH platforms — guaranteed.** Every path ends at
`applyPickerValue(d: Date)` (`:773`), which writes `formatDate(d)` → `YYYY-MM-DD` (`:129-134`) and
`formatTime(d)` → `HH:MM` (`:123-127`) into the same companion-date + time strings. So the stored
strings are byte-identical across iOS/Android and unchanged vs today. No generator change.

The **date-only** Android path (`pickerField === null`, `mode='date'`) is already crash-safe; it can
be left inline as-is (minimal diff) or routed through `DateTimePickerAndroid.open({mode:'date'})` for
uniformity. Minimal change = reroute only the datetime path.

### Which tests cover the value this feeds (and the gap)
The picker output flows into `localToUtcIso(dateStr, timeStr)` — **`dfoXmlGenerator.ts:35-44`**
(module-private; returns `''` on blank date/time [the S76 blank-time gate], else local→UTC ISO).
Call sites (all in `dfoXmlGenerator.ts`): `:90` sail, `:91` haulStart, `:92` haulEnd, `:93` landing,
`:333` `SAR_DT`, `:390` `TRNSF_DT`, `:999`/`:1000` effort-overlap.

- `src/utils/__tests__/blankTimestampGate.oneoff.test.ts` — data-layer (`getRequiredFields`); asserts
  the four time keys are required per subform and blank→flagged / filled→clear. Feeds literal
  `HH:MM`. **Does NOT assert the string FORMAT** → would not catch a picker format regression.
- `src/utils/__tests__/launderSweep.oneoff.test.ts` — drives the real generator; sole hard assert is
  `xml` contains `<GENERAL_INFO>`; feeds literal `HH:MM`/`YYYY-MM-DD`. **Would not auto-catch** a
  picker format change (surfaces only as console output / manual `.xml` inspection).
- Other generator fixtures (`genSampleAllSubforms`, `genSampleRemT1`, `genSampleSarS66b`,
  `deEmitLostGear`, the validate* guards) feed pre-formatted literals; none renders the picker.

**Coverage verdict:** no jest test renders the picker or asserts its `HH:MM`/`YYYY-MM-DD` output, and
jest cannot exercise the native dialog. **The crash fix AND format-invariance are DEVICE-verified**,
backed by the timestamp regression suite staying green (it protects the downstream localToUtcIso
path, not the picker). Optional hardening: extract the "combine date+time → Date" logic into a pure
helper and unit-test it; low value vs the device check.

### Scope decision for Item 1
- **FullDfoForm.tsx** — the confirmed repro; MUST fix.
- **Form222Screen.tsx** (`interaction`, `:712`) — the identical latent crash on Android; a harvester
  who logs a marine-mammal interaction date+time hits the same TypeError. A shared Android
  helper fixes both. **Recommend including Form 222 in Item 1.**
- **LobsterLogProposalForm.tsx** (`:872`) — same bug, but this is the **legacy free-app advocacy
  form** already flagged for archival (CLAUDE.md "Not yet built"). Out of the DFO stabilization
  scope. **Flagged, not fixed** — decide separately.

---

## ITEM 2 — Draft persistence (in-progress log lost on crash)

### How a Form 234 draft is held today
- **No single `data` map in state.** In-progress state lives across ~80 individual `useState` hooks
  (`FullDfoForm.tsx:161-360`). The `data: Record<string,string>` that gets persisted is BUILT ON
  DEMAND at save time by `buildLogData()` (`:565-600`); notes by `buildRemarks()` (`:603-610`).
- Guards: `isLoaded` (`:234`, set true at `:519`), `editingCompleted` (`:233`). Load/seed effect
  `:362-523`.
- **Save paths — all write the whole logs array via `saveLog`:**
  - `handleSave()` (complete) `:1026-1160` → `status:'complete'` (`:1144`), `saveLog` (`:1154`).
  - `handleBack()` (S43 draft-on-Back) `:646-665` → `status:'draft'` (`:653`), `saveLog` (`:662`),
    guarded `!readOnly && isLoaded && !editingCompleted && hasMeaningfulData()` (`:647`).
  - imperative `saveDraft` (`useImperativeHandle`) `:622-644` → `status:'draft'`, `saveLog` (`:642`).
- **There is NO per-section save and NO autosave-on-change.** Editing a section (or a note, via
  `setNote :278-279`) mutates only local `useState` — nothing is persisted until Back / Save. So a
  crash between the last Back/Save and the crash point destroys everything typed since. This is the
  confirmed data-loss symptom.
- Storage: `saveLog(log) dfoLogStorage.ts:75-86` read-modify-writes the whole array to
  `dfoKey(DFO_STORE_BASES.dfo_logs)` → `@lobsterlog:dfo_logs::<uid>`. `DfoLog` `:33-47`
  (`status? :38`, `data :42`, `remarks? :46`). Drafts vs complete = the `status` field only; both
  share one array under one key. **No AsyncStorage import in FullDfoForm** — all persistence goes
  through `dfoLogStorage` helpers + `triggerBackup` (`:47`).
- uid namespacing: `dfoStorageKeys.ts` — `dfoKey(base, uid?) :59-63` (`${base}::${effective}`,
  fail-closed `::__anon__` when signed out), `DFO_STORE_BASES :39-47`, ambient
  `activeDfoUid`/`setActiveDfoUid :25-33`. **Any new draft key MUST derive through `dfoKey()`** to
  stay account-isolated.

### Proposed scope — MINIMAL crash-safety slice (recommended), full restore is bigger
`buildLogData()` + `buildRemarks()` already collapse the entire form into a serializable snapshot —
exactly what a crash-safe scratch write needs, with zero refactor of the ~80-field state model.

**Minimal slice (recommended for this session):**
1. Add a new base to `DFO_STORE_BASES` (e.g. `active_draft: '@lobsterlog:dfo_active_draft'`) and a
   small `saveActiveDraft/loadActiveDraft/clearActiveDraft` helper in `dfoLogStorage.ts` (keyed via
   `dfoKey()`), holding ONE in-progress snapshot: `{ id: tripId, ...buildLogData(), remarks: buildRemarks() }`.
2. One debounced `useEffect` in FullDfoForm, inserted AFTER `buildRemarks` is defined (after `:610`),
   gated by the existing draft guard (`isLoaded && !readOnly && !editingCompleted`), that writes the
   snapshot on change. (No debounce/throttle exists today; `buildLogData` is pure + cheap.)
   **Must NOT touch the TimerContext sync effects at `:541-563`** (out of bounds this session).
3. Clear the scratch key on a successful `handleSave`/`handleBack` (the real record then owns it).
4. On mount, if a scratch draft exists for a fresh new-log entry, offer restore (or auto-seed).

**Full draft-restore (bigger — flag, defer if time-boxed):** wiring the scratch snapshot into the
draft-card list, migration, and cross-session restore UX is a larger surface. If we must stay small,
ship the crash-safety WRITE + on-mount restore-prompt only, and defer list integration.

---

## ITEM 3 — Safe-area (headers under the Android status bar)

### What handles insets today
- **No `SafeAreaProvider`, no `useSafeAreaInsets`, no `edges=` anywhere.** `react-native-safe-area-context`
  is installed (5.6.2, `package.json:48`) but its only consumer is the **parked** `InspectionModeScreen`
  (behind `{false && …}` at `DfoLogsListScreen.tsx:559`). All real inset handling is manual, via
  `StatusBar.currentHeight`.
- One persistent app header for the whole authenticated app: `App.tsx:530`, style
  `GlobalStyles.ts:10-15`, `paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 60`.
  Inline DFO views (`dfo-list`/`dfo-history`/`dfo-demo`=FullDfoForm/`dfo-trip`/`dfo-setup`) render
  BELOW it; the modal screens (Form 222/233, Captain Profile) cover it and each add their own
  `paddingTop: android ? (currentHeight ?? 24) + 14 : 14`.
- One `<StatusBar>` (`App.tsx:529`): `barStyle="light-content"` `backgroundColor="#1E3A8A"`,
  `translucent` NOT set. `expo-status-bar` is not used.

### Why it clips anyway — EDGE-TO-EDGE (see §5)
Statically the app header "should" absorb the status bar via `StatusBar.currentHeight`. It clips on
the Pixel 8 because **edge-to-edge is enabled** (`android/gradle.properties:47,65`), under which
`StatusBar.currentHeight` and opaque `backgroundColor` are unreliable/ignored on Android 15 (§5).

### Proposed fix — smallest consistent, edge-to-edge-correct
Adopt the already-installed safe-area-context (the Expo-recommended edge-to-edge inset source):
1. Wrap the root in `<SafeAreaProvider>` (`App.tsx` around `:502-504`; or in `index.js`).
2. Drive the app header's top padding from `useSafeAreaInsets().top` instead of
   `StatusBar.currentHeight` (`GlobalStyles.ts:14` becomes inline/insets-driven — one header, one fix
   point, since every inline view sits under it).
3. Repoint the modal-screen header paddings (Form 222 `:734`, Form 233 `:375`, Captain Profile `:381`,
   plus the double-gap offenders `DfoSetupScreen.tsx:281` and `TripStartConfirmScreen.tsx:135`) to the
   same insets — removing the current Android **double gap** as a bonus.

**Alternative (fast rollback):** set `edgeToEdgeEnabled=false` to restore the pre-SDK-54 opaque-bar +
`currentHeight` behaviour. Faster and lower-risk for this release, BUT Expo SDK 55 removes the opt-out
— so the insets adoption is the durable path. **Decision for the go.**

---

## ITEM 4 — Keyboard (soft keyboard covers focused inputs)

### Current situation
- `AndroidManifest.xml:22` (`.MainActivity`) has `android:windowSoftInputMode="adjustResize"` — which
  historically fixes exactly this.
- Only 4 `KeyboardAvoidingView` (KAV) instances exist: `App.tsx:603-606`
  (`behavior={ios ? 'padding' : undefined}` → **Android = no avoidance**), `LoginScreen.tsx:74-77`,
  `FishingMap.tsx:446`, `Garminmapbox.tsx:396`.
- **DFO data-entry screens have NO KAV of their own:** FullDfoForm, Form222, Form233, CaptainProfile,
  DfoSetup — each is a plain `ScrollView` relying on Android `adjustResize` (and on iOS, the modal
  forms have no avoidance path at all).

### Why adjustResize no longer works — EDGE-TO-EDGE (see §5)
Under edge-to-edge the window is drawn behind the system bars and the OS no longer resizes it for the
IME, so `android:windowSoftInputMode="adjustResize"` is effectively neutered — the manifest still says
`adjustResize` but the keyboard now overlaps content. This is the confirmed Pixel-8 symptom.

### Proposed fix — smallest consistent
Add real IME handling that does not depend on `adjustResize`:
- Wrap the DFO form `ScrollView`s (FullDfoForm, Form222, Form233, CaptainProfile, DfoSetup) in a
  `KeyboardAvoidingView` with a working Android behavior (`behavior={Platform.OS === 'ios' ? 'padding'
  : 'height'}`), plus `keyboardShouldPersistTaps="handled"` on the ScrollViews. Fix `App.tsx:603-606`
  so Android is no longer `undefined`.
- Note the RN `KeyboardAvoidingView` reads keyboard height from the JS `Keyboard` events (which DO
  fire under edge-to-edge), so it works without adjustResize — verify on device.
- Heavier/durable option (new dependency, likely OUT of scope for a stabilization pass):
  `react-native-keyboard-controller` for robust edge-to-edge IME insets. Flag, don't adopt without go.

---

## §5 — CROSS-CUTTING ROOT CAUSE: Android edge-to-edge (Items 3 & 4)

`android/gradle.properties`: **`edgeToEdgeEnabled=true` (line 47)**, `expo.edgeToEdgeEnabled=true`
(line 65), `newArchEnabled=true` (line 38). Expo SDK 54 / RN 0.81 (`package.json` expo ^54.0.31,
react-native 0.81.5) enable Android edge-to-edge **by default**. Consequences that match the two
device symptoms exactly:
- Content is laid out behind the (now transparent) status bar; `StatusBar backgroundColor` is a no-op
  and `StatusBar.currentHeight` is unreliable on Android 15 → **headers clip** (Item 3).
- The window is not resized for the IME → `windowSoftInputMode="adjustResize"` is neutered →
  **keyboard covers inputs** (Item 4).

So Items 3 and 4 are two faces of one migration gap. They can ship as **one "edge-to-edge hardening"
commit** (SafeAreaProvider + insets + KAV) or two. `app.config.js` has NO `androidStatusBar` /
`softwareKeyboardLayoutMode` / safe-area config — edge-to-edge comes solely from `gradle.properties`.

---

## §6 — PROPOSED ORDER OF WORK

1. **Datetime picker crash fix** — Android imperative two-step date→time; iOS unchanged; output
   byte-identical. **Committable alone** (no dependency on the others). Highest severity: it blocks
   creating/entering any new Form 234 log. Scope decision: FullDfoForm (required) ± Form 222
   (recommended, shared helper). *If you say stop after this, it stands alone.*
2. **Draft persistence — crash-safety slice** — debounced scratch write via a new `dfoKey()` base +
   on-mount restore prompt. Independent of 1/3/4; protects trips while the rest lands.
3. **Safe-area insets** (edge-to-edge) — SafeAreaProvider + `useSafeAreaInsets` on the app header +
   modal headers.
4. **Keyboard avoidance** (edge-to-edge) — KAV on the DFO form ScrollViews; fix App.tsx Android KAV.

(3 and 4 share the edge-to-edge root cause and may be combined.)

---

## §7 — DECISIONS FOR THE GO, GATES, OUT-OF-SCOPE

**Decisions needed before PHASE 1:**
- Item 1 scope: FullDfoForm only, or FullDfoForm + Form 222? (LobsterLogProposalForm = legacy, leave.)
- Items 3/4: adopt safe-area-context insets + KAV (durable, edge-to-edge-correct) **vs** disable
  edge-to-edge (`edgeToEdgeEnabled=false`, fast rollback but SDK-55 removes the opt-out)?
- Draft persistence: minimal crash-safety write only, or also wire full draft-restore into the list?

**Gates (per the session brief):** `tsc` (33-error baseline, 0 new) · `jest` all green incl. the
timestamp regression suite (`blankTimestampGate`, `launderSweep`) · then the literal git block written
into the gate doc + STOP (Jonny runs git). Device checklist to be produced: new log → set sail date
AND time → OK → **no crash**, value shows date+time · kill app mid-entry → **draft survives** · headers
**clear of the status bar** · keyboard **does not cover** the focused field.

**Explicitly untouched (per brief):** the DFO transmission path, `TimerContext.tsx`, the S94 docs
card. The draft `useEffect` must not disturb the TimerContext sync effects (`FullDfoForm.tsx:541-563`).

**Reported, not actioned:** `LobsterLogProposalForm.tsx:872` carries the same Android datetime crash.
It is the legacy free-app advocacy form (archival-flagged) — **deferred to the November free-app
relaunch / post-qualification UI overhaul pile** (CLAUDE.md "Not yet built"): fix its picker (or
retire the file) in that free-app session, not in the DFO stabilization pass. The Android **double
top gap** on `DfoSetupScreen.tsx:281` and
`TripStartConfirmScreen.tsx:135` (own inset padding while already under the app header) is cosmetic and
would be cleaned up naturally by the Item 3 insets work.

---

## Report metadata
- Path: `docs/RECON_S95_ANDROID.md`
- No files edited; no code written; no git run.
