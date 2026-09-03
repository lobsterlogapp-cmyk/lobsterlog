// ONE-OFF (S159 R4 guard): bait "Other" (814) on Maritimes — the wire carries DFO's own
// code, never the harvester's typed text, and the description rides the row's REM.
//   • An 'Other'-labelled row emits <BT_TYP_ID>814</BT_TYP_ID> + the note as that
//     occurrence's REM, and the document validates — the one bait type DFO provides for
//     "none of the above" is sendable for the first time.
//   • The OLD path's product — a row storing the typed text — still emits '0' and is
//     still refused (unchanged behaviour, pinned so the fix can't be mistaken for a
//     migration).
//   • The close door (requirements row) makes the note mandatory exactly when the
//     bait-type codeId is 814, both directions.
//   • Source-wiring checks on FullDfoForm.tsx (grep-shaped — the walk proves the render
//     and the popup).
import * as fs from 'fs';
import * as path from 'path';
import { generateElogXml, validateElogXml } from '../dfoXmlGenerator';
import { missingInContainer } from '../dfoRequirements';
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

// Complete MAR-90 fixture (the genSampleAllSubforms shape) with the bait rows variable.
function marLog(baitRows: object[]): any {
  return closeAllGroups({
    id: 'test-log-90', dateFished: '2026-06-10', lgbkUid: 'ABCDEF',
    firstEntryDt: '2026-06-10T08:55:00.000Z', sentToDfo: false, subformId: 90, regId: 1004,
    data: {
      timeSailed: '05:30', timeStartedHauling: '06:00', timeStoppedHauling: '13:30',
      timeOfLanding: '14:45', crewRegistry: JSON.stringify(['Crew One', 'Crew Two']),
      catchWeight: '500', trapHauls: '250', bycatchEntries: '[]', personalUse: '10',
      dgClosePcons: '2026-06-10T15:00:00.000Z',
      mmYes: 'false', sarYes: 'false', lostGearYes: 'false',
      fmaId: '28599', portLanded: "ABBOTT'S HARBOUR", portLandedCodeId: '20913',
      lgridCodeId: '101', obsTripNum: '',
      gpsLat: '44.1234', gpsLng: '-66.5432', gpsSrc: 'gps', nbSpcmnBrd: '3',
      baitEntries: JSON.stringify(baitRows),
      hlinCompany: 'Atlantic Catch Data Ltd.', hlinConfirmNo: 'HI-1001',
      dgCloseHlin: '2026-06-10T15:00:00.000Z',
      hloutCompany: 'Atlantic Catch Data Ltd.', hloutConfirmNo: 'HO-1001',
      dgCloseHlout: '2026-06-10T15:00:00.000Z',
    },
  });
}

describe('the wire carries 814, and the note rides the REM', () => {
  test("an 'Other'-labelled row emits BT_TYP_ID 814 + its note, and the document validates", () => {
    const xml = generateElogXml(marLog([
      { type: 'Other', lbs: '25', condition: 1232, note: 'Chopped squid heads' },
    ]), profile);
    expect(xml).toContain('<BT_TYP_ID>814</BT_TYP_ID>');
    // The note is inside the BAIT_USED node — the description has an element to ride.
    const baitNode = xml.slice(xml.indexOf('<BAIT_USED>'), xml.indexOf('</BAIT_USED>'));
    expect(baitNode).toContain('Chopped squid heads');
    const result = validateElogXml(xml, 90);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });
  test("the typed text never reaches the wire — 'Other' is the stored label, so no free text can ride BT_TYP_ID", () => {
    const xml = generateElogXml(marLog([
      { type: 'Other', lbs: '25', condition: 1232, note: 'Chopped squid heads' },
    ]), profile);
    expect(xml).not.toContain('<BT_TYP_ID>Chopped');
  });
});

describe('the old path stays refused (pin, not a migration)', () => {
  test('a legacy row storing typed text still emits an unmatched id and the send is refused', () => {
    const xml = generateElogXml(marLog([
      { type: 'herring bits', lbs: '25', condition: 1232, note: '' },
    ]), profile);
    expect(xml).toContain('<BT_TYP_ID>0</BT_TYP_ID>');
    const result = validateElogXml(xml, 90);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('BT_TYP_ID');
  });
});

describe('the close door — note mandatory exactly when the codeId is 814', () => {
  const ctx = { subformId: 90, fmaId: 28599 };
  test('Other(814) with a blank note reports the note missing', () => {
    const missing = missingInContainer('baitRow', ctx, {
      type: 'Other', lbs: '25', condition: '1232', baitTypeCodeId: '814', note: '',
    });
    expect(missing.some(m => m.fieldKey === 'note')).toBe(true);
  });
  test('Other(814) with a note reports nothing missing', () => {
    const missing = missingInContainer('baitRow', ctx, {
      type: 'Other', lbs: '25', condition: '1232', baitTypeCodeId: '814', note: 'Chopped squid heads',
    });
    expect(missing).toEqual([]);
  });
  test('a non-Other bait type keeps the note optional', () => {
    const missing = missingInContainer('baitRow', ctx, {
      type: 'Mackerel, Atlantic', lbs: '25', condition: '1232', baitTypeCodeId: '811', note: '',
    });
    expect(missing.some(m => m.fieldKey === 'note')).toBe(false);
  });
});

describe('source wiring — FullDfoForm (grep-shaped; the walk proves the render and the popup)', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', '..', 'components', 'FullDfoForm.tsx'), 'utf8');

  test("the save path stores the label for a bait 'Other' (custom text is bycatch-only)", () => {
    // Anchored on `const finalType` — the render block carries the same qualifier string,
    // so an unanchored grep matched the WRONG site (mutation M2 proved it: reverting the
    // save path alone survived the earlier version of this check).
    expect(src).toContain("const finalType = sheetSelectedType === 'Other' && sheetMode === 'bycatch'");
  });
  test('the popup door exists in the sheet confirm, using the S158 dialog pair', () => {
    expect(src).toContain("t('form234.pleaseDescribeBaitNote')");
  });
  test('the instruction line renders for a bait Other', () => {
    expect(src).toContain("t('form234.baitOtherDescribeLine')");
  });
  test("the note placeholder says required on a bait Other and stays optional everywhere else (S159 walk defect)", () => {
    expect(src).toContain("sheetSelectedType === 'Other' ? t('form234.baitNoteRequiredPlaceholder') : t('form234.baitNotePlaceholder')");
    // The shared section-note key is untouched — its call sites keep the optional wording.
    expect(src.split("t('form234.baitNotePlaceholder')")).toHaveLength(2); // exactly one call site
  });
  test('the close door and the meter both carry the note value', () => {
    expect(src).toContain('note: e.note ?? ');
    const meter = fs.readFileSync(path.join(__dirname, '..', 'dfoLogStorage.ts'), 'utf8');
    expect(meter).toContain('note: r.note ?? ');
  });
});
