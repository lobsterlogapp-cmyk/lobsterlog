# TRG Generator Verification — Session 58

**Scope:** Read-and-report only. How much of TRG logbook tests **T1** (maximal / all
optionals present), **T2** (minimal / mandatory-only), and **T3** (no-catch effort) the
current generator already passes, per subform (88 QC / 89 GLF / 90 MAR / 91 NL). No
behaviour changes made.

**Sources of truth**
- Generator + validator: `src/utils/dfoXmlGenerator.ts` (`generateElogXml()` :75–349,
  `validateElogXml()` :614–845).
- Requirements (WINS over XSD): `~/Desktop/DFO/ELOGS_F234/Subforms_requirements_234.xlsx`
  (sheet "F234 - Subforms requirements", rows R6–R118).
- XSD: `…/ELOGS_F234/39673.234.…Homard_20260130 000000.xsd`.
- Harness: `src/utils/__tests__/genSampleAllSubforms.oneoff.test.ts`.

**Ground truth (Phase 3):** ran the harness — all four subforms `validateElogXml` = VALID;
xmllint `--schema` against the on-disk XSD = all four **validate**. Emitted XML inspected
at `/tmp/sample_{qc88,glf89,mar90,nl91}.xml`. The fixtures are *near-minimal-plus* (MAR-90
also carries LAT/LONG/LGRID_ID/NB_SPCMN_BRD; QC-88 also carries TRANSFER/carrier-VRN), not
true T1 or true T2 docs.

---

## Executive verdict

| Test | 88 QC | 89 GLF | 90 MAR | 91 NL |
|---|---|---|---|---|
| **T1** maximal | AT-RISK | AT-RISK | AT-RISK | AT-RISK |
| **T2** minimal | PASS | PASS | PASS | PASS |
| **T3** no-catch | PASS | AT-RISK | AT-RISK | PASS |

- **T1 fails to reach "maximal" on every subform** for one dominant reason: **`REM` is
  never emitted for any data group** (0 emit sites in the generator — all 13 `REM`
  references in the file are validator-spec entries, `min:0`). Several other optionals also
  have no emit path. The maximal doc still *validates* (optionals are `min:0` in the XSD),
  so it is not BLOCKED — it just cannot be made truly maximal.
- **T2 passes everywhere**: no optional field is emitted unconditionally. Every optional is
  either value-gated through `tag()` (`:52–55`, returns `''` for empty) or has no emit site,
  so a mandatory-only log leaks **zero** optional elements.
- **T3**: a *zero-`CATCH`* effort is structurally impossible and correctly rejected (XSD
  `CATCH minOccurs="1"` :341; validator `CATCH min:1` :446 → error :606). The generator
  hard-codes exactly one lobster `CATCH` (:259–268), dropping `KEPT_WT` when weight ≤ 0
  (`kgStr` :46–50). That conforms where `KEPT_WT` is optional (88, 91) but silently omits a
  *mandatory* `KEPT_WT` for 89/90.

---

## Phase 1 — Optional-field emission gating

Every field marked **Optional** in the requirements sheet, its emit site, and gating class.
Gating classes:
- **VALUE** — emitted only when a value is present (via `tag()` or an explicit `if`). Safe
  for T2 omission; present-able for T1.
- **COND** — emitted only under a subform/FMA condition *and* a value. Safe for T2;
  present-able for T1 under that condition.
- **NONE** — no emit site at all. Absent for T2 (good); **not present-able for T1 (gap)**.
- **NODE-SUPPRESSED** — the whole parent node is never emitted, so the field can't appear.

| Field (element_id) | Node | Optional for | Emit site | Gating | T2 (absent?) | T1 (present-able?) |
|---|---|---|---|---|---|---|
| OBS_TRIP_NUM (225) | TRIP | 90 | `:193` `if(===90) tag(…)` | COND | ✅ | ✅ (90) |
| REM (303) | TRIP | 88/89/90/91 | — | NONE | ✅ | ❌ |
| BT_COND_ID (243) | BAIT_USED | 88/89/90 | — (no UI field) | NONE | ✅ | ❌ |
| REM (510) | BAIT_USED | all | — | NONE | ✅ | ❌ |
| WT (545) | SAR | all | — (SAR node off :277–280) | NODE-SUPPRESSED | ✅ | ❌ |
| REM (548) | SAR | all | — | NODE-SUPPRESSED | ✅ | ❌ |
| ETA_DT (746) | HLIN | 90 | `:290` `tag(…)` | VALUE (node FMA-gated :282) | ✅ | ✅ (90) |
| TOT_WT_ONBRD (747) | HLIN | 90 | `:291` `tag(…)` | VALUE | ✅ | ✅ (90) |
| REM (689) | HLIN | 90 | — | NONE | ✅ | ❌ |
| REM (693) | HLOUT | 90 | — | NONE | ✅ | ❌ |
| REM (617) | PCONS | all | — | NONE | ✅ | ❌ |
| REM (508) | EFFORT | all | — | NONE | ✅ | ❌ |
| REM (509) | EFFORT_BY_GEAR | all | — | NONE | ✅ | ❌ |
| LAT (1222) | EFFORT_DETAIL | 90 | `:250–253` (===90 & FMA 38b & val) | COND | ✅ | ✅ (90/38b) |
| LONG (1223) | EFFORT_DETAIL | 90 | `:250–253` | COND | ✅ | ✅ (90/38b) |
| GRID_ID (978) | EFFORT_DETAIL | 88 | — | NONE | ✅ | ❌ |
| LGRID_ID (979) | EFFORT_DETAIL | 90 | `:244` `tag(…)` | VALUE | ✅ | ✅ (90) |
| STAT_SECT_ID (1233) | EFFORT_DETAIL | 91 | — | NONE | ✅ | ❌ |
| NB_VNTCH (241) | EFFORT_DETAIL | 88 | `:237–239` (===88 & FMA set) | COND | ✅ | ✅ (88, NB_VNTCH FMAs) |
| NB_VNTCH_YOU (242) | EFFORT_DETAIL | 88, 91 | `:240–242` (===88 only) | COND | ✅ | ✅ (88) / ❌ (91) |
| REM (192) | EFFORT_DETAIL | all | — | NONE | ✅ | ❌ |
| NB_SPCMN_KEPT (244) | CATCH | 91 | — | NONE | ✅ | ❌ |
| KEPT_WT (194) | CATCH | 88, 91 | `:261` `tag(…)` | VALUE | ✅ | ✅ |
| NB_SPCMN_DISC (197) | CATCH | 88, 91 | — | NONE | ✅ | ❌ |
| NB_SPCMN_BRD (985) | CATCH | 90 | `:265–267` (===90 & FMA 38b & val) | COND | ✅ | ✅ (90/38b) |
| REM (199) | CATCH | all | — | NONE | ✅ | ❌ |
| VRN (1236) | LANDING | 88 | `:315` (===88 & USE_CR_IND='Y') | COND | ✅ | ✅ (88, carrier) |
| REM (516) | LANDING | all | — | NONE | ✅ | ❌ |
| FROM_PND_NUM (1058) | TRANSFER | 88 | — (FROM_VRN hard-coded :329) | NONE | ✅ | ❌ |
| FROM_VRN (648) | TRANSFER | 88 | `:329` (always = vessel) | always-in-node | ✅* | ✅ |
| FROM_VNAME (649) | TRANSFER | 88 | — | NONE | ✅ | ❌ |
| TO_PND_NUM (666) | TRANSFER | 88 | `:330` `if(toPnd)` | COND | ✅ | ✅ (88) |
| TO_VRN (646) | TRANSFER | 88 | `:331` else-branch | COND | ✅ | ✅ (88) |
| TO_VNAME (647) | TRANSFER | 88 | — | NONE | ✅ | ❌ |
| REM (657) | TRANSFER | 88 | — | NONE | ✅ | ❌ |
| REM (656) | TRANSFER_DTL | 88 | — | NONE | ✅ | ❌ |

\* FROM_VRN is unconditional *within* a TRANSFER node, but the TRANSFER node itself only
emits for QC-88 when `transferYes==='true'` and a transfer weight exists (`:323–326`), so it
is absent from any minimal log.

**No optional field is emitted unconditionally-always** → no optional leaks into a minimal
(T2) document on any subform.

---

## T1 — maximal (all optionals present)

Verdict per subform. All four **AT-RISK**: the doc validates, but cannot be made truly
maximal because the listed optionals have no emit path.

| Subform | Verdict | Present-able optionals | Cannot be present (gaps) |
|---|---|---|---|
| **88 QC** | AT-RISK | OBS_TRIP_NUM is blocked for 88; present-able: NB_VNTCH/NB_VNTCH_YOU (FMA-gated), KEPT_WT, LANDING.VRN (carrier), FROM_VRN, TO_PND_NUM/TO_VRN | REM ×11 groups, BT_COND_ID, SAR.WT, GRID_ID, NB_SPCMN_DISC, FROM_PND_NUM, FROM_VNAME, TO_VNAME |
| **89 GLF** | AT-RISK (degenerate) | *none* — GLF's only optionals are REM (×7 groups) + BT_COND_ID, all unemittable; a "maximal" 89 doc ≡ a minimal 89 doc | REM ×7, BT_COND_ID, SAR.WT |
| **90 MAR** | AT-RISK | OBS_TRIP_NUM, HLIN.ETA_DT, HLIN.TOT_WT_ONBRD, LAT, LONG, LGRID_ID, NB_SPCMN_BRD (last four proven present in `sample_mar90.xml`) | REM-family, BT_COND_ID, SAR.WT, HLIN.REM, HLOUT.REM |
| **91 NL** | AT-RISK | KEPT_WT only | STAT_SECT_ID, NB_SPCMN_KEPT, NB_SPCMN_DISC, NB_VNTCH_YOU, REM-family, SAR.WT |

**One-line reason / evidence (all four):** `REM` has 0 emit sites in `generateElogXml`
(grep confirms every `REM` occurrence is a `validateElogXml` spec entry, e.g. `:430/445/458/…`).
Per-subform extras: EFFORT_DETAIL has no `GRID_ID`/`STAT_SECT_ID`/`NB_SPCMN_KEPT`/
`NB_SPCMN_DISC` writes (`:226–269`); TRANSFER hard-codes `FROM_VRN` and only
`TO_PND_NUM`/`TO_VRN` (`:329–331`); `BT_COND_ID` has no UI field (`BaitEntry = {type,lbs}`,
`FullDfoForm.tsx:74`); the SAR node is suppressed (`:277–280`).

---

## T2 — minimal (mandatory-only)

| Subform | Verdict | Reason / evidence |
|---|---|---|
| **88 QC** | PASS | No optional emitted unconditionally; all value-/cond-gated or absent. |
| **89 GLF** | PASS | Same. |
| **90 MAR** | PASS | Same — incl. `OBS_TRIP_NUM` (`:193`, `tag` drops empty → absent in `sample_mar90.xml`). |
| **91 NL** | PASS | Same. |

A mandatory-only log leaks zero optional elements because `tag()` (`:52–55`) returns `''`
for empty values and every conditional emit also requires a value. (Caveat: T2 still needs
all *mandatory* fields filled to validate — that is a user-input concern, not an
optional-leak concern, and is unchanged by this pass.)

---

## T3 — no-catch effort

**Core finding (uniform across all four):** a zero-`CATCH` effort cannot be produced and is
correctly rejected.
- Generator hard-codes exactly one `<CATCH>` per `EFFORT_DETAIL` (`:259–268`) — there is no
  code path that emits an effort with zero catches.
- `validateElogXml` requires ≥1 CATCH: `EFFORT_DETAIL_SPEC` → `{ name:'CATCH', min:1 }`
  (`:446`), enforced at `validateSequence` (`:606`, "missing required <CATCH>").
- The XSD agrees: `CATCH minOccurs="1" maxOccurs="unbounded"` (XSD :341).
- A catch-*less* fishing day therefore emits **one lobster CATCH** (`SPECIE_ID` 1312 +
  `SPECIE_FRM_ID` 4691) with `KEPT_WT` dropped when weight ≤ 0 (`kgStr` :46–50).

| Subform | Verdict | Reason / evidence |
|---|---|---|
| **88 QC** | PASS | `KEPT_WT` Optional (R94 col 88); weightless CATCH conforms & validates. |
| **89 GLF** | AT-RISK | `KEPT_WT` **Mandatory** (R94 col 89); a no-catch CATCH omits it; neither validator nor XSD enforces the mandate (both `min:0`), so it transmits non-conformant. |
| **90 MAR** | AT-RISK | `KEPT_WT` **Mandatory** (R94 col 90); same gap. |
| **91 NL** | PASS | `KEPT_WT` Optional (R94 col 91). |

(If "T3" instead means *the effort must be representable with no CATCH node at all*, then
all four are BLOCKED by design — the XSD forbids it. The reading above assumes the realistic
"hauled, kept nothing" scenario.)

---

## Phase 3 reconciliation — code-vs-output mismatches found (report-only)

Two places where the emit gating does **not** match the requirements sheet. Neither breaks
the T1/T2/T3 verdicts above (both fields are mandatory/blocked, not "optional"), and neither
is failing xmllint today, but both are real requirement deviations surfaced while
reconciling Phase 1 against the actual `/tmp/sample_*.xml` output. **Not touched this
session.**

- **I1 — `LGRID_ID` is value-gated but not subform-gated.** `:244` emits `LGRID_ID` whenever
  `d.lgridCodeId` has a value, on *any* subform. Sheet R85: Optional for **90 only**,
  **Blocked** for 88/89/91. A populated `lgridCodeId` on 88/89/91 would leak a blocked
  element; `validateElogXml` has no per-subform `LGRID_ID` block. (Latent — in practice only
  MAR-90 sets it, so absent elsewhere.)
- **I2 — `PCONS.SPECIE_SZ_ID` emits for 88 and 91 where it is Blocked.** `:131` and `:148`
  emit `SPECIE_SZ_ID` for every subform `!== 90`. Sheet R56: **Mandatory for 89 only**,
  **Blocked** for 88, 90, 91. The Session-56 work blocked it for 90 but not for 88/91, so
  QC-88 and NL-91 PCONS nodes carry a blocked `SPECIE_SZ_ID=826` (xmllint passes since the
  XSD has it `min:0`; the validator only blocks it for 90 at `:823–829`). Confirmed present
  in `sample_qc88.xml` and `sample_nl91.xml`.

---

## GAP LIST — smallest changes to flip AT-RISK → PASS (NOT implemented)

Ordered by leverage. Items marked **(UI+gen)** need a `FullDfoForm` input field as well as a
generator emit; the validator already has spec slots for most.

1. **G1 — REM emission (flips T1 on all four; highest leverage).** Add a value-gated
   `tag('REM', d.<rem…>, indent)` as the last child of each data group per the XSD sequence:
   TRIP, BAIT_USED, PCONS, EFFORT, EFFORT_BY_GEAR, EFFORT_DETAIL, CATCH, LANDING (all
   subforms) + HLIN/HLOUT (90) + TRANSFER/TRANSFER_DTL (88). **(UI+gen)** — no `REM` input
   fields exist today.
2. **G7 — SAR node emission (flips SAR.WT + SAR.REM on all four).** SAR is suppressed
   (`:277–280`) pending SAR UI fields (NB_SPCMN, SPCMN_COND_ID) + LAT/LONG MODE. Known
   deferral; until the node emits, its optionals can't be present. **(UI+gen)**
3. **G2 — BT_COND_ID (flips part of T1 on 88/89/90).** Extend `BaitEntry` to
   `{type,lbs,condition}` + a condition picker in the bait sheet, and emit `BT_COND_ID`
   between `BT_WT` and `DG_CLOSE_DT` (`:110`), gated by bait type and subform (Blocked for
   NL-91). Constants/rules already exist (`DFO_BAIT_CONDITION_LIST`, `DFO_BAIT_NO_CONDITION`,
   `MV_BAIT_CONDITION`, Rules 3060/984). **(UI+gen)** — mostly UI.
4. **G3 — QC-88: `GRID_ID` (EFFORT_DETAIL) + `NB_SPCMN_DISC` (CATCH).** Validator already has
   both slots (`:439`, `:427`); add input + emit. **(UI+gen)**
5. **G5 — NL-91: `STAT_SECT_ID`, `NB_SPCMN_KEPT`, `NB_SPCMN_DISC`, `NB_VNTCH_YOU`.** Validator
   has slots for STAT_SECT_ID (`:444`), NB_SPCMN_KEPT (`:426`), NB_SPCMN_DISC (`:427`); add
   input + emit gated to 91 (NB_VNTCH_YOU also 88). **(UI+gen)**
6. **G4 — QC-88 TRANSFER alternatives: `FROM_PND_NUM`, `FROM_VNAME`, `TO_VNAME`.** Generator
   hard-codes `FROM_VRN` and only `TO_PND_NUM`/`TO_VRN` (`:329–331`); add the pond-name /
   vessel-name paths (Rules 251/252). **(UI+gen)**
7. **G6 — MAR-90 HLIN.REM / HLOUT.REM** — subset of G1 (HLIN/HLOUT REM specifically).
8. **G8 — T3 89/90 mandatory KEPT_WT.** Decide how a no-catch effort is reported for 89/90
   (DFO NIL mechanism vs. explicit 0) and, if it must always carry `KEPT_WT`, add a validator
   overlay requiring it for 89/90. **Spec question first**, then small code change.

*(Out of scope for the T-tests but flagged above: I1 and I2 — fix the LGRID_ID and
SPECIE_SZ_ID subform gating to match the sheet.)*
