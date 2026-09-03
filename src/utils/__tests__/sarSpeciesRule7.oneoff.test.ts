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
