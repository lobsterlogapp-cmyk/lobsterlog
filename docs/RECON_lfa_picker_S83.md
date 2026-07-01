# RECON — LFA picker sort + search — S83

RECON ONLY. No code changed, no commits. Findings read off FullDfoForm.tsx +
dfoConstants.ts. Counts verified by a throwaway parser (the FMA lists end with
`] as const;`, so the parser stops there — an early draft that split on `];`
falsely merged the lists; the numbers below are from the corrected parse and
cross-check against the S83 orphan recon).

## ANSWER FIRST — is reordering safe?

YES. Selecting an area stores the area's CODE (`fmaId = f.codeId`), never its
index/position. No positional logic depends on current list order. Reordering the
arrays only changes display order; nothing else.

## 1. The picker (FullDfoForm.tsx)

Source per subform: `getDfoFmaList(subformId)` (dfoConstants.ts:1695) switches —
88 → DFO_FMA_LIST_QC | 89 → DFO_FMA_LIST_GLF | 91 → DFO_FMA_LIST_NL | 90/default → DFO_FMA_LIST (MAR).
Render (FullDfoForm.tsx:1288): `getDfoFmaList(subformId).map(f => ...)` in array order.
Selected label (line 1282): `.find(f => f.codeId === fmaId)?.label` — lookup by code.
onPress (lines 1292-1300): `setFmaId(f.codeId)` then clears lgrid/statSect/grid + closes picker.
Stores CODE, not index → reorder-safe.

## 2. Order-dependence check — result: NONE positional

No `[0]` / `findIndex` / index-based default on any of the four lists.
FullDfoForm: uses `.find()` + `.map()` only (order-independent).
CaptainProfileScreen.tsx:168 uses a SEPARATE constant `LFA_OPTIONS` (not these four);
its only positional bit is last-row styling (`index === LFA_OPTIONS.length - 1`),
self-referential; selection maps label→code via `DFO_FMA_LIST.find(f => f.label === option)`.
dfoLogStorage.ts:4 imports DFO_FMA_LIST (import only; no positional use).
Tests set fmaId by code string (e.g. '25640','1526','2071'); none assert list order.

## 3. Current order — MAR (DFO_FMA_LIST, subform 90/default) | len 16

LFA 27|1581  LFA 28|1582  LFA 29|1583  LFA 30|1584  LFA 31a|1585  LFA 31b|1586
LFA 32|1587  LFA 33|1588  LFA 34|1589  LFA 35|1590  LFA 36|1591  LFA 37|1592
LFA 38|1593  LFA 40|1594  LFA 41|1595  Area 38b|28599

## 3. Current order — QC (DFO_FMA_LIST_QC, subform 88) | len 40

LFA 17b|25640  LFA 19a1|25656  LFA 19a2|25658  LFA 19a3|25657  LFA 19b|25636
LFA 19c1|25659  LFA 19c2|25660  LFA 20a10|25662  LFA 20a1|25661  LFA 20a2|25673
LFA 20a3a|25672  LFA 20a3|25674  LFA 20a4|25675  LFA 20a5|25676  LFA 20a6|25677
LFA 20a7|25678  LFA 20a8|25679  LFA 20a9a|25663  LFA 20a9|25680  LFA 20b1|25664
LFA 20b2|25665  LFA 20b3|25666  LFA 20b4|25671  LFA 20b5|25667  LFA 20b6|25668
LFA 20b7|25670  LFA 20b8|25669  LFA 21a|25635  LFA 21b|25634  LFA 22|1534
LFA 17a|25641  LFA 18a|25626  LFA 18b|25627  LFA 18c|25628  LFA 18d|25629
LFA 18e|25630  LFA 18f|25631  LFA 18g|25632  LFA 18h|25633  LFA 18i|25637
(note: jumbled — 20a10 sits before 20a1; 17a/18a-18i dangle at the end after 22)

## 3. Current order — GLF (DFO_FMA_LIST_GLF, subform 89) | len 14

LFA 15|1526  LFA 16|1527  LFA 17a|25641  LFA 23a|39522  LFA 23b|39523
LFA 23c|39524  LFA 23d|39525  LFA 24|1577  LFA 25|1578  LFA 26a1|39526
LFA 26a2|39527  LFA 26a3|39528  LFA 26b-North|39529  LFA 26b-South|39530

## 3. Current order — NL (DFO_FMA_LIST_NL, subform 91) | len 19

LFA 01|2071  LFA 02|1652  LFA 03|1653  LFA 04a|2073  LFA 04b|1654  LFA 05|1655
LFA 06|2075  LFA 07|2077  LFA 08|2079  LFA 09a|39674  LFA 09b|39675  LFA 10|2083
LFA 11|2085  LFA 12|2087  LFA 13a|2089  LFA 13b|2091  LFA 14a|2093  LFA 14b|2095  LFA 14c|2097

## 4. Proposed QC natural sort (numeric-aware, label only, top→bottom)

LFA 17a | LFA 17b | LFA 18a | LFA 18b | LFA 18c | LFA 18d | LFA 18e | LFA 18f
LFA 18g | LFA 18h | LFA 18i | LFA 19a1 | LFA 19a2 | LFA 19a3 | LFA 19b | LFA 19c1
LFA 19c2 | LFA 20a1 | LFA 20a2 | LFA 20a3 | LFA 20a3a | LFA 20a4 | LFA 20a5
LFA 20a6 | LFA 20a7 | LFA 20a8 | LFA 20a9 | LFA 20a9a | LFA 20a10 | LFA 20b1
LFA 20b2 | LFA 20b3 | LFA 20b4 | LFA 20b5 | LFA 20b6 | LFA 20b7 | LFA 20b8
LFA 21a | LFA 21b | LFA 22
Sub-letter pairs handled: 20a3 → 20a3a, 20a9 → 20a9a; and 20a10 sorts AFTER 20a9a
(numeric-aware), not after 20a1. Sort key: split text after "LFA " into digit/non-digit
runs, digits compared as ints, a prefix sorts before the longer string.

## 5. List lengths (search/virtualization need)

QC | 40   (longest — natural sort + optional search most useful here)
NL | 19
MAR | 16
GLF | 14
None approach the QC GRID picker's ~3,259 rows, so virtualization is NOT required for
LFA pickers; sort fixes ordering, and a small search box is a nicety for QC at 40.
