ARCHIVED June 11 2026 — historical/reference; see CLAUDE.md for current status.

# ELOG XML Restructure Blueprint (Session 48)

**Status:** S1–S4 COMPLETE (June 11 2026). The generator emits the nested
GENERAL_INFO/TRIP/EFFORT tree and `validateElogXml()` walks it. MAR-90 output passes
xmllint except for one known gap: LANDING.PORT_ID (mandatory in XSD, no MAR port data —
open question 4). The validator enforces it for ALL subforms per the XSD, so sends are
BLOCKED with an error pointing at open question 4 — it never green-lights a document
xmllint would reject. SAR detail emission and EFFORT_DETAIL LAT/LONG are held on open
question 3 (MODE M-vs-G) plus missing SAR UI fields (NB_SPCMN, SPCMN_COND_ID).

**Authority for every claim below:** the on-file XSD
`Desktop/DFO/ELOGS_F234/39673.234.NATIONAL - ELOG - Logbook - Lobster - JBE - Journal de bord - Homard_20260130 000000.xsd`,
validated with `xmllint --noout --schema "<that .xsd>" <sample.xml>`.

**Why this exists:** the generator (`src/utils/dfoXmlGenerator.ts`) emits a FLAT `<ELOG>`
document. The XSD mandates a NESTED tree. xmllint rejects the flat output at line 1.
`generateSoapEnvelope()` escapes the whole ELOG into `<elog:ElogData>` and POSTs it as-is —
no downstream code adds wrappers, so the flat output is exactly what transmits.

---

## A. Target tree (what the XSD mandates)

```
ELOG  (attr: NODE_ID only — DFO-internal, "must NOT be included by developers")
├─ GENERAL_INFO        (1)   CIE_ID, SOFT_VER, REG_ID, FIN, VRN, FORM_VER_ID, SUBFORM_ID
└─ TRIP                (1..n) TRIP_NUM, OPER_NAME, START_DT, CREW_NB?, PORT_ID?, OBS_TRIP_NUM?,
   │                          FIRST_ENTRY_DT, USE_CR_IND?, PRTNSHP_ID?, LGBK_UID, REM?
   ├─ BAIT_USED        (0..n) BT_TYP_ID, BT_WT, BT_COND_ID?, DG_CLOSE_DT, REM?
   ├─ SAR              (0..n) SAR_DT, LAT, LONG, SPECIE_ID, NB_SPCMN, WT?, SPCMN_COND_ID, DG_CLOSE_DT, REM?
   ├─ HLIN             (0..n) HLIN_CIE_ID, HLIN_NUM, ETA_DT?, TOT_WT_ONBRD?, DG_CLOSE_DT, REM?
   ├─ HLOUT            (0..n) HLOUT_CIE_ID, HLOUT_NUM, DG_CLOSE_DT, REM?
   ├─ PCONS            (0..n) SPECIE_ID, SPECIE_FRM_ID, SPECIE_SZ_ID?, WT, USG_ID?, DG_CLOSE_DT, REM?
   ├─ EFFORT           (0..n) START_DT, END_DT, LIC_NO, FMA_ID, SAR_IND, LOST_GEAR_IND, MM_INTER_IND,
   │  │                       DG_CLOSE_DT, REM?
   │  ├─ TGT_SPECIES   (1)    SPECIE_ID
   │  └─ EFFORT_BY_GEAR(1..n) GEAR_ID, GEAR_SBTYP_ID?, REM?
   │     └─ EFFORT_DETAIL (1..9999) SOAKED_DUR?, NB_VNTCH?, NB_VNTCH_YOU?, NB_GEAR_HLD,
   │        │                       LGRID_ID?, GRID_ID?, GEAR_GRP_NUM, LAT?, LONG?, TRP_SZ_ID?,
   │        │                       STAT_SECT_ID?, REM?
   │        └─ CATCH    (1..n) SPECIE_ID, KEPT_WT?, NB_SPCMN_KEPT?, NB_SPCMN_DISC?, SPECIE_FRM_ID, NB_SPCMN_BRD?, REM?
   ├─ LANDING          (0..n) START_DT, PORT_ID, VRN?, DG_CLOSE_DT, REM?
   └─ TRANSFER         (0..n) TRNSF_DT, FROM_*?, TO_*?, DG_CLOSE_DT, REM? → TRANSFER_DTL(1..n)
```

Every complex node also accepts a `NODE_ID` attribute, **which we must never emit**
(XSD header lines 16–17: DFO-internal only). `?` = optional (minOccurs=0).

---

## B. Field-by-field mapping (current flat → XSD home)

| Current emission | → XSD node | → XSD element | Action |
|---|---|---|---|
| `CIE_ID` | GENERAL_INFO | CIE_ID | move into wrapper (done as flat in Item 2) |
| `SOFT_VER` | GENERAL_INFO | SOFT_VER | move |
| `REG_ID` *(ELOG attr)* | GENERAL_INFO | REG_ID | **attr → element** |
| `FIN` | GENERAL_INFO | FIN | move |
| `VRN` | GENERAL_INFO | VRN | move |
| *(absent)* | GENERAL_INFO | **FORM_VER_ID** | **ADD** (`DFO_FORM_VER_ID` = 234) |
| `SUBFORM_ID` *(ELOG attr)* | GENERAL_INFO | SUBFORM_ID | **attr → element** |
| *(absent)* | TRIP | **TRIP_NUM** | **ADD** (=1) |
| `OPER_NAME` | TRIP | OPER_NAME | move into TRIP |
| `START_DT` (timeSailed) | TRIP | START_DT | move; **reformat date_12** |
| `CREW_NB` | TRIP | CREW_NB | move into TRIP |
| `OBS_TRIP_NUM` | TRIP | OBS_TRIP_NUM | move into TRIP |
| `FIRST_ENTRY_DT` | TRIP | FIRST_ENTRY_DT | move; **reformat date_14** |
| `LGBK_UID` *(ELOG attr)* | TRIP | LGBK_UID | **attr → element** |
| `LICENCE_NO` | EFFORT | **LIC_NO** | **rename + relocate** (see §D) |
| `LIC_NO` (flat) | EFFORT | LIC_NO | move into EFFORT (dedupe with above) |
| `FMA_ID` | EFFORT | FMA_ID | move into EFFORT |
| `SAR_INC` | EFFORT | **SAR_IND** | rename, into EFFORT |
| `LOST_GEAR` | EFFORT | **LOST_GEAR_IND** | rename, into EFFORT |
| `MAMMAL_INC` | EFFORT | **MM_INTER_IND** | rename, into EFFORT |
| `HAUL_START_DT` | EFFORT | **START_DT** | rename; reformat date_12 |
| `HAUL_END_DT` | EFFORT | **END_DT** | rename; reformat date_12 |
| *(absent)* | EFFORT→TGT_SPECIES | SPECIE_ID | **ADD** (=1312 lobster) |
| `GEAR_ID` | EFFORT_BY_GEAR | GEAR_ID | move into EFFORT_BY_GEAR |
| `GEAR_SBTYP_ID` | EFFORT_BY_GEAR | GEAR_SBTYP_ID | move (NL 91) |
| `TRAP_HAULS` | EFFORT_DETAIL | **NB_GEAR_HLD** | **rename** (mandatory) |
| `GEAR_GRP_NUM` | EFFORT_DETAIL | GEAR_GRP_NUM | move into EFFORT_DETAIL |
| `SOAK_DUR` | EFFORT_DETAIL | **SOAKED_DUR** | rename (Item 10) |
| `LGRID_CODE_ID` | EFFORT_DETAIL | **LGRID_ID** | rename |
| GPS lat/long *(if added)* | EFFORT_DETAIL | LAT, LONG | **needs MODE attr** (§E) |
| `CATCH_WT` | CATCH | **KEPT_WT** | rename; into CATCH node |
| *(absent)* | CATCH | SPECIE_ID, SPECIE_FRM_ID | **ADD** (1312 / 4691) |
| `<BAIT_ENTRIES><BAIT TYPE_CODE WT_KG/>` | BAIT_USED | BT_TYP_ID, BT_WT, BT_COND_ID, DG_CLOSE_DT | **full rebuild** (attr-style → child elements; Item 13) |
| `PCONS` (SPECIE_ID, SPECIE_FRM_ID, SPECIE_SZ_ID, WT, USG_ID, DG_CLOSE_DT) | TRIP→PCONS | *(same names)* | **closest match** — relocate under TRIP (Items 5/7/12) |
| `HLIN` (COMPANY_NM, CONFIRM_NO, ETA, TOTAL_WT) | HLIN | HLIN_CIE_ID, HLIN_NUM, ETA_DT, TOT_WT_ONBRD | **rename + retype** (company ID is integer, not name — §F) |
| `HLOUT` (COMPANY_NM, CONFIRM_NO) | HLOUT | HLOUT_CIE_ID, HLOUT_NUM | rename + retype (§F) |
| `DEPART_PORT` (string) | TRIP | PORT_ID (integer) | **retype** name→code (§F; QC/NL) |
| `LAND_PORT` (string) | LANDING | PORT_ID (integer) | **retype** + relocate (§F) |
| `LAND_DT` | LANDING | START_DT | rename; reformat date_12 |

---

## C. The five homeless `<ELOG>` attributes — traced & RESOLVED (Session 48)

| Attribute | Found in XSD? | Resolution |
|---|---|---|
| **LGBK_UID** | ✅ Yes — `trip_type` element, `string_6`, mandatory (line 214) | **Placeable.** Relocate to `<TRIP>` as a child element. |
| **REPORT_UID** | ❌ Not anywhere | **RESOLVED: DROP from the ELOG document entirely.** |
| **LANG** | ❌ Not anywhere | **RESOLVED: DROP from the ELOG document entirely.** |
| **CREATION_DT** | ❌ Not anywhere | **RESOLVED: DROP from the ELOG document entirely.** (`TRIP.FIRST_ENTRY_DT` — date_14, mandatory — exists and is separately populated.) |
| **MODE** (`"1"`/`"3"`) | ⚠️ A `MODE` attr exists — but **not** as a doc-level new/modified flag. It's a **required attribute on every `LAT`/`LONG`** (base type `AttType`), enum **`M` \| `G`** only. | **RESOLVED: REMOVE entirely** — see decision below. The *real* MODE attr (`M`/`G`) must still be **added to all LAT/LONG** elements we emit. |

Bonus: **REPORT_DT** (also currently emitted) — ❌ not in XSD either. **RESOLVED: DROP**,
same as CREATION_DT.

### RESOLVED DESIGN DECISIONS (Session 48)

1. **NO correction/amendment mechanism.** The doc-level MODE attribute and all
   `mode = log.sentToDfo ? 3 : 1` logic are **REMOVED entirely** — not relocated, not
   conditional. Every transmission is a new completed log, read-only after sending.
2. **DROP REPORT_UID, LANG, CREATION_DT, REPORT_DT** from the ELOG document entirely —
   confirmed not in the XSD.

---

## D. LICENCE_NO → LIC_NO — confirmed

- `LICENCE_NO` **does not exist** anywhere in the XSD.
- The only licence element is **`LIC_NO`** (`string_18`, mandatory), located in
  **`effort_type`** (line 294) — i.e. inside `<EFFORT>`, **not** GENERAL_INFO and **not**
  EFFORT_DETAIL.
- The generator currently emits **both** a flat `LICENCE_NO` *and* a flat `LIC_NO`
  (duplicate licence data). **Resolution:** drop `LICENCE_NO`; emit a single `LIC_NO`
  inside `<EFFORT>`. Source value unchanged (`captainProfile.dfoLicenceNo`).

---

## E. Format conversions the rebuild forces (independent of nesting)

1. **Dates:** XSD `date_12` = `YYYYMMDDHHMM` (12 digits, integer, no `-`/`T`/`:`/`Z`/ms);
   `date_14` = `YYYYMMDDHHMMSS`. The current ISO-8601 output
   (`2026-06-10T09:00:00.000Z`) **fails every date pattern.** Need a `date_12` formatter
   (a `date_14` one already exists as `toCloseTimestamp()`).
2. **LAT/LONG:** decimal value + **required `MODE="G"` (or `"M"`) attribute**; lat bounds
   38–72, long −148…−40, ≤4 decimals. Confirm M-vs-G semantics.
3. **Indicators:** `ind_yn` = `Y`/`N`, and `SAR_IND`/`LOST_GEAR_IND`/`MM_INTER_IND` are
   **mandatory** in EFFORT — this collides with Item 8 ("indicators default null").
   Reconciliation: null in form state → block send if unanswered → emit `Y`/`N`.
4. **Weights:** `weight` pattern ≤6 int digits + ≤3 decimals — current `"500.00"` is fine.

---

## F. Structural/data-model mismatches needing a decision (beyond mechanical renames)

- **Ports:** generator stores **port names as free text** (`DEPART_PORT`/`LAND_PORT`); XSD
  wants **integer `PORT_ID`** codes. `DFO_MAR_PORT_LIST` already has `codeId`s — emit the
  code, not the name. (MAR-90 blocks PORT_ID, so this is QC/NL.)
- **HLIN/HLOUT companies:** generator emits `COMPANY_NM` (string); XSD wants
  `HLIN_CIE_ID`/`HLOUT_CIE_ID` (**integer** company IDs). `DFO_HLIN/HLOUT_COMPANY_LIST`
  have codeIds — emit code, not name. (MAR 38b/41 only.)
- **BAIT:** complete shape change (attribute-style `<BAIT/>` → child-element `BAIT_USED`
  with `BT_TYP_ID`/`BT_WT`/`BT_COND_ID`/`DG_CLOSE_DT`).

---

## G. Impact on remaining Session 48 items — sequencing

| Item | Touches restructured code? | Sequence |
|---|---|---|
| 5 — PCONS SPECIE_SZ_ID guard (MAR) | Yes (PCONS → under TRIP) | **after refactor** |
| 6 — CATCH NB_SPCMN_KEPT/DISC blocked | Yes — **CATCH node doesn't exist yet**; subsumed by building CATCH | **after refactor** |
| 7 — PCONS USG_ID picker + emit | UI picker/i18n/`isRequired`: independent. Emit: under new PCONS | UI anytime; **emit after refactor** |
| 8 — null/false defaults | Mostly form-state; indicators now mandatory in EFFORT (§E.3) | mostly independent; reconcile |
| 9 — CREW_NB max 20 | CREW_NB → TRIP; validation logic independent | minor; after |
| 10 — SOAKED_DUR max 216 | SOAK_DUR→SOAKED_DUR in EFFORT_DETAIL | **after refactor** |
| 11 — SAR lat/long bounds | **SAR node doesn't exist yet**; LAT/LONG+MODE | **after refactor** |
| 12 — SPECIE_SZ_ID validate guard | same as Item 5 | **after refactor** |
| 13 — BT_COND_ID conditional | **BAIT_USED full rebuild** | **after refactor** |
| 14 — date cross-validations | dates relocated + reformatted | **after refactor** |
| 15 — data-group status label (UI) | independent | anytime |
| 16 — FIN i18n label (UI) | independent | anytime |
| 17 — 30-day history screen (UI) | independent | anytime |
| 18 — QC PRTNSHP_ID/TRANSFER | TRIP.USE_CR_IND/PRTNSHP_ID + TRANSFER nodes | deferred (QC) |

**Net:** Items **5, 6, 7-emit, 10, 11, 12, 13, 14** land *after* the refactor (5/6/12
partly become free once the nodes are built correctly). Items **15, 16, 17** (and the UI
half of 7) are independent. `validateElogXml()` needs a **near-total rewrite** to walk the
nested tree — part of the refactor, not a separate item.

---

## H. Open questions to resolve BEFORE any refactor code

1. ~~**MODE / amendments**~~ — **RESOLVED (Session 48):** NO correction/amendment
   mechanism. MODE and all `mode = log.sentToDfo ? 3 : 1` logic removed entirely; every
   transmission is a new completed log, read-only after sending. (See §C decisions.)
2. ~~**REPORT_UID, LANG, CREATION_DT, REPORT_DT**~~ — **RESOLVED (Session 48):** all four
   dropped from the ELOG document entirely; confirmed not in the XSD. (See §C decisions.)
3. **LAT/LONG MODE value:** `M` vs `G` — which for GPS-captured coordinates?
4. **Ports & HLIN/HLOUT companies:** confirm we switch name→integer-code emission now
   (QC/NL/38b), or stub these and focus MAR-90 first.

---

## Refactor steps — ALL COMPLETE (June 11 2026)

- **S1 ✅** — GENERAL_INFO + TRIP skeleton + `toDate12()` helper; ELOG attrs all removed.
- **S2 ✅** — EFFORT / TGT_SPECIES / EFFORT_BY_GEAR / EFFORT_DETAIL / CATCH built
  (TRAP_HAULS→NB_GEAR_HLD, CATCH_WT→KEPT_WT, indicators→EFFORT, LICENCE_NO deleted,
  single LIC_NO in EFFORT). EFFORT_DETAIL LAT/LONG held on open question 3.
- **S3 ✅** — BAIT_USED rebuilt (child elements); HLIN/HLOUT renamed+retyped to
  CIE_ID codes; LANDING built; PCONS reordered; data groups in XSD trip_type order.
  SAR node NOT emitted: needs NB_SPCMN + SPCMN_COND_ID UI fields and open question 3.
- **S4 ✅** — `validateElogXml()` rewritten: mini XML parser + declarative XSD-sequence
  spec + subform overlays (CREW_NB, SOAKED_DUR, GEAR_SBTYP_ID, PORT_ID, SUBFORM_ID
  match, ≥1 EFFORT). Catches unmatched code lookups ('0' fallbacks), unanswered
  indicators, format violations. Same signature; call sites unchanged.

xmllint state (MAR-90 fixture): only remaining error is missing LANDING.PORT_ID —
proven the sole gap by hand-inserting a dummy PORT_ID, after which the document
**fully validates**. One-off fixture test: `src/utils/__tests__/genSampleMar90.oneoff.test.ts`
(delete when restructure work ends).

---

## Reproduce the validation

```sh
# generate a sample (one-off jest test wrote /tmp/sample_mar90.xml in Session 48), then:
cd "Desktop/DFO/ELOGS_F234"
xmllint --noout --schema \
  "39673.234.NATIONAL - ELOG - Logbook - Lobster - JBE - Journal de bord - Homard_20260130 000000.xsd" \
  /tmp/sample_mar90.xml
```

Session 48 result (flat output):
```
element ELOG: attribute 'LGBK_UID' is not allowed.   (+ REPORT_UID, REG_ID, SUBFORM_ID, LANG, CREATION_DT, MODE)
element CIE_ID: This element is not expected. Expected is ( GENERAL_INFO ).
fails to validate
```