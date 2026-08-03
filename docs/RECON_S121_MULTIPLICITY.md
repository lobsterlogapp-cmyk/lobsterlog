# RECON S121 — MULTIPLICITY / REPEATING NODES (234 + 222)

**Date:** 2026-08-03 · **Session:** S121 · **Type:** RECON ONLY — no code changed, no git run, no DFO POST.

## Question

For a single trip/log, which nodes does DFO allow to **repeat**, and does the app let the user
**ADD** more than one *and* the generator **EMIT** more than one? Hunting the gap class:
**DFO allows many, the app offers one.**

## Authorities

- **What DFO allows** — the XSDs (maxOccurs), quoted verbatim below:
  - 234: `~/Desktop/DFO/ELOG_F234/39673.234.NATIONAL - ELOG - Logbook - Lobster - JBE - Journal de bord - Homard_20260624 000000.xsd` (the 234.12 XSD, filename date 20260624)
  - 222: `~/Desktop/DFO/ELOG_F222/39588.222.NATIONAL - ELOG - Marine mammal interaction form - JBE - Formulaire d'interaction avec un mammifäre marin_20260108 000000.xsd`
  - **No XSD is bundled in the repo** (`find` across the working tree excluding node_modules returns zero `.xsd` files) — the DFO-folder copies are the sole authority on disk.
- **What the app does** — `src/components/FullDfoForm.tsx` + `src/utils/dfoXmlGenerator.ts` (234); `src/screens/Form222Screen.tsx` + `src/utils/dfoForm222Generator.ts` (222). All line refs verified against the working tree this session.

---

## TASK 1 — XSD occurrence bounds (verbatim quotes)

### 234 (39673, XSD …20260624)

Under `<xs:element name="ELOG">` (XSD lines 405–413):

```
<xs:element name="GENERAL_INFO"  minOccurs="1" maxOccurs="1"         type="general_info_type"/>
<xs:element name="TRIP"          minOccurs="1" maxOccurs="unbounded" type="trip_type"/>
```

`trip_type` repeating children (XSD lines 224–231) — **every data group under TRIP is unbounded**:

```
<xs:element name="BAIT_USED"             minOccurs="0" maxOccurs="unbounded" type="bait_used_type" />
<xs:element name="SAR"                   minOccurs="0" maxOccurs="unbounded" type="sar_type"/>
<xs:element name="HLIN"                  minOccurs="0" maxOccurs="unbounded" type="hlin_type"/>
<xs:element name="HLOUT"                 minOccurs="0" maxOccurs="unbounded" type="hlout_type"/>
<xs:element name="PCONS"                 minOccurs="0" maxOccurs="unbounded" type="pcons_type"/>
<xs:element name="EFFORT"                minOccurs="0" maxOccurs="unbounded" type="effort_type"/>
<xs:element name="LANDING"               minOccurs="0" maxOccurs="unbounded" type="landing_type"/>
<xs:element name="TRANSFER"              minOccurs="0" maxOccurs="unbounded" type="transfer_type"/>
```

Inside `effort_type` (XSD lines 309–310):

```
<xs:element name="TGT_SPECIES"           minOccurs="1" maxOccurs="1" type="tgt_species_type"/>
<xs:element name="EFFORT_BY_GEAR"        minOccurs="1" maxOccurs="unbounded" type="effort_by_gear_type"/>
```

Inside `effort_by_gear_type` (XSD line 328):

```
<xs:element name="EFFORT_DETAIL"         minOccurs="1" maxOccurs="9999" type="effort_detail_type"/>
```

Inside `effort_detail_type` (XSD line 348) — and note LGRID_ID/GRID_ID live HERE (lines 339–340), so "multiple grids" = multiple EFFORT_DETAIL (or multiple EFFORT) nodes:

```
<xs:element name="LGRID_ID"              minOccurs="0" maxOccurs="1" type="integer_10"/>
<xs:element name="GRID_ID"               minOccurs="0" maxOccurs="1" type="integer_10"/>
...
<xs:element name="CATCH"                 minOccurs="1" maxOccurs="unbounded" type="catch_type"/>
```

Inside `transfer_type` (XSD line 389):

```
<xs:element name="TRANSFER_DTL"          minOccurs="1" maxOccurs="unbounded" type="transfer_dtl_type"/>
```

Non-repeating for completeness: `LOST_GEAR_IND` is Blocked (`minOccurs="0" maxOccurs="0"`, XSD line 304 — the S92/S93 finding, unchanged). No other element under TRIP has maxOccurs > 1 beyond those quoted; all scalar members are maxOccurs="1".

### 222 (39588, XSD …20260108)

Under `<xs:element name="ELOG">` (XSD lines 273–274):

```
<xs:element name="GENERAL_INFO"  minOccurs="1" maxOccurs="1"         type="general_info_type"/>
<xs:element name="MM_INTER"      minOccurs="1" maxOccurs="unbounded" type="MMinter_type"/>
```

Inside `MMinter_type` (XSD line 265):

```
<xs:element name="MM_INTER_INCDNT"       minOccurs="0" maxOccurs="unbounded" type="MMinter_incdnt_type"/>
```

Those are the ONLY two repeating elements in the 222 XSD — everything else is maxOccurs="1".

---

## TASK 2 — APP UI (what the user can add)

### FullDfoForm.tsx (234)

The form's entire effort/catch/incident surface is **single scalar state** — one value per
field, no arrays, no "add another" — except bait and bycatch:

| Node | UI | Evidence |
|---|---|---|
| TRIP | SINGLE — one form = one trip/log | whole-screen design; one `DfoLog` per save |
| EFFORT (incl. dates/times) | SINGLE | scalar state: `timeStartedHauling`/`timeStoppedHauling` `src/components/FullDfoForm.tsx:208-209`, `fmaId` `:182` |
| EFFORT_DETAIL (grid, traps, soak, coords) | SINGLE | scalar state: `lgridCodeId` `:183`, `gridId` `:192`, `trapHauls` `:197`, `soakDuration` `:218`, `gpsLat`/`gpsLng` `:224-225`, `statSectId` `:188`, `trapSize` `:246` — one of each, no list, no add button |
| CATCH | SINGLE — one lobster weight | `catchWeight` `:196`, `nbSpcmnBrd` `:287`, `nbSpcmnKept` `:290` (scalars) |
| BAIT_USED | **MULTIPLE** | `baitEntries` array state `:220`; `.map()` render `:1710`; "Add bait" button `:1726` (bottom-sheet add flow `:2018`) |
| PCONS (bycatch + personal use) | **MULTIPLE** (bycatch) + one personal-use field | `bycatchEntries` array state `:221`; `.map()` render `:1789`; "Add bycatch" button `:1808`; `personalUse` scalar `:232` |
| SAR | SINGLE | one Y/N + one field set: `sarYes` `:344`, `sarSpecies` `:345`, `sarLat`/`sarLng` `:348-349`, `sarNbSpcmn` `:355`, `sarCondId` `:356` — no array, no add |
| HLIN | SINGLE | `hlinCompany`/`hlinConfirmNo`/`hlinEta`/`hlinTotalWeight` scalars `:291-294` |
| HLOUT | SINGLE | `hloutCompany`/`hloutConfirmNo` scalars `:295-296` |
| LANDING | SINGLE | `timeOfLanding` `:210`, `landingDate` `:217`, `portLandedCodeId` `:205` (scalars) |
| TRANSFER / TRANSFER_DTL | SINGLE (QC-88 only) | `transferYes` `:234`, `transferTime`/`transferWt`/`transferToVrn`/`transferToPndNum` scalars `:236-239` — one transfer, one detail |

(`crewMembers` `:202` is an array, but it feeds only the `CREW_NB` count — not a repeating XSD node.)

### Form222Screen.tsx (222)

| Node | UI | Evidence |
|---|---|---|
| MM_INTER | SINGLE per submission | one `form` object `src/screens/Form222Screen.tsx:161` (`useState<FormState>(EMPTY_FORM)`); `handleSubmit` `:294` builds exactly one `Form222Entry` `:332` → one file with one MM_INTER. A user CAN log two separate interactions only as **two separate submissions/files** — never two MM_INTER nodes in one file. |
| MM_INTER_INCDNT | **MULTIPLE — but outcomes, not interactions** | one interaction-type dropdown `:698-703` + Y/N outcome toggles injury/death/entangle `:754-756`. No way to enter a second interaction's details. |

**Clarification requested by the task:** the file already observed with **three `MM_INTER_INCDNT` nodes**
was ONE interaction with multiple outcome flags. The generator (see Task 3) derives the node
set as {selected interaction type} ∪ {entangle→39610} ∪ {injury→39615} ∪ {death→39609},
deduplicated — e.g. type "Entanglement" + injury=Y + death=Y = 3 nodes. It is **not** possible
to log two genuinely separate interactions (different times/places/species) in one 222 file;
the workaround is two submissions, which the app supports (each send is its own entry + file).

---

## TASK 3 — GENERATOR (what gets emitted)

### dfoXmlGenerator.ts (234) — `generateElogXml()`

| Node | Emit | Evidence |
|---|---|---|
| TRIP | ONE — hardcoded single `<TRIP>` in the return template | `src/utils/dfoXmlGenerator.ts:431-435` |
| EFFORT | ONE — single string-built block, comment says "single effort per log" | `:229-234` (open) … `:338` (close) |
| EFFORT_BY_GEAR | ONE | `:251` (open), `:337` (close) — hardcoded, one GEAR_ID 925 |
| EFFORT_DETAIL | ONE | `:258` (open), `:336` (close) — hardcoded; `GEAR_GRP_NUM` hardcoded `'1'` at `:290` ("always 1 for single-effort log") |
| CATCH | ONE — lobster (SPECIE_ID 1312) only | `:317-335` — hardcoded single block; bycatch is routed to PCONS instead |
| BAIT_USED | **MANY** — `entries.map()` over the bait array | `:116-133` |
| PCONS | **MANY** — loop over bycatch entries + optional personal-use node | `:143-166` (loop), `:168-183` (personal use) |
| SAR | ONE — single block gated `sarInc === 'Y'` | `:348-360` |
| HLIN | ONE (FMA 38b/41 only) | `:363-375` |
| HLOUT | ONE (FMA 38b/41 only) | `:376-384` |
| LANDING | ONE — gated on a landing timestamp | `:389-401` |
| TRANSFER / TRANSFER_DTL | ONE + ONE (QC-88 only) | `:406-427` (one TRANSFER `:410`, one nested TRANSFER_DTL `:419-424`) |

Note: the app's own structural validator MIRRORS the XSD bounds, not the generator's limits —
`TRIP_SPEC` allows `EFFORT`/`SAR`/`LANDING`/`TRANSFER` etc. `max: Infinity` (`:614`, `:580`, `:615`, `:625`),
`EFFORT_BY_GEAR max: Infinity` (`:551`), `EFFORT_DETAIL max: 9999` (`:555`), `CATCH max: Infinity` (`:533`).
So multi-node documents would PASS local validation; the lock to one is purely UI + generator.

### dfoForm222Generator.ts (222) — `generateForm222Xml()`

| Node | Emit | Evidence |
|---|---|---|
| MM_INTER | ONE — single string-built block per entry/file | `src/utils/dfoForm222Generator.ts:160` (open) … `:228` (close) |
| MM_INTER_INCDNT | **MANY** — loop over a deduplicated Set of incident-type codes: selected type first, then entangle/injury/death-implied codes (39610/39615/39609); INCDNT_REM rides the first node only | `:213-225` |

---

## TASK 4 — RECONCILE

| Node | XSD maxOccurs | UI adds many? | Generator emits many? | VERDICT |
|---|---|---|---|---|
| **234** EFFORT | `unbounded` | NO | NO (one, hardcoded) | **GAP #1** |
| **234** EFFORT_DETAIL | `9999` | NO | NO (one, hardcoded; GEAR_GRP_NUM pinned "1") | **GAP #1** (same gap — this is where LGRID_ID/GRID_ID live) |
| **234** CATCH | `unbounded` | NO | NO (one lobster CATCH; bycatch → PCONS) | **GAP #2** (qualified — see below) |
| **234** SAR | `unbounded` | NO | NO (one, gated on SAR_IND=Y) | **GAP #3** |
| **234** TRANSFER | `unbounded` | NO | NO (one, QC-88) | **GAP #4** (QC only) |
| **234** TRANSFER_DTL | `unbounded` | NO | NO (one, lobster-only by Rule 249) | OK-by-rule (Rule 249/250 pin species+form → one DTL is the rule-compliant shape) |
| **234** LANDING | `unbounded` | NO | NO (one) | **GAP #5** (low) |
| **234** HLIN | `unbounded` | NO | NO (one, FMA 38b/41) | **GAP #6** (low) |
| **234** HLOUT | `unbounded` | NO | NO (one, FMA 38b/41) | **GAP #6** (low) |
| **234** BAIT_USED | `unbounded` | **YES** (Add bait) | **YES** (map) | **OK** |
| **234** PCONS | `unbounded` | **YES** (Add bycatch) | **YES** (loop + personal-use) | **OK** |
| **234** EFFORT_BY_GEAR | `unbounded` | NO | NO (one) | OK-in-practice (lobster app has exactly one gear, GEAR_ID 925 hardcoded; a second gear type has no meaning here) |
| **234** TRIP | `unbounded` | NO (one log = one trip) | NO (one) | OK-by-design (each trip is its own file/send; DFO has accepted every single-trip file — no driver for multi-trip files) |
| **222** MM_INTER | `unbounded` | NO (one interaction per submission) | NO (one per file) | OK-with-caveat (two separate interactions = two submissions/two files; supported, but a user must know to file twice) |
| **222** MM_INTER_INCDNT | `unbounded` | YES (outcome toggles, not separate incidents) | **YES** (dedup'd code loop) | **OK** for multiple *outcomes* of one interaction — the confirmed reading of the existing 3-node file. Distinct *interactions* are handled at the MM_INTER/file level (row above). |

### GAP ranking — likelihood of hitting a real LFA 34 (MAR-90) harvester

1. **GAP #1 — multiple grids in one day (EFFORT / EFFORT_DETAIL locked to 1).** THE gap.
   A MAR boat fishing two Settlement Grids in one day cannot represent it: `LGRID_ID` is
   `maxOccurs=1` *within* an EFFORT_DETAIL, so a second grid REQUIRES a second EFFORT_DETAIL
   (XSD allows 9999 under one EFFORT_BY_GEAR — each with its own NB_GEAR_HLD, GEAR_GRP_NUM,
   grid, coords, and its own CATCH) or a second EFFORT. UI has one grid picker, one trap-haul
   count, one catch weight; generator hardcodes one of each with `GEAR_GRP_NUM=1`. Today the
   only recourse is lumping all grids' effort/catch under one grid — a data-accuracy problem,
   not a rejection (the single-node file is schema-valid). Same story for QC `GRID_ID` (also
   an EFFORT_DETAIL child, line 340). The DFO fact-sheet Rule 609x ("GEAR_GRP_NUM sequential
   from 1 per EFFORT node") presumes multiple gear groups exist — DFO clearly anticipates
   this shape.
2. **GAP #2 — multiple CATCH per effort detail (locked to 1, lobster).** Qualified: the app
   deliberately routes non-lobster species through PCONS per the Subforms requirements
   whitelists (S109 recon, Rules 974a-c/975a-c — CATCH-vs-PCONS species routing is DFO's own
   split). For species DFO's CATCH whitelist puts in CATCH (not PCONS), the app has no path —
   this overlaps the known "off-MAR bycatch/pcons 36-vs-2" open item. Whether any LFA 34
   (MAR) species is CATCH-whitelisted beyond lobster: **UNVERIFIED** in this recon (needs the
   Subforms_requirements_234.xlsx CATCH rows read against the MAR species list; out of scope
   here). Rank #2 because discarded/v-notched lobster counts (`NB_SPCMN_DISC` exists in
   catch_type, never emitted) and any second CATCH species both land here.
3. **GAP #3 — multiple SAR encounters in one trip (locked to 1).** XSD allows unbounded; a
   trip with two species-at-risk encounters (or two encounters of the same species at
   different positions) can record only one. Plausible in LFA 34 (leatherback + whale in one
   day is unusual but real). Low frequency, but a compliance-visible node.
4. **GAP #4 — multiple TRANSFER (locked to 1).** QC-88 only — zero LFA 34 exposure. A QC
   boat transferring to two ponds/vessels in one trip cannot record both.
5. **GAP #5 — multiple LANDING (locked to 1).** Partial offload at two ports in one trip is
   rare for a day-trip lobster fishery; near-zero LFA 34 likelihood.
6. **GAP #6 — multiple HLIN/HLOUT (locked to 1 each).** FMA 38b/41 only (not LFA 34), and
   one hail-in + one hail-out per trip is the operational norm.

### Non-gaps worth restating

- **BAIT_USED and PCONS are fully plumbed for multiplicity** — the only two nodes where UI,
  generator, and XSD all agree on "many". They are the in-repo template (array state → map
  render → add button → generator loop) for closing GAP #1/#2/#3.
- **222 three-incident file explained:** outcomes of ONE interaction
  (`dfoForm222Generator.ts:213-225` — selected type + entangle/injury/death implied codes,
  deduplicated). Two genuinely separate interactions are two submissions → two files, each
  schema-valid (MM_INTER is minOccurs=1 per file). No emit change needed; at most a UX note.
- **The local 234 validator already accepts multi-node documents** (specs mirror the XSD
  bounds) — a future multiplicity build changes UI + generator only; the S4 validator needs
  no relaxation, only new overlay rules if per-node subform gates apply per-instance.

*Report ends. No code changed; no git run; no DFO endpoint touched.*
