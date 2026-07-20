# GATE — Session 106 · Capture Day (dual-sim) + Group C live sends

July 19–20, 2026. Base commit at session open: `7fc4545` (S105 gate-doc tightening, committed+pushed at S106 open — see §0). NO-GIT rule in force: Jonny runs all state-changing git from §7, one line at a time. All sends real UAT (default endpoint), demo identity only.

---

## §0 — Session-open housekeeping (July 19, afternoon)

1. **Unexpected dirty tree resolved.** `docs/GATE_S105_DEMO_ACCOUNT.md` had an uncommitted Saturday-night tightening of the throwaway-deletion record (three-surfaces wording). Diff read, ruled benign+correct, committed standalone: **`7fc4545`** "Tighten S105 throwaway-deletion record in gate doc", pushed `203d616..7fc4545`. Tree then clean except the 4 untracked passengers (expected).
2. **Kane inbox:** empty at session open (Sun) and at capture close (Mon morning). Monday-evening deadline pending — folder recon queues if it passes.
3. **zsh-dropped-to-~ trap fired again** (expo run from `~`, npx offered expo@57 into cache — harmless, no project impact). Re-ran from `LobsterLog %`. Standing warning holds.

## §1 — Group 0: fresh-flag rebuilds + dual-sim setup

- Capture sim (EN): **iPhone 17 Pro**. App-deleted + rebuilt `npx expo run:ios` → device-global Language/Privacy flags cleared as planned; AsyncStorage wiped (expected; demo account re-seeded via sign-in + re-activation, re-proving the S105 reviewer chain a second time).
- FR sim: **iPhone 17**, device language set Français (Canada) **before** first app launch; installed off the same single Metro (8081).
- Both sims signed in as dfoelog demo; **one Activate tap per sim**, never deactivated. Activation re-confirmed per-device (S105 fact re-exercised).

## §2 — Send ledger (Group C: 6 live UAT sends, 6× WS0000, 0 bounces)

| CONF | Send | Sim/Lang | Sent (local) | XSD | File name | HTTP |
|---|---|---|---|---|---|---|
| 163581 | Logbook 234 MAR-90 (LL-20260719-001, Trip #1) | EN | 2026-07-20 08:27 | Passed | 1004-104460-20260720112752.XML | 200 |
| 163582 | Logbook 234 MAR-90 (same trip, FR account session) | FR | 2026-07-20 08:39 | Passed | 1004-104460-20260720113952.XML | 200 |
| 163583 | Form 222 Marine Mammal | EN | 2026-07-20 08:53 | Passed | 1004-104460-20260720115350.XML | 200 |
| 163584 | Formulaire 222 Mammifère marin | FR | 2026-07-20 09:03 | Passed | 1004-104460-20260720120310.XML | 200 |
| 163585 | Form 233 Inactivity | EN | 2026-07-20 09:08 | Passed | 1004-104460-20260720120823.XML | 200 |
| 163586 | Formulaire 233 Inactivité | FR | 2026-07-20 09:10 | Passed | 1004-104460-20260720121044.XML | 200 |

- Identity all sends: FIN 100400460 · VRN 104460 · Licence 104460 (6-digit MAR row, Rule-528-safe on 222/233). ELOG key from .env.
- Fresh-filename discipline held by construction (per-second timestamps); no WS1034.
- Both sims share the one demo uid → each register shows the union of all six sends; the unbroken CONF run 163581–586 is itself proof the account behaved as one identity across devices.
- Result-detail modal captured in BOTH languages (Transmission Result / Résultat de la transmission) — the FR frame doubles as register-strings French-compliance proof.

## §3 — Submitted values (canonical, identical EN/FR unless noted)

**Seed trip (Logbook 234):** date 2026-07-19 (see §5.3 amendment) · Sailed 05:00 · Started Hauling 07:00 · Stopped Hauling 11:00 · Landing 12:30 · LFA 34 · grid: same selection both sims (from picker) · Lobster 250 lbs · Mackerel/Frozen/40 lbs · 200 traps · coords 43.83 / −66.12 · port selected pre-save · bycatch/MM/SAR = No ×3 · personal use 0.

**Form 222:** Yes indicator · Date of report + interaction 2026-07-19 · 09:30 · Logbook Number Referred = app-AUTO-GENERATED code (EN sim: `ZQLAYX`; FR sim: its own code — the ONE legitimately differing field between the pair; see §5.4) · 43.83/−66.12 · Humpback Whale / Baleine à bosse · 1 animal · Entanglement/Empêtrement · Outcomes: Injury No · Death No · **Entanglement Yes · Released (if entangled) Yes** · Gear Damage No · Confidence / Specimen Condition / Body Length **left unset — send passed XSD, proving them optional in the 90 subform** · Observer "LobsterLog Demo" / dfoelog@lobsterlog.com · Remarks "Demo submission - test report".

**Form 233:** licence details pre-filled from profile (in frame) · period 2026-07-01 → 2026-07-15 · Reason: Weather / Météo.

## §4 — Capture inventory (terminal-proven: `ls` = 105 entries, July 20)

Folder: `~/Desktop/S106_capture` (NOT in repo — figures flow to Drive masters at integration).

- **F00 series (signup/first-launch states, both langs):** F00a_Language · F00b_Login · F00c_CreateAccount · F00d_CheckInbox — 8 files. Not numbered §22 figures; candidates if the §22 reorder adds a sign-in step.
- **§22 figures F02–F16, EN+FR, multi-part where screens scroll:** F02 (EN×2/FR×3) · F03 (1/1) · F04 (2/2) · F05 (2/2) · F06 (1/1 — the header-pill frame, see §5.1) · F07 (2/2) · F08 (1/1) · F09 (1/1) · F10 (1/1) · F11 (1/1) · F12 (2/2) · F13 (1/1) · F14 (5/5) · F15 (2/2) · F16 (1/1).
- **TRG frames:** T5_EN-1..6 and T5_FR-1..6 (presend → confirm → sending → submitted → confirmed card → result detail; exceeds the 3-state spec) · 222_T7_EN-01..10 / FR-01..10 · 233_T3_EN-01..07 / FR-01..07.
- F01 (store listing) intentionally absent — external capture, Group 0 of the original plan, still to do at listing time.
- `rejects/` subfolder holds discards; no canonical file lives there.
- EN confirm-dialog note: `T5_EN-2_confirm` was recaptured on the FR sim via in-app language toggle (FR → EN → shoot → Cancel → FR) after the original frame was lost pre-save. Cancel is non-consuming; frame is language-pure canonical EN. Side-proof: confirm dialog is fully i18n-wired and live-switches with the language preference.

## §5 — Findings & rulings (July 19–20)

1. **F06 doc-vs-app mismatch — no "DFO ELOG Setup" row exists in Settings.** §22 §4.1 verbatim instructs "Tap Settings (the gear icon). Tap DFO ELOG Setup." The app's actual entry point is the red header pill (EN "DFO ELOG" / FR « JBE MPO »), routing to setup pre-activation and the logs list after. RULED: app frozen (screenshots-after-visible-change ordering); §22 §4.1 steps + caption rewritten at integration to the pill, both languages in parity. F06 the figure = main screen with pill prominent (captured both langs). Same class as the S104 caption flag: doc catches up to app.
2. **Real first-run flow is pill → setup (F07) → Activate → logs list → Profile → Captain Profile.** Captain Profile is NOT reachable pre-activation on the dfo role, yet the setup screen's hint text says to fill the Captain Profile *before* activating — an app-internal contradiction for a first-time user. Also proven: **activation proceeds on a blank profile** (this run activated before the profile was filled). RULED: §22 §3/§4 reorder at integration to match reality (profile section after activation); hint-text reword = string change = **Aug/Sept pile**; TRG sweep runs on a filled profile so no submission risk. §4.3's "Complete the in-app purchase" also doesn't match the reviewer's role-skips-RevenueCat experience — one-line doc note at integration (e.g. "Demo/reviewer accounts activate without purchase").
3. **Seed-spec date amendment (supersedes §2.3 of GATE_S103 in part):** Confirm Trip Start auto-stamps creation datetime; the July-6 spec date could not be entered at that step. RULED: canonical seed trip is **2026-07-19**, wall-clock timestamps unchanged (05:00/07:00/11:00/12:30 on Jul 19), EN/FR byte-parity confirmed in F10 frames. No figure caption names a date; nothing else affected.
4. **222 "Logbook Number Referred" is app-auto-generated opaque code** (not the LL trip id / CONF). Left as generated on both sims (never override generated values on a compliance form). Open question whether the generator should reference the trip's LL number — **Aug/Sept pile**, flag-not-act.
5. **Demo-account guide row:** Settings → "Comment utiliser LobsterLog" shows upgrade-locked on the dfo role. §22 is package-only so the reviewer holds the guide regardless; unlocking the row for role 'dfo' → **Aug/Sept pile**.
6. **Signup-flow throwaways (for F00c/F00d frames):** billing@lobsterlog.com and support@lobsterlog.com (both forward to app gmail) created solely to capture Create-Account/Check-Inbox states; never verified, never profiled. Auth deleted by Jonny in console; **Firestore verified empty** (no docs — consistent with unverified signups); residual local AsyncStorage namespaces accepted as inert (support@ on EN sim, billing@ on FR sim). Verification emails to be deleted from the app inbox. Three-surfaces standard applied per S105 precedent.
7. **F09 frame quality note:** Confirm Trip Start renders the full profile block (triplet byte-correct, NEB/NIP Rule-931 French labels) — strong compliance frame; flagged for preferential use at integration.

## §6 — What S106 leaves for the path to submission

1. Figures → Drive masters (Claude.ai docx workflow allowed) → **§22 edit pass in the same cycle**: §4.1 pill rewrite + caption; §3/§4 reorder; §4.3 reviewer-purchase note; S104 « Configuration » caption tweak (carry-over); FR parity re-asserted; count-assert every swap.
2. FINAL exports §17 v1.2 + §22 (v1.2 after edits) → bundled §17 re-swap → doc-card walk re-run.
3. F01 store-listing capture (EN + FR locales) at listing time.
4. Clean canonical TRG sweep ~18 sends from the iOS sim on the demo identity (⚠ verify-first off-MAR bycatch/pcons 36-vs-2 on GLF/QC/NL T1) → fill three TRGs. Today's 6 CONFs are capture sends, recorded here; the sweep is its own pass.
5. 222 T5 live 3-node MM_INTER_INCDNT send (carry-over).
6. Letter of Attestation · Appendix B · RFQ Id (Kane reply / folder recon / phone 1-877-535-7307).
7. Aug/Sept adds from S106: setup hint-text reword (§5.2) · 222 logbook-ref generator question (§5.4) · dfo-role guide unlock (§5.5).

## §7 — Commit block (NO-GIT — Jonny runs, one line at a time, prompt must show `LobsterLog %`)

```
git add docs/GATE_S106_CAPTURE.md
git add CLAUDE.md
git commit -m "S106: capture day gate doc + closeout"
git show -s
git status
git push
```

Checks: 2 files changed at commit · bare one-line subject, no trailer · push range reads `7fc4545..<newhash>` · `git status` clean (4 passengers only) after push.
