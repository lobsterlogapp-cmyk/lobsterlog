# GATE_S102_DOCS — §17 v1.2 + §22 cross-check + H3 rename (Phase 0 recon)

Read-only recon. No files edited, no git, no DFO POST. Repo tip `2ce0969`, tree clean except
the four untracked passenger PDFs. Authority for MPO FR terms: §2 of
`docs/GATE_S100_FR_CROSSCHECK.md` (glossary). Shipped app strings: `src/i18n/locales/{en,fr}/
{common,dfo}.json` @ `2ce0969`. §17/§22 PDF text extracted with `pdftotext -layout` to scratch.

---

## 0.1 STATE
- `git status`: clean + exactly four untracked PDFs in `assets/docs/` (Enonce_Prerequis_FR,
  LobsterLog_Guide_Utilisateur_v1.0_FR, LobsterLog_Users_Guide_v1.0_EN, Presrsquisites_Statement_en).
- `git log --oneline -3`: `2ce0969` S101b closeout · `c0d866b` harness admin-gate · `a41dd3a`
  trip-start FR date. **Matches the premise.**

## 0.2 PDF INVENTORY (`assets/docs/`)
| File | Bytes | Tracked? | Role |
|---|---|---|---|
| dfo_instructions_234_7_en.pdf | 495,672 | **tracked** | DFO Instructions 234.7 (EN) — wired in card |
| dfo_instructions_234_7_fr.pdf | 794,492 | **tracked** | DFO Instructions 234.7 (FR) — wired in card |
| providers_instructions_en.pdf | 179,106 | **tracked** | **§17** Provider's Instructions EN — wired in card |
| providers_instructions_fr.pdf | 189,364 | **tracked** | **§17** Instructions du fournisseur FR — wired in card |
| LobsterLog_Users_Guide_v1.0_EN.pdf | 214,255 | untracked | **§22** User's Guide EN — NOT wired |
| LobsterLog_Guide_Utilisateur_v1.0_FR.pdf | 226,700 | untracked | **§22** Guide de l'utilisateur FR — NOT wired |
| Enonce_Prerequis_FR.pdf | 98,913 | untracked | §25 Prerequisites FR — NOT wired |
| Presrsquisites_Statement_en.pdf | 94,460 | untracked | §25 Prerequisites EN (typo name — H3) — NOT wired |

**Mapping confirmed** (via i18n `settings.docProvidersInstructionsSub = "§17 · How this app works"`
+ App.tsx `DFO_DOC_SOURCES`): **§17 = providers_instructions_{en,fr}.pdf** (tracked). §22 = the
User's Guide pair (untracked). The "234.7" in the card is the *separate* DFO Instructions doc.

## 0.3 §17 VERSION — the bundled §17 PDFs are **v1.1** (not v1.0)
Footer on every page reads `Page N · v1.1 · June 2026`; §13 "Document Information" → `Document
version: 1.1`. Both languages are v1.1. (Recon note: prompt 0.3 said "confirm v1.1" — confirmed,
both are v1.1. Session target is the v1.2 re-export.)

---

## 0.4 §17 EDIT LIST (apply in the Drive masters, then re-export v1.2)

Line numbers are `pdftotext -layout` line numbers (stable reference, not page geometry).

### D1 — stale DFO-Instructions version "234.6" → **234.7**  (×2 per language — count VERIFIED)
Target = **234.7** (the bundled DFO Instructions doc + the app card label both say "234.7";
`docs/GATE_S100_FR_CROSSCHECK.md` D1 concurs). NOT "234-12" (that's the fiche-technique/XSD
package number, a different thing).

| # | Lang | Line | CURRENT | REPLACEMENT |
|---|---|---|---|---|
| D1-EN-a | EN | 235 | `The DFO Instructions document (Form 234, v234.6) is available…` | `…(Form 234, v234.7)…` |
| D1-EN-b | EN | 347 | `…the DFO Instructions (Form 234 v234.6), and all app help…` | `…(Form 234 v234.7)…` |
| D1-FR-a | FR | 249 | `Le document d'Instructions du MPO (formulaire 234, v234.6) est accessible…` | `…(formulaire 234, v234.7)…` |
| D1-FR-b | FR | 369 | `…les Instructions du MPO (formulaire 234 v234.6) et toutes les fonctions…` | `…(formulaire 234 v234.7)…` |

### D3 — FR vessel-number term: "VRN" → **NEB**  (shipped app = « Numéro d'enregistrement du bateau (NEB) »)
Shipped authority: `common.vesselNumberLabel = "NUMÉRO D'ENREGISTREMENT DU BATEAU (NEB)"`,
`tripConfirm.vrnLabel` same; Rule 528 mandate (glossary §2.B). The FR §17 uses "numéro de navire
(VRN)" — both the noun AND the abbreviation differ.

| # | Lang | Line | CURRENT | REPLACEMENT |
|---|---|---|---|---|
| D3-a | FR | 89 | `Le numéro de navire (VRN) — saisis-le exactement…` | `Le numéro d'enregistrement du bateau (NEB) — saisis-le exactement…` |
| D3-b | FR | 127 | `Numéro de navire (VRN)` (bullet under §3.1) | `Numéro d'enregistrement du bateau (NEB)` |

*(Minimal edit per prompt = "VRN"→"NEB". I recommend also fixing the noun "numéro de navire"→
"numéro d'enregistrement du bateau" so it matches the shipped label verbatim — your call.)*

### D5 — FR "halés" → **levés**  (shipped app = « Nombre d'engins levés »; glossary §2.F "lever un engin")
| # | Lang | Line | CURRENT | REPLACEMENT |
|---|---|---|---|---|
| D5-a | FR | 173 | `Le nombre de casiers halés` | `Le nombre de casiers levés` |

**Flag (additive, decide separately):** FR §17 also uses the "halage/haler" family the shipped
app has moved off of — line 175 `coordonnées de pose et de halage` (app uses « levée » for
hauling). Not in the mandated D5 scope; listed so you can decide whether v1.2 harmonizes it.

### §2.4 ALIGNMENT — §17 quoted app strings vs shipped locale (this is S100 row **D4**)
The FR §17 uses "JBE du MPO / clé JBE" throughout; the **shipped app is a hybrid** after the
S101a/b terminology sweep — it says "JBE MPO" in the logs/nav surface but **still** "Configuration
MPO / Activer le journal MPO / Clé ELOG" on the Setup screen. So §17 §2.4 (and §2.3/§9) describe
labels that don't match the live Setup UI:

| Doc location | §17 FR says | Shipped app string (key) | Note |
|---|---|---|---|
| §2.4 line 98/97 | `Paramètres > Configuration du JBE du MPO` / `Activer le JBE du MPO` | `setup.title = "Configuration MPO"` · `setup.activateButton = "Activer le journal MPO"` | doc's "JBE du MPO" is the more MPO-correct form (glossary §2.A) — but ≠ live UI |
| §2.4 line 104–106 | `Saisis ta clé JBE` | `common.elogKeyLabel = "CLÉ ELOG"` | app still "ELOG", not "JBE" |
| §2.4 line 107 | `laissez-passer saisonnier JBE du MPO` | `setup.priceLabel = "LAISSEZ-PASSER DE SAISON JOURNAL MPO"` | wording differs |
| §2.4 line 100–101 (regions) | `Québec (QC), Golfe (GLF), Maritimes (MAR) ou Terre-Neuve-et-Labrador (NL)` | Setup screen renders region names **hardcoded ENGLISH** (L5 pending — `DfoSetupScreen.tsx` REGIONS) | doc FR ≠ app EN until L5 |

EN §2.4 alignment: the §17 EN labels ("DFO ELOG Setup", "Activate DFO ELOG", "ELOG Key", region
names) all match the shipped EN app — **no EN §2.4 mismatch.**

**DECISION IS YOURS (D4):** either (a) edit §17 down to the live app strings (Configuration MPO /
Activer le journal MPO / Clé ELOG), or (b) keep §17's MPO-correct "JBE" wording and instead
schedule an app-string T-item to bring Setup into line. These are mutually exclusive; I did not
choose. Same choice recurs verbatim in §22 (see 0.5).

---

## PHASE-1 PREP (appended) — Drive masters LOCATED + edit strings VERIFIED verbatim

Per your go for Phase 1. I cannot edit the Drive masters (standing rule + my Drive tools are
read/create/copy only, no in-place Doc edit), so I did the one safe, useful step: read the actual
master **Google Docs** and confirmed every edit-list search string matches the Doc source
**verbatim** (pdftotext can silently differ from the Doc — it does not here). Your find-replace in
Google Docs will land exactly.

**Master Docs (all editable Google Docs, owner jonathon.n.14@gmail.com, folder `0AN_7LqY8PPNLUk9PVA`):**
| Doc | Drive title | fileId | ver |
|---|---|---|---|
| §17 EN | LobsterLog_Providers_Instructions_v1.1_EN | `1TP5UuAzf9uOkQJnxbfXeGlrAuP0h2CEjtIctzAt4tHQ` | 1.1 |
| §17 FR | LobsterLog_Instructions_Fournisseur_v1.1_FR | `1fNHH5jQzDyvxJi_HypqYgd9Zz_HXsySg2Vn-9Sp6gAw` | 1.1 |
| §22 EN | LobsterLog_Users_Guide_v1.0_EN | `1qade8OqlQvXXrvQljOW_F5xebplQg46gHPocxUUAc6Q` | 1.0 |
| §22 FR | LobsterLog_Guide_Utilisateur_v1.0_FR | `1qgKC2Pqc5uCMIaD7YUKkcjF1sNHrkoGO1_76vNyYrts` | 1.0 |
| §25 EN | LobsterLog_Prerequisites_Statement_v1.0_EN | `1LvijsJXrUqIazLRyNtqXXXtqRoie6IUrzBgHJSAten4` | 1.0 |

*(§25 recon: the Drive master is correctly spelled "Prerequisites" — the "Presrsquisites" typo
lives ONLY in the exported PDF filename in `assets/docs`, so **H3 is a pure PDF-rename**, no
source-doc fix, and a clean re-export would name it `LobsterLog_Prerequisites_Statement_v1.0_EN.pdf`.)*

### §17 EN — apply in `…Providers_Instructions_v1.1_EN` (find → replace; both verified verbatim)
1. **D1** `The DFO Instructions document (Form 234, v234.6)` → `…(Form 234, v234.7)`  (§5)
2. **D1** `the DFO Instructions (Form 234 v234.6)` → `…(Form 234 v234.7)`  (§11 — note: no comma here)
3. **Doc bump** header `Version 1.1  |  App Version 1.8.6  |  June 2026` → `Version 1.2 … | <new date>`
4. **Doc bump** §13 `Document version: 1.1` → `1.2`; `Date: June 2026` → `<new date>`
5. **Doc bump** page-footer field `v1.1 · June 2026` → `v1.2 · <new date>` (footer element, not body text)
> EN has NO VRN/halés/§2.4 issues — its §2.4 labels match the shipped EN app. **§17 EN v1.2 = D1 ×2 + version bump only.**

### §17 FR — apply in `…Instructions_Fournisseur_v1.1_FR` (find → replace; all verified verbatim)
1. **D1** `formulaire 234, v234.6` → `formulaire 234, v234.7`  (§5, with comma)
2. **D1** `formulaire 234 v234.6` → `formulaire 234 v234.7`  (§11, no comma)
3. **D3** `Le numéro de navire (VRN) — saisis-le` → `Le numéro d'enregistrement du bateau (NEB) — saisis-le`  (§2.3)
4. **D3** bullet `Numéro de navire (VRN)` → `Numéro d'enregistrement du bateau (NEB)`  (§3.1)
   *(minimal-scope alt = just `(VRN)`→`(NEB)`; recommend the full noun swap to match the app label verbatim)*
5. **D5** `Le nombre de casiers halés` → `Le nombre de casiers levés`  (§3.5)
6. **Doc bump** `Version 1.1` / §13 `Version du document : 1.1` → `1.2`; `Date : Juin 2026` → `<new date>`; footers `v1.1 · juin 2026` → `v1.2 · <date>`
7. **ADDITIVE (your call, not in mandated scope):** §3.5 `Les coordonnées de pose et de halage` → `…de levage`? (app uses « levée » for hauling — decide whether v1.2 harmonizes)
8. **D4/§2.4 — BLOCKED ON YOUR DECISION** (see below). If you choose "align docs to app": `Configuration du JBE du MPO`→`Configuration MPO`, `Activer le JBE du MPO`→`Activer le journal MPO`, `clé JBE`→`clé ELOG`, `laissez-passer saisonnier JBE du MPO`→`LAISSEZ-PASSER DE SAISON JOURNAL MPO`. If you choose "keep JBE (MPO-correct)": leave §17 as-is, file an app-string T-item instead. **I did not choose.**

### §22 (User's Guide) — NOT yet master-verified
I verified the §22 mismatches against pdftotext + the shipped locale (0.5/0.6, rows G1–G8) but did
NOT yet read the §22 master Docs to confirm verbatim, because §22 revision is "if needed" in your
plan and it shares the same unresolved D4/G7 (JBE) decision. Say the word and I'll verify the two
§22 masters the same way and produce their apply list.

---

## RULING — D4/G7, dated 2026-07-17 (recorded so it is NOT re-asked)
**(b) KEEP « JBE du MPO / clé JBE » in the §17 AND §22 docs.** Do NOT align the docs down to the
app. The docs' "JBE" wording is the MPO-correct term (glossary §2.A). The app-side fix
(`DfoSetupScreen` "Configuration MPO / Clé ELOG" → JBE terminology) is FILED as an **L5-adjacent
item for the L5 glossary-first recon session — NOT S102 Phase 3.** No app code or locale edits
today. → Consequence: §17 FR §2.4 item 8 is **DROPPED** (no §2.4 edit); §22 G7 strings are
**RETAINED as-is**.

## GRILLE CONDITION (Flag 2) — RESOLVED: answer-key term EXISTS → harmonize with citation
Glossary §2 (docs/GATE_S100_FR_CROSSCHECK.md §2.C): `EFFORT_DETAIL.LGRID_ID = « Grille du
homard »` (source: dict/FS234). Shipped app FR `lgridLabel = "GRILLE DU HOMARD"` (fr/dfo.json:121;
S100 T4). Both agree. So §22 FR « Grille d'établissement du homard » → **« Grille du homard »**
(cited, not invented). *(The §17 "halage" family is likewise answer-key-backed — glossary §2.F
"lever un engin", §2.C "Nombre d'engins levés" — so those harmonizations carry the same citation.)*

---

## §22 APPLY LIST — masters read + all strings VERIFIED verbatim; ruling (b) applied

Master Docs read verbatim: §22 EN `1qade8Oq…`, §22 FR `1qgKC2Pq…`. Every find-string below matches
the Doc source exactly. **FR replacements: use the curly apostrophe ’ (U+2019) to match the Doc's
typography** (e.g. « d’enregistrement »), not a straight `'`.

### §22 EN — `LobsterLog_Users_Guide_v1.0_EN` → essentially CLEAN under ruling (b)
Cross-checked against the shipped EN app: `lgridLabel="LOBSTER SETTLEMENT GRID"` (=guide §5.4
verbatim), `timeSailedLabel="TIME SAILED"` + the other three timestamps all match, `sendToDfo=
"Send to DFO"`, forms `"Submit to DFO"`, "DFO ELOG" naming matches, "Vessel Number (VRN)" correct,
§12 cites no version number (no D1). **No mandated EN edits.**
- **Version bump** (HOLD, per your §17 hold): v1.0 → v1.1 header + footers + (if present) doc-info.
- **PROOFREADER-FLAG (optional, EN, no answer-key binding):** §5.4 guide "Fishing Area (LFA)" vs
  app label `fma = "Fishing Management Area"` — minor doc-vs-UI wording on capture screen F11.
  Leaving master as-is; added to the pile below.

### §22 FR — `LobsterLog_Guide_Utilisateur_v1.0_FR` (find → replace; all verbatim-verified)
| # | Find (verbatim in Doc) | Replace | Basis |
|---|---|---|---|
| G1 (=D3) | `de navire (VRN)` **(×3: intro box, §3.2 bullet, §5.2)** | `d’enregistrement du bateau (NEB)` | glossary §2.C + Rule 528; app `vesselNumberLabel`. Global replace of this substring preserves the `Numéro`/`numéro` case at each site |
| G2 (=D5) | `Nombre de casiers halés` (§5.4) | `Nombre de casiers levés` | glossary §2.C « Nombre d’engins levés » |
| G3a | `Heure de début de halage — quand tu as commencé à haler ton premier casier.` (§5.3) | `Heure de début de levée — quand tu as commencé à lever ton premier casier.` | glossary §2.F/§2.C; app `timeStartedHaulingLabel="HEURE DE DÉBUT DE LEVÉE"` |
| G3b | `Heure de fin de halage — quand tu as fini de haler.` (§5.3) | `Heure de fin de levée — quand tu as fini de lever.` | as G3a; app `timeStoppedHaulingLabel="HEURE DE FIN DE LEVÉE"` |
| G3c | `Coordonnées de pose et de halage` (§5.4) | `Coordonnées de pose et de levée` | same class as §17 halage line 175 (answer-key: « lever/levée ») |
| G3d | `positions de pose et de halage` (§10) | `positions de pose et de levée` | as G3c |
| G5a | `Chaque sortie de pêche correspond` (§5) | `Chaque voyage de pêche correspond` | glossary §2.F « voyage de pêche »; app `tripConfirm.headerTitle` |
| G5b | `Confirmer le début de ta sortie` (§5.2 heading) | `Confirmer le début de ton voyage` | as G5a |
| G5c | `Confirmer le début de la sortie` (§5.2 body **and** §5.2 caption — ×2) | `Confirmer le début du voyage` | **matches app tripConfirm.headerTitle verbatim** |
| G5d | `les heures clés de ta sortie` (§5.3) | `les heures clés de ton voyage` | as G5a |
| G5e | `pendant une sortie` (§8) | `pendant un voyage` | as G5a |
| G6a | `appuie sur Envoyer au MPO` (§7 body) | `appuie sur Transmettre au MPO` | app `sendToDfo="Transmettre au MPO"`; S100 T21 |
| G6b | `le bouton Envoyer au MPO` (§7 caption) | `le bouton Transmettre au MPO` | as G6a (button label) |
| G8 | `Grille d’établissement du homard` (§5.4) | `Grille du homard` | glossary §2.C + app `lgridLabel` (see Grille ruling) |

**G7 — RETAINED as-is under ruling (b) (do NOT edit):** `JBE du MPO`, `Configuration du JBE du
MPO` (§4/§4.1), `Activer le JBE du MPO` (§4.3), `clé JBE` (all sites), `laissez-passer saisonnier
JBE du MPO` (§4.3), `journal de bord électronique (JBE)` (§1).

**Version bump (HOLD, per your §17 hold):** §22 FR v1.0 → v1.1 header + footers.

**PROOFREADER-FLAG / decision (no clean answer key — NOT auto-changed, master left as-is):**
- **G4 §5.3** `Heure d’appareillage` — glossary §2 has **no** "sailed"/"appareillage"/"navigation"
  term (dict TRIP.START_DT is « début du voyage », a different register). The app FR label is
  `timeSailedLabel="HEURE DE NAVIGATION"` — itself not answer-key-backed and weaker French than
  "appareillage". Per your rule (no answer key → do not invent), I left « Heure d’appareillage »
  **unchanged** and flagged it. Note: it's a doc-vs-UI mismatch on capture screen F10 → best fixed
  app-side (bundle with the L5-adjacent JBE app-string work), not by degrading the doc.
- **G6 optional (generic verb, not a UI label):** §7 « prête à être envoyée » / « avant l’envoi »
  / « l’entrée que tu veux envoyer » — generic French for "send"; harmonizing to the
  *transmettre* family (S100 T21) is optional polish, not mandated. Left as-is; proofreader's call.

### PROOFREADER PILE (S102 additions)
1. §22 FR G4 « Heure d’appareillage » vs app « HEURE DE NAVIGATION » (no MPO answer key).
2. §22 FR G6-optional generic *envoyer/envoi* verbs (§7) → *transmettre* family? (S100 T21 spirit).
3. §22 EN "Fishing Area (LFA)" vs app "Fishing Management Area" (§5.4, EN, minor).
*(These join the standing FR proofreader pile — see CLAUDE.md "Not yet built / FR proofreader pile".)*

---

## PHASE-1 CONFIRM GATE
- Ruling (b) recorded (won't re-ask). §22 both masters read + all find-strings verbatim-verified.
- **§17** apply list final for D1 ×2/lang + D3 + D5 (+ halage 175, answer-key-backed) — you said
  you're applying these in Drive now; §17 FR §2.4/D4 is DROPPED under ruling (b); version bump held.
- **§22 EN** = clean (version bump only). **§22 FR** = G1/G2/G3a-d/G5a-e/G6a-b/G8 above; G7 retained;
  G4 + G6-optional PROOFREADER-flagged, masters left as-is; version bump held.
- No masters edited by me (can't + standing rule); no app/locale/git/DFO-POST.

**STOP — over to you to apply the §22 FR list + finalize version bumps in Drive, then drop the
re-exported PDFs into `assets/docs` and tell me the exact filenames for Phase 2 verification.**

---

## PHASE 2 — VERIFY NEW PDFs (read-only; masters edited via Claude.ai)

New files in `assets/docs`: `LobsterLog_Providers_Instructions_v1_2_EN.pdf`,
`LobsterLog_Instructions_Fournisseur_v1_2_FR.pdf`, `LobsterLog_Users_Guide_v1_1_EN.pdf`,
`LobsterLog_Guide_Utilisateur_v1_1_FR.pdf`. Old `providers_instructions_{en,fr}.pdf` REMOVED from
disk (git will show deleted → Phase 3). §22 ruling: PACKAGE-ONLY, no code change, stays out of bundle.

### 2.1 Every gate-doc edit LANDED — ticked
**§17 EN v1.2 — ALL ✓**  D1 `234.6`=0, `234.7` ×2 (L235/347) ✓ · version → `Version 1.2 … July 2026` + footers `v1.2` ✓.
**§17 FR v1.2 — ALL ✓ (one grammar miss, flag 2)**  D1 `234.6`=0, `234.7` ×2 (L250/370) ✓ · D3 VRN→NEB ×2 (L89/128) ✓ · D5 `casiers levés` (L174) ✓ · halage→`levée` BOTH sites (§3.5 L176 + §8 L306) ✓ · version `v1.2 / Juillet 2026` ✓.
**§22 EN v1.1 — CLEAN ✓**  no term changes (correct); `Vessel Number (VRN)` / `DFO ELOG` / `Lobster Settlement Grid` / `Fishing Area (LFA)` (L251) all retained ✓ · version `v1.1 / July 2026` ✓.
**§22 FR v1.1 — ALL ✓ (same flag-2 grammar)**  G1 NEB ×3 (L53/137/221) ✓ · G2 `casiers levés` (L261) ✓ · G3a-d halage/haler→`levée`/`lever` (L235/236/262 + §10 L436) ✓ · G5 `sortie`=0 / `voyage`=6 ✓ · G6 `Transmettre au MPO` button+caption (L351/362) ✓ · G8 `Grille du homard` (L260) ✓ · G7 `JBE` retained (18×) ✓ · G4 `Heure d'appareillage` retained (L234, proofreader) ✓ · version `v1.1 / Juillet 2026` ✓.

### 2.2 Structural parity (docx-build rule) — PASS
§17: EN 13 sections = FR 13. §22: EN 13 sections + 16 SCREENSHOT = FR 13 + 16 CAPTURE. All match.

### FOUR FLAGS
1. **D1 target = v234.7 — CONFIRMED.** Both languages, both sites, matches gate doc §0.4/D1. ✓
2. **NEB long form — ⚠ MISS (needs correction re-export of BOTH §17 FR + §22 FR).** Applied as
   « numéro d'enregistrement **de** bateau (NEB) » (§17 FR L89/128; §22 FR L53/137/221). The
   shipped app string is « NUMÉRO D'ENREGISTREMENT **DU** BATEAU (NEB) » (fr/common.json:81,
   `tripConfirm.vrnLabel`), which also matches glossary §2.C and Rule 528 (§2.B). So the doc's
   « de bateau » should be « **du** bateau ». Grammatical, but it's the exact string a reviewer
   diffs against the app — recommend fixing (find « d'enregistrement de bateau » → « d'enregistrement
   du bateau », 2× in §17 FR, 3× in §22 FR) and re-exporting both FR PDFs. (EN unaffected.)
3. **G5 = ×6 not ×5 — CONFIRMED (undercount was in my row-labeling).** §22 FR now has `sortie`=0,
   `voyage`=6: §5 intro, §5.2 heading, §5.2 body, §5.2 caption, §5.3, and §8 « pendant un voyage »
   (the +1 in the 222 section). All six landed correctly; my earlier "G5a–e" labels collapsed the
   §5.2 body+caption pair into one row. No fix needed — count is right in the PDF.
4. **§17 FR retains « sortie » ×5 — CONFIRMED; glossary verdict for a follow-up:**
   §17 FR was NOT in the sortie→voyage sweep this pass (its list was D1/D3/D5 only). The 5:
   - L121 « Chaque **sortie de pêche** exige… », L133 « Dates de la **sortie de pêche** », L134
     « la date de ta **sortie de pêche** », L266 « pendant une **sortie de pêche** » — all four are
     *fishing trip* → glossary §2.F « **voyage de pêche** » (and app T15 uses « voyage »; §22 G5
     just changed the identical phrase). **RECOMMEND → « voyage de pêche » in a §17 v1.3 follow-up**
     (glossary-backed, restores §17↔§22↔app consistency).
   - L195 « **Numéro de sortie de l'observateur** » (Observer Trip Number) — the §2 glossary has
     **no** OBS_TRIP_NUM / observer-trip answer-key term. Per the no-invent rule: **PROOFREADER-FLAG,
     leave as-is** — do NOT assume « voyage » (observer-program terminology is not established in the
     package). Added to the pile.

### OTHER DISCREPANCIES (recon — flag, don't act)
- **H3 rename NOT reflected in `assets/docs`.** You said "H3 rename done," but
  `Presrsquisites_Statement_en.pdf` is **still present, unchanged** (Jul 6, 94,460 B) and no
  `Prerequisites_Statement_en.pdf` exists on disk. Since it's an untracked passenger PDF that
  nothing require()s, no code impact — but the on-disk typo file was not renamed. Confirm whether
  the rename was done elsewhere (Drive?) or still needs doing here.
- **Companion change-report not found on disk** (searched repo; only node_modules noise). Verified
  against the gate doc directly instead, as instructed.

### PROOFREADER PILE (updated)
Adds: (4) §17 FR L195 « Numéro de sortie de l'observateur » (no answer key). Standing: G4
appareillage, G6 generic *envoyer/envoi*, §22 EN "Fishing Area (LFA)".

## PHASE 2 CONFIRM GATE
Every mandated gate-doc edit landed in all four PDFs; structural parity PASS. **One correctable
miss:** flag 2 « de bateau » → « du bateau » (both FR docs) — your call whether to re-export now or
bank it. Follow-ups (not this pass): §17 FR L121/133/134/266 sortie→voyage; H3 on-disk rename.
**STOP — Phase 3 (App.tsx §17 filename references per 0.9) awaits your go.**

---

## PHASE 2b — RE-VERIFY re-exported FR PDFs (read-only) — PASS
Flag 2 corrected + Flag 4 folded in; both FR files re-exported under the SAME filenames.
- **§17 FR v1.2:** « de bateau (NEB) »=0 ✓ · « du bateau (NEB) » ×2 (L89/128) ✓ · « voyage de
  pêche » ×4 (L121/133/134/266) ✓ · « sortie »=1 = ONLY L195 « Numéro de sortie de l'observateur »
  (untouched, proofreader-flagged) ✓ · sweep-add « Envoyer au MPO »=0 / « Transmettre au MPO »
  present (button L236) ✓.
- **§22 FR v1.1:** « de bateau (NEB) »=0 ✓ · « du bateau (NEB) » ×3 (L53/137/221) ✓ · « sortie »=0
  / « voyage »=6 (unchanged, still correct) ✓.
- **EN files:** unchanged from Phase 2 (verified clean there).
- **docs/S102_EDIT_REPORT.md** present (4,158 B) — reviewed; consistent with this verification, and
  it self-discloses the §17 FR « Envoyer au MPO »→« Transmettre au MPO » sweep-add (verified above).
  → **include in the commit** (Phase 5 block).

### ⚠️ H3 — STILL NOT DONE ON DISK (re-flag, 2nd time)
Full `assets/docs` listing shows `Presrsquisites_Statement_en.pdf` **still present, unchanged**,
and **no** `Prerequisites_Statement_en.pdf`. "H3 rename NOW done" does not match the filesystem.
No code impact (nothing require()s it), but the rename has not landed here. **Not asserting done —
please confirm where it was done or redo it in `assets/docs`.**

---

## PHASE 3 — CODE TOUCH: App.tsx §17 filename refs (per 0.9) — DONE, gates GREEN

PRINT-BEFORE-EDIT confirmed App.tsx:117–119 unchanged. Smallest diff — only the `providers` (§17)
require paths; `dfo234` untouched; §22 NOT added (package-only ruling).

| App.tsx | OLD | NEW |
|---|---|---|
| :118 en | `./assets/docs/providers_instructions_en.pdf` | `./assets/docs/LobsterLog_Providers_Instructions_v1_2_EN.pdf` |
| :119 fr | `./assets/docs/providers_instructions_fr.pdf` | `./assets/docs/LobsterLog_Instructions_Fournisseur_v1_2_FR.pdf` |

- `git diff App.tsx` = **1 file, 2 insertions / 2 deletions** (exactly the 2 require lines).
- No other reference to `providers_instructions` anywhere in `App.tsx`/`src/`/`metro.config.js`/
  `app.config.js` (grep clean) — the old name is fully retired in code.
- Old `providers_instructions_{en,fr}.pdf` deleted from disk (git will show 2 deletions — stage them
  in Phase 5). New §17 PDFs exist at the referenced paths. metro `assetExts` still has `'pdf'`.
- **GATES:** `tsc --noEmit` = **33 errors (baseline, 0 new)** ✓ · `jest` = **19 suites / 68 tests**
  all pass ✓. `git diff src/utils/` = 0 lines (generators/utils untouched).

### NOT verifiable here (Phase 4, you run): the actual Metro bundle + in-app PDF render
tsc/jest don't exercise Metro's `require('*.pdf')` bundling. Phase 4 sim walk must open the two
swapped §17 docs (both languages) in the DFO Documents card to confirm they render.

## PHASE 3 CONFIRM GATE
FR re-exports re-verified PASS; App.tsx §17 refs updated (2-line diff), tsc 33/0-new, jest 19/68,
no stale filename refs. Edit report on disk (include in commit). **Open:** H3 on-disk rename still
not done. **STOP — awaiting your go for Phase 4 (sim render walk) / Phase 5 (commit block).**

---

## H3 — RESOLVED via replacement (deviation from plan, recorded)
Instead of an in-place rename, BOTH §25 PDFs were replaced with fresh exports under new names:
`Presrsquisites_Statement_en.pdf` → **`LobsterLog_Prerequisites_Statement_v1.0_EN.pdf`** and
`Enonce_Prerequis_FR.pdf` → **`LobsterLog_Enonce_Prerequis_v1.0_FR.pdf`** (matches the Drive master
titles). The misspelled file and the old FR name are gone from `assets/docs`. Typo eliminated. ✓

### (a) Code-reference check — CLEAN (re-confirmed for BOTH old §25 names + old §22 + old §17)
`grep` over App.tsx / src / metro.config.js / app.config.js for `Presrsquisites`, `Enonce_Prerequis`,
`providers_instructions`, `Users_Guide_v1.0`, `Guide_Utilisateur_v1.0` = **zero hits** (exit 1).
New §25/§22 names also referenced nowhere in code (package-only, correct). Only the two §17 v1_2
names are referenced (App.tsx, Phase 3).

### (b) git status ↔ listing — FULLY RECONCILED (every entry accounted for)
| git status | file | meaning |
|---|---|---|
| ` M` | App.tsx | Phase 3 (2 lines) |
| ` D` | providers_instructions_en.pdf | old §17 EN (was tracked) → deleted; **stage deletion** |
| ` D` | providers_instructions_fr.pdf | old §17 FR (was tracked) → deleted; **stage deletion** |
| `??` | LobsterLog_Providers_Instructions_v1_2_EN.pdf | §17 EN new — **WIRED → stage (new file:)** |
| `??` | LobsterLog_Instructions_Fournisseur_v1_2_FR.pdf | §17 FR new — **WIRED → stage (new file:)** |
| `??` | LobsterLog_Users_Guide_v1_1_EN.pdf | §22 EN — package-only → **stays UNTRACKED** |
| `??` | LobsterLog_Guide_Utilisateur_v1_1_FR.pdf | §22 FR — package-only → **stays UNTRACKED** |
| `??` | LobsterLog_Prerequisites_Statement_v1.0_EN.pdf | §25 EN — package-only → **stays UNTRACKED** |
| `??` | LobsterLog_Enonce_Prerequis_v1.0_FR.pdf | §25 FR — package-only → **stays UNTRACKED** |
| `??` | docs/GATE_S102_DOCS.md · docs/S102_EDIT_REPORT.md | docs closeout → stage in Phase 5 |
The four OLD untracked passengers (Enonce_Prerequis_FR, Presrsquisites_Statement_en,
Users_Guide_v1.0_EN, Guide_Utilisateur_v1.0_FR) were untracked → their removal leaves **no git
trace** (correct). Nothing orphaned; every listed PDF and every status line named.

### (c) UNTRACKED-PASSENGER ACCOUNTING — updated to new names (⚠ Phase-5 staging hazard)
Now **FOUR** untracked passenger PDFs (was four; the members changed). **Do NOT `git add -A` or a
bare `git add assets/docs` — that would sweep all four in.** Stage the §17 pair by EXACT path only.
- **Stay UNTRACKED (flag, don't stage)** — package-only ruling, no §25/§22 wiring decision made:
  `LobsterLog_Users_Guide_v1_1_EN.pdf`, `LobsterLog_Guide_Utilisateur_v1_1_FR.pdf` (§22),
  `LobsterLog_Prerequisites_Statement_v1.0_EN.pdf`, `LobsterLog_Enonce_Prerequis_v1.0_FR.pdf` (§25).
- **Track/stage (§17, wired):** the two `…v1_2…` PDFs + the two `providers_instructions…` deletions.
> Decision still yours (not made): whether the §22/§25 PDFs are ever git-tracked in the repo. The
> package-only ruling keeps them out of the *app bundle*; it did not rule on repo tracking. Flagged.

---

## PHASE 4 — SIM RENDER CHECK (steps for YOU to run; I do not run the app)

Purpose: tsc/jest do NOT exercise Metro's `require('*.pdf')` — only a real render proves the two
swapped §17 filenames resolve and open. Only §17 is wired (§22/§25 are package-only → they will NOT
appear in the card; nothing to open for them in-app).

1. **Restart Metro** so the renamed `require()` paths re-bundle (the §17 filenames changed). Start
   the iOS sim the normal way. ⚠ NEVER `gradlew clean` / `prebuild --clean` (per the build hazard).
   If the viewer shows a stale/blank doc, clear the Metro cache (`--reset-cache`) and reload — do
   NOT clean-build.
2. Sign in with the **DFO-role / activated** account (the DFO Documents card is gated
   `dfoActivated === true`, S99). Confirm the card is visible: **Settings → DFO Documents**.
3. **EN:** tap **Provider's Instructions** (`§17 · How this app works`) → the viewer must open the
   v1.2 EN PDF. Spot-check: footer reads **`v1.2 · July 2026`**; §5/§11 say **`Form 234, v234.7`**.
4. **FR:** Settings → Language → **Français**, reopen the card, tap **Instructions du fournisseur**
   → the v1.2 FR PDF opens. Spot-check: footer **`v1.2 · juillet 2026`**; **`formulaire 234, v234.7`**;
   §2.3/§3.1 say **`numéro d'enregistrement du bateau (NEB)`**; §3.5 **`casiers levés`** /
   **`voyage de pêche`**; §5 button text **`Transmettre au MPO`**.
5. **Regression:** tap **DFO Instructions 234.7** (EN and FR) → must still open (the `dfo234` group
   was untouched — confirms the filename swap didn't break the other card row).
6. Confirm **no crash, no blank viewer, Close button works** on each open. Any blank/failed open =
   a Metro require resolution problem on the renamed file → report before Phase 5.

Record a per-stop PASS/FAIL as you go; Phase 5 (commit block) is HELD until your walk report.

## PHASE 4 GATE — STOP
Accounting reconciled; §17 wired-and-verified in code (Phase 3 gates green); §22/§25 flagged
untracked (your tracking decision pending). Over to you for the sim render walk. **Holding Phase 5
until your per-stop walk report.**

---

## PHASE 4 — WALK RESULT: PASSED (iOS sim, admin account "Lots-0-Lobster", screenshots on file)
| Stop | Result |
|---|---|
| EN Settings → DFO Documents card | renders, both docs listed ✓ |
| EN §17 tap | opens; "Version 1.2 | App Version 1.8.6 | July 2026"; footer "v1.2 · July 2026" ✓ |
| FR Settings → Documents du MPO | renders, both docs listed, "JBE MPO" pill ✓ |
| FR §17 tap | opens; "Version 1.2 | Version de l'application 1.8.6 | Juillet 2026"; footer "v1.2 · juillet 2026" ✓ |
| Regression EN — DFO Instructions 234.7 | opens; "Version 234.7, August 27, 2026" ✓ (dfo234 group unbroken) |
| Regression FR — Instructions du MPO 234.7 | opens; "Version 234.7, 27 août 2026" ✓ |

Metro `require('*.pdf')` on the renamed §17 files resolves and renders in both languages; the swap
did not break the `dfo234` rows. **Render check PASS.**

## NEB LONG FORM — cat-7 MPO-INTERNAL SPLIT (answer-key record, no action)
Walk found **MPO's own 234.7 FR Instructions TOC uses « numéro d'enregistrement DE bateau (NEB) »**
— an exact match to the form ORIGINALLY applied (Flag 2, pre-correction). So « de bateau » was
MPO-attested, not invented. But MPO's sources disagree among themselves:
- « **du** bateau » — dict SHORT_DESC_FRE (glossary §2.C) + Rule 528 (§2.B) + the **shipped app**
  (`vesselNumberLabel`). ← what §17 FR + §22 FR now carry after the Flag-2 correction.
- « **de** bateau » — the 234.7 FR Instructions TOC.
This is an MPO-internal inconsistency, same class as S100 **I1** (détenteur vs titulaire). The docs
now match the app + dict + Rule 528 (« du »), keeping app↔docs self-consistent — the defensible
majority. **No action; recorded for any DFO conversation.**

## §22 / §25 PASSENGERS — RULING: stay UNTRACKED
Confirmed ruling: the four passenger PDFs (§22 pair `…Users_Guide_v1_1_EN` / `…Guide_Utilisateur_v1_1_FR`;
§25 pair `…Prerequisites_Statement_v1.0_EN` / `…Enonce_Prerequis_v1.0_FR`) stay **UNTRACKED** —
package-only, not app-bundled, not repo-tracked this pass. **Flagged as possible Aug/Sept
housekeeping** (revisit whether to commit them to the repo then). Phase 5 must NOT stage them.

---

## PHASE 5 — COMMIT BLOCK (you run, one line at a time, from this file)

**Standing rule reminders baked in:** stage by EXACT repo-relative path only; ⚠ **NEVER `git add -A`
/ never a bare `git add assets/docs`** — the four untracked passengers must NEVER appear staged;
bare one-line subject, closing quote on the same line, **NO trailer** (if a `Co-Authored-By` appears,
`git commit --amend` to strip it, then re-verify with `git show -s`). Code-first, docs/closeout last.

After EACH `git add` run `git status` and confirm the four passengers are still `??`:
`LobsterLog_Users_Guide_v1_1_EN.pdf`, `LobsterLog_Guide_Utilisateur_v1_1_FR.pdf`,
`LobsterLog_Prerequisites_Statement_v1.0_EN.pdf`, `LobsterLog_Enonce_Prerequis_v1.0_FR.pdf`.
If any is staged: `git restore --staged assets/docs/<name>`.

```bash
cd /Users/jonny/Desktop/LobsterLog

# ── COMMIT 1 — code + §17 asset swap (EXPECT 5 files changed: 1 M, 2 new file, 2 deleted) ──
git add App.tsx
git add assets/docs/LobsterLog_Providers_Instructions_v1_2_EN.pdf
git add assets/docs/LobsterLog_Instructions_Fournisseur_v1_2_FR.pdf
git add assets/docs/providers_instructions_en.pdf      # stages the DELETION (tracked→removed)
git add assets/docs/providers_instructions_fr.pdf      # stages the DELETION
git status     # VERIFY staged: M App.tsx · new file ×2 (v1_2 §17) · deleted ×2 (providers_instructions). 4 passengers + 2 docs still ??
git commit -m "swap bundled §17 provider instructions PDFs to v1.2 (234.7, NEB, voyage, levés)"
git show -s --stat HEAD    # VERIFY 5 files changed; subject exact; NO Co-Authored-By trailer

# ── COMMIT 2 — docs artifacts (EXPECT 2 files: both new file) ──
git add docs/GATE_S102_DOCS.md
git add docs/S102_EDIT_REPORT.md
git status     # VERIFY staged: new file ×2 (the two docs). 4 passengers still ??
git commit -m "docs: S102 gate + §17/§22 v1.2 edit report"
git show -s --stat HEAD    # VERIFY 2 files; no trailer

# ── COMMIT 3 — CLAUDE.md closeout (EXPECT 1 file: M) ──
git add CLAUDE.md
git status     # VERIFY staged: M CLAUDE.md only. 4 passengers still ??
git commit -m "S102 closeout: CLAUDE.md"
git show -s --stat HEAD    # VERIFY 1 file; no trailer

# ── PUSH + verify (do NOT trust an empty range alone) ──
git log --oneline origin/main..HEAD    # EXPECT exactly the 3 new commits above
git push origin main
#   ▸ READ the push output: the range "<old>..<new>  main -> main" + real object/byte upload lines.
git show -s --oneline HEAD             # note the NEW tip hash
git log --oneline origin/main..HEAD    # EXPECT empty — but ONLY trust it if the push printed a real range + uploads
```
Files-changed to expect: **C1 = 5 · C2 = 2 · C3 = 1.** After the real push, fill the three commit
hashes + the `old..new` push range into the CLAUDE.md Session-102 row (they are **PENDING
VERIFICATION** until then — CLAUDE.md is authored now with placeholders, hashes from real pushes only).

## PHASE 5 — STOP
Commit block written above; CLAUDE.md closeout authored (hashes PENDING VERIFICATION). Walk PASSED,
gates green (tsc 33/0-new, jest 19/68), accounting reconciled, passengers guarded. **Over to you —
run the block one line at a time from this file.**

> ✅ **PHASE 5 UN-HELD (2026-07-17):** the §22/§25 verify-first below resolved **package-only** for
> both (rule quotes = authority). No bundling, no scope change → commit block unchanged, CLAUDE.md
> closeout is FINAL (no longer provisional). See "RULINGS — CONFIRMED" at the end of the verify-first.

---

## VERIFY-FIRST — §22 / §25 in-app requirement, from RULE TEXT (verbatim; rulings are YOURS)

Sources (read-only, pdftotext): `~/Desktop/DFO/ELOG_standard/ELOG_Client_Application_Standard_v6.1.pdf`
(the standard the §17/§22/§25 sections come from) and `~/Desktop/DFO/ELOG_qualifications/
Qualification_Process_e v7.pdf`. **Note:** the literal string "2500" appears in NEITHER document —
the app's "Rule 2500" shorthand is the standard's **§17 + §18** offline-instructions text below.

### (1) The offline/in-app availability language — VERBATIM (standard §17 & §18)
**§17 Provider's instructions** (standard p.30, lines 1298–1311):
> "ELOG client application shall come with supplier instructions. Instructions shall be kept in a
> document separate from the user guide. […] Supplier instructions are intended for users of ELOG
> client applications. The instructions detail how to complete the logbook as per DFO's directions.
> Licence conditions shall refer to these instructions as needed. The instructions may be presented
> in different formats (e.g., in document format or as help functions). **However, the user must
> always be able to access the instructions even without access to the Internet.** The ELOG client
> application copyright holder must be able to provide supplier instructions in both official languages."

**§18 DFO instructions** (standard p.30, lines 1315–1330):
> "ELOG client applications will have to be accompanied by "DFO instructions". […] The instructions
> are available in PDF format. **They should always be accessible by the user even if no Internet
> link is functional** as licence conditions will refer to these instructions as needed."

→ §17 AND §18 carry an **explicit offline / in-app mandate**. This is exactly why the app bundles the
Provider's Instructions (§17) + DFO Instructions 234.7 (§18). Correct as-is.

### (2) Standard's §22 — User's Guide (verbatim; p.32, lines 1403–1410)
> "Section 22 "User's Guide" applies for all users except service providers.
> The ELOG client application **shall have a user's guide** explaining the various features of the
> ELOG client application as well as the different steps for creating an electronic logbook and
> transmitting it to DFO.
> The ELOG client application copyright holder **shall be able to provide a user's guide** for its
> application in both official languages."

Glossary (p.— line 1678): "User's Guide: Document for users of an ELOG client application that
explains how the application works." — **§22 contains NO "without Internet" / "accessible offline" /
"in-app" clause** (the §17/§18 phrasing is conspicuously absent).

### (3) Standard's §25 — Prerequisites (verbatim; p.33, lines 1452–1455)
> "ELOG client application installation and/or usage prerequisites **shall be clearly defined**. The
> prerequisites describe the minimum hardware and application environment that the application needs
> in order to work properly."

— **No availability/offline/in-app clause of any kind.**

### (4) Qualification Process v7 — delivery channel for user documentation (verbatim; lines 204, 214–218)
> "2. User documentation — The user documentation for the application must be written by the
> developer and be available in both official languages. This documentation includes, for example,
> the user guide, instructions, help files, etc. User documentation for the form to be qualified
> **must be provided with the initial qualification request of the form**."
> (line 204) "…documentation should be **submitted as a complete package** in order to facilitate the review…"

→ v7 frames the user guide as a **submission-package deliverable** ("provided with the qualification
request" / "complete package") — **not** an in-app-availability mandate.

### STATE — no ruling (yours to make)
- **(a) Does any rule require §22 (User's Guide) IN-APP?** On the verbatim text, **NO explicit
  mandate.** §17/§18 say "must always be able to access … even without … Internet"; §22 does **not**
  — it says "shall HAVE a user's guide" + "shall be able to PROVIDE" it, and v7 treats it as a
  package/submission deliverable. So **package delivery satisfies the rule text.** TWO caveats to
  weigh (not decided): (i) "shall **have** a user's guide" is softer/ambiguous — a strict reviewer
  could read "have" as bundled-in-app; (ii) ⚠ **the §22 guide's OWN §12 text claims it is on-device**
  — EN: "This User's Guide, the DFO Instructions, and all the app's help are **kept on your phone
  too** … even with no signal, **as DFO requires**"; FR: "Ce guide de l'utilisateur … **conservés sur
  ton téléphone** … même sans signal, **comme l'exige le MPO**." If §22 stays package-only (not
  bundled), that self-claim is **false/misleading** → you'd need to EITHER bundle §22 OR edit §12 of
  both §22 PDFs to drop the "kept on your phone / as DFO requires" claim for the guide itself.
- **(b) Does any rule require §25 (Prerequisites) IN-APP?** **NO.** "shall be clearly defined" only —
  no availability channel specified. Package-only is unambiguously rule-compliant.
- **(c) IF you rule in-app for §22** (belt-and-suspenders on "shall have" + to make §12 true), the
  changes — mirrors the existing card wiring (0.9), NOT filename-only:
  1. **App.tsx `DFO_DOC_SOURCES`** (:116–125): add a `userGuide: { en: require('./assets/docs/
     LobsterLog_Users_Guide_v1_1_EN.pdf'), fr: require('./assets/docs/LobsterLog_Guide_Utilisateur_v1_1_FR.pdf') }` group.
  2. **Card JSX** (~:1198–1230): one more row (mirror the providers/dfo234 rows) → existing
     `Asset.fromModule` open handler (:457) + viewer need no change.
  3. **i18n** (en+fr common.json `settings`): `docUserGuide` + `docUserGuideSub` keys.
  4. **Tracking:** the 2 §22 PDFs move from untracked → **staged** (Phase 5 gains 2 `new file:`).
  5. **Size (per 0.7):** +**0.42 MiB** bundled (214,255 + 226,700 B). New wired total ≈ 2.0 MiB.
  §25, if you also chose to bundle (NOT rule-required): same mechanism, + a `prerequisites` group +
  card row + i18n; size + the two §25 PDFs (~0.19 MiB). Gates each way: tsc 33/0-new, jest 19/68.

**STOP at the gate — the §22/§25 in-app rulings are yours. Tell me: bundle §22? bundle §25? (or
package-only + fix the §22 §12 self-claim). Then I revise Phase 3/5 + the CLAUDE.md closeout to match.**

### RULINGS — CONFIRMED (2026-07-17), rule quotes = authority
- **§22 User's Guide — PACKAGE-ONLY.** No rule requires it in-app: standard §22 says only "shall
  **have** a user's guide" / "shall be able to **provide**" it (p.32, lines 1403–1410, quoted above),
  with **none** of §17/§18's "even without access to the Internet" language; Qualification v7 treats
  user documentation as a "complete package … provided with the initial qualification request"
  (lines 204/218). Delivered as part of the qualification submission package. Stays UNTRACKED.
- **§25 Prerequisites — PACKAGE-ONLY.** Standard §25 = "shall be clearly defined" only (p.33, lines
  1452–1455); no availability/offline/in-app clause. Stays UNTRACKED.
- **§22 §12 self-claim — FIXED (not bundled).** The one sentence in §12 that claimed the User's
  Guide itself is on-device was reworded (both languages) so the on-device claim now covers only the
  genuinely-bundled, offline-mandated docs (§17 Provider's Instructions + §18 DFO Instructions):
  - EN: "This User's Guide, the DFO Instructions, and all the app's help are kept on your phone
    **too**, …" → "**The Provider's Instructions**, the DFO Instructions, and all the app's help are
    kept on your phone, …"
  - FR: « **Ce guide de l'utilisateur**, les Instructions du MPO et toute l'aide … sont **aussi
    conservés** … » → « **Les Instructions du fournisseur**, les Instructions du MPO et toute l'aide …
    sont **conservées** … »

### §12 FIX — VERIFIED in the re-exported §22 PDFs (same v1_1 filenames)
- **EN §22** (L446): OLD "This User's Guide, the DFO Instructions…" = **0 hits**; NEW "The Provider's
  Instructions, the DFO Instructions… kept on your phone, …" = **present** ✓ (grep quirk: PDF renders
  a straight apostrophe — confirmed by direct read).
- **FR §22** (L474): OLD « Ce guide de l'utilisateur, les Instructions du MPO… » = **0 hits**; NEW
  « Les Instructions du fournisseur, les Instructions du MPO… sont conservées … » = **present** ✓.
- **Earlier G-edits intact** (FR §22): « du bateau (NEB) » ×3 · « voyage » ×6 · « casiers levés » ·
  « Grille du homard » · « Transmettre au MPO » ×4 · « JBE » ×18 (retained) · « appareillage » (kept) ·
  « de bateau » 0 · « sortie » 0. EN version/grid intact. Paragraph parity 232/232 (per edit report).
- These two §22 PDFs remain **UNTRACKED** (package-only) — commit staging list UNCHANGED.

### Aug/Sept HOUSEKEEPING PILE (added)
- "**Bundle completed §22 User's Guide in-app post-capture**" — OPTIONAL enhancement (NOT rule-
  required per the §22 ruling above), viable once the 16 figures are captured/embedded. If done, it
  also lets §22 §12 restore a User's-Guide-on-device claim. Mechanism = gate doc §(c). Bundle at that
  time with the §25 pair repo-tracking decision (also deferred).

**GATE — §22/§25 rulings recorded; §12 fix verified. Phase 5 un-held below.**

---

## 0.5 §22 FR CROSS-CHECK vs §2 glossary + shipped locale

§22 is the User's Guide (**newly on disk since S100** — S100 D2 recorded it MISSING; the two v1.0
PDFs were created Jul 15, after S100). FR guide is `…Guide_Utilisateur_v1.0_FR`. The FR guide is
plain-language and mostly MPO-correct, but carries the same term drift as §17 **plus** several
UI-label strings the app changed in S101a/b:

| # | §22 FR line | CURRENT | SHOULD BE (glossary / shipped key) | Class |
|---|---|---|---|---|
| G1 | 52–53, 137, 221 | `numéro de navire (VRN)` (×3) | `numéro d'enregistrement du bateau (NEB)` (Rule 528 · `tripConfirm.vrnLabel`) | =D3 |
| G2 | 262 | `Nombre de casiers halés` | `Nombre de casiers levés` (`trapHaulsLabel`) | =D5 |
| G3 | 235, 236 | `Heure de début de halage` / `Heure de fin de halage` | app `HEURE DE DÉBUT DE LEVÉE` / `HEURE DE FIN DE LEVÉE` (`timeStartedHaulingLabel`/`…Stopped…`) | UI-label |
| G4 | 234 | `Heure d'appareillage` | app `timeSailedLabel = "HEURE DE NAVIGATION"` (+ `sailed = "Navigation…"`) | UI-label |
| G5 | 204, 218, 219, 227, 392 | `sortie` / `Confirmer le début de la sortie` | `voyage` / app `tripConfirm.headerTitle = "Confirmer le début du voyage"` (glossary §2.F "voyage de pêche"; S101a T15) | =T15, CAPTURE |
| G6 | 351, 362 | `Envoyer au MPO` (logbook send button) | app `logs.sendToDfo = "Transmettre au MPO"` (S101a T21) | UI-label |
| G7 | 156, 160, 162, 165, 189, 191, 174, 176, 184, 190 | `JBE du MPO` / `Configuration du JBE du MPO` / `Activer le JBE du MPO` / `clé JBE` | same D4 hybrid tension as §17 (app Setup = "Configuration MPO"/"Activer le journal MPO"/"Clé ELOG") | =D4 |
| G8 | 260 | `Grille d'établissement du homard` | glossary/app « Grille du homard » (`lgridLabel`, S100 T4) | minor |

PASSES (FR §22, on record): `NIP du détenteur de permis` = Rule 931 ✓ (lines 52/173/221);
`Durée d'immersion` ✓ (line 265); `débarquement` ✓; `mammifère marin` / `espèce en péril` ✓;
`Type d'appât` / `État de l'appât` ✓ (matches app `baitCondition` phrasing); accents/encoding
clean (cat-6 zero); region **French** names present (line 170) — correct, though the app screen
still shows them in English (L5). `Transmettre au MPO` already used for Forms 222/233 (lines
396/420) — internally inconsistent with the logbook "Envoyer" (G6).

**EN §22:** reads consistent with the shipped EN app (Send to DFO, DFO ELOG Setup, ELOG Key,
red-star required fields, region names). No EN term drift found — the S101a/b churn was FR-only.

---

## 0.6 §22 UI-DRIFT PASS + FIGURE INVENTORY

**⚠ Premise check (recon can overturn):** the prompt framed the §22 masters as pre-dating the
GPS button, offline docs card, role gating, FR trip-start fix, and S97–S101b changes. The v1.0
PDFs on disk are **more current than that** — they already describe: red-star required fields
(§5.3, an S96 feature), GPS auto-read (§5.4/§10), and the offline docs being on-device (§12).
What they DO lag on is the **FR string sweep** (the G1–G8 drift above, all FR) and they do **not**
mention role-gated free activation (§4.3 assumes the in-app Season Pass purchase — fine for a
public user guide). So: EN is current; FR needs the G-list; neither is a "June-2026 relic."

**(a) Described UI that no longer matches the app:** only the FR G1–G8 strings above. EN clean.

**(b) FIGURE INVENTORY** — every `[ SCREENSHOT ]` / `[ CAPTURE D'ÉCRAN ]` placeholder (EN and FR
are 1:1 parallel — 16 figures each, same order). **WHICH-ACCOUNT left blank for you.** "Gate"
column = does the shot require DFO activation / a dfo-role account?

| Fig | §22 §  | EN line | FR line | Screen to capture | Needs DFO-active/role? | WHICH ACCOUNT |
|---|---|---|---|---|---|---|
| F01 | 2.1 | 80 | 83 | App Store / Google Play listing | no (store page) | |
| F02 | 2.2 | 89 | 92 | Privacy Notice + Accept | no (pre-activation) | |
| F03 | 2.3 | 99 | 102 | Fisheries Act Attestation | no | |
| F04 | 3.1 | 124 | 128 | Captain Profile — blank | no | |
| F05 | 3.2 | 139 | 144 | Captain Profile — filled + Save | no | |
| F06 | 4.1 | 159 | 164 | Settings menu, DFO ELOG Setup highlighted | **card visible only when dfoActivated / role** | |
| F07 | 4.2 | 177 | 182 | DFO ELOG Setup — region/licence/FIN/key | **DFO surface** | |
| F08 | 5.1 | 205 | 213 | DFO Logs list + `+` button | **DFO surface** | |
| F09 | 5.2 | 217 | 226 | Confirm Trip Start (date + profile) | **DFO surface** (⚠ FR G5 sortie→voyage visible) | |
| F10 | 5.3 | 236 | 245 | Timestamps — 4 time fields | **DFO surface** (⚠ FR G3/G4 labels visible) | |
| F11 | 5.4 | 261 | 272 | Catch & Effort — area/grid/weight | **DFO surface** (⚠ FR G2/G8 visible) | |
| F12 | 5.5 | 274 | 285 | Bait — type/condition/weight | **DFO surface** | |
| F13 | 7 | 339 | 361 | DFO Logs — Send to DFO button | **DFO surface** (⚠ FR G6 Envoyer→Transmettre visible) | |
| F14 | 8 | 375 | 400 | Form 222 — Marine Mammal entry | **DFO surface** | |
| F15 | 9 | 396 | 422 | Form 233 — Inactivity entry | **DFO surface** | |
| F16 | 10 | 415 | 443 | Coordinate entry — GPS auto-fill + manual | **DFO surface** | |

**(c) Sections describing features that didn't exist in June:** none found — the guide matches the
current feature set (GPS, red-star required, offline docs all present). No phantom features.

**Structural parity (docx-build rule):** EN and FR §22 have identical section structure — 13
numbered sections, same headings, 16 figures each, 1:1. FR is 513 lines / 17 footer-pages vs EN
482 / 16 (French text is ~7% longer → one extra page of reflow; heading counts match). PASS.

---

## 0.7 RULE-2500 / BUNDLING FACTS (decision is YOURS — facts only)

- **Currently bundled** (require()'d in `App.tsx` `DFO_DOC_SOURCES`, so embedded in the app):
  the four §17 + DFO-234.7 PDFs = **1,658,634 B ≈ 1.58 MiB**.
- **§22 EN+FR** = 214,255 + 226,700 = **440,955 B ≈ 431 KiB ≈ 0.42 MiB**.
- **Projected if §22 is bundled alongside the existing four:** 2,099,589 B ≈ **2.0 MiB** wired
  (**delta +0.42 MiB**). Negligible vs total app size; consistent with Rule 2500 (a compliance
  doc that should be offline-accessible).
- All 8 PDFs currently on disk total 2.29 MiB (the two §25 Prerequisites + §22 pair are NOT wired).
- **Does adding §22 need a code change? YES.** `metro.config.js:6` already pushes `'pdf'` to
  assetExts, but the card enumerates a fixed map — adding §22 requires (all in `App.tsx`):
  1. a new group in `DFO_DOC_SOURCES` (App.tsx:116–125), e.g. `userGuide: { en: require('./assets/docs/…EN.pdf'), fr: require('./assets/docs/…FR.pdf') }`;
  2. a card row in the DFO Documents card JSX (App.tsx ~1198–1230, mirroring the providers/dfo234 rows) calling the existing open handler;
  3. i18n keys `settings.docUserGuide` / `…Sub` (en+fr common.json).
  It is **not** a filename-only change.

## 0.8 H3 — "Presrsquisites_Statement_en.pdf" typo rename
- `grep -rn "Presrsquisites" src/ docs/ app.config.js`: **zero code hits.** Referenced only in
  docs (`RECON_S96_GPS`, `GATE_S97_FRENCH` ×2, `GATE_S99_REMAINDER` ×2, `GATE_S100_FR_CROSSCHECK`).
- It is **not** `require()`'d anywhere (not in `DFO_DOC_SOURCES`; it's an untracked passenger PDF,
  §25 EN Prerequisites; FR twin `Enonce_Prerequis_FR.pdf` is already correctly spelled).
- **Rename target: `Prerequisites_Statement_en.pdf`.** ZERO code impact (nothing imports it).
  Pure file rename; optionally update the doc references. Natural moment = this bundle session.

## 0.9 DOCS-CARD WIRING (App.tsx — outside `src/`)
- The DFO Documents card lives in **`App.tsx`** (repo root), NOT a screen under `src/`. `Pdf`
  (react-native-pdf, App.tsx:29) + `Asset` (expo-asset, App.tsx:30); `DFO_DOC_SOURCES` map at
  **App.tsx:116–125**; card JSX ~**1198–1230**; open handler `Asset.fromModule(DFO_DOC_SOURCES[doc][lang])`
  at **App.tsx:457**; full-screen viewer modal ~**1370–1390**.
- Filenames the card references (App.tsx:118–123): `./assets/docs/providers_instructions_en.pdf`,
  `…_fr.pdf` (**§17**), `./assets/docs/dfo_instructions_234_7_en.pdf`, `…_fr.pdf`.
- **If §17 v1.2 is exported under the SAME filenames** (`providers_instructions_{en,fr}.pdf`,
  overwriting the tracked files): **NO code change** — Metro re-bundles on rebuild; git shows them
  as *modified*. **RECOMMENDED** (zero-diff path).
- **If exported under NEW filenames:** App.tsx:118–119 `require()` paths must change to match.

---

## PHASE-0 CONFIRM GATE
Recon complete; nothing edited. Independent findings **cross-validate** S100's recorded D1–D6 (same
lines, same targets), which raises confidence. Two things need your decision before I can build a
final edit list: **(D4/G7)** the JBE-vs-app-label direction (edit docs down to live UI, or keep the
MPO-correct "JBE" wording and file an app-string T-item), and **whether v1.2/§22 harmonizes the
additive flags** (halage line 175; "grille d'établissement"). **STOP — awaiting your go for Phase 1
(you edit the Drive masters).**
