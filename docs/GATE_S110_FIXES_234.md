# GATE S110 — 234-side gate fixes (G1 + NL NB_SPCMN_KEPT + NL GPS gate)

**Date:** 2026-07-21 · Session 110
**Scope:** Phase 0 recon (separate doc: `docs/RECON_S110_222_233_SCOPE.md`) · Phase 1 G1 emit fix
(✅ verified + pushed `91bccf4`) · Phase 2 NB_SPCMN_KEPT (✅ verified + pushed `2eda255`) ·
Phase 3 NL GPS visibility gate (✅ verified; commit block below, hash pending) · Phase 4 closeout
(string walk + CLAUDE.md + commit blocks — complete, below).
**Standing rules honored:** no DFO POST; no state-changing git by Claude (commit blocks land in
§Phase 4 for Jonny); print-before-edit on every file.

---

## PHASE 1 — G1: EFFORT_DETAIL LAT/LONG per region (rows 82/83) — ✅ VERIFIED (device)

**Device gate result:** QC coord-less save blocked (EN + FR verified). GLF initial non-block
investigated (see the Phase-1 gate-walk section below) — root-caused to a non-89 trip, no code
defect; **Gulf re-walk on a genuinely NEW trip blocked identically to QC, EN gate confirmed.**
**Founder ruling: commit Phase 1 now** (ahead of Phase 4).

**Authority (RECON_S109B §A1):** Subforms_requirements rows 82/83 = `Mandatory | Mandatory |
Optional | Blocked` (QC-88 | GLF-89 | MAR-90 | NL-91), identical in the 234.11 and 234.12 sheets;
MAR governed by Rule 3059 (38b mandatory / other MAR FMAs blocked).

### Edits (6 files)

| File | Change |
|---|---|
| `src/utils/dfoXmlGenerator.ts` (emit, was :285–294) | Gate rewritten: `const emitEffortCoords = subformId === 88 \|\| subformId === 89 \|\| (subformId === 90 && Number(d.fmaId) === DFO_FMA_38B)` — QC/GLF emit whenever coords captured; MAR condition byte-identical to before; NL never emits (even when coords exist on an old draft). MODE/clamp logic untouched. |
| `src/utils/dfoXmlGenerator.ts` (validator, after the Rule-3059 block) | New overlay: 88/89 missing LAT or LONG → `"LAT and LONG are mandatory for subform <id> (rows 82/83)"`; 91 with either present → `"LAT/LONG are blocked for NL(91) (rows 82/83)"`. Rule-3059 MAR branches unchanged. |
| `src/utils/dfoLogStorage.ts` `FULL_DFO_REQUIRED_FIELDS` | `'gpsCoords'` added to the 88 and 89 lists only (90/91 untouched) — drives the handleSave gate + blankTimestampGate's dynamic map. |
| `src/components/FullDfoForm.tsx` | `fieldCheckMap.gpsCoords = gpsLat.trim() && gpsLng.trim() ? 'ok' : ''` + `fieldLabels.gpsCoords = 'GPS Coordinates (Latitude/Longitude)'`. Gate fires only where the required list carries the key (88/89). |
| `src/utils/dfoConstants.ts` `DFO_SUBFORM_FIELD_CONFIG` | `'gpsCoords'` added to 88/89 `visible` + `required` (config-documenting; the section render is not yet isVisible-gated — that's Phase 3). 90/91 untouched this phase. |
| `src/utils/__tests__/genSampleAllSubforms.oneoff.test.ts` | QC fixture += `gpsLat '48.4488' / gpsLng '-68.5236' / gpsSrc 'gps'`; GLF fixture += `'46.2412' / '-64.5433' / 'manual'` (values chosen without trailing zeros — `clampCoord4` collapses `46.2400`→`46.24`). |
| `src/utils/__tests__/gridId.oneoff.test.ts` | QC fixture += the same coord trio — its two `valid === true` asserts now require coords (consequential fixture update, flagged in recon). |
| `src/utils/__tests__/latLongPerRegion.oneoff.test.ts` | **NEW** guard (8 tests, `validateTrpSzId` pattern): 88/89 with coords → emitted with MODE G/M + valid; 88/89 without → rows-82/83 mandatory error; NL with stored coords → NOT emitted + valid (old-draft safety); NL injected → blocked error; MAR-38b → byte-identical `<LAT MODE="G">44.1234</LAT>` line pin; MAR non-38b injected → Rule 3059 blocked unchanged. |

### Gates

- **jest: 20 suites / 76 tests, ALL PASS** (was 19/68 baseline + the new suite's 8; named runs:
  `deEmitLostGear` (9-case guard) + `launderSweep` + `genSampleAllSubforms` + `latLongPerRegion`
  = 4 suites / 19 tests PASS).
- **tsc `--noEmit`: 33 errors = the S52 baseline, 0 new.**
- **xmllint vs the 234.12 XSD (`…20260624 000000.xsd`): all four samples validate**
  (`/tmp/sample_qc88.xml` / `glf89` / `mar90` / `nl91` — "validates").
- **MAR + NL byte-identity:** before/after diffs contain ONLY the `DG_CLOSE_DT` generation-time
  auto-stamps (the long-known `toCloseTimestamp(undefined)` now()-churn, S62 class) — zero
  structural change. NL emits no coordinates.
- Mid-phase test failures caught + fixed before completion (recorded per print-before-edit
  discipline): (1) `clampCoord4('46.2400')` → `'46.24'` — fixture values switched to
  non-trailing-zero coords; (2) the new 88 fixture initially lacked the QC-only mandatory
  PRTNSHP_ID/USE_CR_IND/TRANSFER set → `valid:false` for a non-LAT reason; brought in line with
  the `gridId` fixture.

### Generated-XML diff — QC-88 (before → after; DG_CLOSE_DT churn lines are the auto-stamp)

```diff
 25c25,41c41,63c65,69c71  <DG_CLOSE_DT>20260721161918 → 20260721162957  (generation-time stamp only)
 50a51,52
 >           <LAT MODE="G">48.4488</LAT>
 >           <LONG MODE="G">-68.5236</LONG>
```

### Generated-XML diff — GLF-89 (before → after)

```diff
 21c21,38c38,59c61  <DG_CLOSE_DT>20260721161918 → 20260721162957  (generation-time stamp only)
 47a48,49
 >           <LAT MODE="M">46.2412</LAT>
 >           <LONG MODE="M">-64.5433</LONG>
```

Both insertions land in the EFFORT_DETAIL slot after `GEAR_GRP_NUM` (the XSD sequence position —
xmllint passing is the sequence proof). The MODE attribute follows `gpsSrc` provenance
(QC fixture 'gps' → `G`; GLF fixture 'manual' → `M`).

**⏸ PHASE 1 GATE — STOPPED. Awaiting founder verify before Phase 2.**

### Phase-1 gate walk — GLF non-block investigated (S110, same session)

**Device result:** QC coord-less save blocked (EN+FR verified); GLF reportedly did not block.
**Diagnosis (read-only; code + on-device AsyncStorage, S90 technique):**

- On-disk gate is correct for BOTH regions: `FULL_DFO_REQUIRED_FIELDS` 88 **and** 89 carry
  `'gpsCoords'` (`dfoLogStorage.ts:193–194`); runtime probe `getRequiredFields(sf)` →
  88 true / 89 true / 90 false / 91 false. `fieldCheckMap.gpsCoords`
  (`FullDfoForm.tsx:1192`) and the shared handleSave loop (`:1219`) are one code path for
  all subforms — there is no GLF-specific branch.
- Walk-sim store (uid FwXYZ…): profile = **subformId 89 / regId 1014** — the Gulf dev-setup
  wrote 89 correctly (`DfoSetupScreen.tsx:74–85` and `:110–116` both persist
  `selectedSubformId`). **No subform-89 trip exists in either sim's store.** The two trips
  saved during the walk window are subformId **88 with coords present**; the only coord-less
  logs are two OLD subformId-**90** trips (May 18; `LL-20260518-002` has `gpsLat=''`). The
  demo sim's profile is subformId 90.
- **Root cause: the coord-less "GLF" save did not run as subform 89.** The gate keys off the
  trip's RUNTIME subformId; three data paths produce a non-89 trip on a Gulf-configured
  walk: (a) editing an old stored log — `hydrateFromLog` restores the log's own subformId
  (`FullDfoForm.tsx:391`, by design); (b) restoring a crash-scratch draft from an earlier
  region session (same hydrate path); (c) walking on the other sim, whose profile is MAR-90.
  A NEW trip on the Gulf profile inherits 89 (`FullDfoForm.tsx:518`) and blocks — proven by
  the 88/89-symmetric jest gate mirror.
- **Related latent finding (NOT fixed — founder ruling):** `DfoSetupScreen.tsx:41`
  `selectedSubformId` inits to 90 and is never seeded from the stored profile, so the region
  pill shows Maritimes on every setup entry and a re-Activate without re-picking silently
  reverts the region to MAR. Didn't cause this walk's symptom (the walk profile is 89), but
  it is a live foot-gun for every dev region switch.

**Fix applied: NONE to app code** (no GLF gate defect exists; per instructions the QC path is
untouched — and so is everything else). **Test hole closed:** new
`src/utils/__tests__/gpsCoordsSaveGate.oneoff.test.ts` (9 tests) pins the save-gate map at the
level the device exercises — `gpsCoords` present in the 88 AND 89 required lists, absent for
90/91, and a faithful `blankTimestampGate`-style mirror of the handleSave loop proving blank /
one-sided coords flag exactly `gpsCoords` for 88/89 and nothing for 90/91.

**Gates re-run:** jest **21 suites / 85 tests ALL PASS** · tsc **33 = baseline, 0 new**.

**⏸ RE-WALK REQUESTED:** on the Gulf-configured sim, use **Fill Out New ELOG** (not an edit of
an existing entry, not a restored draft) — the new trip will carry subformId 89 and the
coord-less save should block identically to QC. If it still saves clean on a genuinely NEW
trip, that falsifies this diagnosis — report back and we dig again.

**✅ RE-WALK RESULT (founder, 2026-07-21): Gulf NEW trip blocked identically to QC — EN gate
confirmed. Diagnosis stands. Phase 1 VERIFIED.**

**Founder ruling — DfoSetupScreen latent finding** (`DfoSetupScreen.tsx:41` `selectedSubformId`
inits to 90, never seeded from the stored profile → region pill misrepresents current region;
re-Activate without re-picking silently reverts to MAR): **[ LEAVE / FIX ]** ← circle one at
commit time. If FIX: it is NOT part of this commit — schedule as its own small item (S111+).

### PHASE 1 COMMIT BLOCK (Jonny runs, one line at a time — Claude runs NO git)

Stages exactly the 8 Phase-1 + investigation files, by explicit repo-relative path — never
`-A`; the four `assets/docs/` passengers and all `docs/RECON_*`/gate docs stay untracked.

```bash
cd ~/Desktop/LobsterLog
git status --short   # expect: 6 " M" + the 2 new test suites among "??"; nothing else staged
git add src/utils/dfoXmlGenerator.ts
git add src/utils/dfoLogStorage.ts
git add src/components/FullDfoForm.tsx
git add src/utils/dfoConstants.ts
git add src/utils/__tests__/genSampleAllSubforms.oneoff.test.ts
git add src/utils/__tests__/gridId.oneoff.test.ts
git add src/utils/__tests__/latLongPerRegion.oneoff.test.ts
git add src/utils/__tests__/gpsCoordsSaveGate.oneoff.test.ts
git status --short   # verify: exactly 8 staged (6 "M ", 2 "A "); recon/gate docs + passengers still "??"
git commit -m "G1: emit EFFORT_DETAIL LAT/LONG for QC/GLF per rows 82/83, block NL, save-gate + per-region guard tests"
git show -s --stat HEAD
git push origin main
git log --oneline origin/main..main
```

**Verify lines (expected results):**
- `git status` after the adds: **exactly 8 files staged** — 6 modified
  (`dfoXmlGenerator.ts`, `dfoLogStorage.ts`, `FullDfoForm.tsx`, `dfoConstants.ts`,
  `genSampleAllSubforms.oneoff.test.ts`, `gridId.oneoff.test.ts`) + **2 `new file:`**
  (`latLongPerRegion.oneoff.test.ts`, `gpsCoordsSaveGate.oneoff.test.ts`).
- `git show -s --stat HEAD`: subject is the bare one-liner above, **no body, no trailer**;
  stat lists **8 files changed**.
- `git push` output: note the push range (`<old>..<new>  main -> main`) and record the new
  tip hash here: ____________.
- `git log --oneline origin/main..main` after the push: **empty** (nothing ahead of origin).

**⏸ STOPPED after writing this block. Phase 2 starts only after the founder confirms the push.**

---

## PHASE 2 — NB_SPCMN_KEPT (NL) — APPLIED, AWAITING VERIFY

**Authority:** Subforms row 93 (`NB_SPCMN_KEPT: Blocked | Blocked | Blocked | Optional`),
FS-NAT-234-12 **Rule 976** (NL + lobster → "the capture of the number of specimen kept
(Catch.Nb_spcmn_kept) is mandatory"), **Rule 977** (NL + non-lobster → blocked). Official
dictionary labels (234 CSV, verbatim): EN "Number of specimens kept" / FR « Nombre de spécimens
conservés ». MAR block confirmed per Kane #2126 / v234.11 (S56 guard kept byte-identical).

### Edits (7 files)

| File | Change |
|---|---|
| `src/utils/dfoXmlGenerator.ts` (emit) | New `if (subformId === 91) { effort += tag('NB_SPCMN_KEPT', d.nbSpcmnKept ?? '', …) }` in the XSD `catch_type` slot — after KEPT_WT, before SPECIE_FRM_ID. The single CATCH node is always the lobster target (Rule 2020) → subform-only gate. |
| `src/utils/dfoXmlGenerator.ts` (validator) | Three new guards beside the untouched S56 MAR block: 88/89 present → "blocked for subform N (row 93)"; 91 lobster missing → "mandatory for NL lobster catches (Rule 976)"; 91 non-lobster present → "blocked for non-lobster catches (Rule 977)". |
| `src/components/FullDfoForm.tsx` | `nbSpcmnKept` state + hydrate (`d.nbSpcmnKept`) + `buildLogData` write; numeric `renderField` gated **`isVisible('nbSpcmnKept')`** (→ NL only; 88/89/90 configs lack the key so their screens are **pixel-identical** — F16 and all captured figures unaffected); `fieldCheckMap.nbSpcmnKept` + `fieldLabels` entry. |
| `src/utils/dfoConstants.ts` | `'nbSpcmnKept'` added to `DFO_SUBFORM_FIELD_CONFIG[91]` visible + required (91 only). |
| `src/utils/dfoLogStorage.ts` | `'nbSpcmnKept'` added to `FULL_DFO_REQUIRED_FIELDS[91]` (91 only). |
| `src/i18n/locales/en/dfo.json` + `fr/dfo.json` | `form234.nbSpcmnKeptLabel`: EN "NUMBER OF SPECIMENS KEPT" / FR « NOMBRE DE SPÉCIMENS CONSERVÉS » — the dictionary terms in the app's ALL-CAPS label convention (caps live in the stored string, S77 precedent). |
| NL fixtures (3 test files) | `nbSpcmnKept: '120'` added to the NL fixtures in `genSampleAllSubforms`, `statSectId`, `latLongPerRegion` (their `valid === true` asserts now require it). |
| `src/utils/__tests__/nbSpcmnKept.oneoff.test.ts` | **NEW** guard (6 tests, `validateTrpSzId` pattern): NL emit-in-slot + valid; NL missing → Rule 976 only; 88/89 stored-value never emitted + injection → row-93 blocked; MAR injection → the pre-existing MAR(90) message (regression pin); NL non-lobster → Rule 977. |

### Gates

- **jest: 22 suites / 91 tests ALL PASS** · **tsc: 33 = baseline, 0 new**.
- **xmllint vs the 234.12 XSD: all four samples validate.**
- **Region isolation proven from generated output:** `grep -c NB_SPCMN_KEPT` → qc88 0 · glf89 0
  · mar90 0 · **nl91 1**; QC/GLF diffs vs the pre-Phase-1 snapshots contain ONLY the Phase-1
  LAT/LONG lines (zero Phase-2 effect); MAR byte-identical net of DG_CLOSE_DT stamps.

### Generated-XML diff — NL-91 (Phase-2 before → after)

```diff
 22c22,38c38,61c62  <DG_CLOSE_DT>20260721174705 → 20260721194920  (generation-time stamp only)
 52a53
 >             <NB_SPCMN_KEPT>120</NB_SPCMN_KEPT>
```

The insertion lands inside `<CATCH>` between `<KEPT_WT>` and `<SPECIE_FRM_ID>` — the XSD
`catch_type` sequence slot (xmllint passing is the sequence proof).

**✅ PHASE 2 VERIFIED (founder, device, 2026-07-21): NL field present + mandatory EN/FR;
absent from MAR/QC/GLF confirmed. Founder ruling: commit Phase 2 on its own ladder line.**

### PHASE 2 COMMIT BLOCK (Jonny runs, one line at a time — Claude runs NO git)

Stages exactly the 10 Phase-2 files by explicit repo-relative path — never `-A`; passengers,
recon docs, and this gate doc stay untracked.

```bash
cd ~/Desktop/LobsterLog
git status --short   # expect: 9 " M" + nbSpcmnKept.oneoff.test.ts among "??"; nothing staged
git add src/utils/dfoXmlGenerator.ts
git add src/components/FullDfoForm.tsx
git add src/utils/dfoConstants.ts
git add src/utils/dfoLogStorage.ts
git add src/i18n/locales/en/dfo.json
git add src/i18n/locales/fr/dfo.json
git add src/utils/__tests__/genSampleAllSubforms.oneoff.test.ts
git add src/utils/__tests__/statSectId.oneoff.test.ts
git add src/utils/__tests__/latLongPerRegion.oneoff.test.ts
git add src/utils/__tests__/nbSpcmnKept.oneoff.test.ts
git status --short   # verify: exactly 10 staged (9 "M ", 1 "A "); docs still "??"
git commit -m "NB_SPCMN_KEPT: NL-only field + Rule 976/977 emit and guards, blocked row 93 elsewhere"
git show -s --stat HEAD
git push origin main
git log --oneline origin/main..main
```

**Verify lines (expected results):**
- After the adds: **exactly 10 files staged** — 9 modified (`dfoXmlGenerator.ts`,
  `FullDfoForm.tsx`, `dfoConstants.ts`, `dfoLogStorage.ts`, `en/dfo.json`, `fr/dfo.json`,
  `genSampleAllSubforms.oneoff.test.ts`, `statSectId.oneoff.test.ts`,
  `latLongPerRegion.oneoff.test.ts`) + **1 `new file:`** (`nbSpcmnKept.oneoff.test.ts`).
- `git show -s --stat HEAD`: bare one-line subject above, **no body, no trailer**; stat lists
  **10 files changed**.
- `git push` output: record the push range (`91bccf4..<new>  main -> main`) and the new tip
  hash here: ____________.
- `git log --oneline origin/main..main` after the push: **empty**.

**✅ PHASE 2 PUSHED (founder, 2026-07-21): tip `2eda255`, range `91bccf4..2eda255`, 10 files,
ahead-of-origin empty.**

**BLOCK CORRECTION (for the record, corrected after the push):** as first written, the add
ladder did not stage all 10 files — the founder caught the gap at run time and staged the
missing paths by hand before committing; the pushed commit is complete (10 files verified in
the stat). The ladder above has been corrected to the full 10-path form (the defect on disk was
a duplicated `en/dfo.json` line where `fr/dfo.json` belonged). Lesson recorded: the add ladder
must be diffed against `git status --short` file-for-file before handoff, not just counted.

## PHASE 3 — NL GPS VISIBILITY GATE — APPLIED, AWAITING VERIFY

**Authority:** Subforms rows 82/83 — LAT/LONG **Blocked** for NL-91; sheet legend row 125:
*""Blocked" means that the application must prevent the entry of this information if this
subform is selected."* (The S109B R2 hazard, NL half.)

### Edits (2 files)

| File | Change |
|---|---|
| `src/components/FullDfoForm.tsx` | The GPS Coordinates section (header + Capture button + lat/long fields, previously unconditional) is now wrapped in **`{isVisible('gpsCoords') && (…)}`** — the established isVisible() pattern. Section body byte-identical inside the wrapper. |
| `src/utils/dfoConstants.ts` | `'gpsCoords'` added to `DFO_SUBFORM_FIELD_CONFIG[90].visible` (NOT required — MAR emission stays Rule-3059/38b-gated in the generator). 88/89 already carry it from Phase 1; **91 does not → section hidden on NL only.** |

**Runtime map proven:** `DFO_SUBFORM_FIELD_CONFIG[sf].visible.includes('gpsCoords')` →
88 true · 89 true · **90 true · 91 false**.

**Render-parity statement:** MAR/QC/GLF render **identically to today** — the gate condition is
true for all three, and the section body is untouched. **No captured figure depicts the NL trip
screen** (every §22 in-app figure F02–F16 is the dfoelog demo on MAR-90 — `GATE_S103_SHOTLIST.md:82,102`),
and **F16 (Coordinate entry, MAR LFA 34) is unaffected** because MAR keeps the section. The
MAR-non-38b half of the S109B R2 hazard (fields visible but Rule-3059-blocked outside 38b) is
deliberately NOT touched — hiding it would change the F16 screen; parked per the R2 ruling
recorded at Phase-1 commit time.

**Old-draft safety (additive, never mutate):** stored `gpsLat/gpsLng/gpsSrc` on existing NL
drafts is untouched — hydrate still loads it, `buildLogData` still writes it back verbatim; it
simply never renders on 91 and never emits (Phase-1 generator gate + validator NL-blocked
guard + the `latLongPerRegion` "NL stored coords not emitted" test).

### Gates

- **jest: 22 suites / 91 tests ALL PASS** (no UI-render coverage exists for RN components — the
  per-subform visibility map is pinned by the runtime probe above; the render itself is the
  Phase-4 sim walk's to verify).
- **tsc: 33 = baseline, 0 new.**

**✅ PHASE 3 VERIFIED (founder, device, 2026-07-21): NL GPS section hidden; MAR/QC/GLF present
(QC/GLF mandatory); F16 unaffected.**

### PHASE 3 COMMIT BLOCK (Jonny runs, one line at a time — Claude runs NO git)

**Add-ladder diffed against `git status --short` file-for-file before handoff (per the Phase-2
lesson):** tree shows exactly `M src/components/FullDfoForm.tsx` + `M src/utils/dfoConstants.ts`
and nothing else modified; the ladder below lists exactly those two paths — zero omissions, zero
extras. No new files this phase. Passengers, recon docs, and this gate doc stay untracked.

```bash
cd ~/Desktop/LobsterLog
git status --short   # expect: exactly 2 " M" (FullDfoForm.tsx, dfoConstants.ts); rest "??"
git add src/components/FullDfoForm.tsx
git add src/utils/dfoConstants.ts
git status --short   # verify: exactly 2 staged ("M "), zero "A "; all docs still "??"
git commit -m "Hide GPS section on NL-91 via isVisible gate; MAR/QC/GLF render unchanged"
git show -s --stat HEAD
git push origin main
git log --oneline origin/main..main
```

**Verify lines (expected results):**
- After the adds: **exactly 2 files staged**, both modified — **no `new file:` entries**.
- `git show -s --stat HEAD`: bare one-line subject above, **no body, no trailer**; stat lists
  **2 files changed**.
- `git push` output: record the push range (`2eda255..<new>  main -> main`) and the new tip
  hash here: ____________.
- `git log --oneline origin/main..main` after the push: **empty**.

---

## PHASE 4 — CLOSEOUT

### Sim string walk (EN/FR, four regions)

**Interactive walk = the founder's per-phase device verifies, recorded above:** Phase 1 — QC
coord-less save blocked with the Missing Fields alert, **EN and FR both verified**; Gulf re-walk
blocked identically (EN). Phase 2 — **NL field present + mandatory EN/FR; absent from MAR/QC/GLF
confirmed.** Phase 3 — **NL GPS section hidden, MAR/QC/GLF present (QC/GLF mandatory), F16
unaffected.** (Claude cannot drive sim taps on this machine — S104 precedent; a live screenshot
of the Pro Max sim's EN trip screen was captured during closeout and renders cleanly:
`walk_promax.png`, session scratchpad.)

**Static string audit (Claude, closeout):** all S110-touched `form234` keys present in BOTH
locales and rendering-ready — `nbSpcmnKeptLabel` EN "NUMBER OF SPECIMENS KEPT" / FR « NOMBRE DE
SPÉCIMENS CONSERVÉS » (accents byte-verified UTF-8 `C3 89`), `gpsCoordinatesSection`
"GPS Coordinates" / « Coordonnées GPS », `captureGpsButton` / `capturingGps` /
`latitudeLabel` / `longitudeLabel` / `missingFieldsTitle` / `missingFieldsBody` all paired;
**form234 EN/FR key-sets symmetric (0 EN-only, 0 FR-only); zero `_todo` values.** The
`fieldLabels` additions ('GPS Coordinates (Latitude/Longitude)', 'Number of specimens kept')
are hardcoded-EN by the map's existing convention — joined to the standing P2
bilingualize-the-map item, not new debt class.

### CLAUDE.md updates (this closeout)

Header → Session 110 (Next — SESSION 111 TBD); new ⭐ Session 110 What's-Built entry; session-log
rows added for **Sessions 108–109B** (recon-only, docs untracked) and **Session 110** (the
three-commit ladder — 91bccf4 / 2eda255 / P3 hash **PENDING VERIFICATION**, Jonny fills);
Current-session-goals → SESSION 110 COMPLETE + carry-forward + **SESSION 111 — TBD**.

### CLOSEOUT COMMIT BLOCK — gate doc + CLAUDE.md (run AFTER the Phase 3 block above)

**Add-ladder diffed against `git status --short` file-for-file:** after the Phase-3 commit the
tree holds `M CLAUDE.md` + untracked `docs/GATE_S110_FIXES_234.md` + the recon docs + the four
`assets/docs/` passengers. The ladder stages exactly CLAUDE.md and this gate doc; the recon docs
(`RECON_S108_*`, `RECON_S109_SWEEP_PLAN.md`, `RECON_S109B_GATE_RULINGS.md`,
`RECON_S110_222_233_SCOPE.md`) and the passengers **stay untracked** — zero omissions, zero
extras.

```bash
cd ~/Desktop/LobsterLog
git status --short   # expect: "M CLAUDE.md"; gate doc + recon docs + passengers "??"; nothing staged
git add CLAUDE.md
git add docs/GATE_S110_FIXES_234.md
git status --short   # verify: exactly 2 staged — CLAUDE.md "M ", the gate doc "A "; recon docs + passengers still "??"
git commit -m "S110 closeout: gate doc + CLAUDE.md"
git show -s --stat HEAD
git push origin main
git log --oneline origin/main..main
```

**Verify lines (expected results):**
- After the adds: **exactly 2 files staged** — `CLAUDE.md` modified + **1 `new file:`**
  (`docs/GATE_S110_FIXES_234.md`).
- `git show -s --stat HEAD`: bare one-line subject above, **no body, no trailer**; stat lists
  **2 files changed**.
- `git push` output: record the push range (`<P3 hash>..<new>  main -> main`) and the new tip
  hash here: ____________. Also backfill the P3 hash into CLAUDE.md's two PENDING VERIFICATION
  markers (header + S110 session-log row) at the next session's Step-0 — do NOT amend.
- `git log --oneline origin/main..main` after the push: **empty**.

**⏸ SESSION 110 ENDS HERE. Jonny runs the Phase-3 block, then this closeout block, one line at
a time. S111 = 222/233 gap builds per docs/RECON_S110_222_233_SCOPE.md.**
