// ONE-OFF (S159 guard): Rules 651a/b — the Gulf bycatch size is species-conditional.
//   • glfLegalSpecieSzIds is THE one encoding of the fact-sheet matrix (651a lobster →
//     826/828; 651b anything else → 10670).
//   • The validator legality check BITES: crab+826 (the exact shape DFO accepted as
//     CONF 164080/164081 — nothing server-side enforces 651b) and lobster+10670 are
//     both refused before a POST.
//   • The validator does NOT convict a legal value: lobster+826, lobster+828 and
//     crab+10670 all pass whole-document validation.
//   • Source-wiring checks on FullDfoForm.tsx (this repo cannot render it under jest —
//     S154B pattern). BLIND SPOT, written down as S154B requires: these are grep-shaped;
//     they prove the component TELLS the legality function, not that it tells it
//     correctly. The on-glass walk is the proof of the render.
import * as fs from 'fs';
import * as path from 'path';
import { generateElogXml, validateElogXml } from '../dfoXmlGenerator';
import { glfLegalSpecieSzIds } from '../dfoConstants';
import { closeAllGroups } from './support/closeAllGroups';

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

// The complete-valid GLF-89 fixture (validateSpecieSzId.oneoff shape) with the bycatch
// rows as the one variable.
function glfLog(bycatchRows: object[]): any {
  return {
    id: 'test-log-89',
    dateFished: '2026-06-10',
    lgbkUid: 'ABCDEF',
    firstEntryDt: '2026-06-10T08:55:00.000Z',
    sentToDfo: false,
    subformId: 89,
    regId: 1014,
    data: {
      timeSailed: '05:30',
      timeStartedHauling: '06:00',
      timeStoppedHauling: '13:30',
      timeOfLanding: '14:45',
      crewRegistry: '[]',
      catchWeight: '500',
      trapHauls: '250',
      bycatchEntries: JSON.stringify(bycatchRows),
      personalUse: '10',
      dgClosePcons: '2026-06-10T15:00:00.000Z',
      mmYes: 'false',
      sarYes: 'false',
      lostGearYes: 'false',
      hlinCompany: '',
      hlinConfirmNo: '',
      hloutCompany: '',
      hloutConfirmNo: '',
      fmaId: '1526',
      portLanded: 'ABOITEAU',
      portLandedCodeId: '19322',
      soakDuration: '2',
      baitEntries: JSON.stringify([{ type: 'Squid, Illex', lbs: '100' }]),
      gpsLat: '46.2412',
      gpsLng: '-64.5433',
      gpsSrc: 'manual',
    },
  };
}

const validate = (rows: object[]) => {
  const xml = generateElogXml(closeAllGroups(glfLog(rows)), profile);
  return { xml, result: validateElogXml(xml, 89) };
};

describe('Rules 651a/b — the one legality encoding', () => {
  test('lobster (1312) → 826 and 828 only, number or string in', () => {
    expect(glfLegalSpecieSzIds(1312)).toEqual(['826', '828']);
    expect(glfLegalSpecieSzIds('1312')).toEqual(['826', '828']);
  });
  test('any other species → 10670 Unsized only — including the unmatched/custom case', () => {
    expect(glfLegalSpecieSzIds(1287)).toEqual(['10670']);   // Crab, Rock
    expect(glfLegalSpecieSzIds('1921')).toEqual(['10670']); // Cunner
    expect(glfLegalSpecieSzIds(null)).toEqual(['10670']);   // legacy custom 'Other' row
    expect(glfLegalSpecieSzIds(undefined)).toEqual(['10670']);
  });
});

describe('validator legality check — the gate BITES', () => {
  test('crab + 826 (the CONF 164081 shape) is refused, naming Rule 651b', () => {
    const { xml, result } = validate([{ species: 'Crab, Rock', lbs: '15', specieSzId: '826' }]);
    expect(xml).toContain('<SPECIE_SZ_ID>826</SPECIE_SZ_ID>'); // the emit is verbatim — the VALIDATOR is the net
    expect(result.valid).toBe(false);
    // Exactly ONE error, and it is the legality one — proving the fixture is otherwise
    // clean, so the refusal comes from the new check and nothing else.
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Rule 651b');
  });
  test('lobster + 10670 is refused, naming Rule 651a', () => {
    const { result } = validate([{ species: 'Lobster', lbs: '40', specieSzId: '10670' }]);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Rule 651a');
  });
});

describe('validator legality check — a LEGAL value is not convicted', () => {
  test('lobster + 828 passes whole-document validation', () => {
    const { result } = validate([{ species: 'Lobster', lbs: '40', specieSzId: '828' }]);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });
  test('lobster + 826 passes (651a allows Small as well as Large)', () => {
    const { result } = validate([{ species: 'Lobster', lbs: '40', specieSzId: '826' }]);
    expect(result.valid).toBe(true);
  });
  test('crab + 10670 passes — the pair every non-lobster row now stores', () => {
    const { result } = validate([{ species: 'Crab, Rock', lbs: '15', specieSzId: '10670' }]);
    expect(result.valid).toBe(true);
  });
  test('a mixed doc — lobster+828 beside crab+10670 — passes; each node judged on its own species', () => {
    const { result } = validate([
      { species: 'Lobster', lbs: '40', specieSzId: '828' },
      { species: 'Crab, Rock', lbs: '15', specieSzId: '10670' },
    ]);
    expect(result.valid).toBe(true);
  });
});

describe('source wiring — FullDfoForm consumes the ONE legality function (grep-shaped)', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', '..', 'components', 'FullDfoForm.tsx'), 'utf8');

  test('the size options no longer map the whole reftable', () => {
    // Phase 1's sole MV_SPECIES_SIZE.map was the eight-row option list; Phase 2 removed it.
    expect(src).not.toContain('MV_SPECIES_SIZE.map');
  });
  test('the option list filters by the legality set', () => {
    expect(src).toContain('MV_SPECIES_SIZE.filter(s => szLegal.includes(String(s.codeId)))');
  });
  test('the species-change handler re-derives the size from the legality set', () => {
    expect(src).toContain('glfLegalSpecieSzIds(opt.codeId)');
  });
  test('the edit seed normalizes a stored size against the legality set', () => {
    expect(src).toContain('glfLegalSpecieSzIds(match?.codeId)');
  });
});
