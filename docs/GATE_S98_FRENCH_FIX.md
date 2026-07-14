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

## PHASE 2 — DAILY LOG HOME LABELS + DATE — NOT STARTED

Blocked on "Phase 1 pushed" confirmation per instructions.
