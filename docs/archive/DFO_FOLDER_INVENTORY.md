ARCHIVED June 11 2026 — historical/reference; see CLAUDE.md for current status.

# ~/Desktop/DFO/ — Full Folder Inventory (June 11 2026, diagnostic)

Companion to `DFO_REFTABLES_INVENTORY.md` (full per-CSV detail of ELOG_reftables/).
Read-only survey; nothing in the DFO tree was modified.

## Top-level files

| File | Size | What it is |
|---|---|---|
| `DFO_234_Full_Extraction.md` | 78K | Text extraction of the 234 package (XML dictionary rows, rules) — working doc |
| `Test_values_LobsterLog.pdf` | 255K | Test values document for LobsterLog |
| `TRG-Logbooks-GRT-JB.xlsx` | 22K | **DFO qualification test grid — Logbooks.** Sheets: "Technical revision grid - ENG"/FR. The actual test-case checklist DFO uses to qualify the app (e.g. "Send a logbook with a fishing effort and no catch"), with columns for XML file name, compliant Y/N, screenshots to include with the qualification request |
| `TRG-MMammals-GRT-Mammiferes-marins.xlsx` | 19K | **DFO qualification test grid — Form 222.** Sheets MM-ENG/MM-FR: per-test XSD-compliant Y/N, transmission-register screenshots, French-character test, INTERACT_IND variants |

## ELOG_WebService/ ⭐ (resolves the endpoint blocker)

| File | Size | What it is |
|---|---|---|
| `ELOG_Web_Service_3_6_Eng.pdf` | 492K | Web Service technical guide v3.6 (June 2022) |
| `JBE_Service_Web_3_6_Fr.pdf` | 562K | French version |
| `Readme.txt` / `Lisez-moi.txt` | 1.4K | Version history v3.2 (2017) → v3.6 (2022; adds Form 233 return messages) |

**Extracted from the spec (ElogXMLFileTransfer web service):**
- **TEST/UAT endpoint:** `https://inter-w01-uat.dfo-mpo.gc.ca/ws/ElogXMLFileTransfer/ElogXMLFileTransfer.asmx`
- **PRODUCTION endpoint:** `https://inter-w01.dfo-mpo.gc.ca/ws/ElogXMLFileTransfer/ElogXMLFileTransfer.asmx`
- **Transmission method: `SaveIncomingFile`** — namespace `http://tempuri.org/`, three params, ALL base-64 encoded: `p_elogkey` (ELOG key b64), `p_filename` (file name b64, `.XML` or `.7Z` extension), `p_body` (the XML document b64)
- **`ValidateElogKey`** method — verify an ELOG key without sending data (good first integration test)
- Other methods (CreateLogString, DeleteLog, …) reserved for DFO internal use
- ⚠️ **The app's `generateSoapEnvelope()` does NOT match this contract** — it invents `elog:SubmitElog` + an `elog:Authentication` header in an `http://www.dfo-mpo.gc.ca/elog` namespace and embeds the XML escaped-inline rather than base-64. Transmission layer needs a rewrite to `SaveIncomingFile` before any send can work. (Same for the Form 222/233 SOAP builders.)

## ELOGS_F234/ (already in active use)

| File | What it is |
|---|---|
| `39673.234...Homard_20260130 000000.xsd` (21K) | THE Form 234 XSD (authority for S1–S4) |
| `39673.234...Homard.csv` / `.xlsx` | Form 234 fact-sheet data dictionary |
| `FS-NAT-234-11-EN.pdf` / `-FR.pdf` (1.4M/2.1M) | Fact sheet v234.11 EN/FR |
| `DFO instructions_NAT_234.6_ENG.pdf` / `_FRE.pdf` | DFO Instructions v234.6 — **French version IS on disk** |
| `Subforms_requirements_234.xlsx` / `Sous-formulaires-exigences_234.xlsx` | Subform field requirements EN/FR |
| `NAT - Structure XML Homard - Lobster XML Structure.pdf` | XML structure diagram |

## ELOG_F222/

| File | What it is |
|---|---|
| `39588.222...mammifäre marin_20260108 000000.xsd` (13K) | **Form 222 XSD (Jan 2026)** |
| `39588.222...csv` / `.xlsx` | Form 222 fact-sheet dictionary (has REF_MV_TABLENAME column) |
| `FS-NAT-222-1-EN.pdf` / `-FRE.pdf` | Fact sheet 222-1 EN/FR |
| `DFO instructions_222-1 0_eng.pdf` / `_fre.pdf` | Instructions EN/FR |
| `Paper_form_vs_XML_structure.pdf` | Paper→XML field mapping |
| `Structure XML ... Marine Mammals National XML Structure.pdf` | XML structure diagram |

**F222 findings:**
- Species lookup is **`MV_NOAA_MM_SPECIES`** (on disk, 46 rows, NOAA codes) backing element
  **`NOAA_SPECIE_COD`** — NOT `MV_MM_SPECIES`/`SPECIE_ID`. The "missing MV_MM_SPECIES"
  flagged earlier belongs to the 234 dictionary's MM_INTER rows, not to Form 222 v222-1.
  **The Form 222 species-code dependency is resolved on disk.**
- Other F222 lookups all on disk: MV_INCIDENT_TYPE, MV_MM_LENGTH_CATEGORY,
  MV_MM_SPECIMENS_CONDITION, MV_CONFIDENCE_LEVEL, MV_RESPONSE (Y/N), MV_PROVINCE,
  MV_GEAR_DESCRIPTION, MV_SPECIES (target species), MV_SERVICE_PROVIDER.
- ⚠️ **The 2026 F222 XSD element set differs sharply from the app's Form222 generator**
  (XSD: `MM_INTER`/`MM_INTER_INCDNT` nesting, `NOAA_SPECIE_COD`, `NB_SPCMN_MIN/MAX/BEST`,
  `INCDNT_TYP_ID`, `BDY_LEN_ID`, `ID_CNFDNCE_ID`, contact `NAME/ADDR/PHONE/EMAIL` vs app's
  flat `SPECIE_ID`, `NB_ANIMAL`, `INTERACT_TYPE_ID`, `INJURY_IND/DEATH_IND/...`).
  Form 222 likely needs its own 234-style restructure audit before qualification.

## ELOG_F233/

| File | What it is |
|---|---|
| `43792.233...inactivitÇ_20260108 000000.xsd` (13K) | **Form 233 XSD (Jan 2026)** |
| `43792.233...csv` / `.xlsx` | Form 233 fact-sheet dictionary |
| `FS-NAT-233-2-EN.pdf` / `-FR.pdf` | Fact sheet 233-2 EN/FR |
| `DFO instructions_NAT_233-2_eng.pdf` / `_fre.pdf` | Instructions EN/FR |
| `NAT - Structure XML Rapport d'inactivité...pdf` | XML structure diagram |

**F233 findings:** XSD elements: `ELOG → GENERAL_INFO (CIE_ID, SOFT_VER, REG_ID, FIN, VRN,
FORM_VER_ID) + REPORT (REPORT_UID?, LIC_NO, LOGBOOK_UID_REFERED?, …) → REPORT_DTL
(START_DT, END_DT, REASON, REM?, DG_CLOSE_DT)`. Note `REPORT_UID` legitimately exists in
THIS form's XSD (unlike 234). Needs an audit of `dfoForm233Generator.ts` against this
2026 XSD before un-hiding the Form 233 button. Lookups: only MV_DFO_REGION,
MV_FORM_VERSION, MV_SERVICE_PROVIDER (REASON appears to use letter codes per fact sheet).

## ELOG_dict/

| File | What it is |
|---|---|
| `XML_dictionary.csv` (288K, 958 rows) | **Master XML element dictionary** — every ELOG element across all forms: datatype, max length, mask, neg/decimal allowed, sensitive-data flag, unit, MV lookup table. Source of the 234 extraction; authoritative for element-level validation rules |
| `Explanations_XML_data_dictionary.pdf` / FR | How to read the dictionary |

## ELOG_standard/

| File | What it is |
|---|---|
| `ELOG_Client_Application_Standard_v6.1.pdf` (1.0M) | **"Standard for Development of ELOG Client Applications" v6.1** — the compliance document CLAUDE.md's header cites ("conforms to DFO Standard v6.0" — note on-disk is v6.1; folder Readme documents 6.0→6.1 history) |
| `Normes_appl_cliente_JBE_v6.1.pdf` | French version |

## ELOG_grids/

Maps 1/3/4 of lobster grids (PDF, 2017) + `Grids-Explanations.pdf` EN/FR — interpretation
of grid limits backing LGRID_ID/MV_LOBSTER_GRID.

## Maps of NAFO areas 2025-08-21/

Four NAFO area map PDFs + EN/FR readmes + links. Reference material for NAFO_ID
(SPECIES_GRID_NAFO_FMA cross-validation); no codes.

## ELOG_reftables/

112 CSV reference tables — fully inventoried in `DFO_REFTABLES_INVENTORY.md`.

---

## Cross-reference vs open dependencies (master prompt)

| Dependency | Status after this inventory |
|---|---|
| DFO test endpoint URL (Ticket #2126) | ✅ **ON DISK** — UAT URL in WebService spec §2 (confirm against DFO email, but it's printed in the official guide) |
| WSDL / SOAP contract | ✅ ON DISK — `SaveIncomingFile`, tempuri.org ns, base-64 params. **App SOAP layer doesn't match — rewrite needed** |
| MV_MM_SPECIES ("genuine Kane ask") | ✅ **RESOLVED** — F222 v222-1 actually uses `MV_NOAA_MM_SPECIES` (on disk) for `NOAA_SPECIE_COD`; MV_MM_SPECIES was a 234-dictionary MM_INTER reference, not a F222 need |
| Form 233 XSD / fact sheet / instructions | ✅ ON DISK (XSD dated Jan 2026) — audit generator against it |
| Form 222 reference tables | ✅ ALL on disk (incident types, wound severity n/a in v1, MM acts, lengths, conditions, NOAA species) |
| ELOG Client Application Standard | ✅ ON DISK — v6.1 (app docs cite v6.0; review the 6.0→6.1 deltas) |
| DFO Instructions in French | ✅ ON DISK — 234.6 FRE, 222-1 fre, 233-2 fre |
| Qualification test cases | ✅ ON DISK — the two TRG xlsx grids ARE the qualification checklists |
| GLF LANDING.PORT_ID contradiction | ❌ still a Kane question |
| LAT/LONG MODE M-vs-G (open Q3) | ❓ likely answered in FS-NAT-234-11 / XML dictionary MASK rows — targeted read recommended |