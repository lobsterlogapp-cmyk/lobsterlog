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
| **G5** — 222 T2 Y-path emits hardcoded optionals | Interpretation | **CLOSED** — S114 recon (`docs/RECON_S114_KANE_QS.md`) + founder ruling S115: 222 Rule 593 makes every always-emitted Y-path element MANDATORY when INTERACT_IND=Y — they are not optionals in the T2 context. See §3.2 |

---

## 2. STANDING RULES — apply to every send without exception

1. **Fresh filename, always.** WS1034 is checked *before* content validation, so a reused
   name never revalidates. Filenames are `[REG_ID]-[LIC_NO]-[YYYYMMDDHHMMSS].XML`, stamped
   at generation. Never re-POST a stored envelope; never fire two sends inside the same
   clock second — unqualified (S112 discipline B): stagger dual-sim >1 s or run
   sequentially. Burned already: 163581–586, 163698.
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

§3.1 through §3.6 are ALL SETTLED below — no ruling gates any send, and no day-of decision
remains. The phase order is locked (§3.6). Read the rulings; nothing here is left to pick.

### 3.1 — 233 T1 — SETTLED: `REPORT_DTL.REM` BUILT (S112); `LOGBOOK_UID_REFERED` BUILT (S116) and INCLUDED

T1 reads: *"Send an inactivity report that includes ALL nodes and elements, whether optional
or required. Include French accented characters in the comment fields."* No "still
accessible" qualifier.

Reflects BUILT state — no open ruling:

- **`REPORT_DTL.REM` is BUILT (S112)** and live-proven — both REMs in the sent bytes,
  WS0000 CONF 163704 (EN) / 163705 (FR); it emits as the LAST child of `report_dtl_type`,
  after REASON. **S1 (233 T1) exercises BOTH REMs with distinct accented text** (the S112
  walk sends were ASCII — S1 is the first live accent-path proof).
- **`LOGBOOK_UID_REFERED` is BUILT (S116) and IS INCLUDED on S1** (supersedes the S111/S112
  omit ruling). T1 asks for all elements "whether optional or required," and the field now
  exists, so it belongs in the file. It prefills from the most recent 234 log — on the
  sandbox that is S0's logbook (S0 runs first of all), so the Referred ELOG UID card arrives
  pre-filled with a real six-letter code, no typing. ON THE DAY: confirm the card shows a
  real code — NOT blank, NOT the dictionary sample `AFUERF` — before sending; if blank, type
  S0's code. Record the code in the Comments cell and grep the sent bytes to confirm
  `<LOGBOOK_UID_REFERED>` carries it.

### 3.2 — 222 T2 "mandatory only" (G5) — SETTLED (S115, refined S118): SEND-AS-EMITTED (S7) / BLANK-VRN-THEN-RESTORE (S2)

The old framing — that the Y-path "hardcoded optionals" (`TGT_SPECIE_ID` 1312, `GEAR_ID`
925, `GEAR_DMG_IND`, plus `INTERACT_DT`/LAT/LONG/NAME/ADDR/`NOAA_SPECIE_COD`/
`NB_SPCMN_BEST`) make a dictionary-strict Y+mandatory-only file impossible — was wrong on
source. **S114 recon (`docs/RECON_S114_KANE_QS.md`), settled by the DFO documents
themselves:**

- **222:** fact-sheet **Rule 593** (FS-NAT-222-1-EN p.7) makes capture of EVERY
  always-emitted Y-path element **MANDATORY when `INTERACT_IND=Y`** — the S7 file the app
  produces IS the "mandatory … still accessible" set under the fact sheet's own
  definitions. Twin Rule 594 blocks that set when N, and the generator's Y-gate matches it
  exactly. The only rule-Blocked elements (DOC_UID R588, MM_INTER_INCDNT.REM R595, BDY_LEN
  R575) are never emitted.
- **233:** **Rule 961** makes FIN **MANDATORY** for every non-Arctic region (all four app
  regions). VRN is identity-only (format Rule 528, no requirement rule) — i.e. **OPTIONAL**
  on the 233. Under Lisa's July 24 mandatory-only grading rule, a mandatory-only file fails
  if it carries ANY optional element, so **S2 must NOT carry VRN**: blank the profile VRN,
  send, then restore it (the VRN gate was loosened at S116 to allow this). FIN still rides.
  Nothing on the 233 is Blocked (zero `maxOccurs="0"` in the XSD).

**RULING (S115, refined S118): S2 and S7 both RUN, ungated, in list position — but they
differ. S7 is SEND-AS-EMITTED (every Y-path element is Rule-593 mandatory). S2 is
BLANK-VRN-THEN-RESTORE: VRN is optional on the 233, so under the July-24 mandatory-only
rule it is blanked for the send and restored after. Each row's basis is noted in its
Comments cell.** Kane Ticket #2478 remains open as **confirmation only** — flagged "asked,"
NOT blocking; his answer is filed when it arrives but no send waits on it.

**Recon carry baked into the rows:** (a) **S7 MUST use a NON-entanglement incident type**
— `entangleInd=Y` force-fills the optional `REM` ("Released: yes/no"), and REM is NOT in
the Rule 593 mandatory list, which would break the mandatory-only shape; (b) **S1 INCLUDES
`LOGBOOK_UID_REFERED` (S116-built)** — prefilled from S0's logbook, code recorded in the
Comments cell (supersedes the S111/S112 omit ruling; see §3.1).

### 3.3 — Supplementals — SETTLED (S112 close, decision 1): BOTH RUN

Both supplementals are committed sends, not options:

- **S9b** (MAR-90, LFA 34): LGRID_ID is only accessible on FMAs 1581–1593, and 38b (28599)
  has no settlement grids — so S9 (38b) cannot show it.
- **S10b** (QC-88, an LFA-20x — specific area chosen at run time from Test_values / the
  reftables, one where NB_VNTCH / NB_VNTCH_YOU are accessible and different from S10's
  GRID_ID LFA): the NB_VNTCH areas do not overlap the GRID areas — so S10 (LFA 22) cannot
  show them.

Rationale (carried in both rows' Comments cells): a second logbook per region because the
FMA sets are disjoint; T1 asks for all elements "whether optional or mandatory" — no "still
accessible" qualifier, and no sanctioned N/A convention exists in the workbooks (S109B).

### 3.4 — Cross-midnight placement — SETTLED: S0 standalone and first

Implemented as the §6 S0 row: a standalone pre-sweep send, run first — verify-first
isolates the multi-day date engine from the graded sends.

### 3.5 — Identity rows — SETTLED: the 6-digit `…460` family throughout

The 6-digit-VRN `…460` family is used for every send (VRN = LIC holds; passes the Rule 528
4–6 digit gate), constant across the whole sweep — as already baked into §4's identity
table.

### 3.6 — Phase order — SETTLED (S118): 233 → 222 → 234, LOCKED

The graded sends run 233 → 222 → 234 so the simplest forms burn the process in first.
**Safe because S0 still runs first of all:** S0 is the cross-midnight 234, so a real 234
logbook exists before S1 (the first 233) needs one to reference. The phase order governs
only the graded sends AFTER S0 — the 233-before-234 choice does not starve S1 of a logbook
to point at.

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

⚠ **RUN-BOOK CHECK, added 2026-08-31 — move all three fields together at every region switch.**
After changing region on the profile, re-read **FIN, licence and VRN** on screen and confirm all
three are the row above for the region you are now in. Nothing in the app checks it and nothing at
DFO refuses it. On a **logbook (234)** send **no validator looks at the VRN's shape at all** — the
only thing asked is whether the box is empty (`validateElogXml`, `dfoXmlGenerator.ts:857`), and
Rule 528, the 4-to-6-digits rule, belongs to Forms **222 and 233** and is not in the 234 package.
On a **222** send the VRN must be 4–6 digits, and on a **233** only if it is filled in
(`isValidFormVrn`, `submitDfoXml.ts:22`) — but that counts digits, not regions. **Nothing anywhere
compares the VRN against the FIN, the licence or the region.** So a Maritimes VRN on a Quebec send
passes every gate — as one did on CONF 164060 and CONF 164062, both accepted WS0000.
**That was deliberate on the founder's own admin-gated account and is not a
defect** (`docs/GATE_S154_U2_NB_SPCMN_DISC.md` §12.3, withdrawn and annotated) — but on the sweep the
identity is graded evidence, so it is checked by hand, per send, against the table.

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
| **S1** | 233 T1 | All nodes + all elements, **French accents in BOTH comment fields** — `REPORT.REM` (S111) + `REPORT_DTL.REM` (S112), distinct text. | Grep the sent bytes for BOTH `<REM>`s with accented bytes — first live accent-path proof (create-and-send-only screen: complete in one sitting). `LOGBOOK_UID_REFERED` INCLUDED (S116-built) — prefills from S0's logbook; confirm a real six-letter code (not blank, not `AFUERF`), record it in Comments, grep the bytes for `<LOGBOOK_UID_REFERED>`. READY — §3.1 settled, no gate |
| **S2** | 233 T2 | Mandatory only: REG/CIE/FORM_VER/SOFT_VER + REPORT_UID + DG_CLOSE_DT + REPORT_DTL(START/END/LIC_NO/REASON) + FIN. **No REM. No VRN. No LOGBOOK_UID_REFERED.** BLANK the profile VRN before sending, RESTORE it after. While blank, 222/234 sends are correctly blocked — expected; S2 is the only blanked send. | READY — §3.2 settled (refined S118). Comments cell basis: FIN is Rule-961 MANDATORY; VRN is optional (Rule 528 format-only) so blanked-and-restored for the July-24 mandatory-only rule; nothing on the 233 is Blocked. Grep to confirm NO `<VRN>`, NO `<REM>`, NO `<LOGBOOK_UID_REFERED>`. Note the blank-and-restore in the row. |

### PHASE 2 — Form 222 (6 sends, MAR demo identity throughout)

| # | Row | Shape | Verify |
|---|---|---|---|
| **S3** | 222 T4 | `INTERACT_IND=N`, mandatory only | N-path emits exactly REP_DATE, INTERACT_IND, LGBK_NUM_REF, DG_CLOSE_DT |
| **S4** | 222 T3 | `INTERACT_IND=N`, all accessible elements | On N the accessible set == the T4 set. Same shape, **fresh filename** |
| **S5** | 222 T1 | `INTERACT_IND=Y`, every implemented field filled — coords, observer name/contact, species, count, the optional trio, all five new T6 text fields, remarks | Strict "all elements" still rides the "still accessible" reading: ~15 dictionary-optional elements remain unimplemented after S111 (DOC_UID, PHONE, EMAIL, PROV_ID, VNAME, GEAR_LOST_IND, CAUS_KNOWN_IND, SPCMN_DSC, NB_SPCMN_MIN/MAX, VID/PHOTO/SMPL/OTHR_DOC_IND, BDY_LEN, MM_INTER_INCDNT.REM) |
| **S6** | 222 T5 | Three-node: type = **Entanglement**, then **Y** to Entanglement, Injury and Death → dedup set {39609, 39610, 39615} | ⚠ **Exactly three** `<MM_INTER_INCDNT>` before sending — any other interaction type yields four. ⭐ **INCDNT_REM stays BLANK** on this send (S111 R-A: one input, first node only) |
| **S7** | 222 T2 | `Y`, mandatory only — ⚠ **MUST pick a NON-entanglement incident type** (entanglement force-fills the optional REM "Released: yes/no", which is NOT in the Rule 593 mandatory list and would break the mandatory-only shape). Leave every suppressible optional blank (SITE_DSC, GEAR_DMG_REM, trio, DOC_REM, BDY_LEN_ID, EVENT_DSC, INCDNT_REM, remarks). | READY — §3.2 settled (S115 ruling on S114 recon). Comments cell basis: every emitted Y-path element is Rule-593 MANDATORY when INTERACT_IND=Y; no Blocked element emitted. Grep: no REM, no optional stragglers |
| **S8** | 222 T6 | French accents in **all six**: SITE_DSC, GEAR_DMG_REM, DOC_REM, EVENT_DSC, REM, INCDNT_REM | ⭐ Single incident node so INCDNT_REM emits. Grep all six for accented bytes. ⚠ EN label still reads "REMARK (LOST GEAR)" — cosmetic, does not affect the send |

### PHASE 3 — 234.12 logbooks (10 core sends)

| # | Row | Region / identity | Shape |
|---|---|---|---|
| **S9** | 234 T1 | **MAR-90, FMA 38b (28599)** — demo | All elements + a note in every data group. 38b unlocks HLIN + HLOUT (Rules 2024/2025), EFFORT_DETAIL LAT/LONG MODE=G (Rule 3059), NB_SPCMN_BRD (Rule 654), OBS_TRIP_NUM. PCONS = **personal-use node only** (USG_ID Mandatory-MAR). SAR_IND=Y + full SAR node. MM_INTER_IND=N. CREW_NB, bait + condition, landing port, KEPT_WT. LGRID not accessible on 38b |
| **S9b** | supplemental (committed) | MAR-90, LFA 34 | Demonstrates LGRID_ID. Comments cell: a second MAR logbook was needed because the FMA sets are disjoint — LGRID_ID is only accessible on FMAs 1581–1593 and 38b has no settlement grids, and T1 asks for all elements "whether optional or mandatory" (no "still accessible" qualifier, no N/A convention) |
| **S10** | 234 T1 | **QC-88, LFA 22 (1534)** | All elements: GRID_ID, CREW_NB, departure PORT_ID, PRTNSHP_ID, USE_CR_IND=Y + LANDING.VRN, full TRANSFER + TRANSFER_DTL, bait + condition, **PCONS = Rock Crab (1287) bycatch — no personal-use** (USG_ID Blocked off-MAR), SAR=Y, notes everywhere. ⭐ Coords now emit (S110) |
| **S10b** | supplemental (committed) | QC-88, an LFA-20x — specific area chosen at run time from Test_values / the reftables (one where NB_VNTCH / NB_VNTCH_YOU are accessible, a different area than S10's GRID_ID LFA) | Demonstrates NB_VNTCH / NB_VNTCH_YOU. Comments cell: a second QC logbook was needed because the FMA sets are disjoint — the NB_VNTCH areas do not overlap the GRID_ID areas, so S10 (LFA 22) cannot show them, and T1 asks for all elements "whether optional or mandatory" (no "still accessible" qualifier, no N/A convention) |
| **S11** | 234 T1 | **GLF-89** | All elements; no port/crew/partnership (Blocked); bait + condition; PCONS with mandatory SPECIE_SZ_ID (Rock Crab → 10670, Lobster → 826); no personal-use; SAR=Y; notes. ⭐ Coords now emit |
| **S12** | 234 T1 | **NL-91, LFA 3 (1653)** | All elements: TRP_SZ_ID, GEAR_SBTYP_ID, STAT_SECT_ID (1653 is in the Rule-621 seventeen), ⭐ **NB_SPCMN_KEPT** (Rule 976 — built S110), NB_SPCMN_DISC, NB_VNTCH_YOU, departure port, bait **without condition** (Blocked, row 27), PCONS = Rock Crab bycatch, SAR=Y, notes. ⭐ No GPS section renders on NL (S110) — coords correctly absent |
| **S13** | 234 T2 | MAR-90, **LFA 34** — demo | Mandatory only. Outside 38b → HLIN/HLOUT/coords/BRD legitimately absent; no OBS_TRIP_NUM; personal-use PCONS **with** USG_ID; **KEPT_WT** (Rule 631 — lobster ⇒ mandatory regardless of the 234.12 flip to Optional); SAR node mandatory fields only; **no notes anywhere** |
| **S14** | 234 T2 | QC-88, **LFA 17b** | Mandatory only; 17b makes GRID_ID legitimately absent. TRANSFER mandatory elements only. USE_CR_IND + PRTNSHP_ID present (Mandatory-QC). KEPT_WT. ⭐ Coords required and now emitted |
| **S15** | 234 T2 | GLF-89 | Mandatory only; PCONS with SPECIE_SZ_ID; KEPT_WT. ⭐ Coords required and now emitted |
| **S16** | 234 T2 | NL-91, **LFA 1 (2071) or LFA 2 (1652)** | Mandatory only; those FMAs are outside the Rule-621 seventeen → STAT_SECT_ID legitimately absent; NB_VNTCH_YOU blank; TRP_SZ + GEAR_SBTYP present; KEPT_WT; ⭐ NB_SPCMN_KEPT (Rule 976) |
| **S17** | 234 T3 | MAR-90, LFA 34 — demo | Effort with no catch. Rule 2020 still requires the lobster CATCH node; Rule 630 satisfied by **KEPT_WT = 0 entered manually** (Rule 789: a null must never be read as 0). ⚠ Confirm on-device the form accepts a literal 0 before firing |
| **S18** | 234 T4 | MAR-90, LFA 34 — demo | French accented characters in a comment field (grid's own example: Trip.Rem) |

**Running total:** 1 pre-sweep + 2 (233) + 6 (222) + 12 (234, incl. the two committed
supplementals S9b + S10b) = **21 sends**. Nothing optional — the supplementals are part of
the run (§3.3, settled at S112 close).

**No deferrals (§3.2 settled S115, refined S118):** all 21 sends run in list order — S2 and
S7 in their positions above. S7 is send-as-emitted (every Y-path element Rule-593 mandatory);
S2 is blank-VRN-then-restore (§3.2). Kane Ticket #2478 is confirmation-only ("asked," not
blocking).

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

1. Fill all three TRGs — header carries: LobsterLog · **1.9.1** (confirmed on both stores) ·
   Jonathon Nickerson · Iteration #1 · RFQ Id **BLANK** (Lisa July 23: internal-only, leave
   empty) · form ids 234.12 / 222.1 / 233.2.
2. Capture the register shots (234 T6, 222 T9, 233 T5).
3. Sign the Letter of Attestation (234.12).
4. Fill Appendix B — 7 cases.
5. Package. Demo credentials go **out-of-band**, never in the package, repo, or chat.

---

## 9. OPEN ITEMS CARRIED IN FROM S112

- **931 FIN label** — "LICENCE HOLDER'S FIN" is a mandated-verbatim label (931 is on the
  mandated list); it now appears in a shipped §22 figure. ✅ CLOSED S114 (STEP 0 · 2c):
  MATCH — fact-sheet authority FS-NAT-234-12 (Rule 931); app EN/FR labels byte-match,
  casing-aside per the S111 corollary. See docs/GATE_S114_STEP0.md.
- §22 §8 body text does not mention the five new optional 222 fields, in either language.
- Proofreader pile: "(Optional)" missing from « Remarques » and « Commentaires »;
  empêtrement vs enchevêtrement on the 222; FR Résultats rows phrased as questions where EN
  uses nouns; the unlabelled REM box on the 222 Remarks card.
- §22 guides now at **v1.5** (S117) — figures current, app version 1.9.1, page-number field
  rebuilt, uploaded to Drive. Supersedes v1.4/v1.3/v1.2.

---

**STOP.** Plan only. No sends fired, no code changed, no git run by this document.
