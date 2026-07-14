# S98 FIX — French signup surface + Daily Log home labels (gate doc)

Session 98, July 14 2026. Fix phase for the recon in `docs/GATE_S98_FRENCH_SIGNUP.md`.
Additive string i18n only — no save/storage/write path touched, no chip arrays touched,
no stored value changed. NO-GIT rule in force: commit blocks below, Jonny runs them.

---

## PHASE 1 — SIGNUP SURFACE ✅ (built + gated; awaiting Jonny's device walk + commit)

### Changelog

**`src/i18n/locales/en/common.json` + `src/i18n/locales/fr/common.json`** — new
top-level `login` section (additive; nothing renamed/moved/deleted): 20 keys + a
`login.errors` subsection of 6. EN values are byte-for-byte the previous hardcoded
strings — English rendering is unchanged.

**`src/screens/LoginScreen.tsx`** — `useTranslation()` added; all 20 recon-§1 strings
now `t('login.…')`: subtitle, card titles (welcomeBack/createAccount), EMAIL/PASSWORD
labels, email placeholder, forgotPassword, logIn/signUp buttons, both toggles, the
4 Check-Your-Inbox strings, and the 3 forgot-password alerts (missingEmail title+body,
emailSent title+body, errorTitle — `error.message` kept dynamic per instruction).
Brand name `LobsterLog` and the `••••••••` placeholder untouched.

**`src/Hooks/useAuth.ts`** — the 7 submit-path alert strings wired via the file's
existing `i18next.t()` pattern (same style as the delete-account flow): the
missing-fields alert reuses `login.errorTitle` for its title + new
`login.errors.missingFields` body; the 4 friendly auth-error messages →
`login.errors.invalidCredential/emailInUse/weakPassword/invalidEmail`; alert title →
`login.errors.authErrorTitle`. Raw `err.message` fallback kept dynamic.
**Key-layout note:** error strings live in a `login.errors.*` subsection (my judgment
call per 1c) — keeps the flat `login.*` list to visible-UI strings.

**EMAIL LANGUAGE (1d)** — setter verified against the INSTALLED package before coding:
`@react-native-firebase/auth` **v23.5.0** modular API exports
`setLanguageCode(auth, languageCode)` (node_modules/@react-native-firebase/auth/lib/
modular/index.d.ts:420, implemented at lib/modular/index.js:367). `useDeviceLanguage()`
exists in typings but **throws "unsupported by the native Firebase SDKs"** on native
(index.js:358-359) — not usable. Wired one awaited line at each send site:
- `useAuth.ts` — `await setLanguageCode(auth, i18next.language);` immediately before
  `sendEmailVerification()` (registration path).
- `LoginScreen.tsx` — `await setLanguageCode(auth, i18n.language);` immediately before
  `sendPasswordResetEmail()` (forgot-password path).
This sets the outgoing-email language on our side only; the FR TEMPLATE itself is the
Firebase-console item Jonny owns separately.

### New FR strings — PROOFREADER REVIEW (all 26; join the existing pile)

Register matches the existing FR files: informal *tu*, Quebec punctuation (no space
before `?`), «courriel».

| Key | FR value | Status |
|---|---|---|
| login.subtitle | Journal de bord numérique | PROOFREADER REVIEW |
| login.welcomeBack | Bon retour | PROOFREADER REVIEW |
| login.createAccount | Créer un compte | PROOFREADER REVIEW |
| login.emailLabel | COURRIEL | PROOFREADER REVIEW |
| login.emailPlaceholder | nom@exemple.com | PROOFREADER REVIEW |
| login.passwordLabel | MOT DE PASSE | PROOFREADER REVIEW |
| login.forgotPassword | Mot de passe oublié? | PROOFREADER REVIEW |
| login.logIn | Se connecter | PROOFREADER REVIEW |
| login.signUp | S'inscrire | PROOFREADER REVIEW |
| login.needAccount | Pas encore de compte? Inscris-toi | PROOFREADER REVIEW |
| login.haveAccount | Déjà un compte? Connecte-toi | PROOFREADER REVIEW |
| login.inboxTitle | Vérifie ta boîte de réception | PROOFREADER REVIEW |
| login.inboxBody | Nous avons envoyé un lien de vérification à ton adresse courriel.\n\nClique sur le lien dans ce courriel, puis reviens ici pour te connecter. | PROOFREADER REVIEW |
| login.backToLogIn | Retour à la connexion | PROOFREADER REVIEW |
| login.wrongEmail | Mauvaise adresse courriel? Touche le bouton ci-dessus et inscris-toi de nouveau avec la bonne adresse. | PROOFREADER REVIEW |
| login.missingEmailTitle | Courriel manquant | PROOFREADER REVIEW |
| login.missingEmailBody | Entre ton adresse courriel dans le champ ci-dessus pour qu'on sache où envoyer le lien. | PROOFREADER REVIEW |
| login.emailSentTitle | Courriel envoyé | PROOFREADER REVIEW |
| login.emailSentBody | Vérifie ta boîte de réception pour trouver le lien de réinitialisation de ton mot de passe. | PROOFREADER REVIEW |
| login.errorTitle | Erreur | PROOFREADER REVIEW |
| login.errors.missingFields | Entre ton courriel et ton mot de passe. | PROOFREADER REVIEW |
| login.errors.invalidCredential | Courriel ou mot de passe incorrect. Réessaie. | PROOFREADER REVIEW |
| login.errors.emailInUse | Un compte existe déjà avec ce courriel. Essaie plutôt de te connecter. | PROOFREADER REVIEW |
| login.errors.weakPassword | Le mot de passe doit contenir au moins 6 caractères. | PROOFREADER REVIEW |
| login.errors.invalidEmail | Entre une adresse courriel valide. | PROOFREADER REVIEW |
| login.errors.authErrorTitle | Erreur d'authentification | PROOFREADER REVIEW |

### Gates (Phase 1)

- **tsc:** 33 errors total = baseline, **0 new** (the LoginScreen hits are the
  pre-existing S52-baseline implicit-any props, unchanged count).
- **jest:** **19 suites / 68 tests, all green** = baseline.
- **JSON:** both common.json files parse; `login` = 20 keys + 6 error keys in en AND fr;
  key-coverage script: all **26** `t('login.*')` call sites across LoginScreen.tsx +
  useAuth.ts resolve in BOTH languages, zero missing, zero empty/_todo.
- **Sim (partial):** dev build on the booted iPhone 17 Pro loaded the new bundle clean
  (no redbox) with `user_language='fr'` already set; app is signed IN, so the home
  screen shows (EN labels — expected pre-Phase-2). **The signed-out three-state walk
  (Welcome Back / Create Account / Check Your Inbox + each alert) needs hands on the
  device** — no sim tap automation installed, and I did not force a sign-out via
  keychain surgery. → **JONNY DEVICE GATE:** sign out, walk all three states + the
  5 alert paths in FR (blank-email forgot-password; bad password; existing email;
  weak password; bad email format), and confirm a fresh signup's verification email
  arrives (template language is the console item you own).

### Phase-1 commit block (Jonny runs, one line at a time)

Note before staging: `docs/CHECKLIST_S97_FR_SWEEP.md` is also modified in the tree
(your own edits — deliberately NOT staged below); `assets/docs/*.pdf` +
`docs/DIAG_S95_ITEM2.md` untracked (yours, not staged). The S98 recon doc rides this
commit per your note.

```
git add src/i18n/locales/en/common.json
git add src/i18n/locales/fr/common.json
git add src/screens/LoginScreen.tsx
git add src/Hooks/useAuth.ts
git add docs/GATE_S98_FRENCH_SIGNUP.md
git add docs/GATE_S98_FRENCH_FIX.md
git status
git commit -m "i18n login/signup surface + auth email language (FR)"
git push origin main
```

Files changed: **6** (4 code/locale + 2 docs). Bare one-line subject, no trailer.

---

## PHASE 2 — DAILY LOG HOME LABELS + DATE ✅ (built + gated; awaiting Jonny's signed-in walk + commit)

Phase 1 pushed as a282d4c. Scope guard held: **zero** edits to the wind chip array
(App.tsx:823), the condition chips / WEATHER_OPTIONS (App.tsx:848, constants.ts), any
chip `.map()` render output, or any save/write logic — verified by grepping the App.tsx
diff for `windDir:/weather:/WEATHER_OPTIONS/setFormData/toggleWeather` (no hits).
Chip LABELS stay English this phase — expected seam, closes in Phase 3.

### Changelog

**`src/i18n/locales/en/common.json` + `src/i18n/locales/fr/common.json`** — 19 new keys
appended to the EXISTING `log` section (additive; nothing renamed/moved/deleted; the
pre-existing `log.saveError` legacy key is untouched — the new alert title is
`log.saveErrorTitle`). EN values byte-for-byte the previous hardcoded strings.

**`App.tsx`** — 15 home-screen label/button sites wired with the existing
`t`/`i18n` from line 151 (`useTranslation('common')`): daysOut, thisSeason, thisWeek,
sunSat, dailyLog, saving, lbsCaught, pricePerLb, waterTemp, windKts, windDirection
(label only), conditions (label only), notesLabel, notesPlaceholder, saveLogButton.
**Date header (2c):** App.tsx:711 `toLocaleDateString('en-US', …)` →
`toLocaleDateString(i18n.language.startsWith('fr') ? 'fr-CA' : 'en-CA', …)` — exact
FullDfoForm `formatDateTimeDisplay` precedent (FullDfoForm.tsx:932). Year line (717)
locale-free, untouched. **NOT touched (noted per 2c):** the history-card dates at
App.tsx:891/916/933 still hardcode `'en-US'`/default — their own pass, with the rest
of the history card's EN strings.

**`src/Hooks/useLogForm.ts`** — `import i18next` added; the 4 save-path alert strings
(and ONLY the strings) swapped at the two Alert.alert sites: `log.logSavedTitle` /
`log.logSavedWeather` / `log.logSavedBody` / `log.saveErrorTitle`. Save logic,
Firestore payload, weather sync, and `handleSkipDay` byte-untouched (the `'No Fishing'`
/ `'Did not go out. '` stored strings remain — Phase 3 territory).

### New FR strings — PROOFREADER REVIEW (all 19; join the pile)

| Key | FR value | Status |
|---|---|---|
| log.daysOut | JOURS EN MER | PROOFREADER REVIEW |
| log.thisSeason | Cette saison | PROOFREADER REVIEW |
| log.thisWeek | CETTE SEMAINE | PROOFREADER REVIEW |
| log.sunSat | dim - sam | PROOFREADER REVIEW (FR day abbrevs lowercased per convention — reviewer's call vs matching EN caps) |
| log.dailyLog | Journal quotidien | PROOFREADER REVIEW |
| log.saving | Enregistrement... | PROOFREADER REVIEW |
| log.lbsCaught | LIVRES CAPTURÉES | PROOFREADER REVIEW (kept imperial "livres" — the lbs/kg units-pref bug is separate, recon §7) |
| log.pricePerLb | PRIX / LB | PROOFREADER REVIEW |
| log.waterTemp | TEMP. DE L'EAU | PROOFREADER REVIEW |
| log.windKts | VENT (NŒUDS) | PROOFREADER REVIEW |
| log.windDirection | DIRECTION DU VENT | PROOFREADER REVIEW |
| log.conditions | CONDITIONS | PROOFREADER REVIEW |
| log.notesLabel | NOTES | PROOFREADER REVIEW |
| log.notesPlaceholder | Équipage, problèmes d'engins... | PROOFREADER REVIEW |
| log.saveLogButton | Enregistrer le journal | PROOFREADER REVIEW |
| log.logSavedTitle | Journal enregistré | PROOFREADER REVIEW |
| log.logSavedWeather | Météo mise à jour automatiquement. | PROOFREADER REVIEW |
| log.logSavedBody | Enregistré. | PROOFREADER REVIEW |
| log.saveErrorTitle | Erreur d'enregistrement | PROOFREADER REVIEW |

### Gates (Phase 2)

- **tsc:** 33 errors total = baseline, **0 new**, none in App.tsx / useLogForm.ts.
- **jest:** **68/68 green** = baseline.
- **JSON + coverage:** both files parse; all 19 new-key call sites (15 App.tsx +
  4 useLogForm) resolve in BOTH languages, zero missing/empty.
- **Sim (partial):** new bundle loads clean on the booted iPhone 17 Pro with
  `user_language='fr'`. The sim is currently SIGNED OUT (from the Phase-1 walk), which
  live-verified the Phase-1 FR LoginScreen on-screen (Bon retour / COURRIEL /
  MOT DE PASSE / Mot de passe oublié? / Se connecter / Pas encore de compte?
  Inscris-toi) — but it means the signed-in home screen was NOT visually walked
  headlessly (no credential automation). → **JONNY DEVICE GATE:** sign in (FR), confirm
  home labels + date header render French («mar. 14 juill.»-style), chips still English
  (expected), Save Log fires the French saved/error alerts.

### Phase-2 commit block (Jonny runs, one line at a time — SEPARATE from Phase 1)

Same tree caveats as Phase 1: `docs/CHECKLIST_S97_FR_SWEEP.md` (your edits),
`assets/docs/*.pdf` + `docs/DIAG_S95_ITEM2.md` (yours/untracked) — NOT staged below.

```
git add App.tsx
git add src/Hooks/useLogForm.ts
git add src/i18n/locales/en/common.json
git add src/i18n/locales/fr/common.json
git add docs/GATE_S98_FRENCH_FIX.md
git status
git commit -m "i18n Daily Log home labels + date header locale (FR)"
git push origin main
```

Files changed: **5** (4 code/locale + this gate doc). Bare one-line subject, no trailer.

---

## PHASE 3 — COMMIT 1: history card strings + date sites + picker locale ✅ (built + gated; awaiting Jonny's walk + commit)

Recon: docs/GATE_S98_PHASE3_RECON.md §B + §C. Tip at build time: ea5f513.
Scope guard held: **zero** edits to chip arrays (App.tsx:823/848), WEATHER_OPTIONS,
any useLogForm write/toggle/skip path, or the stored-value render interpolations —
`${log.windDir}` (App.tsx:964-965) and `log.weather.join(', ')` (:976-978) are
byte-untouched (only the literal `kts` next to windDir was swapped); diff-grepped for
chip/write symbols: no hits. Chip values still render EN — Commit 2.

### Changelog

**`src/i18n/locales/en/common.json` + `src/i18n/locales/fr/common.json`** — 8 new keys
appended to the existing `log` section (additive): historyWeekOf, eventsFor, haulBadge,
perLbSuffix, tempFSuffix, ktsSuffix, swellWord, noHistory. EN values byte-for-byte.
**Key REUSED, not added:** the lbs suffix site now calls the pre-existing
`log.lbsSuffix` ("{{lbs}} lbs", en = fr, already used by LobsterLogProposalForm) —
renders byte-identical EN, no duplicate key.

**`App.tsx`** — 10 sites:
- **Picker locale (recon B):** `locale={i18n.language.startsWith('fr') ? 'fr-CA' : 'en-CA'}`
  added to the DateTimePicker (:727-736). Only the prop added; value/mode/display/
  onChange untouched. iOS honors it; Android follows device locale by design.
- **3 date sites → the Phase-2 ternary:** week-of date (was `'en-US'` numeric M/D),
  S/M/T/W day-letter row `{weekday:'narrow'}` (was `'en-US'` — locale swap auto-yields
  D L M M J V S, no hand-typed letters), events-for date (was locale-default, now
  explicit fr-CA/en-CA).
- **7 string sites → t():** historyWeekOf + eventsFor + haulBadge (all with dynamic
  interpolation preserved), lbsSuffix (reused key), perLbSuffix (the `$` currency
  symbol stays literal), tempFSuffix, ktsSuffix (windDir interpolation untouched),
  swellWord (the metric `m` stays literal), noHistory empty state.

**UNITS-PREF:** unit WORDS only — zero conversion logic or Settings-toggle changes;
the lbs/kg + °F/°C behavior bug stays open and out of scope, per recon §C flag.

### New FR strings — PROOFREADER REVIEW (8; join the pile)

| Key | FR value | Status |
|---|---|---|
| log.historyWeekOf | Historique (semaine du {{date}}) | PROOFREADER REVIEW |
| log.eventsFor | Événements du {{date}} : | PROOFREADER REVIEW (space before colon per existing FR file convention) |
| log.haulBadge | Levée {{n}} | PROOFREADER REVIEW |
| log.perLbSuffix | /lb | PROOFREADER REVIEW (lb abbreviation same in FR) |
| log.tempFSuffix | °F | PROOFREADER REVIEW (unit word only; °F↔°C is the units bug, untouched) |
| log.ktsSuffix | nd | PROOFREADER REVIEW (nautical nœuds abbrev — reviewer may prefer "kn"/"nds") |
| log.swellWord | houle | PROOFREADER REVIEW |
| log.noHistory | Aucun historique enregistré pour cette date. | PROOFREADER REVIEW |

(`log.lbsSuffix` FR is the pre-existing "{{lbs}} lbs" — flagging for the same review:
reviewer may want "{{lbs}} lb"; it predates this commit and is shared with the legacy
proposal form, so changing it is the proofreader pass's call, not this commit's.)

### Gates (Phase 3 / Commit 1)

- **tsc:** 33 = baseline, **0 new**, none in App.tsx.
- **jest:** **19 suites / 68 tests green** = baseline.
- **JSON + coverage:** both files parse; all 24 `t('log.*')` App.tsx call sites resolve
  in BOTH languages, zero missing/empty.
- **Sim (partial):** new bundle loads clean, signed-in FR home screen live-verified
  («mar. 14 juill.» header, all Phase-2 labels French, chips EN as expected). The
  history card sits below the fold and the picker pill needs a tap — no headless
  scroll/tap automation. → **JONNY DEVICE GATE:** in FR, scroll to the history card
  (header «Historique (semaine du 7-12)»-style, day row D L M M J V S, dates fr-CA,
  «Levée n», suffixes, empty state «Aucun historique…»), and tap the date header to
  confirm the grey picker pill reads a French date (e.g. «15 avr. 2026»). Stored
  wind/weather values in history rows still EN — expected until Commit 2.

### Phase-3 Commit-1 block (Jonny runs, one line at a time)

Tree caveats unchanged: `docs/CHECKLIST_S97_FR_SWEEP.md` (your edits) +
`assets/docs/*.pdf` + `docs/DIAG_S95_ITEM2.md` (yours/untracked) — NOT staged.
The Phase-3 recon doc rides this commit.

```
git add App.tsx
git add src/i18n/locales/en/common.json
git add src/i18n/locales/fr/common.json
git add docs/GATE_S98_PHASE3_RECON.md
git add docs/GATE_S98_FRENCH_FIX.md
git status
git commit -m "i18n history card strings + date locales + date-picker locale (FR)"
git push origin main
```

Files changed: **5** (3 code/locale + recon doc + this gate doc). Bare one-line
subject, no trailer.

---

## PHASE 3 — COMMIT 2: wind + condition chip code↔label split ✅ (built + gated; awaiting Jonny's tap walk + commit)

Recon: docs/GATE_S98_PHASE3_RECON.md §A. Tip at build time: 6ab38e1.

**THE INVARIANT HELD — verified in the diff before building.** `git diff` shows zero
change to useLogForm.ts (writes/toggle/handleSkipDay/'No Fishing' sentinel) and zero
change to constants.ts; the App.tsx hunks are EXACTLY: one import line + the four
render outputs. The chip `.map()`s still iterate the CODE arrays; onPress still writes
the code; the selected-state compares (`windDir === dir`, `weather.includes(opt)`)
are byte-untouched. What lands in formData/Firestore is identical to before —
**zero migration.**

### Changelog

**`src/i18n/locales/en/common.json` + `src/i18n/locales/fr/common.json`** — two keyed
subsections appended to the existing `log` section, keyed BY THE CODE:
`log.windDirLabels` (all 16 compass points — covers legacy 16-point auto-fill values,
not just the 8 chips) + `log.weatherLabels` (all 9 conditions; "Too Windy" /
"No Fishing" are single keys with spaces — valid, dots are the only separator).
EN values byte-identical to the codes → English rendering provably unchanged.

**`src/utils/chipLabels.ts` (NEW)** — `windDirLabel(code, t)` / `weatherLabel(code, t)`,
each `t('log.…Labels.' + code, { defaultValue: code })`. The `defaultValue: code`
fallback is in the code and TEST-VERIFIED (below): an unmapped/legacy stored value
renders as its raw code, never a key path.

**`App.tsx`** — the import + exactly 4 render sites: wind chip Text → `windDirLabel(dir, t)`;
condition chip Text → `weatherLabel(opt, t)`; history wind detail →
`windDirLabel(log.windDir, t)` (the Commit-1 kts suffix not re-touched); history
weather → `.map((w: string) => weatherLabel(w, t)).join(', ')` (+ the non-array legacy
branch through the same helper). The `w: string` annotation exists to hold the tsc
baseline (an untyped callback param was a NEW TS7006 — caught and fixed in-session).

### New FR strings — PROOFREADER REVIEW (25; join the pile)

Wind (16 — only the O-for-Ouest points differ from EN):

| Code | FR label | Status |
|---|---|---|
| N / NNE / NE / ENE / E / ESE / SE / SSE / S | identical to code | PROOFREADER REVIEW (trivial) |
| SSW | SSO | PROOFREADER REVIEW |
| SW | SO | PROOFREADER REVIEW |
| WSW | OSO | PROOFREADER REVIEW |
| W | O | PROOFREADER REVIEW |
| WNW | ONO | PROOFREADER REVIEW |
| NW | NO | PROOFREADER REVIEW |
| NNW | NNO | PROOFREADER REVIEW |

Conditions (9):

| Code | FR label | Status |
|---|---|---|
| Sunny | Soleil | PROOFREADER REVIEW |
| Cloudy | Nuageux | PROOFREADER REVIEW |
| Rain | Pluie | PROOFREADER REVIEW |
| Fog | Brouillard | PROOFREADER REVIEW |
| Windy | Venteux | PROOFREADER REVIEW |
| Too Windy | Trop venteux | PROOFREADER REVIEW |
| Rough | Agité | PROOFREADER REVIEW |
| Snow | Neige | PROOFREADER REVIEW |
| No Fishing | Pas de pêche | PROOFREADER REVIEW |

### Gates (Phase 3 / Commit 2)

- **tsc:** 33 = baseline, **0 new** (one new TS7006 appeared mid-build and was fixed
  with the `w: string` annotation before the gate).
- **jest:** **19 suites / 68 tests green** = baseline.
- **JSON:** both files parse; 16 wind + 9 weather entries in BOTH languages.
- **Helper proven with a throwaway jest test against the REAL locale JSONs** (added,
  run 4/4 green, deleted — S95 temp-probe precedent, not committed): EN labels
  byte-identical to codes; FR O-for-Ouest across the 16-point set (W→O, SW→SO,
  NNW→NNO, WSW→OSO, NNE→NNE); FR conditions incl. the sentinel label
  ('No Fishing'→'Pas de pêche'); fallback — `windDirLabel('XYZ')`→'XYZ',
  `weatherLabel('Hurricane')`→'Hurricane', empty string passes through.
- **Sim, BOTH languages live-verified off the same stored data:** launch in EN → chips
  render Sunny/Cloudy/Rain/Fog + N NE E SE S SW (byte-identical EN); flip
  `user_language` to fr (AsyncStorage, app terminated) → same screen renders
  Soleil/Nuageux/Pluie/Brouillard + **N NE E SE S SO** (SW→SO on-screen). Sim left in
  FR for your walk. This is 5(b) demonstrated headlessly; taps aren't automatable here.
- → **JONNY DEVICE GATE (the tap half):**
  (a) in FR, tap a wind chip + 2 condition chips, Save → inspect the saved log
  (Firestore console or the history row after an EN flip) and confirm EN codes stored
  (e.g. windDir "E", weather ["Sunny","Fog"]), not French text;
  (c) scroll a history row with a 16-point auto-filled windDir (e.g. NNE) → renders
  NNE in EN / NNE-style code or mapped label in FR, never a raw key path;
  (d) 'No Fishing' exclusivity: tap «Pas de pêche» → others clear; tap another → it
  clears. (Logic runs on codes and is diff-proven untouched — this is belt-and-braces.)
- **Dormant-path note:** handleSkipDay (no button renders it) keeps writing the EN
  `'Did not go out. '` note — deliberate this commit; decide translate-at-write if/when
  the path is resurrected.

### Phase-3 Commit-2 block (Jonny runs, one line at a time)

Tree caveats unchanged (CHECKLIST_S97 edits + your untracked PDFs/DIAG doc not staged).

```
git add App.tsx
git add src/utils/chipLabels.ts
git add src/i18n/locales/en/common.json
git add src/i18n/locales/fr/common.json
git add docs/GATE_S98_FRENCH_FIX.md
git status
git commit -m "chip code-label split: translate wind/condition labels at render, EN codes stay stored"
git push origin main
```

Files changed: **5** (4 code/locale incl. the new chipLabels.ts + this gate doc).
Bare one-line subject, no trailer.

---

## S98 CLOSEOUT — CLAUDE.md update (Jonny runs, one line at a time)

CLAUDE.md updated for the S98 close: header bumped (Session 98, July 14 2026, tip
70b16d1); the four pushed commits recorded in What's built; PENDING VERIFICATION
recorded (chip gate 5a/5c device walk; FR verification-email template — French NOT
marked done); FR proofreader pile updated to ~113 (35 S97 + ~78 S98, handoff timing
open); Session Log row S98 added; non-French fix-list items (PDF-viewer inset,
Confirm-Trip-Start double header, DFO-docs-card dfoActivated gate) noted still open
for the screenshot gate; Current goals → SESSION 99 — TBD.

Tree caveats unchanged: docs/CHECKLIST_S97_FR_SWEEP.md (your walk edits — stage it
yourself if/when you want it recorded), assets/docs/*.pdf + docs/DIAG_S95_ITEM2.md
(yours/untracked) — NOT staged below.

```
git add CLAUDE.md
git add docs/GATE_S98_FRENCH_FIX.md
git status
git commit -m "S98 closeout: CLAUDE.md session log + pending verification"
git push origin main
```

Files changed: **2** (CLAUDE.md + this gate doc). Bare one-line subject, no trailer.
After the push: `git show -s` + `git log --oneline a282d4c^..HEAD` shows the five
S98 commits (four fix + this closeout).
