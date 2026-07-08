# CHECKLIST — Session 97 French Sweep (simulator FR run-through)

You run this yourself on the iOS sim in **French**. It verifies the S97 Phase 2a (FR strings) + Phase 2b (dialog/code i18n) changes render correctly and that longer FR strings don't break layout. Items tagged **[Pixel 8]** should be re-run on the Android device later (font metrics + edge-to-edge/keyboard differ).

Legend: ☐ = check · **[2a]**/**[2b]** = what this session changed · **[eyeball]** = general FR-sweep look · **[Pixel 8]** = also re-run on Android.

---

## 0. iOS sim setup (do first)
- ☐ Boot the iOS sim, launch LobsterLog (dev build).
- ☐ Switch the app to French: **Captain Profile → Langue → Français** (or first-launch picker → Français). This is the fastest in-app switch; the free Settings language toggle also works.
- ☐ For a truly fresh pass (first-launch picker + privacy notice), erase-and-reinstall or reset the sim: **Device → Erase All Content and Settings**, reinstall. (Needed only for §1 first-launch + §6d privacy-gate.)
- ☐ Global watch on EVERY screen below — accents render (é è à ç ê î ô û « »), no mojibake (Ã©/â€™); no text truncation/overflow or clipped buttons from longer FR strings; no mixed EN+FR in the same view; red required-asterisks (`*`, #DC2626) render beside labels, never a literal " *" baked into the label text.

---

## 1. First-launch + main screen (free side)
- ☐ **[2b][eyeball]** First-launch language picker (`LanguagePickerScreen`): the two buttons read **English** and **Français** — each in its OWN language (endonyms), regardless of anything. **[Pixel 8]**
- ☐ **[eyeball]** Main **Daily Log** screen. KNOWN/EXPECTED: the free Daily Log is not yet translated (out of S97 scope) — labels like "LBS CAUGHT", "PRICE / LB", "Daily Log", "Save Log", "Saving...", history " lbs" will show **English**. This is a documented gap (RECON §2-B), NOT an S97 regression. Just confirm nothing crashes; do not file as a bug.

---

## 2. Settings (free, `App.tsx`)
- ☐ **[2b][eyeball]** Language toggle: buttons read **English** / **Français** (endonyms, hardcoded — correct). **[Pixel 8]**
- ☐ **[eyeball]** lbs/kg weight-units toggle: options render as **lbs** / **kg** (raw units, untranslated by design). Section label `UNITÉS DE POIDS` is FR. Toggling switches the pref; no layout break.
- ☐ **[2a]** **Documents du MPO** card (S94 DFO Documents): card title + both rows in FR (`Instructions du MPO 234.7`, `Instructions du fournisseur`, sub-lines). Tapping a row opens the PDF viewer (see §6i).
- ☐ **[2a]** Account deletion (Account/Supprimer le compte): trigger **Delete account** → reauth password prompt. Verify FR: title **Confirmer la suppression du compte**, prompt **Saisis ton mot de passe pour confirmer la suppression du compte.**, confirm button **Supprimer le compte**. Enter a WRONG password → failure message **Impossible de vérifier ton mot de passe — rien n'a été supprimé. Réessaie.** (Then cancel — don't actually delete.) **[Pixel 8]**
- ☐ **[eyeball]** Rest of Settings is largely English (known gap) — confirm no crash.

---

## 3. Pro — Weather + Map
- ☐ **[eyeball]** **Weather view — DO NOT TOUCH / DO NOT EDIT.** Look only: note any mixed-language, but this screen is off-limits this session. (`pro.air` = "AIR" is intentionally identical.)
- ☐ **[eyeball]** **Map** (`Garminmapbox`) — the live map, already `t()`-wired. Confirm FR labels, no English leaks. Tap the trawl-number entry → the "missing info" alert should be FR (`map.*`). **[Pixel 8]**

---

## 4. DFO entry — header pill
- ☐ **[2a]** App header DFO pill reads **ELOG MPO** (was "ELOG MPO _todo"; the tag is gone, no stray "_todo" visible). Tapping it opens the DFO logs list.

---

## 5. DFO Setup (`DfoSetupScreen` — before/at activation)
- ☐ **[2a]** Header **Configure ton journal électronique MPO**; screen title **Configuration MPO**; region label **Région MPO**; price label **LAISSEZ-PASSER DE SAISON JOURNAL MPO**; activate button **Activer le journal MPO**. Confirm NO "DFO" text remains anywhere on this screen (all flipped to MPO). **[Pixel 8]**
- ☐ **[eyeball]** The Licence/FIN error strings still valid FR; the "DFOCC" FIN-prefix in the FIN-format error message is INTENTIONALLY still "DFOCC" (technical code, not the agency) — leave it.
- ☐ NOTE: DfoSetup purchase/restore alerts were deliberately NOT touched (deferred to Aug/Sept paywall work) — they will still show English. Expected, not a bug.

---

## 6. DFO logbook flow

### 6a. Logs list (`DfoLogsListScreen`)
- ☐ **[2a]** Section/title reads **Journaux MPO** (no "DFO").
- ☐ **[eyeball]** Sent / Failed / In-progress section headers in FR.

### 6b. Captain Profile (`CaptainProfileScreen`)
- ☐ **[2b]** Language buttons read **English** / **Français** endonyms — switch UI to English via another control first, come back, and confirm the English button still says "English" (not "Anglais") and French says "Français". This is the S97 fix. **[Pixel 8]**
- ☐ **[eyeball]** Required-field red asterisks (S96) render on the gated profile fields; no literal " *" inside a label string.
- ☐ **[2a]** Cloud Backup card: trigger **Restaurer** / backup flows if reachable. The restore success banner should read **Journal de bord restauré à partir de la sauvegarde**; a backup-wipe network failure should read **Impossible de joindre le serveur pour supprimer ta sauvegarde — vérifie ta connexion et réessaie.** (Wipe/restore are hard to force on a clean sim — verify wording if you can reach them; otherwise defer to a real-data check.)

### 6c. Form 234 — FullDfoForm (run ALL FOUR subforms: 88 QC / 89 GLF / 90 MAR / 91 NL)
- ☐ **[eyeball]** Field labels + section headers FR; red asterisks render (S96); longer FR labels don't clip. Check each subform since visible fields differ. **[Pixel 8]**
- ☐ **[2b]** **DFO port selector** (departure/landing port pickers — QC/NL show departure; all show landing): open it →
  - search placeholder reads **Rechercher un port…**;
  - the "all ports" toggle reads **☐ Tous les ports** / **☑ Tous les ports**;
  - with the search box filtered to gibberish, the empty state reads **Aucun port correspondant — coche « Tous les ports ».** (the quoted label matches the toggle — NO English "All ports" leak);
  - the **Effacer** (Clear) link appears once a port is selected. **[Pixel 8]**
- ☐ **[2b]** **MM = Yes** toggle → the mandatory prompt Alert fires; tap its single **OK** button (now from `nav.ok`). Same for **SAR = Yes**. Confirm the OK button label is FR-locale "OK" and the prompt body is FR.
- ☐ **[2a/eyeball]** GPS: tap **Capturer GPS**. With location permission revoked (Settings → Privacy → Location → LobsterLog → Never) → denied alert **Autorisation de localisation requise** / body FR. With sim location set to None → after ~15s → **Impossible d'obtenir la position** / body FR. **[Pixel 8]**
- ☐ **[2b/eyeball]** Leave a mandatory MM/SAR indicator unanswered and try to save → the **S93 missingIndicatorsAnswer** reword: **Réponds Oui ou Non pour l'interaction avec un mammifère marin et l'interaction avec une espèce en péril.** (confirm it does NOT mention lost gear / "engins perdus"). Fires via `form234.missingFieldsTitle`-style gate.
- ☐ **[2b]** Trigger the **missing-fields save gate** (leave required fields blank, save) → FR title + bullet list of missing fields.
- ☐ **[2b]** **Restore-draft dialog** (S95): start a new 234, enter some data, background+kill the app without saving, relaunch, re-enter the form → **Restaurer la saisie en cours?** with **Restaurer** / **Supprimer** buttons (already FR — confirm it still shows post-changes). **[Pixel 8]**

### 6d. Privacy gate (iOS only)
- ☐ **[2b]** With privacy NOT yet accepted (fresh install), enter DFO features and **Decline** the Privacy Notice. On **iOS** the alert body reads **Tu dois accepter l'avis de confidentialité pour utiliser les fonctions MPO.** with an OK button. NOTE: on **Android this alert does not fire** (declining calls `BackHandler.exitApp()`), so this specific string is iOS-only — do NOT expect it on Pixel 8.

### 6e. Form 222 (Marine Mammal)
- ☐ **[2a]** Species card: the trio labels now read **CONFIANCE D'IDENTIFICATION** / **ÉTAT DU SPÉCIMEN** / **LONGUEUR DU CORPS**, placeholders **Sélectionner la confiance… / l'état… / la longueur…** (no "_todo", no English). **[Pixel 8]**
- ☐ **[2b]** Set MM interaction = Yes, leave a required field blank, tap Submit → **Missing-fields** alert: title **Champs manquants**, body **Remplis tous les champs obligatoires avant de transmettre.**
- ☐ **[2b]** Fill required fields, tap Submit → **confirm dialog**: title/body FR (`Soumettre au MPO?` …), buttons **Annuler** (from `nav.cancel`) and **Soumettre au MPO** (submit). Tap Annuler to back out.
- ☐ **[2b]** **Submitted** (success) — on a real UAT send that returns WS0000: title **Transmis**, body **Le formulaire 222 a été envoyé au MPO.**, OK button. (You do the live send.)
- ☐ **[2b]** **Submission Failed** — force a failure (e.g. airplane mode → network error, no successful POST): title **Échec de la transmission**, body shows detail or **Erreur inconnue**.
- ☐ **[2b]** **Validation Failed** — hard to force from the UI (needs a value that passes the field check but fails XSD). If reachable: title **Échec de la validation**, body **Le formulaire 222 n'a pas passé la validation…** + errors + OK. If not reachable on sim, note as "not triggered".
- ☐ **[2a/eyeball]** Form 222 GPS "Utiliser ma position" → denied/no-fix alerts in FR (as §6c). **[Pixel 8]**

### 6f. Form 233 (Inactivity)
- ☐ **[2b]** Leave a required field blank, Submit → **Champs manquants** / **Remplis tous les champs obligatoires avant de transmettre.**
- ☐ **[2b]** Fill fields, Submit → confirm dialog **Soumettre au MPO?** / body FR / **Annuler** + **Soumettre au MPO**. NOTE: the confirm button now reads **Soumettre au MPO** (was a bare "Submit"/"Soumettre") — this is the intended S97 change; confirm you're happy with the wording. **[Pixel 8]**
- ☐ **[2b]** **Transmis** on a real WS0000 send; **Échec de la transmission** / **Erreur inconnue** on a forced failure; **Échec de la validation** if reachable.

### 6g. Registers + detail modals
- ☐ **[eyeball]** Transmission register (Sent + Failed sections) and Log History: SentLogCard / FormSentCard rows in FR; open a card → **SentLogDetailModal** — all rows FR, badge (Accepté/Échec) FR, "XSD" row FR. Check both a logbook row and a Form 222/233 row. **[Pixel 8]**

### 6h. (covered above — GPS + restore-draft)

### 6i. DFO Documents card + PDF viewer (S94)
- ☐ **[2a/eyeball]** From Settings → **Documents du MPO** → open **Instructions du MPO 234.7** and **Instructions du fournisseur**: the in-app PDF viewer opens; close button reads **Fermer**. (Requires the two `providers_instructions_{en,fr}.pdf` / prerequisite PDFs to be bundled — if the assets aren't in `assets/docs/`, the row may fail; that's the S94 asset prereq, not an S97 string bug.) **[Pixel 8]**

---

## 7. Pixel 8 re-run list (later, Android)
Re-run these on the physical Pixel 8 (font metrics + edge-to-edge/keyboard differ; some paths are Android-specific):
- §1 first-launch picker; §2 language endonyms + account-deletion reauth FR; §3 Map alert; §5 DfoSetup MPO labels; §6b Captain Profile endonyms; §6c FullDfoForm labels/asterisks + port selector + GPS + restore-draft; §6e/§6f Form 222/233 dialogs + trio labels + GPS; §6g detail modals; §6i PDF viewer.
- **Do NOT expect** the §6d privacy-gate alert on Android (declining exits the app; the alert is iOS-only).
- Watch especially for FR-string truncation under Android edge-to-edge and keyboard-avoidance (the S95 hardening areas).

---

## Notes / known-expected (not bugs to file this session)
- Free Daily Log + most of free Settings render English (un-i18n'd; RECON §2-B, its own future project).
- lbs/kg toggle options are raw units by design.
- DfoSetup purchase/restore alerts still English (deferred to Aug/Sept paywall work).
- `FishingMap.tsx` is dead code (not imported) — ignore.
- The 35 FR strings authored/edited this session (18 in 2a + 17 in 2b) are best-effort, tagged for a francophone **PROOFREADER REVIEW** in `docs/GATE_S97_FRENCH.md` — this run-through checks rendering/layout, not final wording.
