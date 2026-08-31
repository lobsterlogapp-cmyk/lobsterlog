// S153 Phase 2 — convert at close.
//
// WHAT THIS PINS
// R1: a weight is converted to kilograms and STORED that way when its section closes.
// R2: a group already closed keeps its number AND its unit — a later close does not touch it.
// R4: two groups of one log, and (founder ruling A) two rows of one card, may carry different
//     units, because each seals at its own moment with the toggle as it stood then.
//
// WHY THE SEALERS ARE PURE FUNCTIONS
// The close handlers live in FullDfoForm, which this repo cannot render under jest. The
// conversion therefore lives in dfoLogStorage as one pure sealer per group — the same shape
// the close STAMP helpers already use — so each group is independently testable and
// independently MUTABLE. Every describe block below names the DFO element it guards, so a
// mutation of one sealer fails one block and nothing else.
//
// WHAT THIS DOES **NOT** COVER, stated honestly: that FullDfoForm calls the right sealer for
// the right group. That wiring is not reachable from jest and must be caught on the walk.
import {
  weightToKg,
  LBS_PER_KG,
  sealBaitRowWeights,
  sealBycatchRowWeights,
  sealEffort1Weights,
  sealEffortNodeWeights,
  sealPersonalUseWeight,
  sealTransferWeight,
  sealHailInWeight,
  sealSarBlock1Weight,
  sealSarBlockWeights,
  reunitOpenWeights,
  DRAFT_WEIGHT_UNIT_KEY,
} from '../dfoLogStorage';
import type { ExtraEffortNode, ExtraEffortDetail, ExtraSarDetail, WeightUnit } from '../dfoLogStorage';

// The row shapes the sealers accept. Declared here so the generic resolves to a type that
// HAS closeUnit — an inline literal without it makes T too narrow to read the tag back.
type BaitRow = { type: string; lbs: string; closeDt?: string; closeUnit?: WeightUnit };
type BycatchRow = { species: string; lbs: string; closeDt?: string; closeUnit?: WeightUnit };

// 100 lb -> 45.359291 kg. STORED at STORED_KG_DECIMALS places, not the two the wire carries:
// storing 2dp would make 40 lb read back as 39.99 on a card that can no longer be edited
// (founder ruling, Phase 5 §5.1). The emit still rounds to 2dp, so the bytes do not move —
// that is what the Phase 3 byte-identity proof re-establishes after this amendment.
const HUNDRED_LB_IN_KG = '45.359291';

describe('S153 Phase 2 — weightToKg, the one arithmetic', () => {
  test('pounds are divided and fixed to 2dp', () => {
    expect(weightToKg('100', 'lbs')).toBe(HUNDRED_LB_IN_KG);
    expect(weightToKg('250', 'lbs')).toBe('113.398227');
  });

  test('kilograms are returned untouched — a converted number is never converted again', () => {
    expect(weightToKg('45.359291', 'kg')).toBe('45.359291');
    expect(weightToKg('100', 'kg')).toBe('100');
  });

  test('a declared zero survives (Rule 789)', () => {
    expect(weightToKg('0', 'lbs')).toBe('0.000000');
    expect(weightToKg('0', 'kg')).toBe('0');
  });

  test('blank, non-numeric and negative are returned exactly as-is', () => {
    for (const junk of ['', '   ', 'abc', '-5']) {
      expect(weightToKg(junk, 'lbs')).toBe(junk);
    }
  });

  test('THE RULING: a typed weight reads back as itself, with no drift', () => {
    // This is why storage keeps more places than the wire. At 2dp, 40 lb stored as 18.14 kg
    // reads back as 39.99. Every value here must survive the round trip exactly.
    // Trailing zeros are only meaningful after a decimal point — '100' must not become '1'.
    const strip = (v: string) => (v.includes('.') ? v.replace(/0+$/, '').replace(/\.$/, '') : v);
    for (const typed of ['100', '250', '450', '40', '55', '22', '12', '99', '1', '2', '0.5', '100.5', '12.3', '7.25', '1234']) {
      const stored = weightToKg(typed, 'lbs');
      const back = strip((Number(stored) * LBS_PER_KG).toFixed(2));
      expect(back).toBe(strip(typed));
    }
  });

  test('the constant is pounds-per-kilogram, not its reciprocal', () => {
    expect(LBS_PER_KG).toBeCloseTo(2.20462, 5);
    expect(Number(weightToKg('2.20462', 'lbs'))).toBeCloseTo(1, 2);
  });
});

describe('S153 Phase 2 — BAIT_USED.BT_WT', () => {
  test('an open row converts and is tagged', () => {
    const [row] = sealBaitRowWeights<BaitRow>([{ type: 'Mackerel', lbs: '100' }], 'lbs');
    expect(row.lbs).toBe(HUNDRED_LB_IN_KG);
    expect(row.closeUnit).toBe('lbs');
  });

  test('closing on kg stores the typed number and tags it kg', () => {
    const [row] = sealBaitRowWeights<BaitRow>([{ type: 'Mackerel', lbs: '100' }], 'kg');
    expect(row.lbs).toBe('100');
    expect(row.closeUnit).toBe('kg');
  });

  test('R2: a row already closed is untouched — number and unit both keep', () => {
    // Deliberately a 2dp literal: a row sealed under the pre-amendment rule must still be
    // returned untouched. R2 protects what is closed, whatever precision it was closed at.
    const closed = { type: 'Mackerel', lbs: '45.36', closeDt: '2026-08-27T10:00:00.000Z', closeUnit: 'lbs' as const };
    const [row] = sealBaitRowWeights([closed], 'kg');
    expect(row).toEqual(closed);
  });

  test('R4: onlyIndex seals ONE row, leaving its neighbour open and unconverted', () => {
    const rows: BaitRow[] = [{ type: 'A', lbs: '100' }, { type: 'B', lbs: '100' }];
    const next = sealBaitRowWeights(rows, 'lbs', 0);
    expect(next[0].lbs).toBe(HUNDRED_LB_IN_KG);
    expect(next[0].closeUnit).toBe('lbs');
    expect(next[1].lbs).toBe('100');
    expect(next[1].closeUnit).toBeUndefined();
  });

  test('two rows of one card can end up in different units', () => {
    let rows: BaitRow[] = [{ type: 'A', lbs: '100' }, { type: 'B', lbs: '100' }];
    rows = sealBaitRowWeights(rows, 'lbs', 0).map((r, i) => (i === 0 ? { ...r, closeDt: 'T1' } : r));
    rows = sealBaitRowWeights(rows, 'kg', 1).map((r, i) => (i === 1 ? { ...r, closeDt: 'T2' } : r));
    expect(rows[0]).toMatchObject({ lbs: HUNDRED_LB_IN_KG, closeUnit: 'lbs' });
    expect(rows[1]).toMatchObject({ lbs: '100', closeUnit: 'kg' });
  });
});

describe('S153 Phase 2 — PCONS.WT (bycatch)', () => {
  test('an open row converts and is tagged', () => {
    const [row] = sealBycatchRowWeights<BycatchRow>([{ species: 'Crab, Rock', lbs: '100' }], 'lbs');
    expect(row.lbs).toBe(HUNDRED_LB_IN_KG);
    expect(row.closeUnit).toBe('lbs');
  });

  test('R2: a row already closed is untouched', () => {
    const closed = { species: 'Crab, Rock', lbs: '5.44', closeDt: 'T', closeUnit: 'lbs' as const };
    expect(sealBycatchRowWeights([closed], 'kg')[0]).toEqual(closed);
  });

  test('onlyIndex seals one row', () => {
    const next = sealBycatchRowWeights<BycatchRow>([{ species: 'A', lbs: '100' }, { species: 'B', lbs: '100' }], 'lbs', 1);
    expect(next[0].lbs).toBe('100');
    expect(next[1].lbs).toBe(HUNDRED_LB_IN_KG);
  });
});

describe('S153 Phase 2 — CATCH.KEPT_WT, effort 1', () => {
  test('the top-level catch weight AND every trap group convert together', () => {
    const details: ExtraEffortDetail[] = [{ catchWeight: '100' }, { catchWeight: '250' }];
    const sealed = sealEffort1Weights('100', details, 'lbs');
    expect(sealed.catchWeight).toBe(HUNDRED_LB_IN_KG);
    expect(sealed.details.map(d => d.catchWeight)).toEqual([HUNDRED_LB_IN_KG, '113.398227']);
    expect(sealed.unit).toBe('lbs');
  });

  test('a trap group with no weight is left alone', () => {
    const sealed = sealEffort1Weights('', [{ trapHauls: '250' }], 'lbs');
    expect(sealed.catchWeight).toBe('');
    expect(sealed.details[0]).toEqual({ trapHauls: '250' });
  });

  test('closing on kg stores the typed numbers', () => {
    const sealed = sealEffort1Weights('100', [{ catchWeight: '250' }], 'kg');
    expect(sealed.catchWeight).toBe('100');
    expect(sealed.details[0].catchWeight).toBe('250');
    expect(sealed.unit).toBe('kg');
  });
});

describe('S153 Phase 2 — CATCH.KEPT_WT, efforts 2+', () => {
  test('an open node converts its own trap groups and carries its own tag', () => {
    const nodes: ExtraEffortNode[] = [{ fmaId: '28599', details: [{ catchWeight: '100' }] }];
    const [n] = sealEffortNodeWeights(nodes, 'lbs');
    expect(n.details?.[0].catchWeight).toBe(HUNDRED_LB_IN_KG);
    expect(n.closeUnit).toBe('lbs');
  });

  test('R2: a node already closed is untouched', () => {
    const closed: ExtraEffortNode = { fmaId: '1', closeDt: 'T', closeUnit: 'lbs', details: [{ catchWeight: '45.36' }] };
    expect(sealEffortNodeWeights([closed], 'kg')[0]).toEqual(closed);
  });

  test('R4: one open node seals on kg while its already-closed neighbour keeps lbs', () => {
    const nodes: ExtraEffortNode[] = [
      { fmaId: '1', closeDt: 'T', closeUnit: 'lbs', details: [{ catchWeight: '45.36' }] },
      { fmaId: '2', details: [{ catchWeight: '100' }] },
    ];
    const next = sealEffortNodeWeights(nodes, 'kg');
    expect(next[0].closeUnit).toBe('lbs');
    expect(next[0].details?.[0].catchWeight).toBe('45.36');
    expect(next[1].closeUnit).toBe('kg');
    expect(next[1].details?.[0].catchWeight).toBe('100');
  });

  test('a node with no details survives', () => {
    const [n] = sealEffortNodeWeights([{ fmaId: '1' }], 'lbs');
    expect(n.details).toEqual([]);
    expect(n.closeUnit).toBe('lbs');
  });
});

describe('S153 Phase 2 — PCONS.WT (personal use)', () => {
  test('converts on lbs, is tagged by its caller', () => {
    expect(sealPersonalUseWeight('100', 'lbs')).toBe(HUNDRED_LB_IN_KG);
  });
  test('a declared zero survives (Rule 789)', () => {
    expect(sealPersonalUseWeight('0', 'lbs')).toBe('0.000000');
  });
  test('kg passes through', () => {
    expect(sealPersonalUseWeight('5', 'kg')).toBe('5');
  });
});

describe('S153 Phase 2 — TRANSFER_DTL.WT', () => {
  test('converts on lbs', () => {
    expect(sealTransferWeight('100', 'lbs')).toBe(HUNDRED_LB_IN_KG);
  });
  test('kg passes through', () => {
    expect(sealTransferWeight('150', 'kg')).toBe('150');
  });
});

describe('S153 Phase 2 — HLIN.TOT_WT_ONBRD', () => {
  test('converts on lbs', () => {
    expect(sealHailInWeight('450', 'lbs')).toBe('204.116809');
  });
  test('kg passes through', () => {
    expect(sealHailInWeight('450', 'kg')).toBe('450');
  });
});

// S153B — SAR.WT joins the family. TWO sealers, therefore TWO describes: SAR is the only
// group whose occurrences live in two different shapes (block 1 in the legacy flat keys,
// blocks 2+ in an array), so block 1's conversion and the array's are separate mutation sites
// and a break in one must not be masked by the other.

describe('S153B Phase 2 — SAR.WT, block 1 (the flat keys)', () => {
  test('closing on pounds converts and stores kilograms', () => {
    expect(sealSarBlock1Weight('100', 'lbs')).toBe(HUNDRED_LB_IN_KG);
  });

  test('closing on kg stores the typed number untouched — no second division', () => {
    expect(sealSarBlock1Weight('100', 'kg')).toBe('100');
  });

  test('a blank weight stays blank — a close must not invent a 0 (Rule 789)', () => {
    expect(sealSarBlock1Weight('', 'lbs')).toBe('');
    expect(sealSarBlock1Weight('', 'kg')).toBe('');
  });

  test('a typed 0 survives as 0 — Rule 789 names Sar.Wt', () => {
    expect(sealSarBlock1Weight('0', 'lbs')).toBe('0.000000');
    expect(sealSarBlock1Weight('0', 'kg')).toBe('0');
  });
});

describe('S153B Phase 2 — SAR.WT, blocks 2+ (ExtraSarDetail)', () => {
  test('an open block converts and is tagged', () => {
    const [b] = sealSarBlockWeights([{ species: '1', wt: '100' }], 'lbs');
    expect(b.wt).toBe(HUNDRED_LB_IN_KG);
    expect(b.closeUnit).toBe('lbs');
  });

  test('closing on kg stores the typed number and tags it kg', () => {
    const [b] = sealSarBlockWeights([{ species: '1', wt: '100' }], 'kg');
    expect(b.wt).toBe('100');
    expect(b.closeUnit).toBe('kg');
  });

  test('R2: a block already closed is untouched — number and unit both keep', () => {
    const closed = { species: '1', wt: '45.36', closeDt: '2026-08-27T10:00:00.000Z', closeUnit: 'lbs' as const };
    const [b] = sealSarBlockWeights([closed], 'kg');
    expect(b).toEqual(closed);
  });

  test('R4: onlyIndex seals ONE block, leaving its neighbour open and unconverted', () => {
    const next = sealSarBlockWeights([{ wt: '100' }, { wt: '100' }], 'lbs', 0);
    expect(next[0].wt).toBe(HUNDRED_LB_IN_KG);
    expect(next[0].closeUnit).toBe('lbs');
    expect(next[1].wt).toBe('100');
    expect(next[1].closeUnit).toBeUndefined();
  });

  test('two blocks of one card can end up in different units', () => {
    let blocks: ExtraSarDetail[] = [{ wt: '100' }, { wt: '100' }];
    blocks = sealSarBlockWeights(blocks, 'lbs', 0).map((b, i) => (i === 0 ? { ...b, closeDt: 'T1' } : b));
    blocks = sealSarBlockWeights(blocks, 'kg', 1).map((b, i) => (i === 1 ? { ...b, closeDt: 'T2' } : b));
    expect(blocks[0]).toMatchObject({ wt: HUNDRED_LB_IN_KG, closeUnit: 'lbs' });
    expect(blocks[1]).toMatchObject({ wt: '100', closeUnit: 'kg' });
  });

  test('a block with NO weight still records the unit it closed in', () => {
    // The tag describes the BLOCK, not the number. Matching sealBaitRowWeights, which tags
    // every row it seals; a blank weight simply gives the tag nothing to interpret.
    const [b] = sealSarBlockWeights([{ species: '1' }], 'kg');
    expect(b.wt).toBe('');
    expect(b.closeUnit).toBe('kg');
  });
});

describe('S153B Phase 2 — R8: an OPEN SAR weight follows the toggle', () => {
  // The toggle lives on the free app's Settings screen, which UNMOUNTS the form — so a flip is
  // never seen live, only discovered at the next mount, through reunitOpenWeights. Without a
  // SAR arm a weight typed as 40 lb would be read as 40 KG after a flip and sealed that way.
  test('block 1 re-expresses when the toggle moves', () => {
    const out = reunitOpenWeights({ [DRAFT_WEIGHT_UNIT_KEY]: 'lbs', sarWt: '100' }, 'kg');
    expect(out?.sarWt).toBe('45.36');
  });

  test('a CLOSED block 1 is never re-united — it is sealed (R2)', () => {
    const out = reunitOpenWeights(
      { [DRAFT_WEIGHT_UNIT_KEY]: 'lbs', sarWt: '45.359291', sarCloseDt: 'T1' }, 'kg');
    expect(out?.sarWt).toBeUndefined();
  });

  test('a legacy card-closed log (dgCloseSar) is never re-united either', () => {
    const out = reunitOpenWeights(
      { [DRAFT_WEIGHT_UNIT_KEY]: 'lbs', sarWt: '100', dgCloseSar: 'T1' }, 'kg');
    expect(out?.sarWt).toBeUndefined();
  });

  test('blocks 2+ re-unit individually, and a closed one is skipped', () => {
    const out = reunitOpenWeights({
      [DRAFT_WEIGHT_UNIT_KEY]: 'lbs',
      extraSars: JSON.stringify([
        { wt: '100' },
        { wt: '45.359291', closeDt: 'T1', closeUnit: 'lbs' },
        { species: 'no weight' },
      ]),
    }, 'kg');
    const blocks = JSON.parse(out!.extraSars) as ExtraSarDetail[];
    expect(blocks[0].wt).toBe('45.36');            // open -> re-expressed
    expect(blocks[1].wt).toBe('45.359291');        // closed -> untouched
    expect(blocks[2].wt).toBeUndefined();          // blank -> not invented
  });

  test('a flip that changes nothing returns null, as before', () => {
    expect(reunitOpenWeights({ [DRAFT_WEIGHT_UNIT_KEY]: 'kg', sarWt: '100' }, 'kg')).toBeNull();
  });
});

describe('S153 Phase 2 — R7: nothing here rewrites history', () => {
  test('every sealer returns a NEW object and leaves its input untouched', () => {
    const rows: BaitRow[] = [{ type: 'A', lbs: '100' }];
    const nodes: ExtraEffortNode[] = [{ fmaId: '1', details: [{ catchWeight: '100' }] }];
    const details: ExtraEffortDetail[] = [{ catchWeight: '100' }];
    const sars: ExtraSarDetail[] = [{ wt: '100' }];
    sealBaitRowWeights(rows, 'lbs');
    sealBycatchRowWeights<BycatchRow>([{ species: 'A', lbs: '100' }], 'lbs');
    sealEffortNodeWeights(nodes, 'lbs');
    sealEffort1Weights('100', details, 'lbs');
    sealSarBlockWeights(sars, 'lbs');
    expect(rows[0].lbs).toBe('100');
    expect(nodes[0].details?.[0].catchWeight).toBe('100');
    expect(nodes[0].closeUnit).toBeUndefined();
    expect(details[0].catchWeight).toBe('100');
    expect(sars[0].wt).toBe('100');
    expect(sars[0].closeUnit).toBeUndefined();
  });
});
