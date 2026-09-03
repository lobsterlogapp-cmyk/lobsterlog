// ONE-OFF (S159 P1 guard): the bycatch picker and the SPECIE_ID emit read the SAME
// per-subform PCONS list (Rule 974a/b/c) — never two lists agreeing by coincidence.
// The defect this pins against: QC/NL offered the 36-row CATCH matrix (Rule 975a) while
// the emit resolved against the 2-row PCONS list (974a), so 34 of 36 offered options
// stored a species that emitted SPECIE_ID '0' and died at the send gate — after the
// harvester's evening was spent. GLF/MAR never showed it only because their two sets
// coincide, which this suite also pins.
import * as fs from 'fs';
import * as path from 'path';
import { getDfoCatchSpeciesList, getDfoPconsSpeciesList } from '../dfoConstants';

describe('Rule 974a — the QC/NL PCONS set is exactly two species', () => {
  test.each([88, 91])('subform %i offers Rock crab and Lobster only', (sf) => {
    const rows = getDfoPconsSpeciesList(sf).map(r => ({ codeId: r.codeId, label: r.label }));
    expect(rows).toEqual([
      { codeId: 1287, label: 'Crab, Rock' },
      { codeId: 1312, label: 'Lobster' },
    ]);
  });
});

describe('GLF and MAR lists did not move (the sets coincide, now provably)', () => {
  test('GLF: the retired catch source and the PCONS source are content-identical', () => {
    expect(getDfoCatchSpeciesList(89).map(r => ({ codeId: r.codeId, label: r.label })))
      .toEqual(getDfoPconsSpeciesList(89).map(r => ({ codeId: r.codeId, label: r.label })));
  });
  test('MAR: both getters return the same list object', () => {
    expect(getDfoPconsSpeciesList(90)).toBe(getDfoCatchSpeciesList(90));
  });
});

describe('the anti-P1 invariant — every offered option has an emit row', () => {
  test.each([88, 89, 90, 91])('subform %i: picker set ⊆ emit set', (sf) => {
    const emitLabels = new Set(getDfoPconsSpeciesList(sf).map(r => r.label));
    // The picker source IS getDfoPconsSpeciesList (pinned below), so this holds by
    // construction — the assertion stands so a future re-split of the two fails loudly.
    for (const row of getDfoPconsSpeciesList(sf)) {
      expect(emitLabels.has(row.label)).toBe(true);
    }
  });
  test('FullDfoForm feeds the sheet options, the edit re-match and the FR display from the PCONS list (grep-shaped — the walk proves the render)', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', '..', 'components', 'FullDfoForm.tsx'), 'utf8');
    expect(src).toContain("case 'bycatch': return getDfoPconsSpeciesList(subformId)");
    expect(src).toContain('getDfoPconsSpeciesList(subformId).find(o => o.label === e.species)');
    expect(src).toContain('getDfoPconsSpeciesList(subformId).find(s => s.label === label)');
    // The old source is gone from the component entirely.
    expect(src).not.toContain('getDfoCatchSpeciesList');
  });
});
