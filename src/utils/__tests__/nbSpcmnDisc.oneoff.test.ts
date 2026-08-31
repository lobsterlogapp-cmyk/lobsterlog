// ONE-OFF (Session 154 U2 guard test): CATCH.NB_SPCMN_DISC per region —
// Subforms_requirements_234.xlsx row 95, Element_id 197 (Optional QC-88 / Blocked GLF-89 /
// Blocked MAR-90 / Optional NL-91), confirmed in the French sheet and in the pre-2026-08-14
// package, and read off the LABEL CELL rather than a remembered row number.
//
// DFO authority behind each assertion:
//   • XSD catch_type (…Homard_20260624.xsd:353-366) — the slot is after NB_SPCMN_KEPT and
//     before SPECIE_FRM_ID; type integer_04 = 0…9999 (:132-137), minOccurs=0.
//   • Rule 789 (FS-NAT-234-12-EN:370-380 / FR:400-410) names NB_SPCMN_DISC in its CATCH row:
//     "If the user wants to declare a quantity (0 or greater than 0) using this element, then
//     the value must be entered manually by the user. A null or empty value must not be
//     interpreted as a 0 by the client application."  → S154 R1: a typed 0 GOES, a blank does
//     NOT. That behaviour currently falls out of how tag() works; these tests PIN it, because
//     a fix nothing can detect is a fix nothing protects.
//   • Rule 630 pairs it with KEPT_WT as an either/or, already satisfied on every lobster catch
//     by Rule 631 — so this element is never mandatory here. No mandatory-direction test exists
//     because there is no mandatory direction.
//
// Mirrors the fixture/injection style of nbSpcmnKept.oneoff.test.ts.
import { generateElogXml, validateElogXml } from '../dfoXmlGenerator';
import {
  fieldRequirement,
  isFieldRequired,
  missingInContainer,
  containerProgress,
  RequirementContext,
  FieldValues,
} from '../dfoRequirements';
import { DFO_SUBFORM_FIELD_CONFIG } from '../dfoConstants';
import { closeAllGroups } from './support/closeAllGroups';

const profile: any = {
  operatorName: 'Test Operator',
  vesselNumber: '123456',
  dfoLicenceNo: '300123',
  dfoFin: '123456789',
  fishingNumber: '300123',
  licenceHolderFin: '123456789',
  units: 'lbs',
  language: 'en',
};

function baseLog(subformId: number, regId: number): any {
  return {
    id: `test-log-${subformId}`,
    dateFished: '2026-06-10',
    lgbkUid: 'ABCDEF',
    firstEntryDt: '2026-06-10T08:55:00.000Z',
    sentToDfo: false,
    subformId,
    regId,
    data: {
      timeSailed: '05:30',
      timeStartedHauling: '06:00',
      timeStoppedHauling: '13:30',
      timeOfLanding: '14:45',
      crewRegistry: '[]',
      catchWeight: '500',
      trapHauls: '250',
      bycatchEntries: '[]',
      personalUse: '10',
      dgClosePcons: '2026-06-10T15:00:00.000Z',
      mmYes: 'false',
      sarYes: 'false',
      lostGearYes: 'false',
      hlinCompany: '',
      hlinConfirmNo: '',
      hloutCompany: '',
      hloutConfirmNo: '',
    },
  };
}

// Minimal region-appropriate fixtures (same overrides as genSampleAllSubforms / nbSpcmnKept).
function makeLog(subformId: number): any {
  if (subformId === 88) {
    const log = baseLog(88, 1006);
    log.data.fmaId = '25640';
    log.data.crewRegistry = JSON.stringify(['Crew One', 'Crew Two']);
    log.data.departurePort = 'RIMOUSKI';
    log.data.departurePortCodeId = '22648';
    log.data.portLanded = 'RIMOUSKI';
    log.data.portLandedCodeId = '22648';
    log.data.soakDuration = '2';
    log.data.baitEntries = JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]);
    log.data.gpsLat = '48.4488';
    log.data.gpsLng = '-68.5236';
    log.data.gpsSrc = 'gps';
    // QC-88 only: the carrier/partnership/transfer answers (Rules 639/641/642, PRTNSHP_ID
    // required for QC). Copied from the nbSpcmnKept fixture — without them the document is
    // invalid for reasons that have nothing to do with this element, and `valid` could never
    // be asserted. Their absence is what the first run of this test caught.
    log.data.useCrInd = 'Y';
    log.data.carrierVrn = '106460';
    log.data.prtnshpId = '39468';
    log.data.transferYes = 'true';
    log.data.transferTime = '15:00';
    log.data.transferWt = '50';
    // S154D R1: Rule 251 needs a SOURCE too, and the app no longer supplies one from the
    // profile. Without this the document is invalid for a reason that has nothing to do with
    // NB_SPCMN_DISC — the same trap the comment above records for the carrier/partnership.
    log.data.transferFromVrn = '106462';
    log.data.transferToVrn = '106461';
    return log;
  }
  if (subformId === 89) {
    const log = baseLog(89, 1014);
    log.data.fmaId = '1526';
    log.data.portLanded = 'ABOITEAU';
    log.data.portLandedCodeId = '19322';
    log.data.soakDuration = '2';
    log.data.baitEntries = JSON.stringify([{ type: 'Squid, Illex', lbs: '100' }]);
    log.data.gpsLat = '46.2412';
    log.data.gpsLng = '-64.5433';
    log.data.gpsSrc = 'manual';
    return log;
  }
  if (subformId === 90) {
    const log = baseLog(90, 1004);
    log.data.fmaId = '28599';
    log.data.portLanded = "ABBOTT'S HARBOUR";
    log.data.portLandedCodeId = '20913';
    log.data.crewRegistry = JSON.stringify(['Crew One', 'Crew Two']);
    log.data.lgridCodeId = '101';
    log.data.gpsLat = '44.1234';
    log.data.gpsLng = '-66.5432';
    log.data.gpsSrc = 'gps';
    log.data.nbSpcmnBrd = '3';
    log.data.baitEntries = JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]);
    return log;
  }
  // NL-91 — carries its own mandatory NB_SPCMN_KEPT (Rule 976) so the slot ordering can be
  // asserted with BOTH counts present, which is the only place that ordering can go wrong.
  const log = baseLog(91, 1002);
  log.data.fmaId = '2071';
  log.data.departurePort = 'PORT AUX BASQUES (CHANNEL)';
  log.data.departurePortCodeId = '21331';
  log.data.portLanded = 'PORT AUX BASQUES (CHANNEL)';
  log.data.portLandedCodeId = '21331';
  log.data.soakDuration = '2';
  log.data.trapSize = '39682';
  log.data.gearSubtypeId = '39684';
  log.data.nbSpcmnKept = '120';
  log.data.baitEntries = JSON.stringify([{ type: 'Squid, Illex', lbs: '100' }]);
  return log;
}

const GLF_MSG = 'NB_SPCMN_DISC is blocked for GLF(89) (row 95)';
const MAR_MSG = 'NB_SPCMN_DISC is blocked for MAR(90)';
const CAP_MSG = 'NB_SPCMN_DISC must be an integer 0-9999';

/** Inject the element into the CATCH node at its XSD slot — immediately before SPECIE_FRM_ID,
 *  which lands it after NB_SPCMN_KEPT where that is emitted (NL-91) and after KEPT_WT where it
 *  is not (QC-88 / GLF-89 / MAR-90).
 *
 *  ⚠ SCOPED TO THE CATCH BLOCK ON PURPOSE. PCONS also carries a SPECIE_FRM_ID and PCONS is
 *  emitted BEFORE EFFORT in the XSD trip_type sequence, so a bare `.replace()` on the first
 *  SPECIE_FRM_ID silently patches the bycatch node instead — the injected element then sits
 *  somewhere the CATCH-level guards never look, and a blocked-direction test passes for the
 *  wrong reason. Caught while watching these tests fail before the emit existed (S154 P2). */
const inject = (xml: string, value: string) => {
  const start = xml.indexOf('<CATCH>');
  const end = xml.indexOf('</CATCH>', start);
  if (start < 0 || end < 0) throw new Error('inject(): no CATCH node in the generated XML');
  const block = xml.slice(start, end);
  const patched = block.replace(
    /(\n(\s*))<SPECIE_FRM_ID>/,
    `$1<NB_SPCMN_DISC>${value}</NB_SPCMN_DISC>$1<SPECIE_FRM_ID>`,
  );
  if (patched === block) throw new Error('inject(): no SPECIE_FRM_ID inside the CATCH node');
  return xml.slice(0, start) + patched + xml.slice(end);
};

/** The injected element really is inside CATCH, not in the PCONS node that also has a
 *  SPECIE_FRM_ID — asserted rather than assumed, because that is the failure this helper had. */
const injectedInsideCatch = (xml: string) => {
  const c = xml.indexOf('<CATCH>');
  return xml.indexOf('<NB_SPCMN_DISC>') > c && xml.indexOf('<NB_SPCMN_DISC>') < xml.indexOf('</CATCH>', c);
};

// ── The two regions DFO allows ────────────────────────────────────────────────

test('QC-88 WITH a value emits NB_SPCMN_DISC in the XSD slot and passes clean', () => {
  const log = makeLog(88);
  log.data.nbSpcmnDisc = '12';
  const xml = generateElogXml(closeAllGroups(log), profile);
  // NB_SPCMN_KEPT is Blocked on 88 (row 93), so the slot here is KEPT_WT → DISC → SPECIE_FRM_ID
  expect(xml).toMatch(/<KEPT_WT>[^<]*<\/KEPT_WT>\n\s*<NB_SPCMN_DISC>12<\/NB_SPCMN_DISC>\n\s*<SPECIE_FRM_ID>/);
  expect(xml).not.toContain('<NB_SPCMN_KEPT>');

  const { valid, errors } = validateElogXml(xml, 88);
  expect(errors.filter(e => e.includes('NB_SPCMN_DISC'))).toEqual([]);
  expect(valid).toBe(true);
});

test('NL-91 WITH a value emits it AFTER NB_SPCMN_KEPT, before SPECIE_FRM_ID, and passes clean', () => {
  const log = makeLog(91);
  log.data.nbSpcmnDisc = '7';
  const xml = generateElogXml(closeAllGroups(log), profile);
  // Full XSD catch_type order with both counts present — the one place ordering can go wrong
  expect(xml).toMatch(
    /<KEPT_WT>[^<]*<\/KEPT_WT>\n\s*<NB_SPCMN_KEPT>120<\/NB_SPCMN_KEPT>\n\s*<NB_SPCMN_DISC>7<\/NB_SPCMN_DISC>\n\s*<SPECIE_FRM_ID>/,
  );

  const { valid, errors } = validateElogXml(xml, 91);
  expect(errors.filter(e => e.includes('NB_SPCMN_DISC'))).toEqual([]);
  expect(valid).toBe(true);
});

// ── R1: the typed zero, and the blank ─────────────────────────────────────────

test.each([88, 91])('R1 · subform %s: a TYPED ZERO reaches the wire as <NB_SPCMN_DISC>0</NB_SPCMN_DISC>', (sf) => {
  const log = makeLog(sf);
  log.data.nbSpcmnDisc = '0';
  const xml = generateElogXml(closeAllGroups(log), profile);

  // Rule 789: a declared 0 is a real quantity and must survive to the wire.
  expect(xml).toContain('<NB_SPCMN_DISC>0</NB_SPCMN_DISC>');

  const { valid, errors } = validateElogXml(xml, sf);
  expect(errors.filter(e => e.includes('NB_SPCMN_DISC'))).toEqual([]);
  expect(valid).toBe(true);
});

test.each([88, 91])('R1 · subform %s: a BLANK emits no element at all (never laundered into a 0)', (sf) => {
  const log = makeLog(sf); // no nbSpcmnDisc key at all
  expect(generateElogXml(closeAllGroups(log), profile)).not.toContain('NB_SPCMN_DISC');

  const empty = makeLog(sf);
  empty.data.nbSpcmnDisc = '';
  expect(generateElogXml(closeAllGroups(empty), profile)).not.toContain('NB_SPCMN_DISC');

  const spaces = makeLog(sf);
  spaces.data.nbSpcmnDisc = '   ';
  expect(generateElogXml(closeAllGroups(spaces), profile)).not.toContain('NB_SPCMN_DISC');
});

// ── The two regions DFO blocks ────────────────────────────────────────────────

test('GLF-89: a STORED value is never emitted; injection trips the row-95 block (S154 R5)', () => {
  const log = makeLog(89);
  log.data.nbSpcmnDisc = '12'; // stored — must not emit
  const clean = generateElogXml(closeAllGroups(log), profile);
  expect(clean).not.toContain('NB_SPCMN_DISC');

  const injected = inject(clean, '12');
  expect(injected).toContain('<NB_SPCMN_DISC>12</NB_SPCMN_DISC>');
  expect(injectedInsideCatch(injected)).toBe(true);

  const { errors } = validateElogXml(injected, 89);
  expect(errors.some(e => e.includes(GLF_MSG))).toBe(true);
});

test('MAR-90: a STORED value is never emitted; injection still trips the pre-existing MAR guard', () => {
  const log = makeLog(90);
  log.data.nbSpcmnDisc = '12';
  const clean = generateElogXml(closeAllGroups(log), profile);
  expect(clean).not.toContain('NB_SPCMN_DISC');

  const injected = inject(clean, '12');
  expect(injectedInsideCatch(injected)).toBe(true);
  const { errors } = validateElogXml(injected, 90);
  expect(errors.some(e => e.includes(MAR_MSG))).toBe(true);
});

// ── The 0–9999 cap (S154 Option A) — DFO's integer_04 bound, enforced before the send ──

test.each([88, 91])('CAP · subform %s: 10000 is refused — integer_04 stops at 9999', (sf) => {
  const clean = generateElogXml(closeAllGroups(makeLog(sf)), profile);
  const { errors } = validateElogXml(inject(clean, '10000'), sf);
  expect(errors.some(e => e.includes(CAP_MSG))).toBe(true);
});

test.each([88, 91])('CAP · subform %s: 9999 and 0 are both accepted — the bounds are inclusive', (sf) => {
  const clean = generateElogXml(closeAllGroups(makeLog(sf)), profile);
  for (const v of ['9999', '0']) {
    const { errors } = validateElogXml(inject(clean, v), sf);
    expect(errors.filter(e => e.includes('NB_SPCMN_DISC'))).toEqual([]);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// S154 Phase 3 — the requirements table (R2): OPTIONAL, UNMARKED, but a TYPED
// value must be valid, and the check mirrors the send validator's own cap.
// ════════════════════════════════════════════════════════════════════════════

const ctxFor = (subformId: number, fmaId?: number): RequirementContext => ({ subformId, fmaId });

/** A complete effort block per region, so a returned bullet can only be about this field. */
const effortValues = (sf: number): FieldValues =>
  sf === 88
    ? { fmaId: '25640', haulStartTime: '06:00', haulEndTime: '13:30', trapHauls: '250',
        catchWeight: '500', soakDuration: '2', gpsLat: '48.4488', gpsLng: '-68.5236',
        sarInd: 'N', mmInterInd: 'N' }
    : { fmaId: '2071', haulStartTime: '06:00', haulEndTime: '13:30', trapHauls: '250',
        catchWeight: '500', soakDuration: '2', trapSize: '39682', gearSubtypeId: '39684',
        nbSpcmnKept: '120', sarInd: 'N', mmInterInd: 'N' };

const FMA_FOR = { 88: 25640, 91: 2071 } as const;

describe('S154 P3 — the table entry: optional and unmarked (R3)', () => {
  test('the entry exists in the effort container and points at its own label key', () => {
    const e = fieldRequirement('nbSpcmnDisc', 'effort');
    expect(e).toBeDefined();
    expect(e!.labelKey).toBe('form234.nbSpcmnDiscLabel');
    expect(e!.kind).toBe('per-subform');
  });

  test('never required on ANY subform — so no asterisk is ever drawn', () => {
    for (const sf of [88, 89, 90, 91]) {
      expect(isFieldRequired('nbSpcmnDisc', ctxFor(sf))).toBe(false);
    }
  });

  test('row 95 states: optional on 88/91, blocked on 89/90', () => {
    const e = fieldRequirement('nbSpcmnDisc', 'effort')!;
    expect(e.state(ctxFor(88), {})).toBe('optional');
    expect(e.state(ctxFor(91), {})).toBe('optional');
    expect(e.state(ctxFor(89), {})).toBe('blocked');
    expect(e.state(ctxFor(90), {})).toBe('blocked');
  });

  test.each([88, 91])('subform %s: a BLANK produces no bullet — no close-gate demand', (sf) => {
    expect(missingInContainer('effort', ctxFor(sf, FMA_FOR[sf as 88 | 91]),
      { ...effortValues(sf), nbSpcmnDisc: '' })).toEqual([]);
    // and with the key absent entirely
    expect(missingInContainer('effort', ctxFor(sf, FMA_FOR[sf as 88 | 91]),
      effortValues(sf))).toEqual([]);
  });

  test.each([88, 91])('subform %s: the completion meter does not move — optional is never counted', (sf) => {
    const fma = FMA_FOR[sf as 88 | 91];
    const blank = containerProgress('effort', ctxFor(sf, fma), { ...effortValues(sf), nbSpcmnDisc: '' });
    const filled = containerProgress('effort', ctxFor(sf, fma), { ...effortValues(sf), nbSpcmnDisc: '9' });
    const bad = containerProgress('effort', ctxFor(sf, fma), { ...effortValues(sf), nbSpcmnDisc: '10000' });
    expect(filled).toEqual(blank);
    expect(bad).toEqual(blank);
    // …and a complete block still reads as complete, so getCompletionDetails needs no entry
    expect(blank.filled).toBe(blank.total);
  });
});

describe('S154 P3 — a TYPED value must be valid (R2), mirroring the send validator', () => {
  const bullet = (sf: number, v: string) =>
    missingInContainer('effort', ctxFor(sf, FMA_FOR[sf as 88 | 91]),
      { ...effortValues(sf), nbSpcmnDisc: v }).map(m => ({ f: m.fieldKey, r: m.reason }));

  test.each([88, 91])('subform %s: ordinary counts pass', (sf) => {
    for (const v of ['1', '12', '250', '9999']) expect(bullet(sf, v)).toEqual([]);
  });

  test.each([88, 91])('R1 · subform %s: a typed 0 is a real declaration and passes the door', (sf) => {
    expect(bullet(sf, '0')).toEqual([]);
  });

  test.each([88, 91])('subform %s: over DFO’s 0–9999 bound is refused while still editable', (sf) => {
    expect(bullet(sf, '10000')).toEqual([{ f: 'nbSpcmnDisc', r: 'invalid' }]);
  });

  test.each([88, 91])('subform %s: non-numeric, negative and decimal are refused', (sf) => {
    for (const v of ['abc', '-5', '3.5']) {
      expect(bullet(sf, v)).toEqual([{ f: 'nbSpcmnDisc', r: 'invalid' }]);
    }
  });

  test('a BLOCKED region never checks the value — a blocked field is not the door’s business', () => {
    for (const sf of [89, 90]) {
      const ms = missingInContainer('effort', ctxFor(sf, 28599),
        { ...effortValues(91), fmaId: '28599', nbSpcmnDisc: '10000' });
      expect(ms.filter(m => m.fieldKey === 'nbSpcmnDisc')).toEqual([]);
    }
  });
});

describe('S154 P3 — AGREEMENT: the close door refuses exactly what the send door refuses', () => {
  // The whole point of Option A. If these two ever disagree, one of them is wrong.
  const doorRefuses = (v: string) =>
    missingInContainer('effort', ctxFor(88, 25640), { ...effortValues(88), nbSpcmnDisc: v })
      .some(m => m.fieldKey === 'nbSpcmnDisc');

  const sendRefuses = (v: string) => {
    const clean = generateElogXml(closeAllGroups(makeLog(88)), profile);
    return validateElogXml(inject(clean, v), 88).errors.some(e => e.includes(CAP_MSG));
  };

  test.each(['0', '1', '9999', '10000', '99999', 'abc', '-5', '3.5'])(
    'value %p: both doors give the same answer', (v) => {
      expect(doorRefuses(v)).toBe(sendRefuses(v));
    });
});

// ════════════════════════════════════════════════════════════════════════════
// S154 Phase 4 — the render gate and the labels. The three render sites all ask
// isVisible('nbSpcmnDisc'), which reads DFO_SUBFORM_FIELD_CONFIG[subformId].visible,
// so the region test has ONE definition and can be asserted here.
// ════════════════════════════════════════════════════════════════════════════

describe('S154 P4 — the render gate (one region test, three sites)', () => {
  test.each([88, 91])('subform %s: the field is in `visible`, so the box renders', (sf) => {
    expect(DFO_SUBFORM_FIELD_CONFIG[sf].visible).toContain('nbSpcmnDisc');
  });

  test.each([89, 90])('subform %s: the field is ABSENT from `visible`, so nothing renders at all', (sf) => {
    expect(DFO_SUBFORM_FIELD_CONFIG[sf].visible).not.toContain('nbSpcmnDisc');
  });

  test('it is never in `required` — DFO marks it Optional, and the asterisk comes from the table', () => {
    for (const sf of [88, 89, 90, 91]) {
      expect(DFO_SUBFORM_FIELD_CONFIG[sf].required).not.toContain('nbSpcmnDisc');
    }
  });

  test('the config gate and the requirements table agree about every region', () => {
    // shown ⇔ not blocked. A field visible-but-blocked, or blocked-but-hidden, is a defect.
    for (const sf of [88, 89, 90, 91]) {
      const shown = DFO_SUBFORM_FIELD_CONFIG[sf].visible.includes('nbSpcmnDisc');
      const blocked = fieldRequirement('nbSpcmnDisc', 'effort')!.state(ctxFor(sf), {}) === 'blocked';
      expect(shown).toBe(!blocked);
    }
  });
});

describe('S154 P4 — the labels come from DFO’s dictionary', () => {
  const en = require('../../i18n/locales/en/dfo.json');
  const fr = require('../../i18n/locales/fr/dfo.json');

  test('both languages carry the key the table points at', () => {
    expect(en.form234.nbSpcmnDiscLabel).toBeDefined();
    expect(fr.form234.nbSpcmnDiscLabel).toBeDefined();
    expect(fieldRequirement('nbSpcmnDisc', 'effort')!.labelKey).toBe('form234.nbSpcmnDiscLabel');
  });

  test('EN is the dictionary string, uppercased per the app’s field-label convention', () => {
    // XML_dictionary.csv ELEMENT_ID 197 SHORT_DESC_ENG = "Number of specimens discarded"
    expect(en.form234.nbSpcmnDiscLabel).toBe('NUMBER OF SPECIMENS DISCARDED');
  });

  test('FR is the dictionary string, uppercased — two accented characters, no apostrophe', () => {
    // XML_dictionary.csv ELEMENT_ID 197 SHORT_DESC_FRE = « Nombre de spécimens rejetés »
    const v = fr.form234.nbSpcmnDiscLabel;
    expect(v).toBe('NOMBRE DE SPÉCIMENS REJETÉS');
    const nonAscii = [...v].filter(c => c.charCodeAt(0) > 127);
    expect(nonAscii).toEqual(['É', 'É']);
    expect(v).not.toContain("'");   // straight apostrophe — the S131 FR invariant
    expect(v).not.toContain('’'); // curly apostrophe — this label carries none either
  });

  test('the two label sets stay symmetric', () => {
    expect(Object.keys(en.form234).sort()).toEqual(Object.keys(fr.form234).sort());
  });

  test('the bycatch usage picker’s own "Discard" wording is untouched (different node, different meaning)', () => {
    expect(en.form234.usageOption_37820).toBe('Discard');
    expect(fr.form234.usageOption_37820).toBe('Rejet');
  });
});
