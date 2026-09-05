// S66b: proves the <SAR> node emits the correct sar_type child shape (in XSD sequence order)
// when SAR_IND='Y', and is ABSENT when SAR_IND is N/null. Writes /tmp/sample_sar.xml for real
// `xmllint --schema` validation against the logbook XSD — run separately, same workflow as
// genSampleAllSubforms (no oneoff embeds xmllint; jest stays decoupled from the external XSD).
import * as fs from 'fs';
import { generateElogXml, validateElogXml } from '../dfoXmlGenerator';
import { closeAllGroups } from './support/closeAllGroups';

const profile: any = {
  operatorName: 'Test Operator',
  vesselNumber: '123456',
  fishingNumber: '300123',
  licenceHolderFin: '123456789',
  units: 'lbs',
  language: 'en',
};

// MAR-90 / FMA 38b base — a legitimate log that already validates; SAR is layered on top.
function baseMar90(): any {
  return {
    id: 'sar-s66b',
    dateFished: '2026-06-10',
    lgbkUid: 'ABCDEF',
    firstEntryDt: '2026-06-10T08:55:00.000Z',
    sentToDfo: false,
    subformId: 90,
    regId: 1004,
    data: {
      timeSailed: '05:30',
      timeStartedHauling: '06:00',
      timeStoppedHauling: '13:30',
      timeOfLanding: '14:45',
      crewRegistry: JSON.stringify(['Crew One', 'Crew Two']),
      catchWeight: '500',
      trapHauls: '250',
      bycatchEntries: '[]',
      personalUse: '10',
      dgClosePcons: '2026-06-10T15:00:00.000Z',
      fmaId: '28599', // 38b
      lgridCodeId: '101',
      portLandedCodeId: '20913', // MV_PORT — Abbott's Harbour (NS)
      gpsLat: '44.1234', gpsLng: '-66.5432', gpsSrc: 'gps',
      nbSpcmnBrd: '3',
      baitEntries: JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]),
      mmYes: 'false',
      lostGearYes: 'false',
      // S142 defect 52: this is a 38b log, and Rules 2024/2025 make both hail groups
      // mandatory there — validateElogXml now enforces that, so the fixture carries a real
      // hail. 'Atlantic Catch Data Ltd.' (25095) is valid under BOTH Rule 27 (HLIN) and
      // Rule 93 (HLOUT), so one name serves both groups.
      hlinCompany: 'Atlantic Catch Data Ltd.', hlinConfirmNo: 'HI-1001',
      // S161: the Rule 660/661 validator arm made ETA_DT + TOT_WT_ONBRD required on a 38b
      // HLIN — this fixture predates the arm (the S154D fixture rule: lawful source, never
      // a weakened assertion). No companion date: the trip-day fallback is the proven path.
      hlinEta: '12:00', hlinTotalWeight: '111',
      hloutCompany: 'Atlantic Catch Data Ltd.', hloutConfirmNo: 'HO-1001',
      dgCloseHlin: '2026-06-10T15:00:00.000Z', dgCloseHlout: '2026-06-10T15:00:00.000Z',
    },
  };
}

test('SAR=Y: <SAR> emits the full sar_type child set in order; validateElogXml passes', () => {
  const log = baseMar90();
  log.data.sarYes = 'true';
  log.data.sarSpecies = '10561'; // MV_SAR_LIST — Turtle, Leatherback Sea
  log.data.sarLat = '44.1234';
  log.data.sarLng = '-66.5432';
  log.data.sarGpsSrc = 'gps';
  log.data.sarDate = '2026-06-10';
  log.data.sarTime = '12:15';
  log.data.sarNbSpcmn = '1';
  log.data.sarCondId = '11881'; // MV_SPECIMENS_CONDITION — Alive
  log.remarks = { sar: 'Released alive near the gear' };

  const xml = generateElogXml(closeAllGroups(log), profile);
  fs.writeFileSync('/tmp/sample_sar.xml', xml);

  // node present exactly once
  expect((xml.match(/<SAR>/g) || []).length).toBe(1);
  const sar = xml.slice(xml.indexOf('<SAR>'), xml.indexOf('</SAR>') + 6);

  // every mandatory child present (SAR_DT digits are TZ-dependent → match the date_12 pattern)
  expect(sar).toMatch(/<SAR_DT>\d{12}<\/SAR_DT>/);
  expect(sar).toContain('<LAT MODE="G">44.1234</LAT>');
  expect(sar).toContain('<LONG MODE="G">-66.5432</LONG>');
  expect(sar).toContain('<SPECIE_ID>10561</SPECIE_ID>');
  expect(sar).toContain('<NB_SPCMN>1</NB_SPCMN>');
  expect(sar).toContain('<SPCMN_COND_ID>11881</SPCMN_COND_ID>');
  expect(sar).toMatch(/<DG_CLOSE_DT>\d{14}<\/DG_CLOSE_DT>/);
  expect(sar).toContain('<REM>Released alive near the gear</REM>');

  // child order matches sar_type sequence (WT omitted)
  const order = ['SAR_DT', 'LAT', 'LONG', 'SPECIE_ID', 'NB_SPCMN', 'SPCMN_COND_ID', 'DG_CLOSE_DT', 'REM'];
  const idx = order.map(tagName => sar.indexOf(`<${tagName}`));
  expect(idx.every(i => i >= 0)).toBe(true);
  expect(idx).toEqual([...idx].sort((a, b) => a - b));

  // trip_type order: SAR after BAIT_USED, before EFFORT
  expect(xml.indexOf('<SAR>')).toBeGreaterThan(xml.indexOf('</BAIT_USED>'));
  expect(xml.indexOf('<SAR>')).toBeLessThan(xml.indexOf('<EFFORT>'));

  // in-app validator accepts the emitted node
  const result = validateElogXml(xml, 90);
  if (!result.valid) console.log('validator errors:', result.errors);
  expect(result.valid).toBe(true);
});

test('SAR not Y: <SAR> node is ABSENT for N and null', () => {
  for (const ind of ['false', 'null']) {
    const log = baseMar90();
    log.data.sarYes = ind;
    // even with stray SAR detail present, no node unless the indicator is Y
    log.data.sarSpecies = '10561';
    log.data.sarLat = '44.1234';
    log.data.sarLng = '-66.5432';
    log.data.sarNbSpcmn = '1';
    log.data.sarCondId = '11881';
    const xml = generateElogXml(closeAllGroups(log), profile);
    expect(xml).not.toContain('<SAR>');
  }
});
