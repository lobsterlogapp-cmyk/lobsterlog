# T1 "Maximal Tail" Recon (G2–G5) — Session 72

**RECON ONLY — no code changes.** Inventory of the current state of the T1 maximal-tail
fields so the build can be scoped. Per-field, five things are reported:

- **(a)** `Subforms_requirements_234.xlsx` verdict per region (sheet WINS over the XSD). Row #
  + col map `G=QC(88) H=GLF(89) I=MAR(90) J=NL(91)`. Read via Python stdlib (zipfile +
  xml.etree). Header confirmed at sheet row 5: `D=Element name, F=Element_id, G/H/I/J` =
  QC/GLF/MAR/NL.
- **(b)** Does `dfoXmlGenerator.ts` EMIT it? (tag line + region gating)
- **(c)** UI field in `FullDfoForm.tsx`?
- **(d)** Reftable on disk (`~/Desktop/DFO/ELOG_reftables/`) + ingested in `src/data/reftables/`?
- **(e)** Validator backstop (generator `validateElogXml` spec/overlay)?

Sources: xlsx `Desktop/DFO/ELOGS_F234/Subforms_requirements_234.xlsx`; XSD
`Desktop/DFO/ELOGS_F234/39673.234.…Homard_20260130 000000.xsd`;
generator `src/utils/dfoXmlGenerator.ts`; UI `src/components/FullDfoForm.tsx`;
constants `src/utils/dfoConstants.ts`.

---

## ⚠️ Master-prompt mismatches flagged (file disagrees with the prompt's descriptions)

1. **BT_COND_ID / Rule 3060 values.** Prompt: "MAR Rule 3060 blocks Waste/Electronic/Synthetic."
   The actual BT_COND_ID value list (`MV_BAIT_CONDITION_rel2.csv`) is **only** `1109 Fresh /
   1232 Frozen / 37125 Salted`. **None** of Waste / Electronic / Synthetic appear in it.
   "Synthetic Material" (39742) lives in a **different** element's table —
   `MV_BAIT_CATEGORY_rel2.csv` (Alive / Dead / Synthetic Material) — and "Waste"/"Electronic"
   appear in **no** bait table on disk. So the Rule-3060 value-filter as described does not map
   onto BT_COND_ID's value list. No Rule 3060 filter exists anywhere in the code today. **Do not
   build a Waste/Electronic/Synthetic filter against BT_COND_ID without re-confirming the rule
   target with Kane.**

2. **NB_SPCMN_DISC verdict.** Prompt: "REQUIRED for QC-88 (G3) AND NL-91 (G5)." The sheet (row 95)
   says **Optional**, not Mandatory, for both QC-88 and NL-91 (Blocked GLF/MAR). The "Blocked
   MAR-90" half of the prompt is correct; the "required" half is **Optional** in the sheet.

3. **NB_VNTCH_YOU region.** Prompt: "NL-91." The sheet (row 88) shows it Optional for **both
   QC-88 AND NL-91**. The current build handles the QC-88 leg only; the NL-91 leg is missing —
   and the validator would actively **reject** a valid NL-91 value as "blocked" (see field detail).

4. **GRID_ID vs LGRID_ID.** Confirmed **distinct** elements — different element_ids (978 vs 979),
   different regions (QC-88 vs MAR-90), different backing tables (`MV_GRID` vs `MV_LOBSTER_GRID`).
   Not conflated anywhere.

---

## Per-field table

### G2 — BT_COND_ID (bait condition)

| | Finding |
|---|---|
| (a) xlsx | **Row 27**, node `BAIT_USED`, element_id **243**. QC=**Optional** · GLF=**Optional** · MAR=**Optional** · NL=**Blocked**. (Matches Kane: optional QC/GLF/MAR, blocked NL.) |
| (b) generator | **NOT emitted.** `dfoXmlGenerator.ts:111-112` explicitly omits it: *"BT_COND_ID: conditional per bait type … no condition field in the bait UI yet; optional in XSD, omitted for now."* BAIT_USED emits only BT_TYP_ID, BT_WT, DG_CLOSE_DT, REM. |
| (c) UI | **NONE.** Bait entries (`baitEntries`) capture type + lbs only; no condition sub-field. |
| (d) reftable | Disk: **`MV_BAIT_CONDITION_rel2.csv`** ✅ (3 rows: Fresh/Frozen/Salted). Ingested: **`src/data/reftables/mvBaitCondition.ts`** ✅ exported from `index.ts` — but **never imported/consumed** anywhere in `src/` (dead-but-ready). |
| (e) validator | Spec entry only (`BT_COND_ID min0 max1 type id`, ~line 531). No region gating, no NL-block guard, **no Rule 3060 MAR value-filter** (and see mismatch #1 — the named values aren't in this table). |

**Status: partly done** — value list ingested & ready; emit + UI + NL-block + (questionable) Rule
3060 filter are greenfield.

---

### G3 — GRID_ID (QC-88)

| | Finding |
|---|---|
| (a) xlsx | **Row 84**, node `EFFORT_DETAIL`, element_id **978**. QC=**Optional** · GLF=**Blocked** · MAR=**Blocked** · NL=**Blocked**. |
| (b) generator | **NOT emitted.** No `tag('GRID_ID', …)` anywhere. Appears only in the validator sequence spec. |
| (c) UI | **NONE.** |
| (d) reftable | Disk: **`MV_GRID_rel1.csv`** ✅ (5,272 rows; e.g. `29406 → "3LK20"`). Ingested: **NO** (no `mvGrid.ts`; not referenced in `src/`). |
| (e) validator | Spec entry only (`EFFORT_DETAIL_SPEC` line 483, after LGRID_ID). No QC-only / blocked-elsewhere overlay. |

**DISTINCT from LGRID_ID (MAR-90, row 85, element_id 979).** LGRID_ID is already done (S59):
emit gated `subformId===90` (`dfoXmlGenerator.ts:264`), validator blocks 88/89/91, backed by
`MV_LOBSTER_GRID_rel4.csv` via `DFO_LGRID_BY_FMA`. GRID_ID (QC) and LGRID_ID (MAR) are
different elements, different tables, different regions — **do not conflate.**

**Status: greenfield** (emit + UI + reftable ingestion + validator overlay all absent).

---

### G3 — NB_SPCMN_DISC (specimens discarded)

| | Finding |
|---|---|
| (a) xlsx | **Row 95**, node `CATCH`, element_id **197**. QC=**Optional** · GLF=**Blocked** · MAR=**Blocked** · NL=**Optional**. ⚠️ Prompt said "REQUIRED" for QC/NL — sheet says **Optional** (mismatch #2). Blocked MAR-90 confirmed. |
| (b) generator | **NOT emitted.** CATCH emits SPECIE_ID, KEPT_WT, SPECIE_FRM_ID, NB_SPCMN_BRD (MAR-38b only), REM. No NB_SPCMN_DISC. |
| (c) UI | **NONE.** |
| (d) reftable | Integer count — no reftable. |
| (e) validator | Spec entry (`CATCH_SPEC` line 471, `int`). Partial overlay: blocked-for-MAR-90 guard exists (`dfoXmlGenerator.ts:827-828`). No QC/NL emit-side or "blocked for GLF" handling. |

**Status: partly done** (MAR-90 block guard present from S56) — emit + UI + QC/NL paths greenfield.

---

### G4 — TRANSFER / TRANSFER_DTL (QC-88 only)

| | Finding |
|---|---|
| (a) xlsx | **Rows 105–118**, all QC-88 only (Mandatory/Optional), **Blocked GLF/MAR/NL**. Full element set below. |
| (b) generator | **EMITTED — fully built** (`dfoXmlGenerator.ts:363-382`), gated `subformId===88 && d.transferYes==='true'`. |
| (c) UI | **PRESENT.** `FullDfoForm.tsx:1533-1578`, QC-88 only: transferYes Yes/No toggle, transferTime, transferWt, transferToVrn, transferToPndNum (mutually exclusive), + transfer note. |
| (d) reftable | Uses species/product-form constants (SPECIE_ID 1312, SPECIE_FRM_ID 4691). No new reftable needed. |
| (e) validator | **Full overlay** (`dfoXmlGenerator.ts:851-871`): blocked for 89/90/91; Rule 248 (TRNSF_DT ≥ TRIP.START_DT), 251 (exactly one FROM_VRN/FROM_PND_NUM), 252 (exactly one TO_VRN/TO_PND_NUM), 249 (SPECIE_ID 1312), 250 (SPECIE_FRM_ID 4691). `TRANSFER_SPEC` at line 580. |

**Full XSD element set the sheet expects (QC-88; all others Blocked):**

`TRANSFER` (rows 105–113): TRNSF_DT (645, **Mand**) · FROM_PND_NUM (1058, Opt) · FROM_VRN (648,
Opt) · FROM_VNAME (649, Opt) · TO_PND_NUM (666, Opt) · TO_VRN (646, Opt) · TO_VNAME (647, Opt) ·
DG_CLOSE_DT (1120, **Mand**) · REM (657, Opt).
`TRANSFER_DTL` (rows 115–118): SPECIE_ID (652, **Mand**) · SPECIE_FRM_ID (653, **Mand**) · WT (654,
**Mand**) · REM (656, Opt).

**Generator currently emits:** TRNSF_DT, FROM_VRN (this vessel), TO_PND_NUM **or** TO_VRN, REM, then
TRANSFER_DTL{ SPECIE_ID 1312, SPECIE_FRM_ID 4691, WT, REM }. **Gaps vs full element set** (all
Optional in sheet, so non-blocking): FROM_PND_NUM, FROM_VNAME, TO_VNAME not emitted; DG_CLOSE_DT
on the TRANSFER node is **not** emitted (note: sheet marks it Mandatory — worth a closer look in a
build, though the in-app validator's TRANSFER contents are intentionally unvalidated per
`dfoXmlGenerator.ts:464,633`, and xmllint history shows QC-88 validating).

**Status: done** (functional path built + validated; optional extra fields are scope-able polish).

---

### G5 — STAT_SECT_ID (NL-91)

| | Finding |
|---|---|
| (a) xlsx | **Row 86**, node `EFFORT_DETAIL`, element_id **1233**. QC=**Blocked** · GLF=**Blocked** · MAR=**Blocked** · NL=**Optional**. |
| (b) generator | **NOT emitted.** No `tag('STAT_SECT_ID', …)`. Validator sequence spec only. |
| (c) UI | **NONE.** |
| (d) reftable | Disk: **`MV_STAT_DISTRICT_SECTION_rel8.csv`** ✅ (199 rows; e.g. `38063 → "1 - Cape Norman to Cape Bauld"`; carries STAT_AREA grouping cols). Ingested: **NO** (no module; not referenced in `src/`). |
| (e) validator | Spec entry only (`EFFORT_DETAIL_SPEC` line 488, after TRP_SZ_ID). No NL-only / blocked-elsewhere overlay. |

**Status: greenfield** (emit + UI + reftable ingestion + validator overlay all absent). Mirrors the
S57 TRP_SZ_ID NL-91 pattern (single-region optional EFFORT_DETAIL field) but with a reftable to
ingest first.

---

### G5 — NB_SPCMN_KEPT (NL-91)

| | Finding |
|---|---|
| (a) xlsx | **Row 93**, node `CATCH`, element_id **244**. QC=**Blocked** · GLF=**Blocked** · MAR=**Blocked** · NL=**Optional**. (Master "Blocked MAR-90" confirmed; also blocked QC/GLF.) |
| (b) generator | **NOT emitted.** (CATCH emits SPECIE_ID/KEPT_WT/SPECIE_FRM_ID/NB_SPCMN_BRD/REM.) |
| (c) UI | **NONE.** |
| (d) reftable | Integer count — no reftable. |
| (e) validator | Spec entry (`CATCH_SPEC` line 470, `int`). Partial overlay: blocked-for-MAR-90 guard exists (`dfoXmlGenerator.ts:824-825`). No NL-91 emit path; no QC/GLF block. |

**Status: partly done** (MAR-90 block guard from S56) — NL-91 emit + UI greenfield.

---

### G5 — NB_VNTCH_YOU (NL-91 — plus existing QC-88)

| | Finding |
|---|---|
| (a) xlsx | **Row 88**, node `EFFORT_DETAIL`, element_id **242**. QC=**Optional** · GLF=**Blocked** · MAR=**Blocked** · NL=**Optional**. ⚠️ Prompt said "NL-91" only; sheet shows **QC-88 AND NL-91** (mismatch #3). |
| (b) generator | **Partly.** Emitted for **QC-88 only**, FMA-gated: `dfoXmlGenerator.ts:256-257` — `if (subformId===88 && DFO_FMA_NB_VNTCH_YOU.has(fmaId))`. **NL-91 leg NOT emitted.** |
| (c) UI | **Partly.** `FullDfoForm.tsx:1265-1266` renders it for **QC-88 only** (FMA-gated via `DFO_FMA_NB_VNTCH_YOU`). No NL-91 render path. |
| (d) reftable | Integer count — no reftable. |
| (e) validator | **Conflicts with NL-91 sheet verdict.** `dfoXmlGenerator.ts:793-801` is QC-FMA-only: for NL-91 `vntchYouFma` is false, so a present NB_VNTCH_YOU triggers *"NB_VNTCH_YOU is blocked for this FMA/subform (Rule 625)"* — i.e. the validator would **reject** a value the sheet says is **Optional** for NL-91. Must be relaxed when the NL leg is built. |

**Overlap / reuse question (answered):** NB_VNTCH_YOU **is** a distinct XSD element (id 242) from
NB_VNTCH (id 241, sheet row 87 — QC-88 Optional, all others Blocked). The existing "NB v-notch sets"
in `dfoConstants.ts` are `DFO_FMA_NB_VNTCH` (Rule 623/624 mandatory FMAs) and `DFO_FMA_NB_VNTCH_YOU`
(Rule 625/626 = the 623 set ∪ LFAs 01-14c) — both **QC LFA** sets. The element/state (`nbVntchYou`)
**can be reused** for NL-91, but the **QC-FMA gating must not** — NL-91 has no LFA condition in the
sheet (plain Optional). So: reuse the element + state + (likely) UI widget; add an NL-91 path that
bypasses the QC FMA-set gate on emit, UI, and validator.

**Status: partly done** (QC-88 leg fully built) — NL-91 leg greenfield, and the validator's
blocked-elsewhere guard must be loosened for NL-91.

---

## One-paragraph summary

Of the eight tail elements: **TRANSFER/TRANSFER_DTL (G4) is effectively done** — emitted, UI-built,
and validated for QC-88 (only optional extra FROM_/TO_ name fields + the TRANSFER-node DG_CLOSE_DT are
unbuilt, all non-blocking). **Three are partly done:** BT_COND_ID (G2) has its value list ingested but
unused, no emit/UI, and the prompt's Rule 3060 value-filter is both absent and aimed at values that
aren't in the bait-condition table; NB_SPCMN_DISC (G3) and NB_SPCMN_KEPT (G5) each already carry the
S56 MAR-90 block guard but have no emit/UI for their Optional QC/NL legs; NB_VNTCH_YOU (G5) is fully
built for QC-88 but its NL-91 Optional leg is greenfield **and** the current validator would actively
reject a valid NL-91 value (the blocked-elsewhere guard needs relaxing). **Three are greenfield:**
GRID_ID (G3, QC-88 — distinct from the already-done MAR LGRID_ID; CSV on disk, not ingested),
STAT_SECT_ID (G5, NL-91 — CSV on disk, not ingested; mirrors the S57 TRP_SZ_ID single-region pattern),
and the NL legs above. Net: one reftable already ingested-but-unwired (bait condition), two reftables
on disk awaiting ingestion (MV_GRID 5,272 rows; MV_STAT_DISTRICT_SECTION 199 rows), and three
master-prompt verdicts that disagree with the sheet/disk and should be reconciled with Kane before
building (Rule 3060 target, NB_SPCMN_DISC "required" vs Optional, NB_VNTCH_YOU NL-only vs QC+NL).

---

# BT_COND_ID addendum (Session 72)

Bait-Condition build prep. Three things settled: (1) Rule 3060 verbatim + region scope,
(2) whether a category field exists to drive Condition visibility, (3) whether the bait
TYPE list is region-gated today.

> **Correction to the main recon above.** The S72 first-pass doc said "No Rule 3060 filter
> exists anywhere in the code." That is **wrong** — `dfoConstants.ts` already encodes the
> blocklist and both companion rules as constants (see Step 2). They exist but are unwired
> (no emit, no UI). The "greenfield" framing for BT_COND_ID stands for emit + UI only.

## STEP 1 — Rule 3060 verbatim (+ companions 984 / NL)

Source: `FS-NAT-234-11-EN.pdf` p.19, "General rules – restrictions on data elements".
Transcribed exactly:

> **Rule 3060** — Node(s): `BAIT_USED` · Element(s): `BT_TYP_ID`, `BT_COND_ID`
>
> "If the subform selected (General_Info.Subform_id) is one of:
> `Subform_id 90 — MAR – Lobster`
> And the bait type (Bait_used.Bt_typ_id) is one of:
> `Code_id 38503 — Waste`, `39777 — Electronic bait`, `39795 — Synthetic bait`
> **Then the capture of the bait condition (Bait_used.Bt_cond_id) is blocked.**
> **Otherwise, the capture of the bait condition (Bait_used.Bt_cond_id) must be mandatory.**
> Ref table: Mv_bait_condition, Mv_bait_type"

**Answer to the precise question:** Rule 3060 does **NOT** remove the bait TYPES from
selection. Waste/Electronic/Synthetic stay selectable in MAR-90 (they are explicitly in the
MAR valid-type list — Rule 239b). Rule 3060 only **suppresses the BT_COND_ID field** when one
of those three types is chosen; for **every other** MAR bait type the condition is
**mandatory** (not merely optional). This matches the Jobel behaviour you described.

**Two companion rules the coarse xlsx "Optional" hides** (same fact sheet):

- **Rule 984** (`973a` header) — subforms **QC-88 / GLF-89 only**. BT_COND_ID is **mandatory
  only** when bait type is `3392 Herring, Atlantic` or `1315 Mackerel, Atlantic`; **"Otherwise
  … must be blocked."** So in QC/GLF the field is blocked for *most* types — the inverse shape
  of MAR's rule. (NL-91 is not in this rule's subform list.)
- **NL-91** — BT_COND_ID Blocked outright (xlsx row 27 col J; consistent with the field never
  being enabled by 984 or 3060).

**Bait TYPE valid-value lists are themselves region-split:** Rule **239a** (QC-88/GLF-89/NL-91,
16 values) vs Rule **239b** (MAR-90, 33 values). 239a lists Synthetic(39795)+Waste(38503) but
**not** Electronic bait(39777); 239b lists all three.

**xlsx cross-check (row 27, element_id 243):** QC=Optional · GLF=Optional · MAR=Optional ·
NL=Blocked → "optional QC/GLF/MAR, blocked NL" **MATCHES**. ⚠️ But the sheet's "Optional" is
only the column-level "element may appear" verdict — the **fact-sheet rules 984/3060 are
stricter**, making BT_COND_ID conditionally **mandatory-or-blocked by bait type**, and
differently per region. Build to the rules, not the bare "Optional".

## STEP 2 — the organic/synthetic discriminator

**(a) What backs the bait TYPE dropdown + how the UI sources it.** It is **NOT** an ingested
reftable. The lists are **hardcoded literals** in `dfoConstants.ts`:
- `DFO_BAIT_TYPE_LIST` (line 1259, **33 rows**, MAR/239b — includes all three non-organic:
  `38503 Waste`, `39777 Electronic bait`, `39795 Synthetic bait`).
- `DFO_BAIT_TYPE_LIST_QC_GLF_NL` (line 1544, **16 rows**, 239a — includes `38503 Waste` +
  `39795 Synthetic bait` but **not** `39777 Electronic bait`).
- Picked by `getDfoBaitTypeList(subformId)` (line 1651). UI consumes it at
  `FullDfoForm.tsx:752` — `case 'bait': return getDfoBaitTypeList(subformId).map(b => b.label)`
  (maps to **label only**; bait entries store the label string, generator resolves label→codeId).

On disk, `MV_BAIT_TYPE_rel8.csv` exists (64 lines / 63 data rows) but is **not ingested**
(no `mvBaitType.ts`). **Critically, codes 38503 / 39777 / 39795 are NOT present in
`MV_BAIT_TYPE_rel8.csv` at all** — nor anywhere in `~/Desktop/DFO/ELOG_reftables/` (grepped all
CSVs: zero hits). So the three non-organic types live **only** in the hardcoded app constants;
the on-disk rel8 table is organic species only. (Fact sheet still cites "Ref table:
Mv_Bait_Type" for them — the on-disk release lags the fact sheet.)

**(b) Is there a category/group/flag to separate food baits from Waste/Electronic/Synthetic?**
**No.** Bait-list rows are `{ codeId, label }` only — no category column. `MV_BAIT_TYPE_rel8.csv`
columns are exactly `CODE_ID, DESC_FRE, DESC_ENG` (3 cols) — no category. `MV_BAIT_CATEGORY_rel2.csv`
is a separate 3-row table (`11881 Alive / 11883 Dead / 39742 Synthetic Material`) with **no
foreign key** from bait type — there is **no bait-type→category mapping table on disk**. So the
Condition-visibility gate **cannot key off a real category field**; it needs an explicit ID set.

**That ID set already exists** (unwired), in `dfoConstants.ts`:
- `DFO_BAIT_NO_CONDITION = new Set([38503, 39777, 39795])` (line 1297, comment "Rule 3060").
- `DFO_BAIT_COND_REQUIRED_QC_GLF = new Set([3392, 1315])` (line 1564, "Rule 984").
- `DFO_BAIT_COND_BLOCKED_NL = true` (line 1567).
- `DFO_BAIT_CONDITION_LIST = [Fresh 1109 / Frozen 1232 / Salted 37125]` (line 1300) —
  a hardcoded twin of the ingested `mvBaitCondition.ts` (both exist; either can back the picker).

So the rule logic is **already encoded as constants** — the build is wiring (emit + UI gate +
validator), not deriving the rule sets. A hardcoded 3-ID blocklist is the correct approach
(no category field exists to do it data-driven), and it's already written.

## STEP 3 — is the TYPE list region-gated now?

**Yes.** `getDfoBaitTypeList(subformId)` (`dfoConstants.ts:1651-1659`):

```ts
export function getDfoBaitTypeList(subformId: number) {
  switch (subformId) {
    case 88:
    case 89:
    case 91: return DFO_BAIT_TYPE_LIST_QC_GLF_NL;  // 16 rows (239a)
    case 90:
    default: return DFO_BAIT_TYPE_LIST;            // 33 rows (239b, MAR)
  }
}
```

The UI calls it with the live `subformId` and applies **no further filter** (single `.map` to
labels at `FullDfoForm.tsx:752`). So MAR-90 sees the 33-row list (incl. Electronic bait);
QC/GLF/NL see the 16-row list. ⚠️ **Flag for your "confirmed on-device" note:** the type
dropdown includes Waste/Electronic/Synthetic **only on MAR-90**. On QC/GLF/NL, **Electronic
bait (39777) is absent by design** (Rule 239a omits it) — Waste + Synthetic are present. If you
saw all three on device, you were on the MAR subform.
