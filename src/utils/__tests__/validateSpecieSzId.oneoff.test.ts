// ONE-OFF (Session 59 guard test): proves the PCONS.SPECIE_SZ_ID validator overlay
// fires at runtime —
//   • GLF(89) with NO size → "mandatory for GLF(89)"
//   • GLF(89) with a value → emits <SPECIE_SZ_ID>, trips neither guard
//   • QC/MAR/NL (88/90/91) with an injected SPECIE_SZ_ID → "blocked"
// Per Subforms_requirements_234.xlsx row 56 (the sheet is stricter than the XSD, which
// lists it optional; overturns the earlier 88/89/91-emit ruling). Mirrors the
// fixture/injection style of validateTrpSzId.oneoff.test.ts — the generator only emits
// SPECIE_SZ_ID for 89, so the blocked case must be injected into an otherwise-clean doc.
import { generateElogXml, validateElogXml } from '../dfoXmlGenerator';

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
      // S134: a bycatch entry keeps a PCONS node in every doc — the personal-use node no
      // longer emits off MAR(90), so it can't be this suite's SPECIE_SZ_ID anchor anymore.
      // 'Lobster' (1312) is on all four PCONS species lists.
      // S158: the row now carries the size the harvester picked. It is deliberately 828
      // (Large) on a LOBSTER row — the pre-S158 generator derived 826 (Small) for lobster, so
      // any test that still passes with 826 on the wire would be passing on the old code path.
      bycatchEntries: JSON.stringify([{ species: 'Lobster', lbs: '40', specieSzId: '828' }]),
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

// Minimal region-appropriate fixtures (same overrides as genSampleAllSubforms).
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
    return log;
  }
  if (subformId === 89) {
    const log = baseLog(89, 1014);
    log.data.fmaId = '1526';
    log.data.portLanded = 'ABOITEAU';
    log.data.portLandedCodeId = '19322';
    log.data.soakDuration = '2';
    log.data.baitEntries = JSON.stringify([{ type: 'Squid, Illex', lbs: '100' }]);
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
  // NL-91
  const log = baseLog(91, 1002);
  log.data.fmaId = '2071';
  log.data.departurePort = 'PORT AUX BASQUES (CHANNEL)';
  log.data.departurePortCodeId = '21331';
  log.data.portLanded = 'PORT AUX BASQUES (CHANNEL)';
  log.data.portLandedCodeId = '21331';
  log.data.soakDuration = '2';
  log.data.gearSubtypeId = '39684';
  log.data.trapSize = '39682';
  log.data.baitEntries = JSON.stringify([{ type: 'Squid, Illex', lbs: '100' }]);
  return log;
}

const MANDATORY_MSG = 'SPECIE_SZ_ID is mandatory for GLF(89)';
// Blocked wording differs by subform: MAR(90) keeps the existing S56 "blocked for MAR(90)"
// message; QC(88)/NL(91) use the per-subform "blocked for subform N" style. Match the
// shared "SPECIE_SZ_ID is blocked" stem so both styles are covered.
const BLOCKED_MSG = 'SPECIE_SZ_ID is blocked';

test('GLF-89 WITHOUT SPECIE_SZ_ID trips the mandatory guard', () => {
  // Generator emits SPECIE_SZ_ID for 89; strip it to model a missing-field document.
  const xml = generateElogXml(makeLog(89), profile)
    .replace(/^ *<SPECIE_SZ_ID>.*<\/SPECIE_SZ_ID>\n/gm, '');
  expect(xml).not.toContain('<SPECIE_SZ_ID>');

  const { errors } = validateElogXml(xml, 89);
  expect(errors.some(e => e.includes(MANDATORY_MSG))).toBe(true);
  expect(errors.some(e => e.includes('blocked'))).toBe(false);
});

test('GLF-89 WITH value emits SPECIE_SZ_ID and trips neither guard (negative control)', () => {
  const xml = generateElogXml(makeLog(89), profile);
  expect(xml).toContain('<SPECIE_SZ_ID>');

  // S158: it must be the size the HARVESTER picked, exactly once, and it must not be the value
  // the old code derived. The fixture row is Lobster with 828 chosen; pre-S158 this line was
  // `specieId === '1312' ? '826' : …`, so 826 here would mean the derivation is still alive.
  expect(xml).toContain('<SPECIE_SZ_ID>828</SPECIE_SZ_ID>');
  expect(xml).not.toContain('<SPECIE_SZ_ID>826</SPECIE_SZ_ID>');
  expect((xml.match(/<SPECIE_SZ_ID>/g) ?? []).length).toBe(1);

  const { errors } = validateElogXml(xml, 89);
  expect(errors.some(e => e.includes(MANDATORY_MSG))).toBe(false);
  expect(errors.some(e => e.includes('blocked'))).toBe(false);
});

// S158 — the omit-and-refuse path. A Gulf row with no stored size cannot normally be produced
// (the sheet refuses to create one, the close door refuses to seal one), but if one ever
// reaches the generator the element must be OMITTED and the send BLOCKED — never invented.
test('GLF-89 with a sizeless row emits nothing and the send is refused (S158)', () => {
  const log = makeLog(89);
  log.data.bycatchEntries = JSON.stringify([{ species: 'Lobster', lbs: '40' }]);
  const xml = generateElogXml(log, profile);

  expect(xml).toContain('<PCONS>');            // the row itself still emits
  expect(xml).not.toContain('<SPECIE_SZ_ID>'); // but no size is invented for it

  const { errors } = validateElogXml(xml, 89);
  expect(errors.some(e => e.includes(MANDATORY_MSG))).toBe(true);
});

test.each([88, 90, 91])('subform %s with an injected SPECIE_SZ_ID trips the blocked guard', (sf) => {
  const clean = generateElogXml(makeLog(sf), profile);
  expect(clean).not.toContain('<SPECIE_SZ_ID>'); // never emitted for 88/90/91

  // Inject into the first PCONS at its XSD sequence slot (after SPECIE_FRM_ID, before WT).
  const injected = clean.replace(
    '      <WT>',
    '      <SPECIE_SZ_ID>826</SPECIE_SZ_ID>\n      <WT>',
  );
  expect(injected).toContain('<SPECIE_SZ_ID>826</SPECIE_SZ_ID>');

  const { errors } = validateElogXml(injected, sf);
  expect(errors.some(e => e.includes(BLOCKED_MSG))).toBe(true);
  expect(errors.some(e => e.includes(MANDATORY_MSG))).toBe(false);
});
