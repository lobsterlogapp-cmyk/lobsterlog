# DFO Reference Table Ingestion Plan

Written Session 50 (June 11 2026). PLAN ONLY — no wiring code yet. To be reviewed in
Claude.ai before Session 51 begins implementation.

Sources: `docs/archive/DFO_REFTABLES_INVENTORY.md`, on-disk `~/Desktop/DFO/ELOG_reftables/`
(116 files, all CSVs Windows-1252 encoded), the Form 234 spec CSV
(`~/Desktop/DFO/ELOGS_F234/39673.234.…Homard.csv`), and the Form 222 spec CSV.

---

## 1. What Form 234 actually needs (from the form spec CSV, not guesswork)

The 234 spec CSV's `REF_MV_TABLENAME` column references exactly these tables:

| MV table (rel on disk) | Rows | Element(s) | Current state in app |
|---|---|---|---|
| MV_PORT_rel7 | 3,970 | TRIP.PORT_ID (×1), LANDING.PORT_ID (×1) | Partial — see §4 |
| MV_CATCH_USAGE_rel1 | 11 | PCONS.USG_ID | Hardcoded subset (37822 etc.) |
| MV_SPECIMENS_CONDITION_rel1 | 4 | SAR.SPCMN_COND_ID | Missing (blocks SAR node) |
| MV_BAIT_CONDITION_rel2 | 3 | BAIT_USED.BT_COND_ID | Missing |
| MV_PARTNERSHIP_TYPE_rel1 | 2 | EFFORT.PRTNSHP_ID | Missing |
| MV_BAIT_TYPE_rel8 | 63 | BAIT_USED.BT_TYP_ID | Hand-built lists in dfoConstants |
| MV_SPECIES_rel48 / MV_SPECIES_PRODUCT_FORM / MV_SPECIES_SIZE | 435/—/— | SPECIE_ID, SPECIE_FRM_ID, SPECIE_SZ_ID | Hand-built lists / constants |
| MV_SAR_LIST_rel8 | 16 | SAR.SPECIE_ID | Hand-built |
| MV_FMA / MV_GRID / MV_LOBSTER_GRID | large | FMA_ID, LGRID_ID | Hand-built (all 4 regions) |
| MV_GEAR_DESCRIPTION_rel13 / MV_GEAR_SUBTYPE | 147/— | GEAR_ID (925), GEAR_SBTYP_ID | Constants (925, 39684 list) |
| MV_TRAP_SIZE, MV_STAT_DISTRICT_SECTION, MV_SUBFORMS, MV_DFO_REGION, MV_RESPONSE, MV_FORM_VERSION, MV_SERVICE_PROVIDER | small | misc | Constants or N/A |

Form 222's spec CSV references: **MV_NOAA_MM_SPECIES_rel3 (46 rows — keyed by
`NOAA_SPECIES_CODE`, NOT `CODE_ID`)**, MV_INCIDENT_TYPE_rel4 (8), MV_MM_LENGTH_CATEGORY_rel4
(9), MV_MM_SPECIMENS_CONDITION_rel3 (5), MV_CONFIDENCE_LEVEL_rel3 (4),
MV_GEAR_DESCRIPTION_rel13 (147), plus generic MV_DFO_REGION / MV_RESPONSE / MV_PROVINCE.

⚠️ The current `MARINE_MAMMAL_SPECIES` codeIds in `dfoForm222Generator.ts` (10001–10099)
are **invented placeholders** — the real lookup is MV_NOAA_MM_SPECIES. This ingestion is a
hard prerequisite of the Form 222 restructure.

---

## 2. Recommended approach: build-script codegen from vendored CSVs

### Options considered

**A) Hand-maintained constants (status quo)**
- ✅ No tooling; works today.
- ❌ Error-prone at scale (3,970 ports), no provenance/version tracking, painful on DFO
  updates. Standard v6.1 §15 requires DFO code-table changes to be replicated into the
  app — hand-editing doesn't scale to that obligation.
- ❌ Encoding hazard: the CSVs are Windows-1252; hand-paste mangles French accents
  (XML must be UTF-8 with correct accents, Standard §3.11).

**B) JSON assets bundled via Metro (`require('./ports.json')`)**
- ✅ No codegen step; Metro inlines JSON.
- ❌ Still needs a one-time CSV→JSON conversion (encoding + quoting), so tooling isn't
  actually avoided — it's just untyped.
- ❌ No TypeScript types, no per-table helper functions, weaker greppability.
- ➖ Bundle impact identical to TS constants (both end up in the JS bundle).

**C) Build-script generation: CSV → typed TS modules (RECOMMENDED)**
- One Node script (`scripts/generateReftables.js`), run manually when DFO ships new rel
  versions; **generated `.ts` files are committed** so the build has zero extra steps.
- Reads vendored CSVs, handles Windows-1252 → UTF-8 and proper CSV quoting (MV_PORT has
  quoted multi-word and comma-containing names), emits one module per table under
  `src/data/reftables/` with a header comment recording source file + rel version + row
  count + generation date.
- ✅ Type-safe, diffable regeneration (a new rel produces a reviewable git diff —
  exactly what §15 compliance needs), FR+EN descriptions preserved for i18n.
- ❌ Small one-time tooling cost (~an hour, the CSVs are simple).

**Vendor the source CSVs into the repo** under `data/dfo-reftables/` (only the tables we
ingest, ~0.5 MB total — NOT the 5,804-row MV_COMMUNITIES or Pacific-only tables). This
pins provenance, makes regeneration reproducible on any machine, and survives the
`~/Desktop/DFO` folder moving.

### Module shape (sketch — not final code)

```ts
// src/data/reftables/mvPort.ts — GENERATED from MV_PORT_rel7.csv (3,970 rows, 2026-06-11)
export interface DfoPort { codeId: number; nameEn: string; nameFr: string; provCodeId: number | null; }
export const MV_PORT: DfoPort[] = [ /* … */ ];
export const PORTS_BY_PROVINCE: Record<number, DfoPort[]> = /* … */;
```

Small tables (≤16 rows) can keep the existing `{ codeId, label }` convention used by
pickers so FullDfoForm wiring stays mechanical.

Bundle note: full MV_PORT ≈ 250–300 KB of source — acceptable (the app already embeds
2,229 ports today); everything else is tiny.

---

## 3. Priority order

| # | Table | Why | Unblocks |
|---|---|---|---|
| **P1** | **MV_PORT_rel7** | LANDING.PORT_ID is the **only remaining xmllint error** for MAR-90 (open Q4); also TRIP.PORT_ID for QC(88)/NL(91) | First clean transmission |
| P2 | MV_CATCH_USAGE_rel1 | PCONS.USG_ID picker (Session 48 item 7 UI half; generator TODO already lists the codes) | PCONS on bycatch entries |
| P3 | MV_SPECIMENS_CONDITION_rel1 | SAR.SPCMN_COND_ID — with Q3 (MODE) now resolved, this is the last data gap for SAR node emission | SAR detail node |
| P4 | MV_BAIT_CONDITION_rel2 | BAIT_USED.BT_COND_ID (3 rows) | BAIT_USED restructure |
| P5 | MV_PARTNERSHIP_TYPE_rel1 | EFFORT.PRTNSHP_ID / USE_CR_IND (2 rows) | Partnership question UI |
| P6 | Form 222 cluster (MV_NOAA_MM_SPECIES, MV_INCIDENT_TYPE, MV_MM_LENGTH_CATEGORY, MV_MM_SPECIMENS_CONDITION, MV_CONFIDENCE_LEVEL, MV_GEAR_DESCRIPTION) | Replaces invented species codes; required by F222 XSD restructure | Form 222 rebuild |

**Deferred (verification pass, not ingestion):** the hand-built FMA/bait-type/species/
LGRID lists in `dfoConstants.ts` should later be *diffed against* MV_FMA, MV_BAIT_TYPE_rel8,
MV_SPECIES_rel48, MV_SAR_LIST_rel8, MV_GRID/MV_LOBSTER_GRID to catch typos — but they
exist and work, so they are not on the ingestion critical path.

---

## 4. MV_PORT integration vs the existing DFO_MAR_PORT_LIST

**Finding (verified this session):** `DFO_MAR_PORT_LIST` (2,229 entries) is *exactly*
MV_PORT_rel7 filtered to Nova Scotia (1,317) + New Brunswick (563) + PEI (349). Same
CODE_IDs. It was evidently derived from this very table.

**Decision: SUPPLEMENT — generate the full table; keep MAR behavior as a filtered view.**

- Generate the full 3,970-row module with province metadata (prov codes: NS 180, NB 176,
  PEI 188, QC 190, NL 178; 11 rows have no province — foreign ports like NUUK, keep them
  reachable via search).
- Province counts available per subform default filter:
  - 90 MAR → NS+NB+PEI (2,229 — identical to today, zero behavior change)
  - 88 QC → QC (327)
  - 89 GLF → NB+PEI+NS subset (pending Kane's blocked-vs-mandatory answer for GLF
    LANDING.PORT_ID — don't build the GLF picker until that lands)
  - 91 NL → NL (1,038)
  - Always offer "search all ports" fallback (fishers can land outside their region).
- `DFO_MAR_PORT_LIST` itself: replace its backing data with a filtered re-export of the
  generated module **in one commit with no shape change** (`{ codeId, name, province }`
  kept), so `dfoConstants.ts` consumers and the validator don't change. Delete the inline
  2,229-entry literal (≈ 11k lines out of dfoConstants.ts).

**UI consequence (Session 51 scope, listed for completeness):** `PortSelector` in
FullDfoForm currently stores free-text names (`portLanded` / `departurePort` strings,
plus user-managed `savedPorts`). It must become a typeahead over the reftable that stores
`{ name, codeId }`, because the XSD wants integer PORT_ID. Recents/favourites can keep
working as pointers into the reftable.

---

## 5. Backwards-compatibility risks

1. **Drafts and saved logs store port *names*, not codes** (`data.portLanded`,
   `data.departurePort`). Mitigation: on draft load, resolve name → codeId by exact
   case-insensitive match against the generated table (names in DFO_MAR_PORT_LIST came
   from MV_PORT, so MAR drafts should resolve ~100%). Unresolved → field flagged for
   re-pick; the existing validator already blocks sends with missing PORT_ID, so nothing
   silently transmits wrong.
2. **No sent-log rewrite risk:** nothing has ever been transmitted to DFO (first
   transmission is still blocked on Q4), and sent logs are read-only with XML archives
   immutable for 3 years — migrations must never touch `XmlArchiveEntry`.
3. **Custom saved ports** (user-typed in PortSelector) may not match any DFO port.
   Mitigation: keep them as display labels but require mapping to a real code before
   send; offer nearest-match suggestions.
4. **CODE_ID stability across rel versions:** CODE_IDs are DFO database keys; new rels
   append/retire rows but don't renumber. Regeneration diffs are therefore reviewable and
   stored codeIds in drafts stay valid.
5. **Encoding:** all generation must read Windows-1252 and emit UTF-8 — French port names
   (Î, é) corrupt otherwise and would poison the XML (§3.11).

---

## 6. Suggested sequencing

- **Session 51:** `scripts/generateReftables.js` + vendored CSVs + generated MV_PORT
  module + DFO_MAR_PORT_LIST re-export swap + PortSelector typeahead storing codeId +
  TRIP/LANDING PORT_ID emission unblocked → re-run MAR-90 xmllint fixture (expect FULL
  validation, closing open Q4 for MAR).
- **Session 52:** small pickers — MV_CATCH_USAGE (USG_ID), MV_SPECIMENS_CONDITION (SAR),
  MV_BAIT_CONDITION, MV_PARTNERSHIP_TYPE — plus the SAR UI fields (NB_SPCMN,
  SPCMN_COND_ID) now that Q3 is resolved.
- **Session 52/53:** Form 222 cluster ingestion inside the Form 222 restructure.

## 7. Open questions for DFO (Kane) that gate parts of this

- GLF (89) LANDING.PORT_ID: blocked or mandatory? (Gates the GLF picker filter only.)
- None of the rest of this plan depends on DFO answers.
