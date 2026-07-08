# DEFERRED — FullDfoForm keyboard scroll-into-view (S95 Item 3/4 remainder)

Next-session aim doc. The **safe-area insets + keyboard-avoidance** half of S95 Items 3+4 is
device-confirmed and committed. The **scroll-into-view** half (bottom-of-form fields covered by the
soft keyboard in `FullDfoForm`) is unsolved after 4 attempts and is deferred. This is where to resume.

## What's DONE (committed, device-confirmed)
- Safe-area: `SafeAreaProvider` (index.js), app header (App.tsx), Form 222/233/Captain Profile modal
  headers, **DfoSetup** header (2a: `paddingTop: 14` — below the app header, no inset), **transmission-
  result modal** (`SentLogDetailModal`) header (2b: `insets.top + 12`). All confirmed clear of the status bar.
- Keyboard **avoidance**: the bait/bycatch **sheet KAV** (bait-pounds visible over keyboard — confirmed),
  plus KAVs on Form 222 / Captain Profile / DfoSetup. Kept.

## What's DEFERRED
`FullDfoForm` main-form **scroll-into-view**: when a bottom field (Personal Use, HLIN/HLOUT, Trap Hauls,
catch weight when scrolled low, …) is focused, it stays under the keyboard — the form doesn't scroll it
up. **The FAIL-1 code is reverted to the clean state** (no KAV on the main ScrollView, no scroll handler,
no refs) so next session builds fresh.

## Why it's hard (root context)
Android **edge-to-edge** (`edgeToEdgeEnabled=true`, Expo SDK 54) neuters `windowSoftInputMode="adjustResize"`,
so the OS no longer auto-scrolls the focused input into view. RN's `ScrollView` does **not** auto-scroll-to-
focus on Android (that's iOS-only). And the app is **New Architecture (Fabric)**, which breaks several
legacy measurement paths. So we must manually measure the focused field + scroll — but every measurement
API tried hit a Fabric boundary:

## The 4 attempts (do NOT repeat these)
1. **`scrollResponderScrollNativeHandleToKeyboard(node, 120, true)`** (+ KAV `height`). → **OVERSHOOT** —
   flung the field above the viewport onto another section. Cause: the method computes scroll from RN's
   *internal* keyboard frame, which is unreliable under edge-to-edge/Fabric (reports a wrong keyboard top).
   The `120` was NOT the cause. Measurement itself worked (it uses UIManager.measureLayout internally).
2. **`e.target.measureInWindow(...)`** (+ KAV `padding`). → **NO-OP** (never scrolled any field). Cause:
   in `TextInput.onFocus`, `e.target` is a **numeric reactTag**, not a host instance — `.measureInWindow`
   is undefined on it → the guard bailed → never fired. (Not null, not zeros: never called.)
3. **`UIManager.measureLayout(e.target, sv.getInnerViewNode(), …)`** (KAV removed). → **NO-OP**. Cause:
   `ScrollView.getInnerViewNode()` returns **null under Fabric** → guard bailed. Device-confirmed
   (fresh reinstall 2026-07-08 09:36).
4. **Ref-based `ref.current.measure((x,y,w,h,pageX,pageY)=>…)`** — `React.createRef()` per `renderField`
   `TextInput`; scroll by `overlap = (pageY + h + 16) − (windowHeight − keyboardHeight)`, keyboard height
   from `Keyboard` events; fully `[S95KB]`-instrumented. → **IMPLEMENTED but NOT device-tested** (session
   wrapped before rebuild). The full round-4 code is in `docs/GATE_S95_ITEM34.md` (round-4 section) and
   this commit's parent history — re-apply it to resume.

## NEXT STEPS (aimed)
1. **Re-apply round-4** (ref.measure + `[S95KB]` logs). Because release builds strip `console.*`
   (`babel.config.js` `transform-remove-console`), temporarily set it to
   `[['transform-remove-console', { exclude: ['warn', 'error'] }]]` for the diagnostic build (revert after),
   OR run a **debug** build (same edge-to-edge/Fabric behavior, no babel change). Rebuild, then:
   `adb logcat -c && adb logcat | grep --line-buffered S95KB`, focus a low field.
2. **Read the logs:**
   - `measure=function` + `overlap=…` + `scrollTo y=…` and the field lands just above the keyboard → **done.**
     Remove `[S95KB]` logs, revert babel, commit.
   - `measure=undefined` / `bail: no measure` → the `TextInput` ref doesn't expose `.measure` under Fabric →
     **wrap the field row in a measurable `<View ref={rowRef}>` and measure THAT** (a plain View's ref.measure
     is the most Fabric-reliable). This is the pre-registered next fallback.
   - `overlap` skewed / field lands wrong despite `scrollTo` → `pageY` vs keyboard/window coords are off under
     edge-to-edge; the **logged numbers give the exact correction** — apply that, do NOT guess an offset.
   - `bail: kb=0` → keyboard height not captured in time → measure inside the `keyboardDidShow` listener
     instead of onFocus.
3. **Constraints (carried):** no guessed offset constants — measure, don't tune. `FullDfoForm.tsx` only.
   Do NOT touch DfoSetup / SentLogCard (2a/2b are done). Gate: tsc 33/0-new, jest 19/68.

## Gotchas banked
- Release builds strip `console.*` (production `transform-remove-console`) — logs need the temp babel
  console-keep, or a debug build.
- `TextInput.onFocus` `e.target` = numeric reactTag (no instance methods).
- `ScrollView.getInnerViewNode()` returns null under Fabric here.
- `gradlew clean` is broken on this project (New-Arch codegen) — see `docs/RECOVERY_S95_BUILD.md`; use the
  targeted `rm -rf` there, not `prebuild --clean` (it would overwrite committed native dirs).
