/**
 * S161 — HLIN.ETA_DT emits (P2).
 *
 * Until S161 a typed ETA NEVER reached the wire: the form stored free text ("16:30"),
 * dfoXmlGenerator fed it raw to toDate12, new Date("16:30") is Invalid Date, tag() dropped
 * the element — and CONF 164103 shipped a 38b T1 without a Rule-660-mandatory element while
 * three layers each assumed another was checking. These tests pin the fixed emit:
 *   typed HH:MM emits a valid date_12 · the companion hlinEtaDate is honoured · a missing
 *   companion falls back to the trip day (the migration answer for logs stored before S161)
 *   · blank emits nothing · legacy free-text garbage emits NOTHING, never midnight.
 *
 * Expected values are computed through the same local→UTC conversion the generator uses,
 * so the assertions hold in any timezone; date-part assertions use midday times.
 */
import { generateElogXml, validateElogXml } from '../dfoXmlGenerator';
import { DfoLog } from '../dfoLogStorage';
import { CaptainProfile } from '../captainStorage';

const profile = {
  operatorName: 'Test Operator', vesselNumber: '104460', fishingNumber: '104460',
  licenceHolderFin: '100400460', elogKey: 'X'.repeat(24), fishingArea: 'LFA 34',
  totalGearCount: 200, gearType: 'Traps', subformId: 90, regId: 1004,
} as unknown as CaptainProfile;

// Minimal MAR-90 log with a 38b effort (opens the hail gate) and a started HLIN block.
const makeLog = (data: Record<string, string>): DfoLog => ({
  id: 'LL-20260803-901', lgbkUid: 'ETATST', firstEntryDt: '2026-08-03T10:00:00.000Z',
  mode: 'full', status: 'complete', dateFished: '2026-08-03', createdAt: 1754215200000,
  subformId: 90, regId: 1004, tripNum: 99,
  data: {
    fmaId: '28599', timeSailed: '05:00', timeStartedHauling: '06:00',
    timeStoppedHauling: '11:00', timeOfLanding: '11:30',
    catchWeight: '100', trapHauls: '50', portLanded: 'Abbott’s Harbour',
    portLandedCodeId: '20913', sarYes: 'false', mmYes: 'false', bycatchYes: 'false',
    hlinConfirmNo: 'HI2608030001',
    ...data,
  },
});

// Mirror of the generator's local→UTC combine, so expectations are timezone-proof.
const expectedDate12 = (dateStr: string, timeStr: string): string => {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = timeStr.split(':').map(Number);
  const dt = new Date(y, mo - 1, d, h, mi, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}` +
         `${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}`;
};

const etaOf = (xml: string): string | null => {
  const m = xml.match(/<ETA_DT>(\d+)<\/ETA_DT>/);
  return m ? m[1] : null;
};

test('a typed ETA emits a valid date_12 (twelve digits, real value)', () => {
  const xml = generateElogXml(makeLog({ hlinEta: '12:30', hlinEtaDate: '2026-08-03' }), profile);
  const eta = etaOf(xml);
  expect(eta).toBe(expectedDate12('2026-08-03', '12:30'));
  expect(eta).toMatch(/^\d{12}$/);
});

test('the companion hlinEtaDate is honoured when it differs from the trip day', () => {
  const xml = generateElogXml(makeLog({ hlinEta: '12:30', hlinEtaDate: '2026-08-04' }), profile);
  expect(etaOf(xml)).toBe(expectedDate12('2026-08-04', '12:30'));
});

test('MIGRATION: a pre-S161 log (HH:MM stored, NO companion date) emits with the trip-day fallback', () => {
  const xml = generateElogXml(makeLog({ hlinEta: '12:30' }), profile);
  expect(etaOf(xml)).toBe(expectedDate12('2026-08-03', '12:30'));
});

test('a blank ETA still emits nothing', () => {
  const xml = generateElogXml(makeLog({}), profile);
  expect(xml).not.toContain('<ETA_DT');
});

test('legacy free-text garbage emits NOTHING — never a silently-wrong midnight', () => {
  const xml = generateElogXml(makeLog({ hlinEta: 'about 4pm' }), profile);
  expect(xml).not.toContain('<ETA_DT');
});

test('the HLIN block itself is untouched by the change (confirmation number still emits)', () => {
  const xml = generateElogXml(makeLog({ hlinEta: '12:30' }), profile);
  expect(xml).toContain('<HLIN_NUM>HI2608030001</HLIN_NUM>');
});


// --- Phase 2 (P3): the Rule 660/661 validator arm ---
// The layer that should have caught CONF 164103. Error-content assertions (the minimal
// fixture is deliberately incomplete elsewhere, so whole-file validity is not the claim).

const errorsOf = (data: Record<string, string>) => {
  const log = makeLog(data);
  return validateElogXml(generateElogXml(log, profile), 90).errors;
};

test('38b with a typed ETA and weight: no Rule 660/661 refusal', () => {
  const errs = errorsOf({ hlinEta: '12:30', hlinEtaDate: '2026-08-03', hlinTotalWeight: '111' });
  expect(errs.join('\n')).not.toMatch(/ETA_DT|TOT_WT_ONBRD/);
});

test('38b HLIN without ETA refuses and NAMES the element (Rule 660)', () => {
  const errs = errorsOf({ hlinTotalWeight: '111' });
  expect(errs.join('\n')).toMatch(/missing required <ETA_DT>.*Rule 660/);
});

test('38b HLIN without the total weight refuses (Rule 661)', () => {
  const errs = errorsOf({ hlinEta: '12:30', hlinEtaDate: '2026-08-03' });
  expect(errs.join('\n')).toMatch(/missing required <TOT_WT_ONBRD>.*Rule 661/);
});

test('SCOPE: an LFA-41 hail log without ETA gets NO Rule 660/661 refusal (38b only, as the rules scope themselves)', () => {
  const log = makeLog({});
  log.data.fmaId = '1595';   // LFA 41 — hail required, but Rules 660/661 do not apply
  const errs = validateElogXml(generateElogXml(log, profile), 90).errors;
  expect(errs.join('\n')).not.toMatch(/Rule 66[01]/);
});

test('SCOPE: a non-hail MAR log (LFA 34, no HLIN) is untouched by the arm', () => {
  const log = makeLog({});
  log.data.fmaId = '1581';   // an LFA-34-family area outside the hail set
  delete (log.data as Record<string, string>).hlinConfirmNo;
  const errs = validateElogXml(generateElogXml(log, profile), 90).errors;
  expect(errs.join('\n')).not.toMatch(/ETA_DT|TOT_WT_ONBRD|Rule 66[01]/);
});
