# REM Node Audit — Form 234 Lobster Logbook (Session 62, read-only recon)

**Purpose:** authoritative enumeration of every REM (remark/comment) element across the
lobster logbook, to size and place a per-data-group "add a note" UI satisfying TRG Logbook
test **T1** ("a comment in EVERY data group's Rem field").

**Bottom line:** the real number is **13 distinct REM-bearing data groups**, not ~10.
All 13 are identical in shape: **optional** (`minOccurs="0" maxOccurs="1"`), type
**`string_2000`** (max length **2000**, `minLength` 1). No REM is mandatory anywhere.
The generator emits **zero** REM today (confirmed).

---

## ⚠️ Premise correction (read first)

The task assumed **four separate logbook XSD files (88/89/90/91)**. There is **one** XSD:

```
/Users/jonny/Desktop/DFO/ELOGS_F234/39673.234.NATIONAL - ELOG - Logbook - Lobster - JBE - Journal de bord - Homard_20260130 000000.xsd
```

`88/89/90/91` are **region/subform codes** (88=QC, 89=GLF, 90=MAR, 91=NL), **not** filenames.
The schema does not contain those literals at all (`grep` = 0 hits). The single oneoff test
`src/utils/__tests__/genSampleAllSubforms.oneoff.test.ts` validates **all four** subforms
against this **one** XSD via xmllint. Subform variation (which fields are
mandatory/blocked per region) lives in `Subforms_requirements_234.xlsx`, **not** in the XSD.

**Consequence for REM:** because there is one shared schema, **every REM is XSD-optional in
all four subforms — there is no per-subform mandatory/optional distinction at the XSD level.**
The four-column table below is therefore uniform at the XSD layer; the real per-subform
difference is whether the *parent node* is reachable at all (the generator gates some nodes
by region/FMA — captured in the "Node reachable per subform" column).

---

## PHASE 1 — REM nodes enumerated from the XSD

The XSD uses named `complexType`s, so REM is declared once per type but resolves to a
distinct document path by nesting. All 13 declarations are
`<xs:element name="REM" minOccurs="0" maxOccurs="1" type="string_2000"/>`.

`string_2000` = `xs:string`, `whiteSpace=collapse`, `minLength=1`, **`maxLength=2000`**.

| # | Full path (under ELOG) | Parent data group | complexType (XSD line) | REM decl line | Min/Max | Type | MaxLen |
|---|---|---|---|---|---|---|---|
| 1 | TRIP | **TRIP** | trip_type (203) | 215 | 0/1 | string_2000 | 2000 |
| 2 | TRIP/BAIT_USED | **BAIT_USED** | bait_used_type (229) | 235 | 0/1 | string_2000 | 2000 |
| 3 | TRIP/SAR | **SAR** | sar_type (240) | 250 | 0/1 | string_2000 | 2000 |
| 4 | TRIP/HLIN | **HLIN** | hlin_type (255) | 262 | 0/1 | string_2000 | 2000 |
| 5 | TRIP/HLOUT | **HLOUT** | hlout_type (267) | 272 | 0/1 | string_2000 | 2000 |
| 6 | TRIP/PCONS | **PCONS** | pcons_type (277) | 285 | 0/1 | string_2000 | 2000 |
| 7 | TRIP/EFFORT | **EFFORT** | effort_type (290) | 300 | 0/1 | string_2000 | 2000 |
| 8 | TRIP/EFFORT/EFFORT_BY_GEAR | **EFFORT_BY_GEAR** | effort_by_gear_type (315) | 319 | 0/1 | string_2000 | 2000 |
| 9 | TRIP/EFFORT/EFFORT_BY_GEAR/EFFORT_DETAIL | **EFFORT_DETAIL** | effort_detail_type (326) | 339 | 0/1 | string_2000 | 2000 |
| 10 | …/EFFORT_DETAIL/CATCH | **CATCH** | catch_type (346) | 354 | 0/1 | string_2000 | 2000 |
| 11 | TRIP/LANDING | **LANDING** | landing_type (359) | 365 | 0/1 | string_2000 | 2000 |
| 12 | TRIP/TRANSFER | **TRANSFER** | transfer_type (370) | 380 | 0/1 | string_2000 | 2000 |
| 13 | TRIP/TRANSFER/TRANSFER_DTL | **TRANSFER_DTL** | transfer_dtl_type (387) | 392 | 0/1 | string_2000 | 2000 |

**Nodes that carry NO REM** (for completeness): `GENERAL_INFO` (general_info_type) and
`TGT_SPECIES` (tgt_species_type). Every other complexType in the schema has a REM.

### Per-subform table (XSD presence + generator reachability)

At the XSD layer every REM is **O** (optional) for all four subforms — the schema is shared.
The right-hand column shows whether the **parent node is actually emitted** per subform today
(i.e. whether a "note" UI would have anywhere to attach), which is the real differentiator.

| Parent data group | QC 88 | GLF 89 | MAR 90 | NL 91 | Node reachable per subform (generator today) |
|---|:---:|:---:|:---:|:---:|---|
| TRIP            | O | O | O | O | All 4 — always |
| BAIT_USED       | O | O | O | O | All 4 — when bait entries exist |
| SAR             | O | O | O | O | **None** — SAR node is never emitted (see Phase 3) |
| HLIN            | O | O | O | O | All 4 — **only** FMA 28599 / 1595 |
| HLOUT           | O | O | O | O | All 4 — **only** FMA 28599 / 1595 |
| PCONS           | O | O | O | O | All 4 — when bycatch / personal-use exist |
| EFFORT          | O | O | O | O | All 4 — always |
| EFFORT_BY_GEAR  | O | O | O | O | All 4 — always |
| EFFORT_DETAIL   | O | O | O | O | All 4 — always |
| CATCH           | O | O | O | O | All 4 — always |
| LANDING         | O | O | O | O | All 4 — when a landing date exists |
| TRANSFER        | O | O | O | O | **QC 88 only** (generator gates `subformId===88`) |
| TRANSFER_DTL    | O | O | O | O | **QC 88 only** |

Legend: **O** = optional in XSD (the only state REM ever has). There are no `M`/absent cells —
no REM is mandatory and none is subform-specific at the schema level.

**Universal REM sites** (reachable in all four subforms): TRIP, BAIT_USED, PCONS, EFFORT,
EFFORT_BY_GEAR, EFFORT_DETAIL, CATCH, LANDING. **Conditionally reachable:** HLIN/HLOUT
(FMA-gated). **Subform-specific:** TRANSFER/TRANSFER_DTL (QC-88). **Unreachable today:** SAR.

---

## PHASE 2 — Cross-check against the XML dictionary

Source: `~/Desktop/DFO/ELOG_dict/XML_dictionary.csv` (958 data rows).
Note: the CSV is latin-1, not UTF-8 — grep/awk must run under `LC_ALL=C` or they abort on the
French accented bytes (this is why a naive `grep REM` returns nothing). `ELEMENT_ID` is the
only **unquoted** column.

The dictionary has **48** rows where `NODE_NAME=REM` / `ELEMENT_NAME=REM`, spanning **all**
ELOG forms (222 mammals, 233 inactivity, groundfish, etc.), not just 234.

**Reconciliation against the Phase-1 list — all 13 logbook REM nodes are present in the
dictionary, and every one agrees with the XSD:**

| Dict ELEMENT_ID | NODE_NAME | DATATYPE | MAX_LENGTH | REQUIRED_VS_PARENT | In Phase-1? |
|---|---|---|---|---|:---:|
| 303 | TRIP | CHAR | 2000 | N (optional) | ✅ |
| 510 | BAIT_USED | CHAR | 2000 | N | ✅ |
| 548 | SAR | CHAR | 2000 | N | ✅ |
| 689 | HLIN | CHAR | 2000 | N | ✅ |
| 693 | HLOUT | CHAR | 2000 | N | ✅ |
| 617 | PCONS | CHAR | 2000 | N | ✅ |
| 508 | EFFORT | CHAR | 2000 | N | ✅ |
| 509 | EFFORT_BY_GEAR | CHAR | 2000 | N | ✅ |
| 192 | EFFORT_DETAIL | CHAR | 2000 | N | ✅ |
| 199 | CATCH | CHAR | 2000 | N | ✅ |
| 516 | LANDING | CHAR | 2000 | N | ✅ |
| 657 | TRANSFER | CHAR | 2000 | N | ✅ |
| 656 | TRANSFER_DTL | CHAR | 2000 | N | ✅ |

**Discrepancies:** none within form 234.
- No REM the XSD enumerates is missing from the dictionary, and vice versa.
- **Max length agrees exactly: dictionary `MAX_LENGTH=2000` == XSD `string_2000`.** The
  dictionary does provide the length (datatype CHAR, REQUIRED_VS_PARENT_NODE_IND = `N` =
  optional) — fully consistent with `minOccurs=0`. No XSD-vs-dictionary length conflict.

**Out-of-scope (the other 35 REM rows — belong to other ELOG forms, NOT 234, listed so they
aren't mistaken for logbook gaps):** BAIT_FSHD, BED_INFO, CATCH_DTL, CREW_INFO, DAILY_REPORT,
DR_DTL, DR_GRP, EFFORT_SAMPLE, GEAR_INFO, HLIN_DTL, LANDING_DTL, LOST_GEAR, MM_INTER,
MM_INTER_INCDNT, MM_OBS, MM_OBS_SP, MM_OBS_SP_ACT, PROD, PROD_DTL, PROD_SUM, QUOTA, REPORT,
REPORT_DTL, RSN_NOT_FISH, SALES, SALES_DTL, SAMPLE, SET, SMPL_ITEMS, TAG, TRANSFER_DTL_CTNR,
WEIGHOUT_SUM, WOS_SPECIES, WOS_SP_CTNR, WOS_SP_DTL. (13 in-scope + 35 out-of-scope = 48.)

---

## PHASE 3 — Map to current generator emit sites

File: `src/utils/dfoXmlGenerator.ts` (`generateElogXml`, lines 75–354).

**Confirmed: NO REM is emitted today.** The only `REM` matches in the file are
**validation-spec ChildSpec entries** consumed by `validateElogXml` (lines 436, 451, 464,
471, 489, 495, 506, 514, 520, 529, 539, 551, 556) — these declare REM as an optional child
for the validator's XSD-sequence walk; they are **not** emit sites. A search for an actual
`<REM>` literal in the output string returns nothing.

For each REM data group, where an emit would slot into `generateElogXml` (REM is always the
**last child before any sub-nodes / closing tag**, per XSD sequence):

| # | Data group | Built in generator? | Insertion point (line) | Notes |
|---|---|---|---|---|
| 1 | TRIP | yes (`trip` string, 186–203) | after `LGBK_UID` **203**, before `body` | wrapped at 353 |
| 2 | BAIT_USED | yes (108–112) | before `</BAIT_USED>` **112** | per-entry `.map` |
| 3 | SAR | **NO — node never emitted** | — | explicitly skipped, lines **283–286** (missing NB_SPCMN / SPCMN_COND_ID UI + LAT/LONG MODE, open Q3) |
| 4 | HLIN | yes (293–299), FMA-gated | before `</HLIN>` **299** (after DG_CLOSE_DT 298) | FMA 28599/1595 only |
| 5 | HLOUT | yes (303–307), FMA-gated | before `</HLOUT>` **307** | FMA 28599/1595 only |
| 6 | PCONS | yes — **two** sites (136–143 bycatch, 152–159 personal-use) | before each `</PCONS>` **143** and **159** | repeating node |
| 7 | EFFORT | yes (209–277) | after `DG_CLOSE_DT` **220**, before `<TGT_SPECIES>` 222 | |
| 8 | EFFORT_BY_GEAR | yes (223–276) | after `GEAR_SBTYP_ID` **227**, before `<EFFORT_DETAIL>` 228 | |
| 9 | EFFORT_DETAIL | yes (228–275) | after `TRP_SZ_ID` **264**, before `<CATCH>` 265 | REM is last pre-CATCH child |
| 10 | CATCH | yes (265–274) | before `</CATCH>` **274** | |
| 11 | LANDING | yes (313–323) | before `</LANDING>` **323** (after DG_CLOSE_DT 322) | |
| 12 | TRANSFER | yes (333–344), QC-88 only | after `DG_CLOSE_DT` **338**, before `<TRANSFER_DTL>` 339 | `subformId===88 && transferYes` |
| 13 | TRANSFER_DTL | yes (339–343), QC-88 only | before `</TRANSFER_DTL>` **343** | |

**12 of 13 REM groups have a live build site; SAR has none** (the SAR node itself is not
generated). A future REM-note feature that targets SAR would first require the SAR node to be
emitted (blocked on open Q3 + missing SAR UI fields, per the CLAUDE.md "Not yet built").

---

## Summary for the T1 UI design

- **13** REM data groups total (XSD + dictionary agree). Today's "~10" estimate undercounts
  by 3 — the easy-to-miss ones are the three nested effort levels
  (**EFFORT_BY_GEAR**, **EFFORT_DETAIL**, **CATCH**) plus **TRANSFER_DTL**.
- Every REM is **optional, `string_2000` (max 2000 chars), free text** — identical UI control
  everywhere; a single reusable "note" component (≤2000 char limit) covers all sites.
- No per-subform XSD difference — but the **parent node's reachability** differs:
  8 universal, HLIN/HLOUT FMA-gated, TRANSFER/TRANSFER_DTL QC-88-only, **SAR unreachable**
  (not emitted). A strict T1 reading ("EVERY data group") can only be met for the 12
  buildable groups until SAR emission lands.
- Generator emits **zero** REM now; insertion points are mapped above (no code changed).

*Read-only recon — no source files created or modified, no commit.*
