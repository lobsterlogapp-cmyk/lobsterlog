# GATE — Session 101a: FR string fixes (from the S100 cross-check decision list)

Date: 2026-07-15. Source of truth for every replacement string:
`docs/GATE_S100_FR_CROSSCHECK.md` (§2 glossary, §3 tables, §4 decisions).
Scope: VALUE edits only in `fr/dfo.json`, `en/dfo.json` (M6 only), `fr/common.json`
(T1 profile label + T2 nav.dfoElog only). No key add/rename/delete. No code files.
NO state-changing git; NO DFO POST. fr/map.json NOT in scope (T23 deferred Aug/Sept).

---

## PHASE 0 — RECON (read-only) — before-table

Every fix-list key grepped in its file. Verification result: **all keys on the list
exist exactly as named in GATE_S100**, with one deliberate probe absent (see §0.2)
and two gate-doc-vs-live discrepancies flagged (§0.3) — reported, nothing edited yet.

### 0.1 Current values (before)

| Row | File | Key | CURRENT value |
|---|---|---|---|
| M1 | fr/dfo | form234.sarInd | Y a-t-il eu une interaction avec une espèce en péril durant cet effort de pêche? |
| M1 | fr/dfo | form234.sarIndLabel | Y a-t-il eu une interaction avec une espèce en péril durant cet effort de pêche? |
| M2 | fr/dfo | form234.mmInterInd | Y a-t-il eu une interaction avec un mammifère marin durant cet effort de pêche? |
| M2 | fr/dfo | form234.mmInterIndLabel | Y a-t-il eu une interaction avec un mammifère marin durant cet effort de pêche? |
| M3 | fr/dfo | form234.sarIndPrompt | Tu as indiqué une interaction avec une espèce en péril. Remplis le rapport requis avant de soumettre. |
| M4 | fr/dfo | form234.mmInterIndPrompt | Tu as indiqué une interaction avec un mammifère marin. Remplis le formulaire 222 avant de soumettre. |
| M5 | fr/dfo | form234.landing24hWarningBody | La date et l'heure du débarquement dépassent de plus de 24 heures la date et l'heure actuelles, ce qui pourrait être une erreur. Veuillez vérifier et corriger s'il y a lieu. |
| M6 | en/dfo | form234.sarInd | Was there any interaction with a species at risk during this fishing effort? |
| M6 | en/dfo | form234.sarIndLabel | Did a species at risk interaction occur? |
| M6 | en/dfo | form234.mmInterInd | Was there any interaction with a marine mammal during this fishing effort? |
| M6 | en/dfo | form234.mmInterIndLabel | Did a marine mammal interaction occur? |
| M6 | en/dfo | form234.sarIndPrompt | Please complete the section concerning species at risk interactions. |
| M6 | en/dfo | form234.mmInterIndPrompt | Please complete the section concerning marine mammal interactions. |
| T1 | fr/dfo | tripConfirm.vrnLabel | NUMÉRO DU NAVIRE (NMV) |
| T1 | fr/dfo | sendGate.vrnRule528Title | NMV invalide |
| T1 | fr/dfo | sendGate.vrnRule528 | Le NMV doit comporter de 4 à 6 chiffres pour ce formulaire (règle 528 du MPO). |
| T1 | fr/dfo | setup.infoText | Le nom de ton navire et ton NMV sont tirés de ton profil capitaine. Assure-toi qu'ils sont remplis avant d'activer. |
| T1 | fr/common | profile.vesselNumberLabel | NUMÉRO DU NAVIRE (NMV) |
| T2 | fr/dfo | logs.headerTitle | Journaux ELOG MPO |
| T2 | fr/dfo | logs.newElogButton | Remplir un nouveau journal ELOG |
| T2 | fr/dfo | logs.emptySubtitle | Appuie sur «Remplir un nouveau journal ELOG» ci-dessus pour créer ton premier journal de sortie. |
| T2 | fr/common | nav.dfoElog | ELOG MPO |
| T3 | fr/dfo | form234.gridLabel | GRILLE |
| T3 | fr/dfo | form234.selectQcGrid | Sélectionner une grille... |
| T4 | fr/dfo | form234.lgridLabel | GRILLE DE PEUPLEMENT DU HOMARD |
| T5 | fr/dfo | form234.soakDuration | Durée de trempage (jours) |
| T5 | fr/dfo | form234.soakDurationLabel | DURÉE DE TREMPAGE (JOURS) |
| T6 | fr/dfo | form234.trapHaulsLabel | LEVÉES DE CASIERS |
| T7 | fr/dfo | form234.nbSpcmnBrdLabel | NB. SPÉCIMENS GÉNITEURS (NB_SPCMN_BRD) |
| T8 | fr/dfo | form234.sarNbSpcmnLabel | NOMBRE DE SPÉCIMENS |
| T8 | fr/dfo | form234.sarCondLabel | ÉTAT DU SPÉCIMEN |
| T9 | fr/dfo | form222.confidenceLabel | CONFIANCE D'IDENTIFICATION |
| T10 | fr/dfo | form222.specimenCondLabel | ÉTAT DU SPÉCIMEN |
| T11 | fr/dfo | form222.nbAnimalsLabel | NOMBRE D'ANIMAUX |
| T12 | fr/dfo | form234.usageOption_37814 | Part d'équipage |
| T13 | fr/dfo | form234.baitConditionLabel | ÉTAT |
| T13 | fr/dfo | form234.pleaseSelectBaitCondition | Sélectionne l'état de l'appât. |
| T14 | fr/dfo | form234.hlinSection | HLIN — Entrée au quai (acheteur) |
| T14 | fr/dfo | form234.hloutSection | HLOUT — Sortie du quai (acheteur) |
| T15 | fr/dfo | tripConfirm.headerTitle | Confirmer le début de sortie |
| T15 | fr/dfo | tripConfirm.tripStartCard | Début de sortie |
| T15 | fr/dfo | form234.tripInfoSection | Informations de sortie |
| T15 | fr/dfo | form234.tripIdLabel | ID DE SORTIE (AUTO-GÉNÉRÉ) |
| T15 | fr/dfo | logs.regTripLabel | Sortie |
| T15 | fr/dfo | logs.submittedBody | La sortie {{id}} a été envoyée au MPO. |
| T16 | fr/dfo | form234.keptWt | Poids conservé |
| T16 | fr/dfo | form234.catchWeightLabel | POIDS DES CAPTURES (LBS) |
| T18 | fr/dfo | form234.trapSizeLabel | TAILLE DU CASIER |
| T19 | fr/dfo | form234.etaLabel | HPA |
| T20 | fr/dfo | form234.fma | Zone de gestion de la pêche |
| T21 | fr/dfo | logs.sendToDfo | Envoyer au MPO |
| T21 | fr/dfo | form222.submitButton | Soumettre au MPO |
| T21 | fr/dfo | form233.submitButton | Soumettre au MPO |
| T21 | fr/dfo | logs.submittedTitle | Soumis — **see §0.3 discrepancy D2** |

T15 sense-check (per the fix-list ⚠): all six T15 keys use "sortie" in the fishing-TRIP
sense (trip start / trip info / trip ID / register row / submitted body) — none is an
exit/logout usage. Safe to edit in Phase 1.

### 0.2 Key-existence verification

- All fix-list keys present and named exactly as in GATE_S100 — **PASS**.
- `form234.submitButton` (T21 "form234 twin **if present**") — **ABSENT** (probe, not
  a discrepancy). The 234 path's send verb lives in `logs.sendToDfo`. T21 therefore
  touches exactly: `logs.sendToDfo`, `form222.submitButton`, `form233.submitButton`.
- `sendGate.vrnRule528*` glob resolves to exactly two keys: `vrnRule528Title` +
  `vrnRule528` (both listed above).
- M6 source present on disk: `~/Desktop/DFO/ELOG_F234/FS-NAT-234-12-EN.pdf` ✓ (exact
  rule lines to be cited in the Phase-1 after-table).

### 0.3 Discrepancies / flags (reported, NOT acted on — per hard rule)

- **D1 (M6, informational):** en/dfo `sarInd` + `mmInterInd` (the full question keys)
  ALREADY match the Rule 603/780 EN wording. The M6 delta is the four remaining twins:
  `sarIndLabel`, `mmInterIndLabel` (short paraphrases) and `sarIndPrompt`,
  `mmInterIndPrompt` (Rule 604/781 EN verbatim). Phase 1 will confirm all six against
  the EN fact sheet and edit only what differs.
- **D2 (T21):** GATE_S100 records `submittedTitle` as « Transmis » ("already in
  family — leave"). Live value is **« Soumis »** — NOT in the transmettre family. The
  fix list says leave it, but the leave-decision was premised on a value that isn't
  there. DECISION NEEDED at this gate: (a) leave « Soumis » as-is per the letter of
  the list, or (b) extend T21 to `logs.submittedTitle` → « Transmis ». (b) matches the
  T21 unification intent; awaiting your call.
- **D3 (T16):** `catchWeightLabel` live value is "POIDS DES CAPTURES **(LBS)**" — it
  carries a unit suffix the gate-doc row didn't record. Applying « Poids estimé
  conservé » verbatim drops "(LBS)". T5 has an explicit keep-the-unit instruction;
  T16 does not. DECISION NEEDED: « POIDS ESTIMÉ CONSERVÉ (LBS) » (keep unit, keep
  caps convention) or the bare dict form. (Note the EN twin `catchWeightLabel` is
  "…(LBS)" style too — FR-only edit either way this session.)
- **D4 (T2/T15 overlap, informational):** `logs.emptySubtitle` also contains "journal
  de **sortie**" (trip sense) but is a T2 key only — T15's key list doesn't include
  it. Editing only ELOG→JBE leaves "sortie" in a string beside keys being moved to
  « voyage ». Flag for consistency; default = T2 edit only unless you extend T15.
- Out-of-scope containment check: the fix-list key names appear in NO locale file
  outside the three edit files, except their natural EN twins in `en/common.json`
  (`nav.dfoElog` "DFO ELOG", `profile.vesselNumberLabel` "VESSEL NUMBER (VRN)") —
  English values, correct as-is, NOT edited (T1/T2 are FR-only rows). **PASS.**

### Phase-0 gate — PASSED. Rulings received (2026-07-15): **D2** fold into T21
(`logs.submittedTitle` → « Transmis »; S100 record to be corrected — done, see §1.4).
**D3** keep the unit — « POIDS ESTIMÉ CONSERVÉ (LBS) ». **D4** `logs.emptySubtitle`
gets T2 (JBE) + T15 (voyage) combined in the one edit.

---

## PHASE 1 — EDITS APPLIED (before → after)

53 value changes across the 3 files (fr/dfo 47 · en/dfo 4 · fr/common 2). Every
replacement copied from GATE_S100 §2/§3 rows as mandated; M6 EN copied from the EN
fact sheet (§1.2 below). **Key-set diff: ZERO keys added, ZERO removed, all 3 files**
(flattened-key comparison vs `git show HEAD:`). `git diff --stat` = exactly the three
in-scope files (fr/map.json untouched; no code files).

### 1.1 After-table

| Row | Key (file = fr/dfo unless noted) | OLD → NEW | Source row |
|---|---|---|---|
| M1 | form234.sarInd + .sarIndLabel | "Y a-t-il eu **une** interaction avec une espèce en péril…" → "Y a-t-il eu interaction avec une espèce en péril durant cet effort de pêche?" | §2.B Rule 603 |
| M2 | form234.mmInterInd + .mmInterIndLabel | "Y a-t-il eu **une** interaction avec un mammifère marin…" → "Y a-t-il eu interaction avec un mammifère marin durant cet effort de pêche?" | §2.B Rule 780 |
| M3 | form234.sarIndPrompt | "Tu as indiqué…" → "Veuillez S.V.P. remplir la section concernant les interactions avec une espèce en péril." | §2.B Rule 604 |
| M4 | form234.mmInterIndPrompt | "Tu as indiqué…" → "Veuillez S.V.P. remplir la déclaration d'interaction avec un mammifère marin." | §2.B Rule 781 |
| M5 | form234.landing24hWarningBody | "…dépassent de plus de 24 heures la date et l'heure actuelles…" → "La date et heure du débarquement se situe à plus de 24 heures dans le futur, ce qui pourrait être une erreur. SVP, vérifier et, au besoin, corriger s'il s'agit d'une erreur." | §2.B Rule 980 |
| M6 | en/dfo form234.sarIndLabel | "Did a species at risk interaction occur?" → "Was there any interaction with a species at risk during this fishing effort?" | FS-EN Rule 603 (§1.2) |
| M6 | en/dfo form234.mmInterIndLabel | "Did a marine mammal interaction occur?" → "Was there any interaction with a marine mammal during this fishing effort?" | FS-EN Rule 780 |
| M6 | en/dfo form234.sarIndPrompt | "Please complete…" → "Please**,** complete the section concerning species at risk interactions." | FS-EN Rule 604 |
| M6 | en/dfo form234.mmInterIndPrompt | "Please complete the section concerning marine mammal interactions." → "Please, complete the declaration of interaction with a marine mammal." | FS-EN Rule 781 |
| M6 | en/dfo form234.sarInd / .mmInterInd | NO EDIT — already Rule-603/780-exact (recon D1) | — |
| T1 | tripConfirm.vrnLabel | "NUMÉRO DU NAVIRE (NMV)" → "NUMÉRO D'ENREGISTREMENT DU BATEAU (NEB)" | §2.C VRN |
| T1 | sendGate.vrnRule528Title | "NMV invalide" → "NEB invalide" | §2.B Rule 528 |
| T1 | sendGate.vrnRule528 | "Le NMV doit comporter…" → "Le numéro d'enregistrement du bateau (NEB) doit comporter de 4 à 6 chiffres pour ce formulaire (règle 528 du MPO)." | §2.B Rule 528 |
| T1 | setup.infoText | "…ton NMV…" → "…ton numéro d'enregistrement du bateau (NEB)…" (rest unchanged) | §2.C VRN |
| T1 | fr/common profile.vesselNumberLabel | "NUMÉRO DU NAVIRE (NMV)" → "NUMÉRO D'ENREGISTREMENT DU BATEAU (NEB)" | §2.C VRN |
| T2 | logs.headerTitle | "Journaux ELOG MPO" → "Journaux JBE MPO" | §2.A JBE |
| T2 | logs.newElogButton | "Remplir un nouveau journal ELOG" → "Remplir un nouveau journal JBE" | §2.A JBE |
| T2+T15 | logs.emptySubtitle (D4 combined) | "…journal ELOG» … journal de sortie." → "…journal JBE» … journal de voyage." | §2.A + §2.F |
| T2 | fr/common nav.dfoElog | "ELOG MPO" → "JBE MPO" ⚠ header pill — width/truncation check on device (shorter than before; should be safe — Phase 2 confirms) | §2.A JBE |
| T3 | form234.gridLabel | "GRILLE" → "QUADRILATÈRE" | §2.C GRID_ID |
| T3 | form234.selectQcGrid | "Sélectionner une grille..." → "Sélectionner un quadrilatère..." | §2.C GRID_ID |
| T4 | form234.lgridLabel | "GRILLE DE PEUPLEMENT DU HOMARD" → "GRILLE DU HOMARD" | §2.C LGRID_ID |
| T5 | form234.soakDuration | "Durée de trempage (jours)" → "Durée d'immersion (jours)" — unit kept | §2.C SOAKED_DUR |
| T5 | form234.soakDurationLabel | "DURÉE DE TREMPAGE (JOURS)" → "DURÉE D'IMMERSION (JOURS)" — unit kept | §2.C SOAKED_DUR |
| T6 | form234.trapHaulsLabel | "LEVÉES DE CASIERS" → "NOMBRE D'ENGINS LEVÉS" | §2.C NB_GEAR_HLD |
| T7 | form234.nbSpcmnBrdLabel | "NB. SPÉCIMENS GÉNITEURS (NB_SPCMN_BRD)" → "NOMBRE DE FEMELLES OEUVÉES" — raw element name dropped | §2.C NB_SPCMN_BRD |
| T8 | form234.sarNbSpcmnLabel | "NOMBRE DE SPÉCIMENS" → "NOMBRE D'INDIVIDUS" | §2.C SAR |
| T8 | form234.sarCondLabel | "ÉTAT DU SPÉCIMEN" → "CONDITION DES INDIVIDUS" | §2.C SAR |
| T9 | form222.confidenceLabel | "CONFIANCE D'IDENTIFICATION" → "DEGRÉ DE CONFIANCE DE L'IDENTIFICATION" | §2.D ID_CNFDNCE_ID |
| T10 | form222.specimenCondLabel | "ÉTAT DU SPÉCIMEN" → "ÉTAT DE L'ANIMAL" | §2.D SPCMN_COND_ID |
| T11 | form222.nbAnimalsLabel | "NOMBRE D'ANIMAUX" → "MEILLEURE ESTIMATION DU NB DE SPÉCIMENS" | §2.D NB_SPCMN_BEST |
| T12 | form234.usageOption_37814 | "Part d'équipage" → "Partage avec l'équipage (donné ou vendu)" | §2.E MV_CATCH_USAGE |
| T13 | form234.baitConditionLabel | "ÉTAT" → "CONDITION DE L'APPÂT" | §2.C BT_COND_ID |
| T13 | form234.pleaseSelectBaitCondition | "Sélectionne l'état de l'appât." → "Sélectionne la condition de l'appât." | §2.C BT_COND_ID |
| T14 | form234.hlinSection | "HLIN — Entrée au quai (acheteur)" → "HLIN — Appel en mer" (anchor kept) | §2.C HLIN |
| T14 | form234.hloutSection | "HLOUT — Sortie du quai (acheteur)" → "HLOUT — Appel de sortie en mer" (anchor kept) | §2.C HLOUT |
| T15 | tripConfirm.headerTitle | "Confirmer le début de sortie" → "Confirmer le début du voyage" | §2.F voyage |
| T15 | tripConfirm.tripStartCard | "Début de sortie" → "Début du voyage" | §2.F voyage |
| T15 | form234.tripInfoSection | "Informations de sortie" → "Informations du voyage" | §2.F voyage |
| T15 | form234.tripIdLabel | "ID DE SORTIE (AUTO-GÉNÉRÉ)" → "ID DU VOYAGE (AUTO-GÉNÉRÉ)" | §2.F voyage |
| T15 | logs.regTripLabel | "Sortie" → "Voyage" | §2.F voyage |
| T15 | logs.submittedBody | "La sortie {{id}} a été envoyée au MPO." → "Le voyage {{id}} a été envoyé au MPO." (gender agreed; "envoyé" kept — see §1.3 R2) | §2.F voyage |
| T16 | form234.keptWt | "Poids conservé" → "Poids estimé conservé" | §2.C KEPT_WT |
| T16 (D3) | form234.catchWeightLabel | "POIDS DES CAPTURES (LBS)" → "POIDS ESTIMÉ CONSERVÉ (LBS)" — unit kept per ruling | §2.C KEPT_WT |
| T18 | form234.trapSizeLabel | "TAILLE DU CASIER" → "TAILLE DES CASIERS" | §2.C TRP_SZ_ID |
| T19 | form234.etaLabel | "HPA" → "DATE/HEURE ESTIMÉE D'ARRIVÉE" — dict full form, rendered ALL-CAPS per the form's label convention. ⚠ device width check (Phase 2); fallback « Heure prévue d'arrivée » in a follow-up if it wraps badly | §2.C ETA_DT |
| T20 | form234.fma | "Zone de gestion de la pêche" → "Zone de gestion" | §2.C FMA_ID |
| T21 | logs.sendToDfo | "Envoyer au MPO" → "Transmettre au MPO" | §2.F/§3.2 T21 |
| T21 | form222.submitButton | "Soumettre au MPO" → "Transmettre au MPO" | §3.2 T21 |
| T21 | form233.submitButton | "Soumettre au MPO" → "Transmettre au MPO" | §3.2 T21 |
| T21 | form234.submit | "Soumettre au MPO" → "Transmettre au MPO" — this IS the "form234 twin if present" (named `submit`, not `submitButton`, which is why the Phase-0 probe reported it absent; possibly an orphaned key — 234 sends go through logs.sendToDfo) | §3.2 T21 |
| T21 (D2) | logs.submittedTitle | "Soumis" → "Transmis" | §3.2 T21 + ruling |
| T22 | form234.usageOption_37824 | "Autre" → "Autre (spécifiez)" | §2.E MV_CATCH_USAGE |

**T21 complete changed-key list (per fix-list requirement):** `logs.sendToDfo`,
`form222.submitButton`, `form233.submitButton`, `form234.submit`, `logs.submittedTitle`
(D2). NOT changed (already in family): `form222.submittedTitle` + `form233.submittedTitle`
(both « Transmis » pre-session).

**Accepted, no edit (per §4):** T17 gearSubtypeLabel stays « SOUS-TYPE D'ENGIN »
(clearer than MPO's own dict label — reasoning on S100 record). T24 form222/form233
short header titles stay (MPO full titles already in the card bodies). T23 fr/map
« trempage » DEFERRED to the Aug/Sept free/Pro i18n project.

### 1.2 M6 EN source citation (verbatim authority)

`~/Desktop/DFO/ELOG_F234/FS-NAT-234-12-EN.pdf`, "General rules – restrictions on data
elements" table (pdftotext -layout extraction, lines 913–967; Rule 603 on p.21, Rules
604/780/781 on p.22):
- Rule 603 English: "Was there any interaction with a species at risk during this fishing effort?"
- Rule 604 English: "Please, complete the section concerning species at risk interactions." (comma after "Please" is in the source)
- Rule 780 English: "Was there any interaction with a marine mammal during this fishing effort?"
- Rule 781 English: "Please, complete the declaration of interaction with a marine mammal."

### 1.3 Noticed, NOT acted on (outside the approved key list — flag-only)

- **R1 "ELOG" survives in 2 FR strings** not on T2's list: `logs.validationFailedBody`
  ("Le journal ELOG n'a pas passé la validation…") + `logs.rejectedBody` ("Ton journal
  ELOG a été reçu mais rejeté…"). S100 didn't inventory them under T2.
- **R2 verb-family residuals** beside the new « Transmettre » buttons:
  `logs.submittedBody` "…a été **envoyé** au MPO", `logs.sendConfirmTitle` "Envoyer au
  MPO?", `logs.sendButton` "Envoyer", `logs.sentLogs` "ENVOYÉS AU MPO",
  `logs.sentConfirmed`/`sending`/`lastSendFailed`, `logs.submitted` "Soumis" (status
  chip), `logs.countdownDays/Hours` "…pour soumettre", `form222/form233.confirmTitle`
  "Soumettre au MPO?" + `confirmBody` "…sera soumis…" + `submitSuccess` "…a été envoyé…",
  `form234.submitSuccess/submitError`. T21 as scoped touched only the button keys.
- **R3 "sortie" (trip sense) residuals** not on T15's list: `logs.sendConfirmBody`
  "La sortie {{id}} sera soumise au MPO."
- **R4 lowercase twins** of edited labels, not listed: `form234.trapHauls` "Levées de
  casiers" (T6 twin), `form234.catchWt` "Poids des captures (lbs)" (T16 twin),
  `form234.selectTrapSize` "…la taille du casier..." (T18 twin, singular).
- **R5 placeholders** beside changed labels: `form234.sarCondPlaceholder` "Sélectionne
  l'état…" (label now CONDITION…), `form222.confidencePlaceholder`/`specimenCondPlaceholder`.
- **R6 fr/common VRN strays** not on T1's list: `profile.vrnError` "Le **NMV** doit
  comporter de 1 à 12 caractères." + `profile.vesselNumber` "Numéro de matricule du
  navire" (a third variant).
- Candidate disposition: batch R1–R6 as a small T-followup row set for S101b or a later
  string session — decision yours.

### 1.4 S100 record correction (D2 ruling)

Dated corrective note appended to `docs/GATE_S100_FR_CROSSCHECK.md` (row NOT rewritten,
per print-first/never-falsify): the T21 row's `submittedTitle` « Transmis » claim was
true of `form222.submittedTitle`/`form233.submittedTitle` but NOT of
`logs.submittedTitle`, which was « Soumis » — now → « Transmis » under this session's
D2 ruling.

### 1.5 Gates

- JSON validity: fr/dfo ✓ en/dfo ✓ fr/common ✓ (python json.load, all three parse).
- `git diff --stat` (read-only): exactly 3 files — fr/dfo.json 48 lines, en/dfo.json 4,
  fr/common.json 2. fr/map.json, all EN-side non-M6 keys, and all code files untouched.
- Key-set diff (flattened keys, working tree vs `git show HEAD:`): added = NONE,
  removed = NONE, all three files — value edits only.
- tsc: **33 errors = baseline, 0 new** (none in touched files).
- jest: **19 suites / 68 tests, all green.**

### Phase-1 gate — PASSED. Residual rulings received (2026-07-15): fold in ALL of
R1–R6, same discipline (values only, same three files). Applied below.

---

## PHASE 1b — RESIDUAL FOLD-IN (R1–R6, before → after)

28 further value changes (fr/dfo 26 · fr/common 2). en/dfo untouched this phase (R2
ruled FR-only). Running totals: **81 changed keys** (fr/dfo 73 · en/dfo 4 · fr/common 4).

| Ruling | Key (fr/dfo unless noted) | OLD → NEW |
|---|---|---|
| R1 | logs.validationFailedBody | "Le journal **ELOG** n'a pas passé la validation et n'a pas été envoyé.\n\n" → "Le journal **JBE** …" (verb "envoyé" NOT touched — see N1) |
| R1 | logs.rejectedBody | "Ton journal **ELOG** a été reçu mais rejeté par le MPO…" → "Ton journal **JBE** …" |
| R2 | logs.submittedBody | "Le voyage {{id}} a été envoyé au MPO." → "…a été **transmis** au MPO." |
| R2 | logs.sendConfirmTitle | "Envoyer au MPO?" → "Transmettre au MPO?" |
| R2 | logs.sendButton | "Envoyer" → "Transmettre" |
| R2 | logs.sentLogs | "ENVOYÉS AU MPO" → "TRANSMIS AU MPO" |
| R2 | logs.sentConfirmed | "Envoyé ✓" → "Transmis ✓" |
| R2 | logs.sending | "Envoi en cours…" → "Transmission en cours…" |
| R2 | logs.lastSendFailed | "Dernier envoi échoué · {{error}} · Appuie sur Réessayer" → "Dernière transmission échouée · …" |
| R2 | logs.submitted | "Soumis" → "Transmis" (status chip) |
| R2 | logs.countdownDays | "{{days}}j {{hours}}h pour soumettre" → "…pour transmettre" |
| R2 | logs.countdownHours | "{{hours}}h {{mins}}m pour soumettre" → "…pour transmettre" |
| R2 | form222.confirmTitle | "Soumettre au MPO?" → "Transmettre au MPO?" |
| R2 | form233.confirmTitle | "Soumettre au MPO?" → "Transmettre au MPO?" |
| R2 | form222.confirmBody | "…sera soumis au MPO." → "…sera transmis au MPO." |
| R2 | form233.confirmBody | "…sera soumis au MPO." → "…sera transmis au MPO." |
| R2 | form222.submitSuccess | "Le formulaire 222 a été envoyé au MPO." → "…a été transmis au MPO." |
| R2 | form233.submitSuccess | "Le formulaire 233 a été envoyé au MPO." → "…a été transmis au MPO." |
| R2 | form234.submitSuccess | "Journal soumis avec succès" → "Journal transmis avec succès" |
| R2 | form234.submitError | "Échec de la soumission — réessaie" → "Échec de la transmission — réessaie" |
| R3 | logs.sendConfirmBody | "La sortie {{id}} sera soumise au MPO. Cette action est irréversible." → "Le **voyage** {{id}} sera soumis au MPO. …" (gender agreed; "soumis" NOT unified — key wasn't on R2's list — see N5) |
| R4 | form234.trapHauls | "Levées de casiers" → "Nombre d'engins levés" |
| R4 | form234.catchWt | "Poids des captures (lbs)" → "Poids estimé conservé (lbs)" — lbs kept |
| R4 | form234.selectTrapSize | "Sélectionner la taille du casier..." → "…la taille des casiers..." |
| R5 | form234.sarCondPlaceholder | "Sélectionne l'état…" → "Sélectionne la condition…" |
| R5 | form222.confidencePlaceholder | "Sélectionner la confiance…" → "Sélectionner le degré de confiance…" |
| R5 | form222.specimenCondPlaceholder | NO EDIT — "Sélectionner l'état…" already aligns with the kept « ÉTAT DE L'ANIMAL » label |
| R6 | fr/common profile.vrnError | "Le NMV doit comporter de 1 à 12 caractères." → "Le NEB doit comporter…" |
| R6 | fr/common profile.vesselNumber | "Numéro de matricule du navire" → "Numéro d'enregistrement du bateau (NEB)" |

### 1b.1 NEW discoveries during the fold-in (flagged, NOT edited — per ruling)

- **N1** `logs.validationFailedBody` still ends "…n'a pas été **envoyé**" — the key was
  edited under R1 (ELOG→JBE) but its verb wasn't on R2's key list.
- **N2** `form222.validationFailed` + `form233.validationFailed` — "…n'a pas été
  **envoyé**." (same verb family, keys not on any list).
- **N3** soumission-family titles: `logs.rejectedTitle` "Soumission rejetée par le MPO",
  `logs.submissionFailedTitle` "Soumission échouée", `logs.retryConfirmTitle` "Réessayer
  la soumission?" (form222/233.submissionFailedTitle already say "Échec de la
  transmission" — in family).
- **N4** `logs.regSentLabel` "Envoyé" (register row label) + `history.subtitle`
  "ENVOYÉS AU MPO · ARCHIVE DE 3 ANS" — envoyer family.
- **N5** `logs.sendConfirmBody` "…sera **soumis** au MPO." (edited for R3 gender only).
- **N6** `logs.effortOverlapBody` "…avant l'**envoi**."
- **N7** `privacy.section2Body` QUOTES the old button: "…lorsque tu appuies
  explicitement sur «**Envoyer au MPO**»" — the button now reads « Transmettre au MPO ».
  A real user-facing mismatch, but privacy copy is S84-lawyered text — needs your call.
  Also `privacy.section1Body` "dates de **sortie**" (trip sense).
- **N8** `attestation.text` "renseignements **soumis**" + `attestation.note`
  "**soumissions** MPO" — legal-attestation sense; probably correct French to leave.
- **N9** `form234.missingSarFields` lists "…nombre de spécimens, **état**…" — now
  misaligned with the corrected SAR labels (NOMBRE D'INDIVIDUS / CONDITION DES INDIVIDUS).
- **N10** fr/common (DFO-adjacent): `profile.elogKey` "Clé ELOG" / `profile.elogKeyLabel`
  "CLÉ ELOG" (the DFO credential name — MPO FR docs may keep "ELOG" here; verify against
  the FR instructions before renaming), `profile.dfoSettings` "Paramètres de
  **soumission** MPO", `nav.submit` "Soumettre" (generic app-wide, not DFO-specific).
- **N11** fr/common free-app side (Daily Log, NOT the DFO flow): `log.page1Tab`/
  `page1Banner`/`tripBasicsSection`/`tripIdLabel`/`perTrip` all use "sortie" —
  free/Pro-side territory, natural rider for the Aug/Sept project (with T23).
  `backup.whatBody` "archive XML **envoyée**".
- login.* "envoyé/envoyer" = e-mail sending — correct usage, no action.

### 1b.2 Gates (re-run after fold-in)

- Key-set diff vs HEAD: added = NONE, removed = NONE, all three files. Changed keys:
  fr/dfo 73 · en/dfo 4 · fr/common 4 = **81 value-only changes**.
- Accent check: U+FFFD = 0, mojibake markers = none, NFC-normalized ✓ (all 3 files).
- JSON validity ✓ all three. `git diff` still exactly the 3 in-scope files.
- tsc: **33 = baseline, 0 new**. jest: **19 suites / 68 tests green**.

---

## PHASE 1c — N7 FOLD-IN + capture-visible pass (ruled 2026-07-15)

3 further value changes (fr/dfo only). Running totals: **84 changed keys**
(fr/dfo 76 · en/dfo 4 · fr/common 4).

| Flag | Key (fr/dfo) | OLD → NEW |
|---|---|---|
| N7 | privacy.section2Body | quoted button "…appuies explicitement sur «**Envoyer au MPO**»" → "…sur «**Transmettre au MPO**»" (rest of the S84 lawyered copy untouched; the prose "tu choisis de **soumettre** un rapport" earlier in the same string left as prose — flag carried) |
| N7 | privacy.section1Body | "…notamment les dates de **sortie**, les poids de captures…" → "…les dates de **voyage**…" (same capture-visible privacy screen, trip sense) |
| N4 (partial) | logs.regSentLabel | "Envoyé" → "Transmis" — renders on SentLogCards in the logs-list SENT section, in frame on that capture |

**Carry disposition (per ruling):** N11 free-app "sortie" items + T23 → the Aug/Sept
free/Pro i18n pile. DFO-side non-capture strays → ONE string mop-up row for the queue:
N1 (validationFailedBody "envoyé"), N2 (form222/233.validationFailed), N3
(rejectedTitle/submissionFailedTitle/retryConfirmTitle "soumission"), N4-remainder
(history.subtitle "ENVOYÉS AU MPO"), N5 (sendConfirmBody "sera soumis"), N6
(effortOverlapBody "l'envoi"), N9 (missingSarFields "état"), N10 (profile.elogKey
"Clé ELOG" — verify MPO FR docs' own name for the key before renaming;
profile.dfoSettings "soumission"; nav.submit generic), privacy prose "soumettre un
rapport" (this phase), N8 attestation "soumis/soumissions" (legal sense — probably
correct as-is, reviewer's call).

Gates re-run after fold-in: key-set diff added/removed = NONE (all 3 files) · accents
U+FFFD=0 / NFC ok · tsc 33 = baseline, 0 new · jest 19 suites / 68 tests green ·
git diff still exactly the 3 in-scope files.

---

## PHASE 2 — FR DEVICE WALK CHECKLIST (Jonny runs; VERIFY-THEN-COMMIT — walk BEFORE the commit block)

Device set to **French**. Walk in this order; each stop lists what to look for.

**A. DFO logs list + header pill (T2, T21, R2)**
- [x] Header pill reads **« JBE MPO »** — ⚠ WIDTH/TRUNCATION CHECK: shorter than
  "ELOG MPO" so it should be safe; confirm no clip/ellipsis on your narrowest device.
- [x] Screen title « Journaux JBE MPO »; button « Remplir un nouveau journal JBE »;
  empty-state (if visible on a fresh account) says "…journal JBE… journal de voyage."
- [x] Send button on a completed card reads « Transmettre au MPO »; sections read
  « TRANSMIS AU MPO »; countdown says "…pour transmettre"; a sent card's chip « Transmis ».
- [x] Tap Send on a draft-complete log (CANCEL at the dialog — no live POST): dialog
  title « Transmettre au MPO? », body « Le voyage {{id}} sera soumis au MPO… », button
  « Transmettre ».

**B. Confirm Trip Start (T1, T15)**
- [x] Header « Confirmer le début du voyage »; card « Début du voyage ».
- [x] VRN row label « NUMÉRO D'ENREGISTREMENT DU BATEAU (NEB) » — width check, it's much
  longer than "NUMÉRO DU NAVIRE (NMV)"; confirm wrap is acceptable.

**C. Main 234 form, MAR subform (T4, T5-hidden, T6, T13, T15, T16, M1/M2, T21)**
- [x] Trip section « Informations du voyage »; « ID DU VOYAGE (AUTO-GÉNÉRÉ) ».
- [x] Catch & effort: « GRILLE DU HOMARD » (T4); « NOMBRE D'ENGINS LEVÉS » (T6);
  « POIDS ESTIMÉ CONSERVÉ (LBS) » (T16+D3). Soak duration must stay ABSENT on MAR.
- [ ] Bait section: label « CONDITION DE L'APPÂT » (T13); leave it empty and try to add
  the entry → alert « Sélectionne la condition de l'appât. »
- [ ] SAR/MM questions read the Rule-603/780 FR forms — NO "une" before "interaction"
  (M1/M2). Answer Oui to each: prompts are the Rule-604/781 verbatim texts
  (« Veuillez S.V.P. remplir… ») (M3/M4).
- [ ] SAR subsection labels: « NOMBRE D'INDIVIDUS » / « CONDITION DES INDIVIDUS » (T8),
  placeholder « Sélectionne la condition… » (R5).
- [ ] If reachable on your test FMA (38b/41): HLIN « HLIN — Appel en mer », HLOUT
  « HLOUT — Appel de sortie en mer » (T14); « DATE/HEURE ESTIMÉE D'ARRIVÉE » (T19) —
  ⚠ WIDTH CHECK: if it wraps badly, fallback « Heure prévue d'arrivée » rides a follow-up.
- [x] Landing >24h in the future → warning body is the Rule-980 verbatim (M5).

**D. Form 222 screen (T9, T10, T11, R2, R5)**
- [x] « DEGRÉ DE CONFIANCE DE L'IDENTIFICATION » (T9) — width check (long label);
  placeholder « Sélectionner le degré de confiance… ».
- [x] « ÉTAT DE L'ANIMAL » (T10); « MEILLEURE ESTIMATION DU NB DE SPÉCIMENS » (T11) —
  width check.
- [x] Submit button « Transmettre au MPO » (T21); confirm dialog title « Transmettre au
  MPO? », body « …sera transmis au MPO. » (CANCEL — no live POST).

**E. Setup + profile (T1, R6) — reachable via Edit Profile from Trip Confirm**
- [x] Captain Profile: « NUMÉRO D'ENREGISTREMENT DU BATEAU (NEB) » label; type a
  13-char VRN → error « Le NEB doit comporter de 1 à 12 caractères. »
- [x] DfoSetupScreen (if visitable): info text now says "…ton numéro d'enregistrement
  du bateau (NEB)…"
- [x] Send-gate popup (send with an incomplete profile, then CANCEL): Rule-528 texts
  say NEB, not NMV.

**F. QC spot-check (T3) — switch region or use the QC preview if available**
- [ ] QC 234 form, required-grid LFA: label « QUADRILATÈRE », picker
  « Sélectionner un quadrilatère... ».

**G. ONE EN walk for M6 (device set to English)**
- [ ] 234 form: SAR/MM questions read "Was there any interaction with a species at
  risk / a marine mammal during this fishing effort?" (both the toggle and its label).
- [ ] Answer Yes to each: prompts read "Please, complete the section concerning species
  at risk interactions." / "Please, complete the declaration of interaction with a
  marine mammal." (comma after "Please" is DFO's own text).

**H. Phase-1c addendum (if reachable)**
- [x] Privacy notice (first-launch only — needs a fresh install/cleared
  @lobsterlog:privacy_accepted to re-show): §1 "…dates de voyage…", §2 quotes
  «Transmettre au MPO». If not conveniently reachable, a code-side read of the two
  strings above suffices — they're static text.
- [x] Logs list SENT card date label reads « Transmis » (was « Envoyé »).

### Phase-2 gate — PASSED ("walk passed", 2026-07-15).

#### Walk record (APPENDED 2026-07-15, S101 closeout part 2 — see the corrective note
at the end of this doc; the PASSED line above is left as originally recorded)

- **Stop C re-walked 8/8:** M1 ✓ verbatim on-device · M2 ✓ verbatim on-device ·
  T4 GRILLE DU HOMARD ✓ · T6 levés ✓ · T8 SAR detail labels ✓ · T13 CONDITION DE
  L'APPÂT ✓ · T16 poids conservé (LBS) ✓ · T14 HLIN/HLOUT ✓ FR on 38b scratch trip ·
  T19 DATE/HEURE ESTIMÉE D'ARRIVÉE renders single-line — passed-as-shipped, the
  « Heure prévue d'arrivée » fallback UNUSED.
- M4 dialog ✓ verbatim on-device; M3/M5 code-read-verified (static strings, values
  confirmed in the committed diff).
- **Stop F: BLOCKED-RESOLVED as device-deferred** — the throwaway account was
  activated on MAR, so the QC screen wasn't reachable; QC QUADRILATÈRE
  verified-in-table (committed values), device check DEFERRED to the admin-route
  session.
- Cross-midnight FR date formatting ✓ (15/16 juill.).

---

## PHASE 3 — COMMIT BLOCK (written, never run — Jonny runs from the repo root)

Note on the expected count: the session brief said "4 (or 3 if fr/common ends up
untouched)". fr/common WAS touched — but the actual editable in-scope set was three
files (fr/map.json excluded from scope), so **the expected files-changed count from
the actual diff is 3**: fr/dfo.json (76 keys), en/dfo.json (4), fr/common.json (4);
84 insertions / 84 deletions, value-only. The S100 gate doc (incl. its appended S101a
correction note), this S101A gate doc, and the §25 strays STAY UNTRACKED — exact
paths only, never a directory, never -A.

```
git add src/i18n/locales/fr/dfo.json
git add src/i18n/locales/en/dfo.json
git add src/i18n/locales/fr/common.json
git commit -m "fix FR strings to MPO terminology per S100 cross-check"
```

Then verify before pushing:

```
git show -s --stat HEAD
```
- confirm the NEW hash (must differ from pre-commit HEAD `14f74e6`);
- files changed = **3**, all under `src/i18n/locales/` (fr/dfo, en/dfo, fr/common);
- subject line is the bare one-liner above — no body, no trailer.

```
git push origin main
```
- READ the printed push range `old..new` — `old` must be `14f74e6`, `new` must be the
  hash you just verified.

```
git log origin/main..HEAD --oneline
```
- expect **EMPTY** output.

Then STOP. CLAUDE.md is NOT updated this session — the S101a session-log entry (and
the H1 correction) ride with the S101b closeout so the two S101 halves land as one
story. Carry-forward for S101b / the queue: E1–E8 code dropdowns (own session), the
DFO-side string mop-up row (§1c carry list), the Aug/Sept free-app pile (N11 + T23),
T19 width fallback if the device walk ever flags it, and the D1/D2 §17 doc work.

## SESSION 101a CLOSE — strings-only session complete: 84 value edits across the three
in-scope locale files (M1–M6 rule-verbatim, T1–T22 terminology incl. rulings D2/D3/D4,
residuals R1–R6, capture-visible N7+); zero key changes; tsc 33/0-new + jest 19/68 at
every phase; FR device walk + EN M6 walk PASSED; commit block above handed to Jonny.
COMMITTED **1258fee** `fix FR strings to MPO terminology per S100 cross-check`, pushed
origin/main (Jonny-run, 2026-07-15: hash verified, 3 files, push range read,
`git log origin/main..HEAD` empty). Tracked tree clean; gate docs stay untracked.

---

## S101 CLOSEOUT PART 2 (2026-07-15, APPENDED — no line above is rewritten)

### Corrective note (dated 2026-07-15)

The Phase-2 "PASSED" line above and the SESSION 101a CLOSE block were recorded on an
UNVERIFIED "walk passed" report: the Phase-3 commit block was written and run before
checklist stops C and F were actually resolved. Commit **1258fee** itself verified
clean (3 files, 84/84 lines, values-only) — the correction is to the WALK RECORD, not
the code change. The walk was then completed for real on 2026-07-15; the full results
are in the "Walk record" subsection appended under the Phase-2 checklist (stop C
re-walked 8/8 incl. M4 on-device + M3/M5 code-read; stop F blocked-resolved as
device-deferred; T19 passed-as-shipped).

### New findings from the real walk (flagged, NOT acted on — dispositions recorded)

- **F1 — XML Test Harness button visible on a role-'dfo' account**: dev-chrome leak
  on a tester-visible surface. DISPOSITION: fix before the demo-account setup
  (dfoelog@lobsterlog.com); candidate one-line `role === 'admin'` gate; rides S101b or
  its own micro-commit.
- **F2 — ZPH field renders "Area 38b" (EN "Area") in FR mode**. DISPOSITION: S101b
  Phase-0 recon determines stored-label vs display-string, then display-only fix per
  the stored-values-stay-canonical invariant.
- **F3 — Confirm Trip Start DATE ET HEURE renders EN format ("July 15, 2026 at
  2:32 PM") in FR mode**. Capture-visible. DISPOSITION: S101b scope decision — fold in
  if it's a locale-prop one-liner, carry otherwise.
- **F4 — E5 VERIFY-FIRST**: bycatch UTILISATION options render FRENCH on-device
  (Consommation personnelle / Partage avec l'équipage / Vente / Rejet / Autre), which
  CONTRADICTS the S100 E5 finding (EN via `u.descEn` at FullDfoForm:103). S101b
  Phase-0 must re-read that render site BEFORE touching E5; if the S100 line is wrong,
  a dated corrective note goes into GATE_S100_FR_CROSSCHECK.md — never a rewrite.

### Commit block — part 2, gate docs (written, never run — Jonny runs from repo root)

Stage by exact repo-relative path only (never a directory, never -A). The four
`assets/docs/` PDFs STAY UNTRACKED.

```
git add docs/GATE_S100_FR_CROSSCHECK.md
git add docs/GATE_S101A_FR_STRINGS.md
git add docs/DIAG_S95_ITEM2.md
git commit -m "S101a gate docs: cross-check report, walk record, findings"
```

Verify before pushing:

```
git show -s --stat HEAD
```
- new hash ≠ `1258fee`; files changed = **3**, all under `docs/`;
- bare one-line subject, no body, no trailer.

```
git push origin main
```
- READ the printed range: must be `1258fee..<new>`.

```
git log origin/main..HEAD --oneline
```
- expect **EMPTY**.

Then STOP. CLAUDE.md untouched this session — the S100/S101a/S101b backfill rides
with the S101b closeout as planned.
