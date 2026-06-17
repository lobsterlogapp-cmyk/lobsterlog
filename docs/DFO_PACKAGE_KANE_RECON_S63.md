# DFO Package Recon — Open Questions for Kane Patterson (S63)

**Date:** 2026-06-16
**Scope:** Read-only search of `~/Desktop/DFO/`. No app code written or changed.
**Authoritative sources used (priority order):** `ELOG_standard/` (Standard v6.1),
`ELOGS_F234/Subforms_requirements_234.xlsx`, the logbook XSD in `ELOGS_F234/`,
`ELOG_dict/XML_dictionary.csv`, the fact sheet `FS-NAT-234-11-EN.pdf`, the French/English
instruction PDFs, `ELOG_WebService/`.

**Tooling note:** the sandbox had no `pdftotext`. Installed `poppler` via Homebrew and extracted
every relevant PDF with `pdftotext -layout` to temp `.txt` files for grepping. All PDFs extracted
cleanly (Standard 1890 lines, fact sheet 2445, web service 644, instr-234 505, instr-233 151).
CSV/reftable greps were run with `LC_ALL=C` (latin-1).

**Subform → column / id map** (used throughout `Subforms_requirements_234.xlsx`):
`G = QC (88)`, `H = GLF (89)`, `I = MAR (90)`, `J = NL (91)`.

---

## Q2 — GLF `LANDING.PORT_ID`: mandatory or blocked? → **ANSWERED**

**Verdict:** `LANDING.PORT_ID` is **MANDATORY** for GLF-89 (and for all four subforms). It is **not**
blocked.

**Source — `ELOGS_F234/Subforms_requirements_234.xlsx`, sheet1 row 100:**
> `LANDING | PORT_ID | Port of landing | (element_id 201) | QC:Mandatory | GLF:Mandatory | MAR:Mandatory | NL:Mandatory`

**Corroboration — logbook XSD** `ELOGS_F234/39673.234…Homard_20260130 000000.xsd`:
- `landing_type` → `PORT_ID minOccurs="1"` (line 362) — required whenever a LANDING node exists.
- `LANDING` node itself is `minOccurs="0"` at trip level (line 223), but fact sheet **Rule 2011** says
  "There must be at least one occurrence of the data group LANDING for each fishing trip/logbook"
  (across all XML files composing the logbook, not necessarily each file).

**Watch out (don't confuse two PORT_IDs):**
- `TRIP.PORT_ID` = **Port of departure** is **Blocked** for GLF and MAR (row 19:
  `TRIP | PORT_ID | Port of departure | GLF:Blocked | MAR:Blocked`).
- `LANDING.VRN` (transport vessel) is **Blocked** for GLF (row 99).

**Plain language:** GLF must emit the *landing* port and must not emit a *departure* port; the landing
port is required, the transport VRN is forbidden.

---

## Q3 — SAR detail emission scope (fields + mandatory/optional per subform) → **ANSWERED**

**First, the disambiguation:** SAR = **Species At Risk** (not search-and-rescue).
- `ELOGS_F234/DFO instructions_NAT_234.6_ENG.pdf` line 262-265: "Species at Risk Section — The
  information related to Species at Risk (SAR) must be completed for each interaction with a SAR…"
- Fact sheet Rule 603 label: "Was there any interaction with a species at risk during this fishing effort?"

**Required fields of a SAR detail node** — identical across all four subforms (QC/GLF/MAR/NL).
Source `Subforms_requirements_234.xlsx` rows 32-40, mirrored by the XSD `sar_type` (lines 240-253):

| Field | Requirement | XSD |
|---|---|---|
| `SAR_DT` (date/time) | **Mandatory** | minOccurs=1 |
| `LAT` | **Mandatory** | minOccurs=1 |
| `LONG` | **Mandatory** | minOccurs=1 |
| `SPECIE_ID` ("Code of the species at risk") | **Mandatory** | minOccurs=1 |
| `NB_SPCMN` (number of specimens) | **Mandatory** | minOccurs=1 |
| `SPCMN_COND_ID` (condition of specimens) | **Mandatory** | minOccurs=1 |
| `DG_CLOSE_DT` | **Mandatory** | minOccurs=1 |
| `WT` (total estimated weight) | **Optional** | minOccurs=0 |
| `REM` (comments) | **Optional** | minOccurs=0 |

**Is the SAR detail node itself mandatory or optional?** **Optional / conditional — prompted, not hard-enforced.**
- XSD: `SAR minOccurs="0" maxOccurs="unbounded"` (line 218).
- Fact sheet **Rule 1002**: "Sar — If this data group is used: Must contain at least one occurrence of
  the node Sar." (conditional-use, not always-required)
- Fact sheet **Rule 604** (`EFFORT.SAR_IND`): "When the answer is 'Yes' (Effort.Sar_ind='Y'), then the
  following message must be displayed: …'Please, complete the section concerning species at risk
  interactions.'" — i.e. a **display prompt**, not a blocking validation.
- Fact sheet **Rule 1051**: "The client application must not force the user to complete a section (data
  group) of the logbook except if a rule of the fact sheet explicitly ask for it." No rule explicitly
  forces SAR emission when `SAR_IND='Y'`.
- `EFFORT.SAR_IND` itself is **Mandatory** (Y/N) for all subforms (req sheet row 67; XSD line 296), and
  must default to null, not Y/N (Rule 602).

**On the "13th REM node":** the XSD contains **exactly 13** `REM` elements (TRIP, BAIT_USED, **SAR**,
HLIN, HLOUT, PCONS, EFFORT, EFFORT_BY_GEAR, EFFORT_DETAIL, CATCH, LANDING, TRANSFER, TRANSFER_DTL —
GENERAL_INFO has none). `SAR.REM` is one of them and is optional even when a SAR node is present; it
only exists at all if a SAR node is emitted. So SAR emission does gate the existence of that REM slot.

**Plain language:** When a SAR node is written it requires 7 fields (date, lat, long, species, count,
condition, close-date); weight and remark are optional; rules are the same for every subform. Emitting
a SAR node is **conditional and only soft-prompted** when `SAR_IND='Y'` — the package requires you to
*prompt* the user, not to *block* on a missing SAR. (One residual judgment call below in STILL NEEDS KANE.)

---

## Q5 — "Rule 528" (the VRN citation) → **NOT FOUND** (rule) / **ANSWERED** (real VRN constraint)

**Verdict:** There is **no "Rule 528"** anywhere in the package. The string `528` never appears as a rule
number in the Standard, the fact sheet, the instructions, or the web service docs (it only shows up as
incidental substrings of data values in reftables — hook sizes, species/grid IDs). The fact sheet *does*
number its rules (a "Rule No." column: e.g. 1, 7, 11, 12, 251, 252, 602, 604, 630, 631, 978a–c, 1000,
1051, 2010, 2011, 2020 …) — **528 is simply not among them.** Treat "Rule 528" as a phantom citation.

**What the package actually says the VRN constraint is:**
- **XSD** `string_12`: base `string` with `maxLength=12` and (from base `string`) `minLength=1`
  (lines 48-52); applied to `GENERAL_INFO.VRN` (line 196), `LANDING.VRN`, `TRANSFER.FROM_VRN/TO_VRN`.
- **Dictionary** `ELOG_dict/XML_dictionary.csv`, element_id 268 (`GENERAL_INFO.VRN`):
  `DATATYPE=CHAR, MAX_LENGTH=12, MASK="" (none), LIST_OF_VALUES_IND="Y", TEST_VALUE=555555`.
  → VRN is **CHAR(12)** validated **against an authorized list of values** (DFO's registered-vessel
  list), **not** against a format mask/regex. No format regex is specified anywhere.
- VRN-related numbered rules that *do* exist: **251 / 252** (Transfer From/To VRN — only one of VRN /
  name / pound number per transfer) and the `LANDING.VRN` blocked rules (~fs234 line 2043).

**Plain language:** Build to "VRN = up to 12 chars, validated against DFO's vessel list," not to any
"Rule 528" format. The citation Kane referenced doesn't exist in this package.

---

## Q6 — SOAP namespace (tempuri.org vs dfo-mpo.gc.ca) → **ANSWERED** (with a live-WSDL caveat)

**Verdict:** The package itself specifies **`http://tempuri.org/`** as the SOAP element/operation
namespace, and that reference is **real** — it appears in the normative envelope examples, not as a
throwaway. `dfo-mpo.gc.ca` appears **only as the endpoint host URL**, never as a namespace.

**Every relevant namespace string in `ELOG_WebService/ELOG_Web_Service_3_6_Eng.pdf`:**
- §3.1.2.2.1 "Manually written SOAP envelope example" (SaveIncomingFile):
  `<SaveIncomingFile xmlns="http://tempuri.org/">` (extracted line 222)
- §3.2.2.2.1 "Manually written SOAP envelope example" (ValidateElogKey):
  `<ValidateElogKey xmlns="http://tempuri.org/">` (extracted line 459)
- Standard SOAP envelope namespaces in both examples: `xmlns:xsi=".../XMLSchema-instance"`,
  `xmlns:xsd=".../XMLSchema"`, `xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"`.
- `dfo-mpo.gc.ca` only as the **service URL** (lines 104/111):
  `https://inter-w01-uat.dfo-mpo.gc.ca/ws/ElogXMLFileTransfer/ElogXMLFileTransfer.asmx` (UAT) and the
  prod equivalent `https://inter-w01.dfo-mpo.gc.ca/ws/...`.

**Important gap:** the package ships **no WSDL and no `.asmx` file** (`find` for `*.wsdl`/`*.asmx` = none).
So the claim "the live WSDL uses `http://www.dfo-mpo.gc.ca`" **cannot be confirmed or refuted from the
package** — there is nothing to compare against.

**Plain language:** Per the docs, build the SOAP body with `xmlns="http://tempuri.org/"` and POST to the
`dfo-mpo.gc.ca` `.asmx` endpoint — those are two different things (namespace vs host), and the guide is
internally consistent. If the *live* service's WSDL really overrides the namespace to `dfo-mpo.gc.ca`,
that's a runtime fact not in this package and must be checked against the actual WSDL (see STILL NEEDS KANE).

---

## Q8 — Form 233 (Inactivity Report) TRG path → **NOT FOUND**

**Verdict:** **No 233-specific TRG grid ships in the package**, and the logbook grid does **not** cover 233.

- `TRG-Logbooks-GRT-JB.xlsx` — titled "Qualification - Logbook technical revision grid". Its test cases
  are **logbook-specific**: #1 send logbooks with ALL elements, #2 all MANDATORY elements,
  **#3 "Send a logbook including a fishing effort having no species caught"**, #4 French characters,
  #5 client screenshots, #6 transmission log. The "Form:" / "Form version id:" header cells are blank
  (filled per engagement). **No "233" or "inactivity" string anywhere** in the file.
- `TRG-MMammals-GRT-Mammiferes-marins.xlsx` — titled "Technical verification grid - Marine Mammals
  Interaction Form (222)". Form 222 only; no 233.
- `ELOG_F233/Readme.txt` lists the entire 233 package (CSV, XLSX, XSD, fact sheet FS-NAT-233-2,
  instructions, XML-structure PDF) — **no TRG / revision grid is included.**

**Plain language:** There's no inactivity-report test grid in hand, and the logbook grid's tests don't
fit an inactivity report. Whether DFO grades 233 under the logbook grid or issues a separate grid is
genuinely unspecified here → needs Kane.

---

## Q9 — `T3` `KEPT_WT`-on-no-catch for GLF-89 / MAR-90 → **ANSWERED**

**Verdict:** A **zero-catch / effort-only logbook IS permitted** for GLF-89 and MAR-90. The mandatory
`KEPT_WT` does **not** invalidate no-catch — it means the field must carry a **value of 0** on no catch
(not be left empty). You still emit one CATCH node for the target (lobster) species with `KEPT_WT=0`.

**Source — fact sheet `FS-NAT-234-11-EN.pdf`, Rule 2020:**
> "In each occurrence of node EFFORT_DETAIL, there must be at least one occurrence of the Catch node for
> which the species caught (Catch.specie_id) is equal to the target species (Tgt_species.specie_id),
> **even if there was no catch. When there has been no catch during the fishing effort, the fisher must
> enter 0 in the quantity kept (Catch.Kept_wt).**"

**Supporting rules (same fact sheet):**
- **Rule 630** (CATCH): "at least one of the kept weight (Catch.Kept_wt) or the number of specimen
  discarded (Catch.Nb_spcmn_disc) must contain a value greater than or equal to 0."
- **Rule 631** (CATCH): "If the species caught … is … 1312 Lobster then the capture of the kept weight
  (Catch.Kept_wt) is mandatory." → this is why row 94 reads "Mandatory" for GLF/MAR (lobster is the
  target). Rules 978b/978c additionally **block** `KEPT_WT` for species *not* in that subform's allowed
  list.
- **Rule 789** (CATCH): null/empty must **not** be auto-interpreted as 0 — the 0 must be entered.
- **TRG-Logbooks test #3**: "Send a logbook including a fishing effort having no species caught." →
  no-catch is an expected, tested scenario for the logbook subforms.

**Watch out:** `KEPT_WT` "Mandatory" in the requirements sheet means *the element must carry a value*,
not *the catch must be > 0*. On a skunked trip: emit EFFORT → EFFORT_DETAIL → one CATCH with
`SPECIE_ID = lobster (1312)` and `KEPT_WT = 0`.

**Plain language:** Effort-only / no-catch logbooks are valid for GLF and MAR; record the no-catch as a
lobster CATCH row with an explicit `KEPT_WT` of 0.

---

## Q10 — Failed-transmission display requirement → **ANSWERED**

**Verdict:** **Yes — the Standard requires the app to be able to DISPLAY failed transmissions.**
Logging-without-display is **not** acceptable.

**Source — Standard v6.1 §13.3.1 (web-service register):** the register "shall include … Transmission
status ('Fail' or 'Success') … Error message (if applicable) …", and:
> "This information shall be stored by the ELOG client application **so that it can be readily viewed by
> the user**. Information concerning transmission failures **shall also be stored** in this registry…"
(archived/accessible up to **3 years**.)

**§13.3.2 (non-web-service register):** same list including "Transmission status ('Fail' or 'Success')"
and "Information concerning transmission failures shall also be stored in this registry" (accessible
**30 days**).

**§13.3.3 (clinching requirement):**
> "The ELOG client application **shall allow the user to display the results of the transmission attempts
> made during the previous thirty days** based upon either one of these registries, **even if a
> communication link is not available**."

**Plain language:** Failures must be stored *and* surfaced. The register (which explicitly contains
Fail-status rows + error messages) must be user-viewable for at least 30 days, offline. A display that
hides or omits failed attempts would fail §13.3.3.

---

## STILL NEEDS KANE

- **Q8 (NOT FOUND):** No Form-233 (Inactivity Report) TRG ships in the package, and the logbook TRG is
  logbook-specific with no inactivity test rows. **Ask:** is 233 graded under the logbook grid, or will
  DFO supply a separate 233 TRG?
- **Q6 (caveat):** The package specifies `tempuri.org` and ships **no WSDL**. **Ask:** does the live
  service's WSDL override the operation namespace to `http://www.dfo-mpo.gc.ca` — i.e. what namespace
  should the SOAP body actually use at runtime? (Unverifiable from the package.)
- **Q3 (minor confirm):** The package only *soft-prompts* a SAR node when `EFFORT.SAR_IND='Y'`
  (Rule 604 = display a message; Rule 1051 = don't force a data group). **Ask (optional):** will DFO's
  TRG accept a soft prompt, or do they expect the app to *hard-block* submission until a SAR node is
  entered when `SAR_IND='Y'`?
