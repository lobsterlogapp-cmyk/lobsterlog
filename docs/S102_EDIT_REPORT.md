# S102 — Edits applied by Claude.ai to the four masters (July 17, 2026)

Source: the .docx masters Jonathon uploaded from his Desktop. Every find-string was verified
present verbatim before editing; every replacement was applied with an asserted count
(any mismatch would have aborted). All four repacked files pass XSD validation with
ZERO paragraph-count change (§17 EN/FR: 185/185 · §22 EN/FR: 232/232 — EN/FR parity holds).

## §17 EN → v1.2 (LobsterLog_Providers_Instructions_v1_2_EN)
- D1 ×2: "(Form 234, v234.6)" / "(Form 234 v234.6)" → v234.7  ⚠️ SEE FLAG 1
- Title line, Document Information version + date, footer → Version 1.2 / July 2026

## §17 FR → v1.2 (LobsterLog_Instructions_Fournisseur_v1_2_FR)
- D1 ×2: "(formulaire 234, v234.6)" / "(formulaire 234 v234.6)" → v234.7  ⚠️ SEE FLAG 1
- D3 ×2: « numéro de navire (VRN) » → « numéro d'enregistrement de bateau (NEB) »  ⚠️ SEE FLAG 2
- D5 ×1: « casiers halés » → « casiers levés »
- Halage fold-in ×2: « de pose et de halage » → « de pose et de levée »
- ➕ SWEEP ADDITION (not on gate-doc list): ×1 « Envoyer au MPO » → « Transmettre au MPO »
  — same button-name class as §22 G6; doc already used « Transmettre au MPO » 3× elsewhere.
- Title line, Version du document + Date, footer → Version 1.2 / Juillet 2026

## §22 EN → v1.1 (LobsterLog_Users_Guide_v1_1_EN)
- Version bump only (title + footer → Version 1.1 / July 2026). No text edits, per gate doc.

## §22 FR → v1.1 (LobsterLog_Guide_Utilisateur_v1_1_FR)
- G1 ×3: VRN → « numéro d'enregistrement de bateau (NEB) »  ⚠️ SEE FLAG 2
- G2 ×1: « casiers halés » → « casiers levés »
- G3 ×4: halage → levée (incl. the two verb forms: « commencé à haler » → « commencé à lever »,
  « fini de haler » → « fini de lever »)
- G5 ×6: sortie → voyage  ⚠️ SEE FLAG 3 (gate doc listed G5a–e = 5; six occurrences existed)
- G6 ×2: « Envoyer au MPO » → « Transmettre au MPO » (generic envoyer/envoi verbs untouched,
  per proofreader flag)
- G8 ×1: « Grille d'établissement du homard » → « Grille du homard »
- G4 « Heure d'appareillage » left AS-IS (proofreader-flagged, no answer key)
- G7 « clé JBE » retained per ruling (b)
- Title + footer → Version 1.1 / Juillet 2026

## Residual sweep results
- fr §22: zero VRN / halé / halage / haler / sortie / Envoyer-au-MPO / 234.6 / Grille-d'établissement.
- EN docs retain "VRN" (2× in §17 EN, 3× in §22 EN) — CORRECT: VRN is the English term; only FR moved to NEB.

## ⚠️ FLAGS for Claude Code Phase 2 (verify against docs/GATE_S102_DOCS.md)
1. **D1 target version = 234.7 was inferred**, from the DFO Instructions doc shipped in the
   current 234.12 package (ELOG_F234: "DFO instructions 234.7 EN/FR"). If the gate doc's D1
   line says a different target, say so — it's a 2-minute re-edit.
2. **NEB long form**: « numéro d'enregistrement de bateau (NEB) » was used as the MPO term.
   Verify against the shipped app string / §2 glossary.
3. **G5 count**: gate doc said G5a–e (5); the master contained 6 "sortie" occurrences
   (incl. « pendant une sortie » in the Form 222 section). All 6 changed for consistency
   with the shipped « Confirmer le début du voyage » screen. Confirm the 6th was a
   gate-doc undercount, not a deliberate exclusion.
4. **§17 FR "sortie" ×5 left UNCHANGED** (lines re: « sortie de pêche » ×4 and
   « Numéro de sortie de l'observateur » ×1). G5 was §22-scoped, and the observer field
   looks like an MPO dictionary term — not changed without the answer key. Claude Code
   should run these 5 through the §2 glossary / MV tables and report whether any should
   become « voyage » in a follow-up pass.

## Filenames
Version numbers were bumped IN the filenames (…_v1_2_… / …_v1_1_…). Before copying the two
§17 PDFs into assets/docs, check the exact filenames the DFO Documents card expects
(gate doc §0.9): if the card references the old names, either rename these PDFs to match
(zero code diff) or let Claude Code write the App.tsx reference update in Phase 3.

## §22 / §25 in-app requirement — verify-first ruling (July 17, 2026)
Rule-text authority (ELOG_Client_Application_Standard_v6.1 + Qualification_Process_e v7):
- §17 Provider's instructions: "the user must always be able to access the instructions even
  without access to the Internet" — offline mandate → bundled (correct).
- §18 DFO instructions: "always be accessible … even if no Internet link is functional" — offline
  mandate → bundled (correct).
- §22 User's Guide: "shall have a user's guide … shall be able to provide" — NO offline/in-app
  clause; v7 = "provided with the initial qualification request" (submission package).
- §25 Prerequisites: "shall be clearly defined" — no availability clause.

**RULINGS: §22 PACKAGE-ONLY, §25 PACKAGE-ONLY** (no rule requires either in-app). Both pairs stay
UNTRACKED. Optional Aug/Sept enhancement banked: bundle §22 in-app post-capture (not required).

## §22 §12 self-claim fix (both languages, one sentence — re-exported v1_1, same filenames)
The §12 sentence wrongly implied the User's Guide itself is on-device; reworded so the on-device
claim covers only the bundled §17 + §18 docs:
- EN: "This User's Guide, the DFO Instructions, and all the app's help are kept on your phone too, …"
  → "The Provider's Instructions, the DFO Instructions, and all the app's help are kept on your phone, …"
- FR: « Ce guide de l'utilisateur, les Instructions du MPO et toute l'aide … sont aussi conservés … »
  → « Les Instructions du fournisseur, les Instructions du MPO et toute l'aide … sont conservées … »
Re-validated (paragraph parity 232/232 unchanged); Claude Code verified in both PDFs: old sentence
0 hits, new sentence present, all earlier G-edits intact. §22 PDFs stay UNTRACKED.
