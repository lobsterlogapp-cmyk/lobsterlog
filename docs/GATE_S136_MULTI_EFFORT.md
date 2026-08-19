# GATE S136 — MULTI-EFFORT (defect 23 / Rule 1050)

**Session:** 136 · **Opened:** 2026-08-19
**Baseline:** repo tip `8e5225e`, tree clean apart from untracked docs. tsc **33** errors.
jest **42 suites / 198 tests**.
**Recons this build rests on:** `docs/RECON_S136_MULTI_EFFORT.md` and
`docs/RECON_S136B_EFFORT_VS_DETAIL.md`. Read both before Phase 1.

---

## STANDING RULES — read before anything else

1. **Jonathon never edits .md files.** You own this document end to end. **You fill your
   own verify table** at every phase before handing back. Never ask him to write in it.
2. **NEVER run state-changing git.** Write vetted literal commands into this file's commit
   block and STOP. He runs them one line at a time. Every commit block must contain
   `git push`. Stage by exact path — never `-A`.
3. **NEVER POST to any DFO endpoint.**
4. **Plain language in every report.** Jonathon is the reader and he is not a programmer.
   Say what the rule requires, what the app does, and what he is choosing between, in
   ordinary words — including when stating a ruling.
5. **STOP for his ruling at every point marked ⛔ STOP.** One question at a time, with a
   recommendation and the honest case against. Never bundle.
6. **If this document is wrong, say so before you build.** Line numbers drift — grep to
   confirm every one.
7. **One concern per phase. Each phase commits before the next one builds** (shared-file
   rule: every phase below touches `FullDfoForm.tsx`).
8. **Build-walks go on the SANDBOX sim** (iPhone 17 Pro Max, UDID
   `F9407C4A-6F42-4A4D-8562-B2F05EABBB07`), never a capture sim.

---

## THE RULINGS ALREADY TAKEN (restate these at every phase boundary)

| # | Ruling |
|---|---|
| 1 | Multi-effort is a real Maritimes fishing need, not only rule-satisfaction: dumping day (wait until midnight before hauling), and long trips where the boat stays out one to two weeks hauling continuously — **each haul window is its own effort**. |
| 2 | Gear spread across several grids is NOT a second effort — that is already handled by trap groups (S121). A second effort is for a **separate haul time window**. |
| 3 | The effort card is two-tiered: an effort header plus repeatable trap groups. **Species-at-risk detail blocks stay in Interactions & Other with their own per-block closes** — answering Yes on an effort opens the card below. Marine mammal is a Yes/No only. |
| 4 | **The marine-mammal detail fields are REMOVED from the 234 surface** (species / what happened / date & time / GPS). FINAL. |
| 5 | **The licence number gets a locked, visible line at the top of the Catch & Effort card**, above "Did you haul gear?", with a small edit control. Stored **per effort**. |
| 6 | **"Did you haul gear?" stays once, on effort 1 only.** Rule 1052 mechanism, unchanged. |
| 7 | **Efforts are ALWAYS EXPANDED.** Only trap groups collapse. |
| 8 | **A closed effort behaves exactly like a closed SAR block**: greys, keeps values readable, loses trash / licence-edit / close, shows "Closed &lt;date time&gt;". Only an open effort can be deleted; deleting slides the next up carrying its stamp and its trap groups. |
| 9 | **"Close & Save All Efforts" exists**, in the bait/bycatch/SAR shape: closes every open effort, writes no card stamp, hidden when nothing is open, confirms with a count. |
| 10 | **The haul timer gets a confirm guard.** Tap 1 = start, tap 2 = stop, tap 3 = "Start a new haul time? Yes / No" and No does nothing. The same confirm fires on start/stop after the card has been exited and reopened. |
| 11 | **On tap 3, Yes CREATES a new effort card and stamps its start time.** Quick Capture is the harvester's whole path to a second effort. |

**Settled by DFO, not by design — do not re-open:**
- EFFORT is `0..unbounded` (XSD :229); Rule 1050 forbids the app limiting the count.
- **EFFORT is one of the eight `DG_CLOSE_DT` sites (XSD :306) — each effort closes on its
  own.** `EFFORT_DETAIL` is NOT one and must never get a close control.
- Every effort must carry its own `START_DT`, `END_DT`, `LIC_NO`, `FMA_ID`, `SAR_IND`,
  `MM_INTER_IND`, `DG_CLOSE_DT`, one `TGT_SPECIES`, and ≥1 gear → ≥1 detail → ≥1 catch.
- `SAR` nodes are TRIP children, beside EFFORT. `MM_INTER` does not exist in this XSD.
- LAT/LONG belong to the **trap group**, not the effort.

---

## ⚠ NAMING HAZARD — READ BEFORE WRITING A LINE

`FullDfoForm.tsx` already uses the state name **`extraEfforts`** for the extra
**EFFORT_DETAIL** blocks (S121 multi-grid), stored under the data key
`extraEffortDetails`. Those are TRAP GROUPS, one level *below* EFFORT.

**Do not reuse or shadow that name.** The new EFFORT-level array needs its own unmistakable
names. Proposed: type `ExtraEffort`, state `extraEffortNodes`, data key
`extraEffortNodes`. If you find a better pair, say so before Phase 1 — but the two levels
must never share a word.

---

## PHASE 1 — STORAGE, HELPERS AND EMIT (no visible UI change) ⚠ EMIT CHANGE

### 1.1 Scope

- New type `ExtraEffort` in `dfoLogStorage.ts`, one record per effort 2..n: haul start
  date+time, haul end date+time, `fmaId`, `licNo`, `sarYes`, `mmYes`, `gearSubtypeId`,
  `note`, `closeDt`, and **its own list of trap groups** (`details: ExtraEffortDetail[]`).
  All fields optional strings; the array key written **only when a second effort exists**.
- **Effort 1 does not move.** It stays in the legacy flat keys plus its existing
  `extraEffortDetails`. Nothing stored is rewritten. This is the S121/S135 pattern, third
  use.
- One reader — `effortsFromData(d)` in `dfoLogStorage.ts` — returns a uniform list with
  effort 1 synthesized first from the flat keys, then the array. **Mirror
  `sarBlocksFromData` exactly**, and repoint the generator at it so there is ONE definition
  of "all efforts closed" shared by the send guard, the close-all and the UI.
- Closure helpers: `effortsAllClosed(d)`, `stampOpenEfforts(...)`, `effortsAnyOpen(...)` —
  single-sourced, same shape as the SAR quartet.
- Send guard: `usedDataGroupKeys` / `dataGroupInputsFromLog` / `unclosedUsedGroupKeys` gain
  the per-effort escape (`dgCloseEffort` counts as closed when every effort is closed).
- Emit (`dfoXmlGenerator.ts`): wrap lines 270–381 in a loop over `effortsFromData(d)`.
  Per effort: its own `START_DT`/`END_DT`, `FMA_ID`, `SAR_IND`, `MM_INTER_IND`,
  `DG_CLOSE_DT` (effort 1 → `d.dgCloseEffort`; efforts 2+ → their own `closeDt`),
  `LIC_NO` = the effort's own `licNo` **falling back to `captainProfile.fishingNumber`**,
  and its own trap groups.
- `findEffortOverlap` (:1101–1115): per-effort windows, a **within-log** overlap check, and
  licence-aware per Rule 33 ("under the same licence").

### 1.2 ⛔ STOP — the effort note and its fan-out — **RULED 2026-08-19**

Today `remarks.haul` is a single per-log note that the emit fans out to **three** places:
`EFFORT.REM`, `EFFORT_BY_GEAR.REM` and each `EFFORT_DETAIL.REM` (verified at :285, :294,
:356 on the untouched tree), and `remarks.catch` feeds `CATCH.REM` (:376) — and the card's
single note input writes the SAME text into both keys (FullDfoForm.tsx:2719), so one typed
sentence lands in four slots inside the effort.

**RULING (Jonathon): fan out like today.** Each effort's note is copied into the same four
slots effort 1's reaches — EFFORT.REM, EFFORT_BY_GEAR.REM, each EFFORT_DETAIL.REM, each
CATCH.REM, same text. One rule for every effort; reviewers see notes in the same places on
every effort; matches the S121/S135 blocks-mirror-block-1 pattern. (Honest case against,
noted at the STOP: the same sentence repeats four times per effort — noise DFO never asked
for.) Implemented: effort 1's text still comes from `log.remarks` (byte-identity), efforts
2+ carry one `note` field that the generator fans to the four slots.

**Naming (flagged before build, per the hazard box):** the type is `ExtraEffortNode` (not
the proposed bare `ExtraEffort`, which sat one suffix from the trap-group type
`ExtraEffortDetail`); state/data key `extraEffortNodes` as proposed. The word "Node"
consistently marks the EFFORT level.

### 1.3 REQUIRED byte-identity gate

Before the commit block is written:
- Take **at least two legacy single-effort fixtures** (one MAR-90 multi-grid, one other
  region), generate the XML on the untouched tree, generate again on the edited tree, and
  `cmp` them. **Both must be byte-identical.** Record the byte counts.
- The committed S121 `multiGrid.oneoff.test.ts` full-document baseline must still pass
  **unmodified**.
- Delete any temporary harness before staging and prove it with `git status --short`.

### 1.4 Gates

Predict, then measure: tsc (expect 33) · jest suites/tests · staged stat (⚠ add the new
test file's line count — an untracked file never appears in `git diff --stat`).

### 1.5 Verify table — FILLED 2026-08-19

| # | Item | Command / evidence | Result |
|---|---|---|---|
| 1 | `ExtraEffortNode` type added, effort 1 untouched | `dfoLogStorage.ts` — new interface after `ExtraEffortDetail`; effort 1 stays in the legacy flat keys; the array key `extraEffortNodes` is read additively (`'[]'` default) and nothing writes it in this phase | ✅ PASS — the new-suite test "an empty extraEffortNodes key changes nothing" proves a log with and without the key emits identical bytes |
| 2 | `effortsFromData` single reader, generator repointed | `dfoLogStorage.ts` (reader beside the SAR quartet, block-1 trap-group synthesis MOVED here from the generator); `dfoXmlGenerator.ts` imports it and loops `efforts.forEach` — the local `effortDetails` synthesis is gone; the send guard (`unclosedUsedGroupKeys`) and `stampOpenEfforts` read the same list | ✅ PASS |
| 3 | Per-effort `DG_CLOSE_DT` with effort-1 fallback | Emit reads `ef.closeDt` per effort; the reader synthesizes effort 1's `closeDt` from the legacy `d.dgCloseEffort`; no now() fallback (S125 P9 preserved) | ✅ PASS — new-suite test asserts effort 2's own `20260611160000` stamp beside effort 1's |
| 4 | `LIC_NO` per effort, profile fallback | Emit: `ef.licNo \|\| captainProfile.fishingNumber`; effort 1's `licNo` is never set (always the profile licence — legacy behavior) | ✅ PASS — test proves own-licence 1×/1× and fallback 2× |
| 5 | Overlap check per effort, within-log, licence-aware | `findEffortOverlap` rewritten: windows from `effortsFromData` per log (S90 companion-date fallback now honoured — pre-S136 it read only `dateFished`; pre-send check, no byte impact), within-log pair check returns the log's own id, licence compared with blank = profile licence | ✅ PASS — 4 tests: within-log flagged / non-overlap clean / different-licence ignored / legacy cross-log still caught |
| 6 | Byte identity — fixture A (MAR-90 two-grid, the S121 multiGrid shape) | temp harness → `cmp before/fixtureA_mar90.xml after/fixtureA_mar90.xml` | ✅ IDENTICAL — 2,287 bytes before, 2,287 after, `cmp` silent |
| 7 | Byte identity — fixture B (QC-88 single-grid with transfer/carrier) | `cmp before/fixtureB_qc88.xml after/fixtureB_qc88.xml` | ✅ IDENTICAL — 2,096 bytes before, 2,096 after, `cmp` silent |
| 8 | S121 baseline still green unmodified | `npx jest` full run; `git status` shows `multiGrid.oneoff.test.ts` untouched | ✅ PASS — all 42 pre-existing suites green with zero edits, incl. multiGrid's four full-document byte baselines |
| 9 | tsc predicted / measured | predicted 33 / `npx tsc --noEmit` | ✅ 33 (0 new; none in the two touched files) |
| 10 | jest predicted / measured | predicted 43 suites / 213 tests (42/198 + the new 15-test suite) | ✅ 43 suites / 213 tests, all passing |
| 11 | Harness deleted | `git status --short` | ✅ `tmpByteHarness.oneoff.test.ts` deleted before staging; tracked modifications = exactly `dfoLogStorage.ts` + `dfoXmlGenerator.ts`; the only new file is `multiEffortNode.oneoff.test.ts` |

**Also touched by design (record, not scope creep):**
- The trip-level SAR pool's emit gate is now "any effort answered SAR = Yes"
  (`efforts.some(e => e.sarYes === 'true')`) — identical for single-effort logs, correct once
  effort 2 can answer Yes on its own (the XML cannot attribute a SAR to an effort —
  RECON_S136 B4).
- A no-haul day (`effortYes === 'false'`) emits ZERO effort nodes even if a stale
  `extraEffortNodes` survived — ruling 6, test-pinned.
- `unclosedUsedGroupKeys` judges the effort key on the whole list: a set `dgCloseEffort` no
  longer satisfies the send guard while an effort 2+ is open (test-pinned; single-effort
  legacy logs behave identically).

**Staged stat (predicted):** `src/utils/dfoLogStorage.ts` + `src/utils/dfoXmlGenerator.ts`
= 2 files, 205 insertions / 73 deletions; plus the NEW untracked
`src/utils/__tests__/multiEffortNode.oneoff.test.ts` (218 lines — ⚠ absent from
`git diff --stat`, an untracked file never shows there).

### 1.6 Commit block — Jonathon runs it, one line at a time

```
git add src/utils/dfoLogStorage.ts
git add src/utils/dfoXmlGenerator.ts
git add src/utils/__tests__/multiEffortNode.oneoff.test.ts
git add docs/GATE_S136_MULTI_EFFORT.md
git diff --cached --stat
git commit -m "Emit one EFFORT node per fishing effort with per-effort licence, indicators, closure and trap groups"
git push
git log origin/main..HEAD --oneline
```

Expected: `git diff --cached --stat` shows 4 files (the 2 source files ~205+/73−, the new
218-line test, this gate doc); the last command prints **nothing** (everything pushed).

---

## PHASE 2 — REMOVE THE MARINE-MAMMAL DETAIL FIELDS (ruling 4)

### 2.1 Scope

- Remove the species / what happened / date & time / GPS fields from the marine-mammal card
  on the 234 surface. The **Yes/No toggle stays** and keeps feeding `MM_INTER_IND`.
- The seven `mm*` data keys stay **written and hydrated** so no stored log changes shape —
  they simply have no edit surface. (Same treatment the legacy `rem.sar` note got in S135.)
- ⚠ **Known consequence, accepted:** `InspectionModeScreen.tsx:68-73` reads those keys and
  will show blank. Jonathon has ruled this acceptable; Inspection Mode is a side project
  with nothing live, and its intended future fix is to read Form 222 instead. **Do not
  change Inspection Mode in this build. Report only.**
- Any i18n keys left orphaned by the removal: **report them, do not delete them** — orphan
  cleanup is its own queue item.

### 2.2 Gates and verify table — FILLED 2026-08-19

**What was removed (all in `FullDfoForm.tsx`, the only file touched):** the
`renderIncidentFields` call on the marine-mammal card (species picker / what happened /
date & time / GPS row); the `MARINE_MAMMAL_OPTIONS` species list (dead once the call went);
the `mmDropdownOpen` UI state; the `'mmTime'` picker plumbing (union member + the
`openPicker` and `applyPickerValueForField` cases — the S93 LOST_GEAR precedent); and
`handleMmYes`'s Yes-path date/time stamp + GPS capture (they served the removed fields —
a GPS permission ask would have fired for nothing).

**What stays, verified in place:** the Yes/No toggle and its **Rule 781 mandated prompt**
(`mmInterIndPrompt` — fence key, byte-untouched); the seven `mm*` data keys still written
by `buildLogData` and hydrated by `hydrateFromLog` (no stored log changes shape); the
No-path wipe of the detail state (today's toggle semantics, unchanged);
`renderIncidentFields` itself (the SAR block-1 call site still uses it).

| # | Item | Command / evidence | Result |
|---|---|---|---|
| 1 | Detail fields removed, toggle + Rule 781 prompt intact | grep: `handleMmYes` renders the alert only; the MM card renders header + toggle + nothing else | ✅ PASS |
| 2 | mm* keys still written + hydrated | `buildLogData` line `mmSpecies, mmSpeciesOther, mmWhat, mmLat, mmLng, mmDate, mmTime` untouched; hydrate block untouched | ✅ PASS — `git diff` shows neither site modified |
| 3 | Byte identity — one fixture | Phase-1's retained `after/fixtureA_mar90.xml` (generated at d09d012) vs a fresh generate on the edited tree; `cmp` | ✅ IDENTICAL — 2,287 bytes both sides, `cmp` silent (FullDfoForm is not in the emit path; proven anyway per the gate) |
| 4 | tsc predicted / measured | predicted 33 | ✅ 33 (0 new) |
| 5 | jest predicted / measured | predicted 43 suites / 213 tests (no suite touches the removed surface) | ✅ 43 / 213, all green, zero test edits |
| 6 | Harness deleted | `git status --short` | ✅ tmpByteHarness2 deleted; sole tracked modification = `FullDfoForm.tsx` |
| 7 | Staged stat | `git diff --stat` | ✅ 1 file, 13 insertions / 22 deletions (+ this gate doc when staged) |

**Known consequence, accepted (report only, per §2.1):** `InspectionModeScreen.tsx:67–73`
reads `mmSpecies` / `mmWhat` / `mmLat` / `mmLng` / `mmDate` / `mmTime` off the log and will
show blank for logs created after this phase. NOT changed in this build — Inspection Mode
is parked behind `{false && …}` with nothing live; its future fix is to read Form 222.

**Orphaned i18n keys (report only — orphan cleanup is its own queue item, nothing deleted):**
- `form234.mmSpeciesLabels` (the 9-entry EN + 9-entry FR map, S101b L2) — its only lookup
  was the string-options branch of `renderIncidentFields`, which is now unreachable (the
  SAR call site passes coded MV_SAR_LIST rows). The branch itself stays as typed, harmless
  code.
- Noticed in passing, **pre-existing** (not created by this phase): `form234.mmInterInd`
  (en/fr dfo.json :49) has zero code references — a duplicate of `mmInterIndLabel` that was
  already orphaned before S136.

### 2.3 Commit block — Jonathon runs it, one line at a time

```
git add src/components/FullDfoForm.tsx
git add docs/GATE_S136_MULTI_EFFORT.md
git diff --cached --stat
git commit -m "Remove the marine-mammal detail fields from the Form 234 surface, keeping the indicator toggle and its mandated prompt"
git push
git log origin/main..HEAD --oneline
```

Expected: `git diff --cached --stat` shows 2 files (FullDfoForm.tsx 13+/22−, this gate
doc); the last command prints **nothing**.

---

## PHASE 3 — THE EFFORT CARD RESHAPE (one effort only, no repetition yet)

### 3.1 Scope

- **Licence line** at the top of the card, under the header divider, above "Did you haul
  gear?" — displayed, not editable, with a small edit control (ruling 5). Pre-filled from
  the profile; once edited it is stored on that effort.
- **The two Yes/No toggles move onto the effort** — "Species at risk?" and "Marine mammal?"
  (ruling 3). Answering Yes on species at risk opens the existing card in Interactions &
  Other; the SAR detail blocks and their per-block closes are **untouched**.
- **The standalone GPS Coordinates card is removed**; latitude/longitude and Capture GPS
  move into each trap group, where the extra blocks already have them.
- Effort 1 renders as a **titled block**, always expanded (ruling 7), with its trap groups
  beneath it and its own Close & Save.
- Asterisks per region unchanged — the same set the card carries today, applied per effort.

### 3.2 ⛔ STOP — the wording set

One ruling at a time, EN and FR, curly apostrophes, no space before `?` `!` `:` `;`:
- the effort block title ("Fishing Effort {{n}}" / « … »)
- "+ Add fishing effort"
- "Close & Save All Efforts" — and whether the French keeps « tous » (bait-style) or drops
  it (bycatch-style)
- the per-effort close confirm title and body
- the close-all confirm bodies (`_one` / `_other`)
- the licence edit control's label and any confirm it needs

### 3.3 Walk, gates, verify table, commit block

Walk on the sandbox sim in **EN and FR** before the commit block is handed over.

---

## PHASE 4 — REPETITION (add · delete · close · close-all)

### 4.1 Scope

- "+ Add fishing effort" appends a new titled block, always expanded.
- Per-effort **Close & Save** (ruling 8): stamps that effort only, persists immediately,
  greys the block, removes trash / licence-edit / close, shows "Closed &lt;date time&gt;".
- **Delete slides up** (ruling 8): only open efforts have a trash; deleting slides the next
  effort into the vacated slot carrying its stamp, its note and its trap groups. Effort 1
  being deleted promotes effort 2 into the legacy flat keys — **prove by construction that
  the bytes it would transmit are unchanged**, the S135 slide-up argument.
- **"Close & Save All Efforts"** (ruling 9), bait shape, hidden when nothing is open.
- Save gate applied **per effort**, with errors labelled "Fishing Effort N — field".
- Form-level "Close & Save All" stamps each open effort, never a card-level key.

### 4.2 ⛔ STOP — the "Did you haul gear?" refusal

With repeatable, closeable efforts, answering **No** would wipe closed efforts — the exact
hole the bycatch and SAR toggles needed a guard for (S134/S135). Put the refusal to
Jonathon: **refuse the No toggle with an alert whenever any effort is closed**, in the
`sarClosedNoToggle` shape, both languages. Recommendation plus the honest case against; do
not build until he rules. **Do not ship a phase that leaves the wipe reachable.**

### 4.3 Walk, gates, verify table, commit block

Two efforts, one closed and one open, walked in EN and FR: close-all visible then gone;
delete-slides-up with the stamp intact; the closed block's controls all absent.

---

## PHASE 5 — QUICK CAPTURE (rulings 10 and 11)

### 5.1 Scope

- Tap 1 stamps the haul start; tap 2 stamps the haul stop.
- Tap 3 in the same log raises **"Start a new haul time? Yes / No"**. **No does nothing at
  all** — no state change of any kind.
- **Yes creates a new effort card and stamps its start time** (ruling 11).
- The same confirm fires on start and stop after the card has been exited and reopened.
- ⚠ **This also fixes a shipped defect Jonathon found by testing**: the button sits at the
  top of the screen, is easy to hit by accident, and today an accidental tap silently
  restarts the haul time. Say so in the commit subject without overclaiming.

### 5.2 ⛔ STOP — the confirm wording, EN and FR.

### 5.3 Walk, gates, verify table, commit block

---

## CLOSE-OUT — what this build owes when the code is done

Report only, each to a named file:
- the §22 User's Guide edit list for both languages (the Catch & Effort section, the no-haul
  section, the GPS-card note, the timestamp glossary)
- the figure re-shoot list additions
- the Appendix B and TRG rows that describe single-effort behaviour
- ⚠ **the §10 requalification note: Phase 1 is an EMIT CHANGE — the emitted XML now carries
  repeated `<EFFORT>` nodes. That is the fourth emit change riding on unbuilt 1.10.0.
  Re-examine the version ruling before the next build.**
