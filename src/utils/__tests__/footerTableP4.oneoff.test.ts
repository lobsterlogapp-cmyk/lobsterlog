// ONE-OFF (S141 P4): pins the NEWS the close-all door's repoint ships — every class the
// recon's R3.1 table names (docs/GATE_S141_P4_FOOTER_AND_METER.md). The old private list
// (FULL_DFO_REQUIRED_FIELDS) is retired; the door asks dfoRequirements.ts, so each pin
// asks the table the exact question the door now asks.
import { isFieldRequired, missingInContainer } from '../dfoRequirements';
import { DFO_FMA_38B } from '../dfoConstants';

const LFA34 = 1589;      // MAR, in the settlement-grid set
const QC_VNOTCH = 25661; // LFA 20a1 — in BOTH QC v-notch sets

describe('S141 P4 — the R4 holes, closed', () => {
  test('Port Landed (landing.portId) is mandatory on ALL FOUR regions — 89/90 were unguarded', () => {
    for (const subformId of [88, 89, 90, 91]) {
      const rows = missingInContainer('landing', { subformId, fmaId: null }, {
        portId: '', landingTime: '14:45',
      });
      expect(rows.map(m => m.fieldKey)).toContain('portId');
    }
  });

  test('Departure Port is mandatory on 88/91, blocked on 89/90 — never footer-checked before', () => {
    expect(isFieldRequired('departurePort', { subformId: 88 })).toBe(true);
    expect(isFieldRequired('departurePort', { subformId: 91 })).toBe(true);
    expect(isFieldRequired('departurePort', { subformId: 89 })).toBe(false);
    expect(isFieldRequired('departurePort', { subformId: 90 })).toBe(false);
  });

  test('Soak Duration is mandatory on 88/89/91 (trap group 1 was never checked), blocked on 90', () => {
    for (const subformId of [88, 89, 91]) {
      expect(isFieldRequired('soakDuration', { subformId })).toBe(true);
    }
    expect(isFieldRequired('soakDuration', { subformId: 90 })).toBe(false);
  });
});

describe('S141 P4 — newly refused classes (R3.1)', () => {
  test('QC v-notch counts: mandatory on the rule FMAs, blocked off them (a zero must be typed)', () => {
    expect(isFieldRequired('vNotchCount', { subformId: 88, fmaId: QC_VNOTCH })).toBe(true);
    expect(isFieldRequired('nbVntchYou', { subformId: 88, fmaId: QC_VNOTCH })).toBe(true);
    expect(isFieldRequired('vNotchCount', { subformId: 88, fmaId: 22648 })).toBe(false);
  });

  test('MAR 38b broodstock count: mandatory on 38b lobster, blocked elsewhere', () => {
    expect(isFieldRequired('nbSpcmnBrd', { subformId: 90, fmaId: DFO_FMA_38B })).toBe(true);
    expect(isFieldRequired('nbSpcmnBrd', { subformId: 90, fmaId: LFA34 })).toBe(false);
  });

  test('Carrier VRN: mandatory the moment the carrier question is Yes (Rule 642)', () => {
    const base = { transferTime: '10:00', transferWt: '50', transferToVrn: '104460',
      transferToPndNum: '', carrierVrn: '', useCrInd: 'Y' };
    const rows = missingInContainer('transfer', { subformId: 88 }, base);
    expect(rows.map(m => m.fieldKey)).toContain('carrierVrn');
    const rowsNo = missingInContainer('transfer', { subformId: 88 }, { ...base, useCrInd: 'N' });
    expect(rowsNo.map(m => m.fieldKey)).not.toContain('carrierVrn');
  });

  test('Transfer destination: exactly ONE of VRN / pound — both filled now refused (Rule 252)', () => {
    const values = { transferTime: '10:00', transferWt: '50', carrierVrn: '', useCrInd: 'N' };
    const both = missingInContainer('transfer', { subformId: 88 },
      { ...values, transferToVrn: '104460', transferToPndNum: 'P12' });
    expect(both.map(m => m.reason)).toContain('pair-both');
    const none = missingInContainer('transfer', { subformId: 88 },
      { ...values, transferToVrn: '', transferToPndNum: '' });
    expect(none.map(m => m.reason)).toContain('pair-none');
    const one = missingInContainer('transfer', { subformId: 88 },
      { ...values, transferToVrn: '104460', transferToPndNum: '' });
    expect(one).toHaveLength(0);
  });

  test('typed values must be valid: soak range and crew count now refuse (the door never value-checked)', () => {
    const soakRows = missingInContainer('effort', { subformId: 89, fmaId: 19322 }, {
      fmaId: '19322', haulStartTime: '06:00', haulEndTime: '13:30', sarInd: 'N', mmInterInd: 'N',
      trapHauls: '200', catchWeight: '250', soakDuration: '12',
      gpsLat: '48.4488', gpsLng: '-68.5236',
    }).filter(m => m.fieldKey === 'soakDuration');
    expect(soakRows.map(m => m.reason)).toEqual(['invalid']);

    const crewRows = missingInContainer('trip', { subformId: 90 }, {
      startDt: '2026-07-19', sailTime: '05:30', crewNb: '25', bycatchAnswered: 'N',
    }).filter(m => m.fieldKey === 'crewNb');
    expect(crewRows.map(m => m.reason)).toEqual(['invalid']);
  });

  test('the R-A three are app-supplied — never marked, never gated by the door', () => {
    for (const key of ['operName', 'lgbkUid', 'firstEntryDt']) {
      expect(isFieldRequired(key, { subformId: 90 })).toBe(false);
    }
  });
});
