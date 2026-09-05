// ONE-OFF (S159 P3 guard): Rule 7 — only six species-at-risk values may be available.
// The MV_SAR_LIST reftable stays WHOLE (DFO's table, 16 rows — the S159 recon's "17
// rows / 11 invalid" was off by one, a grep that counted the interface line; corrected
// here and in the gate doc); stored legacy values keep resolving their display from it,
// and only the OPTION SOURCE narrows. Before S159 all 16 rows were offered — 10 of
// them Rule-7-invalid, including 15620, the North Atlantic
// Right Whale — and an invalid pick TRANSMITTED (the validator types SPECIE_ID as a bare
// id). Every SAR emission ever sent is 10561/4561 (S159 recon item 3 scan), so this
// closes the door before anything dirty ever went through it.
import * as fs from 'fs';
import * as path from 'path';
import { DFO_SAR_SPECIES_OFFERED, DFO_SAR_RULE7_CODE_IDS } from '../dfoConstants';
import { MV_SAR_LIST } from '../../data/reftables';
import { generateElogXml, validateElogXml } from '../dfoXmlGenerator';
import { closeAllGroups } from './support/closeAllGroups';

// S159 Phase 6 fixture — the genSampleSarS66b MAR-90/38b shape, SAR species variable.
const profile: any = {
  operatorName: 'Test Operator', vesselNumber: '123456',
  fishingNumber: '300123', licenceHolderFin: '123456789', units: 'lbs', language: 'en',
};
function sarLog(speciesCodeId: string): any {
  const log: any = closeAllGroups({
    id: 'sar-s159p6', dateFished: '2026-06-10', lgbkUid: 'ABCDEF',
    firstEntryDt: '2026-06-10T08:55:00.000Z', sentToDfo: false, subformId: 90, regId: 1004,
    data: {
      timeSailed: '05:30', timeStartedHauling: '06:00', timeStoppedHauling: '13:30',
      timeOfLanding: '14:45', crewRegistry: JSON.stringify(['Crew One', 'Crew Two']),
      catchWeight: '500', trapHauls: '250', bycatchEntries: '[]', personalUse: '10',
      dgClosePcons: '2026-06-10T15:00:00.000Z', fmaId: '28599', lgridCodeId: '101',
      portLandedCodeId: '20913', gpsLat: '44.1234', gpsLng: '-66.5432', gpsSrc: 'gps',
      nbSpcmnBrd: '3', baitEntries: JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]),
      mmYes: 'false', lostGearYes: 'false',
      hlinCompany: 'Atlantic Catch Data Ltd.', hlinConfirmNo: 'HI-1001',
      // S161: the Rule 660/661 validator arm made ETA_DT + TOT_WT_ONBRD required on a 38b
      // HLIN — this fixture predates the arm (the S154D fixture rule: lawful source, never
      // a weakened assertion). No companion date: the trip-day fallback is the proven path.
      hlinEta: '12:00', hlinTotalWeight: '111',
      hloutCompany: 'Atlantic Catch Data Ltd.', hloutConfirmNo: 'HO-1001',
      dgCloseHlin: '2026-06-10T15:00:00.000Z', dgCloseHlout: '2026-06-10T15:00:00.000Z',
      sarYes: 'true', sarSpecies: speciesCodeId,
      sarLat: '44.1234', sarLng: '-66.5432', sarGpsSrc: 'gps',
      sarDate: '2026-06-10', sarTime: '12:15', sarNbSpcmn: '1', sarCondId: '11881',
    },
  });
  return log;
}

describe('Rule 7 — the offered list is exactly the six', () => {
  test('six rows, exactly the Rule 7 codeIds', () => {
    expect(DFO_SAR_SPECIES_OFFERED).toHaveLength(6);
    expect(DFO_SAR_SPECIES_OFFERED.map(r => r.codeId).sort((a, b) => a - b))
      .toEqual([1363, 1375, 1382, 4561, 10561, 14009]);
  });
  test('15620 — the North Atlantic Right Whale — is no longer offered', () => {
    expect(DFO_SAR_RULE7_CODE_IDS.has(15620)).toBe(false);
    expect(DFO_SAR_SPECIES_OFFERED.some(r => r.codeId === 15620)).toBe(false);
    // ...but it IS still in DFO's reftable — the table stays whole.
    expect(MV_SAR_LIST.some(r => r.codeId === 15620)).toBe(true);
  });
  test('the reftable stays whole (16 rows — the S66a ingest count)', () => {
    expect(MV_SAR_LIST).toHaveLength(16);
  });
  test('the existing fixture value 10561 (Leatherback) survives for the RIGHT reason — it is one of the six', () => {
    expect(DFO_SAR_RULE7_CODE_IDS.has(10561)).toBe(true);
    expect(DFO_SAR_SPECIES_OFFERED.some(r => r.codeId === 10561)).toBe(true);
  });
});

describe('S159 Phase 6 — the send door refuses an off-list SAR species (Rule 7)', () => {
  test('a legacy stored 15620 (right whale) emits, and the validator now refuses it as the ONLY error', () => {
    const xml = generateElogXml(sarLog('15620'), profile);
    expect(xml).toContain('<SPECIE_ID>15620</SPECIE_ID>'); // the emit is verbatim — the VALIDATOR is the net
    const result = validateElogXml(xml, 90);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Rule 7');
  });
  test('a lawful species (10561, Leatherback) passes whole-document validation — no legal value convicted', () => {
    const result = validateElogXml(generateElogXml(sarLog('10561'), profile), 90);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });
});

describe('source wiring — both render paths read the whitelist (grep-shaped; the walk proves the render)', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', '..', 'components', 'FullDfoForm.tsx'), 'utf8');

  test('blocks 2+ map the whitelist, not the reftable', () => {
    expect(src).toContain('DFO_SAR_SPECIES_OFFERED.map(o => (');
    expect(src).not.toContain('MV_SAR_LIST.map');
  });
  test('block 1 passes the whitelist into renderIncidentFields', () => {
    expect(src).toContain('DFO_SAR_SPECIES_OFFERED, // S159 (P3, Rule 7)');
  });
  test('the stored-value DISPLAY keeps resolving from the whole reftable', () => {
    expect(src).toContain('MV_SAR_LIST.find(o => String(o.codeId) === s.species)');
  });
});
