# GATE — Session 95, Items 3+4: Android edge-to-edge (safe-area insets + keyboard avoidance)

**Status:** **SESSION 95 WRAPPED.** Safe-area insets + keyboard avoidance (incl. FAIL 2a DfoSetup + FAIL 2b
transmission modal) are device-confirmed and **being committed**. **FAIL 1 (main-form scroll-into-view) is
deferred** — reverted to clean state (4 attempts failed at Fabric boundaries); the aimed hand-off is
`docs/DEFER_S95_KEYBOARD_SCROLL.md`, and the full 4-round diagnosis is preserved below. `[S95KB]` probes +
temp babel change reverted. tsc 33/0-new, jest 19/68. The rounds 1-4 history below is the source record.

## Root cause (recap)
`android/gradle.properties` has `edgeToEdgeEnabled=true` (Expo SDK 54 / RN 0.81 default). Under
edge-to-edge, `StatusBar.currentHeight` + opaque `backgroundColor` are unreliable (→ header clips) and
`windowSoftInputMode="adjustResize"` is neutered (→ keyboard covers inputs). Fix = drive headers off
real safe-area insets and add JS-level `KeyboardAvoidingView`.

## What changed
**Safe-area (insets):**
- **`index.js`** — mounts `<SafeAreaProvider>` at the root (wraps `<App/>`), so `useSafeAreaInsets()`
  works app-wide.
- **`App.tsx`** — `const insets = useSafeAreaInsets()`; the persistent app header now uses
  `paddingTop: insets.top + 10` (was `StatusBar.currentHeight`-based via GlobalStyles). This one header
  sits above every inline DFO view, so fixing it fixes them all.
- **`Form222Screen.tsx` / `Form233Screen.tsx` / `CaptainProfileScreen.tsx`** — each modal header now
  uses `paddingTop: insets.top + 14` (was `StatusBar.currentHeight`-based).
- `GlobalStyles.ts` intentionally **not** edited — App overrides the header paddingTop inline (the
  stale currentHeight value there is a harmless dead fallback; leaving it avoids touching `styles.header`'s
  other consumers).

**Keyboard (`KeyboardAvoidingView`):**
- **`FullDfoForm.tsx`** — the main form ScrollView wrapped in a KAV (`behavior` Android-only `'height'`;
  iOS is already handled by the App-level KAV that wraps inline views, so this avoids double-padding).
  **Plus** the bait/bycatch entry **sheet Modal** got its own KAV (`ios:'padding'` / `android:'height'`)
  — that sheet portals outside the main-form KAV and is where **"bait pounds"** (`sheetLbs`) is entered.
- **`Form222Screen.tsx` / `CaptainProfileScreen.tsx`** — ScrollView wrapped in a KAV
  (`ios:'padding'` / `android:'height'`); these are full-screen Modals with no coverage on either
  platform.
- **`DfoSetupScreen.tsx`** — ScrollView wrapped in a KAV (Android-only; inline view, iOS via App KAV).
- **`Form233Screen.tsx`** — header inset only, **no KAV** (it has zero editable TextInputs — date
  pickers + dropdowns only, nothing for the keyboard to cover).
- The App-level KAV (`App.tsx`) left as-is — it still provides iOS avoidance for the inline forms
  (FullDfoForm, DfoSetup); changing its Android behavior would affect every inline view (map, pro,
  settings…), which is out of scope.

Not touched (out of scope, pre-existing): the inline `DfoSetupScreen`/`TripStartConfirmScreen` header
double-gap (they add their own top padding while under the app header) — cosmetic, left alone since the
brief scoped insets to the app header + modal headers.

## Automated gates
- `npx tsc --noEmit` → **33 errors (baseline), 0 new**, none in the touched files (JSX tag balance
  confirmed — unbalanced KAV/View would fail tsc).
- `npx jest` → **19 suites / 68 tests** (unchanged; this is a UI-layout change with no unit surface).

> Layout/keyboard behaviour can't be unit-tested (no native window/IME in jest) — it is
> **device-verified** below.

## Pixel device checklist (run before committing)
**Safe-area (headers clear the status bar / camera cutout):**
1. Every DFO screen's persistent app header — title + red **DFO ELOG** pill fully visible, not clipped
   under the status bar.
2. **Form 222**, **Form 233**, **Captain Profile** modal headers — back chevron + title fully visible.

**Keyboard (the device-confirmed fields must now be usable — none covered):**
3. New ELOG → **Add bait** → focus the **weight (bait pounds)** field in the sheet → keyboard does NOT
   cover it (sheet rises above the keyboard); type a value, Add Entry works.
4. New ELOG → **crew / persons** entry (Crew section) → focused input is not covered.
5. New ELOG → scroll to **bottom-of-form** fields (e.g. HLIN/HLOUT company/confirmation, Personal Use,
   or QC Transfer fields) → focus one → it scrolls above the keyboard, not covered.
6. **Form 222** → focus a lower field (Observer / Contact / Remarks) → not covered.
7. **Captain Profile** → focus a lower field → not covered.
8. **DfoSetup** → focus Licence / FIN → not covered.

**iOS regression (any iOS device/sim):** headers respect the notch with no excessive top gap; the forms
still avoid the keyboard as before (App KAV for inline forms; modal KAVs for Form 222 / Captain Profile).

## Literal git block — run after the checklist passes (Jonny runs; Claude does not)
```
git add index.js App.tsx src/screens/Form222Screen.tsx src/screens/Form233Screen.tsx src/screens/CaptainProfileScreen.tsx src/screens/DfoSetupScreen.tsx src/components/FullDfoForm.tsx src/components/SentLogCard.tsx docs/GATE_S95_ITEM34.md
git commit -m "Adopt SafeAreaProvider insets and keyboard avoidance for Android edge-to-edge (S95 items 3+4)"
git push origin main
```
(`docs/RECON_S95_ANDROID.md` is already committed with Item 2 — not re-staged. `docs/DIAG_S95_ITEM2.md`
and the two untracked `assets/docs/*.pdf` are unrelated and deliberately not staged.)

---

## Device test result (PARTIAL) — 2026-07-06, Pixel 8 — DO NOT COMMIT

**PASS:** bait-sheet pounds field visible over the keyboard; app header + modal headers
(Form 222 / 233 / Captain Profile) clear of the status bar.

### FAIL 1 — Personal Use Declaration (bottom of the main FullDfoForm ScrollView) still covered by the keyboard; not scrolled into view on focus
**Diagnosis: this is a scroll-into-view problem, NOT a KAV behavior/offset problem.**
- The main-form KAV (`behavior='height'`) makes vertical room above the keyboard, but nothing scrolls
  the focused field up into that room. `renderField`'s `TextInput` (FullDfoForm.tsx:930-938) has no
  `onFocus`/ref; the main ScrollView (1210) has no ref and no keyboard-aware scroll.
- Under Android edge-to-edge the OS `adjustResize` auto-scroll-to-focused-input is neutered, and RN's
  built-in `ScrollView` does **not** auto-scroll to a focused `TextInput` on Android (that is an iOS-only
  behavior). So a field near the bottom stays below the shrunk viewport, under the keyboard.
- Why the bait sheet passed: it's short — making room ('height') is enough, no scroll needed. The main
  form is long, so room-without-scroll still leaves the bottom fields covered.
- Changing behavior ('height'→'padding') or adding `keyboardVerticalOffset` will **not** fix this —
  neither scrolls the field into view.

**Proposed FAIL 1 fix — choose one:**
- **Option A — `react-native-keyboard-controller` (most robust).** Wrap the DFO form ScrollViews in its
  `KeyboardAwareScrollView` + mount `KeyboardProvider` at the root. Purpose-built for Android edge-to-edge;
  handles scroll-to-focus natively. Cost: **one new native dependency → `npx expo prebuild` + rebuild.**
- **Option B — manual scroll-on-focus (no new dependency).** Add a `ref` to the main ScrollView; in
  `renderField`, add `onFocus` that measures the focused field against the ScrollView (`measureLayout`)
  and `scrollTo`s it above the keyboard (keyboard height via a `Keyboard` listener). ~20-30 lines in the
  shared `renderField`; works, but per-field and less robust than the library across the dynamic layout.

**Recommendation:** Option A is the durable answer (adjustResize is fundamentally dead under edge-to-edge).
**But** given the current build fragility (see `docs/DIAG_S95_BUILD.md` — `gradlew clean` / CMake issues), a
native-dep + prebuild churn carries risk right now; **Option B keeps everything in JS with no prebuild.**
Your call.

### FAIL 2 — DfoSetup content ("Nfld & Lab" region chips) clipped
**Structural finding:** DfoSetup renders **below the always-present app header** (App.tsx:624 inside
`mainContentContainer`; the app header at :533 is unconditional; the only early returns — 469/478/483 —
are loading/language/login). So its own header **cannot** clip content under the status bar (the app
header already occupies the top). The header's `StatusBar.currentHeight` padding (DfoSetupScreen.tsx:284)
is redundant (a double top-gap), not the clip source.
**Most likely actual cause:** the **`behavior='height'` KAV** I added (DfoSetupScreen.tsx:177). 'height'
is unreliable and can distort the child ScrollView's box even keyboard-closed — and the user saw the clip
on navigation, before typing. (Form 222 / Captain Profile also use Android 'height' but weren't reported;
DfoSetup's exact header+KAV nesting may be what trips it.)

**Proposed FAIL 2 fix (pulls DfoSetup fully into the edge-to-edge treatment, per your directive):**
- Change the DfoSetup KAV `behavior='height'` → `'padding'` (padding is a no-op keyboard-closed → cannot
  clip; primary fix). Apply the same `'height'`→`'padding'` change to the other Android KAVs (FullDfoForm
  main + bait sheet, Form 222, Captain Profile) to remove the 'height' clip risk everywhere.
- Simplify the DfoSetup header: it's below the app header, so drop the redundant status-bar inset →
  `paddingTop: 14`. Removes the double-gap and the `currentHeight` unreliability.
- If the clip persists after 'height'→'padding', it's a chip-layout issue (pillRow/pillText truncation) —
  the FAIL 2 screenshot would confirm and I'll chase that instead.

### Fixes APPLIED (chosen: FAIL 1 = Option B, manual scroll-on-focus; no new dependency)
**FAIL 1 — `src/components/FullDfoForm.tsx`:**
- Added `scrollRef` (`useRef`) on the main ScrollView.
- Added `handleFieldFocus` + `onFocus={handleFieldFocus}` on `renderField`'s TextInput. On Android it
  calls `scrollRef.getScrollResponder().scrollResponderScrollNativeHandleToKeyboard(node, 120, true)`
  (after a 50 ms settle) to scroll the focused field ~120 px above the keyboard. iOS returns early
  (handled by the app-level KAV). Covers every `renderField` field, incl. Personal Use.
- Switched the main-form KAV `behavior` Android `'height'` → `'padding'` (makes bottom room without
  the 'height' resize; complements the manual scroll).

**FAIL 2 — `src/screens/DfoSetupScreen.tsx`:**
- Header now uses `useSafeAreaInsets()` → `paddingTop: insets.top + 14` (off `StatusBar.currentHeight`,
  matching the modal headers).
- Switched the KAV `behavior` Android `'height'` → `'padding'`.

**Left untouched (passed device test — no regression risk taken):** the bait-sheet KAV, and the
Form 222 / Captain Profile KAVs (still `'height'` on Android; their content did not clip and their
bottom fields were not reported covered). If a covered-field or clip shows up on those later, the same
two changes (manual scroll / `'height'`→`'padding'`) apply.

**Gates after applying:** tsc 33/0-new (none in touched files) · jest 19 suites / 68 tests.

### Device RE-TEST checklist (before the git block)
1. **FAIL 1 fixed:** new ELOG → scroll down → focus **Personal Use Declaration** → it **scrolls above
   the keyboard** and stays visible while typing. Spot-check other lower fields (HLIN/HLOUT
   company/confirmation, Transfer fields on QC) → each scrolls into view on focus.
2. **FAIL 2 fixed:** open **DfoSetup** → the **region chips (incl. "Nfld & Lab")** are fully visible, not
   clipped. (If a large top gap appears instead, DfoSetup is below the app header and the inset is
   redundant — tell me and I'll switch it to a plain `paddingTop: 14`.)
3. **No regression:** bait-sheet pounds still visible over the keyboard; app + modal headers still clear
   of the status bar; Form 222 / Captain Profile still fine.
4. iOS spot-check: forms still behave (App KAV; no double-scroll on focus — manual scroll is Android-only).

Git block (top of this doc) is unchanged — `FullDfoForm.tsx` and `DfoSetupScreen.tsx` are already in the
staged set; these fixes are additional edits to those same files.

---

## Device re-test (round 2) — 2026-07-08, Pixel 8 — 3 issues, fixes PROPOSED (not applied)

### FAIL 1 (REGRESSION) — the scroll-into-view fix now OVER-scrolls
**Symptom:** focusing Trap Hauls / Personal Use / a Catch&Effort field flings the scroll so the field
lands ABOVE the viewport — you end up on a different section (focusing Catch&Effort lands on Timestamps;
focusing near GPS lands on Capture GPS).

**Diagnosis (careful — this is a regression from a half-working fix):** the round-1 fix calls
`scrollResponderScrollNativeHandleToKeyboard(node, 120, true)` (FullDfoForm `handleFieldFocus`). That is a
**legacy ScrollResponder method** that computes the scroll from RN's *internal* keyboard frame
(`this.keyboardWillOpenTo`), captured by the ScrollResponder's own keyboard listeners. Under **Android
edge-to-edge + New Architecture (Fabric)** that internal frame is unreliable — it reports a wrong/too-high
keyboard top, so the method scrolls the field far above the *actual* keyboard (≈ a whole section). The
`120` offset is NOT the culprit (120 px ≠ a section height); the **mis-measured keyboard frame** is.
Compounded by the FullDfoForm main-form KAV being `'padding'` (round-1), which ALSO makes room for the
keyboard → double compensation.

**Proposed fix (no new dependency — precise measure-and-scroll, replacing the legacy method):**
- Track the real keyboard height from `Keyboard.addListener('keyboardDidShow', e => e.endCoordinates.height)`
  (reliable on Android) + `keyboardDidHide` → 0.
- Track the ScrollView offset via `onScroll` (`scrollEventThrottle={16}`) into a ref.
- On focus, measure the field's window position via `e.target.measureInWindow(...)` (supported on Fabric
  public instances). Compute `overlap = (fieldY + fieldH + margin) − (screenHeight − keyboardHeight)`. Only
  when `overlap > 0`, `scrollTo({ y: currentOffset + overlap, animated: true })` — this settles the field
  JUST above the keyboard and never scrolls past the top. No fixed fling.
- Remove the double-compensation: drop the FullDfoForm main-form KAV on Android (behavior → `undefined`)
  so only the precise scroll acts; iOS keeps the app-level KAV.
- Residual risk (Fabric): if `e.target.measureInWindow` is unavailable, fall back to
  `UIManager.measureLayout(node, scrollInnerNode, …)` or an `onLayout` position map — will verify on device.

### FAIL 2a — DfoSetup big blue top gap (over-corrected → apply the pre-registered fallback)
Confirmed the "large top gap" outcome I pre-registered: DfoSetup renders **below the app header**, so
`insets.top` on its own header is redundant (double gap).
**Proposed fix (the named fallback):**
- `DfoSetupScreen.tsx:157` `paddingTop: insets.top + 14` → `paddingTop: 14`.
- Remove the now-unused `useSafeAreaInsets` import (`:14`) + `const insets` (`:40`).

### FAIL 2b (NEW) — Transmission Result modal header clips into the status bar
The shared **`SentLogDetailModal`** (`src/components/SentLogCard.tsx:101`) is a full-screen `<Modal>` whose
`detailHeader` (`:120`, style `:249` — only `paddingVertical: 12`, no inset) got no edge-to-edge treatment,
so on Android the title overlaps the status/battery row and the X close is unreachable. Same class as the
Form 222/233/Captain Profile modals.
**Proposed fix (same pattern as those modals):**
- Add `import { useSafeAreaInsets } from 'react-native-safe-area-context'` + `const insets = useSafeAreaInsets()`
  inside `SentLogDetailModal`.
- Header: `<View style={[styles.detailHeader, { paddingTop: insets.top + 12 }]}>` (base 12 keeps its rhythm).

### APPLIED (all three)
- **FAIL 1 — `FullDfoForm.tsx`:** replaced the flinging `scrollResponderScrollNativeHandleToKeyboard(…,120)`
  with precise measure-and-scroll — `Keyboard` listeners track the real keyboard height; `onScroll` tracks
  the offset; on focus, `e.target.measureInWindow` gives the field's real window position and we
  `scrollTo` by exactly `overlap = (fieldBottom + 16) − keyboardTop`, only when covered (16 = a small
  visual gap, not a tuning offset). The main-form KAV was **removed** (no more double-compensation; iOS
  still uses the app-level KAV). ScrollView `contentContainerStyle.paddingBottom` is now `40 + keyboardHeight`
  so bottom fields have room to scroll clear. If `measureInWindow` proves unreliable on Fabric on device,
  the fallback is `measureLayout`/`onLayout` (NOT offset tuning) — flag it and I'll switch.
- **FAIL 2a — `DfoSetupScreen.tsx`:** header → plain `paddingTop: 14` (dropped the `insets.top` doubling);
  removed the now-unused `useSafeAreaInsets` import + `const insets`.
- **FAIL 2b — `SentLogCard.tsx` (`SentLogDetailModal`):** added `useSafeAreaInsets()` + header
  `paddingTop: insets.top + 12`, matching the other full-screen modals.

**Gates:** tsc 33/0-new (none in touched files) · jest 19 suites / 68 tests · FullDfoForm KAV balance 1/1
(bait sheet only). Git block above updated to add `src/components/SentLogCard.tsx`.

### Device RE-TEST checklist (round 2 — run before the git block)
1. **FAIL 1 fixed (the key one):** new ELOG → focus **Trap Hauls** and **Personal Use Declaration** → each
   settles **JUST above the keyboard** — not flung off-screen/above the viewport, not still covered. Spot-
   check a couple of other lower fields (HLIN/HLOUT, Transfer on QC) → same.
2. **FAIL 2a fixed:** open **DfoSetup** → the big blue gap between the app header and "Set Up Your DFO ELOG"
   is gone; region chips ("Nfld & Lab") fully visible.
3. **FAIL 2b fixed:** open a sent log's **Transmission Result** modal → its header clears the status bar,
   title not overlapping the battery/notification row, **X close button reachable**.
4. **Regression pass:** bait-sheet pounds still visible over the keyboard; **Form 222 / 233 / Captain Profile**
   headers still clear of the status bar; the **draft restore prompt** still appears on a killed-mid-entry
   new log.
5. iOS spot-check: forms still behave (app-level KAV; no over-scroll — the manual scroll is Android-only).

---

## Device re-test (round 3) — FAIL 1 only (2a + 2b confirmed fixed)

**FAIL 2a (DfoSetup gap) and FAIL 2b (transmission-result modal header) are DEVICE-CONFIRMED FIXED**, and the
full regression pass is clean. Those files (`DfoSetupScreen.tsx`, `SentLogCard.tsx`) are **done — not to be
re-touched.** FAIL 1 lives in `FullDfoForm.tsx` only.

### FAIL 1 round-2 (measureInWindow) — why it was a NO-GO
The round-2 handler did **nothing** — no field scrolled, every keyboard field stayed covered.
**Root cause:** in RN's `TextInput` `onFocus`, `e.target` is a **numeric reactTag**, not a host-component
instance (true even under Fabric). Numbers have no `.measureInWindow` method, so the guard
`!target?.measureInWindow` was always true → **early return → `measureInWindow` NEVER FIRED** for any field.
Answer to "null? zeros? never fired?" → **never fired** (the method doesn't exist on a numeric target).
Confirmed by contrast: round-1's `scrollResponderScrollNativeHandleToKeyboard(node, 120)` *did* scroll (it
overshot) — because it accepts a numeric node handle and measures via **`UIManager.measureLayout`**
internally. So the numeric-reactTag + `UIManager.measureLayout` path is *proven to work on this device*.

### FAIL 1 fallback — APPLIED (`FullDfoForm.tsx` only)
`handleFieldFocus` now uses **`UIManager.measureLayout(e.target /* reactTag */, scrollInnerNode, onFail,
onSuccess)`** — the exact measurement the working scrollResponder uses internally, measured relative to the
ScrollView's inner content node (`getInnerViewNode()`). Scroll math uses the **real** keyboard height
(`Keyboard` events) + the **real** viewport height (ScrollView `onLayout`): `target = (fieldTop + fieldHeight
+ 16) − (viewportHeight − keyboardHeight)`, scroll only if `target > currentOffset`, clamped `≥ 0`. No
internal keyboard frame (which caused round-1's overshoot), no offset tuning (16 = a small visual gap).
`contentContainerStyle.paddingBottom` stays `40 + keyboardHeight` for scroll room. tsc 33/0-new, jest 19/68.
Residual risk: if `getInnerViewNode()`/`measureLayout` is null under Fabric, the handler no-ops (no scroll)
rather than mis-scrolls — device test will show whether it fires.

### Device RE-TEST (round 3)
1. **FAIL 1:** across the DFO log, focus each keyboard field type — **catch weight, trap hauls, bait
   (pounds), GPS lat/long, personal use, HLIN/HLOUT, licence/FIN** — each should scroll to sit **just above
   the keyboard** (not off-screen, not still covered, not flung to another section).
2. **No regression** on the already-confirmed items: DfoSetup gap stays gone; transmission-result modal
   header stays clear with a reachable X; bait sheet, Form 222/233/Captain Profile headers, and the draft
   prompt all still fine.
3. iOS spot-check: unchanged (manual scroll is Android-only; iOS uses the app-level KAV).

---

## Device re-test (round 4) — FAIL 1 ref-based path + instrumentation (2a/2b still fixed, untouched)

### Round-3 confirmed failure
`UIManager.measureLayout(e.target, getInnerViewNode(), …)` no-op'd on every field — the pre-registered
`getInnerViewNode()`-returns-null-under-Fabric branch (handler bails safely). Confirmed on-device (fresh
reinstall 2026-07-08 09:36).

### Round-4 change (`FullDfoForm.tsx` only) + why it should clear both prior Fabric boundaries
`handleFieldFocus` now takes the focused field's **ref** (a `React.createRef()` attached to each
`renderField` `TextInput`) and calls **`ref.current.measure((x,y,w,h,pageX,pageY) => …)`** — the canonical
Fabric measurement API. It avoids BOTH prior failures: it uses a real ref instance (not the numeric
`e.target` that killed `measureInWindow`) and window-relative `pageY` (not the null `getInnerViewNode`).
Scroll = `overlap = (pageY + h + 16) − (windowHeight − keyboardHeight)`, only if `overlap > 0`, via
`scrollTo({ y: currentOffset + overlap })`. Real keyboard height from `Keyboard` events. No offset tuning
(16 = a small visual gap). **Honest residual risk** (flagged before implementing, per your ask): (a) that the
`TextInput` ref exposes `.measure` — it should; (b) coordinate consistency of `pageY` vs window/keyboard
height under edge-to-edge (possible nav-bar skew). Both are logged, so a failure is diagnosable, not silent.

### Instrumentation (so this can't be a 4th silent fail)
Every focus logs (tagged `[S95KB]`, via `console.warn`):
- `focus innerNode=<v> measure=<type> kb=<h>` — **confirms `getInnerViewNode()` value** (validating round-3)
  + whether the ref exposes `measure` + the captured keyboard height.
- `pageY=… h=… winH=… kbTop=… overlap=… scrollY=…` — the full measurement + math.
- `scrollTo y=…` / `no scroll (not covered)` / `bail: no measure` / `bail: kb=0` — the decision taken.

**TEMPORARY** `babel.config.js` change (`transform-remove-console` → keep `warn`/`error`) so these survive the
release build — REVERT after diagnosis (or run a debug build, which doesn't strip console — same edge-to-edge/
Fabric behavior). This babel change is NOT to be committed; the `[S95KB]` logs are removed once the path is
confirmed. Fix commit = `FullDfoForm.tsx` only.

### How to read it on device
```
adb logcat -c
adb logcat | grep --line-buffered S95KB
```
Then focus a **low** field (Personal Use / HLIN weight). Expected: `focus … measure=function kb=<nonzero>`
→ `pageY/…/overlap` → `scrollTo y=…`, and the field settles just above the keyboard. Diagnosis if not:
- `innerNode=null` → confirms the round-3 root cause (as predicted).
- `measure=undefined` or `bail: no measure` → the ref doesn't expose measure → next step is a different ref
  target (e.g. wrap the row in a measurable `View`), NOT offset tuning.
- `overlap` huge/negative or field lands wrong despite `scrollTo` → `pageY`/keyboard coords are skewed under
  edge-to-edge; the logged numbers tell us the exact correction (still measured, not guessed).
- `bail: kb=0` → keyboard height not captured (Keyboard event timing) — would move the measure into the
  `keyboardDidShow` listener instead of onFocus.
