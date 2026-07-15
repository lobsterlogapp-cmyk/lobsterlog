# DIAG — Session 95, Item 2 fails on device (no scratch write / no restore prompt)

**Repro (Pixel 8, fresh release build):** new ELOG → enter several fields incl. a timestamp →
pause 2+ s → swipe-kill → relaunch → new ELOG → **no restore prompt, data gone.**

This is instrumentation only. **No fix applied. No git.** Once the logcat trace points at the cause,
the fix is a separate step.

---

## Findings so far (static)
- **Suspect (a) — write gate never true — RULED OUT.** `editingLogId` is `null` for a new log
  (App.tsx:632 `onNewLog → setEditingLogId(null)` → dfo-trip → dfo-demo → `<FullDfoForm
  editingLogId={editingLogId}/>` at App.tsx:661). So the write-effect gate
  `if (editingLogId || readOnly || !isLoaded || editingCompleted) return` is NOT tripped by
  `editingLogId`. (`readOnly` is false on the new-log path; `editingCompleted` false.)
- **Release builds strip `console.*`.** `babel.config.js` runs `transform-remove-console` in the
  `production` env — so any `console.log` would be invisible in the release-build logcat. For this
  diagnosis the plugin is temporarily set to keep `warn`/`error`
  (`['transform-remove-console', { exclude: ['warn', 'error'] }]`), and all probes use
  `console.warn`. **This babel change must be reverted after diagnosis.**
- The write/baseline/restore logic reads as correct on paper, so the failure is most likely
  **timing, uid-namespace, or persistence** — which the trace below distinguishes directly. Leading
  hypotheses:
  1. **uid mismatch** — `dfoKey()` suffixes the ambient `activeDfoUid`. If it's `null` at write time
     the scratch lands under `…::__anon__`, but the relaunch read (auth restored) uses `…::<uid>` →
     miss. The probes print the full key both times, so the suffixes are directly comparable.
  2. **baseline ate the edits** — if `isLoaded` flips true *after* the first edits (slow mount), the
     baseline snapshot already contains them, so `draftSnapshot === baseline` stays true and the
     write never arms. The probes log when the baseline is captured and every "baseline-equal" skip.

---

## Instrumentation added (all tagged `[S95DRAFT]`, removable by grep)
- `babel.config.js` — keep warn/error in production (temporary).
- `src/utils/dfoLogStorage.ts` — `saveActiveDraft` (key + bytes, then `OK`), `loadActiveDraft`
  (key + `found=YES/NULL`), `clearActiveDraft` (key).
- `src/components/FullDfoForm.tsx` — baseline capture (with `isLoaded`), the write effect's every
  gate outcome (`SKIP gate` / `SKIP baseline-equal` / `SKIP not-meaningful` / `ARM` / `FIRE`), and
  the mount restore-check (`scratch=FOUND/null`).

---

## How to run it

1. **Rebuild** the release build (the babel + probe changes must be in the bundle). Confirm
   `createBundleReleaseJsAndAssets` ran, install to the Pixel.
2. In a terminal:
   ```
   adb logcat -c
   adb logcat | grep --line-buffered S95DRAFT
   ```
   (Leave it running. `grep` on the marker catches the lines regardless of log tag; if your `grep`
   lacks `--line-buffered`, plain `adb logcat | grep S95DRAFT` is fine.)
3. **Session A (write):** open a new ELOG → enter a couple of fields **and a timestamp** → **wait
   ~3 s and WATCH the terminal** before killing. You should see the write sequence below. Then
   swipe-kill.
4. **Session B (restore):** relaunch → open a new ELOG → watch for the load/restore lines.
5. Paste the full `S95DRAFT` output back here.

---

## Expected HAPPY-PATH trace (what a working build would print)
Session A:
```
[S95DRAFT] baseline captured isLoaded=true len=…
[S95DRAFT] mount restore-check scratch=null
[S95DRAFT] write SKIP baseline-equal (no divergence yet) baselineSet=true   ← before you type
…(you type a field / pick a timestamp)…
[S95DRAFT] write ARM 800ms timer (diverged)
[S95DRAFT] write FIRE -> saveActiveDraft
[S95DRAFT] saveActiveDraft key=@lobsterlog:dfo_active_draft::<UID> bytes=…
[S95DRAFT] saveActiveDraft OK
```
Session B (after relaunch → new ELOG):
```
[S95DRAFT] baseline captured isLoaded=true len=…
[S95DRAFT] loadActiveDraft key=@lobsterlog:dfo_active_draft::<UID> found=YES len=…
[S95DRAFT] mount restore-check scratch=FOUND
```
→ the restore prompt appears.

---

## Interpretation — decision tree (what the FAILURE trace tells us)

**1. You never see `write ARM` / `write FIRE`.** The write never armed — read the last `write SKIP …`:
- `SKIP gate … isLoaded=false …` → the effect keeps running before load finishes (shouldn't persist;
  note the printed values).
- **`SKIP baseline-equal` even after you typed** → suspect (b). Check the ORDER: if
  `baseline captured` appears *after* you'd already typed, the baseline swallowed your edits. Fix =
  capture the baseline earlier / differently.
- `SKIP not-meaningful` → `hasMeaningfulData()` is false (unexpected — would mean the edits aren't in
  `buildLogData`).

**2. You see `write FIRE` + `saveActiveDraft key=…` but the key suffix is `::__anon__`** (not your
real UID) → suspect (a')/uid: `activeDfoUid` was null at write time. The scratch is written to the
anon namespace and the relaunch read (real UID) misses it.

**3. You see `saveActiveDraft OK`, but Session B shows `loadActiveDraft … found=NULL`:**
- **Compare the two keys.** Different suffix (`::__anon__` vs `::<UID>`) → uid-namespace mismatch
  (write and read disagree on the active uid — timing of `setActiveDfoUid`).
- Same suffix but `found=NULL` → the write didn't survive the swipe-kill (didn't flush to disk before
  termination) — a persistence/timing problem, not a namespace one.

**4. Session B shows `found=YES` + `scratch=FOUND` but NO prompt** → the read works; the issue is the
Alert/hydrate step (unlikely given the code, but then it's a UI-thread/nav timing issue).

**5. An unexpected `[S95DRAFT] clearActiveDraft key=…` appears during Session A (before the kill)** →
something is clearing the scratch mid-entry (a stray save/back/unmount). That's the bug.

---

## Revert after diagnosis (all temporary)
- `babel.config.js` → back to `plugins: ['transform-remove-console']`.
- Remove every `[S95DRAFT-DIAG]` / `[S95DRAFT]` `console.warn`/`console.error` probe from
  `src/utils/dfoLogStorage.ts` and `src/components/FullDfoForm.tsx`.
  (grep: `grep -rn S95DRAFT src/ babel.config.js` — 16 hits to remove.)

## Report metadata
- Path: `docs/DIAG_S95_ITEM2.md`
- Instrumentation only; Item 2 NOT committed; gates still green (tsc 33/0-new, jest 19/68) with the
  probes in place. No git run.
