# GATE — Session 95, Item 2: draft crash-safety (scratch draft + restore)

**Status:** code complete, automated gates green, **device-verified PASS on Pixel 8** (restore,
discard, clear-on-save/back/send, edit-path all confirmed) — ready to commit. Minimal slice per the
brief — NO draft-restore-into-the-list, NO change to the transmission path or the saved-log storage
shape.

> The initial on-device "no restore prompt" failure was a **stale build** (the first swipe-kill test
> ran a pre-rebuild binary), NOT a code fault — confirmed after a clean rebuild. Temporary logcat
> probes + a babel console-keep tweak were added to diagnose it (`docs/DIAG_S95_ITEM2.md`) and have
> been **fully reverted**: no diagnostic-probe references remain in code, and `babel.config.js`
> matches its pre-diagnosis (committed) state. tsc 33/0-new, jest 19/68 after the revert.

## What changed
A NEW in-progress Form 234 log is now snapshotted to a single uid-namespaced AsyncStorage scratch key
(debounced) as it's entered, so an app crash mid-entry can't destroy the trip. On the next new log a
surviving scratch triggers a restore prompt. The scratch is cleared on every successful save path.

- **`src/utils/dfoLogStorage.ts`** — new `saveActiveDraft` / `loadActiveDraft` / `clearActiveDraft`
  over `dfoKey('@lobsterlog:dfo_active_draft')` (uid-namespaced, account-isolated; best-effort, never
  throws into a caller). Intentionally NOT added to `DFO_STORE_BASES` — it's transient device-local
  crash-safety, not user data to back up / migrate / wipe. The `dfo_logs` store + `saveLog` are
  untouched.
- **`src/components/FullDfoForm.tsx`**:
  - Extracted the edit-load hydration into `hydrateFromLog(log)` (the edit branch is now
    `if (log) hydrateFromLog(log)`); restore reuses it — restoring the scratch is identical to
    opening a saved log. Edit-path behaviour is byte-identical (pure relocation).
  - `buildDraftLog()` — one draft-shaped `DfoLog` builder shared by Back, the imperative `saveDraft`,
    and the scratch write (previously two duplicated literals).
  - Debounced scratch write (800 ms) via a `useEffect` keyed on a serialized content snapshot (so
    timer-tick re-renders don't reset the debounce). New logs only; gated
    `!editingLogId && isLoaded && !readOnly && !editingCompleted`.
  - **Baseline guard:** the scratch only starts writing once the content diverges from the prefilled
    baseline, so pre-fill (crew/ports/FMA from the last log) alone never triggers a spurious restore
    prompt.
  - On-mount restore prompt (new logs only): if a scratch exists → Alert **Restore** (`hydrateFromLog`)
    / **Discard** (`clearActiveDraft`).
  - Clears the scratch on: complete save (`handleSave` success), draft-on-back (`handleBack`),
    imperative `saveDraft`, and restore-Discard.
- **`src/i18n/locales/en|fr/dfo.json`** — 4 keys under `form234`: `restoreDraftTitle` /
  `restoreDraftBody` / `restoreDraftRestore` / `restoreDraftDiscard`. FR provided (informal 'tu',
  matches the file's register) — **flag for the FR proofreader pile** alongside the existing _todo set.
- **`src/utils/__tests__/activeDraftScratch.oneoff.test.ts`** (new) — round-trip guard:
  save→load verbatim, clear→null, and the scratch never writes into `dfo_logs`.

## "Clear on save AND send" — how it's satisfied
The scratch is cleared on **all four save paths** above. A log **must be saved before it can be sent**
(send happens from the logs list on an already-saved log), so the scratch is always already cleared
before any send — **"clear on send" is satisfied transitively, without touching the transmission
path** (which was explicitly off-limits). If you want an explicit belt-and-suspenders
`clearActiveDraft()` inside `DfoLogsListScreen` `doSubmit` too, that's a one-line scoped exception to
the "don't touch the transmission path" rule — say the word and I'll add it.

## Automated gates
- `npx tsc --noEmit` → **33 errors (baseline), 0 new**, none in the touched files.
- `npx jest` → **19 suites / 68 tests** (was 18 / 64; +1 suite / +4 tests, the new scratch guard).
  Timestamp regression (`blankTimestampGate`, `launderSweep`) still green.

> jest can't exercise the debounce/restore UI (no native storage lifecycle / Alert in jest); the
> helper round-trip is unit-tested, the behaviour is **device-verified** below.

## Pixel device checklist (run before committing)
1. **Crash → restore:** new ELOG → enter times + catch weight → **force-kill** the app (swipe away)
   without saving → reopen → new ELOG → **restore prompt appears** → **Restore** → the entered data
   is back.
2. **Discard:** repeat step 1 → **Discard** → a fresh new log; open another new log → **no prompt**
   (scratch cleared).
3. **Clear on complete save:** new log → enter data → **Save** → open a new log → **no prompt**.
4. **Clear on Back:** new log → enter data → **Back** (draft saved to the list, existing S43
   behaviour) → open a new log → **no prompt**.
5. **Prefill-only (no spurious prompt):** open a new log (crew/ports prefilled), type **nothing**,
   force-kill → reopen new log → **no prompt** (baseline guard).
6. **Clear on send (transitive):** create + Save a log, then Send it (your hands — Claude never
   POSTs) → open a new log → **no prompt** (scratch was cleared at save, before the send).
7. *(Optional)* **Account isolation:** the scratch is uid-namespaced — account B never sees account
   A's in-progress scratch.

## Literal git block — device checklist PASSED; run now (Jonny runs; Claude does not)
```
git add src/utils/dfoLogStorage.ts src/components/FullDfoForm.tsx src/i18n/locales/en/dfo.json src/i18n/locales/fr/dfo.json src/utils/__tests__/activeDraftScratch.oneoff.test.ts docs/RECON_S95_ANDROID.md docs/GATE_S95_ITEM2.md
git commit -m "Add crash-safety scratch draft for in-progress DFO logs (S95 item 2)"
git push origin main
```
Notes:
- `babel.config.js` is intentionally **NOT** in the `git add` — it was reverted to its committed state
  (its working-tree diff is empty), so there's nothing to commit there.
- `docs/DIAG_S95_ITEM2.md` (the stale-build diagnosis record) is intentionally **excluded** so the
  committed diff carries none of the temporary probe tags. Commit it separately or delete it — your
  call; it's a throwaway diagnostic record.
- `docs/RECON_S95_ANDROID.md` carries this session's queued-items + keyboard-note additions since the
  Item 1 commit; drop it from the `git add` if you'd rather hold it.
