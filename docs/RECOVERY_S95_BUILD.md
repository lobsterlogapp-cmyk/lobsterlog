# RECOVERY — Session 95 release build (half-cleaned CMake/codegen state)

Commands for **Jonny to run**. Claude did NOT run `prebuild` or any state-changing git. Diagnosis +
recovery only.

## TL;DR
Your build fails because your flow runs **`gradlew clean`**, and `clean` is broken on this project
(New-Architecture codegen bug). **Do NOT `prebuild --clean`** — it would overwrite your committed
`android/` + `ios/`. Recovery: delete the stale (gitignored) native build dirs by hand and rebuild
**without** `gradlew clean`.

## The real error (scrolled back past the summary)
A plain `:app:assembleRelease` (no clean) **succeeds** here (verified twice, 22s / 2m36s). The failure
only appears in a **clean-inclusive** flow. The actual failing task:
```
> Task :app:externalNativeBuildCleanRelease FAILED
C/C++: -- GLOB mismatch!
CMake Error at .../android/app/build/generated/autolinking/src/main/jni/Android-autolinking.cmake:9 (add_subdirectory):
  add_subdirectory given source
  ".../node_modules/@react-native-async-storage/async-storage/android/build/generated/source/codegen/jni/"
  which is not an existing directory.
```
(same for `@react-native-community/datetimepicker`, `@rnmapbox/maps`, `react-native-blob-util`, …)

**Cause:** New Architecture is on (`newArchEnabled=true`). The autolinking CMake references each module's
generated codegen JNI dir. `gradlew clean` deletes those generated dirs, then the
`externalNativeBuildClean{Release}` task re-runs CMake configure, which can no longer find them → GLOB
mismatch → the clean task fails and aborts the build (your ~28s failure is this, during the clean phase).
So "fails even after `gradlew clean`" is really "fails *because of* `gradlew clean`." Not caused by the
S95 JS changes.

## Recovery — SAFE (no prebuild, no gradlew clean)
Run from the repo root (`/Users/jonny/Desktop/LobsterLog`). Every path below is a **gitignored build
artifact** (`build/`, `.cxx/`, `.gradle` are all in `.gitignore`; `git ls-files` on them is empty), so
deleting them cannot touch tracked source:
```
# 1. Remove the stale native build artifacts (untracked — safe):
rm -rf android/app/.cxx android/app/build android/build

# 2. Rebuild WITHOUT `gradlew clean`:
cd android && ./gradlew :app:assembleRelease --stacktrace ; cd ..
```
If it STILL fails at a codegen/CMake task (deeper stale state), also clear the modules' generated codegen
(still gitignored build output) and retry step 2:
```
find node_modules -type d -path '*/android/build' -prune -exec rm -rf {} + 2>/dev/null
```
Going forward: **don't use `gradlew clean`** on this project. If you need a from-scratch build, use the
`rm -rf` above instead. (Or, to keep `clean` but skip the broken tasks:
`./gradlew clean :app:assembleRelease -x externalNativeBuildCleanDebug -x externalNativeBuildCleanDebugOptimized -x externalNativeBuildCleanRelease`.)

## DO NOT `expo prebuild --clean` here — what it would overwrite
This is NOT a clean-managed project: `android/` (36 files) and `ios/` (19 files) are **committed and
hand-customized**. `prebuild --clean` deletes and regenerates both dirs from `app.config.js`, overwriting
(non-exhaustive):
- **android/**: `app/build.gradle`, `app/src/main/AndroidManifest.xml` (+ `debug`/`debugOptimized`
  variants — incl. your `windowSoftInputMode`), `app/src/main/java/com/lobsterlog/MainActivity.kt` +
  `MainApplication.kt`, `build.gradle`, `settings.gradle`, `proguard-rules.pro`, `res/values/*.xml`,
  launcher/splash assets, gradle-wrapper.
- **ios/**: `Podfile`, `Podfile.lock`, `Podfile.properties.json`, `AppDelegate.swift`, `Info.plist`,
  `LobsterLog.xcodeproj/project.pbxproj`, `LobsterLog.entitlements`, `PrivacyInfo.xcprivacy`,
  `LobsterLog-Bridging-Header.h`, `Expo.plist`, xcworkspace/scheme.
- **The gitignored `android/gradle.properties`** — regenerated from Expo defaults. **Landmine:** your
  `edgeToEdgeEnabled=true` + `newArchEnabled=true` live ONLY there; `app.config.js`'s `expo-build-properties`
  sets only **iOS** `newArchEnabled: false` and says nothing about Android edge-to-edge/newArch. A regenerated
  gradle.properties could silently change those — and edge-to-edge is the entire basis of Items 3+4.

So `prebuild --clean` is the wrong tool for a stale-codegen state; it trades a 2-minute artifact clean for a
full native-dir reconciliation. Only use it if you deliberately intend to regenerate native config.

## Verify nothing tracked got mangled
**After the SAFE recovery** (only deletes gitignored dirs — tracked files should be untouched):
```
git status --short                  # expect ONLY your pending S95 src/ + docs/ changes
git diff --stat -- android ios      # expect EMPTY (no tracked native file changed)
git status --short -- android ios   # expect EMPTY (regenerated build dirs are gitignored)
```
If any `android/*` or `ios/*` tracked file shows as modified → restore it: `git checkout -- <file>`.

**If you already ran `prebuild --clean`** (to undo the damage):
```
git status --short -- android ios          # see the overwritten tracked native files
git diff -- android/app/src/main/AndroidManifest.xml android/app/build.gradle ios/Podfile   # inspect
git checkout -- android ios                # restore ALL committed native files
grep -E "edgeToEdgeEnabled|newArchEnabled" android/gradle.properties   # gradle.properties is GITIGNORED,
#   so `git checkout` will NOT restore it — if prebuild rewrote it, re-set by hand:
#   edgeToEdgeEnabled=true  and  newArchEnabled=true
```

## Report metadata
- Path: `docs/RECOVERY_S95_BUILD.md` — commands for Jonny; Claude ran no prebuild and no state-changing git.
- Diagnosis basis: `docs/DIAG_S95_BUILD.md` (the three earlier `--stacktrace` runs) + a 4th `assembleRelease`
  (BUILD SUCCESSFUL, 22s) confirming a no-clean build is healthy in the current state.
- The S95 FAIL-1/FAIL-2 code fixes remain applied and unstaged; this build issue is independent of them.
