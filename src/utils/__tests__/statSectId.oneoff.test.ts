// ONE-OFF (Phase 3 guard test): proves the EFFORT_DETAIL.STAT_SECT_ID emit + validator
// overlay (Rules 621 + 622) fire at runtime. Unlike LGRID/TRP_SZ_ID this field is
// FMA-GATED, not subform-gated — mandatory only for the 17 Rule-621 FMAs (all NL-91),
// blocked everywhere else.
//   • NL-91 LFA 03 (1653) + valid section 38065 → emits <STAT_SECT_ID>, passes
//   • NL-91 LFA 03 (1653) + section omitted     → Rule 621 "mandatory for this FMA"
//   • NL-91 LFA 03 (1653) + section 38119        → Rule 622 "not valid for this FMA"
//     (38119 is an LFA 01 section; LFA 03's valid set is {38064..38067})
//   • NL-91 LFA 01 (2071) + no section           → passes (2071 ∉ the Rule-621 set; absent is correct)
// Mirrors the fixture style of validateLgridId.oneoff.test.ts.
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

// NL-91 fixture (regId 1002). statSectId omitted entirely when undefined.
function nlLog(fmaId: string, statSectId?: string): any {
  const log: any = {
    id: 'test-stat-sect-91',
    dateFished: '2026-06-10',
    lgbkUid: 'ABCDEF',
    firstEntryDt: '2026-06-10T08:55:00.000Z',
    sentToDfo: false,
    subformId: 91,
    regId: 1002,
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
      hlinCompany: '', hlinConfirmNo: '', hloutCompany: '', hloutConfirmNo: '',
      fmaId,
      departurePort: 'PORT AUX BASQUES (CHANNEL)',
      departurePortCodeId: '21331',
      portLanded: 'PORT AUX BASQUES (CHANNEL)',
      portLandedCodeId: '21331',
      soakDuration: '2',
      gearSubtypeId: '39684',
      trapSize: '39682',
      baitEntries: JSON.stringify([{ type: 'Squid, Illex', lbs: '100' }]),
    },
  };
  if (statSectId !== undefined) log.data.statSectId = statSectId;
  return log;
}

const MANDATORY_MSG = 'STAT_SECT_ID is mandatory for this FMA (Rule 621)';
const INVALID_MSG = 'is not valid for this FMA (Rule 622)';

test('NL-91 LFA 03 with a valid section emits STAT_SECT_ID and passes', () => {
  const xml = generateElogXml(nlLog('1653', '38065'), profile);
  expect(xml).toContain('<STAT_SECT_ID>38065</STAT_SECT_ID>');

  const { valid, errors } = validateElogXml(xml, 91);
  expect(errors.some(e => e.includes('STAT_SECT_ID'))).toBe(false);
  expect(valid).toBe(true);
});

test('NL-91 LFA 03 with the section omitted trips Rule 621 (mandatory) — and only that', () => {
  const xml = generateElogXml(nlLog('1653'), profile);
  expect(xml).not.toContain('<STAT_SECT_ID>');

  const { errors } = validateElogXml(xml, 91);
  const statErrs = errors.filter(e => e.includes('STAT_SECT_ID'));
  expect(statErrs).toEqual([expect.stringContaining(MANDATORY_MSG)]);
});

test('NL-91 LFA 03 with an LFA 01 section trips Rule 622 (invalid) — and only that', () => {
  const xml = generateElogXml(nlLog('1653', '38119'), profile);
  expect(xml).toContain('<STAT_SECT_ID>38119</STAT_SECT_ID>');

  const { errors } = validateElogXml(xml, 91);
  const statErrs = errors.filter(e => e.includes('STAT_SECT_ID'));
  expect(statErrs).toEqual([expect.stringContaining(INVALID_MSG)]);
});

test('NL-91 LFA 01 with no section passes (absent is correct for a non-621 FMA)', () => {
  const xml = generateElogXml(nlLog('2071'), profile);
  expect(xml).not.toContain('STAT_SECT_ID');

  const { valid, errors } = validateElogXml(xml, 91);
  expect(errors.some(e => e.includes('STAT_SECT_ID'))).toBe(false);
  expect(valid).toBe(true);
});
