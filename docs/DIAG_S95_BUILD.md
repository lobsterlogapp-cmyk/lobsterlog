# DIAG — Session 95 release build (`:app:packageRelease` / IncrementalSplitter)

Investigation of the reported `:app:packageRelease (IncrementalSplitterRunnable)` failure. Diagnosis
only — no fixes, no git. Three CLI builds run with `--stacktrace` (sandbox disabled), logs in the
session scratchpad.

## Result: the packageRelease failure is NOT CLI-reproducible in this state
| Run | Command | Outcome |
|---|---|---|
| 1 | `:app:packageRelease --stacktrace` | **BUILD SUCCESSFUL** (43s). `:app:packageRelease` **UP-TO-DATE** — packaging didn't even re-execute; the existing APK's inputs were unchanged. |
| 2 | `clean :app:packageRelease --stacktrace` | **BUILD FAILED in 3s** — but at **`:app:externalNativeBuildCleanRelease`**, a CMake/ninja *clean* step, NOT packageRelease. |
| 3 | `:app:assembleRelease --stacktrace` | **BUILD SUCCESSFUL** (2m36s). `:app:packageRelease` still **UP-TO-DATE**. |

So with the current inputs, packaging is sound — `packageRelease` is consistently valid/up-to-date and
never reached an `IncrementalSplitter` error. Disk is not a factor (246 GB free). The reported failure
was most likely **transient** (an interrupted/half-built state, file lock, or memory pressure —
`org.gradle.jvmargs=-Xmx2048m`, which is modest) OR specific to the user's tool (Android Studio / EAS /
`expo run:android`) rather than the CLI.

## The one REAL, reproducible build fault: `gradlew clean` fails (New-Architecture codegen)
`:app:externalNativeBuildCleanRelease` fails during `clean`:
```
CMake Error at .../android/app/build/generated/autolinking/src/main/jni/Android-autolinking.cmake:9 (add_subdirectory):
  add_subdirectory given source
  ".../node_modules/@react-native-async-storage/async-storage/android/build/generated/source/codegen/jni/"
  which is not an existing directory.
```
(same for `@react-native-community/datetimepicker`, `@rnmapbox/maps`, `react-native-blob-util`, …)

**Cause:** the project is New-Architecture (`newArchEnabled=true`). The autolinking CMake references each
module's generated codegen JNI dir; when `clean` removes those generated dirs, the `externalNativeBuildClean`
task's CMake re-configure can no longer find them → GLOB mismatch → the clean task fails. This is a known
RN New-Arch + `clean` ordering issue. It fails for **Release** while Debug/DebugOptimized clean OK
(their `.cxx` state differed).

**Likely link to the user's report:** because `gradlew clean` itself fails partway, the tree is left in a
**partially-cleaned / inconsistent** state (note: in run 2 the failed clean did NOT wipe the app's
packaged output — that's why packageRelease stayed up-to-date afterwards). Building on top of that
inconsistent state is a plausible source of a downstream `packageRelease` packaging error. So "fails even
after `gradlew clean`" may actually be *because* `gradlew clean` didn't complete.

## Recommended next steps (NOT applied — diagnosis only)
- To get a truly clean state, don't rely on `gradlew clean` alone (it fails). Instead regenerate native:
  `npx expo prebuild --clean` (or delete `android/app/.cxx` + `android/app/build` + the modules'
  `android/build/generated` and rebuild). Then a fresh `assembleRelease`.
- If the packageRelease/IncrementalSplitter error recurs on a genuinely clean tree, capture that specific
  `--stacktrace` (it did not occur in any of the three runs here) — only then is there a packaging bug to
  fix; right now the evidence says packaging is fine and the clean step is the real fault.
- None of this is caused by the S95 JS changes (JS-only; no native deps/config added).

## Report metadata
- Path: `docs/DIAG_S95_BUILD.md` — diagnosis only, no fixes, no git. Build state is now post-(failed-)clean
  (a full `assembleRelease` succeeded afterward, so a valid release APK exists).
