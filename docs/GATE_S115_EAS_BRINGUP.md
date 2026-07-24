# GATE S115 — EAS BRING-UP (first-ever EAS build; gitignored build inputs)

**Status: PLAN — AWAITING FOUNDER APPROVAL. No repo file edited yet. Claude runs NO git, NO `eas` commands, and never touches a secret value (NO-GIT rule + secrets rule).**
Date: 2026-07-23 (Session 115). Naming note: `docs/GATE_S115_SWEEP_PREP.md` also carries the S115 label (sweep prep); this doc uses the founder-specified name.

Failure being fixed: `eas build --platform all --profile production` fails on both platforms because gitignored native build inputs never reach EAS (committed `android/`+`ios/`, no-prebuild build).
- Android: `Could not get unknown property 'hermesEnabled'` at `android/app/build.gradle:185` — `android/gradle.properties` is gitignored (`.gitignore:82`).
- iOS: `Build input file cannot be found: GoogleService-Info.plist` — `ios/LobsterLog/GoogleService-Info.plist` is gitignored via the **unanchored** basename pattern at `.gitignore:84`.

---

## §1 Audit — every gitignored file the native builds require

Complete enumeration via `git status --ignored` over `android/`, `ios/`, and root configs. Machine-local artifacts that EAS regenerates itself (`android/.gradle`, `android/**/build`, `android/app/.cxx`, `android/local.properties`, `android/.kotlin`, `ios/Pods/` [EAS runs `pod install`], `ios/build`, `project.xcworkspace`, `**/.xcode.env.local`, `.expo/`) need no action and are excluded below. No `.easignore` exists, so EAS uploads the working tree minus exactly the `.gitignore` set.

| # | Path | Needed by | Secret? | Disposition |
|---|------|-----------|---------|-------------|
| 1 | `android/gradle.properties` | Gradle. `android/app/build.gradle:185` reads `hermesEnabled` as a **direct property** (hard crash when absent — unlike `findProperty(...)` used at lines 69/124/128/167-169). `newArchEnabled`, `edgeToEdgeEnabled`, `expo.edgeToEdgeEnabled`, `reactNativeArchitectures`, `expoRNMapboxMapsImpl` are read by the Expo/RN Gradle plugins from this file (absence = silent behavior change, incl. the S95 edge-to-edge fixes) | **ONE line: `MAPBOX_DOWNLOADS_TOKEN` (sk.)** — every other key is a non-secret flag | (A) commit **sanitized** (token line removed) |
| 2 | `android/app/google-services.json` | `apply plugin: 'com.google.gms.google-services'` (`android/app/build.gradle:192`) — Android build fails here right after the hermes fix | No (ships inside every APK; extractable) | (C) commit |
| 3 | `ios/LobsterLog/GoogleService-Info.plist` | Xcode Resources build phase (`project.pbxproj` refs `F9005C6E…`/`AEBE6AB4…`, path `LobsterLog/GoogleService-Info.plist`) — the exact iOS failure | No (ships inside every IPA) | (C) commit |
| 4 | `google-services.json` (root) | `app.config.js` `android.googleServicesFile` — **prebuild-only**; inert for this no-prebuild build. Byte-identical to #2 (`cmp` verified) | No | (C) commit with #2 (same unignore) |
| 5 | `GoogleService-Info.plist` (root) | `app.config.js` `ios.googleServicesFile` — prebuild-only. Byte-identical to #3 (`cmp` verified) | No | (C) commit with #3 |
| 6 | `.env` | **JS bundle step on EAS**: `EXPO_PUBLIC_*` vars are inlined by Expo CLI at export time, and `app.config.js:14/55` reads `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` at config evaluation. Missing on EAS = build **succeeds** but ships with undefined keys (maps, weather, Navionics, Garmin purchase) | Yes (treat all values as secret in handling, though `EXPO_PUBLIC_*` values embed in the shipped bundle regardless) | (B) EAS env vars — stays gitignored |
| 7 | `google-services-account.json` (`.gitignore:87`) | `eas.json` `submit.production.android.serviceAccountKeyPath` — **submit-time only**, read from local disk when Jonny runs `eas submit`. Not a build input | **YES — true secret** | No change: stays gitignored + local |
| 8 | Keystores: `*.keystore` ignored, `!debug.keystore` exception → `android/app/debug.keystore` IS tracked. No release keystore exists in the repo | `android/app/build.gradle:120-123`: the **release** buildType signs with `signingConfigs.debug` | debug keystore: no (public well-known password) | No repo change — see §4 credentials flag (IMPORTANT) |

`.env` variable names and consumers (names only; values never read):

| Var | Consumer | Needed in production build? |
|---|---|---|
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | `app.config.js:14,55` (iOS googleMapsApiKey + android config) | **Yes** |
| `EXPO_PUBLIC_STORMGLASS_API_KEY` | `src/utils/helpers.ts`, `src/utils/weatherService.ts` | **Yes** |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | `src/screens/Garminmapbox.tsx` (runtime map render) | **Yes** |
| `EXPO_PUBLIC_NAVIONICS_TOKEN_IOS` / `_ANDROID` | `src/utils/navionicsPurchase.ts` | **Yes** |
| `EXPO_PUBLIC_GARMIN_PURCHASE_PRIVATE_KEY` | `src/utils/navionicsPurchase.ts` (RSA signing of purchase) | **No — moved server-side (SECURITY_AUDIT_S115)** |
| `MAPBOX_DOWNLOADS_TOKEN` | `app.config.js:41` plugin prop (prebuild-only, inert here) + local `android/gradle.properties` | Via (B) as `RNMAPBOX_MAPS_DOWNLOAD_TOKEN`, optional |
| `EXPO_PUBLIC_DFO_TEST_ELOG_KEY` | `src/screens/DfoTestHarnessScreen.tsx` — `__DEV__`-gated, stripped from release | No (skip) |
| `EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN` | `firebaseConfig.js` — App Check skipped entirely in DEV; debug token is dev-only | No (skip) |
| `EXPO_PUBLIC_GARMIN_SSO_EMAIL`, `EXPO_PUBLIC_GARMIN_PURCHASE_PUBLIC_KEY`, `EXPO_PUBLIC_GARMIN_PRIVATE_KEY`, `REVENUECAT_APPLE_KEY`, `REVENUECAT_GOOGLE_KEY` | **Nowhere** — stale `.env` entries. RevenueCat keys actually live hardcoded in `src/config/constants.ts` (`REVENUECAT_KEYS`, publishable SDK keys) | No |

### Mapbox token consumption (exact names, no values)
- **Android** — `android/build.gradle:26-47`, the `@rnmapbox/maps-v2-maven` **@generated block (DO NOT MODIFY, sync-hashed)**: `def token = project.properties['MAPBOX_DOWNLOADS_TOKEN'] ?: System.getenv('RNMAPBOX_MAPS_DOWNLOAD_TOKEN')`, guarded by `if (token)` — Gradle property name **`MAPBOX_DOWNLOADS_TOKEN`**; env-var fallback **`RNMAPBOX_MAPS_DOWNLOAD_TOKEN`** already exists → **zero Gradle edits needed**. The block's own comment records that Mapbox removed the download-token requirement (auth now optional).
- **iOS** — **no token configuration exists anywhere**: `ios/Podfile` contains only the `$RNMapboxMaps.pre_install/post_install` generated hooks; no `$RNMapboxMapsDownloadToken`, no `.netrc` writer. `MapboxMaps 11.16.6` / `rnmapbox-maps 10.2.10` pods download without auth (same token-requirement removal). Expected: EAS `pod install` succeeds with nothing provided. Contingency only: if it ever 401s, the fix is a `.netrc` written from an EAS secret in a build lifecycle hook — not part of this plan.

### app.config.js diff — explained
`version` 1.8.6 → **1.9.1**, iOS `buildNumber` "76" → **"88"**, Android `versionCode` 76 → **88**. This is a **manual human edit**: EAS CLI cannot write to a dynamic `.js` config (it errors instead of auto-editing), so no tool made it. Under `appVersionSource: "remote"` + `autoIncrement: true`, the `buildNumber`/`versionCode` fields are **inert for EAS builds** (the remote counter governs); the `version: "1.9.1"` string **is** used. Founder to confirm provenance before it stages (Decision D1).

### eas.json production profile (current state)
`appVersionSource: "remote"`. The production profile **has an env block, and it is broken**: `"env": { "MAPBOX_DOWNLOADS_TOKEN": "$MAPBOX_DOWNLOADS_TOKEN" }` — eas.json does **not** interpolate `$VAR`, so the literal string `"$MAPBOX_DOWNLOADS_TOKEN"` is exported into the build env; additionally a plain env var named `MAPBOX_DOWNLOADS_TOKEN` never becomes a Gradle *project property*, so even a real value under that name would not reach the maven block. Both reasons → remove it.

---

## §2 Plan (apply only after founder approval)

### (A) Safe-to-commit — non-secret build inputs
1. **`android/gradle.properties` — commit sanitized.** Remove ONLY the `MAPBOX_DOWNLOADS_TOKEN=` line; add a comment: token lives in `~/.gradle/gradle.properties` locally / `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` EAS secret on CI. All 14 remaining flag lines committed byte-identical (preserves the S95-verified `edgeToEdgeEnabled=true` set exactly).
   *Why not `app.config.js`/`expo-build-properties`: config plugins only act during prebuild — this is a committed-`android/` no-prebuild build, so flags placed there would never reach Gradle.*
   **Founder (local, by hand — Claude never touches the value): move the token line into `~/.gradle/gradle.properties`.** Gradle merges user properties into `project.properties`, so the existing lookup keeps working locally.
2. **`.gitignore`** — delete three lines from the secrets block: `android/gradle.properties` (l.82), `google-services.json` (l.83), `GoogleService-Info.plist` (l.84). `.env` (l.81) and `google-services-account.json` (l.87) stay ignored.
3. **`eas.json`** — in `build.production`: delete the broken `env` block; add `"environment": "production"` so the production-environment EAS variables from (B) inject into production builds.

### (B) Provide via EAS env vars — founder runs, Claude creates nothing
All in the **production** environment; CLI prompts for each value (never pass values on the command line):
```
eas env:create --environment production --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY        --visibility sensitive --scope project
eas env:create --environment production --name EXPO_PUBLIC_STORMGLASS_API_KEY         --visibility sensitive --scope project
eas env:create --environment production --name EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN        --visibility sensitive --scope project
eas env:create --environment production --name EXPO_PUBLIC_NAVIONICS_TOKEN_IOS        --visibility sensitive --scope project
eas env:create --environment production --name EXPO_PUBLIC_NAVIONICS_TOKEN_ANDROID    --visibility sensitive --scope project
eas env:create --environment production --name RNMAPBOX_MAPS_DOWNLOAD_TOKEN           --visibility secret    --scope project   # optional belt-and-braces; Mapbox auth no longer required
```
Notes: `EXPO_PUBLIC_*` values embed in the shipped JS bundle whatever their EAS visibility — `sensitive` keeps them out of logs/UI. **No `build.gradle` edit is needed to read `RNMAPBOX_MAPS_DOWNLOAD_TOKEN`** — the generated maven block already does, and editing a sync-hashed `@generated` block would break the next prebuild sync. Skip the stale/dev-only vars (table in §1). `EXPO_PUBLIC_GARMIN_PURCHASE_PRIVATE_KEY` is deliberately NOT created — the key is being removed from the client and moved server-side (see docs/SECURITY_AUDIT_S115.md §4).

### (C) Firebase configs — COMMIT (all four files), not EAS secret-files
Commit `android/app/google-services.json`, `ios/LobsterLog/GoogleService-Info.plist`, and the two byte-identical root copies. Why: these are app *configuration*, not credentials — every value ships inside the released APK/IPA and is trivially extractable, which is why Google documents them as safe to embed; actual security is enforced server-side (UID-scoped Firestore rules, S84/S86) plus App Check (Play Integrity / DeviceCheck). Committing keeps the no-prebuild build hermetic. The alternative (EAS file-type env vars) delivers the file at an env-var path and would need a build lifecycle hook to copy it into `ios/LobsterLog/` — extra machinery with no security gain here. Caveat: valid while the repo is private; if it ever goes public, add API-key restrictions in Google Cloud console.

---

## §3 EAS credentials flag — IMPORTANT, founder decision at first build
`android/app/build.gradle:123` signs **release** builds with `signingConfigs.debug` — so if past Play uploads came from local release builds, the **upload key registered with Google Play is the tracked `android/app/debug.keystore`**. At the first `eas build` credentials prompt: **verify the upload-key certificate in Play Console (Setup → App signing) first**; if it matches debug.keystore, choose *upload existing keystore* (that file) — do **not** let EAS generate a new keystore, or Play will reject the upload-key mismatch. iOS: letting EAS manage certs/profiles via Apple sign-in is fine. `google-services-account.json` stays local for `eas submit`.

---

## §4 Commit block — run ONLY after approval AND after the §2(A) edits are applied and verified

Pre-stage safety gate (must pass before `git add`):
```
grep -c "MAPBOX_DOWNLOADS_TOKEN" android/gradle.properties   # MUST print 0
```

Files to stage (repo-relative, exact paths):
```
cd ~/Desktop/LobsterLog
git add .gitignore android/gradle.properties android/app/google-services.json ios/LobsterLog/GoogleService-Info.plist google-services.json GoogleService-Info.plist eas.json docs/GATE_S115_EAS_BRINGUP.md app.config.js
git commit -m "Restore EAS build config files and bump version to 1.9.1"
git push
```
(`app.config.js` included per founder ruling — Decision D1 resolved: the 1.9.1/88 bump stages with this commit. Bare one-line subject, no body, no trailer, per commit style.)

## §5 Decisions needed from founder
- **D1 — app.config.js 1.9.1/88 bump**: confirm it's yours; then stage here / separate commit / revert. (Fields 76→88 are inert under remote versioning; `version` string is used.)
- **D2 — approve (A)+(C) file set** incl. unignoring the Firebase basenames.
- **D3 — eas.json**: approve env-block removal + `"environment": "production"`.
- **D4 — keystore**: check Play Console upload-key certificate before the first `eas build` credentials prompt (§3).
