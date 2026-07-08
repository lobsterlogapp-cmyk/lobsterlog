# GATE — Session 97 French Sweep (commit blocks + proofreader list)

Phase 1 report: `docs/RECON_S97_FRENCH.md`. Jonny runs all git; Claude Code runs none.
All new/edited FR uses "MPO"; no tags/asterisks inside any rendered string. FR register is informal "tu" (matches existing app strings).

---

## PHASE 2a — STRINGS ONLY (fr/dfo.json + fr/common.json)  ✅ applied, awaiting commit

19 string edits across the two FR locale files (18 need proofreading + 1 tag-strip). Verified: all 6 locale files parse as valid JSON; the only `_todo` left in `fr/` is the top-level `"_todo": "TRANSLATION PENDING"` sentinel in each of the 3 files (left as-is per brief); zero asterisks in any FR string; accents intact.

### Commit block — run these (bare subject, no trailer, repo-relative paths)
```
git add src/i18n/locales/fr/dfo.json src/i18n/locales/fr/common.json
git commit -m "S97 FR sweep (strings): retire 222 trio + account/backup stubs, DFO→MPO in setup/logs, drop dfoElog tag"
git push
```
Expect: **2 files changed, 19 insertions(+), 19 deletions(-)** (matches `git diff --stat` at write time — `fr/common.json` 14±, `fr/dfo.json` 24±).

### PROOFREADER REVIEW — 18 authored/edited FR strings
A francophone reviewer should sanity-check meaning + register on all 18. None contain tags or asterisks.

**Form 222 marine-mammal trio — 6 NEW FR (were English `_todo` stubs), `fr/dfo.json`:**
| key | EN | FR (now) |
|---|---|---|
| `form222.confidenceLabel` | IDENTIFICATION CONFIDENCE | CONFIANCE D'IDENTIFICATION |
| `form222.confidencePlaceholder` | Select confidence… | Sélectionner la confiance… |
| `form222.specimenCondLabel` | SPECIMEN CONDITION | ÉTAT DU SPÉCIMEN |
| `form222.specimenCondPlaceholder` | Select condition… | Sélectionner l'état… |
| `form222.lengthCatLabel` | BODY LENGTH | LONGUEUR DU CORPS |
| `form222.lengthCatPlaceholder` | Select length… | Sélectionner la longueur… |

**DFO→MPO flips — 6 EDITED FR (already French; "DFO"→"MPO"), `fr/dfo.json`:**
| key | before | after |
|---|---|---|
| `setup.title` | Configuration DFO | Configuration MPO |
| `setup.region` | Région DFO | Région MPO |
| `setup.headerTitle` | Configure ton journal électronique DFO | Configure ton journal électronique MPO |
| `setup.priceLabel` | LAISSEZ-PASSER DE SAISON JOURNAL DFO | LAISSEZ-PASSER DE SAISON JOURNAL MPO |
| `setup.activateButton` | Activer le journal DFO | Activer le journal MPO |
| `logs.title` | Journaux DFO | Journaux MPO |

**Live-user stubs — 6 NEW FR (were English `_todo` stubs), `fr/common.json`:**
| key | EN | FR (now) |
|---|---|---|
| `backup.restoredNotice` | Restored your logbook from backup | Journal de bord restauré à partir de la sauvegarde |
| `backup.wipeFailedRetry` | Couldn't reach the server to delete your backup — check your connection and try again. | Impossible de joindre le serveur pour supprimer ta sauvegarde — vérifie ta connexion et réessaie. |
| `account.reauthTitle` | Confirm account deletion | Confirmer la suppression du compte |
| `account.reauthPrompt` | Enter your password to confirm account deletion. | Saisis ton mot de passe pour confirmer la suppression du compte. |
| `account.reauthConfirm` | Delete account | Supprimer le compte |
| `account.reauthFailed` | Couldn't verify your password — nothing was deleted. Please try again. | Impossible de vérifier ton mot de passe — rien n'a été supprimé. Réessaie. |

**Not a proofreader item (tag-strip only):** `common.nav.dfoElog` `"ELOG MPO _todo"` → `"ELOG MPO"` — value was already correct MPO; only the ` _todo` tag was removed. Fixed product label, nothing to translate.

**Proofreader note (apostrophes):** the 6 new stubs + trio use straight ASCII apostrophes (`'`), matching their neighboring strings in these sections (`Aucun journal pour l'instant`, `qu'ils`). The S84 privacy-notice FR deliberately uses curly `'`/«». If house style should be curly everywhere, flag on review — I kept section-local consistency.

**Also flag (untracked at write time, NOT mine, NOT staged):** `assets/docs/Enonce_Prerequis_FR.pdf`, `assets/docs/Presrsquisites_Statement_en.pdf` (look like the S94 provider-instructions PDFs), `docs/DIAG_S95_ITEM2.md`, and `docs/RECON_S97_FRENCH.md` (my Phase-1 report). The 2a commit stages only the two locale files by explicit path, so none of these are swept in. Decide separately whether/when to commit them.

---

## PHASE 2b — CODE + NEW KEYS  ✅ applied, awaiting commits

Wired `t()` into the approved hardcoded DFO dialogs. 17 new keys added to `en/dfo.json` + `fr/dfo.json` (parallel, verified); reused existing `common.nav.ok`/`nav.cancel` and existing `form233.confirmTitle/confirmBody/submitButton`. **Gates green: tsc 33/0-new (0 in any touched file), jest 19 suites / 68 tests.** All 6 locale files valid JSON. Interpolated detail uses i18next `{{param}}` (no string concatenation). Two commits, disjoint file sets.

### COMMIT 1 — dialog i18n (7 files)
Files: `Form222Screen.tsx`, `Form233Screen.tsx`, `FullDfoForm.tsx`, `DfoLogsListScreen.tsx`, `DfoPortSelector.tsx`, `en/dfo.json`, `fr/dfo.json`.
- **Form 222** (`Form222Screen.tsx`): Missing-Fields alert → `form222.missingFieldsTitle`/`missingFieldsBody`; confirm Cancel → `nav.cancel`; Validation-Failed title → `form222.validationFailedTitle` + OK → `nav.ok`; Submission-Failed title → `form222.submissionFailedTitle`, `Unknown error` → `form222.unknownError` (both catch + result paths); Submitted title → `form222.submittedTitle`, OK → `nav.ok`.
- **Form 233** (`Form233Screen.tsx`): Missing-Fields → `form233.missingFieldsTitle`/`missingFieldsBody`; the fully-hardcoded confirm dialog now reuses existing `form233.confirmTitle`/`confirmBody`/`submitButton` + `nav.cancel`; Validation-Failed → `form233.validationFailedTitle` + reuse `form233.validationFailed` body + `nav.ok`; Submission-Failed/Unknown-error → `form233.submissionFailedTitle`/`unknownError`; Submitted → `form233.submittedTitle` + reuse `form233.submitSuccess` + `nav.ok`.
- **FullDfoForm** (`FullDfoForm.tsx`): the two `[{ text: 'OK' }]` on the MM/SAR prompts → `[{ text: tc('nav.ok') }]` (titles stay `''`).
- **DfoLogsListScreen** (`DfoLogsListScreen.tsx`): privacy-gate body → `logs.privacyRequiredBody`, OK → `nav.ok`. (The technical `Error ${result.errorCode}` line left alone per brief.)
- **DfoPortSelector** (`DfoPortSelector.tsx`): added `useTranslation('dfo')`; search placeholder → `portSelector.searchPlaceholder`; Clear → `portSelector.clear`; no-match → `portSelector.noMatch` with i18next `{{allPorts}}`.

```
git add src/screens/Form222Screen.tsx src/screens/Form233Screen.tsx src/components/FullDfoForm.tsx src/screens/DfoLogsListScreen.tsx src/components/DfoPortSelector.tsx src/i18n/locales/en/dfo.json src/i18n/locales/fr/dfo.json
git commit -m "S97 FR sweep (code): i18n Form 222/233 submit dialogs, FullDfoForm OK buttons, privacy gate, DFO port selector"
git push
```
Expect: **7 files changed** (dfo.json ±23/±23, the rest small).

### COMMIT 2 — Captain Profile language endonyms (1 file)
`CaptainProfileScreen.tsx` (~341, 350): `{t('settings.english')}`/`{t('settings.french')}` → literal `English` / `Français`, so both buttons read their own-language name regardless of UI language (matches `App.tsx:1141` + the first-launch `LanguagePickerScreen`). `changeLanguage()` behavior untouched.

```
git add src/screens/CaptainProfileScreen.tsx
git commit -m "S97 FR sweep (code): Captain Profile language buttons use endonyms (English / Français)"
git push
```
Expect: **1 file changed**.

### PROOFREADER REVIEW — 17 new FR strings (Phase 2b), all in `fr/dfo.json`
Add to the same reviewer pass as the 2a list. No tags/asterisks; MPO used where the EN says DFO.

**Form 222 + Form 233 dialogs — 6 keys each, identical FR values (12 keys total):**
| key (both `form222.*` and `form233.*`) | EN | FR |
|---|---|---|
| `missingFieldsTitle` | Missing Fields | Champs manquants |
| `missingFieldsBody` | Please complete all required fields before submitting. | Remplis tous les champs obligatoires avant de transmettre. |
| `validationFailedTitle` | Validation Failed | Échec de la validation |
| `submittedTitle` | Submitted | Transmis |
| `submissionFailedTitle` | Submission Failed | Échec de la transmission |
| `unknownError` | Unknown error | Erreur inconnue |

**DFO port selector — 4 keys (`portSelector.*`):**
| key | EN | FR |
|---|---|---|
| `searchPlaceholder` | Type to search ports… | Rechercher un port… |
| `allPorts` | All ports | Tous les ports |
| `clear` | Clear | Effacer |
| `noMatch` | No matching ports — toggle "{{allPorts}}". | Aucun port correspondant — coche « {{allPorts}} ». |

**Privacy gate — 1 key (`logs.*`):**
| key | EN | FR |
|---|---|---|
| `privacyRequiredBody` | You must accept the Privacy Notice to use DFO features. | Tu dois accepter l'avis de confidentialité pour utiliser les fonctions MPO. |

### Phase 2b judgment calls + flags (please review)
1. **DfoPortSelector "All ports" toggle (line 90) was ALSO wired** — one beyond the three you listed (placeholder/Clear/no-match). Reason: the in-scope no-match string literally quotes "All ports", so translating it while leaving the toggle button in English would create a FR-message-referencing-EN-label leak. Used i18next `{{allPorts}}` interpolation so the two stay in sync. If you'd rather I hadn't, say so and I'll revert line 90 only.
2. **Form 233 confirm button EN wording changed `Submit` → `Submit to DFO`** — I reused the existing `form233.submitButton` key ("Submit to DFO" / "Soumettre au MPO") so the 233 confirm button matches Form 222's confirm button. Minor label improvement, but it IS a wording change — flag if you want a literal `Submit` (would need a new key).
3. **Left parked (noticed, NOT in scope — flag, didn't act):** `DfoLogsListScreen.tsx:326` `e.message ?? 'Unknown error'` fallback in the **logbook (234) doSubmit** path (your scope there was only the privacy gate); and the `Error ${...}` / `HTTP ${...}` technical-detail prefixes inside the Form 222/233 failure detail strings (consistent with the DfoLogsList technical line you parked).
4. **`settings.english` / `settings.french` are now orphaned** (Captain Profile was their only consumer). Left in place in en+fr common.json — harmless. Optional future cleanup; not removed this session.
5. **DfoPortSelector line 39 default `placeholder = 'Select port…'`** never renders — both call sites in FullDfoForm pass a `t('form234.selectDeparturePort'/'selectPortLanded')` placeholder. Left as-is.

---

## ⚠️ STATE CHECK (found during Phase-3 closeout) — Phase 2b is NOT committed yet

At closeout, read-only `git log` showed the only S97 commit is **`b32a267` (Phase 2a strings)**. There is **no Phase 2b commit** — `git diff HEAD` confirms all 8 Phase-2b files (Form222/233, FullDfoForm, DfoLogsListScreen, DfoPortSelector, en/dfo.json, fr/dfo.json, CaptainProfileScreen) are still **uncommitted in the working tree**. Nothing is lost; the 2b edits are intact and ready. **The two Phase-2b commit blocks above still need to be run.**

### Correct commit order to finish S97 (run these in sequence)
1. **Phase 2b — Commit 1** (dialog i18n, 7 files) — the block under "COMMIT 1 — dialog i18n" above.
2. **Phase 2b — Commit 2** (endonyms, 1 file) — the block under "COMMIT 2 — Captain Profile language endonyms" above.
3. **Closeout** (docs + CLAUDE.md) — the block just below.

Check the "N files changed" after each: Commit 1 = 7, Commit 2 = 1, Closeout = 4.

---

## PHASE 3 + CLOSEOUT — docs + CLAUDE.md  ✅ written, awaiting the closeout commit

- `docs/CHECKLIST_S97_FR_SWEEP.md` — iOS-sim FR run-through (main → Settings → Pro [Weather view-only, Map] → full DFO flow; triggers every 2b dialog on both 222 and 233; Pixel-8 re-run list; privacy-gate flagged iOS-only).
- `CLAUDE.md` — header refreshed to S97; S97 session-log row added; FR-proofreader-pile bullet updated (raw stubs cleared → 35 strings now flagged for proofread); FishingMap dead-code note added (session row + Not-yet-built); Current-session-goals updated.

### Closeout commit block — run LAST, after both 2b commits (bare subject, no trailer)
```
git add CLAUDE.md docs/RECON_S97_FRENCH.md docs/GATE_S97_FRENCH.md docs/CHECKLIST_S97_FR_SWEEP.md
git commit -m "S97 FR sweep (docs): recon + gate + FR sim checklist + CLAUDE.md S97 closeout"
git push
```
Expect: **4 files changed**.

**Not staged / flag (untracked, NOT mine — decide separately):** `assets/docs/Enonce_Prerequis_FR.pdf`, `assets/docs/Presrsquisites_Statement_en.pdf` (the S94 prerequisite PDFs — note the odd "Presrsquisites" spelling), and `docs/DIAG_S95_ITEM2.md` (an S95 diag doc). The closeout block stages only the 4 S97 files by explicit path, so none are swept in.

