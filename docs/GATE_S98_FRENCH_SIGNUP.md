# S98 RECON — French signup + first-landing inventory (READ-ONLY)

Session 98, July 14 2026. Recon only — no source file touched. Scope: LoginScreen states,
email-verification language wiring, Daily Log home screen. Sets the fix scope for the
francophone-signup work; no commit steps in this doc.

---

## ⚠️ PREMISE-CHECK VERDICT — READ FIRST (task 5)

**The WIND DIRECTION and CONDITIONS chip labels are NOT display-only. The visible chip
string IS the stored value, and one of them ("No Fishing") is also a logic sentinel.
A plain string swap is NOT possible — this needs the code↔label split (bait-names
pattern): store a canonical code, translate only at render.** Evidence:

- **Wind chips** — tapping writes the label verbatim: `App.tsx:828`
  `setFormData({ ...formData, windDir: dir })` where `dir` comes from the hardcoded
  array `['N','NE','E','SE','S','SW','W','NW']` at `App.tsx:823`. That value flows
  unchanged through `useLogForm.ts:78` (`windDir: String(data.windDir ?? '')`) into
  **Firestore** at `useLogForm.ts:123-124` (`users/{uid}/logs/{dateId}`, setDoc merge).
- **Wind auto-fill stores EN too** — the Pro weather-sync path writes
  `getWindDirection(weatherAvg.avgDirection)` (`useLogForm.ts:104`), and that helper
  (`src/utils/helpers.ts:25-30`) returns **16-point English compass strings**
  (`N, NNE, NE, ENE, …`). So stored history already contains values the 8-chip UI
  never offers (e.g. `NNE`) — any label mapping must cover all 16, not just the 8 chips.
- **Conditions chips** — tapping calls `toggleWeather(opt)` (`App.tsx:855`) which stores
  the label string into the `weather` array (`useLogForm.ts:51-63`), persisted verbatim
  at `useLogForm.ts:82` → same Firestore doc.
- **`'No Fishing'` is a MAGIC VALUE in logic, not just a label** —
  `useLogForm.ts:53-57`: selecting it clears all other conditions, and selecting any
  other condition removes it (`current.includes('No Fishing')`); `handleSkipDay`
  (`useLogForm.ts:141`) programmatically writes `weather: ['No Fishing']` and appends
  the EN string `'Did not go out. '` to notes (`useLogForm.ts:142`). Translating the
  visible label without a code layer breaks this exclusivity logic and the skip-day path.
- **History renders the stored strings raw** — `App.tsx:964` (`log.windDir`) and
  `App.tsx:976-978` (`log.weather.join(', ')`). Under a code↔label split these render
  sites need a code→label lookup too, or FR users see their own old EN values (and EN
  users would see FR values if we stored translated strings).
- **French wind abbreviation** — FR compass uses **O (Ouest)** where EN shows **W**
  (and the 16-point set has NO/SO forms). Confirms display labels must diverge from
  the stored code.

**Consequence for scope:** the chip fix is a data-model-preserving refactor (keep the
existing EN strings as the canonical stored codes — zero migration, back-compat with all
existing Firestore logs — and add a translate-at-render layer), not a string swap.
Everything else in this recon IS a plain string swap.

---

## 1. LoginScreen inventory

File confirmed at `src/screens/LoginScreen.tsx` (163 lines). **Zero i18n wiring — no
`useTranslation`/`t()`/`i18next` import anywhere in the file.** Every user-facing string
is hardcoded EN.

### Log In / Create Account states (shared card)

| Line | String | Status |
|---|---|---|
| 90 | `LobsterLog` (title) | brand — not translatable, excluded from count |
| 91 | `Digital Logbook` (subtitle) | hardcoded EN |
| 94 | `Create Account` (card title, registering) | hardcoded EN |
| 94 | `Welcome Back` (card title, login) | hardcoded EN |
| 96 | `EMAIL` (field label) | hardcoded EN |
| 103 | `name@example.com` (email placeholder) | hardcoded EN (FR convention: `nom@exemple.com`) |
| 110 | `PASSWORD` (field label) | hardcoded EN |
| 117 | `••••••••` (password placeholder) | symbols — not translatable, excluded |
| 129 | `Forgot Password?` (link) | hardcoded EN |
| 142 | `Sign Up` (button, registering) | hardcoded EN |
| 142 | `Log In` (button, login) | hardcoded EN |
| 152 | `Already have an account? Log In` (toggle) | hardcoded EN |
| 152 | `Need an account? Sign Up` (toggle) | hardcoded EN |

### Check Your Inbox state (verificationPending)

| Line | String | Status |
|---|---|---|
| 55 | `Check Your Inbox` (title) | hardcoded EN |
| 56-59 | `We sent a verification link to your email address.\n\nClick the link in that email, then come back here and log in.` (body) | hardcoded EN |
| 61 | `Back to Log In` (button) | hardcoded EN |
| 63-65 | `Wrong email address? Tap above and sign up again with the correct one.` (footnote) | hardcoded EN |

### Alert.alert calls in LoginScreen (handleForgotPassword)

| Line | Title / Message | Status |
|---|---|---|
| 34 | `Missing Email` / `Please enter your email address in the box above so we know where to send the link.` | hardcoded EN ×2 |
| 39 | `Email Sent` / `Check your inbox for a link to reset your password.` | hardcoded EN ×2 |
| 41 | `Error` / `error.message` | title hardcoded EN; message is raw Firebase EN (dynamic — needs its own decision) |

**LoginScreen count: 20 hardcoded EN strings** (13 shared-card + 4 verification-state +
3 Alert — counting title+message pairs individually; excluding the brand name, the dot
placeholder, and the dynamic `error.message`).

### Adjacent — the submit path's alerts live in useAuth.ts, not LoginScreen

`handleSubmit` is `handleLoginSubmit` from `src/Hooks/useAuth.ts` (wired at
`App.tsx:493`). A signing-up francophone ALSO sees these, all hardcoded EN:

| Line | String |
|---|---|
| useAuth.ts:63 | `Error` / `Please enter both email and password.` (×2) |
| useAuth.ts:81 | `Incorrect email or password. Please try again.` |
| useAuth.ts:83 | `An account with this email already exists. Try logging in instead.` |
| useAuth.ts:85 | `Password must be at least 6 characters.` |
| useAuth.ts:87 | `Please enter a valid email address.` |
| useAuth.ts:89 | `Authentication Error` (title; message fallback `err.message` = raw Firebase EN) |

**useAuth submit-path count: 7 hardcoded EN strings** → **signup-surface total: 27.**
Note: useAuth.ts already imports `i18next` (line 3) and uses `i18next.t()` for the
delete-account flow (lines 103-108, 128, 149-150, 161) — the wiring pattern for these
alerts already exists in the same file.

---

## 2. i18n key structure

- Namespaces (src/i18n/index.ts:14-15): `common` (default), `dfo`, `map` — six files,
  `src/i18n/locales/{en,fr}/{common,dfo,map}.json`.
- `en/common.json` top-level sections: `nav, settings, profile, log, bait, errors,
  common, pro, backup, account`. **No `login`/`auth` section exists** in any namespace
  (`account.*` is the S86 delete-account/reauth copy, not signup).
- **Where new keys land:** a new top-level `login` section in `common.json` (en+fr) —
  LoginScreen is free-app-side, pre-DFO, so `common` (the default NS) is the right home;
  follows the `account.*` precedent. Daily-Log home strings belong in the existing
  `log.*` section (currently holds free-app log keys).
- **Component call pattern** (used app-wide, e.g. CaptainProfileScreen):
  ```ts
  import { useTranslation } from 'react-i18next';
  const { t, i18n } = useTranslation();        // default NS 'common'
  t('login.welcomeBack')                        // read a string
  i18n.language                                 // active language: 'en' | 'fr'
  ```
  Outside components / in hooks with alerts, the codebase uses direct
  `import i18next from 'i18next'` + `i18next.t('…')` + `i18next.language`
  (useAuth.ts is the live example).
- Language persistence: detector + AsyncStorage key `user_language`
  (src/i18n/index.ts:6, 32-36); `changeLanguage()` exported from the same file.
  `supportedLngs: ['en','fr']`, fallback `en` — so `i18next.language` resolves to a
  bare `'en'` or `'fr'`.

---

## 3. Email-verification language wiring

Send site: `src/Hooks/useAuth.ts:68-74` (inside `handleLoginSubmit`):

```ts
if (isRegistering) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await userCredential.user.sendEmailVerification();   // ← line 70
  await signOut(auth);
  setPendingEmail(email);
  ...
```

Second email send site: `src/screens/LoginScreen.tsx:38`
`sendPasswordResetEmail(auth, email)` (forgot-password).

**Finding: `languageCode` / `useDeviceLanguage` appear NOWHERE in the codebase**
(grep across `src/`, `App.tsx`, `firebaseConfig.js` — zero hits). Both the verification
email and the password-reset email therefore go out in the Firebase project's default
template language (English), regardless of the app language.

**Where it would go (locate-only, nothing changed):**
- `useAuth.ts` — one line immediately before line 70's `sendEmailVerification()`:
  set the auth instance's language from i18n, e.g. `auth.languageCode = i18next.language`
  (`i18next` is already imported at useAuth.ts:3; `auth` at line 5).
- `LoginScreen.tsx` — same line before the `sendPasswordResetEmail(auth, email)` call
  at line 38 (would need the `i18next` import added, or receive language via props).
- **i18n value at that point:** `i18next.language` = `'en'` or `'fr'` (i18n initializes
  in App.tsx before screens render, and the AsyncStorage override at index.ts:32-36 has
  long since resolved by the time a user can submit the form; supportedLngs clamps it to
  the two bare codes — exactly what Firebase's `languageCode` expects).
- Alternative worth weighing at fix time: `auth.setLanguageCode(...)` /
  `useDeviceLanguage()` per @react-native-firebase's current API surface — verify the
  exact modular setter for the installed RNFirebase version before coding.

---

## 4. Daily Log home inventory (App.tsx, post-login `view === 'log'` — SCOPED)

**Zero of these are t()-wired** — the free-app home screen has no `useTranslation` usage
on any of the strings below (matches the S97 finding that the free/Pro side is
un-i18n'd; this recon scopes just the first-landing screen).

| Line | String | Status |
|---|---|---|
| 711-715 | date header — `toLocaleDateString('en-US', {weekday short, month short, day numeric})` | hardcoded `'en-US'` locale (see §6) |
| 717 | `{year} ▾` | numeric — no EN string |
| 741 | `DAYS OUT` (stat card 1 label) | hardcoded EN |
| 744 | `This season` (stat card 1 sub) | hardcoded EN |
| 749 | `THIS WEEK` (stat card 2 label) | hardcoded EN |
| 754 | `Sun - Sat` (stat card 2 sub) | hardcoded EN |
| 764 | `Daily Log` (form card title) | hardcoded EN |
| 766 | `Saving...` (save indicator) | hardcoded EN |
| 771 | `LBS CAUGHT` (field label) | hardcoded EN (units-pref note §7) |
| 781 | `PRICE / LB` (field label) | hardcoded EN |
| 796 | `WATER TEMP` (field label) | hardcoded EN |
| 806 | `WIND (KTS)` (field label) | hardcoded EN |
| 817 | `WIND DIRECTION` (label) | hardcoded EN |
| 823 | wind chips `N NE E SE S SW W NW` (8) | hardcoded EN **and stored values — see premise check** |
| 842 | `CONDITIONS` (label) | hardcoded EN |
| 848 | condition chips ×9 — `Sunny, Cloudy, Rain, Fog, Windy, Too Windy, Rough, Snow, No Fishing` (from `WEATHER_OPTIONS`, `src/config/constants.ts:16-26`) | hardcoded EN **and stored values — see premise check** |
| 869 | `NOTES` (label) | hardcoded EN |
| 875 | `Crew, gear issues...` (notes placeholder) | hardcoded EN |
| 881 | `Save Log` (button) | hardcoded EN |

Neutral placeholders not counted: `0` (777), `$` (783), `0.00` (789), `--` (802, 812).

**Home-screen count: 15 label/button strings + 8 wind chips + 9 condition chips =
32 hardcoded EN strings** (17 of them dual-purpose stored values per the premise check).

Adjacent, same first-landing flow (save-path alerts, `useLogForm.ts:126/129`):
`Log Saved` / `Weather updated automatically.` / `Saved.` / `Save Error` — hardcoded EN,
fired by the Save Log button above. Flag for the same fix batch.

Not inventoried per scope: the History card below the form (886-994 — has its own EN
strings + `'en-US'` dates), Settings, Pro, Paywall, Tutorial, everything else in App.tsx.

---

## 5. (Premise-check — see the verdict block at the top of this doc.)

---

## 6. Date format

The `Wed, Jul 8 / 2026` header is `currentDate.toLocaleDateString('en-US', { weekday:
'short', month: 'short', day: 'numeric' })` at **App.tsx:711-715**, with the year on a
separate line (717, `getFullYear()`, locale-free). **The locale is hardcoded `'en-US'`
— it will NOT auto-localize when the app language is French; it needs an explicit
locale switch** (the S93 precedent in FullDfoForm's `formatDateTimeDisplay` maps
`i18n.language` → `'fr-CA'`/`'en-CA'`). Same hardcoded-`'en-US'` pattern appears in the
history card at App.tsx:891, 916, and locale-default at 933 — out of scope this pass,
same fix class. Flag only; nothing changed.

---

## 7. Units-pref note (flag only — separate behavior bug, NOT a string)

- `LBS CAUGHT` label at App.tsx:771 is hardcoded imperial regardless of the Settings
  lbs/kg preference.
- History rows hardcode the suffixes: `… lbs` at App.tsx:952, `$…/lb` at 956, `°F` at
  961. Not touched, not inventoried further — belongs to the units-pref bug, not the
  French sweep.

---

## Totals

| Surface | Hardcoded EN strings |
|---|---|
| LoginScreen.tsx (3 states + its alerts) | 20 |
| useAuth.ts submit-path alerts (same signup surface) | 7 |
| Daily Log home (scoped) | 32 (17 are stored values → code↔label split) |
| **Total fix scope this recon** | **59** + 4 save-path alert strings flagged adjacent |

Structural findings that shape the fix plan: (1) chips need the code↔label split with
zero-migration EN-strings-as-codes (premise check); (2) email templates need
`auth.languageCode` set before BOTH send sites (§3); (3) date header needs an explicit
locale switch (§6); (4) new `login.*` section in common.json is the landing spot (§2).
