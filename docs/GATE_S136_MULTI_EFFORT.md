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

### 3.2 ⛔ STOP — the wording set — **RULED 2026-08-19, one at a time**

⚠ A collision the scope missed, surfaced before ruling 1: the TRAP-GROUP strings already
used the effort words — `catchEffortBlock` was "Catch Effort {{n}}" / « Effort de pêche
{{n}} » and `addCatchEffort` was « Ajouter un effort de pêche ». Ruling 1's title would have
put two different levels under one French name, so a retitle ruling was added.

| # | Item | RULING (EN / FR) |
|---|---|---|
| 1 | Effort block title | **"Fishing Effort {{n}}" / « Effort de pêche {{n}} »** (DFO's own term; forces ruling 2) |
| 2 | Trap-group retitle (new, forced by 1) | **"Trap Group {{n}}" / « Groupe de casiers {{n}} »**, add button **"Add trap group" / « Ajouter un groupe de casiers »** — DFO's own name for the level (Instructions: "group of traps"). Value-only change on the existing keys `catchEffortBlock` / `addCatchEffort`, no renames. ⚠ Re-opens the figure frames that show "Catch Effort 2" blocks, both languages |
| 3 | Add-effort button (renders Phase 4) | **"Add fishing effort" / « Ajouter un effort de pêche »** — the French moves UP a level to where DFO means it |
| 4 | Close-all button (renders Phase 4) | **"Close & Save All Efforts" / « Fermer et enregistrer tous les efforts de pêche »** — keeps « tous », the bait/SAR style |
| 5 | Per-effort close confirm | title **"Close this fishing effort?" / « Fermer cet effort de pêche? »**; body **"Once you close this fishing effort you can't change it in this log. Check it over first." / « Après la fermeture, vous ne pourrez plus modifier cet effort dans ce journal. Vérifiez-le d’abord. »** (the S135 SAR-block shape) |
| 6 | Close-all confirm bodies (render Phase 4) | `_one` **"This will lock {{count}} fishing effort. Once closed you can't change it in this log." / « Ceci verrouillera {{count}} effort de pêche. Une fois fermé, vous ne pourrez plus le modifier dans ce journal. »**; `_other` **"…{{count}} fishing efforts…change them…" / « …{{count}} efforts de pêche. Une fois fermés, vous ne pourrez plus les modifier… »** — masculine agreement (« effort »), unlike the feminine bait/SAR bodies (« entrée ») |
| 7 | Licence line + edit control | line **"Licence {{no}}" / « Permis {{no}} »**, control **"Edit" / « Modifier »**, **no confirm** — the effort's Close & Save is the freeze; the control hides once closed (ruling 8) |

Rulings 3, 4 and 6 are worded now but their keys are ADDED IN PHASE 4 when they first
render (adding them now would create temporary orphans). The two per-effort Y/N toggle
labels needed no ruling — they are the Rule 603 / Rule 780 mandated texts, reused verbatim.

### 3.3 Walk, gates, verify table, commit block

**Built (Phase 3, one effort only — no repetition yet):**
- **Licence line** (ruling 5/7): top of the Catch & Effort card, under the header, above
  "Did you haul gear?" — shows the per-effort override (`d.licNo`, new flat key) or the
  profile licence; small Modifier/Edit control swaps it for a text input (blur saves); the
  control hides when the effort is closed. The reader (`effortsFromData`) now carries
  effort 1's `licNo` from `d.licNo` (absent on every pre-S136 log → profile licence →
  byte-identical), and the edit-load path now loads the profile (it never had to before) so
  the fallback displays. `licNo` joins `hasEffortData`/`wipeEffort` (it is effort data) and
  is written additively — an untouched legacy log keeps its exact stored shape.
- **Effort 1 as a titled block** (rulings 3/7): "Fishing Effort 1", always expanded, inside
  the Catch & Effort card; trap groups beneath it; its own Close & Save using the ruled
  per-effort confirm (`closeEffortNode` — mirrors `closeSection`'s persistence exactly,
  same `dgCloseEffort` stamp).
- **The two Y/N questions moved onto the effort** (ruling 3): SAR + MM toggles render after
  the haul times inside the effort block (labels = the mandated Rule 603/780 texts,
  handlers unchanged — the S135 closed-block refusal still lives in `handleSarYes`). In
  Interactions & Other: the marine-mammal sub-card is gone entirely; the species-at-risk
  card (detail blocks, per-block closes — untouched) now opens when an effort answers Yes.
- **The standalone GPS Coordinates card is removed**: trap group 1's LAT/LONG + Capture GPS
  moved inside the effort block with the group's other fields, same visibility as the old
  card (`isVisible('gpsCoords')` — 88/89/90 visible, 91 hidden; the S110 R2 parked
  non-38b-MAR state preserved), same `dgCloseEffort` freeze (the block body carries it).
- **Trap-group retitle** (ruling 2): value-only on `catchEffortBlock`/`addCatchEffort`.
- Asterisks: untouched — the same per-region set, now inside the block.

**Verify table:**

| # | Item | Command / evidence | Result |
|---|---|---|---|
| 1 | Licence line + override end-to-end | new `d.licNo` → reader → emit; new test "effort 1's d.licNo override transmits" (own 1× / profile 0×) | ✅ PASS |
| 2 | Toggles moved, fence labels reused | grep: `sarIndLabel`/`mmInterIndLabel` render once each, inside the effort block; no new label strings | ✅ PASS |
| 3 | GPS card removed, fields relocated | `gpsCoordinatesSection` render gone; capture button + lat/long inside the block, `isVisible('gpsCoords')` gate preserved | ✅ PASS |
| 4 | SAR card opens on Yes, blocks untouched | Interactions & Other: `{effortYes && sarYes === true && …}`; `renderSarBlockChrome` and all S135 close machinery un-edited | ✅ PASS |
| 5 | Byte identity — fixture A | `cmp` of the retained 21e3353 bytes vs a fresh generate | ✅ IDENTICAL — 2,287 bytes both sides (the only emit-path change is `d.licNo`, absent on the fixture) |
| 6 | tsc predicted / measured | predicted 33 | ✅ 33 (0 new) |
| 7 | jest predicted / measured | predicted 43 / 214 (one new licence-override test) | ✅ 43 suites / 214 tests |
| 8 | i18n key-set symmetry | python set-diff over form234 | ✅ EN 232 / FR 232, diff = ∅ (5 new keys each + 2 value-only changes; FR curly apostrophes, no space before ?) |
| 9 | Harness deleted | `git status --short` | ✅ tmpByteHarness3 deleted; tracked modifications = the 5 intended files |

**Orphan report (report only):** `form234.gpsCoordinatesSection` (EN+FR) lost its render
with the standalone card — joins `mmSpeciesLabels` and `mmInterInd` on the orphan-cleanup
queue. Nothing deleted.

**⛔ WALK — Jonathon runs this on the SANDBOX sim (iPhone 17 Pro Max, F9407C4A…), EN and
FR, BEFORE running the commit block:**
1. New log → Catch & Effort: licence line reads "Licence 300123"/« Permis 300123 » (your
   profile licence) above "Did you haul gear?"; Edit/« Modifier » swaps it for an input;
   type a different number, tap away — the line shows the new number.
2. "Fishing Effort 1"/« Effort de pêche 1 » titled block, always expanded; trap-group
   blocks inside it now say "Trap Group 2"/« Groupe de casiers 2 » and the add button
   "Add trap group"/« Ajouter un groupe de casiers ».
3. GPS: no standalone card below the bait card; Capture GPS + lat/long sit inside the
   effort block after the gear fields (MAR: still visible off-38b, unchanged behavior).
4. The SAR and MM questions render inside the effort block after the two haul times, exact
   mandated wording; MM has no sub-card in Interactions & Other any more; answering SAR Yes
   opens the Species at Risk card down in Interactions & Other with its blocks intact.
5. Close & Save the effort → the NEW confirm ("Close this fishing effort?"/« Fermer cet
   effort de pêche? ») → block greys, licence Edit control gone, capture button gone.
6. Regression: bait rows, bycatch, personal use, transfers (QC log), landing close — all
   unchanged.

### 3.4 WALK ROUND 1 — four fixes found (2026-08-19), ALL BUILT before the commit

| # | Finding | Fix built |
|---|---|---|
| 1 | Licence Edit opened a bare input — no Done, no confirm | A short confirm now guards the unlock (**"Change the licence for this fishing effort?" / « Modifier le permis de cet effort de pêche? »**, body **"This effort will transmit the licence number you enter here." / « Cet effort transmettra le numéro de permis saisi ici. »**, Cancel/`nav.cancel` + Edit/« Modifier »), and the input gained a **Done/« Terminé »** control (reuses `nav.done`; blur still ends the edit too). New keys `effortLicenceEditConfirmTitle`/`Body` — FR flagged for the proofreader pile |
| 2 | Trap Group 1 rendered as loose inline fields | Group 1 now renders EXACTLY like groups 2+ (the S135 block-1 pattern): titled "Trap Group 1"/« Groupe de casiers 1 », framed, same trash + collapse controls, collapsed one-line summary (shared `extraSummary` over the flat state via `block1Detail()`), loads collapsed like the extras, collapses when a new group is added. **Delete slides group 2 up** into the legacy flat keys (`removeTrapGroup` — mirrors `removeSarBlock`; the reader's list is identical minus the deleted group, so the remaining groups' bytes are unchanged by construction); with no group 2 the delete wipes the fields. Two structural consequences, both deliberate: the **gear-subtype picker (NL) moved up** beside the LFA picker — it is EFFORT_BY_GEAR-level, not a trap-group field — and the **shared QC grid Modal was hoisted out of the frame** (it serves every group's grid button via `gridPickerTarget`; a collapsed group 1 must not unmount it) |
| 3 | Nesting didn't read | New `trapGroupBlock` style — groups sit a shade darker (`#EEF2F6`, border `#CBD5E1`) than the effort block (`#F8FAFC`) and the white cards. Trap groups only; the effort block keeps `effortBlock` |
| 4 | Effort close button said "Close & Save Section" | Now the bait/SAR twin **"Close & Save" / « Fermer et enregistrer »** via a new `buttonLabelKey` param on `renderCloseControl` defaulting to the old label. New key `closeEffortButton`. **Verified no other card's label moved:** `closeSectionButton` appears exactly once in the file — as the default parameter — and the other five call sites (Landing, Transfers, Personal Use, HLIN, HLOUT) pass nothing |

**Fix-round gates:** tsc **33** (0 new) · jest **43 / 214** unchanged · byte identity
re-proven (fixture A: 2,287 → 2,287, `cmp` silent) · harness deleted · i18n key-sets
symmetric **235/235** · staged source stat now 5 files, 411+/181−.

**⛔ RE-WALK — sandbox sim, EN and FR, before the commit block:**
1. Licence Edit → confirm alert fires; Cancel leaves the line untouched; Edit opens the
   input; Done (and blur) both end the edit and the line shows the typed number.
2. Trap Group 1: titled, framed, darker grey than the card, chevron collapses it to the
   one-line summary; groups 2+ look identical; QC log — open the grid picker from group 2
   while group 1 is COLLAPSED (the hoisted Modal must still open).
3. Delete group 1 with a group 2 present → group 2's values slide up into the (now sole)
   group 1; delete with one group → fields wipe.
4. NL log: Gear Subtype now sits beside the LFA picker, above the trap groups.
5. The effort's close button reads "Close & Save"/« Fermer et enregistrer »; Landing still
   reads "Close & Save Section"/« Fermer et enregistrer la section ».
6. Round-1 checks that already passed stay green (licence line, toggles on the effort, no
   standalone GPS card, SAR card opens on Yes, close confirm wording).

### 3.5 Commit block — Jonathon runs it AFTER the re-walk passes, one line at a time

```
git add src/components/FullDfoForm.tsx
git add src/i18n/locales/en/dfo.json
git add src/i18n/locales/fr/dfo.json
git add src/utils/dfoLogStorage.ts
git add src/utils/__tests__/multiEffortNode.oneoff.test.ts
git add docs/GATE_S136_MULTI_EFFORT.md
git diff --cached --stat
git commit -m "Reshape the Catch & Effort card as a titled fishing-effort block with a per-effort licence line, framed trap groups and the interaction questions"
git push
git log origin/main..HEAD --oneline
```

Expected: `git diff --cached --stat` shows 6 files (the five source files at 411+/181−,
plus this gate doc); the last command prints **nothing**.

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

### 4.2 ⛔ STOP — the "Did you haul gear?" refusal — **RULED 2026-08-19: REFUSE.**

Answering No while ANY effort carries a close stamp is refused with an alert, the
S134/S135 shape — EN **"Fishing efforts that are already closed can't be removed, so this
can't be switched to No."** / FR **« Les efforts de pêche déjà fermés ne peuvent pas être
retirés, donc ce choix ne peut pas passer à Non. »** (`effortClosedNoToggle`). Nothing
changes on refusal; with only open efforts the confirm-then-wipe behaves as before (the
wipe now clears efforts 2+ too). Honest case against, noted at the STOP: a harvester who
closed an effort by mistake on a true no-haul day is stuck — but that is §5.2.1
irreversibility itself, the same everywhere in the app.

**Phase 3 REGION WALK: PASSED** (founder, 2026-08-19) — EN and FR, across MAR, QC and NL,
before this phase built. Recorded per the Phase 4 hand-off.

### 4.3 What Phase 4 built

**Scope §4.1 plus one founder-added item:** each effort owns its note and the Catch &
Effort card-header note is GONE — a shared note that stays editable while another effort
is closed is the S128 hole again. Effort 1's note button moved onto ITS block header
(same `remarks.catch/haul` storage, same `NOTE_CLOSE_KEYS` lock — `renderNoteButton`
already hides itself once `dgCloseEffort` stamps); efforts 2+ carry `note` on their record
(emits Phase 1's four-slot fan-out; freezes with their own `closeDt`).

- **"+ Add fishing effort"** appends a new always-expanded titled block seeded with one
  open trap group (the XSD demands ≥1 EFFORT_DETAIL — the empty group is the form to fill).
- **Efforts 2+ are complete blocks**: licence line (own confirm-guarded Edit + Done, own
  `licNo`), own note, own LFA picker (changing it clears that effort's grid/section picks,
  the effort-1 pattern), gear subtype (NL), **their own trap groups** (`details[]` —
  titled/framed/collapsible, add/delete per group; delete keeps ≥1 group by wiping the
  last; the shared QC grid Modal gained a node target so any effort's group can drive it),
  own haul-window pickers (`extraEffortStart`/`extraEffortEnd` PickerFields, dateFished
  fallback matching the emit), and the two mandated Y/N questions.
- **Per-effort Close & Save** (ruling 8): the ruled confirm, stamps that effort's own
  `closeDt`, persists immediately (the closeBaitRow shape); closed block greys, keeps
  values readable, loses trash / licence-edit / note-edit / close, shows "Closed ‹date›".
- **Delete slides up** (ruling 8): trash on OPEN efforts only. Deleting effort 1 promotes
  effort 2 into the legacy flat keys carrying its stamp (an unstamped promotion CLEARS the
  flat stamp), its note (into remarks catch+haul, as the UI writes them) and its trap
  groups (group 1 → the flat block, groups 2+ → `extraEffortDetails`). **Bytes unchanged by
  construction**: the reader's uniform list is identical minus the deleted effort, so
  every surviving effort emits exactly what it did — the S135 slide-up argument one level
  up. Deleting the only effort wipes it (the toggle-No end state without flipping).
- **"Close & Save All Efforts"** (ruling 9, bait shape): hidden when nothing open,
  count-confirmed (`closeEffortAllConfirmBody_one/_other`, the ruled §3.2 wording), stamps
  via the single-sourced `stampOpenEfforts` (skip-never-restamp), persists immediately.
- **Form-level "Close & Save All"**: the effort member now stamps EACH open effort —
  effort 1 via its own `dgCloseEffort` (never restamped), efforts 2+ via their own
  `closeDt` — through the same `stampOpenEfforts`; `openUsedGroups` keeps the effort key
  open while ANY effort lacks its stamp, mirroring the send guard.
- **Save gate per effort**: every extra effort checked like effort 1 (own FMA gating its
  region fields), errors labelled **"Fishing Effort N — field"** (trap-group lines read
  "Fishing Effort N — Trap Group M — field"); the indicator gate now demands both Y/N
  answers on EVERY effort.
- **SAR pool plumbing** (trip-level, per-effort indicators): the SAR card in Interactions &
  Other opens when ANY effort answers Yes; the send guard counts the pool as used when any
  effort answers Yes (`dataGroupInputsFromLog` — test-pinned); flipping the LAST remaining
  Yes to No is refused while any SAR block is closed (both on effort 1's toggle and on
  extras'), while a No with another effort still Yes flips freely and the pool stands.
  Extras' Yes fires the same mandated Rule 781/604 prompts.

### 4.3b EXTRACTION ROUND (ruled 2026-08-19, before the walk) + the LFA pre-fill

**Why:** the pin audit found the three refusal conditions living as component closures —
untested and not single-sourced, breaking the S135 pattern (`sarBlocksAnyClosed` lived in
dfoLogStorage and got its own suite). Ruled: extract now.

1. **Three predicates moved into `dfoLogStorage`, the component only calls them:**
   - `effortsAnyClosed(d)` — the §4.2 "Did you haul gear?" refusal condition (any effort
     carries a stamp; effort 1's = the flat `dgCloseEffort`, via the ONE reader). Noted in
     code: anyClosed is NOT `!effortsAnyOpen` — one closed + one open effort is both.
   - `sarYesOnAnotherEffort(d, exceptIdx)` — another effort still answers SAR = Yes, so
     this effort's flag flips freely and the trip-level pool stands.
   - `sarNoToggleRefused(d, exceptIdx)` — the SAR flip-to-No refusal: last remaining Yes
     AND any SAR block closed (own stamp or legacy card stamp).
   The component gained `liveEffortData()` (the liveSarData shape plus effort 1's flags and
   the extra nodes) and thin adapters; the inline any-open checks (close-all visibility,
   the close-all count) now go through `effortsAnyOpen` / the reader instead of second
   definitions; the now-unused component `sarAnyBlockClosed` adapter was removed.
   ⚠ **One corner-case delta, deliberate and recorded:** the old component predicate gated
   "any SAR block closed" on *effort 1's* `sarYes === true`. In the state ‹effort 1 = No,
   effort 2 = Yes, a SAR block closed›, effort 2's flip-to-No was therefore NOT refused —
   the closed block would silently leave the emit (exactly the S128 hole the refusal
   exists for). The single-sourced `sarNoToggleRefused` reads `sarBlocksAnyClosed(d)`
   directly and closes that corner. Test-pinned.
2. **New suite `effortToggleRefusal.oneoff.test.ts`** (115 lines, 7 tests — the
   sarToggleRefusal shape): every closed shape refuses the No toggle; all-open allows it;
   anyClosed ≠ !anyOpen pinned; sarYesOnAnotherEffort from both sides incl.
   never-counts-itself; the last-remaining-Yes refusal (own stamp AND legacy card stamp);
   the other-effort-Yes free flip; the alert strings byte-pinned in BOTH languages.
3. **The stale-stamp clear branch STAYS** (`removeEffortNode(0)`'s
   `delete next['dgCloseEffort']` when the promoted effort is unstamped): **defensive,
   unpinned, and probably unreachable** — effort 1's trash is hidden once the flat stamp
   exists (`!isClosed('dgCloseEffort')`), so at delete time the flat stamp should already
   be absent and the delete is a no-op on a missing key. Kept by ruling as a guard against
   any future path that deletes an effort programmatically.
4. **Founder-added in the same round:** a newly added effort's **LFA arrives pre-filled
   from the previous effort's LFA** — copied at ADD TIME only (`addEffortNode` seeds from
   the last effort in the list, else effort 1's), visible and freely changeable through the
   ordinary picker, no lock, no confirm, and NOT a live link (changing effort 1's LFA later
   touches nothing). Grid/section picks are not copied; the picker's change-reset behaves
   exactly as today. Walk-only (component handler), same precedent as the new-log LFA
   pre-fill.

**Extraction-round gates, re-run in full:** tsc **33** (0 new) · jest **44 suites / 222
tests** (the new 7-test suite) · byte identity re-proven (fixture A: 2,287 → 2,287 bytes,
`cmp` silent; harness deleted) · i18n key-sets symmetric **240/240** (no key change this
round) · staged source stat now **5 modified files, 839+/22−, plus the NEW untracked
115-line suite** (⚠ absent from `git diff --stat`).

### 4.4 Gates and verify table

*(Table updated after the §4.3b extraction round — the measured values below supersede the
pre-extraction numbers this section first carried.)*

| # | Item | Command / evidence | Result |
|---|---|---|---|
| 1 | §4.2 refusal built | `handleEffortToggle`: `effortAnyClosed()` → alert, return; wording keys EN+FR added | ✅ PASS — wipe unreachable while anything is closed |
| 2 | Card-header note gone, per-effort notes in | grep: `renderNoteButton('catch')` renders once, on effort 1's block header; extras use `effortNoteOpen` + `e.note` | ✅ PASS |
| 3 | Slide-up delete carries stamp/note/groups | `removeEffortNode(0)` promotes closeDt→`closes.dgCloseEffort` (or clears it — the defensive branch, §4.3b item 3), note→remarks, details→flat+extras | ✅ PASS — by-construction byte argument recorded above; walked (step 3) |
| 4 | Close & Save All Efforts + form-level member | both route through `stampOpenEfforts`; button hidden when nothing open (via `effortsAnyOpen`) | ✅ PASS |
| 5 | `effortsAnyClosed` extracted + pinned | dfoLogStorage export; effortToggleRefusal tests: effort-1 stamp, extra-effort stamp, all-open, anyClosed ≠ !anyOpen | ✅ PASS |
| 6 | `sarYesOnAnotherEffort` extracted + pinned | dfoLogStorage export; tests from both sides, never counts itself | ✅ PASS |
| 7 | `sarNoToggleRefused` extracted + pinned | dfoLogStorage export; tests: last-Yes + own stamp, last-Yes + legacy card stamp, other-effort-Yes free flip, all-open free flip | ✅ PASS |
| 8 | Corner-case hole closed by the extraction | old predicate gated on effort 1's sarYes — ‹effort 1 No, effort 2 Yes, closed block› left the wipe reachable; `sarNoToggleRefused` refuses it | ✅ PASS — test-pinned ("flipping the LAST remaining SAR Yes to No is refused…", effort-2 case) |
| 9 | effortToggleRefusal suite | new `src/utils/__tests__/effortToggleRefusal.oneoff.test.ts`, 115 lines / 7 tests, the sarToggleRefusal shape incl. both languages' alert strings byte-pinned | ✅ PASS |
| 10 | LFA pre-fill on add (founder item 5) | `addEffortNode` seeds `fmaId` from the last effort (else effort 1) at add time only; no live link, no lock, no confirm | ✅ BUILT — walk-only (component handler), walked (step 8) |
| 11 | Byte identity — fixture A | `cmp` retained bytes vs fresh generate on the extracted tree | ✅ IDENTICAL — 2,287 bytes both sides (no emit change in this phase) |
| 12 | tsc predicted / measured | predicted 33 | ✅ 33 (0 new; the one grep hit near dfoLogStorage is the pre-existing baseline LobsterLogProposalForm error) |
| 13 | jest predicted / measured | predicted 44 / 222 (the send-guard SAR test + the 7-test refusal suite) | ✅ **44 suites / 222 tests** |
| 14 | i18n key-set symmetry | python set-diff over form234 | ✅ EN 240 / FR 240, diff = ∅ (5 new keys each; FR curly apostrophes, no space before ?) |
| 15 | Harness deleted | `git status --short` | ✅ tmpByteHarness5 + tmpByteHarness6 deleted; tracked modifications = the 5 intended source files + this gate doc; the only new file is the refusal suite |

Staged source stat: **5 modified files, 839 insertions / 22 deletions** (FullDfoForm
carries nearly all of it — the extra-effort renderer family), **plus the NEW untracked
115-line effortToggleRefusal suite** (⚠ absent from `git diff --stat`) — **7 files staged**
with this gate doc.

**Report only (founder question, 2026-08-19): deleting a fishing effort raises NO confirm.**
Both trash buttons call `removeEffortNode` directly (effort 1's header at
FullDfoForm.tsx:3617, extras' at :1899) — no Alert wraps either call site. This is the
existing house pattern, not an omission: SAR-block delete (`removeSarBlock`, S135) and
trap-group delete (`removeExtraEffort`, S121) are also confirm-free; only closes and the
toggle-No wipe confirm. Deliberately NOT changed in this round.

**WALK — PASSED (founder, 2026-08-19, EN and FR, sandbox sim): all nine stops below,
including the extraction-round steps 8–9.** The §4.3 script plus:
1. Two efforts, one closed one open: close-all button visible; close the open one → button
   gone; the closed block's trash / licence-edit / note button / close all absent, values
   readable, "Closed ‹date time›" shown.
2. "Did you haul gear?" → No while an effort is closed → the refusal alert, nothing
   changes; with only open efforts → the existing confirm, and Yes-after-wipe shows one
   empty effort.
3. Delete effort 1 while effort 2 is CLOSED → effort 2 slides up as "Fishing Effort 1"
   with its stamp, note and trap groups intact (and stays frozen).
4. Effort 2 end-to-end on ONE region (MAR): licence edit confirm + Done; own LFA; two trap
   groups (add/collapse/delete keeps ≥1); QC log — open effort 2's grid picker (the shared
   Modal must serve it); own haul times via the pickers; both Y/N questions (Yes fires the
   prompts; SAR Yes opens the SAR card below; flipping the last Yes to No with a closed
   SAR block → refusal).
5. Save gate: leave effort 2's trap hauls empty → the alert names "Fishing Effort 2 —
   Trap Hauls"; answer neither indicator on effort 2 → the indicators alert.
6. Complete-save "Close & Save All" with effort 2 open → its count includes the effort
   group and effort 2 comes back closed after save.
7. Note: effort 1's note button sits on its block header (card header has none); a note
   typed on effort 2, effort 2 closed → note visible read-only.
8. (Extraction round) Add a fishing effort → its LFA arrives pre-filled from the previous
   effort's, freely changeable, no confirm; change effort 1's LFA afterwards → effort 2's
   is untouched; changing effort 2's own LFA still clears ITS grid picks only.
9. (Extraction round) The refusal behaviors themselves are unchanged on screen — same
   alerts, same conditions (now storage-backed): re-tap the §4.4 steps 2 and 4 refusals.

### 4.5 Commit block — the walk has PASSED (EN + FR, 2026-08-19); Jonathon runs it one line at a time

```
git add src/components/FullDfoForm.tsx
git add src/i18n/locales/en/dfo.json
git add src/i18n/locales/fr/dfo.json
git add src/utils/dfoLogStorage.ts
git add src/utils/__tests__/multiEffortNode.oneoff.test.ts
git add src/utils/__tests__/effortToggleRefusal.oneoff.test.ts
git add docs/GATE_S136_MULTI_EFFORT.md
git diff --cached --stat
git commit -m "Make fishing efforts repeatable with per-effort notes, closes, slide-up delete, a close-all and single-sourced toggle refusals, and refuse the no-haul toggle while any effort is closed"
git push
git log origin/main..HEAD --oneline
```

Expected: `git diff --cached --stat` shows 7 files (the five modified source files at
839+/22−, the new 115-line effortToggleRefusal suite, plus this gate doc); the last
command prints **nothing**.

---

### 4.6 UI ROUND (built after Phase 4, tip cfd8740 — six founder items, three ruled at STOPs)

**Item 1 — THE MAR GPS GATE (ruled; ⚠ CONFORMANCE FIX).** Trap group 1 left
`isVisible('gpsCoords')` and joined groups 2+ on the single-sourced entry gate — a new
`effortCoordsEntryAllowed(subformId, fmaId)` in **dfoConstants** (88 ‖ 89 ‖ (90 ∧ 38b)),
now used in ALL FOUR places: group 1, effort 1's groups 2+, the extra efforts' groups, AND
the generator's emit gate (`emitEffortCoords` repointed — identical logic, byte-proven).
Result: a MAR harvester sees Capture GPS / LATITUDE / LONGITUDE only on 38b, and then on
every trap group; nowhere else in MAR. QC-88 / GLF-89 unchanged (Mandatory, rows 82/83);
NL-91 unchanged (Blocked). **Authority: Rule 3059** (FS-NAT-234-12-FR.txt :1108–1130,
quoted verbatim in this session's recon exchange): « la saisie … doivent être bloquées » —
the ENTRY itself is blocked outside 38b. This closes the S110 R2 over-collection AND a
real MAR non-38b entry breach that had shipped since the standalone GPS card.
⚠ **For the §10 requalification list:** conformance fix on the 234 entry surface (no emit
change — the generator already gated MAR coords to 38b). ⚠ **For the figure re-shoot
list:** any MAR non-38b frame showing the GPS fields no longer matches. Stored non-38b MAR
coords on old drafts stay untouched (hydrate + write back verbatim, never rendered or
emitted — the NL precedent).

**Item 2 — HAUL TIMES MOVED UP (ruled).** TIME STARTED/STOPPED HAULING now sit directly
under the LFA picker, above the trap groups — on effort 1 and on every extra effort.

**Item 3 — ⛔ RULED: the two Y/N interaction questions STAY AT THE BOTTOM** of each
effort, after the trap groups, just above Close & Save — a closing attestation, nearest
the SAR card a Yes opens below. (Case against, noted at the STOP: effort-level fields now
sandwich the trap groups.)

**Item 4 — DELETE CONFIRM ON EFFORTS (ruled).** Both trash sites route through a new
`confirmRemoveEffortNode` before anything is removed. Trap groups, bait rows, bycatch rows
and SAR blocks keep their confirm-free deletes — untouched.

**Item 5 — ⛔ RULED wording** (`deleteEffortConfirmTitle`/`Body`, buttons reuse
nav.cancel/nav.delete): EN **"Delete this fishing effort?" / "This will remove the effort
and everything in it — its trap groups, haul times, answers and note. You can't undo
this."** · FR **« Supprimer cet effort de pêche? » / « L’effort et tout ce qu’il contient —
ses groupes de casiers, ses heures de levée, ses réponses et sa note — sera supprimé. Vous
ne pourrez pas annuler. »**

**Item 6b — the NOTE placeholder names the effort (founder string fix, pre-commit).** The
effort NOTE fields were showing the shared `notePlaceholder` ("Optional note for this
section" / « Note facultative pour cette section ») — wrong name for the concept. Checked
first: **the key IS shared** — its other consumers are the generic per-card note inputs
(Trip, Landing, Transfers, Personal Use, HLIN, HLOUT — FullDfoForm :3466/:3531/:4358/
:4416/:4431/:4449), the SAR block notes (renderSarBlockChrome :2438), and the Form 233
Reporting Period note (Form233Screen :195, the S112 key-reuse ruling). So the shared key
was NOT edited: a new `effortNotePlaceholder` (**"Optional note for this fishing effort" /
« Note facultative pour cet effort de pêche »**) was added and ONLY the two effort NOTE
fields point at it. Every other card keeps its exact wording.

**Item 6 — ⛔ RULED (clarified on the bycatch-sheet screenshot): the header de-crowds by
moving the note DOWN, not the trash.** The "Add a note" affordance is gone from every
effort header; the note is an **always-visible ONE-LINE labelled NOTE field** (the bycatch
sheet's shape, single line) below the two Y/N questions, just above Close & Save. Effort 1's
writes the same remarks catch+haul pair as ever; extras write their own `note`. It freezes
with its effort (inside the frozen body; hidden only when closed AND empty). The header
now holds title + trash only, the trash gained spacing (marginLeft 18) and a 10-pt hit
slop, and the licence Edit/Done controls gained hit padding. New key `effortNoteLabel`
("NOTE"/« NOTE », the bait/bycatch twin).

**Verify table (UI round):**

| # | Item | Command / evidence | Result |
|---|---|---|---|
| 1 | One GPS gate, four call sites | grep: `effortCoordsEntryAllowed` in dfoConstants + 3 UI sites + the generator; `isVisible('gpsCoords')` = 0 hits in FullDfoForm | ✅ PASS |
| 2 | Emit unchanged by the repoint | byte harness `cmp` (MAR-90 38b two-grid fixture) + latLongPerRegion suite unmodified | ✅ IDENTICAL — 2,287 → 2,287 bytes, `cmp` silent |
| 3 | Times under the LFA picker, both renderers | effort 1 + renderExtraEffortNode: timestamp fields render between the LFA picker and the gear/groups | ✅ PASS |
| 4 | Toggles stayed at the bottom (item 3 ruling) | both renderers: toggles after the groups, before the NOTE field and Close & Save | ✅ PASS |
| 5 | Delete confirm on efforts only | both trash sites → `confirmRemoveEffortNode`; bait/bycatch/SAR/trap-group deletes grep-verified untouched | ✅ PASS |
| 6 | Note field down, header de-crowded | header note buttons gone (`effortNoteOpen` state removed); one-line NOTE field below the questions in both renderers; hitSlop on trash + licence Edit/Done | ✅ PASS |
| 7 | The conformance gate is PINNED | new `effortCoordsEntryGate.oneoff.test.ts` (40 lines, 6 tests): QC-88 true (incl. LFA 22) · GLF-89 true · MAR-90 on 38b true (+ the 28599 constant pinned) · MAR-90 off 38b FALSE (LFA 34 — the shipped breach case — and LFA 41) · NL-91 false (incl. 38b-under-NL) · null/undefined/NaN FMA never unlocks MAR/NL while QC/GLF stay true | ✅ PASS — added after the pin audit flagged the round shipping a conformance fix with zero test edits |
| 8 | tsc predicted / measured | predicted 33 | ✅ 33 (0 new) |
| 9 | jest predicted / measured | predicted 45 / 228 (the 6-test gate suite) | ✅ **45 suites / 228 tests** |
| 10 | i18n key-set symmetry | python set-diff over form234 | ✅ EN **244 / FR 244**, diff = ∅ (4 new keys each incl. `effortNotePlaceholder`; FR curly apostrophes, no space before ?) |
| 11 | Harness deleted | `git status --short` | ✅ tmpByteHarness7 deleted; tracked modifications = the 5 intended source files; the only new file is the gate suite. Byte identity was proven with the emit path in its final state — the later additions (the test file and the item-6b placeholder repoint) touch no emit-path source (dfoConstants/dfoXmlGenerator unchanged since the proof), so it stands |
| 12 | Item 6b: shared placeholder untouched | grep: `form234.notePlaceholder` still serves the generic note inputs, the SAR blocks and Form 233; only the two effort NOTE fields read `effortNotePlaceholder` | ✅ PASS |

**Predicted staged stat:** 5 modified source files, **120 insertions / 60 deletions**
(FullDfoForm.tsx the bulk; dfoConstants.ts +11; dfoXmlGenerator.ts 4+/3−; the two dfo.json
+4 keys each), **plus the NEW untracked 40-line effortCoordsEntryGate suite** (⚠ absent
from `git diff --stat`) — **7 files staged** with this gate doc.

**⛔ WALK — sandbox sim, EN and FR, before the commit block:**
1. MAR log, LFA 34 (non-38b): NO GPS fields on any trap group; switch the effort's LFA to
   38b → Capture GPS + lat/long appear on EVERY trap group (group 1 included); QC and NL
   logs unchanged (QC always shows, NL never).
2. Both haul times sit directly under the LFA picker on effort 1 AND on an added effort 2.
3. The two Y/N questions still sit at the bottom, above the new NOTE line.
4. The NOTE field: one line, always visible while open, typed text survives save/reopen;
   close the effort → note read-only (and absent entirely when it was empty); the header
   shows title + trash only.
5. Delete an effort → the new confirm (both languages); Cancel keeps it; Delete removes
   it; deleting a trap group / bait row / bycatch row / SAR block still deletes WITHOUT a
   confirm.
6. Wet-thumb check: trash and licence Edit comfortably separated and hittable.

### 4.7 Commit block (UI round) — Jonathon runs it AFTER the walk passes, one line at a time

```
git add src/components/FullDfoForm.tsx
git add src/i18n/locales/en/dfo.json
git add src/i18n/locales/fr/dfo.json
git add src/utils/dfoConstants.ts
git add src/utils/dfoXmlGenerator.ts
git add src/utils/__tests__/effortCoordsEntryGate.oneoff.test.ts
git add docs/GATE_S136_MULTI_EFFORT.md
git diff --cached --stat
git commit -m "Gate trap-group GPS entry to Rule 3059, move the haul times up, confirm effort deletes and replace the header note with an inline note line"
git push
git log origin/main..HEAD --oneline
```

Expected: `git diff --cached --stat` shows 7 files (the five modified source files at
120+/60−, the new 40-line gate suite, plus this gate doc); the last command prints
**nothing**.

Walk addendum for item 6b: step 4's NOTE field shows "Optional note for this fishing
effort" / « Note facultative pour cet effort de pêche » on BOTH effort 1 and effort 2,
while the Trip / Landing / Transfers / Personal Use / HLIN / HLOUT notes, the SAR block
notes and the Form 233 note still read "for this section" / « pour cette section ».

---

## PHASE 5 — QUICK CAPTURE (rulings 10 and 11) — BUILT 2026-08-19

### 5.0 THE DEFECT THIS PHASE FIXES — founder reproduction on the sandbox sim, 2026-08-19

> Start Haul, stop — effort 1 correctly stamped **21:51–21:52**. One more tap **silently
> restarted** the timer and the card read **"Hauled 21:52–21:52"** — a real haul window
> overwritten by a zero-length one, with no prompt.

Root cause: the old `handleHaulPress` had only two states (running / not-running), so the
third tap re-entered the START branch and the unconditional TimerContext sync effect
overwrote effort 1's `timeStartedHauling`. The walk below proves that exact sequence is no
longer possible.

### 5.1 Scope as built (rulings restated, one OVERTURNED)

- Tap 1 stamps the haul start; tap 2 stamps the haul stop — unchanged, silent.
- **Tap 3** (timer idle, the latest window complete) raises the confirm; **No does nothing
  at all** — no state change of any kind; **Yes creates the next effort card already
  stamped with its start time** (ruling 11 — Quick Capture is the harvester's whole path
  to a second effort), with the LFA pre-filled from the previous effort and one open trap
  group. The timer runs for the new effort; stopping stamps ITS end and captures GPS into
  ITS trap group 1 — only where Rule 3059 allows coordinate entry.
- ⚠ **RULING 10's REOPEN HALF IS OVERTURNED (founder, 2026-08-19): NO confirm on
  reopening.** After a log is exited and reopened, the first haul tap starts or stops
  silently, exactly as before. **Reason, recorded verbatim in spirit: a confirm that fires
  on every reopen becomes a reflex Yes and stops being a guard.** The third-tap guard is
  unchanged and is the whole protection.
- **Conformance follow-through (Rule 3059):** the silent stop-tap GPS capture now fires
  only where coordinate entry is allowed — it no longer fills fields a MAR non-38b or NL
  harvester cannot see. QC/GLF/38b behavior unchanged.
- The capture button is **no longer disabled when effort 1 is closed** — tap 3 must be able
  to create effort 2 on a closed-effort log; writes into closed efforts stay impossible
  (the data-derived target skips them). Its idle label now shows the **latest** effort's
  window instead of always effort 1's. (The `captureBtnDisabled` style is now dormant —
  left in place, orphan-cleanup queue.)
- Mechanics: a data-derived `quickHaulTarget()` (running effort → stop it; effort 1 open
  with no start → start it; else 'new' → the confirm), and the TimerContext sync effects
  gained an `effort1OwnsHaulTimer()` guard — they stand down while an extra effort is
  running or effort 1's window is complete. The unconditional effect write was the other
  half of the shipped defect.

### 5.2 ⛔ WORDING — RULED

- **Tap-3 confirm: BARE TITLE, no body** (founder overruled the body-carrying proposal):
  **"Start a new haul time?" / « Commencer une nouvelle levée? »**, buttons Yes/No via the
  existing `common.yes`/`common.no` ("Yes"/"No" · « Oui »/« Non »). New key
  `newHaulConfirmTitle`. (Case against the bare title, noted at the STOP: it does not say
  a new effort card is about to appear.)
- The reopen-guard wording pair died with the overturn — no keys added for it.

### 5.3 Gates and verify table

| # | Item | Command / evidence | Result |
|---|---|---|---|
| 1 | Tap 3 confirms; No is a pure no-op | `handleHaulPress` target 'new' → Alert; the No button carries NO handler beyond dismiss | ✅ PASS |
| 2 | Yes creates the stamped effort | `startNewEffortFromCapture`: LFA pre-fill + `haulStartDate/Time` from the same now() + one open trap group + `startHaul` | ✅ PASS |
| 3 | The overwrite path is gone | the START branch is reachable only when effort 1 is open with NO start; the sync effects are gated by `effort1OwnsHaulTimer()` | ✅ PASS — walked (steps 1–2) |
| 4 | Reopen behaves exactly as today | no reopen guard exists (overturned); no new state, no ref | ✅ PASS |
| 5 | Stop-tap GPS obeys Rule 3059 | both stop branches gate `captureGps` on `effortCoordsEntryAllowed` | ✅ PASS |
| 6 | Byte identity — fixture A | `cmp` retained bytes vs fresh generate | ✅ IDENTICAL — 2,287 → 2,287 bytes (UI-only phase; the emit path untouched) |
| 7 | tsc predicted / measured | predicted 33 | ✅ 33 (0 new) |
| 8 | jest predicted / measured | predicted 45 / 228 (no suite touches Quick Capture) | ✅ 45 suites / 228 tests |
| 9 | i18n key-set symmetry | python set-diff over form234 | ✅ EN 245 / FR 245, diff = ∅ (1 new key each: `newHaulConfirmTitle`; FR curly apostrophe, no space before ?) |
| 10 | Harness deleted | `git status --short` | ✅ tmpByteHarness8 deleted; tracked modifications = FullDfoForm.tsx + the two dfo.json |

**Predicted staged stat:** 3 source files, **121 insertions / 24 deletions** — **4 files
staged** with this gate doc. No new test file.

**⚠ PIN AUDIT, answered plainly (founder question, 2026-08-19): `quickHaulTarget()` CANNOT
be pinned without changing source.** It is a closure inside the component reading component
state (`timeStartedHauling` / `timeStoppedHauling` / `extraEffortNodes` / the `closes`
map) — not exported, not importable by a suite. The two ways to pin it are both source
moves: (a) extract it into `dfoLogStorage` as a data-map predicate (the Phase-4 extraction
precedent — `quickHaulTargetFromData(d)` over `effortsFromData`, then a three-case suite:
running effort → stop-target, effort 1 open with no start → start-target, every window
complete → 'new', the shipped-defect case); or (b) stand up the repo's FIRST component-
render test (react-test-renderer is installed but unused — new infrastructure, not a small
suite). A test that re-implements the logic beside it would pin nothing. **Left unpinned
by ruling tonight; the (a) extraction is the queued hardening.** Until then the three
cases rest on walk steps 1–4, and the halves that ARE data-layer — `effortsFromData`,
`effortCoordsEntryAllowed`, `effortsAnyClosed` — are already pinned by their suites.

**⛔ WALK — sandbox sim, EN and FR, before the commit block:**
1. **THE REPRODUCTION, re-run:** Start Haul → stop → effort 1 stamped (e.g. 21:51–21:52) →
   **tap the button once more** → the confirm "Start a new haul time?"/« Commencer une
   nouvelle levée? » appears; tap **No** → NOTHING changes — effort 1 still reads
   21:51–21:52, no new effort, timer idle. Repeat the extra tap → No again → still nothing.
   **The 21:52–21:52 overwrite must be impossible to produce.**
2. Same sequence, tap **Yes** → "Fishing Effort 2" appears, LFA pre-filled, its start
   already stamped, timer running; effort 1's 21:51–21:52 UNTOUCHED. Stop → effort 2's end
   stamps (and on 38b/QC/GLF its Trap Group 1 gets coordinates; on MAR non-38b it must
   NOT).
3. Exit the log mid-haul, reopen, tap → the stop happens silently (no confirm — the
   overturn); exit/reopen with the timer idle and windows complete, tap → the tap-3
   confirm, not a silent start.
4. Close effort 1, then tap the (now enabled) button → the tap-3 confirm; Yes creates
   effort 2; effort 1's stamps and closure untouched.
5. Idle button label shows the LATEST effort's window once effort 2 has times.
6. Regression: Start/Stop Sail unchanged; a brand-new log's first Start Haul is silent.

### 5.4 Commit block — Jonathon runs it AFTER the walk passes, one line at a time

```
git add src/components/FullDfoForm.tsx
git add src/i18n/locales/en/dfo.json
git add src/i18n/locales/fr/dfo.json
git add docs/GATE_S136_MULTI_EFFORT.md
git diff --cached --stat
git commit -m "Confirm before starting a new haul time from Quick Capture, creating the next fishing effort instead of silently restarting a finished one"
git push
git log origin/main..HEAD --oneline
```

Expected: `git diff --cached --stat` shows 4 files (the three source files at 121+/24−,
plus this gate doc); the last command prints **nothing**.

---

## PHASE 6 — ROUTE THE RULE 781 PROMPT TO FORM 222 (ruled earlier, recorded 2026-08-19; NOT YET BUILT)

### 6.1 Why

Phase 2 (ruling 4) removed the marine-mammal detail fields from the 234 surface, so the
Rule 781 mandated prompt — EN "Please, complete the declaration of interaction with a
marine mammal." — now tells the harvester to complete a declaration **with nothing on
screen to complete**. The actual declaration is Form 222, reachable today only by leaving
the log and finding the Form 222 button on the logs list. Phase 6 gives the prompt a route.

### 6.2 Scope (build later)

- When ANY effort's marine-mammal question is answered Yes (effort 1's `handleMmYes` and
  the extras' `handleNodeMmYes`), the Rule 781 alert offers a way to Form 222 alongside
  plain acknowledgement.
- ⚠ **FENCE: the Rule 781 message text is DFO-mandated** (`mmInterIndPrompt`, both
  languages, byte-protected since S101a) — it must stay verbatim. The route lives in the
  alert's BUTTONS, which are app chrome.
- Routing mechanics to settle at build time: the Form 222 modal is owned by
  `DfoLogsListScreen`, not `FullDfoForm` — the route needs either a callback prop threaded
  from App/DfoLogsListScreen or a navigate-after-save hand-off. ⚠ Leaving the log mid-entry
  must not lose unsaved effort data — the draft autosave path is the likely carrier; prove
  it on the walk.
- The 222 pre-fill question (does the routed 222 inherit the log's date/position?) is OUT
  of scope unless ruled otherwise — the 222 already prefills its logbook reference.

### 6.3 ⛔ STOP — the wording, EN and FR (curly apostrophes, no space before ? ! : ;)

One ruling before building: the alert's button labels — the route button (e.g. "Open Form
222" / « Ouvrir le formulaire 222 ») and the stay-here button (e.g. "Later" / « Plus
tard ») — plus whether the route goes NOW (leave the log immediately) or arms a reminder at
save. Recommendation and the honest case against to be put with the STOP when this phase
opens. **Do not build until ruled.**

### 6.4 Walk, gates, verify table, commit block — written when built.

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
