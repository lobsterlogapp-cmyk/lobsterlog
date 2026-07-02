# RECON B — Form 222 marine-mammal reference-table wiring (Session 89)

Recon only. No code changed. The question was: are the three marine-mammal reference
tables (MV_CONFIDENCE_LEVEL, MV_MM_LENGTH_CATEGORY, MV_MM_SPECIMENS_CONDITION) wired into
the Form 222 generator and UI, or are those fields free-text / hardcoded / absent? This
gates Mammals TRG tests T1 (emit all elements) and T3.

## Short answer

All three tables exist as generated, typed, exported `.ts` modules — but they are wired
into **nothing**. None of the three is imported or referenced anywhere in the app outside
its own generated file and the reftable barrel. In Form 222 all three fields are **absent**
entirely: there is no entry-model field, no generator emission, and no UI picker for any of
them. They are dead reference data waiting for a feature.

Good news for sizing: all three XSD elements are `minOccurs="0"` (optional), so their
absence does not break XSD validity. Wiring them is a T1/T3 completeness/coverage task, not
a "the document is invalid" fix. Each is a small table (4 / 9 / 5 rows) and the exact
pattern to copy already exists in the file (species and interaction-type pickers).

## Grep results — every hit for the three table names in src/

Searched `src/` for each table name and its symbols. Outside the generated reftable files
and the barrel, there are **zero** hits.

- `MV_CONFIDENCE_LEVEL` / `DfoConfidenceLevel`
  - `src/data/reftables/mvConfidenceLevel.ts` — the generated module (interface + data).
  - `src/data/reftables/index.ts:13` — re-exported from the barrel.
  - No other reference anywhere in `src/`.
- `MV_MM_LENGTH_CATEGORY` / `DfoMmLengthCategory`
  - `src/data/reftables/mvMmLengthCategory.ts` — the generated module.
  - `src/data/reftables/index.ts:11` — re-exported from the barrel.
  - No other reference anywhere in `src/`.
- `MV_MM_SPECIMENS_CONDITION` / `DfoMmSpecimensCondition`
  - `src/data/reftables/mvMmSpecimensCondition.ts` — the generated module.
  - `src/data/reftables/index.ts:12` — re-exported from the barrel.
  - No other reference anywhere in `src/`.

Note: `SPCMN_COND_ID` does appear in `dfoXmlGenerator.ts` (lines 330, 559) and
`FullDfoForm.tsx`, but that is the **Form 234 SAR node**, which uses the different
`MV_SPECIMENS_CONDITION` table via `d.sarCondId`. It is not the Form 222 marine-mammal
`MV_MM_SPECIMENS_CONDITION` table and is unrelated to this question.

## Generated files exist for all three

`src/data/reftables/` (filtered to the three tables):

- `mvConfidenceLevel.ts` — 601 bytes, generated 2026-06-25. `MV_CONFIDENCE_LEVEL`, 4 rows:
  Certain (39597), Probable (39598), Possible (39599), Uncertain (39600).
- `mvMmLengthCategory.ts` — 1066 bytes, generated 2026-06-25. `MV_MM_LENGTH_CATEGORY`,
  9 rows: eight body-length bands from `< 1 m` (39601) to `>26 m` (39608), plus Other
  (39620).
- `mvMmSpecimensCondition.ts` — 675 bytes, generated 2026-06-25. `MV_MM_SPECIMENS_CONDITION`,
  5 rows: Dead (11883), Appears healthy (39589), Sick (39590), Unknown (39591),
  Injured (39622).

Each interface is the standard `{ codeId: number; descFr: string; descEn: string }`. The
codegen has already produced everything a picker needs; nothing consumes it.

## Per-field status in the 222 generator and screen

`src/utils/dfoForm222Generator.ts`

- Line 8 — the generator imports only `MV_NOAA_MM_SPECIES` and `MV_INCIDENT_TYPE` from the
  reftables. None of the three tables in question is imported.
- Lines 35–62 — the `Form222Entry` interface has no field for confidence, length category,
  or specimen condition. Its fields are: interactInd, reportDate, interactionDate,
  interactionTime, lat, lon, speciesLabel, nbAnimals, interactionTypeLabel, injuryInd,
  deathInd, entangleInd, releaseInd, gearDamageInd, observerNm, contactInfo, remarks,
  lgbkNumRef.
- Lines 134–197 — `generateForm222Xml()` emits, inside `MM_INTER`: REP_DATE, INTERACT_IND,
  INTERACT_DT, LAT, LONG, NAME, ADDR, TGT_SPECIE_ID (hardcoded 1312), GEAR_ID (hardcoded
  925), LGBK_NUM_REF, GEAR_DMG_IND, NOAA_SPECIE_COD, NB_SPCMN_BEST, DG_CLOSE_DT, REM, and
  MM_INTER_INCDNT/INCDNT_TYP_ID. It emits **no** `ID_CNFDNCE_ID`, `BDY_LEN_ID`, or
  `SPCMN_COND_ID`.

`src/screens/Form222Screen.tsx`

- Lines 27–29 — imports `MARINE_MAMMAL_SPECIES_LABELS` and `INTERACTION_TYPE_LABELS` only;
  no reftable import.
- Line 309 — a reusable `renderDropdown(label, value, options, …, setter)` helper.
- Lines 533–539 — the species dropdown, backed by `MARINE_MAMMAL_SPECIES_LABELS`. A second
  dropdown is backed by `INTERACTION_TYPE_LABELS`. There is **no** dropdown or input for
  confidence, length category, or specimen condition anywhere on the screen.

Plain-language verdict for each field:

- Species-ID confidence level (`ID_CNFDNCE_ID`, from MV_CONFIDENCE_LEVEL): **absent** —
  not in the entry model, not emitted, no UI.
- Body length category (`BDY_LEN_ID`, from MV_MM_LENGTH_CATEGORY): **absent** — not in the
  entry model, not emitted, no UI.
- Specimen condition (`SPCMN_COND_ID`, from MV_MM_SPECIMENS_CONDITION): **absent** — not in
  the entry model, not emitted, no UI.

None is free-text, none is hardcoded. All three are simply missing.

## Cross-check against the 222 XSD

XSD: `~/Desktop/DFO/ELOG_F222/39588.222.…_20260108 000000.xsd`. The three tables map to
these elements in the `MMinter_type` sequence:

- `ID_CNFDNCE_ID` — line 249, `minOccurs="0" maxOccurs="1"`, type integer_10. (identification
  confidence → MV_CONFIDENCE_LEVEL)
- `SPCMN_COND_ID` — line 250, `minOccurs="0" maxOccurs="1"`, type integer_10. (specimen
  condition → MV_MM_SPECIMENS_CONDITION)
- `BDY_LEN_ID` — line 259, `minOccurs="0" maxOccurs="1"`, type integer_10. (body length
  category → MV_MM_LENGTH_CATEGORY)

All three are **optional** (`minOccurs="0"`). So T1 "emit all elements" does not strictly
*require* them for the document to validate — a 222 without them is XSD-valid today. If T1
is read as "populate every element the paper form collects", these three are the coverage
gap; if T1 is read strictly as "must validate against the XSD", they are already satisfied.
Worth confirming which reading Kane's T1 uses before building.

For context, the same optional sequence also contains several related elements the app
likewise does not emit (e.g. `SITE_DSC`, `PHONE`, `PROV_ID`, `EMAIL`, `VNAME`,
`GEAR_LOST_IND`, `CAUS_KNOWN_IND`, `SPCMN_DSC`, `NB_SPCMN_MIN/MAX`, `VID_IND`, `PHOTO_IND`,
`SMPL_IND`, `OTHR_DOC_IND`, `BDY_LEN` the numeric length, `EVENT_DSC`). All optional. If T1
is the "all elements" test, the confidence/length/condition trio is the part with reftables
already generated and waiting; the rest are free-text/indicator fields.

## What T1 / T3 wiring would take, and size

The build pattern already exists in this file — `MARINE_MAMMAL_SPECIES` /
`INTERACTION_TYPES` build a `{ label, codeId }[]` and a `*_LABELS` string list from a
reftable; the screen renders each with `renderDropdown`; the generator resolves the picked
label back to its codeId and emits the element. Repeating that three times:

1. In `dfoForm222Generator.ts`: import the three tables; add three `{ label, codeId }[]` +
   `*_LABELS` exports (mirroring lines 18–28); add `confidenceLabel`, `lengthCatLabel`,
   `specimenCondLabel` to `Form222Entry`; emit `ID_CNFDNCE_ID`, `BDY_LEN_ID`,
   `SPCMN_COND_ID` inside the `interactInd === 'Y'` block in XSD sequence order (confidence
   and condition sit around lines 249–250, length around 259, i.e. after NOAA_SPECIE_COD /
   near NB_SPCMN_BEST). Because all three are optional, no validator change is required —
   an optional-emit only, like the existing NB_SPCMN_BEST path.
2. In `Form222Screen.tsx`: three more `renderDropdown` calls beside the species/interaction
   ones, with three `set('…')` handlers; add EN/FR i18n keys (FR text already lives in the
   reftables' `descFr`, so the option rows are bilingual for free — only the field labels
   need new keys).
3. i18n: three field-label keys in `form222.*` (en + fr), matching the existing
   `form222.speciesLabel` pattern.

Size: **small.** No reftable ingestion (all three CSVs already vendored and codegen'd), no
XSD-validity risk (all optional), no migration (new optional entry fields default empty;
old saved 222 entries stay valid), and a proven three-file pattern to copy. Estimate ~one
focused session for all three plus a guard test and a live UAT send.

## File-and-line summary

- Wired nowhere: grep for all three table names / types across `src/` returns only
  `src/data/reftables/mv{ConfidenceLevel,MmLengthCategory,MmSpecimensCondition}.ts` and
  `src/data/reftables/index.ts:11–13`.
- `src/utils/dfoForm222Generator.ts` — 8 (imports, the three not among them); 35–62
  (Form222Entry, no such fields); 134–197 (generateForm222Xml, three elements not emitted).
- `src/screens/Form222Screen.tsx` — 27–29 (imports, no reftables); 309 (renderDropdown
  helper); 533–539 (species dropdown — the pattern to mirror); no confidence/length/
  condition UI present.
- 222 XSD — `ID_CNFDNCE_ID` line 249 (opt), `SPCMN_COND_ID` line 250 (opt), `BDY_LEN_ID`
  line 259 (opt).
