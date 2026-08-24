// ONE-OFF (S137 hail conformance, Phase 1): pins the single-sourced hail-area predicates
// (Rules 2024/2025 trigger = ANY effort in 38b/41; Rules 660/661 trigger = ANY effort in
// 38b) and the emit-side closure of the multi-effort hole — a log whose SECOND effort
// fishes 38b must emit its hail groups (the effort-1-only gate silently dropped them).
// Authority: docs/RECON_S137_HAIL_MANDATORY.md + docs/GATE_S137_HAIL_CONFORMANCE.md.
import { fishesHailArea, fishes38b, usedDataGroupKeys, dataGroupInputsFromLog } from '../dfoLogStorage';
import { generateElogXml } from '../dfoXmlGenerator';
import { closeAllGroups } from './support/closeAllGroups';

const extra = (fmaId: string) =>
  JSON.stringify([{ fmaId, sarYes: 'false', mmYes: 'false', closeDt: '2026-06-10T15:00:00.000Z' }]);

describe('fishesHailArea — Rules 2024/2025 trigger, any effort', () => {
  test('effort 1 in 38b qualifies', () => {
    expect(fishesHailArea({ fmaId: '28599' })).toBe(true);
  });
  test('effort 1 in 41 qualifies', () => {
    expect(fishesHailArea({ fmaId: '1595' })).toBe(true);
  });
  test('a non-hail area does not qualify', () => {
    expect(fishesHailArea({ fmaId: '38065' })).toBe(false);
  });
  test('THE HOLE: effort 2 in 38b qualifies even when effort 1 is elsewhere', () => {
    expect(fishesHailArea({ fmaId: '38065', extraEffortNodes: extra('28599') })).toBe(true);
  });
  test('effort 2 in 41 qualifies', () => {
    expect(fishesHailArea({ fmaId: '38065', extraEffortNodes: extra('1595') })).toBe(true);
  });
  test('no FMA anywhere / malformed extras stay false', () => {
    expect(fishesHailArea({})).toBe(false);
    expect(fishesHailArea({ extraEffortNodes: 'not-json' })).toBe(false);
  });
});

describe('fishes38b — Rules 660/661 trigger (ETA/weight), 38b only', () => {
  test('38b qualifies; 41 alone does NOT', () => {
    expect(fishes38b({ fmaId: '28599' })).toBe(true);
    expect(fishes38b({ fmaId: '1595' })).toBe(false);
  });
  test('a second-effort 38b qualifies', () => {
    expect(fishes38b({ fmaId: '1595', extraEffortNodes: extra('28599') })).toBe(true);
  });
});

describe('used-groups + emit ride the same predicate', () => {
  const profile: any = {
    operatorName: 'Test Operator', vesselNumber: '123456',
    fishingNumber: '300123', licenceHolderFin: '123456789', units: 'lbs', language: 'en',
  };
  const marLog = (fma: string, extraFma?: string): any => closeAllGroups({
    id: 'test-hail-anyeffort', dateFished: '2026-06-10', lgbkUid: 'ABCDEF',
    firstEntryDt: '2026-06-10T08:55:00.000Z', sentToDfo: false, subformId: 90, regId: 1004,
    data: {
      fmaId: fma, lgridCodeId: '101',
      timeSailed: '05:30', timeStartedHauling: '06:00', timeStoppedHauling: '13:30',
      timeOfLanding: '14:45', crewRegistry: JSON.stringify(['Crew One']),
      catchWeight: '500', trapHauls: '250', bycatchEntries: '[]', personalUse: '',
      portLandedCodeId: '20913', mmYes: 'false', sarYes: 'false',
      hlinCompany: 'Resmar', hlinConfirmNo: 'HC123',
      hloutCompany: 'Atlantic Catch Data Ltd.', hloutConfirmNo: 'HO456',
      ...(extraFma ? { extraEffortNodes: extra(extraFma) } : {}),
    },
  });

  test('dataGroupInputsFromLog marks hail used on a second-effort-38b log', () => {
    const keys = usedDataGroupKeys(dataGroupInputsFromLog(marLog('38065', '28599')));
    expect(keys).toContain('dgCloseHlin');
    expect(keys).toContain('dgCloseHlout');
  });
  test('emit: second-effort 38b emits both hail groups (the hole, closed)', () => {
    const xml = generateElogXml(marLog('38065', '28599'), profile);
    expect(xml).toContain('<HLIN>');
    expect(xml).toContain('<HLOUT>');
    expect(xml).toContain('<HLIN_CIE_ID>11682</HLIN_CIE_ID>'); // Resmar, Rule 27
  });
  test('emit: a non-qualifying log emits neither group even with hail data stored', () => {
    const xml = generateElogXml(marLog('38065'), profile);
    expect(xml).not.toContain('<HLIN>');
    expect(xml).not.toContain('<HLOUT>');
  });
});

// Faithful mirror of the FullDfoForm handleSave appended hail block (the gpsCoordsSaveGate
// mirror pattern): subformId 90 + hailRequired → all four fields must be non-blank.
function hailGateMissing(
  subformId: number,
  hailRequired: boolean,
  f: { hlinCompany: string; hlinConfirmNo: string; hloutCompany: string; hloutConfirmNo: string },
): string[] {
  const missing: string[] = [];
  if (subformId === 90 && hailRequired) {
    if (!f.hlinCompany.trim()) missing.push('hlinCompany');
    if (!f.hlinConfirmNo.trim()) missing.push('hlinConfirmNo');
    if (!f.hloutCompany.trim()) missing.push('hloutCompany');
    if (!f.hloutConfirmNo.trim()) missing.push('hloutConfirmNo');
  }
  return missing;
}

describe('save-gate mirror — the appended hail block (Phase A enforcement)', () => {
  const blank = { hlinCompany: '', hlinConfirmNo: '', hloutCompany: '', hloutConfirmNo: '' };
  const full = { hlinCompany: 'Resmar', hlinConfirmNo: 'HC1', hloutCompany: 'Seaweigh', hloutConfirmNo: 'HO1' };
  test('qualifying MAR log with an empty hail refuses on all four fields', () => {
    expect(hailGateMissing(90, true, blank)).toHaveLength(4);
  });
  test('qualifying MAR log with a filled hail passes', () => {
    expect(hailGateMissing(90, true, full)).toHaveLength(0);
  });
  test('partial fill names exactly the blank fields', () => {
    expect(hailGateMissing(90, true, { ...full, hloutConfirmNo: ' ' })).toEqual(['hloutConfirmNo']);
  });
  test('non-qualifying log never gates, even with fields blank', () => {
    expect(hailGateMissing(90, false, blank)).toHaveLength(0);
  });
  test('other subforms never gate (hail Blocked on 88/89/91)', () => {
    expect(hailGateMissing(88, true, blank)).toHaveLength(0);
    expect(hailGateMissing(91, true, blank)).toHaveLength(0);
  });
});
