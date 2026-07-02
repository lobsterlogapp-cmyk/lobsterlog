# GATE 2 — Wire the 222 marine-mammal reference trio (Session 90, Phase 2)

Wired the three previously-dead MV_* tables into Form 222: ID_CNFDNCE_ID,
SPCMN_COND_ID, BDY_LEN_ID (all XSD minOccurs=0). No commit.

Tables used (the 222 marine-mammal tables, NOT the SAR-side MV_SPECIMENS_CONDITION):
- MV_CONFIDENCE_LEVEL (4 rows: Certain/Probable/Possible/Uncertain) → ID_CNFDNCE_ID
- MV_MM_SPECIMENS_CONDITION (5 rows: Dead/Appears healthy/Sick/Unknown/Injured) → SPCMN_COND_ID
- MV_MM_LENGTH_CATEGORY (9 rows: length bands + Other) → BDY_LEN_ID

## dfoForm222Generator.ts

- Imported the three tables from ../data/reftables.
- Added three label lists mirroring MARINE_MAMMAL_SPECIES / INTERACTION_TYPES:
  CONFIDENCE_LEVELS / SPECIMEN_CONDITIONS / LENGTH_CATEGORIES (+ *_LABELS), each
  `{ label: descEn, codeId: String(codeId) }`. Commented that SPECIMEN_CONDITIONS is the
  marine-mammal table, not the SAR MV_SPECIMENS_CONDITION.
- Form222Entry: added three OPTIONAL fields — confidenceLabel?, specimenCondLabel?,
  lengthCatLabel? (XSD minOccurs=0).
- Emission: inside the `interactInd === 'Y'` block, resolve each label → codeId and emit via
  `tag()` (which omits empty). Placed in XSD sequence order:
  `GEAR_DMG_IND → NOAA_SPECIE_COD → ID_CNFDNCE_ID → SPCMN_COND_ID → NB_SPCMN_BEST → BDY_LEN_ID`.
  Verified against the 39588.222 XSD (lines 247–259): NOAA_SPECIE_COD → SPCMN_DSC →
  ID_CNFDNCE_ID → SPCMN_COND_ID → NB_SPCMN_MIN/MAX/BEST → … → BDY_LEN_ID. An unset field
  resolves to '' and tag() drops it — clean omission, no empty element.

## Form222Screen.tsx

- Imported CONFIDENCE_LEVEL_LABELS / SPECIMEN_CONDITION_LABELS / LENGTH_CATEGORY_LABELS.
- FormState + EMPTY_FORM: added the three fields (string, default '').
- Added three open-state hooks (confidenceOpen / specimenCondOpen / lengthCatOpen) and
  extended renderDropdown's onPress to close them too (all five dropdowns stay mutually
  exclusive).
- Entry build: pass the three form values onto the entry.
- Rendered three renderDropdown pickers in the existing "Species & numbers" card, right
  after the interaction-type picker (moved the isLast marker onto the last new picker,
  BODY LENGTH). They live in the interactInd !== 'N' branch, so they only show when an
  interaction is reported. The picker option rows come straight from the reftables' descEn;
  the reftables' descFr means the OPTIONS are already bilingual — only the field labels
  needed new i18n keys.

## i18n

- en/dfo.json form222: added 6 keys — confidenceLabel "IDENTIFICATION CONFIDENCE" /
  confidencePlaceholder, specimenCondLabel "SPECIMEN CONDITION" / specimenCondPlaceholder,
  lengthCatLabel "BODY LENGTH" / lengthCatPlaceholder. No `*` (fields are optional).
- fr/dfo.json form222: added the same 6 keys as `_todo` stubs (English text + " _todo"
  marker) so the keys exist and are obviously-untranslated, into the existing 222 FR pile
  for the proofreader batch. NOT translated here per instruction.

## Verification

- tsc: 33/33 (baseline held, zero new).
- jest full suite: 17 suites passed, 55 tests passed.
- Temp recon harness (deleted after) generated a 222 with the trio set and one without:
  - Element order confirmed: ID_CNFDNCE_ID(622) < SPCMN_COND_ID(663) < NB_SPCMN_BEST(704)
    < BDY_LEN_ID(741) — ascending, XSD-correct.
  - codeId resolution confirmed: Probable→39598, Injured→39622, "1 m - 1.5 m (3-5 ft)"→39602.
  - xmllint against 39588.222 XSD: WITH trio → validates; WITHOUT trio (all three unset) →
    validates. Both schema-valid.
  - Bonus: the same doc confirmed the Phase C clamp on the 222 path (43.8237491→43.8237,
    -65.6353660736118→-65.6354).

## Device-test note

No live send performed (222 UAT is a separate path from the 234 outage, but I did not POST
anything per standing instruction). On device: open Form 222, set INTERACT_IND = Y, and the
"Species & numbers" card now shows three optional pickers — IDENTIFICATION CONFIDENCE,
SPECIMEN CONDITION, BODY LENGTH. Set them and submit; the sent XML should carry
ID_CNFDNCE_ID / SPCMN_COND_ID / BDY_LEN_ID (in that XSD order); leave them blank and those
three elements are absent.

## Files changed (Phase 2)

- src/utils/dfoForm222Generator.ts — imports, 3 label lists, 3 optional Form222Entry fields,
  emission in XSD order.
- src/screens/Form222Screen.tsx — imports, FormState/EMPTY_FORM, 3 open-states, renderDropdown
  onPress, entry build, 3 pickers.
- src/i18n/locales/en/dfo.json — 6 EN keys.
- src/i18n/locales/fr/dfo.json — 6 FR _todo stubs.
