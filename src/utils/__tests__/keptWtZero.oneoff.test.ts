// ONE-OFF (Session 120 guard test): CATCH.KEPT_WT zero-catch emission — FS-NAT-234-12
// Rule 2020 ("When there has been no catch during the fishing effort, the fisher must
// enter 0 in the quantity kept (Catch.Kept_wt)"), with Rules 630/631 making KEPT_WT
// mandatory on the lobster CATCH. kgStr() gained an allowZero flag passed ONLY at the
// CATCH.KEPT_WT call site (dfoXmlGenerator.ts:101 area):
//   • allowZero path — catchWeight "0" → <KEPT_WT>0.00</KEPT_WT> emitted
//   • blank / non-numeric / negative catchWeight → element still omitted
//   • a normal weight converts exactly as before (lbs → kg, 2 dp)
//   • default (allowZero=false) path unchanged — a typed 0 in Personal use still
//     suppresses the whole PCONS node (its hardcoded USG_ID 37822 is Blocked on
//     88/89/91), and a 0-lb bait entry still suppresses its BAIT_USED node.
// Mirrors the fixture style of nbSpcmnKept.oneoff.test.ts (MAR-90 base).
import { generateElogXml } from '../dfoXmlGenerator';

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

function mar90Log(): any {
  return {
    id: 'test-log-keptwt-zero',
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
      crewRegistry: JSON.stringify(['Crew One']),
      fmaId: '1589',
      catchWeight: '500',
      trapHauls: '250',
      bycatchEntries: '[]',
      personalUse: '',
      portLanded: "Abbott's Harbour",
      portLandedCodeId: '20913',
      lgridCodeId: '101',
      baitEntries: JSON.stringify([{ type: 'Herring, Atlantic', lbs: '100', condition: 1232 }]),
      mmYes: 'false',
      sarYes: 'false',
    },
  };
}

describe('CATCH.KEPT_WT zero-catch emission (allowZero at the KEPT_WT call site only)', () => {
  test('catchWeight "0" emits <KEPT_WT>0.00</KEPT_WT>', () => {
    const log = mar90Log();
    log.data.catchWeight = '0';
    const xml = generateElogXml(log, profile);
    expect(xml).toContain('<KEPT_WT>0.00</KEPT_WT>');
  });

  test('catchWeight "" still omits KEPT_WT', () => {
    const log = mar90Log();
    log.data.catchWeight = '';
    const xml = generateElogXml(log, profile);
    expect(xml).not.toContain('<KEPT_WT>');
  });

  test('catchWeight "abc" still omits KEPT_WT', () => {
    const log = mar90Log();
    log.data.catchWeight = 'abc';
    const xml = generateElogXml(log, profile);
    expect(xml).not.toContain('<KEPT_WT>');
  });

  test('catchWeight "-5" still omits KEPT_WT', () => {
    const log = mar90Log();
    log.data.catchWeight = '-5';
    const xml = generateElogXml(log, profile);
    expect(xml).not.toContain('<KEPT_WT>');
  });

  test('a normal weight is unchanged (500 lbs → 226.80 kg)', () => {
    const log = mar90Log();
    log.data.catchWeight = '500';
    const xml = generateElogXml(log, profile);
    expect(xml).toContain('<KEPT_WT>226.80</KEPT_WT>');
  });

  // Default-path guarantees: the five untouched call sites still treat 0 as absent.
  test('personal use "0" still emits NO PCONS node (default allowZero=false)', () => {
    const log = mar90Log();
    log.data.personalUse = '0';
    const xml = generateElogXml(log, profile);
    expect(xml).not.toContain('<PCONS>');
    expect(xml).not.toContain('<USG_ID>');
  });

  test('a 0-lb bait entry still emits NO BAIT_USED node (default allowZero=false)', () => {
    const log = mar90Log();
    log.data.baitEntries = JSON.stringify([{ type: 'Herring, Atlantic', lbs: '0', condition: 1232 }]);
    const xml = generateElogXml(log, profile);
    expect(xml).not.toContain('<BAIT_USED>');
  });
});
