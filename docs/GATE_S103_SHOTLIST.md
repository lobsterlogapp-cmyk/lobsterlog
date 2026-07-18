# GATE — Session 103 · Hash Backfill + Master Shot List

Recon + docs only. ZERO code edits. NO-GIT (Jonny runs all state-changing git). NO network / no DFO POST this session.

---

## §1 — S102 Hash Backfill (dated note)

**July 18, 2026 (S103): S102 commit hashes verified post-push — fb7d3ee · 805bb08 · bec6d22, range 2ce0969..bec6d22.**

Verified read-only via `git log` on July 18, 2026:

| Commit | Hash | Subject |
|--------|------|---------|
| C1 — §17 v1.2 PDF swap | `fb7d3ee` | swap bundled §17 provider instructions PDFs to v1.2 (234.7, NEB, voyage, levés) |
| C2 — gate doc + edit report | `805bb08` | docs: S102 gate + §17/§22 v1.2 edit report |
| C3 — CLAUDE.md closeout | `bec6d22` | S102 closeout: CLAUDE.md |

- Push range: `2ce0969..bec6d22` (base `2ce0969` = S101b closeout).
- CLAUDE.md PENDING-VERIFICATION markers tied to the S102 hashes resolved in place (3 markers: header line, session-log row, closeout). Meaning of historical log lines preserved — only the pending markers resolved. Unrelated PENDING markers left untouched: the general policy line ("Anything unconfirmed stays PENDING VERIFICATION") and the "6(d) pill walk" S99 pending.

---

## §2 — Master Shot List (recon only — no captures taken this session)

### §2.0 — Placeholder counts (pdftotext, per-page walk)

| Doc | File | Tracked | Placeholder marker | Count |
|-----|------|---------|--------------------|-------|
| §22 EN (User's Guide v1.1) | `LobsterLog_Users_Guide_v1_1_EN.pdf` | UNTRACKED (passenger) | `[ SCREENSHOT ]` | **16** |
| §22 FR (Guide de l'utilisateur v1.1) | `LobsterLog_Guide_Utilisateur_v1_1_FR.pdf` | UNTRACKED (passenger) | `[ CAPTURE D'ÉCRAN ]` | **16** |
| §17 EN (Provider's Instructions v1.2) | `LobsterLog_Providers_Instructions_v1_2_EN.pdf` | TRACKED (bundled) | — | **0** |
| §17 FR (Instructions du fournisseur v1.2) | `LobsterLog_Instructions_Fournisseur_v1_2_FR.pdf` | TRACKED (bundled) | — | **0** |

- **§22 EN count-assert: 16 expected = 16 found. PASS.**
- **§17 EN: 0 placeholders** — the Provider's Instructions carry no figure placeholders (text-only compliance doc). Reported as-is, per Phase B step 2.
- **FR parity spot-check: PASS on both pairs.** §22 FR = 16 `[ CAPTURE D'ÉCRAN ]` (matches EN 16); §17 FR = 0 (matches EN 0). No count mismatch to flag.
- FR runs one page longer overall (18 vs 17); figure→page mapping drifts +1 from figure 13 onward. Count + content parity hold regardless.

### §2.1 — §22 figure shot-list (16 rows)

All §22 in-app shots use the **dfoelog demo** account (harvester framing + demo vessel profile = the reserved MAR-90 triplet, see §2.3). Languages: **every figure needs EN + FR** (paired). "Pre-act" = DFO ELOG not yet activated; "Activated + seed" = post-activation with the canonical seed trip open (§2.3).

| Shot | Doc §/page (EN→FR) | App screen in frame | Account | Lang | Prerequisites |
|------|--------------------|---------------------|---------|------|---------------|
| F01 | §2.1 · EN p4 / FR p4 | **App Store / Google Play store listing** (NOT an app screen — external store capture) | n/a (store) | EN + FR store locale | Store listing live in both locales |
| F02 | §2.2 · EN p4 / FR p4 | Privacy Notice screen w/ Accept button | dfoelog demo | EN + FR | Fresh launch, pre-Accept |
| F03 | §2.3 · EN p4 / FR p4 | Fisheries Act Attestation confirm screen | dfoelog demo | EN + FR | Post-Privacy launch state |
| F04 | §3.1 · EN p5 / FR p5 | Captain Profile — blank, ready for entry | dfoelog demo | EN + FR | Profile empty (pre-fill) |
| F05 | §3.2 · EN p5 / FR p5 | Captain Profile — filled, Save button | dfoelog demo | EN + FR | MAR-90 triplet entered (§2.3) |
| F06 | §4.1 · EN p6 / FR p6 | Settings menu, **DFO ELOG Setup** item highlighted | dfoelog demo | EN + FR | **Pre-act.** FR needs JBE string (see §2.4 decision) |
| F07 | §4.2 · EN p6 / FR p6 | **DfoSetupScreen** — region picker + Licence #, FIN, ELOG Key fields | dfoelog demo | EN + FR | **Pre-act. GATES on L5 + L5-adjacent JBE (see §2.4)** |
| F08 | §5.1 · EN p7 / FR p7 | DFO Logs list w/ + button | dfoelog demo | EN + FR | Activated + seed |
| F09 | §5.2 · EN p7 / FR p7 | Confirm Trip Start (date/time + profile) | dfoelog demo | EN + FR | Activated + seed; profile = MAR-90 |
| F10 | §5.3 · EN p7 / FR p7 | Timestamps — four time fields | dfoelog demo | EN + FR | Activated + seed; timestamps set (§2.3) |
| F11 | §5.4 · EN p8 / FR p8 | Catch & Effort — Fishing Area (LFA), **grid**, catch weight | dfoelog demo | EN + FR | Activated + seed; **MAR region** (grid renders). No weather in frame. |
| F12 | §5.5 · EN p8 / FR p8 | Bait — type, condition, weight | dfoelog demo | EN + FR | Activated + seed; bait row entered |
| F13 | §7 · EN p10 / FR p11 | DFO Logs list w/ **Send to DFO** button on an entry | dfoelog demo | EN + FR | Activated + seed saved & closed; capture BEFORE the real send |
| F14 | §8 · EN p11 / FR p12 | Form 222 — Marine Mammal Report entry | dfoelog demo | EN + FR | Activated |
| F15 | §9 · EN p12 / FR p13 | Form 233 — Inactivity Report entry | dfoelog demo | EN + FR | Activated |
| F16 | §10 · EN p13 / FR p14 | Coordinate entry — GPS auto-fill + manual option | dfoelog demo | EN + FR | Activated + seed; location permission granted |

### §2.2 — TRG transmission-log shots (append)

The IDs below are **the user's TRG capture-scheme IDs** (transmission-register / send-confirmation proof for the submission package). NOTE: the `T#` labels here are the capture scheme, **distinct from** the S58 XML test-case codes (T1/T2/T3 = full/minimal/no-catch) — do not conflate. Frame intent inferred from the labels; **confirm exact frame per row.**

| Shot | Source | App screen in frame | Account | Lang | Prerequisites |
|------|--------|---------------------|---------|------|---------------|
| Grid1-T5-EN×3 | TRG Grid 1 | Transmission register / send-confirmation (3 states: pre-send → sending → confirmed w/ CONF#) | dfoelog demo (reserved MAR-90 send identity) | EN ×3 | Real/UAT successful send on MAR-90 triplet + .env ELOG key |
| Grid1-T5-FR×3 | TRG Grid 1 | Same 3 states, FR | dfoelog demo | FR ×3 | Same send, FR language |
| 222-T7 | TRG Form 222 | Form 222 transmission-log / confirmation state | dfoelog demo | EN + FR | 222 successfully submitted |
| 222-T8 | TRG Form 222 | Form 222 second capture state (confirm frame) | dfoelog demo | EN + FR | 222 submitted |
| 233-T3 | TRG Form 233 | Form 233 transmission-log / confirmation state | dfoelog demo | EN + FR | 233 successfully submitted |
| 233-T4 | TRG Form 233 | Form 233 second capture state (confirm frame) | dfoelog demo | EN + FR | 233 submitted |

### §2.3 — Canonical seed trip spec (APPROVED July 18, 2026 — see rulings addendum §2.6)

One trip, reproduced **byte-identically on the EN and FR sims** so every paired shot matches.

- **Identity (reserved MAR-90 test triplet, from GATE_234_12_DEEMIT_S93):** VRN `1004460` · Fishing Licence No `1004460` · Licence Holder's FIN `100400460` · ELOG Key from `.env`. Demo profile display name "LobsterLog Demo" / vessel "Demo Vessel" (rename in the demo profile if desired — cosmetic only).
- **Region / subform:** **Maritimes (MAR, region id 90).** Chosen so the **Lobster Settlement Grid** field renders (F11 caption names the grid; MAR shows grid + no soak time).
- **LFA + Settlement Grid:** **LFA 34.** Grid = whatever the app's grid picker offers for LFA 34 — the picker lists only valid grids (per RECON_grid_id_S83), so any offered grid is valid by construction; pick the same one on both sims.
- **Trip timestamps (same wall-clock on both sims):** Time Sailed 2026-07-06 05:00 ADT · Started Hauling 07:00 · Stopped Hauling 11:00 · Landing 12:30.
- **Traps hauled:** 200.
- **Set/Haul coordinates (fixed, identical both sims):** 43.83 N, 66.12 W (SW Nova Scotia, LFA 34 waters). If the picker/validator rejects for the chosen LFA, nudge into range — the value only needs to render identically on both sims.
- **Targeted species:** Lobster. **Catch weight:** 250 lbs.
- **Bait:** Mackerel · Frozen · 40 lbs.
- **Weather: OUT OF SCOPE for capture (ruling July 18).** No §22 figure frames the free Daily Log or weather history, so no weather value appears in any shot. The seed trip does not depend on any weather warm-up. The weather display bugs (incl. "0.0nd") stay on the Aug/Sept pile, unchanged.

### §2.4 — DECISION: is DfoSetupScreen in-frame anywhere? **YES.**

**Evidence (shot rows):** F07 (§4.2, EN p6 / FR p6) frames the **DFO ELOG Setup screen = DfoSetupScreen** directly — region picker + Licence No + FIN + ELOG Key fields. F06 (§4.1) frames the Settings menu with the **"DFO ELOG Setup"** item.

**Therefore L5 CANNOT slide** for the FR capture of F06/F07:
1. **L5 regions** — F07 FR must show FR region names in the picker; the FR caption already promises « avec le sélecteur de région ». Today the region pills render EN (DfoSetupScreen is the one remaining EN picker, deferred to L5). An EN-region FR screenshot would contradict the guide.
2. **L5-adjacent JBE strings** — the §22 **FR captions for F06/F07 already say « Configuration du JBE du MPO »**, but the live app screen shows « Configuration MPO / Clé ELOG ». The FR screenshot would contradict its own FR caption unless the JBE terminology fix (ruling b, filed L5-adjacent) lands first.

**Net:** capturing F06 + F07 **in FR** is GATED on L5 regions + the L5-adjacent JBE strings. **EN** F06/F07 are fine as-is (English regions + "DFO ELOG Setup" read correctly). So L5 blocks only the FR half of two figures — but it does block them.

**Account routing (for sequencing the demo-account session):**
- **dfoelog demo account** — required for **every §22 in-app figure (F02–F16)** and **all TRG shots**. F01 is an external store listing (no account).
- **admin "Lots-0-Lobster"** — **not required for any §22 figure** (it is the harness/testing identity). Not in the capture path.
- **Pre-activation sub-state** — needed for F06/F07 (setup screen before tapping Activate). Everything F08+ needs activation.
- ⚠ **Blocking prerequisite:** the dfoelog demo account itself (dfoelog@lobsterlog.com signup + role + demo vessel profile) is **still TO DO** (carry-forward from S99). No §22 in-app capture can start until it exists.

### §2.5 — Dual-sim dry-run plan (ordered; activate exactly once, never deactivate mid-run)

**Principle:** activate DFO ELOG exactly once (between Group A and Group B); toggle language *within* each group (no deactivation needed). _(No weather step — weather is out of scope, ruling July 18; see §2.3/§2.6.)_

- **Group 0 — external (no sim):** F01 App Store / Google Play listing, EN + FR store locale (captured from the store, not the app).
- **Group A — dfoelog demo, PRE-ACTIVATION** (do all before tapping Activate):
  1. F02 Privacy → F03 Attestation (fresh-launch states)
  2. F04 Profile blank → enter MAR-90 triplet → F05 Profile filled
  3. F06 Settings menu → F07 DfoSetupScreen (region + fields, **before** Activate)
  4. Run the whole group in EN, then toggle Language → FR and repeat. **(FR F06/F07 blocked until L5 + JBE land — see §2.4; capture EN now, FR after L5.)**
- **Group B — dfoelog demo, ACTIVATED + seed trip** (activate once, then never deactivate):
  1. Activate DFO ELOG (Season Pass IAP).
  2. Build the canonical seed trip (§2.3). _(No weather warm-up — out of scope.)_
  3. From the open trip: F10 Timestamps → F11 Catch & Effort → F12 Bait → F16 GPS/Coordinates; F08 DFO Logs list, F09 Confirm Trip Start.
  4. F13 Send-to-DFO button — capture **before** the real send (or on a second entry) so the send isn't consumed.
  5. F14 Form 222 entry, F15 Form 233 entry.
  6. Run Group B in EN, then toggle → FR and repeat off the **same saved trip** (identical values).
- **Group C — TRG transmission-log shots** (after Group B, same activated demo account): perform the real/UAT sends on the MAR-90 identity → capture Grid1-T5 (3 EN + 3 FR), 222-T7/T8, 233-T3/T4 from the transmission register / confirmation screens.

### §2.6 — Rulings addendum (July 18, 2026)

1. **Weather OUT of scope for capture.** No §22 shot frames the free Daily Log or weather history, so no weather value appears in any figure. Struck the "warm weather cache once" step from the dry-run plan (§2.5) and the weather warm-up from the seed-trip spec (§2.3) + F11 prerequisite (§2.1). The weather display bugs (incl. "0.0nd") stay on the **Aug/Sept pile, unchanged**.
2. **Seed-trip spec APPROVED** as finalized in §2.3: MAR (region 90) · reserved MAR-90 triplet · LFA 34 + any grid the picker offers · 2026-07-06 timestamps · 200 traps · 43.83 N / 66.12 W · Lobster / 250 lbs · Mackerel/Frozen/40 lbs. No weather dependency.
3. **TRG `T#` IDs confirmed** as the capture-scheme IDs (Grid1-T5, 222-T7/T8, 233-T3/T4), **distinct from the S58 XML test-case codes** (T1/T2/T3 = full/minimal/no-catch). §2.2 already carries this note.

---

## §3 — Flags (noticed, NOT acted — per session rules)

1. **Doc-vs-app JBE mismatch (reinforces §2.4):** §22 FR captions F06/F07 already read « Configuration du JBE du MPO » / « sélecteur de région », but the live DfoSetupScreen shows « Configuration MPO / Clé ELOG » + EN region names. The FR guide is already written to the *fixed* state; the app hasn't caught up. This is the existing L5 + L5-adjacent (ruling b) carry-forward — flagged, not touched.
2. **F01 is not an app screen** — the first §22 figure is the external App Store / Google Play store listing, not a sim capture. Sequenced under Group 0.

---

## §4 — Commit block (NO-GIT — Jonny runs these, one line at a time)

Stage only the two files touched this session, by exact repo-relative path (never `-A`):

```
git add CLAUDE.md
git add docs/GATE_S103_SHOTLIST.md
git commit -m "S103: backfill S102 hashes, master shot list + seed-trip spec"
```
