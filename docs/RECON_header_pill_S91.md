# RECON — DFO ELOG header pill (S91 Phase 4, revised)

**Read-only recon. No edits.** Confirms the header is App-only and safe to grow; lays out the exact edit surface for your go.

## Current header component + clipboard block — `App.tsx:496–565`

```
<View style={styles.header}>                         // :496  blue container (GlobalStyles.header)
  <View style={styles.headerContent}>                // :497  row: left | right
    <View style={styles.headerLeft}>…logo + boatName + captain…</View>
    <View style={styles.headerRight}>                // :512  icon row (row, gap 4)
      …Pro (Crown/X #FBBF24)…                         // :513–522
      <TouchableOpacity onPress={…3-state routing…}>  // :524–541  ← THE CLIPBOARD BUTTON
        {isInDfoArea ? <X 24 #F87171/> : <ClipboardList 24 #F87171/>}
      </TouchableOpacity>
      …History (TrendingUp/X)…                         // :543–552
      …Settings (Settings/X)…                          // :553–562
    </View>
  </View>                                              // :564  headerContent close
</View>                                                // :565  header close
```

The clipboard's `onPress` (`:525–530`) is the three-state routing to move VERBATIM onto the pill:
```jsx
onPress={() => {
  const isInDfoArea = view === 'dfo-list' || 'dfo-demo' || 'dfo-setup' || 'dfo-trip' || 'dfo-history';
  if (isInDfoArea) { setView('log'); return; }
  if (dfoActivated === null) return;                 // undetermined — hold, never flash setup
  setView(dfoActivated ? 'dfo-list' : 'dfo-setup');  // ← byte-untouched
}}
```

## Where this header renders — App-only, but on every view

- The header (with the icon nav row) is **inline in App.tsx and nowhere else** — not a shared component.
- `GlobalStyles.header` is imported by 7 files (FishingMap, ProDashboard, LoginScreen, BaitStats, Garminmapbox, HistoryGraph, App.tsx), but **only App.tsx renders the main header with this nav row**; the others use GlobalStyles for other styles. The DFO screens define their **own local** `header` (DfoLogsListScreen.tsx:791, DfoSetupScreen.tsx:275) — independent.
- **Conclusion:** the pill-row JSX lives in App.tsx only, and the pill's styles will be **new** GlobalStyles keys (`dfoPillRow`/`dfoPill`/`dfoPillLabel`). No existing shared style (`header`, `headerRight`, `navButton`) is modified → the other 6 GlobalStyles importers are unaffected.
- BUT the App header is **unconditional** (above `mainContentContainer`, `:567`), so it shows on **every** view: log, map, history, settings, pro, and all dfo-* screens. The new ~40pt row grows the header on all of them.

## Crowding assessment

- `GlobalStyles.header` has **no fixed height** (padding-only: `paddingHorizontal:14`, `paddingBottom:16`, `paddingTop` 60/status-bar). So a second child row grows the header cleanly — **no clipping**.
- `paddingHorizontal:14` already wraps both rows, so a right-aligned pill sits 14pt from the right edge — **same inset as the icon row, for free** (just `alignItems:'flex-end'` on the pill row).
- Two places to be aware the extra row lands:
  - **Map (Garminmapbox/FishingMap):** full-bleed map loses ~40pt of vertical space — minor, acceptable.
  - **DFO area:** the App header (now showing the pill in its **X state**, since you're "in DFO") sits **above each DFO screen's own header** (DfoLogsListScreen has its own at :791). So inside dfo-list you'd see: blue App header + red "DFO ELOG" pill (X glyph) → then the DFO screen's own header. That's per your spec (pill persists, glyph→X), just flagging the stack so it's expected, not a surprise at the device gate.

## Proposed edit surface (for your go)

1. **`App.tsx`** — remove the DFO `TouchableOpacity` from `headerRight` (`:524–541`); Pro/History/Settings stay. Add a new pill row between `headerContent` close (`:564`) and `header` close (`:565`):
   ```jsx
   <View style={styles.dfoPillRow}>
     <TouchableOpacity style={styles.dfoPill} onPress={/* the 3-state routing, verbatim */}>
       {isInDfoArea ? <X size={16} color="#FFFFFF" /> : <ClipboardList size={16} color="#FFFFFF" />}
       <Text style={styles.dfoPillLabel}>{t('nav.dfoElog')}</Text>
     </TouchableOpacity>
   </View>
   ```
   (`isInDfoArea` computed once for both the glyph and the routing; glyph goes white-on-red inside the pill vs today's red-on-transparent.)
2. **`src/styles/GlobalStyles.ts`** — three NEW keys:
   - `dfoPillRow: { alignItems: 'flex-end', marginTop: 10 }`
   - `dfoPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#F87171', paddingHorizontal: 14, minHeight: 44, borderRadius: 999, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 }` (fully rounded, subtle shadow, ≥44pt tap)
   - `dfoPillLabel: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 }`
3. **i18n** — new `common.nav.dfoElog`: EN `"DFO ELOG"` (`en/common.json`), FR `"ELOG MPO" _todo` (`fr/common.json`), flagged for the proofreader. App.tsx `t` is already the common namespace (`:134`).
4. **Routing** — the `onPress` block is moved verbatim; `dfoActivated`/`dfo-list`/`dfo-setup` logic unchanged. The `#F87171` red is reused as the pill background (the existing clipboard token).

## After your go
Edit → print edited blocks back → `npx tsc --noEmit` (must hold 33) → hold for your device gate (pill renders, EN/FR label, toggles X↔clipboard, routing intact).
