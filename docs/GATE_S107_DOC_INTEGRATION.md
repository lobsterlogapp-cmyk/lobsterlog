# GATE S107 — §22 DOC INTEGRATION (v1.1 → v1.2)

**Session dates:** July 20–21, 2026
**Work performed in:** Claude.ai + Cowork (documentation pass — no code changes)
**Outputs:** §22 User's Guide v1_2 EN/FR — docx + PDF
**Drive:** masters updated
**Founder review:** PDF review passed

---

## SESSION SUMMARY (verbatim — S107_SUMMARY.md)

S107 — §22 FIGURES INTO MASTERS + EDIT PASS (v1.1 → v1.2) · July 21, 2026
Inputs read-only: v1_1 EN/FR docx masters; ~/Desktop/S106_capture; GATE_S106_CAPTURE.md;
GATE_S103_SHOTLIST.md (added, placement authority); GATE_S104_L5_REGIONS.md (added, edit-d authority).
Outputs (new files only): ~/Desktop/S107_v1_2_output/ — Users_Guide_v1_2_EN.docx/.pdf,
Guide_Utilisateur_v1_2_FR.docx/.pdf. No git. No DFO endpoint. v1_1 masters unmodified.

TEXT EDITS (EN 27 / FR 27 replacements, mirrored):
(a) §3.1 (old 4.1) rewritten to red header pill — EN "DFO ELOG", FR « JBE MPO » (rendered labels,
    bold per doc convention); F06 caption rewritten. [S106 §5.1] — 3/3.
(b) §3↔§4 reorder (Activation before Captain Profile), 7 heading renumbers per language, profile
    entry step rewritten to logs-list → Profile/« Profil » button. [S106 §5.2; F08 frames] — 9/9.
(c) Reviewer note at §3.3, italic: demo/reviewer accounts activate without purchase.
    FR « examinateurs du MPO / comptes d'examen » (answer key: MPO enrollment page « l'examen
    technique », founder-confirmed). [S106 §5.2] — 1/1.
(d) F07 captions: EN drops "ELOG Key" field claim; FR = Option A descriptive
    « Écran de configuration du JBE du MPO … » [S104 FLAG A]. §3.2 ELOG-key step deleted;
    key documented in §4.2 profile field list (EN "ELOG Key — provided by DFO…",
    FR « Clé JBE — fournie par le MPO… », per S104 J5 + doc §7 verb). — 3/3.
(e) F01 slot kept as placeholder + pending note both languages (store-listing capture at public
    launch). — 1/1.
(f) Flow restructure: new §2.2 Choose your language / §2.3 Log in (F00a/F00b promoted);
    Privacy Notice → §3.4 "First activation…", Attestation → §3.5, timing lines pinned to code.
    — 10/10.

S107 RULINGS (with evidence chains):
R1. ELOG-key relocation (§3.2 → §4.2): setup screen has no key field. Evidence: S104 FLAG B
    (code recon) + F07_EN-01/02, F07_FR-01/02 canonical frames. Same doc-vs-app class as F06.
R2. F01 remains a noted pending slot in the submitted package: the DFO ELOG store listing cannot
    exist pre-qualification (public-wording guardrail); capture moves to public launch.
R3. Figure counts disputed twice (Claude.ai enumeration challenge, then founder hand count of 24 EN);
    resolved by terminal ls against the live folder: 25 EN / 26 FR canonical confirmed, document
    unchanged. Claude's refusal to delete under challenge was correct.
R4. FLOW-RESTRUCTURE (reinstated after initial flag): real flow is language → log in → pill →
    setup → Activate → Privacy Notice (once per device) → Attestation (once per app process) →
    logs list. Evidence: DfoLogsListScreen.tsx 744–767 (Privacy modal, logs-list only,
    privacyChecked && !privacyAccepted), captainStorage.ts 81–97 (@lobsterlog:privacy_accepted,
    persisted once, never reset), DfoLogsListScreen.tsx 33 + 769–782 (attestationShownThisSession,
    once per process), App.tsx (neither at root; DfoLogsListScreen at 646). INDEPENDENTLY VERIFIED
    by Claude under a scoped 3-file read grant. AMENDMENT: supersedes S103 §2.1/§2.5 F02/F03
    "fresh launch" placement and S106 §1's first-launch grouping of the Privacy flag. The frame-
    timestamp argument raised against the restructure was invalid (captures ran in shot-list
    order, not flow order). Founder testimony vindicated over the written record.
R5. F00c/F00d (Create Account / Check Inbox) considered omission: reviewer logs in with provided
    credentials, never signs up. Sign-up intentionally undocumented in §22.
R6. Wording pins: Privacy "first time you open your DFO Logs list after activating; once per
    device"; Attestation "each time you restart the app and open the DFO ELOG section".
R7. Naming drift ACCEPTED AS RESIDUAL, both languages: doc "DFO Logs"/« Journaux du MPO » vs
    rendered "DFO ELOGs"/« Journaux JBE MPO »; doc "+ button" vs rendered "Fill Out New ELOG"/
    « Remplir un nouveau journal JBE ». Symmetric EN/FR (F08 frames). Descriptive prose, no false
    path; rendered titles queued for possible consolidation post-submission. Recorded alongside
    the T17/T24 residual class; revisit at identity-label consolidation.

FIGURES: EN 27 images / FR 28 across 17 filled slots + F01 pending, counts asserted against disk
pre-insertion (disk = S106 §4 = plan). Multi-part figures lettered (a)(b)… under shared captions,
unstitched, 2.8" display width; FR F02 ×3 vs EN ×2 per S106. Complete caption-by-caption walk with
SHA-256 source matching: EN 27/27, FR 28/28 — ALL PASS. Document figure order: F01(pending), F00a,
F00b, F06, F07, F02, F03, F04, F05, F08–F16.

VERSION SWEEP (every occurrence): EN title page "Version 1.1|…" → 1.2; EN footer "v1.1 · July 2026"
→ v1.2; FR title page "Version 1.1|…" → 1.2; FR footer "v1.1 · juillet 2026" → v1.2. App Version
1.8.6 untouched. Residual v1.1: none (docx body/headers/footers + PDF text greps clean).

EXPORTS: ToCs refreshed via LibreOffice UNO index update; PDFs EN 38 pp / FR 42 pp; new §2.2/§3.4
headings + v1.2 footers confirmed in PDF text; figure rendering visually verified (EN pp. 5/7/11/32,
FR pp. 5/7/13). Docx carry updateFields flag (Word re-paginates ToC on open).

FLAGS (noticed, not acted):
- S106_capture folder state: bridge listing (live path /Users/jonny/Desktop/S106_capture) shows
  105 non-hidden entries, all files, NO rejects/ subfolder — S106 gate recorded "ls = 105 entries"
  including rejects/. Discrepancy unresolved; canonical F-files unaffected (all present,
  hash-verified). Asterisk on "disk is authority" claims for this folder.
- F00a_Language EN and FR files are byte-identical on disk (bilingual screen) — expected, noted.
- App-internal setup hint text still says to fill Captain Profile before activating (S106 §5.2) —
  Aug/Sept pile, unchanged. Guide no longer mirrors the contradiction.

---

## CLOSING AMENDMENTS (S107)

**(i) S106 finding count correction.** The GATE_S106_CAPTURE.md "8 findings" tally is corrected to
**7**. The prior count of 8 was an over-count; the authoritative finding count of record for S106 is 7.

**(ii) S106_capture rejects/ subfolder resolved.** The FLAGS-section discrepancy above regarding the
`rejects/` subfolder is resolved: the founder **deleted the `rejects/` subfolder post-S106**. The
live listing of **105 files** (no `rejects/` present) is therefore **correct**, not a discrepancy.
The asterisk on "disk is authority" claims for the `~/Desktop/S106_capture` folder is **removed** —
disk is authoritative for that folder.

---

*Doc-card walk re-run deferred to S108 sim session.*
