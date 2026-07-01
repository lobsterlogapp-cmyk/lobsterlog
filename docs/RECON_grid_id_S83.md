# RECON — GRID_ID (Form 234 Lobster), QC grid validity — S83

RECON ONLY. No code changed, no commits. Findings below are read-only observations
from the DFO source package (`~/Desktop/DFO/...`) and the project reftable copy.

---

## THE FORK — answer in plain words (read this first)

Question: is grid-per-FMA validity available as a lookup table (Fork A), or must it
be computed from the map-number string trick (Fork B)?

Answer: **BOTH exist, and they DO NOT agree.** A per-FMA grid lookup IS available
(Fork A) — `SPECIES_GRID_NAFO_FMA.CSV`, filtered to the lobster species id `1312`,
gives an explicit FMA_ID -> GRID_ID list and is populated for every FMA the rules
name. So it is NOT true that you are forced into the string trick to get a lookup.

BUT the fact-sheet validation rules (613x / 614x — the spec DFO actually enforces)
explicitly mandate Fork B: select MV_GRID rows whose `DESC_FRE` first character
equals a map digit. The two methods produce DIFFERENT valid-grid sets:

- Fork B is coarse / map-wide. For the 614x FMAs it authorizes ALL 3259 grids whose
  DESC_FRE starts with "1"; for 613x FMA 1534 it authorizes ALL 957 grids starting "4".
- Fork A is precise per-FMA. For FMA 1526 it lists only 86 specific grids (a strict
  subset of the 3259). For FMA 1534 it lists 1166 grids = the 957 "4"-grids PLUS 209
  "1"-grids — i.e. Fork A is BROADER there and includes grids Fork B would reject.

So they are neither subset nor superset of each other uniformly — they genuinely
conflict. This is the decision to make: follow the fact-sheet rules (Fork B, string
trick) as the source of truth, or follow the crosswalk (Fork A). I am NOT picking;
this is recon. See "THE FORK — detail" below for the numbers.

---

## 1. Conflation guard — GRID_ID vs LGRID_ID (verbatim from XML dictionary)

Source: `~/Desktop/DFO/ELOG_dict/XML_dictionary.csv` (grep'd with LC_ALL=C).
Verbatim relevant fields (ELEMENT_ID | NODE | ELEMENT | MV_TABLE | SENSITIVE | TEST_VALUE):

- `978  | EFFORT_DETAIL | GRID_ID  | MV_TABLE="MV_GRID"          | SENSITIVE="N" | TEST_VALUE=34119`
- `979  | EFFORT_DETAIL | LGRID_ID | MV_TABLE="MV_LOBSTER_GRID"  | SENSITIVE="Y" | TEST_VALUE=29143`

GRID_ID short desc: "Grid (same grid map used for any species)".
LGRID_ID short desc: "Lobster catch and settlement grid (Maritimes and Gulf region)".

Row counts:
- `data/dfo-reftables/MV_GRID_rel1.csv` (project): 5273 lines incl. header = **5272 data rows**.
  Byte-identical to the DFO source `MV_GRID_rel1.csv` (diff = IDENTICAL).
- lobster-grid CSV = `MV_LOBSTER_GRID_rel4.csv`: 259 lines incl. header = **258 data rows**.
  NOTE: this file exists ONLY in the DFO source (`~/Desktop/DFO/ELOG_reftables/`).
  It is NOT present in the project's `data/dfo-reftables/` (project carries MV_GRID only).

Are GRID_ID->MV_GRID and LGRID_ID->MV_LOBSTER_GRID distinct? **YES, fully distinct.**
Different element ids (978 vs 979), different MV tables, different sizes (5272 vs 258),
different sensitivity (N vs Y), and structurally different value domains:
- MV_GRID DESC_FRE values are alphanumeric grid codes, e.g. `3LK20`, `4Z13`, `1GL24`.
- MV_LOBSTER_GRID DESC_FRE values are plain grid numbers, e.g. `1`, `2`, `3` ... up to ~9x.
This recon is about GRID_ID / MV_GRID only. LGRID_ID / MV_LOBSTER_GRID is a separate axis.

---

## 2. Rules verbatim (fact sheet FS-NAT-234-11-EN.pdf, pdftotext)

There is exactly ONE 613x rule and ONE 614x rule (changelog: "Renamed rules #613 and
#614 to #613x and #614x"). The literal rule numbers in the PDF are "613x" and "614x".

PDF-extraction gotcha: the rule text reads "map #42" and "map #13", but those trailing
digits are FOOTNOTE superscripts (2 and 3) that pdftotext flattened onto the map number.
The footnotes themselves read "Map NAFO Divisions and grids (map #4)" and "(map #1)".
So the real maps are **#4** (613x) and **#1** (614x), which match the first-char digits.

### Rule 613x  | nodes EFFORT, EFFORT_DETAIL | elements FMA_ID, GRID_ID
"If the Fishery Management area (Effort.Fma_id) is one of:
  Code_id 1534 = Lobster Fishing Area 22
then only the grids from map #4 are authorized. Therefore, only codes (Mv_grid.code_id)
of the Mv_grid table having the first character of the French description (Mv_grid.Desc_fre)
equal to "4" are authorized. (e.g. 4Z13)   Ref table: Mv_fma, Mv_Grid"

### Rule 614x  | nodes EFFORT, EFFORT_DETAIL | elements FMA_ID, GRID_ID
"If the Fishery Management area (Effort.Fma_id) is one of: [12 FMAs, listed in section 3]
then only the grids from map #1 are authorized. Therefore, only codes (Mv_grid.code_id)
of the Mv_grid table having the first character of the French description (Mv_grid.Desc_fre)
equal to "1" are authorized. (e.g. 1GL24)   Ref table: Mv_fma, Mv_Grid"

### Rule 1011 | nodes GENERAL_INFO, EFFORT, EFFORT_DETAIL | elements REG_ID, FMA_ID, GRID_ID
"If the DFO administrative region is Quebec (General_info.Reg_id=1006) and the Fishery
Management area (Effort.Fma_id) is ONE OF: [the 29-code QC exclusion cluster, section 3]
Then the capture of the grid (Effort_detail.Grid_id) must be BLOCKED.
Ref table: Mv_dfo_region, Mv_fma, Mv_Grid"

### Rule 1012 | nodes GENERAL_INFO, EFFORT, EFFORT_DETAIL | elements REG_ID, FMA_ID, GRID_ID
"If the DFO administrative region is Quebec (General_info.Reg_id=1006) and the Fishery
Management area (Effort.Fma_id) is NOT ONE OF: [the same 29-code QC exclusion cluster]
Then the capture of the grid (Effort_detail.Grid_id) is MANDATORY.
Ref table: Mv_dfo_region, Mv_fma, Mv_Grid"

Adjacent context (NOT 613x/614x, but GRID_ID-related): Rule 616 — "The grid
(Effort_detail.Grid_id) must cover the position recorded (Effort_detail.Lat and
Effort_detail.Long). Ref table: Mv_Grid".

Note on 1011/1012 vs the QC base requirement: GRID_ID is "Optional" for QC/88 in the
static subform table (section 5). Within Quebec, 1011 flips it to Blocked when FMA is in
the cluster, and 1012 flips it to Mandatory when FMA is outside the cluster. So in QC the
static "Optional" is always dynamically overridden to Blocked or Mandatory by the FMA.

---

## 3. The exact QC code lists referenced by the rules (real code_ids, not paraphrase)

### 1011 / 1012 — QC FMA exclusion cluster (29 code_ids; FMA_ID | description)
`25640|LFA 17b  25656|LFA 19a1  25658|LFA 19a2  25657|LFA 19a3  25636|LFA 19b`
`25659|LFA 19c1 25660|LFA 19c2 25662|LFA 20a10 25661|LFA 20a1 25673|LFA 20a2`
`25672|LFA 20a3a 25674|LFA 20a3 25675|LFA 20a4 25676|LFA 20a5 25677|LFA 20a6`
`25678|LFA 20a7 25679|LFA 20a8 25663|LFA 20a9a 25680|LFA 20a9 25664|LFA 20b1`
`25665|LFA 20b2 25666|LFA 20b3 25671|LFA 20b4 25667|LFA 20b5 25668|LFA 20b6`
`25670|LFA 20b7 25669|LFA 20b8 25635|LFA 21a  25634|LFA 21b`
(count = 29. 1011 BLOCKS grid for FMA in this set; 1012 MANDATES grid for FMA not in set.)

### 614x — FMA trigger list (12 code_ids; map #1)
`1526|LFA 15  1527|LFA 16  25641|LFA 17a  25626|LFA 18a  25627|LFA 18b  25628|LFA 18c`
`25629|LFA 18d 25630|LFA 18e 25631|LFA 18f 25632|LFA 18g 25633|LFA 18h 25637|LFA 18i`

### 613x — FMA trigger list (1 code_id; map #4)
`1534|LFA 22`

---

## 4. MV_GRID structure (data/dfo-reftables/MV_GRID_rel1.csv)

Header (3 columns): `"CODE_ID","DESC_FRE","DESC_ENG"`
Sample data rows (CODE_ID | DESC_FRE | DESC_ENG):
`29406|3LK20|3LK20   29407|3LK21|3LK21   29408|3LK23|3LK23   29409|3LK24|3LK24`
`29410|3LK26|3LK26   29411|3LJ08|3LJ08   29412|3LJ09|3LJ09   29413|3LJ11|3LJ11`
`29414|3LH25|3LH25   29415|3LH26|3LH26`

French description column = **DESC_FRE (column 2)**. In every one of the 5272 data rows
DESC_FRE is IDENTICAL to DESC_ENG (0 rows differ), so the "first char of French desc"
trick is equivalent to first char of English desc here.

First character of DESC_FRE IS a digit ("map number") in every row. Distinct leading
characters present across the whole file (char | row count):
`1 | 3259    3 | 1056    4 | 957`   (sum = 5272). Only "1", "3", "4" occur — no others.
So the string trick partitions MV_GRID into map #1 (3259 grids), map #3 (1056), map #4 (957).
Rules 613x/614x only reference maps #4 and #1; map #3 is not referenced by these rules.

---

## THE FORK — detail (crosswalk vs string trick, measured)

Crosswalk: `~/Desktop/DFO/ELOG_reftables/SPECIES_GRID_NAFO_FMA.CSV`
Header (4 cols): `SPECIES_ID,GRID_ID,NAFO_ID,FMA_ID`. 12372 data rows. CRLF line endings.
Its GRID_ID column = MV_GRID.CODE_ID. Species present: 808 Groundfish, 1277 Capelin,
1287 Rock Crab, 1288 Snow Crab, 1312 **Lobster (Homard)**, 1315 Mackerel, 1351 Shrimp,
3392 Herring, 15876 Toad Crab. Lobster (1312) has 2677 rows total.

Lobster (1312) grids per rule FMA, with MV_GRID DESC_FRE leadchar breakdown
(FMA_ID | crosswalk lobster grid count | leadchar split):
`1534  | 1166 | 4=957, 1=209      (613x says only "4"=957 -> 209 extra in crosswalk)`
`1526  |   86 | 1=86              (614x map#1; crosswalk = strict subset of 3259)`
`1527  |   58 | 1=58`
`25641 |   38 | 1=38     25626 | 46 | 1=46    25627 | 41 | 1=41    25628 | 26 | 1=26`
`25629 |   40 | 1=40     25630 | 20 | 1=20    25631 | 13 | 1=13    25632 | 14 | 1=14`
`25633 |   26 | 1=26     25637 |  6 | 1=6`
QC-cluster examples: `25640|306|1=306  25656|68|1=68  25636|27|1=27  25635|7|1=7  25634|5|1=5`

Why FMA 1534 diverges (leadchar x NAFO_ID for its 1166 lobster grids):
`4 | NAFO 11778 | 957     1 | NAFO 11778 | 111     1 | NAFO 11782 | 71`
`1 | NAFO 11783 | 12      1 | NAFO 11785 | 15`
So the crosswalk treats LFA 22 as spanning map-#4 (957) plus 209 map-#1 grids across 4
NAFO areas; rule 613x authorizes only the 957 map-#4 grids. Real, material disagreement.

Other crosswalks scanned in the package: the ONLY other file with both a grid and an FMA
column is `MV_LCSG_VS_FMA_rel3.csv` (cols LGRID_CODE_ID, LGRID_DESC_*, FMA_CODE_ID,
FMA_DESC_*). That one keys on LGRID (lobster grid -> MV_LOBSTER_GRID), NOT GRID_ID, so it
is the LGRID axis, not relevant to GRID_ID validity. For GRID_ID the only FMA->grid
crosswalk is SPECIES_GRID_NAFO_FMA.CSV.

---

## 5. Base requirement (Subforms_requirements_234.xlsx)

GRID_ID is row 84. Column headers confirmed at row 5: column G = "QC - Lobster,
Subform_id: 88"; H = GLF/89; I = MAR/90; J = NL/91.

GRID_ID row 84 values (col | value):
`C=EFFORT_DETAIL | D=GRID_ID | E=Grid | F(Element_id)=978 | G(QC/88)=Optional`
`H(GLF/89)=Blocked | I(MAR/90)=Blocked | J(NL/91)=Blocked`

So the QC/88 base value for GRID_ID is **"Optional"** (col G) — exactly as anticipated.
Rules 1011/1012 are the conditional flips on top of this base (Blocked / Mandatory by FMA).
F=978 ties this row back to the dictionary element id 978 (GRID_ID), confirming identity.

---

## Gotchas worth flagging (recon notes, not fixes)

- `SPECIES_GRID_NAFO_FMA.CSV` is CRLF; `MV_GRID_rel1.csv` is LF-only. Naive string-keyed
  joins on the crosswalk's last column (FMA_ID) silently fail unless the trailing CR is
  stripped (a numeric cast hides it; a string compare does not). This bit during recon.
- The crosswalk is species-keyed: you MUST filter to SPECIES_ID=1312 before using it for
  lobster, or you pick up groundfish/crab/etc. grids for the same FMA.
- `MV_LOBSTER_GRID_rel4.csv` is absent from the project reftables; only MV_GRID is vendored.
