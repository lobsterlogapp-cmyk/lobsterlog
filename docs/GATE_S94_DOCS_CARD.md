# GATE — S94 Offline DFO Documents card (PHASE 1 build)

**Date:** 2026-07-05 · Recon: docs/RECON_S94_DOCS_CARD.md (approved). Rule 2500 — DFO instructions
accessible offline. Decisions confirmed: expo-asset approach · 2 language-aware rows · New-Arch split
left untouched.

## VERDICT
**PHASE 1 built, gates green.** DFO Documents card added between Preferences and Account; two
language-aware rows open bundled PDFs in a full-screen in-app viewer via expo-asset `localUri` — no
network in the path. tsc 33/0-new; jest 18/64. **Blocking prerequisite before rebuild:** the two
`providers_instructions_{en,fr}.pdf` files are NOT yet in `assets/docs/` (you provide them) — Metro
will fail to bundle the `require()` until they're dropped in.

## What changed
| File | Change |
|---|---|
| `App.tsx` | `import Pdf from 'react-native-pdf'` + `import { Asset } from 'expo-asset'`; module-level `DFO_DOC_SOURCES` (require() of the 4 PDFs, per doc × per language); `useTranslation('common')` now also pulls `i18n`; `docViewerVisible`/`docViewerUri` state; `openDfoDoc(doc)` helper (resolves current-language asset → localUri, no network); the **DFO Documents card** (between Preferences `</View>` and the Account card) with two `tutorialButton`-style rows (`FileText` icon); a full-screen viewer **Modal** (`animationType="slide"`, SafeAreaView, Close button, `<Pdf source={{ uri, cache:true }}>`). |
| `metro.config.js` | `config.resolver.assetExts.push('pdf')` — bundle `.pdf` as a static asset. |
| `package.json` / `package-lock.json` | added `react-native-pdf@7.0.4`, `react-native-blob-util@0.24.10`, `expo-asset@12.0.13` (installed via `npx expo install`). |
| `src/i18n/locales/en/common.json` + `fr/common.json` | new `settings.*` keys (EN + FR): `dfoDocsCard`, `docProvidersInstructions(+Sub)`, `docDfoInstructions(+Sub)`, `docViewerClose`. FR uses "MPO" + straight apostrophes (file convention). |
| `assets/docs/` | NEW dir; `dfo_instructions_234_7_en.pdf` + `_fr.pdf` copied from `~/Desktop/DFO/ELOG_F234/`. **`providers_instructions_{en,fr}.pdf` still to be added by you.** |

**Untouched (per spec):** `TimerContext.tsx`, Weather/Stormglass, the entire DFO transmission path.

## Offline mechanism (Rule 2500)
`require('./assets/docs/x.pdf')` (with `pdf` in metro `assetExts`) embeds each PDF in the app's asset
bundle. `openDfoDoc` calls `Asset.fromModule(...).downloadAsync()` → `localUri` (a `file://` path) →
`<Pdf source={{ uri }}>`. In a **release/standalone build** the assets are embedded on-device and
resolve with **zero network**. Same code path on iOS (Paper) and Android (Fabric). No `fetch`/URL
anywhere in this path.

- **Dev-build caveat for the airplane-mode gate:** a *debug* dev-client serves assets from Metro, so
  airplane mode can't fetch them cold. For a true offline verification, build **release** variants
  (below) — or, on a debug build, open each doc once online, then enable airplane mode and reopen.
- **Optional (NOT done — your call):** `expo install` suggested adding the `expo-asset` config plugin
  (`["expo-asset", { assets: ["./assets/docs"] }]`) to embed the PDFs into the *native* bundle so
  they're offline even in a **debug** dev-client. That touches `app.config.js` + needs a `prebuild`
  (regenerates native dirs), so it was outside the approved plan. Say the word and I'll add it.

## Gates
- `tsc --noEmit`: **33 errors** (baseline), **0 new**, none in the new code (the `.pdf` requires
  resolve as `any` — no `.d.ts` needed; both lib imports typecheck).
- `jest`: **18 suites / 64 tests**, all passing (unchanged — App.tsx isn't imported by any test).

## Results (device gate)
- **Android physical gate PASSED — 2026-07-06, Pixel 8.** Airplane mode, cold launch: both rows
  (§17 Provider's Instructions + DFO Instructions 234.7) opened in **EN and FR** — all four PDFs
  rendered fully offline. Rule 2500 satisfied on a real device.
- **Offline transmission failed loudly** with a visible error (no silent swallow) — §13.3.3 behavior
  confirmed: the docs path is offline-safe while the send path still surfaces failures.
- **iOS:** simulator smoke test passed; PDFs verified **embedded in the Release bundle**. Physical-iOS
  airplane test **deferred** until a device is available (carried open).
- **Bonus:** live 234 send from a physical device (Trip #6) → **WS0000, CONF 163092**.

## Commit — one commit, repo-relative paths, bare subject (run exactly this)
Stages the four referenced PDFs explicitly (the two unreferenced "Prerequisites Statement" PDFs in
`assets/docs/` are intentionally NOT included), plus the code, i18n, deps, and iOS native churn
(`Podfile.lock` + companion `project.pbxproj`; no `android/` churn to stage).

```sh
git add App.tsx metro.config.js src/i18n/locales/en/common.json src/i18n/locales/fr/common.json assets/docs/providers_instructions_en.pdf assets/docs/providers_instructions_fr.pdf assets/docs/dfo_instructions_234_7_en.pdf assets/docs/dfo_instructions_234_7_fr.pdf package.json package-lock.json ios/Podfile.lock ios/LobsterLog.xcodeproj/project.pbxproj docs/RECON_S94_DOCS_CARD.md docs/GATE_S94_DOCS_CARD.md
```
```sh
git commit -m "Session 94: offline DFO Documents card in Settings — bundled PDFs, in-app viewer, bilingual"
```
```sh
git show -s
```
```sh
git push
```
```sh
git log origin/main..HEAD --oneline   # empty = origin has it
```
