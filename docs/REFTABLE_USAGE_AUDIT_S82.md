# Reftable Usage Audit (Session 82) — RECON ONLY

Read-only audit. **Nothing was deleted or moved.** This records which vendored DFO
reftable CSVs produce a generated reftable that is actually referenced by the `src/`
tree, and which fact-sheet-named reftables are absent from the folder.

## Path note (prompt said `src/data/dfo-reftables/`)
- Source CSVs actually live in **`data/dfo-reftables/`** (repo root), not under `src/`.
- Codegen (`scripts/generateReftables.js`) emits typed modules to **`src/data/reftables/`**
  (one `mv*.ts` per CSV + a generated `index.ts` barrel).
- "Referenced?" below = an import/use of the generated table **outside** the generated
  `src/data/reftables/` directory. The barrel `index.ts` self-re-exports were not counted
  as consumers. Match was checked against export names (e.g. `MV_GRID`), the TS interface
  types (e.g. `DfoGrid`), and the module basenames (e.g. `mvGrid`).

## Part 1 — CSV → generated reftable → referenced in src/?

Plain pipe-delimited (csv filename | generated export | referenced? | where):

MV_PORT_rel7.csv | MV_PORT (+ PORTS_BY_PROVINCE) | yes | dfoConstants.ts:8 import → DFO_MAR_PORT_LIST filtered view (:1374); DfoPortSelector.tsx:3 import (pool :52, PORTS_BY_PROVINCE :47)
MV_PROVINCE_rel3.csv | MV_PROVINCE | yes | dfoConstants.ts:8 import → DFO_PROVINCE_NAME_EN map (:1372); DfoPortSelector.tsx:4 import → PROVINCE_NAME_EN map (:32)
MV_CATCH_USAGE_rel1.csv | MV_CATCH_USAGE | yes | FullDfoForm.tsx:65 import → bycatch usage lookup (:88)
MV_SPECIMENS_CONDITION_rel1.csv | MV_SPECIMENS_CONDITION | yes | FullDfoForm.tsx:65 import → SAR specimen-condition dropdown (:1548, :1554)
MV_SAR_LIST_rel8.csv | MV_SAR_LIST | yes | FullDfoForm.tsx:65 import → SAR species picker via renderIncidentFields (:1532)
MV_BAIT_CONDITION_rel2.csv | MV_BAIT_CONDITION | yes | FullDfoForm.tsx:65 import → bait BT_COND_ID dropdown (:1781, :1788)
MV_PARTNERSHIP_TYPE_rel1.csv | MV_PARTNERSHIP_TYPE | yes | dfoXmlGenerator.ts:11 import → PRTNSHP_ID validation (:726); FullDfoForm.tsx:65 import → QC-88 PRTNSHP_ID picker (:1606)
MV_NOAA_MM_SPECIES_rel3.csv | MV_NOAA_MM_SPECIES | yes | dfoForm222Generator.ts:8 import → species labels (:19) + validation (:284)
MV_INCIDENT_TYPE_rel4.csv | MV_INCIDENT_TYPE | yes | dfoForm222Generator.ts:8 import → incident types (:26) + validation (:290)
MV_GRID_rel1.csv | MV_GRID | no | generated module exists; no consumer in src/ (S73: QC GRID_ID diagnosed optional + data-blocked)
MV_STAT_DISTRICT_SECTION_rel8.csv | MV_STAT_DISTRICT_SECTION | no | generated module exists; no consumer in src/ (S73: NL STAT_SECT_ID diagnosed optional + data-blocked)
MV_GEAR_DESCRIPTION_rel13.csv | MV_GEAR_DESCRIPTION | no | generated module exists; no consumer in src/
MV_CONFIDENCE_LEVEL_rel3.csv | MV_CONFIDENCE_LEVEL | no | generated module exists; no consumer in src/
MV_MM_LENGTH_CATEGORY_rel4.csv | MV_MM_LENGTH_CATEGORY | no | generated module exists; no consumer in src/
MV_MM_SPECIMENS_CONDITION_rel3.csv | MV_MM_SPECIMENS_CONDITION | no | generated module exists; no consumer in src/

Totals: 15 CSVs → 9 referenced, 6 unreferenced.

The only non-import hits for the 9 referenced tables were comments and `__tests__/*.oneoff`
fixtures; the 6 unreferenced tables had **zero** hits of any kind (comment, test, or type)
outside their own generated module.

## Part 2 — fact-sheet rule reftables NOT present in data/dfo-reftables/

The folder contains these table names (rel-suffix stripped): MV_BAIT_CONDITION,
MV_CATCH_USAGE, MV_CONFIDENCE_LEVEL, MV_GEAR_DESCRIPTION, MV_GRID, MV_INCIDENT_TYPE,
MV_MM_LENGTH_CATEGORY, MV_MM_SPECIMENS_CONDITION, MV_NOAA_MM_SPECIES, MV_PARTNERSHIP_TYPE,
MV_PORT, MV_PROVINCE, MV_SAR_LIST, MV_SPECIMENS_CONDITION, MV_STAT_DISTRICT_SECTION.

Of the seven reftables named in the fact-sheet rules, **none appear under their exact name**;
all seven are absent (fact-sheet name | present? | note):

MV_STAT_SECTION_VS_FMA | no | not present under this name; a related (but different) table MV_STAT_DISTRICT_SECTION IS in the folder — the "_VS_FMA" cross-reference mapping is a distinct table and is absent
MV_LCSG_VS_FMA | no | absent entirely
MV_FMA | no | absent; FMA/LFA lists are hardcoded in dfoConstants.ts, not ingested as a reftable
MV_LOBSTER_GRID | no | not present under this name; the folder has MV_GRID (the EFFORT.LGRID_ID grid table), which is very likely the same data under a different file name — verify the names before treating these as two tables
MV_BAIT_TYPE | no | absent; the folder has MV_BAIT_CONDITION (BT_COND_ID), a different field. Bait TYPE lists are hardcoded in dfoConstants.ts
MV_SUBFORMS | no | absent; subform registry is hardcoded (DFO_SUBFORM_REGISTRY in dfoConstants.ts)
MV_SPECIES | no | absent; catch/PCONS species lists are hardcoded in dfoConstants.ts

Note: MV_LOBSTER_GRID↔MV_GRID and MV_STAT_SECTION_VS_FMA↔MV_STAT_DISTRICT_SECTION are
flagged as close-name cousins so the gap is not over-stated — by exact file name all seven
are missing, but two have a present table that may cover the same need.
