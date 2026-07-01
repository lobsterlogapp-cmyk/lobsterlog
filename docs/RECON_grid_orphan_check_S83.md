# RECON — QC FMA grid orphan check (GRID_ID coverage) — S83

RECON ONLY. No code changed, no commits. Read-only cross-check of the QC FMA universe
against the two grid-rule sets already documented in `docs/RECON_grid_id_S83.md`.

## ANSWER FIRST (the one line that matters)

YES — BLOCKED ∪ FILTERED covers all 40 QC FMAs with **zero in NEITHER**. There is no
mandatory-but-unfiltered grid gap. Counts: BLOCKED = 29, FILTERED = 11, NEITHER = 0.

## Premise correction you should know about

The step as written ("every FMA whose DFO region is Quebec (Reg_id 1006) in MV_FMA") is
not executable against MV_FMA: `MV_FMA_rel30.csv` has columns CODE_ID, ABBRV_FRE,
DESC_FRE, ABBRV_ENG, DESC_ENG — there is NO Reg_id column, and no reftable carries both an
FMA and a DFO-region column (so no single-table region filter exists). MV_DFO_REGION_rel3
does confirm code 1006 = Quebec. Per your follow-up, the authoritative QC FMA universe used
here is the app list `DFO_FMA_LIST_QC` (subform 88, regId 1006) in src/utils/dfoConstants.ts
— exactly 40 LFAs. The stat-section→region join was deliberately skipped (not needed).

## Sets used (verbatim from docs/RECON_grid_id_S83.md)

BLOCKED = the 29-code Rule 1011 QC exclusion cluster (grid BLOCKED in QC).
FILTERED = the 613x/614x trigger set = 1534 (LFA 22, map "4") + the twelve 614x codes
(map "1"): 1526, 1527, 25641, 25626, 25627, 25628, 25629, 25630, 25631, 25632, 25633, 25637.
Classification was done programmatically (Python), not by hand.

## Counts

BLOCKED | 29
FILTERED | 11 (1534 via 613x; ten 614x codes: 25641, 25626, 25627, 25628, 25629, 25630, 25631, 25632, 25633, 25637)
NEITHER | 0
TOTAL QC FMAs checked | 40  (29 + 11 = 40, exact)

## NEITHER list (code_id|label)

(none) — no QC FMA fell outside BLOCKED ∪ FILTERED.

## Sanity note — the two FILTERED codes that are NOT QC

The FILTERED set has 13 codes, but only 11 appear in the QC universe. The two left over
are 1526|LFA 15 and 1527|LFA 16 — these are Gulf (GLF, subform 89) FMAs in DFO_FMA_LIST_GLF,
not Quebec. They are real 614x triggers, just not Quebec ones, so they correctly do not
appear in the QC classification. This is expected, not a discrepancy.

## Full per-FMA classification (code_id|label|verdict)

25640|LFA 17b|BLOCKED   25656|LFA 19a1|BLOCKED  25658|LFA 19a2|BLOCKED
25657|LFA 19a3|BLOCKED   25636|LFA 19b|BLOCKED   25659|LFA 19c1|BLOCKED
25660|LFA 19c2|BLOCKED   25662|LFA 20a10|BLOCKED 25661|LFA 20a1|BLOCKED
25673|LFA 20a2|BLOCKED   25672|LFA 20a3a|BLOCKED 25674|LFA 20a3|BLOCKED
25675|LFA 20a4|BLOCKED   25676|LFA 20a5|BLOCKED  25677|LFA 20a6|BLOCKED
25678|LFA 20a7|BLOCKED   25679|LFA 20a8|BLOCKED  25663|LFA 20a9a|BLOCKED
25680|LFA 20a9|BLOCKED   25664|LFA 20b1|BLOCKED  25665|LFA 20b2|BLOCKED
25666|LFA 20b3|BLOCKED   25671|LFA 20b4|BLOCKED  25667|LFA 20b5|BLOCKED
25668|LFA 20b6|BLOCKED   25670|LFA 20b7|BLOCKED  25669|LFA 20b8|BLOCKED
25635|LFA 21a|BLOCKED    25634|LFA 21b|BLOCKED
1534|LFA 22|FILTERED(613x map4)
25641|LFA 17a|FILTERED(614x map1)  25626|LFA 18a|FILTERED(614x map1)
25627|LFA 18b|FILTERED(614x map1)  25628|LFA 18c|FILTERED(614x map1)
25629|LFA 18d|FILTERED(614x map1)  25630|LFA 18e|FILTERED(614x map1)
25631|LFA 18f|FILTERED(614x map1)  25632|LFA 18g|FILTERED(614x map1)
25633|LFA 18h|FILTERED(614x map1)  25637|LFA 18i|FILTERED(614x map1)

## Method / provenance

QC universe: DFO_FMA_LIST_QC (40 entries) parsed from src/utils/dfoConstants.ts.
BLOCKED + FILTERED sets: docs/RECON_grid_id_S83.md sections 3.
Cross-check: each QC code_id tested for membership in BLOCKED, else FILTERED, else NEITHER.
Result reproduced exactly: BLOCKED=29, FILTERED=11, NEITHER=0, coverage = complete.
