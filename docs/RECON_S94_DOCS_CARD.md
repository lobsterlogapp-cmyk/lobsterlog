# RECON — S94 Offline DFO Documents card (Settings)

**Date:** 2026-07-05 · Goal: a "DFO Documents" card in Settings, between Preferences and Account,
listing bundled PDFs that open in an in-app viewer **fully offline** (Rule 2500). Bilingual UI.
Recon only — **no code changed, no libs installed.** Awaiting go-ahead before PHASE 1.

---

## 1. Settings screen + card structure/styles
- **Settings UI renders in `App.tsx`** (not a separate screen). The Preferences card is
  `App.tsx:1084–1140` (`<View style={styles.card}>` → `<Text style={styles.cardHeader}>{t('settings.preferencesCard')}</Text>` → language/units toggles → Save button). The Account card
  opens at `App.tsx:1142` (`t('settings.accountCard')`). **Insertion point for the new card:
  between line 1140 (`</View>` closing Preferences) and 1142 (Account `<View style={styles.card}>`).**
- **Styles are in `src/styles/GlobalStyles.ts`** (`import { styles } from './src/styles/GlobalStyles'`),
  reusable as-is — NO new card/row styles needed:
  - `styles.card` (white, radius 16, border, marginBottom 16) — the card wrapper.
  - `styles.cardHeader` (16pt bold, bottom border) — the card title.
  - `styles.tutorialButton` (row: flexDirection row, #F1F5F9, padding 16, radius 12) +
    `styles.tutorialIconBox` + `styles.tutorialTitle` + `styles.tutorialSub` — an existing
    icon+title+subtitle tappable-row pattern (the "How to Use LobsterLog" row, `App.tsx:1147`) that
    is a perfect template for each document row.
- **Icons:** `lucide-react-native`; `FileText` is ALREADY imported in `App.tsx:57` — use it for rows.
- **i18n:** the `settings` namespace lives in `src/i18n/locales/{en,fr}/common.json`
  (`preferencesCard`, `accountCard`, `savePreferences`, `tutorialTitle`…). New keys go there
  (EN + FR). The Settings screen already uses `t('settings.*')` from `useTranslation('common')`.

## 2. Expo build model + react-native-pdf / react-native-blob-util requirements
- **Confirmed dev-client native builds:** Expo SDK **^54.0.31**, React Native **0.81.5**,
  `expo-dev-client ~6.0.20` installed; `npm run ios` = **`expo run:ios`**, `npm run android` =
  `expo run:android`. **`ios/` and `android/` native dirs are committed** (NOT gitignored) — this is
  a Continuous-Native-Generation project with the native projects checked in.
- **⚠️ New Architecture is SPLIT (pre-existing, unrelated to this task — flagging, not fixing):**
  `ios/Podfile.properties.json` + `app.config.js` → `newArchEnabled: false` (iOS = Paper);
  `android/gradle.properties` → `newArchEnabled=true` (Android = Fabric). **Consequence for us:** the
  PDF lib must work on iOS-Paper AND Android-Fabric. `react-native-pdf` 6.7.x + `react-native-blob-util`
  0.22.x support both arches — so pick current versions (see below), don't pin an old one.
- **Neither lib is installed** (nor `expo-asset` / `expo-file-system` — absent even transitively).
  `react-native-pdf` **requires `react-native-blob-util` as a peer dependency** (used internally),
  so both install regardless of how we source the file. Both **autolink** (no config plugin needed);
  no new Android runtime permissions are required for reading *bundled* assets.

### Exact install + rebuild steps I'll hand you (PHASE 2)
Install (adds native modules → a native rebuild is mandatory, a JS reload is NOT enough):
```sh
npx expo install react-native-pdf react-native-blob-util expo-asset
```
(`expo install` pins `expo-asset` to the SDK-54 version; for the two RN libs it installs current npm
latest — expected, they aren't Expo-authored.)

Metro must treat `.pdf` as a bundled asset (it is NOT a default assetExt) — edit `metro.config.js`:
```js
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('pdf');
module.exports = config;
```

Rebuild the dev client on each platform (autolink + pods + gradle):
```sh
npx expo run:ios
npx expo run:android
```
**Heads-up:** `run:ios` runs `pod install`, which will modify **`ios/Podfile.lock`** (and add Pods for
the two libs) — that change is tracked and must be committed. Android autolink is build-time (no
source churn beyond generated files). No `app.config.js` plugin edit needed.

## 3. Where bundled PDFs live + offline load on BOTH platforms
- **Location:** new dir **`assets/docs/`** (matches the existing `assets/` convention — `assets/icon.png`,
  `assets/lobster-icon.png`, loaded via `require('./assets/…')`).
- **Recommended approach (Expo-idiomatic, prebuild-safe, uniform across platforms): `expo-asset`
  `localUri` → `react-native-pdf`.** This sidesteps the iOS-vs-Android native bundle-path divergence:
  ```js
  import { Asset } from 'expo-asset';
  const mod = require('../../assets/docs/dfo_instructions_234_7_en.pdf'); // metro embeds it (assetExts)
  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();          // resolves from the EMBEDDED bundle in a release build — no network
  <Pdf source={{ uri: asset.localUri }} /* file:// */ trustAllCerts={false} />
  ```
  - **iOS (Paper):** the asset is embedded in the app bundle; `localUri` is a `file://` path into the
    app container; PDFKit (react-native-pdf) reads it directly.
  - **Android (Fabric):** expo-asset extracts the embedded asset to the app's cache dir; `localUri` is
    a `file://` in cache; react-native-pdf reads it. Same code, no `bundle-assets://` special-casing.
  - **Why not the raw react-native-pdf bundle paths?** react-native-pdf's native bundling differs by
    platform (Android wants `android/app/src/main/assets/` + `uri:'bundle-assets://x.pdf'`; iOS wants the
    file added to the Xcode "Copy Bundle Resources" phase) and those manual native edits are wiped by
    `expo prebuild --clean`. The metro-assetExts + expo-asset route keeps the PDFs in the JS/asset
    bundle, so a prebuild can't lose them and both platforms use one `{ uri }` code path.
- **Offline guarantee (Rule 2500):** in a production/release (or embedded-bundle dev-client) build the
  four PDFs ship inside the app; `downloadAsync()` resolves them from the embedded bundle with **zero
  network**. NO `fetch`/URL anywhere in this path. (Dev caveat for the airplane-mode gate: with Metro
  serving JS live, load the app once online, then enable airplane mode before opening a doc — or test a
  release build — so the assets are already resident. I'll spell this out in the PHASE 2 device gate.)

## 4. The four files + cp commands
Proposed row model (matches your primary description): **2 language-aware rows**, each opens the
matching-language PDF for the CURRENT app language (`i18n.language`):
| Row | i18n label (§) | EN asset | FR asset |
|---|---|---|---|
| Provider's Instructions | §17 | `providers_instructions_en.pdf` | `providers_instructions_fr.pdf` |
| DFO Instructions 234.7 | — | `dfo_instructions_234_7_en.pdf` | `dfo_instructions_234_7_fr.pdf` |
(I am NOT proposing the 4-row "show every PDF" layout, so no stop is needed on that; say the word if
you'd rather have four always-visible rows and I'll switch.)

**Files you provide** → drop into `assets/docs/` with these exact names:
- `providers_instructions_en.pdf`
- `providers_instructions_fr.pdf`

**The two DFO 234.7 PDFs** — confirmed filenames in `~/Desktop/DFO/ELOG_F234/` (they contain spaces;
copy to space-free asset names so `require()` is clean). Run from the repo root:
```sh
mkdir -p assets/docs
cp "$HOME/Desktop/DFO/ELOG_F234/DFO instructions_NAT_234.7_ENG.pdf" assets/docs/dfo_instructions_234_7_en.pdf
cp "$HOME/Desktop/DFO/ELOG_F234/DFO instructions_NAT_234.7_FRE.pdf" assets/docs/dfo_instructions_234_7_fr.pdf
```
(The `FS-NAT-234-12-EN/FR.pdf` fact sheets and `NAT - Structure XML…` PDF are also in that folder but
are NOT part of this card per your spec — left alone.)

---

## PHASE 1 plan (on your go) — no surprises
1. `mkdir -p assets/docs`; add the four PDFs (2 from you + 2 via the cp above).
2. `metro.config.js`: add `pdf` to `resolver.assetExts`.
3. New **DFO Documents** card in `App.tsx` between Preferences (ends 1140) and Account (1142):
   `styles.card` + `styles.cardHeader` (`t('settings.dfoDocsCard')`) + two `tutorialButton`-style
   rows (`FileText` icon, title from i18n, tap → open viewer with the current-language asset).
4. Full-screen **PDF viewer Modal** mirroring the existing `<Modal animationType="slide" visible={…}>`
   pattern (`App.tsx:1215`) — a `<Pdf>` fills the modal, a Close button (`t('settings.docViewerClose')`)
   dismisses. No network calls in the path.
5. i18n: new EN+FR keys in `common.json` `settings.*` — `dfoDocsCard`, `docProvidersInstructions`,
   `docDfoInstructions`, `docViewerClose` (no hardcoded strings).
6. **Untouched:** `TimerContext.tsx`, Weather/Stormglass, the entire DFO transmission path.

## PHASE 2 gates (on completion)
tsc (33 baseline, 0 new) · jest 18/64 green · then a device gate checklist (airplane-mode open of each
doc, EN + FR, verifying both languages' labels + the correct-language PDF opens) + the literal rebuild
(`expo install` / metro edit / `expo run:ios` + `run:android`) and git commands (repo-relative paths,
including the `ios/Podfile.lock` churn), then STOP.

## Open decisions for you
- **2 language-aware rows** (recommended, above) vs 4 always-visible rows — I went with 2; confirm or flip.
- Asset-load approach: **expo-asset `localUri`** (recommended) vs raw react-native-pdf bundle paths — I
  recommend expo-asset for prebuild-safety + one cross-platform code path. OK to add `expo-asset`?
