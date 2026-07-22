# SWEEP MASTER PLAN — TRG case sends (234.12 / 222 / 233)

**Drafted:** S112, 2026-07-22
**Built on:** `docs/RECON_S109_SWEEP_PLAN.md` (send list, identities, gates) and
`docs/RECON_S109B_GATE_RULINGS.md` (gate scope, KEPT_WT, N/A-convention finding).
**Supersedes** the send list in S109 only where S110/S111 builds have since closed a gate —
every such change is called out inline.

---

## 0. WHAT THIS DOCUMENT IS

A run-book. One line per send, in order, with the exact identity, region, shape and
verify gate for each. Read it on the day; don't reconstruct the sweep from memory or
from the master prompt's summary.

**Base state: PROVEN = 0.** No grid line anywhere has a case-labelled live WS0000.
The six S106 capture CONFs (163581–586) and the S111 walk sends (163698 + the 233
Phase-2 send) clear nothing. Every case below needs its own fresh send.

---

## 1. WHAT CHANGED SINCE THE RECONS

S109 listed five gates. Three have been built out:

| Gate | S109/S109B status | Now |
|---|---|---|
| **G1** — QC/GLF `EFFORT_DETAIL.LAT/LONG` Mandatory but not emitted | Blocked 4 of 10 core sends | **CLOSED** — S110 P1 (91bccf4) emit + validator + save-gate |
| **R5** — NL `NB_SPCMN_KEPT` rule-mandated (Rule 976), no UI/emit | Blocked NL T1 + T2 | **CLOSED** — S110 P2 (2eda255) |
| **R2** — GPS section visible on NL where sheet says Blocked | Over-collection hazard | **CLOSED** — S110 P3 (8c7afac); NL renders no GPS section |
| **G2** — 222 T6's five missing text elements | T6 unmeetable as written | **CLOSED** — S111 P1 (4a02ae9); all six T6 elements now have a path |
| **G3** — 233 emits no REM at all | T1 unmeetable as written | **PARTIALLY closed** — S111 P2 (d9d290d) built `REPORT.REM`. See §3.1 |
| **G5** — 222 T2 Y-path emits hardcoded optionals | Interpretation | **STILL OPEN** — see §3.2 |

---

## 2. STANDING RULES — apply to every send without exception

1. **Fresh filename, always.** WS1034 is checked *before* content validation, so a reused
   name never revalidates. Filenames are `[REG_ID]-[LIC_NO]-[YYYYMMDDHHMMSS].XML`, stamped
   at generation. Never re-POST a stored envelope; never fire two sends on the same identity
   inside the same clock second. Burned already: 163581–586, 163698.
2. **Verify before the next send.** After each send, complete the verify gate for that row
   (§5) and write the result into the grid *before* firing the next one. Never stack two
   unverified sends — if something is wrong you want one suspect, not five.
3. **Confirm the region before Activate.** The DfoSetupScreen region selector does not seed
   from the profile (S110 latent finding). On every region change, read the region pill back
   on screen before tapping Activate, and read it again on the Confirm Trip Start card.
4. **Accepted ≠ emitted.** The Transmission Result card proves valid-and-sent, never what is
   in the bytes. UAT accepts optional elements whether or not they were emitted. Any check
   worded "the XML carries element X" is closed by grepping the sent bytes, never by the
   card.
5. **One Metro (8081); `cd ~/Desktop/LobsterLog` first.** Prompt must read `LobsterLog %`.
6. **Sends run from the iOS simulator on the demo identity chain.** Physical device is the
   offline/UI gate, not the send gate.
7. **Claude never POSTs to any DFO endpoint.** Every send is fired by hand.

---

## 3. RULINGS NEEDED BEFORE THE RUN STARTS

These are not day-of decisions. Settle them first — three of them change what gets sent.

### 3.1 — 233 T1 vs `REPORT_DTL.REM` and `LOGBOOK_UID_REFERED` ⚠ DECIDES A SEND

T1 reads: *"Send an inactivity report that includes ALL nodes and elements, whether optional
or required. Include French accented characters in the comment fields."* No "still
accessible" qualifier.

S111 built `REPORT.REM` and ruled `REPORT_DTL.REM` deliberately unused (R-D).
`LOGBOOK_UID_REFERED` remains omitted by design. Against T1's plain wording, both are
elements the report does not include.

**Options:** (a) build both before the run — small, additive, XSD-optional; (b) send as-is
and record the omission in the grid's Comments column; (c) ask Kane first.
S109B's N/A-convention finding matters here: **the workbooks contain no sanctioned
"not applicable" answer** — only Y/N grading and free-text Comments. Route (b) means
writing an explanation into a cell that DFO grades.

### 3.2 — 222 T2 "mandatory only" (G5) ⚠ DECIDES A SEND

With `INTERACT_IND=Y` the generator unconditionally emits `TGT_SPECIE_ID` (1312) and
`GEAR_ID` (925) hardcoded, plus `INTERACT_DT`, NAME/ADDR and one incident node. A
dictionary-strict Y+mandatory-only file is impossible without a code change.
Same class: **233 T2** always emits FIN and VRN, both optional in the 233 CSV.

**Options:** (a) accept as-emitted and note it; (b) ask Kane whether "mandatory … still
accessible" is graded against the app's own required set; (c) build a strict path.

### 3.3 — Supplementals (Q1 / Q1b)

- **MAR LGRID_ID** is only accessible on FMAs 1581–1593, and 38b (28599) has no settlement
  grids — so S9 (38b) cannot show it. Run supplemental **S9b** on LFA 34, or accept LGRID
  undemonstrated? *S109 recommendation: run it — one cheap send closes the argument.*
- **QC NB_VNTCH / NB_VNTCH_YOU** live on the 19/20/21-series FMAs, disjoint from the GRID
  FMAs — so S10 (LFA 22) cannot show them. Supplemental QC send, or accept undemonstrated?

### 3.4 — Cross-midnight placement (Q4)

Standalone pre-sweep send S0, or fold into S13? *S109 recommendation: standalone and first —
verify-first isolates the multi-day date engine from the graded sends.*

### 3.5 — Identity rows (Q5)

The 6-digit-VRN `…460` family is recommended throughout (VRN = LIC holds; passes the Rule 528
4–6 digit gate). Pick one family and keep it constant across the whole sweep.

### 3.6 — Phase order (Q6)

Listed below as 233 → 222 → 234 so the simplest forms burn in the process first. Equally
defensible to run 234 first. Founder's call, but pick before the day starts.

---

## 4. IDENTITIES — transcribed from `Test_values_LobsterLog.pdf` pp. 1–3

Each printed line is one valid FIN–VRN–LIC combination. Read the row; never mix rows.

| Use | FIN | VRN | LIC_NO | Region | Page |
|---|---|---|---|---|---|
| **MAR-90 + all 222/233** (demo) | 100400460 | 104460 | 104460 | Maritimes | 1 |
| NL-91 | 100200460 | 102460 | 102460 | Newfoundland | 1 |
| QC-88 | 100600460 | 106460 | 106460 | Quebec | 2 |
| GLF-89 | 101400460 | 114460 | 114460 | Gulf | 3 |

⚠ Avoid the `DFOCC…` and `6ASU…` rows, and GLF `1D1400466` / `1D1400467` — the only rows
where VRN ≠ LIC.

---

## 5. THE VERIFY GATE — run after every send, before the next

1. **Transmission Result card** — WS0000, XSD Passed, HTTP 200. Record the CONF number and
   the exact filename.
2. **Grep the sent bytes** for the elements that row is graded on. The card does not prove
   emission. Use the stored `xmlSnapshot` / archive blob for the send you just made.
3. **Node counts where the row specifies one** — e.g. 222 T5 must contain exactly three
   `<MM_INTER_INCDNT>`; 222 T6 must contain exactly one, carrying `INCDNT_REM`.
4. **Write the grid row now** — XML file name, Transmission printout Y, XSD compliant Y,
   "XML contains what is asked for" Y/N, Comments.
5. Only then fire the next send.

**If a send fails:** record the error code, do not retry with the same filename (regeneration
gives a fresh stamp), and fix the cause before continuing. WS1019/1020 = VRN; WS1034 =
duplicate filename; WS1038 = XSD, and it may blame the element *after* the real offender.

---

## 6. THE ORDERED SEND LIST

### PHASE 0 — pre-sweep, not a grid row

| # | Send | Identity | Notes |
|---|---|---|---|
| **S0** | Cross-midnight 234 (sail ~23:30 D1 / haul ~02:00 D2), MAR-90, LFA 34 | MAR demo | The S90/S93 banked item. Standalone and first, per §3.4. Verifies the multi-day date engine before anything graded. |

### PHASE 1 — Form 233 (2 sends)

| # | Row | Shape | Verify |
|---|---|---|---|
| **S1** | 233 T1 | All nodes + all elements, **French accents in the comment field**. `REPORT.REM` now exists (S111). | Grep for `<REM>` with accented bytes. ⚠ Gated on §3.1 — decide `REPORT_DTL.REM` + `LOGBOOK_UID_REFERED` first |
| **S2** | 233 T2 | Mandatory only: REG/CIE/FORM_VER/SOFT_VER + REPORT_UID + DG_CLOSE_DT + REPORT_DTL(START/END/LIC_NO/REASON). No REM. | ⚠ App always emits FIN + VRN (optional per CSV) — §3.2 class. Grep to confirm no REM present |

### PHASE 2 — Form 222 (6 sends, MAR demo identity throughout)

| # | Row | Shape | Verify |
|---|---|---|---|
| **S3** | 222 T4 | `INTERACT_IND=N`, mandatory only | N-path emits exactly REP_DATE, INTERACT_IND, LGBK_NUM_REF, DG_CLOSE_DT |
| **S4** | 222 T3 | `INTERACT_IND=N`, all accessible elements | On N the accessible set == the T4 set. Same shape, **fresh filename** |
| **S5** | 222 T1 | `INTERACT_IND=Y`, every implemented field filled — coords, observer name/contact, species, count, the optional trio, all five new T6 text fields, remarks | Strict "all elements" still rides the "still accessible" reading: ~15 dictionary-optional elements remain unimplemented after S111 (DOC_UID, PHONE, EMAIL, PROV_ID, VNAME, GEAR_LOST_IND, CAUS_KNOWN_IND, SPCMN_DSC, NB_SPCMN_MIN/MAX, VID/PHOTO/SMPL/OTHR_DOC_IND, BDY_LEN, MM_INTER_INCDNT.REM) |
| **S6** | 222 T5 | Three-node: type = **Entanglement**, then **Y** to Entanglement, Injury and Death → dedup set {39609, 39610, 39615} | ⚠ **Exactly three** `<MM_INTER_INCDNT>` before sending — any other interaction type yields four. ⭐ **INCDNT_REM stays BLANK** on this send (S111 R-A: one input, first node only) |
| **S7** | 222 T2 | `Y`, mandatory only | ⚠ Gated on §3.2 |
| **S8** | 222 T6 | French accents in **all six**: SITE_DSC, GEAR_DMG_REM, DOC_REM, EVENT_DSC, REM, INCDNT_REM | ⭐ Single incident node so INCDNT_REM emits. Grep all six for accented bytes. ⚠ EN label still reads "REMARK (LOST GEAR)" — cosmetic, does not affect the send |

### PHASE 3 — 234.12 logbooks (10 core sends)

| # | Row | Region / identity | Shape |
|---|---|---|---|
| **S9** | 234 T1 | **MAR-90, FMA 38b (28599)** — demo | All elements + a note in every data group. 38b unlocks HLIN + HLOUT (Rules 2024/2025), EFFORT_DETAIL LAT/LONG MODE=G (Rule 3059), NB_SPCMN_BRD (Rule 654), OBS_TRIP_NUM. PCONS = **personal-use node only** (USG_ID Mandatory-MAR). SAR_IND=Y + full SAR node. MM_INTER_IND=N. CREW_NB, bait + condition, landing port, KEPT_WT. LGRID not accessible on 38b |
| **S9b** | supplemental | MAR-90, LFA 34 | Demonstrates LGRID_ID. ⚠ Gated on §3.3 |
| **S10** | 234 T1 | **QC-88, LFA 22 (1534)** | All elements: GRID_ID, CREW_NB, departure PORT_ID, PRTNSHP_ID, USE_CR_IND=Y + LANDING.VRN, full TRANSFER + TRANSFER_DTL, bait + condition, **PCONS = Rock Crab (1287) bycatch — no personal-use** (USG_ID Blocked off-MAR), SAR=Y, notes everywhere. ⭐ Coords now emit (S110) |
| **S11** | 234 T1 | **GLF-89** | All elements; no port/crew/partnership (Blocked); bait + condition; PCONS with mandatory SPECIE_SZ_ID (Rock Crab → 10670, Lobster → 826); no personal-use; SAR=Y; notes. ⭐ Coords now emit |
| **S12** | 234 T1 | **NL-91, LFA 3 (1653)** | All elements: TRP_SZ_ID, GEAR_SBTYP_ID, STAT_SECT_ID (1653 is in the Rule-621 seventeen), ⭐ **NB_SPCMN_KEPT** (Rule 976 — built S110), NB_SPCMN_DISC, NB_VNTCH_YOU, departure port, bait **without condition** (Blocked, row 27), PCONS = Rock Crab bycatch, SAR=Y, notes. ⭐ No GPS section renders on NL (S110) — coords correctly absent |
| **S13** | 234 T2 | MAR-90, **LFA 34** — demo | Mandatory only. Outside 38b → HLIN/HLOUT/coords/BRD legitimately absent; no OBS_TRIP_NUM; personal-use PCONS **with** USG_ID; **KEPT_WT** (Rule 631 — lobster ⇒ mandatory regardless of the 234.12 flip to Optional); SAR node mandatory fields only; **no notes anywhere** |
| **S14** | 234 T2 | QC-88, **LFA 17b** | Mandatory only; 17b makes GRID_ID legitimately absent. TRANSFER mandatory elements only. USE_CR_IND + PRTNSHP_ID present (Mandatory-QC). KEPT_WT. ⭐ Coords required and now emitted |
| **S15** | 234 T2 | GLF-89 | Mandatory only; PCONS with SPECIE_SZ_ID; KEPT_WT. ⭐ Coords required and now emitted |
| **S16** | 234 T2 | NL-91, **LFA 1 (2071) or LFA 2 (1652)** | Mandatory only; those FMAs are outside the Rule-621 seventeen → STAT_SECT_ID legitimately absent; NB_VNTCH_YOU blank; TRP_SZ + GEAR_SBTYP present; KEPT_WT; ⭐ NB_SPCMN_KEPT (Rule 976) |
| **S17** | 234 T3 | MAR-90, LFA 34 — demo | Effort with no catch. Rule 2020 still requires the lobster CATCH node; Rule 630 satisfied by **KEPT_WT = 0 entered manually** (Rule 789: a null must never be read as 0). ⚠ Confirm on-device the form accepts a literal 0 before firing |
| **S18** | 234 T4 | MAR-90, LFA 34 — demo | French accented characters in a comment field (grid's own example: Trip.Rem) |

**Running total:** 1 pre-sweep + 2 (233) + 6 (222) + 10 (234) = **19 sends**, plus up to two
optional supplementals from §3.3.

---

## 7. SCREENSHOT DELIVERABLES — not sends

| Row | What | Status |
|---|---|---|
| 234 T5 | 3 EN + 3 FR bilingual app shots | From the S106 capture set |
| 234 T6 | Register shot showing ≥ 5 of the above files | **After** the sweep |
| 222 T7 / T8 | Form shots, EN / FR | ✅ Re-shot S112 (6 frames each) |
| 233 T3 / T4 | Form shots, EN / FR | ✅ Re-shot S112 (2 frames each) |
| 222 T9 · 233 T5 | Register shots of the per-test sends | **After** the sweep |

---

## 8. AFTER THE SWEEP

1. Fill all three TRGs — header carries: LobsterLog · 1.8.6 (76) · Jonathon Nickerson ·
   Iteration #1 · RFQ Id **"Requested — pending DFO assignment"** (never fabricate) ·
   form ids 234.12 / 222.1 / 233.2.
2. Capture the register shots (234 T6, 222 T9, 233 T5).
3. Sign the Letter of Attestation (234.12).
4. Fill Appendix B — 7 cases.
5. Package. Demo credentials go **out-of-band**, never in the package, repo, or chat.

---

## 9. OPEN ITEMS CARRIED IN FROM S112

- **931 FIN label** — "LICENCE HOLDER'S FIN" is a mandated-verbatim label (931 is on the
  mandated list); it now appears in a shipped §22 figure. Verify against the dictionary
  before the package goes out.
- §22 §8 body text does not mention the five new optional 222 fields, in either language.
- Proofreader pile: "(Optional)" missing from « Remarques » and « Commentaires »;
  empêtrement vs enchevêtrement on the 222; FR Résultats rows phrased as questions where EN
  uses nouns; the unlabelled REM box on the 222 Remarks card.
- §22 guides unified at **v1.4** — filenames, title, and footers now all agree; the earlier
  `v1_3`-filename vs internal-"Version 1.2" mismatch is resolved (supersedes v1_2/v1_3).

---

**STOP.** Plan only. No sends fired, no code changed, no git run by this document.
