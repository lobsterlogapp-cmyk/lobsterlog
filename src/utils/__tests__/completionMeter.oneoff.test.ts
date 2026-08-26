// ONE-OFF (S141 P4): the completion meter is table-driven (R-C ruling). Pins:
//   • the recon's worked example — a complete MAR-90 / LFA 34 log reads 100% (the retired
//     proposal-era list read it 56%), and stripping five fields reads exactly 9 of 14 = 64%
//     (the ruling's own example string);
//   • the denominator follows the log's OWN context (region, FMA, no-haul day);
//   • 100% ⇔ the close-all door accepts: unanswered toggles, empty-Yes bycatch, SAR blocks,
//     invalid values and the QC transfer pair all hold the bar below 100%.
import { getCompletionDetails, DfoLog } from '../dfoLogStorage';

const LFA34 = '1589';

const marLog = (data: Record<string, string>, subformId = 90): DfoLog => ({
  id: 'LL-TEST-001', lgbkUid: 'ABCDEF', firstEntryDt: '2026-07-19T09:00:00Z',
  mode: 'full', status: 'draft',
  dateFished: data.dateFished ?? '2026-07-19', createdAt: 0,
  data, subformId, regId: 1004,
});

const COMPLETE_MAR: Record<string, string> = {
  dateFished: '2026-07-19', timeSailed: '05:30',
  crewRegistry: '[{"name":"A"}]', bycatchYes: 'false',
  fmaId: LFA34, timeStartedHauling: '06:00', timeStoppedHauling: '13:30',
  sarYes: 'false', mmYes: 'false',
  trapHauls: '200', catchWeight: '250', lgridCodeId: '101',
  portLanded: 'Abbott’s Harbour', timeOfLanding: '14:45',
};

describe('S141 P4 — table-driven completion meter', () => {
  test('the worked example: a complete MAR-90 / LFA 34 log reads 100% (14 of 14)', () => {
    const d = getCompletionDetails(marLog(COMPLETE_MAR));
    expect(d).toEqual({ filled: 14, total: 14, pct: 100 });
  });

  test('the ruling’s example: five fields short reads 9 of 14 = 64%', () => {
    const d = getCompletionDetails(marLog({
      ...COMPLETE_MAR,
      portLanded: '', timeOfLanding: '', lgridCodeId: '', catchWeight: '', trapHauls: '',
    }));
    expect(d).toEqual({ filled: 9, total: 14, pct: 64 });
  });

  test('the denominator follows the LFA: off the settlement-grid set the total drops to 13', () => {
    const d = getCompletionDetails(marLog({
      ...COMPLETE_MAR, fmaId: '1594', lgridCodeId: '', // LFA 40 — grid not required
    }));
    expect(d.total).toBe(13);
    expect(d.pct).toBe(100);
  });

  test('a no-haul day counts trip + landing only (6 units on MAR)', () => {
    const d = getCompletionDetails(marLog({
      dateFished: '2026-07-19', timeSailed: '05:30', crewRegistry: '[{"name":"A"}]',
      bycatchYes: 'false', effortYes: 'false',
      portLanded: 'Abbott’s Harbour', timeOfLanding: '14:45',
    }));
    expect(d).toEqual({ filled: 6, total: 6, pct: 100 });
  });

  test('unanswered toggles hold the bar down: bycatch/SAR/MM unanswered are open units', () => {
    const d = getCompletionDetails(marLog({
      ...COMPLETE_MAR, bycatchYes: 'null', sarYes: 'null', mmYes: 'null',
    }));
    expect(d.total).toBe(14);
    expect(d.filled).toBe(11);
  });

  test('bycatch Yes with no rows adds one open unit (the R-B check’s meter twin)', () => {
    const d = getCompletionDetails(marLog({ ...COMPLETE_MAR, bycatchYes: 'true' }));
    expect(d.total).toBe(15);
    expect(d.filled).toBe(14);
    const withRow = getCompletionDetails(marLog({
      ...COMPLETE_MAR, bycatchYes: 'true',
      bycatchEntries: '[{"species":"Jonah Crab","lbs":"5","usage":"Bait"}]',
    }));
    expect(withRow.pct).toBe(100);
  });

  test('a SAR=Yes log counts its SAR block; a blank block holds the bar below 100%', () => {
    const d = getCompletionDetails(marLog({ ...COMPLETE_MAR, sarYes: 'true' }));
    expect(d.total).toBe(19); // + sarDateTime, species, count, condition, GPS
    expect(d.filled).toBe(14);
  });

  test('a filled-but-invalid value does not count (soak beyond 9 days on GLF)', () => {
    const glf: Record<string, string> = {
      dateFished: '2026-07-19', timeSailed: '05:30', bycatchYes: 'false',
      fmaId: '19322', timeStartedHauling: '06:00', timeStoppedHauling: '13:30',
      sarYes: 'false', mmYes: 'false', trapHauls: '200', catchWeight: '250',
      soakDuration: '2', gpsLat: '48.4488', gpsLng: '-68.5236',
      portLanded: 'Aboiteau', timeOfLanding: '14:45',
    };
    const ok = getCompletionDetails(marLog(glf, 89));
    expect(ok.pct).toBe(100);
    const bad = getCompletionDetails(marLog({ ...glf, soakDuration: '12' }, 89));
    expect(bad.total).toBe(ok.total);
    expect(bad.filled).toBe(ok.filled - 1);
  });

  test('QC transfer: the pair counts as ONE unit, filled only when exactly one is set', () => {
    const qc: Record<string, string> = {
      dateFished: '2026-07-19', timeSailed: '05:30', crewRegistry: '[{"name":"A"}]',
      departurePort: 'Rimouski', bycatchYes: 'false',
      fmaId: '22648', timeStartedHauling: '06:00', timeStoppedHauling: '13:30',
      sarYes: 'false', mmYes: 'false', trapHauls: '200', catchWeight: '250',
      soakDuration: '2', gpsLat: '48.4488', gpsLng: '-68.5236',
      portLanded: 'Rimouski', timeOfLanding: '14:45',
      transferYes: 'true', transferTime: '10:00', transferWt: '50',
      transferToVrn: '104460', transferToPndNum: '', useCrInd: 'N', carrierVrn: '',
    };
    const ok = getCompletionDetails(marLog(qc, 88));
    expect(ok.pct).toBe(100);
    const both = getCompletionDetails(marLog({ ...qc, transferToPndNum: 'P12' }, 88));
    expect(both.filled).toBe(ok.filled - 1);
    expect(both.total).toBe(ok.total);
  });

  test('the legacy proposal meter is unchanged in behaviour', () => {
    const d = getCompletionDetails({
      id: 'P-1', lgbkUid: 'ABCDEF', firstEntryDt: '2026-07-19T09:00:00Z',
      mode: 'proposal', status: 'draft', dateFished: '2026-07-19', createdAt: 0,
      data: { departurePort: 'X', portLanded: 'Y' }, subformId: 90, regId: 1004,
    });
    expect(d.total).toBe(10); // 9 fields + the bycatch array unit
    expect(d.filled).toBe(3); // dateFished + the two ports
  });
});
