# GATE — Session 100: DFO-French terminology cross-check (read-only recon)

Date: 2026-07-15. Repo tip at session start: see `git log` (S99 Round-4 commits landed).
READ-ONLY SESSION — this gate doc is the ONLY file created/edited; no git state changes; no
DFO POST. Purpose: verify every FR term in the app + §17/§22/§25 against MPO's OWN French
documents (the answer key). Replaces the cancelled proofreader handoff; last pre-capture gate.

## §0 SUMMARY (Phase 3)

**Counts by severity:** **15 HIGH** (6 rule-mandated ⚖ incl. the EN-twin bonus row M6, 4 app
term/title, 3 EN-rendering dropdowns, 2 document) · **18 MED** · **10 LOW** · **3 cat-7
MPO-internal** (informational) · **cat 6 (accents/encoding) = ZERO findings** · passes on
record in §3.6 (wind chips = exact MPO match; FIN label matches the Rule-931 mandate).

**Counts by category:** 1 TERM ≈ 28 rows (6 of them ⚖ rule-mandated) · 2 TITLE 4 · 3
ABBREV/UNIT 2 · 4 STALE VERSION 2 (§17 v234.6 ×2 per language; §22 missing) · 5 EN-LEFTOVER
9 (8 code render sites + "ELOG" in FR strings) · 6 ACCENT 0 · 7 MPO-INTERNAL 3.

**By fix type (see §4):** string-only edits ≈ 24 items · code changes 8 (the §3.3 dropdowns)
· document rebuilds 3 (§22 rebuild; §17 re-export both languages after fixes; §17 wording).
Rule-mandated items are PRE-MARKED MUST-FIX per the Phase-3 gate instruction.

**Sequencing reality (for the decision pass):** the 8 CODE items (E1–E8) are behavior changes
(locale-aware label selection), not string swaps — they carry tsc/jest/device gates and
should be their own session(s); the STRING items are one locale-file session; §17/§22 doc
work is Jonny-side authoring with app-string dependencies (fix strings FIRST, then re-export
§17 FR/EN and build §22 against the corrected UI).

---

## §1 SOURCE INVENTORY (Phase 0)

### 1.1 Answer key — MPO FR documents on disk (~/Desktop/DFO/)

**ELOG_F234/ — CURRENT 234.12 package (XSD filename date 20260624 ✓ confirmed):**
| File | Role |
|---|---|
| `FS-NAT-234-12-FR.pdf` | 234.12 FR fact sheet — answer key ✓ |
| `DFO instructions_NAT_234.7_FRE.pdf` | MPO instructions 234.7 FR — answer key ✓ |
| `Sous-formulaires-exigences_234.xlsx` | Subforms requirements **FR** — present ✓ (FR twin of Subforms_requirements_234.xlsx) |
| `39673.234…Journal de bord - Homard_20260624 000000.xsd` (+ .csv/.xlsx) | current XSD + dictionary; FR element descriptions in the csv/xlsx |
| (also present: EN twins, Lisezmoi/Readme, `NAT - Structure XML Homard…pdf`) | |

⚠️ Disambiguation honored: `ELOG_F234_old_234-11/` (XSD …20260130) exists and is diff-baseline
ONLY — not used as answer key.

**ELOG_F222/:** `FS-NAT-222-1-FRE.pdf`, `DFO instructions_222-1 0_fre.pdf`, plus the FR-titled
XSD/csv/xlsx (`…Formulaire d'interaction avec un mammifère marin…`). Answer key ✓.
**ELOG_F233/:** `FS-NAT-233-2-FR.pdf`, `DFO instructions_NAT_233-2_fre.pdf`, plus the FR-titled
XSD/csv/xlsx (`…Rapport d'inactivité…` — note the folder's own filenames carry mojibake,
e.g. "inactivitÇ" / F222 "mammifäre": filesystem-only, flagged for awareness, NOT touched).
**ELOG_reftables/:** 100+ `MV_*.csv` with FR columns — includes `MV_CARDINAL_POINTS_rel3.csv`
(authoritative FR compass points for the chip wind map), `MV_BAIT_TYPE/`_CONDITION`,
`MV_CONFIDENCE_LEVEL`, `MV_PORT`, species/gear tables. Answer key ✓.
**Also available if needed:** `ELOG_dict/`, `ELOG_standard/`, TRG xlsx sheets (bilingual),
`ELOG_qualifications/` (FR attestation script + Lettre d'attestation).

### 1.2 Targets on disk — app strings
| Target | Path | Status |
|---|---|---|
| common.json EN/FR | `src/i18n/locales/{en,fr}/common.json` | present ✓ |
| **dfo.json EN/FR** | `src/i18n/locales/{en,fr}/dfo.json` | present — **see scope flag §1.5** |
| map.json EN/FR | `src/i18n/locales/{en,fr}/map.json` | present — see §1.5 |
| chipLabels.ts | `src/utils/chipLabels.ts` | present ✓ (labels resolve from common.json `log.windDirLabels`/`log.weatherLabels`) |
| String inventory docs | `docs/GATE_S97_FRENCH.md` + `docs/GATE_S98_FRENCH_FIX.md` | present ✓ (113-string inventory; live JSON is authority) |

### 1.3 Targets on disk — compliance documents
| Doc | Path | Identity check (title page via pdftotext) |
|---|---|---|
| §17 FR | `assets/docs/providers_instructions_fr.pdf` | "INSTRUCTIONS DU FOURNISSEUR … §17 — Version 1.1 \| app 1.8.6 \| Juin 2026" ✓ (only the PDF is on disk — no separate master found; reading via pdftotext per instructions) |
| §25 FR | `assets/docs/Enonce_Prerequis_FR.pdf` | "ÉNONCÉ DES PRÉREQUIS … §25 — Version 1.0 \| app 1.8.6 \| Juin 2026" ✓ |
| §25 EN twin | `assets/docs/Presrsquisites_Statement_en.pdf` | filename typo noted per instructions — IGNORED, nothing renamed |

### 1.4 ⚠️ MISSING SOURCE — §22 FR User's Guide v1.0 (STOP condition)
Searched: `~/Desktop` (incl. DFO folder + repo), `~/Downloads`, `~/Documents`, repo `docs/`
and `assets/docs/` — by "guide", "utilisat…", "User*Guide", "LobsterLog*.pdf". **No §22
User's Guide found in EITHER language.** Per the hard rule I am not substituting from memory.
Target C cannot be checked until you point me at the file (or confirm it doesn't exist yet,
in which case Phase 2 runs on A/B/D only and §22 is checked in a later session).

### 1.5 SCOPE CLARIFICATION — the DFO-flow strings are NOT in common.json
Target A says "common.json — every FR string in the DFO flow…" but the DFO flow lives in
**dfo.json** (setup, form234/222/233, logs, tripConfirm, attestation, privacy, portSelector);
common.json holds signup/onboarding (login.*), Daily Log home (log.*), settings, backup,
account, nav, pro; map.json holds the map surface. Presumed intent: cross-check
**common.json + dfo.json** (dfo.json is where nearly all MPO-facing terminology lives), with
map.json included for completeness. **Please confirm scope at this gate.**

### 1.6 Noticed, not acted on (flag-only, per instructions)
- `~/Desktop/DFO/ELOG_reftables 2/` — duplicate-looking reftables folder (dated Jul 5)
  beside the original; not inventoried as key (original used). Decide separately.
- F222/F233 answer-key FILENAMES carry encoding artifacts ("mammifäre", "inactivitÇ") —
  contents unaffected; nothing renamed.

---

**Phase-0 gate decisions (Jonny, on record):** scope = A/B/D (common.json + dfo.json + map.json
for A). **§22 confirmed missing everywhere → recorded as HIGH finding, rebuild required**
(carried to §3/§4). **Additional confirmed finding:** §17 v234.6 references are stale — the
bundled DFO Instructions are already 234.7; bundled §17 PDFs will need re-export/replacement
after fixes (carried to §3/§4; all occurrences located in Phase 2).

---

## §2 MPO TERM GLOSSARY (Phase 1)

Sources: `dict` = XML dictionary CSVs (SHORT_DESC_FRE — MPO's own FR label per element);
`FS234/222/233` = the FR fact sheets (rule numbers cited); `reftable` = MV_*.csv DESC_FRE;
`instr` = DFO instructions FR. Rule-mandated strings are VERBATIM authority; dictionary labels
are MPO's normative naming; reftable values are display authority for coded lists.

### 2.A Form & document titles
| Concept | MPO FR term | Source |
|---|---|---|
| The 234 form | JBE – Journal de bord – Homard | dict FORM_DESC_FRE; FS234 title page |
| The 222 form | JBE – Formulaire d'interaction avec un mammifère marin | dict; FS222 title page |
| The 233 form | JBE – Rapport d'inactivité | dict; FS233 title page |
| ELOG (the program) | JBE (journal de bord électronique) | all FR docs |
| DFO | MPO (Pêches et Océans Canada) | all FR docs |
| Fact sheet | Fiche technique | FS titles |
| DFO Instructions (the doc type) | Instructions du MPO | FS233 §5.3 ("Les instructions du MPO sont des documents…") |
| 222 follow-up doc name | déclaration d'interaction avec un mammifère marin | FS234 Rule 781 |

### 2.B RULE-MANDATED user-facing FR strings (verbatim authority)
| Element / trigger | MANDATED FR | Source |
|---|---|---|
| FIN label (ALL screens) | « NIP du détenteur de permis » | Rule 931 (FS234 + FS233 identically). ⚠️ MPO's own dictionary says "NIP du **titulaire** de permis" — internally inconsistent; the RULE is the mandate (app already follows 931, S77) |
| SAR_IND question label | Y a-t-il eu interaction avec une espèce en péril durant cet effort de pêche? | Rule 603, FS234 p.21 |
| SAR=Oui follow-up prompt | Veuillez S.V.P. remplir la section concernant les interactions avec une espèce en péril. | Rule 604 |
| MM_INTER_IND question label | Y a-t-il eu interaction avec un mammifère marin durant cet effort de pêche? | Rule 780 |
| MM=Oui follow-up prompt | Veuillez S.V.P. remplir la déclaration d'interaction avec un mammifère marin. | Rule 781 |
| >24h landing warning | « La date et heure du débarquement se situe à plus de 24 heures dans le futur, ce qui pourrait être une erreur. SVP, vérifier et, au besoin, corriger s'il s'agit d'une erreur. » | Rule 980 |
| No-effort landing warning | « Vous n'avez déclaré aucun effort de pêche dans ce journal de bord. Si vous avez levé un engin de pêche, vous devez compléter la section effort de pêche, autrement, continuez. » | Rule 1052 |
| VRN format rule wording | Le numéro d'enregistrement du bateau … 4, 5 ou 6 chiffres | Rule 528 (FS233; format app-enforced S70) |

### 2.C Element labels — Form 234 (dict SHORT_DESC_FRE)
| Element | MPO FR label |
|---|---|
| VRN | Numéro d'enregistrement du bateau (NEB) |
| FIN | NIP du titulaire de permis (⚠ superseded by Rule 931 "détenteur" — see 2.B) |
| REG_ID | Région administrative du MPO |
| TRIP.TRIP_NUM / START_DT | Numéro du voyage / Date/heure de début du voyage |
| TRIP.OPER_NAME / CREW_NB | Nom de l'opérateur / Nombre de membres d'équipage |
| TRIP.PORT_ID | Port de départ |
| TRIP.PRTNSHP_ID / USE_CR_IND | Type de partenariat / A utilisé un transporteur durant ce voyage ? |
| BAIT_USED.BT_TYP_ID / BT_COND_ID / BT_WT | Type d'appât utilisé / Condition de l'appât / Quantité d'appât utilisé (poids) |
| DG_CLOSE_DT (all groups) | Date de fermeture du groupe de données |
| REM (all groups) | Commentaires |
| SAR.SPECIE_ID / NB_SPCMN / SPCMN_COND_ID | Code de l'espèce en péril / Nombre d'individus / Condition des individus |
| HLIN.HLIN_NUM | Numéro de confirmation de l'appel en mer ("hail in" = appel en mer) |
| HLIN.HLIN_CIE_ID | Cie émettrice du no de confirmation de l'appel en mer |
| HLIN.ETA_DT / TOT_WT_ONBRD | Date/heure estimée d'arrivée / Poids total à bord (espèce visée) |
| HLOUT.HLOUT_NUM | Numéro de confirmation de l'appel de sortie en mer ("hail out" = appel de sortie en mer) |
| EFFORT.START_DT / END_DT | Date/heure de début / de fin de l'effort de pêche |
| EFFORT.FMA_ID | Zone de gestion |
| EFFORT.LIC_NO | Numéro du permis |
| TGT_SPECIES.SPECIE_ID | Espèce visée |
| EFFORT_BY_GEAR.GEAR_ID / GEAR_SBTYP_ID | Engin de pêche / Détails concernant l'engin |
| EFFORT_DETAIL.TRP_SZ_ID | Taille des casiers |
| EFFORT_DETAIL.NB_GEAR_HLD | Nombre d'engins levés |
| EFFORT_DETAIL.SOAKED_DUR | Durée d'immersion de l'engin |
| EFFORT_DETAIL.GRID_ID / LGRID_ID / STAT_SECT_ID | Quadrilatère / Grille du homard / Section statistique |
| EFFORT_DETAIL.NB_VNTCH / NB_VNTCH_YOU | Nombre de spécimens capturés et déjà encochés / Nombre de spécimens encochés par le pêcheur |
| CATCH.SPECIE_ID / SPECIE_FRM_ID | Espèce / Forme du produit |
| CATCH.KEPT_WT / NB_SPCMN_KEPT / NB_SPCMN_DISC / NB_SPCMN_BRD | Poids estimé conservé / Nombre de spécimens conservés / … rejetés / Nombre de femelles oeuvées |
| PCONS.SPECIE_SZ_ID / WT / USG_ID | Grosseur / Poids estimé conservé / Utilisation visée |
| LANDING.PORT_ID / START_DT | Port de débarquement / Date/heure de début du débarquement |
| LANDING.VRN | Numéro d'enregistrement du bateau (NEB) de transport |
| TRANSFER.TRNSF_DT / FROM_VRN / TO_VRN / FROM_PND_NUM | Date du transfert / Reçu de (VRN) / Envoyé à (NEB) / No d'enclos/vivier (source) |
| TRANSFER_DTL.WT | Poids transféré |

### 2.D Element labels — Forms 222 / 233 (dict)
| Element | MPO FR label |
|---|---|
| 222 INTERACT_IND | Interaction avec un mammifère marin ? (O/N) |
| 222 REP_DATE / INTERACT_DT | Date de la déclaration / Date/heure de l'interaction |
| 222 NOAA_SPECIE_COD | Espèce |
| 222 SPCMN_COND_ID | État de l'animal |
| 222 ID_CNFDNCE_ID | Degré de confiance de l'identification |
| 222 BDY_LEN_ID | Longueur du corps |
| 222 NB_SPCMN_BEST | Meilleure estimation du nb de spécimens |
| 222 INCDNT_TYP_ID | Type d'incident |
| 222 GEAR_DMG_IND / GEAR_LOST_IND | Engin de pêche endommagé ? / Engin de pêche perdu ? |
| 222 VID_IND / PHOTO_IND / SMPL_IND / OTHR_DOC_IND | Vidéos ? / Photos ? / Échantillons ? / Autres documents ? |
| 222 EVENT_DSC / SITE_DSC | Description de l'évènement / Emplacement |
| 233 REPORT_DTL.START_DT / END_DT | Date/heure de début / de fin de l'inactivité |
| 233 REASON / LIC_NO | Raison / Numéro du permis |

### 2.E Reftable FR display values (the coded lists the app renders)
| Table | FR values (authority for dropdown rows) |
|---|---|
| MV_CARDINAL_POINTS | ABBRV_FRE: N NNE NE ENE E ESE SE SSE S **SSO SO OSO O ONO NO NNO** (matches the S98 chip map); DESC_FRE style "Sud-Sud-ouest" |
| MV_BAIT_CONDITION | Frais / Congelé / Salé |
| MV_CONFIDENCE_LEVEL | 39597 Certain / 39598 **Confiant** / 39599 Moyennement confiant / 39600 Incertain |
| MV_MM_SPECIMENS_CONDITION | Mort / Semble en bonne santé / Malade / Inconnu / Blessé |
| MV_MM_LENGTH_CATEGORY | "< 1 m (<3 pi)" … ">26 m (> 80 pi)" / Autre — metres + **pi** (pieds) |
| MV_SPECIMENS_CONDITION (SAR) | Vivant / Mort / La plupart sont vivants / La plupart sont morts |
| MV_INCIDENT_TYPE | Animaux morts / Empêtrement / Collision / Harcèlement / Échouement d'animaux vivants / Abattage / Malade(s) ou blessé(s) / Déprédation |
| MV_SAR_LIST | e.g. Baleine noire de l'Atlantique Nord, Tortue luth, Requin pèlerin, Loup atlantique… (DESC_FRE per row) |
| MV_NOAA_MM_SPECIES | e.g. Phoque gris, Petit rorqual, Marsouin commun, Épaulard… (DESC_FRE per row) |
| MV_CATCH_USAGE | Vente / Rejet / Consommation personnelle / Partage avec l'équipage (donné ou vendu) / Autre (spécifiez)… |
| MV_TRAP_SIZE | 39682 Standard / 39683 **Grand** |
| MV_PARTNERSHIP_TYPE | Aucun / Entente de partenariat (buddy up) |
| Gear 925 | Casier; subtypes (FS234 Rule 611 block): 39684 Casiers en bois / 39685 Casiers en treillis métallique / 39686 Casiers en treillis métallique et en bois |

### 2.F General vocabulary (fact sheets / instructions)
| Concept | MPO FR | Source |
|---|---|---|
| data group | groupe de données | FS234 §5.2.x |
| closing a data group | fermeture des groupes de données | FS234 §5.2.1 |
| section (UI sense) | section (« compléter une section (groupe de données) ») | Rule 1051 |
| fishing trip | voyage de pêche | FS234 passim |
| fishing effort | effort de pêche | FS234 passim |
| to haul gear | lever un engin de pêche | Rule 1052 |
| landing | débarquement | dict/FS234 |
| transmission | transmission des données | FS234 §5.1 |
| grid | quadrilatère | dict/FS234 |
| trap | casier | reftable/FS234 |
| soak time | durée d'immersion | dict/Rule 286/165 |
| bait | appât (type d'appât / condition de l'appât) | dict |
| species at risk | espèce en péril | dict/Rule 603 |
| marine mammal | mammifère marin | dict/Rule 780 |
| warning vs error | message d'avertissement ≠ message d'erreur | Rule 980 note |
| knots (wind) | (no MPO usage found in the 234/222/233 FR package — wind speed is not an ELOG element; nothing to inherit for "nd") | — |

## §3 DIVERGENCE TABLE (Phase 2)

Categories: 1 TERM · 2 TITLE · 3 ABBREV/UNIT · 4 STALE VERSION · 5 EN-LEFTOVER · 6 ACCENT ·
**7 MPO-INTERNAL** (per Phase-2 gate instruction — MPO's own sources disagree; notes which
source the app matches). ⚖ = the FR wording is RULE-MANDATED verbatim ("doit être") — marked
HIGH regardless of screen, because qualification reviewers check mandated wording.
Severity: HIGH = planned-screenshot-visible or DFO-facing/mandated · MED = user-visible
elsewhere · LOW = doc-only or cosmetic.

### 3.1 Rule-mandated strings (⚖ all HIGH)
| # | WHERE | OURS | MPO'S | CAT | SEV |
|---|---|---|---|---|---|
| M1 | fr/dfo `form234.sarInd` + `.sarIndLabel` | "Y a-t-il eu **une** interaction avec une espèce en péril…" | Rule 603: "Y a-t-il eu interaction avec une espèce en péril durant cet effort de pêche?" (no "une") | 1⚖ | HIGH |
| M2 | fr/dfo `form234.mmInterInd` + `.mmInterIndLabel` | "Y a-t-il eu **une** interaction avec un mammifère marin…" | Rule 780: "Y a-t-il eu interaction avec un mammifère marin durant cet effort de pêche?" | 1⚖ | HIGH |
| M3 | fr/dfo `form234.sarIndPrompt` | "Tu as indiqué une interaction… Remplis le rapport requis avant de soumettre." | Rule 604 verbatim: "Veuillez S.V.P. remplir la section concernant les interactions avec une espèce en péril." | 1⚖ | HIGH |
| M4 | fr/dfo `form234.mmInterIndPrompt` | "Tu as indiqué… Remplis le formulaire 222 avant de soumettre." | Rule 781 verbatim: "Veuillez S.V.P. remplir la déclaration d'interaction avec un mammifère marin." | 1⚖ | HIGH |
| M5 | fr/dfo `form234.landing24hWarningBody` | "La date et l'heure du débarquement dépassent de plus de 24 heures la date et l'heure actuelles…" | Rule 980 verbatim: "La date et heure du débarquement se situe à plus de 24 heures dans le futur… SVP, vérifier et, au besoin, corriger s'il s'agit d'une erreur." | 1⚖ | HIGH |
| M6 | **EN twins of M1–M4** (en/dfo) | e.g. "Did a species at risk interaction occur?" / "…complete the section concerning marine mammal interactions." | Rules 603/780 EN: "Was there any interaction with a species at risk/marine mammal during this fishing effort?"; Rule 781 EN: "…the declaration of interaction with a marine mammal." | 1⚖ | HIGH (bonus — outside FR scope but same rules; the S37 "DFO-exact" claim no longer holds) |

### 3.2 Term mismatches — app strings (cat 1/3)
| # | WHERE | OURS | MPO'S | CAT | SEV |
|---|---|---|---|---|---|
| T1 | fr/dfo `tripConfirm.vrnLabel`, `sendGate.vrnRule528*`, `setup.infoText`; fr/common `profile.vesselNumberLabel` | "NUMÉRO DU NAVIRE (NMV)" / "NMV" | "Numéro d'enregistrement du bateau (NEB)" (dict, all 3 forms). APP IS ALSO INTERNALLY SPLIT: form234 transfer/carrier labels already use NEB (`carrierVrnLabel`, `transferToVrnLabel`, `missingTransferFields`) | 1 | HIGH (tripConfirm + setup are capture screens) |
| T2 | fr/dfo `logs.headerTitle` "Journaux ELOG MPO", `logs.newElogButton`/`emptySubtitle` ("journal ELOG"), fr/common `nav.dfoElog` "ELOG MPO" | EN abbrev "ELOG" inside FR | MPO FR = **JBE** (journal de bord électronique) — used consistently in every FR doc incl. our own §17/§25 | 1/5 | HIGH (header pill is in EVERY FR screenshot) |
| T3 | fr/dfo `form234.gridLabel` "GRILLE" + `selectQcGrid` | grille | **Quadrilatère** (dict GRID_ID; FS234 passim) — QC-88 is the francophone subform | 1 | HIGH |
| T4 | fr/dfo `form234.lgridLabel` "GRILLE DE PEUPLEMENT DU HOMARD" | — | "Grille du homard" (dict LGRID_ID) | 1 | HIGH by def (MAR form screenshot) — wording-mild |
| T5 | fr/dfo `form234.soakDuration` + `.soakDurationLabel` "DURÉE DE TREMPAGE (JOURS)" | trempage | "Durée d'immersion (de l'engin)" (dict/Rules 286/165; our own §17 FR already says immersion) | 1 | MED (hidden on MAR captures; visible QC/GLF/NL) |
| T6 | fr/dfo `form234.trapHaulsLabel` "LEVÉES DE CASIERS" | — | "Nombre d'engins levés" (dict NB_GEAR_HLD) | 1 | MED |
| T7 | fr/dfo `form234.nbSpcmnBrdLabel` "NB. SPÉCIMENS GÉNITEURS (NB_SPCMN_BRD)" | géniteurs (+ raw element name leaked into a user label) | "Nombre de femelles oeuvées" (dict) | 1 | MED (38b-only) |
| T8 | fr/dfo `form234.sarNbSpcmnLabel` / `.sarCondLabel` | "NOMBRE DE SPÉCIMENS" / "ÉTAT DU SPÉCIMEN" | "Nombre d'individus" / "Condition des individus" (dict SAR) | 1 | MED |
| T9 | fr/dfo `form222.confidenceLabel` "CONFIANCE D'IDENTIFICATION" | — | "Degré de confiance de l'identification" (dict) | 1 | MED |
| T10 | fr/dfo `form222.specimenCondLabel` "ÉTAT DU SPÉCIMEN" | — | "État de l'animal" (dict 222) | 1 | MED |
| T11 | fr/dfo `form222.nbAnimalsLabel` "NOMBRE D'ANIMAUX" | — | "Meilleure estimation du nb de spécimens" (dict NB_SPCMN_BEST — the element we emit) | 1 | MED |
| T12 | fr/dfo `form234.usageOption_37814` "Part d'équipage" | — | "Partage avec l'équipage (donné ou vendu)" (MV_CATCH_USAGE 37814) | 1 | MED |
| T13 | fr/dfo `form234.baitConditionLabel` "ÉTAT" + `pleaseSelectBaitCondition` | état de l'appât | "Condition de l'appât" (dict BT_COND_ID) | 1 | MED (bait section is a capture screen) |
| T14 | fr/dfo `form234.hlinSection`/`hloutSection` "HLIN — Entrée au quai (acheteur)" / "HLOUT — Sortie du quai (acheteur)" | — | appel en mer / appel de sortie en mer (dict HLIN/HLOUT) | 1 | MED (38b/41 only) |
| T15 | "sortie" for TRIP throughout — fr/dfo `tripConfirm.headerTitle`/`tripStartCard`, `form234.tripInfoSection`/`tripIdLabel`, `logs.regTripLabel`/`submittedBody` | sortie | **voyage (de pêche)** (dict TRIP.*; FS234 passim; MPO reserves "sortie en mer" for the observer field) | 1 | MED (tripConfirm is a capture screen) |
| T16 | fr/dfo `form234.keptWt` "Poids conservé" + `catchWeightLabel` | — | "Poids estimé conservé" (dict KEPT_WT) | 1 | LOW |
| T17 | fr/dfo `form234.gearSubtypeLabel` "SOUS-TYPE D'ENGIN" | — | "Détails concernant l'engin" (dict GEAR_SBTYP_ID) — MPO's label is odd; ours arguably clearer | 1 | LOW (NL-91) |
| T18 | fr/dfo `form234.trapSizeLabel` "TAILLE DU CASIER" | singular | "Taille des casiers" (dict) | 1 | LOW |
| T19 | fr/dfo `form234.etaLabel` "HPA" | unexplained abbrev | "Date/heure estimée d'arrivée" (dict ETA_DT); no MPO FR abbrev found | 3 | LOW |
| T20 | fr/dfo `form234.fma` "Zone de gestion de la pêche" | — | "Zone de gestion" (dict FMA_ID). (`fishingAreaLabel` "ZONE DE PÊCHE (ZPH)" MATCHES MPO homard usage — pass) | 1 | LOW |
| T21 | Envoyer vs Soumettre vs Transmis — fr/dfo `logs.sendToDfo` "Envoyer au MPO" / `form23x.submitButton` "Soumettre au MPO" / `submittedTitle` "Transmis" | three verbs | MPO verb family = transmission/transmettre (FS §5.1); not mandated for UI — app-internal inconsistency flag | 1 | LOW |
| T22 | fr/dfo `form234.usageOption_37824` "Autre" | — | "Autre (spécifiez)" (MV) | 1 | LOW |
| T23 | fr/map `map.soakTime` "Temps de trempage" | free-app map | immersion (see T5) | 1 | LOW (free-app) |
| T24 | fr/dfo `form222.headerTitle` "Formulaire 222 · Mammifères marins" / `form233.headerTitle` "· Inactivité" | short titles | MPO: "Formulaire d'interaction avec un mammifère marin" / "Rapport d'inactivité" | 2 | LOW (short form defensible; MPO full title appears in our card bodies) |

### 3.3 EN-in-FR-UI — coded dropdowns that always render English (cat 5)
The FR column exists in every one of these reftables; the render site hardcodes the EN one.
| # | WHERE (code) | WHAT THE FR USER SEES | FR AVAILABLE | SEV |
|---|---|---|---|---|
| E1 | Form 222 pickers — dfoForm222Generator.ts:19–43 (`descEn` for MARINE_MAMMAL_SPECIES / INCIDENT_TYPES / CONFIDENCE_LEVELS / SPECIMEN_CONDITIONS / LENGTH_CATEGORIES) | English species ("Gray Seal"), incident types ("Entanglement"), confidence ("Probable"), condition ("Injured"), lengths ("ft") | Phoque gris / Empêtrement / Confiant / Blessé / "pi" | HIGH (222 is a capture screen). ⚠ Corrects the S90 CLAUDE.md claim that the trio renders "reftable descFr" — live code is descEn |
| E2 | SAR species dropdown — FullDfoForm.tsx:1021 (`o.descEn`, MV_SAR_LIST) | "Whale, North Atlantic Right", "Turtle, Leatherback Sea"… | Baleine noire de l'Atlantique Nord, Tortue luth… | HIGH (Interactions section) |
| E3 | Bait-condition sheet — FullDfoForm.tsx:2020/2034 (`descEn`, MV_BAIT_CONDITION) | Fresh / Frozen / Salted | Frais / Congelé / Salé | HIGH (bait section is a capture screen) |
| E4 | SAR condition picker — FullDfoForm.tsx:1805/1818 (`descEn`, MV_SPECIMENS_CONDITION) | Alive / Dead / Mostly alive… | Vivant / Mort / La plupart sont vivants… | MED |
| E5 | Bycatch usage picker — FullDfoForm.tsx:103 (`u.descEn`, MV_CATCH_USAGE) | "Sale", "Discard", "Personal consumption"… | Vente / Rejet / Consommation personnelle… | MED |
| E6 | Gear subtype — dfoConstants.ts:1387–91 EN literals ('Wooden traps'…) | Wooden traps / Wire mesh traps | Casiers en bois / Casiers en treillis métallique (/ et en bois) — FS234 Rule 611 block | MED (NL-91) |
| E7 | Trap size — dfoConstants.ts:1394–97 EN literals | Standard / Large | Standard / **Grand** (MV_TRAP_SIZE) | MED (NL-91) |
| E8 | Port selector — DfoPortSelector.tsx:107 (`p.nameEn` displayed; stores nameEn) | English port names | `nameFr` exists (QC names differ; NS mostly identical) | MED |

### 3.4 Documents — §17 / §25 / §22 (cats 2/4 + confirmed findings)
| # | WHERE | OURS | MPO'S / CURRENT | CAT | SEV |
|---|---|---|---|---|---|
| D1 | §17 FR p.— (pdftotext lines 249, 369) AND §17 EN (lines 235, 347) | "formulaire 234, v234.6" / "formulaire 234 v234.6" — **exactly 2 occurrences per language, confirming the earlier count** | Current package: fiche technique **234-12**; bundled Instructions du MPO are **234.7** | 4 | HIGH — bundled §17 PDFs (assets/docs, both languages) need re-export/replacement after fixes (Jonny-confirmed) |
| D2 | §22 FR User's Guide v1.0 | **MISSING everywhere** (both languages not found on disk) | required compliance doc | 2/4 | HIGH — rebuild required (Jonny-confirmed at Phase-0/1 gates) |
| D3 | §17 FR lines 89/127 | "numéro de navire (VRN)" — EN abbrev in FR + third variant of the VRN term (see T1) | "Numéro d'enregistrement du bateau (NEB)" | 1/3 | MED (doc-only) |
| D4 | §17 FR §2.4 | "Configuration du JBE du MPO" / "Activer le JBE du MPO" — §17 describes UI labels that don't match the live app FR ("Configuration MPO" / "Activer le journal MPO") | doc must match the shipped UI (and note: the DOC's phrasing is the more MPO-correct — see T2) | 2 | MED |
| D5 | §17 FR line 173 | "casiers halés" | MPO verb = levés ("Nombre d'engins levés", "levé un engin de pêche") | 1 | LOW |
| D6 | §25 FR | terminology clean (JBE ✓, journal de bord ✓, no EN leftovers, accents intact) | — | — | PASS |

### 3.5 MPO-internal inconsistencies (cat 7 — per gate instruction; NOT app divergences)
| # | CONCEPT | MPO SOURCE A | MPO SOURCE B | APP CURRENTLY MATCHES |
|---|---|---|---|---|
| I1 | FIN label | Rule 931 (FS234+FS233): « NIP du **détenteur** de permis » — a mandate | dict SHORT_DESC_FRE (all 3 forms): "NIP du **titulaire** de permis" | **Rule 931** ✓ (all-caps rendering, known S77 deviation — casing only) |
| I2 | SAR/MM indicator label | Rules 603/780 long question form ("Y a-t-il eu interaction…?") — a mandate | dict short form ("Interaction avec une espèce en péril durant cet effort de pêche?") | NEITHER verbatim — app uses the rule's question form + an extra "une" (rows M1/M2); fix should target the RULE text |
| I3 | 222 body-length units | dict BDY_LEN_ID "Longueur du corps" | MV_MM_LENGTH_CATEGORY values mix m + "pi" with EN-style decimals ("1.5 m") | app label matches dict ✓ (values currently EN anyway — E1) |

### 3.6 Verified PASSES (on record)
Wind chip map = EXACT MPO ABBRV_FRE match (all 16 incl. SSO/SO/OSO/O/ONO/NO/NNO);
`finLabel` matches Rule 931 (caps only); Settings docs card "Instructions du MPO 234.7" ✓
official term; QC GRID picker rows display DESC_FRE map codes ✓; STAT_SECT picker is
locale-aware (descFr in FR) ✓; `form222.lengthCatLabel` = dict verbatim ✓;
`partnershipOption_*` = MV verbatim ✓; `fishingAreaLabel` ZPH usage ✓; `usageOption_37822/
37818/37820` = MV verbatim ✓; no mojibake / no missing accents in any FR json or FR PDF (cat
6 = zero findings); §25 FR clean (D6).

### 3.7 Capture-plan exposure (which HIGHs are on planned screens)
- Every FR screenshot: T2 (header pill "ELOG MPO").
- DFO logs list: T2 (headerTitle).
- Confirm Trip Start: T1 (NMV), T15 (sortie).
- Setup screen: T1 (infoText NMV).
- Main DFO form (MAR): T4 (LGRID), E3 (bait condition EN), M1/M2 (SAR/MM questions), E2/E4
  (SAR pickers if Interactions section captured).
- Form 222: E1 (all five pickers EN), T9/T10/T11.
- Docs card: PASS (correct as-is).
- Login/Daily-Log/history/chips: no MPO-bound terms; chips PASS (3.6).

## §4 DECISION LIST (Phase 3)

Tags: **[STRING]** = locale-json value edit only · **[CODE]** = render-site/behavior change
(tsc/jest/device gates) · **[DOC]** = document authoring/re-export · **[CAPTURE]** = visible
on a planned capture screen. ⚖ rows are PRE-MARKED MUST-FIX (rule-mandated verbatim wording).
Mark the rest: fix / accept / defer. No edits made this session; no code proposed here.

**Pre-marked MUST-FIX (⚖ rule-mandated):**
- [x] MUST-FIX **M1** [STRING][CAPTURE] `form234.sarInd`+`.sarIndLabel` → Rule 603 FR verbatim
- [x] MUST-FIX **M2** [STRING][CAPTURE] `form234.mmInterInd`+`.mmInterIndLabel` → Rule 780 FR verbatim
- [x] MUST-FIX **M3** [STRING] `form234.sarIndPrompt` → Rule 604 FR verbatim
- [x] MUST-FIX **M4** [STRING] `form234.mmInterIndPrompt` → Rule 781 FR verbatim
- [x] MUST-FIX **M5** [STRING] `form234.landing24hWarningBody` → Rule 980 FR verbatim
- [x] MUST-FIX **M6** [STRING] EN twins of M1–M4 (en/dfo.json) → Rules 603/780/781 EN verbatim

**App terms (HIGH first):**
- [ ] fix / accept / defer — **T1** [STRING][CAPTURE] NMV → « Numéro d'enregistrement du bateau (NEB) » (tripConfirm/sendGate/setup + common profile; also unifies the app's own NMV-vs-NEB split)
- [ ] fix / accept / defer — **T2** [STRING][CAPTURE-ALL] "ELOG" → "JBE" in FR (`logs.headerTitle`, `newElogButton`, `emptySubtitle`, `nav.dfoElog` — the header pill on every FR screenshot)
- [ ] fix / accept / defer — **T3** [STRING] QC "GRILLE" → « QUADRILATÈRE » (`gridLabel`, `selectQcGrid`)
- [ ] fix / accept / defer — **T4** [STRING][CAPTURE] `lgridLabel` → « GRILLE DU HOMARD »
- [ ] fix / accept / defer — **T5** [STRING] trempage → immersion (`soakDuration*`; §17 FR already says immersion)
- [ ] fix / accept / defer — **T6** [STRING] `trapHaulsLabel` → « NOMBRE D'ENGINS LEVÉS » (or keep casiers phrasing — your call)
- [ ] fix / accept / defer — **T7** [STRING] `nbSpcmnBrdLabel` → « NOMBRE DE FEMELLES OEUVÉES » (+ drop the raw "(NB_SPCMN_BRD)" from the label)
- [ ] fix / accept / defer — **T8** [STRING] SAR « Nombre d'individus » / « Condition des individus »
- [ ] fix / accept / defer — **T9** [STRING][CAPTURE] 222 confidence → « DEGRÉ DE CONFIANCE DE L'IDENTIFICATION »
- [ ] fix / accept / defer — **T10** [STRING][CAPTURE] 222 condition → « ÉTAT DE L'ANIMAL »
- [ ] fix / accept / defer — **T11** [STRING][CAPTURE] 222 nbAnimals → « MEILLEURE ESTIMATION DU NB DE SPÉCIMENS »
- [ ] fix / accept / defer — **T12** [STRING] usage 37814 → « Partage avec l'équipage (donné ou vendu) »
- [ ] fix / accept / defer — **T13** [STRING][CAPTURE] bait « ÉTAT » → « CONDITION DE L'APPÂT »
- [ ] fix / accept / defer — **T14** [STRING] HLIN/HLOUT → « appel en mer » / « appel de sortie en mer » phrasing
- [ ] fix / accept / defer — **T15** [STRING][CAPTURE] sortie → voyage (tripConfirm + form234 trip section + logs rows)
- [ ] fix / accept / defer — **T16** [STRING] « Poids estimé conservé »
- [ ] fix / accept / defer — **T17** [STRING] gear subtype label (MPO's own is odd — accept is reasonable)
- [ ] fix / accept / defer — **T18** [STRING] « Taille des casiers » (plural)
- [ ] fix / accept / defer — **T19** [STRING] "HPA" → spell out « Heure prévue d'arrivée » or MPO's full form
- [ ] fix / accept / defer — **T20** [STRING] `form234.fma` → « Zone de gestion »
- [ ] fix / accept / defer — **T21** [STRING] unify Envoyer/Soumettre/Transmettre (suggest transmettre family)
- [ ] fix / accept / defer — **T22** [STRING] « Autre (spécifiez) »
- [ ] fix / accept / defer — **T23** [STRING] map.json trempage (free-app — defer candidate)
- [ ] fix / accept / defer — **T24** [STRING] 222/233 header short titles (accept candidate)

**EN-rendering dropdowns (all [CODE] — locale-aware label selection; own session(s)):**
- [ ] fix / accept / defer — **E1** [CODE][CAPTURE] Form 222 five pickers → descFr in FR (dfoForm222Generator label lists + screen)
- [ ] fix / accept / defer — **E2** [CODE][CAPTURE] SAR species dropdown → descFr in FR (FullDfoForm:1021)
- [ ] fix / accept / defer — **E3** [CODE][CAPTURE] bait condition sheet → descFr in FR (FullDfoForm:2020/2034)
- [ ] fix / accept / defer — **E4** [CODE] SAR condition picker → descFr in FR (FullDfoForm:1805/1818)
- [ ] fix / accept / defer — **E5** [CODE] bycatch usage picker → descFr in FR (FullDfoForm:103; or route through the existing `usageOption_*` i18n keys)
- [ ] fix / accept / defer — **E6** [CODE] gear subtype EN literals → FR labels (⚠ no MV row for 39684–86 found in the reftables — FR values live in the FS234 Rule-611 block, so this one needs i18n keys, not a reftable repoint)
- [ ] fix / accept / defer — **E7** [CODE] trap size EN literals → Standard/« Grand » (MV_TRAP_SIZE or i18n)
- [ ] fix / accept / defer — **E8** [CODE] port selector shows nameEn only → display nameFr in FR (stored value stays nameEn/codeId — display-only)

**Documents:**
- [ ] fix / accept / defer — **D1** [DOC][CAPTURE-adjacent] §17 v234.6 → current refs (FR lines 249/369, EN lines 235/347); then re-export BOTH bundled §17 PDFs (Jonny-confirmed required)
- [ ] fix / accept / defer — **D2** [DOC] §22 User's Guide FR+EN — REBUILD (missing everywhere; Jonny-confirmed HIGH)
- [ ] fix / accept / defer — **D3** [DOC] §17 FR "numéro de navire (VRN)" → NEB (align with T1's outcome)
- [ ] fix / accept / defer — **D4** [DOC] §17 FR §2.4 UI-path wording ↔ live app labels (align AFTER T2's decision — the doc's "JBE du MPO" phrasing is the more MPO-correct)
- [ ] fix / accept / defer — **D5** [DOC] §17 FR "casiers halés" → levés

**Housekeeping (from this session's recon):**
- [ ] **H1** CLAUDE.md S90 correction (print-first, never-falsify — the historical S90 entry is
  NOT rewritten; a dated corrective note is appended beside it in a later session). Current
  line, printed verbatim (CLAUDE.md:638–639): "…own open-states wired into the mutual-exclusion
  close logic; option rows are bilingual free (reftable descFr). i18n: 6 EN keys…" — the live
  code renders `descEn` (dfoForm222Generator.ts:19–43; see E1). Proposed corrective note (to
  add in the fix session, NOT now — read-only): "S100 CORRECTION: the trio option rows render
  reftable descEn, not descFr (see docs/GATE_S100_FR_CROSSCHECK.md E1); the descFr claim was
  inaccurate at S90 write time."
- [ ] **H2** duplicate `~/Desktop/DFO/ELOG_reftables 2/` folder (§1.6) — decide keep/delete (outside repo)
- [ ] **H3** §25 EN filename typo "Presrsquisites…" — rename when next touching the bundle (D1's re-export session is the natural moment)

**Cat-7 MPO-internal (no app action; on record for any DFO conversation):** I1 détenteur-vs-
titulaire (app matches the Rule-931 mandate ✓) · I2 rule-vs-dict indicator label forms (fix
targets the RULE text) · I3 length-category unit style (values EN today anyway — E1).

---

## SESSION 100 CLOSE — read-only cross-check complete. This gate doc is the only tree change
(untracked, uncommitted — stays untracked until Jonny decides). No git run, no DFO POST, no
string/code/doc edits. Next: Jonny marks §4, then a separate session executes the fixes
(strings → code dropdowns → §17 re-export → §22 rebuild), all BEFORE screenshot capture.

--

## S101a CORRECTION (2026-07-15, appended — original rows above NOT rewritten)
§3.2 T21 recorded `submittedTitle` as "Transmis" ("already in family"). That was true of
`form222.submittedTitle` and `form233.submittedTitle`, but the logs-namespace
`logs.submittedTitle` was actually « Soumis » at S100 time. Per the S101a Phase-0 D2
ruling, `logs.submittedTitle` → « Transmis » (folded into T21). Evidence + before/after:
docs/GATE_S101A_FR_STRINGS.md §0.3 D2 / §1.1.

--

## S101b CORRECTION (2026-07-16, appended — original rows above NOT rewritten)

§3.3 row E5 is RETRACTED. FullDfoForm.tsx:103 is the BYCATCH_USAGE_OPTIONS construction
(`label: u.descEn`), but no display site renders that label — the bycatch usage picker
and saved-entry rows render `t('form234.usageOption_<codeId>')` (locale-aware; the 5
usageOption_* keys exist in en+fr dfo.json) and store the codeId. The S101a FR device
walk (F4) showed French options, confirming. E5 dropped from the S101b fix list; no code
change needed or made for E5. Also corrected by S101b recon: the E6 note "no MV row for
39684–86 found in the reftables" — MV_GEAR_SUBTYPE_rel7.csv / MV_TRAP_SUBTYPE_rel7.csv
(~/Desktop/DFO/ELOG_reftables/) DO carry those rows, with DESC_FRE identical to the
FS234 Rule-611 block (the FR values used are unchanged; their authority is upgraded).
Evidence: docs/GATE_S101B_DROPDOWNS.md §0.2/§0.6.

--

## S101b CORRECTION 2 (2026-07-16, appended — original rows above NOT rewritten)

§3.3's E-inventory (E1–E8) was INCOMPLETE: the S101b FR device walk found three more
234-form pickers rendering English in FR mode, none inventoried by S100 —
(L1) bait TYPE list (Ajouter un appât; options getDfoBaitTypeList, stored value = the
EN label in BaitEntry.type, which is ALSO the generator's BT_TYP_ID lookup key — the
same stored-label emit coupling later proven for E1), (L2) marine-mammal species list
(234 Interactions; MARINE_MAMMAL_OPTIONS hardcoded EN strings, stored value = the EN
string, never emitted), (L3) bycatch species list (Ajouter une prise accessoire;
options getDfoCatchSpeciesList, stored value = the EN label in BycatchEntry.species,
which is the generator's SPECIE_ID lookup key against the pcons list). The §3.3 scan
evidently keyed on reftable `descEn` render sites; these three lists render hand-typed
dfoConstants labels / hardcoded strings, so they escaped the sweep. Recon, storage
models, and fix designs: docs/GATE_S101B_DROPDOWNS.md (S101B SCOPE-GAP NOTE, 2026-07-16).
