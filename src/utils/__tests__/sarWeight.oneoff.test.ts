// S153B — SAR.WT: the field, its storage, and its unit tag.
//
// DFO's authority for this element, all three checked at S153B Phase 0:
//   • XML_dictionary.csv — NODE_NAME 'SAR', ELEMENT_NAME 'WT', ELEMENT_ID 545,
//     ELEMENT_ORDER 7, EN "Total estimated weight" / FR "Poids total estimé",
//     UNIT_OF_MEASURE_ID 59 — the SAME unit of measure as CATCH.KEPT_WT, BAIT_USED.BT_WT,
//     PCONS.WT and TRANSFER_DTL.WT, which is why it inherits every S153 weight ruling.
//   • Subforms_requirements_234.xlsx row 36 — Optional | Optional | Optional | Optional.
//   • The 234.12 XSD, sar_type — WT minOccurs=0 maxOccurs=1 type="weight", sitting between
//     NB_SPCMN and SPCMN_COND_ID.
//
// WHAT THIS SUITE COVERS
//   Phase 1 — the shape of the stored record (both block shapes) and the requirements-table
//             entry: unmarked, no blank demand, meter unmoved, typed value checked.
//   Phase 2 — THE EMIT: the <WT> element, its unit source, its 2dp rounding, its XSD slot,
//             and the byte-identity of a log that carries no SAR weight.
//   Phase 3 — U4, THE COORDINATE CLAMP: SAR LAT/LONG now run through the shared clampCoord4,
//             including the byte-identity property for a coordinate already in clamped form.
//   Phase 4 — U5, DFO RULES 172/173: the species-at-risk coordinate window, narrower than the
//             effort card's, refused at the close door. Boundary tested from both sides.
//   R-c     — check the box only, trim silently: no precision refusal, and the range judged on
//             the CLAMPED value so a position the emit would make legal is not refused.
//
// The two CONVERSION sites (sealSarBlock1Weight, sealSarBlockWeights) and the R8 toggle arm
// are guarded in convertAtClose.oneoff.test.ts, one describe each, so a mutation of any one
// of the four Phase 2 sites fails exactly one named block.
//
// WHAT THIS DOES **NOT** COVER, stated honestly: that FullDfoForm's three SAR close paths call
// the right sealer with the right unit, and that a closed block reads back in the unit it was
// closed in. Neither is reachable from jest — FullDfoForm cannot be rendered here — and both
// must be caught on the walk.

import { sarBlocksFromData, ExtraSarDetail } from '../dfoLogStorage';
import { generateElogXml, validateElogXml } from '../dfoXmlGenerator';
import { clampCoord4 } from '../dfoConstants';
import { closeAllGroups } from './support/closeAllGroups';
import {
  missingInContainer,
  isFieldRequired,
  containerProgress,
  fieldRequirement,
  RequirementContext,
} from '../dfoRequirements';

const ctx = (subformId: number, fmaId: number | null = 28599): RequirementContext =>
  ({ subformId, fmaId } as RequirementContext);

const SUBFORMS = [88, 89, 90, 91];

// A complete, valid SAR block as the close doors see it.
const sarValues = {
  sarDate: '2026-06-10', sarTime: '08:00', sarSpecies: '1234', sarNbSpcmn: '1',
  sarCondId: '5678', sarLat: '44.1234', sarLng: '-66.5432',
};

describe('S153B Phase 1 — SAR.WT storage: block 1 (the flat keys)', () => {
  test('sarBlocksFromData lifts d.sarWt and d.sarCloseUnit onto block 1', () => {
    const [b1] = sarBlocksFromData({
      sarSpecies: '1234', sarWt: '18.143881', sarCloseUnit: 'lbs', sarCloseDt: '2026-06-10T12:00:00.000Z',
    });
    expect(b1.wt).toBe('18.143881');
    expect(b1.closeUnit).toBe('lbs');
  });

  test('a pre-S153B log has neither — undefined, never an invented value', () => {
    const [b1] = sarBlocksFromData({ sarSpecies: '1234', sarNbSpcmn: '1' });
    expect(b1.wt).toBeUndefined();
    expect(b1.closeUnit).toBeUndefined();
  });

  test('a legacy card-closed block (dgCloseSar, no tag) reads as UNTAGGED — R5 pounds', () => {
    const [b1] = sarBlocksFromData({ sarWt: '40', dgCloseSar: '2026-06-10T12:00:00.000Z' });
    expect(b1.wt).toBe('40');
    // No tag was ever written for a card-level close, and storedWeightUnit/closedWeightUnit
    // both read an absent tag as pounds — which is what that number actually is, because no
    // conversion ever ran on it.
    expect(b1.closeUnit).toBeUndefined();
  });

  test('a garbage tag narrows to undefined rather than reaching the emit as itself', () => {
    for (const bad of ['KG', 'kilograms', 'lb', '', 'true']) {
      expect(sarBlocksFromData({ sarWt: '40', sarCloseUnit: bad })[0].closeUnit).toBeUndefined();
    }
    // ...and the two real values survive.
    expect(sarBlocksFromData({ sarCloseUnit: 'kg' })[0].closeUnit).toBe('kg');
    expect(sarBlocksFromData({ sarCloseUnit: 'lbs' })[0].closeUnit).toBe('lbs');
  });
});

describe('S153B Phase 1 — SAR.WT storage: blocks 2+ (ExtraSarDetail)', () => {
  test('each block carries its OWN wt and closeUnit through the reader untouched', () => {
    const extras: ExtraSarDetail[] = [
      { species: '10561', wt: '18.143881', closeUnit: 'lbs', closeDt: '2026-06-10T12:00:00.000Z' },
      { species: '35110', wt: '25', closeUnit: 'kg', closeDt: '2026-06-10T13:00:00.000Z' },
    ];
    const blocks = sarBlocksFromData({ extraSars: JSON.stringify(extras) });
    expect(blocks).toHaveLength(3); // block 1 is always synthesised, even when empty
    expect(blocks[1].wt).toBe('18.143881');
    expect(blocks[1].closeUnit).toBe('lbs');
    expect(blocks[2].wt).toBe('25');
    expect(blocks[2].closeUnit).toBe('kg');
  });

  test('R4 — two blocks of ONE log may carry different units', () => {
    const blocks = sarBlocksFromData({
      sarWt: '40', sarCloseUnit: 'lbs',
      extraSars: JSON.stringify([{ wt: '25', closeUnit: 'kg' }]),
    });
    expect([blocks[0].closeUnit, blocks[1].closeUnit]).toEqual(['lbs', 'kg']);
  });

  test('a block round-trips through JSON with both new fields intact', () => {
    const before: ExtraSarDetail = {
      species: '10561', lat: '44.2', lng: '-66.7', nbSpcmn: '2',
      wt: '12.5', closeUnit: 'kg', closeDt: '2026-06-10T12:00:00.000Z', note: 'n',
    };
    expect(JSON.parse(JSON.stringify(before))).toEqual(before);
  });
});

describe('S153B Phase 1 — SAR.WT is OPTIONAL and UNMARKED (ruling L2)', () => {
  test('never required, on any subform — so no asterisk is ever drawn', () => {
    for (const s of SUBFORMS) {
      expect(isFieldRequired('sarWt', ctx(s), {}, 'sar')).toBe(false);
    }
  });

  test('a BLANK weight produces no bullet — no close-gate demand', () => {
    for (const s of SUBFORMS) {
      expect(missingInContainer('sar', ctx(s), { ...sarValues, sarWt: '' })).toEqual([]);
      expect(missingInContainer('sar', ctx(s), sarValues)).toEqual([]); // key absent entirely
    }
  });

  test('the completion meter does not move — optional entries are not counted', () => {
    const withField = containerProgress('sar', ctx(90), { ...sarValues, sarWt: '' });
    const withValue = containerProgress('sar', ctx(90), { ...sarValues, sarWt: '40' });
    expect(withField).toEqual(withValue);
    // and a complete block still reads as complete
    expect(withField.filled).toBe(withField.total);
  });

  test('the entry exists in the table and points at its own label key', () => {
    const e = fieldRequirement('sarWt', 'sar');
    expect(e).toBeDefined();
    expect(e!.labelKey).toBe('form234.sarWtLabel');
  });
});

describe('S153B Phase 1 — a TYPED weight must be valid (ruling A)', () => {
  const bullet = (v: string) =>
    missingInContainer('sar', ctx(90), { ...sarValues, sarWt: v })
      .map(m => ({ f: m.fieldKey, r: m.reason }));

  test('ordinary weights pass', () => {
    for (const v of ['40', '0.5', '18.14', '999999.999', '250']) {
      expect(bullet(v)).toEqual([]);
    }
  });

  test('Rule 789 — a typed 0 is a real declaration and must pass', () => {
    expect(bullet('0')).toEqual([]);
  });

  test('non-numeric and negative are refused, while still editable', () => {
    expect(bullet('abc')).toEqual([{ f: 'sarWt', r: 'invalid' }]);
    expect(bullet('-5')).toEqual([{ f: 'sarWt', r: 'invalid' }]);
  });

  test('over the XSD weight ceiling is refused', () => {
    expect(bullet('1000000')).toEqual([{ f: 'sarWt', r: 'invalid' }]);
  });

  // THE REASON THIS IS A MAGNITUDE CHECK, NOT A DECIMAL-COUNT CHECK.
  // A closed block stores KILOGRAMS at STORED_KG_DECIMALS (6) places, so 40 lb seals as
  // 18.143881. kgStr rounds to 2 dp at emit, so those decimals never reach the wire and the
  // XSD's 3-decimal pattern is never at risk from them. A three-decimal regex here would
  // refuse a correctly sealed weight — and after S153B the SAR block that holds it is
  // pointerEvents:'none', so the refusal would name a field he cannot reach.
  test('a correctly SEALED weight (kilograms, 6 dp) is NOT refused', () => {
    expect(bullet('18.143881')).toEqual([]);
    expect(bullet('45.359291')).toEqual([]);
  });

  test('the check is scoped to sarWt — a bad weight does not disturb the other SAR bullets', () => {
    const out = missingInContainer('sar', ctx(90), { ...sarValues, sarWt: 'abc', sarSpecies: '' });
    expect(out.map(m => m.fieldKey).sort()).toEqual(['sarSpecies', 'sarWt']);
  });
});

// ── S153B PHASE 2 — THE EMIT ────────────────────────────────────────────────────────────────
// The fourth mutation site. Its own describe, so a break in the generator's WT line fails here
// and not in either sealer's block.

const profile: any = {
  operatorName: 'Test Operator',
  vesselNumber: '123456',
  fishingNumber: '300123',
  licenceHolderFin: '123456789',
  units: 'lbs',
  language: 'en',
};

// MAR-90 / FMA 38b, the genSampleSarS66b base — a log that already validates, with a SAR
// block layered on. Kept in step with that fixture on purpose: the two suites guard the same
// node from different angles.
function sarLog(overrides: Record<string, string> = {}): any {
  return {
    id: 'sar-wt', dateFished: '2026-06-10', lgbkUid: 'ABCDEF',
    firstEntryDt: '2026-06-10T08:55:00.000Z', sentToDfo: false, subformId: 90, regId: 1004,
    data: {
      timeSailed: '05:30', timeStartedHauling: '06:00', timeStoppedHauling: '13:30',
      timeOfLanding: '14:45',
      crewRegistry: JSON.stringify(['Crew One', 'Crew Two']),
      catchWeight: '500', trapHauls: '250', bycatchEntries: '[]',
      personalUse: '10', dgClosePcons: '2026-06-10T15:00:00.000Z',
      fmaId: '28599', lgridCodeId: '101', portLandedCodeId: '20913',
      gpsLat: '44.1234', gpsLng: '-66.5432', gpsSrc: 'gps',
      nbSpcmnBrd: '3',
      baitEntries: JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]),
      mmYes: 'false',
      hlinCompany: 'Atlantic Catch Data Ltd.', hlinConfirmNo: 'HI-1001',
      hloutCompany: 'Atlantic Catch Data Ltd.', hloutConfirmNo: 'HO-1001',
      dgCloseHlin: '2026-06-10T15:00:00.000Z', dgCloseHlout: '2026-06-10T15:00:00.000Z',
      sarYes: 'true', sarSpecies: '10561',
      sarLat: '44.1234', sarLng: '-66.5432', sarGpsSrc: 'gps',
      sarDate: '2026-06-10', sarTime: '12:15',
      sarNbSpcmn: '1', sarCondId: '11881',
      ...overrides,
    },
  };
}

const sarNode = (xml: string) => xml.slice(xml.indexOf('<SAR>'), xml.indexOf('</SAR>') + 6);

describe('S153B Phase 2 — SAR.WT on the wire', () => {
  test('a SEALED weight (kilograms, tagged) emits at 2 decimals', () => {
    // 100 lb sealed under pounds -> stored 45.359291 kg, tag 'lbs'. storedWeightUnit reads a
    // PRESENT tag as "already kilograms", so the emit rounds and does NOT divide again.
    const xml = generateElogXml(closeAllGroups(sarLog({
      sarWt: '45.359291', sarCloseUnit: 'lbs',
    })), profile);
    expect(sarNode(xml)).toContain('<WT>45.36</WT>');
  });

  test('a weight sealed under kg emits the same 2dp figure — no second division', () => {
    const xml = generateElogXml(closeAllGroups(sarLog({
      sarWt: '45.359291', sarCloseUnit: 'kg',
    })), profile);
    expect(sarNode(xml)).toContain('<WT>45.36</WT>');
  });

  test('R5 — an UNTAGGED weight is pounds, and is divided at emit', () => {
    // The pre-S153B shape: a number stored before any conversion existed. 100 lb -> 45.36 kg.
    const xml = generateElogXml(closeAllGroups(sarLog({ sarWt: '100' })), profile);
    expect(sarNode(xml)).toContain('<WT>45.36</WT>');
  });

  test('Rule 789 — a typed 0 is a declaration and DOES emit', () => {
    const xml = generateElogXml(closeAllGroups(sarLog({ sarWt: '0', sarCloseUnit: 'kg' })), profile);
    expect(sarNode(xml)).toContain('<WT>0.00</WT>');
  });

  test('Rule 789 — a BLANK weight emits nothing, and is never read as a 0', () => {
    const xml = generateElogXml(closeAllGroups(sarLog({ sarWt: '' })), profile);
    expect(sarNode(xml)).not.toContain('<WT>');
  });

  test('BYTE IDENTITY — a log with no SAR weight emits exactly as it did before S153B', () => {
    // The whole point: building this field moves no byte on any log that does not use it.
    const withKey = generateElogXml(closeAllGroups(sarLog({ sarWt: '' })), profile);
    const withoutKey = generateElogXml(closeAllGroups(sarLog()), profile);
    expect(withKey).toBe(withoutKey);
  });

  test('XSD sequence — WT sits between NB_SPCMN and SPCMN_COND_ID', () => {
    const node = sarNode(generateElogXml(closeAllGroups(sarLog({
      sarWt: '45.359291', sarCloseUnit: 'kg',
    })), profile));
    const order = ['SAR_DT', 'LAT', 'LONG', 'SPECIE_ID', 'NB_SPCMN', 'WT', 'SPCMN_COND_ID', 'DG_CLOSE_DT'];
    const idx = order.map(n => node.indexOf(`<${n}`));
    expect(idx.every(i => i >= 0)).toBe(true);
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
  });

  test('the in-app validator accepts the node with WT present', () => {
    const xml = generateElogXml(closeAllGroups(sarLog({
      sarWt: '45.359291', sarCloseUnit: 'kg',
    })), profile);
    const result = validateElogXml(xml, 90);
    if (!result.valid) console.log('validator errors:', result.errors);
    expect(result.valid).toBe(true);
  });

  test('R4 — two blocks, two units, each emits its OWN conversion', () => {
    const xml = generateElogXml(closeAllGroups(sarLog({
      sarWt: '45.359291', sarCloseUnit: 'lbs',   // block 1: 100 lb sealed
      extraSars: JSON.stringify([{
        species: '10561', lat: '44.2000', lng: '-66.7000', gpsSrc: 'manual',
        date: '2026-06-10', time: '12:30', nbSpcmn: '1', condId: '11881',
        wt: '20', closeUnit: 'kg', closeDt: '2026-06-10T15:00:00.000Z',
      }]),
    })), profile);
    const nodes = xml.split('<SAR>').slice(1).map(s => s.slice(0, s.indexOf('</SAR>')));
    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toContain('<WT>45.36</WT>');
    expect(nodes[1]).toContain('<WT>20.00</WT>');
  });

  test('blocks 2+ read their OWN tag, not block 1s', () => {
    // An untagged block 2 is pounds (R5) even when block 1 is tagged kg.
    const xml = generateElogXml(closeAllGroups(sarLog({
      sarWt: '10', sarCloseUnit: 'kg',
      extraSars: JSON.stringify([{
        species: '10561', lat: '44.2', lng: '-66.7', gpsSrc: 'manual',
        date: '2026-06-10', time: '12:30', nbSpcmn: '1', condId: '11881', wt: '100',
      }]),
    })), profile);
    const nodes = xml.split('<SAR>').slice(1).map(s => s.slice(0, s.indexOf('</SAR>')));
    expect(nodes[0]).toContain('<WT>10.00</WT>');   // tagged kg -> not divided
    expect(nodes[1]).toContain('<WT>45.36</WT>');   // untagged  -> pounds, divided
  });
});

// ── S153B PHASE 3 (U4) — THE COORDINATE CLAMP ───────────────────────────────────────────────
// SAR was the last raw coordinate emit in the app. EFFORT_DETAIL (dfoXmlGenerator :388-389)
// and Form 222 (dfoForm222Generator :214-215) have run through clampCoord4 since S90; SAR
// interpolated its stored string straight into the node, so a hand-typed 43.4500 transmitted
// verbatim while the identical figure typed on the effort card went out as 43.45.
//
// The founder's standard for this phase: "a coordinate already in clamped form must emit
// byte-identical to today". These tests PROVE that property rather than asserting it against
// a re-pinned literal — the whole document is compared against itself.

describe('S153B Phase 3 — SAR coordinates are clamped at emit', () => {
  test('BYTE IDENTITY — a coordinate already in clamped form emits unchanged', () => {
    // clampCoord4 is the IDENTITY on these inputs (String(Math.round(n*10000)/10000) === n's
    // own string), so the emitted document must be indistinguishable from the pre-clamp one.
    // Proven by construction: the same fixture, whose coordinates are their own clamped form.
    const xml = generateElogXml(closeAllGroups(sarLog({
      sarLat: '44.1234', sarLng: '-66.5432',
    })), profile);
    expect(sarNode(xml)).toContain('<LAT MODE="G">44.1234</LAT>');
    expect(sarNode(xml)).toContain('<LONG MODE="G">-66.5432</LONG>');
    // ...and the same figures with an explicit clamp applied produce the identical document.
    const clamped = generateElogXml(closeAllGroups(sarLog({
      sarLat: clampCoord4('44.1234'), sarLng: clampCoord4('-66.5432'),
    })), profile);
    expect(clamped).toBe(xml);
  });

  test('a trailing-zero coordinate is laundered, matching the effort card exactly', () => {
    const xml = generateElogXml(closeAllGroups(sarLog({
      sarLat: '43.4500', sarLng: '-65.6200',
    })), profile);
    expect(sarNode(xml)).toContain('<LAT MODE="G">43.45</LAT>');
    expect(sarNode(xml)).toContain('<LONG MODE="G">-65.62</LONG>');
  });

  test('a >4-decimal coordinate is rounded, not truncated', () => {
    const xml = generateElogXml(closeAllGroups(sarLog({
      sarLat: '43.45213', sarLng: '-65.62187',
    })), profile);
    // 43.45213 -> 43.4521 (rounds down), -65.62187 -> -65.6219 (rounds away from zero)
    expect(sarNode(xml)).toContain('<LAT MODE="G">43.4521</LAT>');
    expect(sarNode(xml)).toContain('<LONG MODE="G">-65.6219</LONG>');
  });

  test('the leading minus survives, and blocks 2+ are clamped too', () => {
    const xml = generateElogXml(closeAllGroups(sarLog({
      extraSars: JSON.stringify([{
        species: '10561', lat: '44.2000', lng: '-66.7000', gpsSrc: 'manual',
        date: '2026-06-10', time: '12:30', nbSpcmn: '1', condId: '11881',
      }]),
    })), profile);
    const nodes = xml.split('<SAR>').slice(1).map(s => s.slice(0, s.indexOf('</SAR>')));
    expect(nodes[1]).toContain('<LAT MODE="M">44.2</LAT>');
    expect(nodes[1]).toContain('<LONG MODE="M">-66.7</LONG>');
  });

  test('SAR now matches the other two coordinate paths on the same input', () => {
    // The defect in one line: before S153B these two disagreed about the same figure.
    const xml = generateElogXml(closeAllGroups(sarLog({
      sarLat: '44.1500', sarLng: '-66.6000',
      gpsLat: '44.1500', gpsLng: '-66.6000', gpsSrc: 'gps',
    })), profile);
    const effort = xml.slice(xml.indexOf('<EFFORT_DETAIL>'), xml.indexOf('</EFFORT_DETAIL>'));
    expect(sarNode(xml)).toContain('<LAT MODE="G">44.15</LAT>');
    expect(effort).toContain('<LAT MODE="G">44.15</LAT>');
  });

  test('an empty coordinate is still empty — the clamp invents nothing', () => {
    const xml = generateElogXml(closeAllGroups(sarLog({ sarLat: '', sarLng: '' })), profile);
    expect(sarNode(xml)).toContain('<LAT MODE="G"></LAT>');
    expect(sarNode(xml)).toContain('<LONG MODE="G"></LONG>');
  });
});

// ── S153B PHASE 4 (U5) — DFO RULES 172/173 AT THE CLOSE DOOR ────────────────────────────────
// Until S153B the SAR coordinates were range-checked against the EFFORT window (the XSD's
// 38–72 / −148…−40). DFO gives a species-at-risk interaction its OWN box, roughly a third the
// size. Rules 172 and 173, verbatim from BOTH language editions of the 234.12 fact sheet:
//
//   EN (FS-NAT-234-12-EN.txt:712-719)
//     172 — "...must be greater than or equal to 39.0000 (deg) and less than or equal to
//            53.0000 (deg)"
//     173 — "...must be greater than or equal to -70.8167 (deg) and less than or equal to
//            -52.0000 (deg)"
//   FR (FS-NAT-234-12-FR.txt:759-766)
//     172 — "...doit etre superieure ou egale a 39.0000 (deg) et inferieure ou egale a
//            53.0000 (deg)"
//     173 — "...doit etre superieure ou egale a -70.8167 (deg) et inferieure ou egale a
//            -52.0000 (deg)"
//
// A REFUSAL IS A DOOR A MAN CAN BE LOCKED OUT OF, so the boundary is tested FIRST and from
// both sides. Both bounds are INCLUSIVE in both languages, so a position sitting exactly on
// 39.0000 / 53.0000 / -70.8167 / -52.0000 must be ACCEPTED.

describe('S153B Phase 4 — Rules 172/173: the boundary is INCLUSIVE', () => {
  const coordBullet = (lat: string, lng: string) =>
    missingInContainer('sar', ctx(90), { ...sarValues, sarLat: lat, sarLng: lng })
      .map(m => m.fieldKey);

  test('a position EXACTLY on each bound is ACCEPTED, not refused', () => {
    // Latitude bounds, longitude held mid-window; then the reverse.
    expect(coordBullet('39', '-60')).toEqual([]);
    expect(coordBullet('39.0000', '-60')).toEqual([]);
    expect(coordBullet('53', '-60')).toEqual([]);
    expect(coordBullet('53.0000', '-60')).toEqual([]);
    expect(coordBullet('45', '-70.8167')).toEqual([]);   // the awkward bound, exactly
    expect(coordBullet('45', '-52')).toEqual([]);
    expect(coordBullet('45', '-52.0000')).toEqual([]);
  });

  test('all four corners of the box are accepted together', () => {
    for (const lat of ['39', '53']) {
      for (const lng of ['-70.8167', '-52']) {
        expect(coordBullet(lat, lng)).toEqual([]);
      }
    }
  });

  test('one step OUTSIDE each bound is refused', () => {
    expect(coordBullet('38.9999', '-60')).toEqual(['sarGps']);
    expect(coordBullet('53.0001', '-60')).toEqual(['sarGps']);
    expect(coordBullet('45', '-70.8168')).toEqual(['sarGps']);
    expect(coordBullet('45', '-51.9999')).toEqual(['sarGps']);
  });

  test('the awkward bound is exact — no floating-point slip', () => {
    // -70.8167 parsed from the same decimal literal is the same double, so >= holds.
    expect(Number('-70.8167') >= -70.8167).toBe(true);
    expect(coordBullet('45', '-70.8167')).toEqual([]);
  });
});

describe('S153B Phase 4 — the SAR window is NARROWER than the effort window', () => {
  const sarBullet = (lat: string, lng: string) =>
    missingInContainer('sar', ctx(90), { ...sarValues, sarLat: lat, sarLng: lng })
      .map(m => m.fieldKey);
  const effortBullet = (lat: string, lng: string) =>
    missingInContainer('effort', ctx(90, 28599), {
      fmaId: '28599', haulStartTime: '06:00', haulEndTime: '13:30',
      catchWeight: '500', trapHauls: '250', lgridCodeId: '101',
      sarInd: 'Y', mmInterInd: 'N', catchSpecieId: '1312',
      gpsLat: lat, gpsLng: lng,
    }).map(m => m.fieldKey);

  test('a position legal for a fishing effort can be ILLEGAL for a SAR interaction', () => {
    // 38.5 N is inside the XSD range (38–72) but below Rule 172's floor of 39.
    expect(effortBullet('38.5', '-66')).not.toContain('gpsCoords');
    expect(sarBullet('38.5', '-66')).toEqual(['sarGps']);
    // -72 W is inside the XSD range (−148…−40) but west of Rule 173's -70.8167.
    expect(effortBullet('44', '-72')).not.toContain('gpsCoords');
    expect(sarBullet('44', '-72')).toEqual(['sarGps']);
  });

  test('the effort window is UNCHANGED — U5 narrowed SAR only', () => {
    // The two entries share a labelKey (form234.gpsLocationLabel) and are kept apart by
    // fieldKey alone, so this guards against the narrowing leaking onto the effort card.
    expect(effortBullet('38', '-148')).not.toContain('gpsCoords');
    expect(effortBullet('72', '-40')).not.toContain('gpsCoords');
  });

  test('LFA 34 ground — Jonathon’s own fishing position — is comfortably inside', () => {
    expect(sarBullet('43.4521', '-65.6218')).toEqual([]);
  });
});

describe('S153B Phase 4 — the refusal names the field the way the others do', () => {
  test('the failing entry is sarGps, so closeBulletText picks the SAR sentence', () => {
    // FullDfoForm maps fieldKey -> range sentence: 'sarGps' -> form234.sarGpsRangeError,
    // 'gpsCoords' -> form234.gpsRangeError. Two separate keys for two separate windows.
    const out = missingInContainer('sar', ctx(90), { ...sarValues, sarLat: '38.5' });
    expect(out.map(m => ({ f: m.fieldKey, r: m.reason }))).toEqual([{ f: 'sarGps', r: 'invalid' }]);
  });

  test('a blank coordinate is still BLANK, not out-of-range — different sentence', () => {
    const out = missingInContainer('sar', ctx(90), { ...sarValues, sarLat: '', sarLng: '' });
    expect(out.map(m => ({ f: m.fieldKey, r: m.reason }))).toEqual([{ f: 'sarGps', r: 'blank' }]);
  });
});

describe('S153B ruling R-c — check the box only, trim silently, no precision refusal', () => {
  const coordBullet = (lat: string, lng: string) =>
    missingInContainer('sar', ctx(90), { ...sarValues, sarLat: lat, sarLng: lng })
      .map(m => m.fieldKey);

  test('excess precision inside the box is ACCEPTED — the emit discards those digits anyway', () => {
    expect(coordBullet('44.123456', '-66.543210')).toEqual([]);
    expect(coordBullet('43.45213', '-65.62187')).toEqual([]);
  });

  test('SAR and the effort card now agree about precision', () => {
    // The effort entry has accepted this class since S90; SAR refused it until R-c.
    expect(coordBullet('44.12345', '-66.5432')).toEqual([]);
  });

  test('the range is judged on the CLAMPED value — the -70.81674 case', () => {
    // Raw, -70.81674 is below Rule 173's floor of -70.8167 and would be refused.
    // Clamped — which is what DFO actually receives — it IS -70.8167, exactly on the
    // inclusive boundary. Refusing it would lock him out over a position the emit
    // would have made legal.
    expect(clampCoord4('-70.81674')).toBe('-70.8167');
    expect(coordBullet('45', '-70.81674')).toEqual([]);
  });

  test('...but a value still outside the box AFTER clamping is refused', () => {
    // -70.81679 clamps to -70.8168, which is genuinely below the floor.
    expect(clampCoord4('-70.81679')).toBe('-70.8168');
    expect(coordBullet('45', '-70.81679')).toEqual(['sarGps']);
  });

  test('shape is still refused, by Number.isFinite rather than a pattern', () => {
    expect(coordBullet('abc', '-66.5')).toEqual(['sarGps']);
    expect(coordBullet('44.5N', '-66.5')).toEqual(['sarGps']);
    expect(coordBullet('44.5', '66.5')).toEqual(['sarGps']); // positive longitude, minus missing
  });
});
