# RECON S116 — Form 233 `LOGBOOK_UID_REFERED` (+ Form 222 equivalent) + mandatory-only strictness audit

Read-only recon, 2026-07-24. No git run, no DFO POST, no source file touched. This report is the only file written.
Sources: `~/Desktop/DFO/` technical packages (verbatim quotes with file + line), `~/Desktop/LobsterLog` working tree (file:line cites).
PDF line numbers below are line numbers of `pdftotext -layout` extracted text, not PDF page lines. CSV/dictionary files are Windows-1252 encoded; quotes below are the cp1252-decoded text (see the tooling note in NOT FOUND / COULD NOT VERIFY).

---

## FINDINGS THAT CHANGE THE PLAN

1. **`LOGBOOK_UID_REFERED` is per-REPORT, not per-detail.** It is the 2nd child of `report_type` (REPORT level), between `REPORT_UID` and `DG_CLOSE_DT` — XSD line 360. It is NOT in `report_dtl_type`. One value per report, regardless of how many `REPORT_DTL` rows exist.
2. **Type is `string_6` (1–6 chars), tightened by Rule 953 to six uppercase letters A–Z referring to `TRIP.LGBK_UID` of another logbook.** The base `string` type carries `minLength=1`, so an empty element is schema-invalid — the element must be absent when unused (CSV: "leave this field blank" = omit).
3. **The app already holds the referenced value class:** every 234 logbook stores `log.lgbkUid` (six uppercase A–Z, `TRIP.LGBK_UID`), and Form 222 already prefills its own logbook-reference field from `last?.lgbkUid` (`Form222Screen.tsx:175–177`). The 233's `generateForm233Uid()` (`dfoForm233Generator.ts:32–37`) already produces exactly the 6×A–Z shape for `REPORT_UID`.
4. **Mandatory-only exposure exists today, and it is not about `LOGBOOK_UID_REFERED`:**
   - **233 T2:** every 233 the app can send **necessarily contains `VRN`**, which the 233 CSV marks `REQUIRED? = "N"` (optional). The Rule-528 gate at `Form233Screen.tsx:149–152` hard-blocks any send without a valid 4–6-digit VRN, and the generator emits any non-empty `profile.vesselNumber` (`dfoForm233Generator.ts:89`). Under DFO's July-24 ruling #1 (an optional element present fails a mandatory-only case), the app cannot currently produce a passing 233 T2. (`FIN` is also always emitted in practice, but FS-233 Rule 961 makes FIN *mandatory* for all non-Arctic regions — rule-backed, not a violation; quoted in A3.)
   - **222 T2 (Y-path mandatory-only):** the generator hardcodes `TGT_SPECIE_ID` (1312) and `GEAR_ID` (925) on every Y report (`dfoForm222Generator.ts:176–177`), and its own validator forces `INTERACT_DT`, `LAT`, `LONG`, `NAME`, `ADDR`, `NOAA_SPECIE_COD`, `NB_SPCMN_BEST` to be present (`dfoForm222Generator.ts:280–283`); `GEAR_DMG_IND` defaults to `'N'` and always emits (`Form222Screen.tsx:114`, `dfoForm222Generator.ts:189`). **All ten are `REQUIRED? = "N"` in the 222 CSV.** Note the 222 grid's T2 wording is softer than the 233's ("only the mandatory elements **that were still accessible**" — quoted verbatim in Part E) — whether that wording absorbs app-forced fields is not answerable from source.
   - **234 minimal T2:** no violation found. Every element the 234 generator emits unconditionally is either Mandatory in `Subforms_requirements_234.xlsx` or made mandatory by a cited fact-sheet rule (631, 619, 1012, 621, 976, 3059). Details in F3/F4.
5. **The 233 TRG T1 wording is confirmed verbatim from the workbook** (Part E): "…includes ALL nodes and elements, whether optional or required." — consistent with DFO's ruling that `LOGBOOK_UID_REFERED` must be in the 233 T1 file.
6. **No storage/UI/i18n/test surface exists for the element** — `Form233Entry` has no candidate field, the screen has no input that could carry it (all free-text inputs feed the two `REM` elements), and there are no i18n keys or test references. The S111/S112 additive-optional precedent (`remarks`, `reportDtlRemarks`) is the existing pattern for adding an entry field without migration.
7. **Workbook/CSV discrepancy (minor):** the 233 .xlsx's row for this element carries a wrong French long-description cell (a product-form text); the CSV carries the correct one. Quoted in A2. The CSV is the consistent source.

---

## PART A — WHAT THE TECHNICAL PACKAGE REQUIRES (233)

### A1. XSD

File: `~/Desktop/DFO/ELOG_F233/43792.233.NATIONAL - ELOG - Inactivity Report - JBE - Rapport d'inactivitÇ_20260108 000000.xsd` (header comment `xsd_start_date: 2022-06-13`, line 14).

Declaration with surrounding context (verbatim, lines 357–377):

```xml
357	    <xs:complexType name="report_type">
358	       <xs:sequence>
359	        <xs:element name="REPORT_UID"            minOccurs="1" maxOccurs="1" type="string_6"/>
360	        <xs:element name="LOGBOOK_UID_REFERED"   minOccurs="0" maxOccurs="1" type="string_6"/>
361	        <xs:element name="DG_CLOSE_DT"           minOccurs="1" maxOccurs="1" type="date_14"/>
362	        <xs:element name="REM"                   minOccurs="0" maxOccurs="1" type="string_2000"/>
363	
364	        <xs:element name="REPORT_DTL"             minOccurs="1" maxOccurs="unbounded" type="report_dtl_type"/>
365	       </xs:sequence>
366	       <xs:attribute name="NODE_ID" type="integer"/>
367	    </xs:complexType>
368
369	    <xs:complexType name="report_dtl_type">
370	       <xs:sequence>
371	        <xs:element name="START_DT"              minOccurs="1" maxOccurs="1" type="date_12"/>
372	        <xs:element name="END_DT"                minOccurs="1" maxOccurs="1" type="date_12"/>
373	        <xs:element name="LIC_NO"                minOccurs="1" maxOccurs="1" type="string_18"/>
374	        <xs:element name="REASON"                minOccurs="1" maxOccurs="1" type="string_2000"/>
375	        <xs:element name="REM"                   minOccurs="0" maxOccurs="1" type="string_2000"/>
376	       </xs:sequence>
377	    </xs:complexType>
```

- **Exact element name:** `LOGBOOK_UID_REFERED` (note DFO's single-R spelling of "REFERED").
- **Full parent path from root:** `ELOG → REPORT → LOGBOOK_UID_REFERED` (root `ELOG` at line 379; `REPORT` element of type `report_type` at line 383, `minOccurs="1" maxOccurs="unbounded"`).
- **Position among siblings:** 2nd child of the `report_type` sequence — immediately **after `REPORT_UID`** (line 359), immediately **before `DG_CLOSE_DT`** (line 361).
- **Occurrence:** `minOccurs="0" maxOccurs="1"`.
- **Data type:** `string_6` (lines 38–42), a restriction of `string` with `maxLength=6`; the base `string` (lines 31–36) restricts `xs:string` with `whiteSpace collapse` and **`minLength=1`**. No pattern, no enumeration at the XSD level. Net XSD constraint: 1–6 characters; empty content is invalid (absence is the only legal "blank").

### A2. CSV

File: `~/Desktop/DFO/ELOG_F233/43792.233.NATIONAL - ELOG - Inactivity Report - JBE - Rapport d'inactivitÇ.csv`, line 9 (cp1252-decoded, verbatim):

```
43792,"ELOG - Inactivity Report","JBE - Rapport d'inactivité",233,"2022-03-15","","ELOG - Inactivity Report","REPORT","LOGBOOK_UID_REFERED","IDU JBE référé.","Si applicable, identifiant unique du journal de bord (IDU JBE) détaillant le voyage de pêche au moment où l’inactivité est survenue.  Si cet inactivité n’est liée à aucun journal de bord en particulier, laisser ce champ vide.","Refered ELOG UID","If applicable, Unique Logbook Identifier (ELOG UID) detailing the fishing trip at the time the inactivity occurred. If this inactivity is not related to any particular logbook, leave this field blank.","",1364,2,2,"N",135.1
```

- **`REQUIRED?` = `"N"`** (Optional).
- **EN short label:** `Refered ELOG UID`. **FR short label:** `IDU JBE référé.` (trailing period is in the source).
- **EN long description:** "If applicable, Unique Logbook Identifier (ELOG UID) detailing the fishing trip at the time the inactivity occurred. If this inactivity is not related to any particular logbook, leave this field blank."
- **FR long description:** « Si applicable, identifiant unique du journal de bord (IDU JBE) détaillant le voyage de pêche au moment où l’inactivité est survenue.  Si cet inactivité n’est liée à aucun journal de bord en particulier, laisser ce champ vide. »
- **Rule number cited in the row:** none — the CSV has no rule column (columns are FORM_ID…NODE_ORDER; `REF_MV_TABLENAME` is empty for this row). ELEMENT_ID 1364, ELEMENT_ORDER 2, ELEMENT_DISPLAY_ORDER 2, NODE_ORDER 135.1.

Workbook counterpart `43792.233.…Rapport d'inactivitÇ.xlsx`, sheet `43792.233.NATIONAL - ELOG`, row 14, carries the same element (`H14 REPORT`, `I14 LOGBOOK_UID_REFERED`, `R14 "N"`, `O14 1364`) but its FR long-description cell K14 reads « Traitement apporté au produit (le poids transféré est évalué en fonction de ce traitement) (Ex.: Rond, éviscéré, etc.) » — a product-form text that does not belong to this element. The CSV (line 9 above) carries the correct FR long description.

### A3. Fact sheet FS-NAT-233-2

`~/Desktop/DFO/ELOG_F233/FS-NAT-233-2-EN.pdf` — exactly one occurrence of `LOGBOOK_UID_REFERED` in the extracted text (§5.2.3 "Restrictions on data elements", extracted-text lines 162–165), verbatim:

```
 953        REPORT    LOGBOOK_UID_REFERED The value of the LOGBOOK_UID_REFERED element
                                          refers to the TRIP.LGBK_UID contained in another
                                          logbook. This logbook unique identifier must be made
                                          up of six uppercase letters. (A-Z)
```

FR twin, `FS-NAT-233-2-FR.pdf` (extracted-text lines 166–171), verbatim:

```
         953       REPORT                LOGBOOK_UID_REFERED La valeur de l’élément
                                                                   LOGBOOK_UID_REFERED fait référence au
                                                                   TRIP.LGBK_UID contenu dans un autre journal
                                                                   de bord. Cet identifiant unique du journal de
                                                                   bord doit être composé de six lettres
                                                                   majuscules. (A-Z)
```

§5.2.3's preamble (EN line 114): "Note: The following restrictions apply only if the node identified in the “Node(s)” column is used." — Rule 953 constrains the value **when present**; it does not make the element mandatory.

**No business rule in FS-NAT-233-2 makes `LOGBOOK_UID_REFERED` mandatory or blocked in any scenario.** The complete rule inventory of the EN fact sheet is: 1000, 1034, 1018 (data-group composition, lines 105–110); 1 (FORM_VER_ID), 2 (REG_ID), 260 (FIN format), 952 (REPORT_UID), 953 (above), 528 (VRN format), 931 (FIN label), 961 (REG_ID/FIN), 2500 (DFO instructions). None besides 953 mentions this element.

Adjacent rules quoted because they bear on Part F (verbatim, EN extracted-text lines 157–178):

```
 952        REPORT               REPORT_UID          The report unique identifier must be made up of six
                                                     uppercase letters (A-Z) randomly generated.

                                          If possible, make sure the report unique identifier has
                                          never been used before by any of your clients.
```
```
 528     GENERAL_INFO         VRN         The vessel registration number
                                          (General_info.Vrn) must be made up of digits
                                          only. It must be composed of 4, 5 or 6 digits.
```
```
 961     GENERAL_INFO              REG_ID            When the region is Arctic (general_info.reg_id = 1008)
                                     FIN             then the FIN (general_info.fin) is optional, otherwise the
                                                     FIN is mandatory for all other regions.
```

### A4. Dictionary

`~/Desktop/DFO/ELOG_dict/XML_dictionary.csv`, line 670 (cp1252-decoded, verbatim):

```
1364,"REPORT","LOGBOOK_UID_REFERED","IDU JBE référé.","Refered ELOG UID","Si applicable, identifiant unique du journal de bord (IDU JBE) détaillant le voyage de pêche au moment où l’inactivité est survenue.  Si cet inactivité n’est liée à aucun journal de bord en particulier, laisser ce champ vide.","If applicable, Unique Logbook Identifier (ELOG UID) detailing the fishing trip at the time the inactivity occurred. If this inactivity is not related to any particular logbook, leave this field blank.","CHAR",6,"N","N","","N",,"N","","AFUERF",2,"N","2022-05-31 16:54:49"
```

Per the header (line 1): ELEMENT_ID 1364, node `REPORT`, datatype `CHAR`, MAX_LENGTH 6, no mask, no list of values, **TEST_VALUE `AFUERF`**, ELEMENT_ORDER 2, REQUIRED_VS_PARENT_NODE_IND `N`.

- **Official EN label/definition:** "Refered ELOG UID" / "If applicable, Unique Logbook Identifier (ELOG UID) detailing the fishing trip at the time the inactivity occurred. If this inactivity is not related to any particular logbook, leave this field blank."
- **Official FR label/definition:** « IDU JBE référé. » / « Si applicable, identifiant unique du journal de bord (IDU JBE) détaillant le voyage de pêche au moment où l’inactivité est survenue.  Si cet inactivité n’est liée à aucun journal de bord en particulier, laisser ce champ vide. »

### A5. Folder sweep

Every file under `~/Desktop/DFO/` (recursive) containing the string `LOGBOOK_UID_REFERED` — combined result of a C-locale byte-level `grep -rl`, a `pdftotext` pass over every PDF, and a zip-member scan of every .xlsx:

| # | File | Where |
|---|---|---|
| 1 | `ELOG_F233/43792.233.…Rapport d'inactivitÇ_20260108 000000.xsd` | line 360 (A1) |
| 2 | `ELOG_F233/43792.233.…Rapport d'inactivitÇ.csv` | line 9 (A2) |
| 3 | `ELOG_F233/43792.233.…Rapport d'inactivitÇ.xlsx` | sheet row 14 (A2 note) |
| 4 | `ELOG_F233/FS-NAT-233-2-EN.pdf` | Rule 953 (A3) |
| 5 | `ELOG_F233/FS-NAT-233-2-FR.pdf` | Rule 953 FR (A3) |
| 6 | `ELOG_F233/NAT - Structure XML Rapport d'inactivité – Inactivity Report XML Structure .pdf` | structure diagram — REPORT column lists `REPORT_UID / LOGBOOK_UID_REFERED / DG_CLOSE_DT / REM` (extracted-text lines 11–15) |
| 7 | `ELOG_dict/XML_dictionary.csv` | line 670 (A4) |

No other file in `~/Desktop/DFO/` mentions it. In particular: **zero mentions in the ELOG_F222 and ELOG_F234 packages**, zero in `DFO instructions_NAT_233-2_{eng,fre}.pdf`, zero in the TRG workbooks, zero in ELOG_standard / ELOG_WebService / ELOG_reftables / ELOG_qualifications.

---

## PART B — WHAT THE APP DOES TODAY

### B1. `src/utils/dfoForm233Generator.ts`

The string `LOGBOOK_UID_REFERED` appears **only in two comments** — it is never emitted:

- Line 105: `// LOGBOOK_UID_REFERED omitted — inactivity not tied to a specific logbook`
- Line 129: `// Mandatory elements per the XSD (FIN/VRN/REM/LOGBOOK_UID_REFERED are optional)`

Full emit order of `generateForm233Xml` (lines 79–114). Every element goes through `tag()` (line 65–68), which **drops empty/blank values entirely**, except where noted:

| Seq | Element | Source line | Value source | Emit condition |
|---|---|---|---|---|
| 1 | `<GENERAL_INFO>` open | 84 | literal | always |
| 2 | `CIE_ID` | 85 | `DFO_CIE_ID` constant | always (constant non-empty) |
| 3 | `SOFT_VER` | 86 | `DFO_SOFT_VER` constant | always |
| 4 | `REG_ID` | 87 | `profile.regId ?? 1004` | always (default guarantees a value) |
| 5 | `FIN` | 88 | `entry.fin` (snapshot of `profile.licenceHolderFin`) | only if non-empty |
| 6 | `VRN` | 89 | `profile.vesselNumber` | only if non-empty (but see F1 — the send gate forces non-empty) |
| 7 | `FORM_VER_ID` | 90 | `DFO_FORM_VER_ID_233` = 233 | always |
| 8 | `<REPORT>` open | 103 | literal | always |
| 9 | `REPORT_UID` | 104 | `entry.uid \|\| generateForm233Uid()` | always |
| — | *(`LOGBOOK_UID_REFERED` slot — comment only)* | 105 | — | never |
| 10 | `DG_CLOSE_DT` | 106 | `toCloseTimestamp()` | always (auto-stamp) |
| 11 | `REM` (REPORT level) | 109 | `entry.remarks ?? ''` | only if non-empty |
| 12 | `<REPORT_DTL>` open | 93 (built first, appended at 110) | literal | always |
| 13 | `START_DT` | 94 | `entry.periodStartDate` + `0000` | only if valid date (form gate requires it) |
| 14 | `END_DT` | 95 | `entry.periodEndDate` + `2359` | only if valid date (form gate) |
| 15 | `LIC_NO` | 96 | `entry.licenceNo` (snapshot of `profile.fishingNumber`) | only if non-empty (validator blocks send if absent) |
| 16 | `REASON` | 97 | `entry.reason` | only if non-empty (form gate) |
| 17 | `REM` (REPORT_DTL level) | 100 | `entry.reportDtlRemarks ?? ''` | only if non-empty |

The validator (`validateForm233Xml`, lines 119–170) lists the mandatory set at lines 130–133 (`GENERAL_INFO, CIE_ID, SOFT_VER, REG_ID, FORM_VER_ID, REPORT, REPORT_UID, DG_CLOSE_DT, REPORT_DTL, START_DT, END_DT, LIC_NO, REASON`) and performs no check of any kind on `LOGBOOK_UID_REFERED`.

### B2. `src/screens/Form233Screen.tsx` — input controls

| Control | Screen lines | Feeds |
|---|---|---|
| Operator Name (read-only display) | 251–256 | display only — `profile.operatorName`; **not emitted anywhere** (no XSD element for it on the 233) |
| Licence No (read-only display) | 259–266 | `profile.fishingNumber` → `entry.licenceNo` → `REPORT_DTL.LIC_NO` |
| FIN (read-only display) | 268–275 | `profile.licenceHolderFin` → `entry.fin` → `GENERAL_INFO.FIN` |
| Start Date (date picker) | 281–293 | `form.periodStartDate` → `REPORT_DTL.START_DT` |
| End Date (date picker) | 295–307 | `form.periodEndDate` → `REPORT_DTL.END_DT` |
| Section note ("Add a note", collapse/expand TextInput) | 94–111, 309–313 | `form.reportDtlRemarks` → `REPORT_DTL.REM` |
| Reason (dropdown, `INACTIVITY_REASONS`) | 319–353 | `form.reason` → `REPORT_DTL.REASON` |
| Comments (multiline TextInput) | 356–372 | `form.remarks` → `REPORT.REM` |

**No existing field could carry a logbook reference today.** Every editable input feeds a `REM` element or a mandatory 233 element; the read-only trio feeds FIN/LIC_NO or nothing. There is no input whose value reaches the `REPORT_UID`/`LOGBOOK_UID_REFERED` slot (`entry.uid` is machine-generated at submit, line 170).

### B3. `Form233Entry` type and storage shape

`dfoForm233Generator.ts:18–30` — full field list: `uid`, `savedAt`, `periodStartDate`, `periodEndDate`, `reason`, `licenceNo`, `fin`, `remarks?`, `reportDtlRemarks?`, `sentToDfo`, `sentAt?`.

**No field exists, used or unused, that could hold a logbook-reference value.** `uid` holds the report's own `REPORT_UID` (self-identifier, not a reference). Storage is a JSON array under the AsyncStorage key base `@form233_entries` (`dfoStorageKeys.ts:45`, uid-namespaced via `dfoKey()`), written by `saveForm233Entry` (`dfoForm233Generator.ts:39–44`). The two S111/S112 fields (`remarks`, `reportDtlRemarks`) were added as additive optionals — old entries parse unchanged (comments at lines 26–27).

The 233 is create-and-send-only: entries are built fresh at submit (`Form233Screen.tsx:169–180`) and there is no hydrate/edit path for any field.

### B4. i18n

`src/i18n/locales/en/dfo.json` / `fr/dfo.json`: the `form233` section has 29 keys (both languages) — `confirmBody, confirmTitle, datePlaceholder, endDateLabel, finLabel, finPlaceholder, headerTitle, licenceDetailsCard, licenceNoLabel, licenceNoPlaceholder, missingFieldsBody, missingFieldsTitle, operatorNameLabel, operatorNamePlaceholder, reasonCard, reasonLabel, reasonOptions, reasonPlaceholder, remarksCard, remarksPlaceholder, reportingPeriodCard, startDateLabel, submissionFailedTitle, submitButton, submitSuccess, submittedTitle, unknownError, validationFailed, validationFailedTitle`. **None is a logbook-reference key. Confirmed: no key exists for this element.**

(For the 222: `form222.lgbkNumRefLabel` = "LOGBOOK NUMBER REFERRED" / « NO DU JOURNAL DE BORD RÉFÉRÉ » and `lgbkNumRefPlaceholder` exist at `en/dfo.json:352–353` / `fr/dfo.json:353–354` — that is the 222's own element, see Part D.)

### B5. Test suites

`grep -rn LOGBOOK_UID_REFERED src/utils/__tests__/` → no matches. Neither `form233Rem.oneoff.test.ts` nor `genSampleForm233.oneoff.test.ts` (the only 233 suites, at `src/utils/__tests__/`) references it, and no other suite in the repo does.

---

## PART C — PLACEMENT FACTS

### C1. Where the element must sit in the emitted document

Per the XSD sequence (lines 358–365): inside `<REPORT>`, **immediately after `<REPORT_UID>` and immediately before `<DG_CLOSE_DT>`**. In the generator as written, that is between line 104 (`REPORT_UID`) and line 106 (`DG_CLOSE_DT`) of `dfoForm233Generator.ts` — exactly where the line-105 comment sits today.

### C2. REPORT vs REPORT_DTL — unambiguous

**It is inside `REPORT` (per-report), NOT inside `REPORT_DTL`.** Evidence: the declaration at XSD line 360 is inside `report_type` (lines 357–367); `report_dtl_type` (lines 369–377) contains only `START_DT, END_DT, LIC_NO, REASON, REM`. A UI field for it is therefore a per-report fact, not a per-row fact.

### C3. Multiplicity

- The schema allows **unbounded `REPORT_DTL`** per REPORT (line 364: `minOccurs="1" maxOccurs="unbounded"`) and unbounded `REPORT` per ELOG (line 383).
- The app builds **exactly one `REPORT` containing exactly one `REPORT_DTL`** per document: `generateForm233Xml` constructs a single `dtl` block (lines 93–101) and appends it once into a single `report` block (lines 103–111). There is no loop over details or reports anywhere in the generator.

---

## PART D — THE 222 EQUIVALENT

### D1. Yes — `MM_INTER.LGBK_NUM_REF`, and it is MANDATORY

`~/Desktop/DFO/ELOG_F222/39588.222.NATIONAL - ELOG - Marine mammal interaction form - JBE - Formulaire d'interaction avec un mammifäre marin_20260108 000000.xsd`, line 241 (verbatim, with neighbours):

```
240	<xs:element name="GEAR_ID"               minOccurs="0" maxOccurs="1" type="integer_10"/>
241	<xs:element name="LGBK_NUM_REF"          minOccurs="1" maxOccurs="1" type="string_15"/>
242	<xs:element name="OTHR_ID_DSC"           minOccurs="0" maxOccurs="1" type="string_30"/>
```

`string_15` = maxLength 15 over the same `minLength=1` base (222 XSD lines 49–53). Parent: `MM_INTER` (form level, not the incident node).

222 CSV (`39588.222.…mammifère marin.csv`, cp1252-decoded, line 10, verbatim):

```
39588,"ELOG - Marine mammal interaction form","JBE – Formulaire d’interaction avec un mammifère marin",222,"12/12/2019","","ELOG - Marine mammal interaction form","MM_INTER","LGBK_NUM_REF","No du journal de bord référé","Numéro du journal de bord auquel la déclaration d'interaction avec un mammifère marin se réfère.","Logbook number referred","Logbook number to which the marine mammal interaction report refers.","",1177,16,3,"Y",510.1
```

**`REQUIRED? = "Y"`.** A related optional element sits beside it (line 11): `OTHR_ID_DSC`, `REQUIRED? = "N"`, "Other identification number allowing the linkage of this declaration to a logbook".

Dictionary (`XML_dictionary.csv:595`): ELEMENT_ID 1177, `CHAR`, MAX_LENGTH 15, TEST_VALUE `AFUERF`, REQUIRED_VS_PARENT_NODE_IND `N`. (The dictionary also lists unrelated same-named elements `QUOTA.LGBK_NUM_REF` line 663 and `TRIP.LGBK_NUM_REF` line 843 — other forms, not the 222.)

Fact sheet: `FS-NAT-222-1-EN.pdf` contains **no rule mentioning `LGBK_NUM_REF`** (searched `lgbk`, `logbook number`, `referred`, `refers` — zero hits; extraction verified working, since `MM_INTER`/`INTERACT_IND` rules extract fine, e.g. Rules 1027/1029 at extracted-text lines 117–122).

Key contrast with the 233 element: different name (`LGBK_NUM_REF` vs `LOGBOOK_UID_REFERED`), different type (`string_15` vs `string_6`), different requirement (`Y` vs `N`), and no Rule-953-style six-uppercase constraint on the 222 side.

### D2. App wiring (already built end-to-end)

- **Generator emits it:** `dfoForm222Generator.ts:180` — `mm += tag('LGBK_NUM_REF', entry.lgbkNumRef || profile.fishingNumber, '    ');` (fallback to the licence number when the field is blank). Entry field declared at lines 85–87; validator requires it (line 256) and length-checks string_15 (lines 270–271).
- **Screen collects it:** `Form222Screen.tsx` — form field (line 95), empty default (line 126), **prefill from the most recent logbook's `lgbkUid`** (lines 175–177: `if (last?.lgbkUid) setForm(prev => prev.lgbkNumRef ? prev : { ...prev, lgbkNumRef: last.lgbkUid });`), threaded into the entry (line 360), rendered as a required-asterisk TextInput (lines 566–571) with i18n labels `form222.lgbkNumRefLabel` / `lgbkNumRefPlaceholder`.

---

## PART E — TRG GRID WORDING

Read with openpyxl 3.1.5 (cell-level; both workbooks v. `2022-04-19` per H1).

### E1. `TRG-Inactivity-GRT-Inactivite.xlsx`, sheet "Technical revision grid - ENG"

Column headers (row 4): `Test# | Test case | XML file name | XSD compliant (Y/N) | Transmission printout (Y/N) | XML contains what is asked for in the test  (Y/N) | Compliant (Y/N) | Comments`. **There is no element-list column** — the test-case text is the whole instruction.

Row 5 (T1), cell B5 verbatim:

> Send an inactivity report that includes ALL nodes and elements, whether optional or required.
>
> Include French accented characters in the comment fields.

Row 6 (T2), cell B6 verbatim:

> Send a report in which only MANDATORY elements are included.  Include all nodes but do not include any optional elements.

FR sheet ("Grille de révision technique-FR"), B5/B6 verbatim:

> Transmettre un rapport d'inactivité dans lequel TOUS les nœuds et TOUS les éléments sont inclus, qu'ils soient optionnels ou obligatoires.
>
> Inclure des caractères accentués français dans les zones de commentaire.

> Transmettre un rapport dans lequel seuls les éléments OBLIGATOIRES sont inclus.  Inclure tous les nœuds mais n'inclure aucun éléments optionnels.

### E2. `TRG-MMammals-GRT-Mammiferes-marins.xlsx`, sheet "MM-ENG"

Row 5 (T1), cell B5 verbatim:

> Send  a report where the the indicator of interaction has been set to Yes (Mm_inter.Interact_ind='Y'). The XML file must contain all the elements of the form that were still accessible.

Row 6 (T2), cell B6 verbatim:

> Send  a report where the the indicator of interaction has been set to Yes (Mm_inter.Interact_ind='Y'). The XML file must contain only the mandatory elements that were  still accessible.

Row 7 (T3), cell B7 verbatim:

> Send  a report where the the indicator of interaction has been set to No (Mm_inter.Interact_ind='N'). The XML file must contain all the elements of the form that were  still accessible.

(FR twins in sheet "MM-FR" B5–B7: « Transmettre un rapport dont l'indicateur d'interaction est "Oui" (Mm_inter.Interact_ind='Y'). / Le fichier XML doit contenir tous les éléments du formulaire qui étaient encore accessibles. », « …seulement les éléments obligatoires qui étaient encore accessibles. », « …"Non" (Mm_inter.Interact_ind='N'). / Le fichier XML doit contenir tous les éléments du formulaire qui étaient encore accessibles. »)

Wording contrast on record: the 233 T2 says "do not include any optional elements"; the 222 T2 says "only the mandatory elements **that were still accessible**". The 222 grid nowhere defines "accessible".

---

## PART F — MANDATORY-ONLY STRICTNESS AUDIT

Method: for each generator, the list below is every element that appears in the output of a minimal send (no optional user text entered), split by *why* it appears. `tag()` in all three generators drops empty values, so an element appears only when its value is non-empty at emit time. "M"/"O" flags are from the source table named per form (233/222: form CSV `REQUIRED?`; 234: `Subforms_requirements_234.xlsx`). ⚠ marks an element the app necessarily includes that the source table calls Optional.

### F1. `dfoForm233Generator.ts` — minimal 233

Source table: 233 CSV (lines 2–16). Send path facts that bear on this: the Rule-528 gate (`Form233Screen.tsx:149–152`) blocks any send unless `profile.vesselNumber` is a valid 4–6-digit VRN; the missing-fields gate (lines 153–156) requires start/end/reason; the validator (generator lines 130–133) blocks the send if `LIC_NO` is absent.

| Element | CSV flag | How it gets into a minimal send | Verdict |
|---|---|---|---|
| `CIE_ID`, `SOFT_VER`, `FORM_VER_ID` | Y | constants (gen 85, 86, 90) | clean |
| `REG_ID` | Y | `profile.regId ?? 1004` (gen 87) | clean |
| `REPORT_UID`, `DG_CLOSE_DT` | Y | auto-generated (gen 104, 106) | clean |
| `START_DT`, `END_DT`, `REASON` | Y | user input, form-gated (gen 94–97) | clean |
| `LIC_NO` | Y | profile snapshot; validator-forced (gen 96, 131) | clean |
| `FIN` | **N** | profile snapshot, emitted whenever `profile.licenceHolderFin` non-empty (gen 88); no 233-path gate forces it, but no UI on this screen can blank it | **rule-backed anyway**: FS-233 Rule 961 (quoted in A3) makes FIN *mandatory* for every region except Arctic (1008) — the CSV "N" is superseded for MAR/GLF/QC/NL sends |
| `VRN` | **N** | emitted whenever `profile.vesselNumber` non-empty (gen 89); **the Rule-528 gate makes a non-empty VRN a precondition of every send** | ⚠ **unavoidably-emitted Optional.** Rule 528 is a format restriction only ("applies only if the node … is used", FS-233 §5.2.3 note, line 114) — no source rule makes VRN mandatory on the 233 |
| `REPORT.REM`, `REPORT_DTL.REM` | N | value-gated (gen 109, 100) — absent when blank | clean (omittable) |
| `LOGBOOK_UID_REFERED` | N | never emitted (gen 105 comment) | absent — which is what a mandatory-only case wants, but fails the T1 all-elements case per DFO's July-24 ruling #2 |

### F2. `dfoForm222Generator.ts` — Y-path

Source table: 222 CSV (all flags listed in the row dump; mandatory set = REG_ID, VRN, FIN, CIE_ID, FORM_VER_ID, SOFT_VER, REP_DATE, LGBK_NUM_REF, INTERACT_IND, DG_CLOSE_DT, and INCDNT_TYP_ID within the incident node).

| Element | CSV flag | How it gets into a minimal Y send | Verdict |
|---|---|---|---|
| `CIE_ID`, `SOFT_VER`, `FORM_VER_ID` | Y | constants (gen 152, 153, 157) | clean |
| `REG_ID` | Y | `profile.regId ?? 1004` (gen 154) | clean |
| `FIN`, `VRN` | Y | profile (gen 155–156); validator-forced (gen 252) | clean — mandatory on the 222, unlike the 233 |
| `REP_DATE` | Y | user date with auto-stamp fallback (gen 162) | clean |
| `INTERACT_IND`, `DG_CLOSE_DT` | Y | always (gen 163, 203) | clean |
| `LGBK_NUM_REF` | Y | `entry.lgbkNumRef \|\| profile.fishingNumber` (gen 180) | clean |
| `TGT_SPECIE_ID` = 1312 | **N** | **hardcoded constant on every Y report** (gen 176) | ⚠ unavoidably-emitted Optional |
| `GEAR_ID` = 925 | **N** | **hardcoded constant on every Y report** (gen 177) | ⚠ unavoidably-emitted Optional |
| `GEAR_DMG_IND` | **N** | typed `'Y'\|'N'`, defaults `'N'` (`Form222Screen.tsx:114`), always non-empty → always emits (gen 189) | ⚠ unavoidably-emitted Optional |
| `INTERACT_DT`, `LAT`, `LONG`, `NAME`, `ADDR`, `NOAA_SPECIE_COD`, `NB_SPCMN_BEST` | **N** (all) | user input, but the app's own validator makes each a send-blocker on Y (gen 280–283: "the detail fields this app always collects are required") | ⚠ app-forced Optionals — the app cannot produce a Y report without them |
| `MM_INTER_INCDNT` / `INCDNT_TYP_ID` | node: Rule 1027; element: Y | ≥1 incident node required when Y by FS-222 Rule 1027 (fact sheet, extracted-text lines 117–119) | clean (rule-backed) |
| `REM` | N | value-gated — EXCEPT when `entangleInd === 'Y'`: the generator appends `Released: yes/no` so REM becomes non-empty even with blank remarks (gen 205–209) | conditional ⚠ (only when entanglement is involved) |
| `SITE_DSC`, `GEAR_DMG_REM`, `DOC_REM`, `EVENT_DSC`, `INCDNT_REM`, `ID_CNFDNCE_ID`, `SPCMN_COND_ID`, `BDY_LEN_ID` | N | value-gated (gen 168, 191, 197, 200, 223, 193–198) — absent when unset | clean (omittable) |

N-path (T4-shaped) for contrast: emits GENERAL_INFO ×6 + `REP_DATE`, `INTERACT_IND`, `LGBK_NUM_REF`, `DG_CLOSE_DT` — all CSV-mandatory; no optional element can appear (all detail emits are inside `interactInd === 'Y'` guards, gen 165–178 / 182–201 / 205–226). The N-path is mandatory-only-clean as built.

### F3. `dfoXmlGenerator.ts` (234) — minimal T2-shaped trip, per region

Elements present on every minimal send regardless of region (send additionally passes the save-gate `FULL_DFO_REQUIRED_FIELDS`, `dfoLogStorage.ts:192–197`, and `isProfileComplete`, which force operName/FIN/VRN/licence/times/catchWeight/trapHauls etc. to be non-empty):

- `GENERAL_INFO`: `CIE_ID, SOFT_VER, REG_ID, FIN, VRN, FORM_VER_ID, SUBFORM_ID` (gen 189–195)
- `TRIP`: `TRIP_NUM, OPER_NAME, START_DT, FIRST_ENTRY_DT, LGBK_UID` (gen 202–219)
- `BAIT_USED` (≥1 node): `BT_TYP_ID, BT_WT, DG_CLOSE_DT` (gen 120–126)
- `EFFORT`: `START_DT, END_DT, LIC_NO, FMA_ID, SAR_IND, MM_INTER_IND, DG_CLOSE_DT` (gen 229–240)
- `TGT_SPECIES.SPECIE_ID` = 1312 hardcoded (gen 244)
- `EFFORT_BY_GEAR.GEAR_ID` = 925 hardcoded (gen 247)
- `EFFORT_DETAIL`: `NB_GEAR_HLD` (gen 269), `GEAR_GRP_NUM` = '1' hardcoded (gen 284)
- `CATCH`: `SPECIE_ID` = 1312 (gen 312), `KEPT_WT` (gen 313; `catchWeight` is save-gate-required for all four subforms), `SPECIE_FRM_ID` = 4691 (gen 321)
- `LANDING`: `START_DT, PORT_ID, DG_CLOSE_DT` (gen 385–392; `landingTime`/`portId` save-gated)

Per-region additions on a minimal send:

- **88 (QC):** `CREW_NB` (gen 206), `TRIP.PORT_ID` (209), `USE_CR_IND` — always emits `'Y'` or default `'N'` (216), `PRTNSHP_ID` (217), `SOAKED_DUR` if entered (257–261), `NB_VNTCH`/`NB_VNTCH_YOU` FMA- and value-gated (263–268), `GRID_ID` FMA-gated (280–282), `LAT`/`LONG` (291–299; `gpsCoords` save-gated for 88).
- **89 (GLF):** `SOAKED_DUR` if entered, `LAT`/`LONG` (save-gated for 89).
- **90 (MAR):** `LGRID_ID` value-gated (274; save-gate forces it only for the Rule-619 FMA set, `FullDfoForm.tsx:1184`), `OBS_TRIP_NUM` value-gated (211), `LAT`/`LONG` only when FMA = 38b (291–292), `NB_SPCMN_BRD` only FMA 38b, value-gated (324–326).
- **91 (NL):** `TRIP.PORT_ID` (209), `GEAR_SBTYP_ID` (249), `SOAKED_DUR` if entered, `TRP_SZ_ID` (303), `STAT_SECT_ID` FMA-gated (308), `NB_SPCMN_KEPT` (318–320; save-gated).

### F4. Classification against the source tables

**233 — flagged:** `VRN` (CSV `REQUIRED?=N`, rows quoted in A2/A3 context; unavoidably emitted — see F1). `FIN` always emits too but is rule-mandatory per Rule 961 (non-Arctic), so not flagged.

**222 — flagged (Y-path):** `TGT_SPECIE_ID`, `GEAR_ID`, `GEAR_DMG_IND` (unavoidable — hardcoded/defaulted), plus `INTERACT_DT`, `LAT`, `LONG`, `NAME`, `ADDR`, `NOAA_SPECIE_COD`, `NB_SPCMN_BEST` (app-validator-forced), plus `REM` when `entangleInd='Y'`. All carry `REQUIRED?="N"` in the 222 CSV (flag dump in Part F preamble source run). **These are the elements that would fail a strict mandatory-only 222 Y case** — subject to the 222 grid's own softer "still accessible" wording (Part E2).

**234 — nothing flagged.** Cross-check of every unconditional emit against `Subforms_requirements_234.xlsx` (sheet "F234 - Subforms requirements"):

| Always-emitted element | Sheet row | 88 / 89 / 90 / 91 | Note |
|---|---|---|---|
| GENERAL_INFO ×7 | rows 6–12 | Mandatory ×4 each | incl. FIN/VRN — Mandatory on the 234 (unlike the 233 CSV) |
| LGBK_UID, TRIP_NUM, START_DT, OPER_NAME, FIRST_ENTRY_DT | 14–17, 23 | Mandatory ×4 | |
| CREW_NB | 18 | M / B / M / B | emit gated `subformId === 88 \|\| 90` (gen 206) — matches |
| TRIP.PORT_ID | 19 | M / B / B / M | emit gated 88/91 (gen 209) — matches |
| PRTNSHP_ID, USE_CR_IND | 20–21 | M / B / B / B | emit gated 88 (gen 215–218) — matches |
| BT_TYP_ID, BT_WT, BAIT.DG_CLOSE_DT | 26, 28, 29 | Mandatory ×4 | BT_COND_ID (row 27, Optional/Blocked-91) emits only where the fact-sheet rules make it mandatory (gen 115–119) |
| EFFORT START/END/FMA_ID/LIC_NO/SAR_IND/MM_INTER_IND/DG_CLOSE_DT | 62–69 | Mandatory ×4 | LOST_GEAR_IND (row 66, Blocked ×4) not emitted |
| TGT_SPECIES.SPECIE_ID | 72 | Mandatory ×4 | |
| GEAR_ID | 74 | Mandatory ×4 | GEAR_SBTYP_ID (row 75) NL-Mandatory — gated 91 (gen 249) |
| GEAR_GRP_NUM, NB_GEAR_HLD | 78, 80 | Mandatory ×4 | |
| EFFORT_DETAIL LAT/LONG | 82–83 | M / M / **O** / B | 88/89 always (save-gated); 90 emitted only for FMA 38b where FS-234 Rule 3059 makes it mandatory; 91 never — matches |
| TRP_SZ_ID | 79 | B / B / B / M | gated 91 — matches |
| CATCH.SPECIE_ID, SPECIE_FRM_ID | 91–92 | Mandatory ×4 | |
| **KEPT_WT** | 94 | **Optional ×4** | always emitted (save-gate requires `catchWeight` all four) — **rule-backed**: FS-NAT-234-12-EN Rule 631 (extracted-text lines 1722–1729, verbatim): "If the species caught (Catch.Specie_id) is one of: … 1312 Lobster … then the capture of the kept weight (Catch.Kept_wt) is mandatory." The single CATCH node is always 1312. Not a violation |
| NB_SPCMN_KEPT | 93 | B / B / B / **O** | 91-only, save-gated — rule-backed (Rule 976 per the S110 wiring; sheet note row 124 allows fact-sheet escalation) |
| GRID_ID | 84 | **O** / B / B / B | 88 FMA-map-gated — rule-backed (Rule 1012 escalates to Mandatory for the non-blocked QC FMAs) |
| LGRID_ID | 85 | B / B / **O** / B | 90 value-gated; save-gate forces it only for the Rule-619 FMA list (FS-234-12 extracted-text lines 1239–1266: "The Lobster catch and settlement grid (Effort_detail.Lgrid_id) must be MANDATORY if the fishery management area (Effort.Fma_id) is one of : 1581 … [LFA 27–37 list incl. 1589 = LFA 34]") — rule-backed |
| STAT_SECT_ID | 86 | B / B / B / **O** | FMA-gated to the Rule-621 17-FMA set — rule-backed |
| NB_SPCMN_BRD | 96 | B / B / **O** / B | 90 + FMA-38b only, value-gated; Rules 654/655 govern — rule-backed/omittable |
| LANDING START_DT/PORT_ID/DG_CLOSE_DT | 100–102 | Mandatory ×4 | LANDING.VRN (row 99, 88-Optional) emits only when `useCrInd==='Y'` where Rule 642 mandates it (gen 391) |
| All REM elements | 24, 30, 40, 60, 70, 76, 89, 97, 103 | Optional | all value-gated via `tag()` — absent on a no-notes T2 (gen comment 77–80) |

Sheet legend for the escalation logic, verbatim (sheet rows 123–125): "Mandatory" = "the application will force the entry of this information if this subform is selected and the node is used by the user…"; "Optional" = "…Rules of the fact sheet might change it to either "Blocked" or "Mandatory" depends on specific conditions."; "Blocked" = "the application must prevent the entry of this information if this subform is selected."

---

## NOT FOUND / COULD NOT VERIFY

- **FS-NAT-222-1-EN.pdf rule for `LGBK_NUM_REF`: NOT FOUND.** Searched the full pdftotext extraction (416 lines) for `lgbk`, `logbook number`, `num_ref`, `referred`, `refers` — zero hits. Extraction itself verified working (MM_INTER rules 1027/1029/2022 extract fine). The 222 fact sheet simply has no rule on that element.
- **Any rule making 233 `LOGBOOK_UID_REFERED` mandatory or blocked in a scenario: NOT FOUND** — searched FS-NAT-233-2-EN/FR (full rule inventory listed in A3), DFO instructions_NAT_233-2 (eng+fre, no mention of the element at all), the Structure XML PDF, and the whole of `~/Desktop/DFO/` (A5). Rule 953 (value format when present) is the only rule that touches it.
- **A 233 CSV rule-number column: does not exist** (A2) — the prompt asked for "any rule number cited in the row"; the CSV schema has none.
- **Whether the TRG grader treats app-forced optionals as "mandatory" under the 222's "still accessible" wording: not source-answerable.** The workbooks define neither "accessible" nor an N/A convention (full cell dump read; no such cells exist). Facts quoted in Part E; interpretation is not attempted here.
- **`Sous-formulaires-exigences_234.xlsx` (FR twin of the subforms sheet): not separately transcribed** — the EN sheet was used as the authority per the prompt ("Subform Requirements for the 234"). Not checked for divergence.
- **Tooling note (affects future greps of this folder):** BSD/ugrep in a UTF-8 locale silently fails to match ASCII strings on lines containing cp1252 bytes — the 233 CSV shows 0 matches for `LOGBOOK_UID_REFERED` under plain `grep` even though the bytes are present (proven via Python byte-scan; `LC_ALL=C grep` matches). The Claude Code shell additionally aliases `grep` to ugrep with `-I`, which skips such files entirely as "binary". All CSV claims in this report were made from cp1252-decoded Python reads; the A5 sweep used `LC_ALL=C` system grep + pdftotext + zip-member scans.
