// S153 Phase 3 — the emit must not convert a value Phase 2 already converted.
//
// THE FAILURE MODE THIS EXISTS TO CATCH
// Phase 2 (R1) converts a weight to kilograms and STORES it that way at close. If the emit
// then converts again, 100 lb leaves the deck as 20.58 kg instead of 45.36 — a number wrong
// by a factor of 2.2, inside a document that validates, with nothing on screen to show it.
//
// WHAT DECIDES: the PRESENCE of a close-unit tag, not its value.
//   • tagged   -> Phase 2 converted it at close -> already kilograms -> emit as-is
//   • untagged -> closed under pre-S153 code, which stored the typed pounds -> convert (R5)
// The tag's VALUE ('lbs' | 'kg') records which unit the harvester was working in and is for
// the LABEL (R2/R6), not for this decision.
import { generateElogXml } from '../dfoXmlGenerator';
import { weightToKg } from '../dfoLogStorage';

const profile: any = {
  operatorName: 'Test Operator',
  vesselNumber: '104460',
  fishingNumber: '104460',
  licenceHolderFin: '100400460',
  // Deliberately 'lbs'. Post-S153 the emit must not read this at all — a closed weight's unit
  // comes from its own tag. If this value can still move the output, the fix is incomplete.
  units: 'lbs',
  language: 'en',
};

function mar90Log(data: Record<string, string>): any {
  return {
    id: 'S153-P3', lgbkUid: 'ABCDEF', firstEntryDt: '2026-08-27T08:00:00.000Z',
    mode: 'full', status: 'complete', sentToDfo: false,
    dateFished: '2026-08-27', createdAt: 0, subformId: 90, regId: 1004, tripNum: 1,
    data: {
      timeSailed: '05:30', timeStartedHauling: '06:15', timeStoppedHauling: '11:45',
      timeOfLanding: '13:20', fmaId: '28599', trapHauls: '250',
      portLandedCodeId: '20913', crewRegistry: '[]',
      sarYes: 'false', mmYes: 'false', effortYes: 'true',
      ...data,
    },
  };
}
const el = (xml: string, t: string): string[] =>
  [...xml.matchAll(new RegExp(`<${t}>([^<]*)</${t}>`, 'g'))].map(m => m[1]);

describe('S153 Phase 3 — a tagged weight is already kilograms and is NOT converted again', () => {
  test('CATCH.KEPT_WT closed on lbs emits the stored kilograms, not half of them', () => {
    // Phase 2 stored 45.36 (100 lb converted) and tagged the effort 'lbs'.
    const xml = generateElogXml(mar90Log({
      catchWeight: '45.36',
      dgCloseEffort: '2026-08-27T12:00:00.000Z',
      dgCloseEffortUnit: 'lbs',
    }), profile);
    expect(el(xml, 'KEPT_WT')).toEqual(['45.36']);
  });

  test('CATCH.KEPT_WT closed on kg emits the typed kilograms unchanged', () => {
    const xml = generateElogXml(mar90Log({
      catchWeight: '100',
      dgCloseEffort: '2026-08-27T12:00:00.000Z',
      dgCloseEffortUnit: 'kg',
    }), profile);
    expect(el(xml, 'KEPT_WT')).toEqual(['100.00']);
  });

  test('BAIT_USED.BT_WT — a tagged row is emitted as stored', () => {
    const xml = generateElogXml(mar90Log({
      catchWeight: '45.36', dgCloseEffort: 'T', dgCloseEffortUnit: 'lbs',
      baitEntries: JSON.stringify([
        { type: 'Mackerel, Atlantic', lbs: '22.68', condition: 39628, closeDt: 'T', closeUnit: 'lbs' },
      ]),
    }), profile);
    expect(el(xml, 'BT_WT')).toEqual(['22.68']);
  });

  test('PCONS.WT (personal use) — a tagged value is emitted as stored', () => {
    const xml = generateElogXml(mar90Log({
      catchWeight: '45.36', dgCloseEffort: 'T', dgCloseEffortUnit: 'lbs',
      personalUse: '2.27',
      dgClosePconsPersonal: 'T', dgClosePconsPersonalUnit: 'lbs',
    }), profile);
    expect(el(xml, 'WT')).toEqual(['2.27']);
  });

  test('HLIN.TOT_WT_ONBRD — a tagged value is emitted as stored', () => {
    const xml = generateElogXml(mar90Log({
      catchWeight: '45.36', dgCloseEffort: 'T', dgCloseEffortUnit: 'lbs',
      hlinCompany: 'Not on the list', hlinConfirmNo: '12345',
      hlinTotalWeight: '204.12',
      dgCloseHlin: 'T', dgCloseHlinUnit: 'lbs',
    }), profile);
    expect(el(xml, 'TOT_WT_ONBRD')).toEqual(['204.12']);
  });
});

describe('S153 Phase 3 — R5: an UNTAGGED weight is pounds and still converts', () => {
  test('a pre-S153 log with no tag converts exactly as it always did', () => {
    const xml = generateElogXml(mar90Log({
      catchWeight: '100',
      dgCloseEffort: '2026-08-27T12:00:00.000Z',
      // no dgCloseEffortUnit — this is what every log closed before S153 looks like
    }), profile);
    expect(el(xml, 'KEPT_WT')).toEqual(['45.36']);
  });
});

describe('S153 Phase 3 — BYTE-IDENTITY: an lbs-closed weight emits what the app emits today', () => {
  // Pre-S153: the harvester typed 100, the profile said lbs, and the emit divided at send:
  //   kgStr('100', inLbs=true) -> '45.36'
  // Post-S153: Phase 2 divided at close and stored '45.36'; the emit passes it through.
  // Same bytes, by a different route. This asserts the WHOLE document is identical, not just
  // the weight — so a stray change anywhere else in the emit is caught too.
  // RE-PROVEN after the full-precision amendment (founder ruling, Phase 5 §5.1). The stored
  // value is NOT hard-coded here — it is produced by the REAL weightToKg, so if storage
  // precision ever changes again this proof moves with it instead of quietly going stale.
  test.each(['100', '250', '450', '40', '1', '12.3', '1234'])(
    'a weight of %s lb emits the same bytes stored-at-close as it did converted-at-send',
    (typed) => {
      const today = generateElogXml(mar90Log({
        catchWeight: typed,
        dgCloseEffort: '2026-08-27T12:00:00.000Z',
      }), profile);                                 // untagged -> converts, exactly as pre-S153
      const stored = weightToKg(typed, 'lbs');      // what Phase 2 ACTUALLY writes at close
      const afterS153 = generateElogXml(mar90Log({
        catchWeight: stored,
        dgCloseEffort: '2026-08-27T12:00:00.000Z',
        dgCloseEffortUnit: 'lbs',
      }), profile);                                 // tagged -> already kg, passes through
      expect(afterS153).toBe(today);
    },
  );

  test('the stored value really is full precision, not the 2dp the wire carries', () => {
    // Guards the proof above from passing for the wrong reason: if storage silently went back
    // to 2dp, the documents would still match but the ruling would have been undone.
    expect(weightToKg('100', 'lbs')).toBe('45.359291');
    expect(generateElogXml(mar90Log({
      catchWeight: weightToKg('100', 'lbs'),
      dgCloseEffort: 'T', dgCloseEffortUnit: 'lbs',
    }), profile)).toContain('<KEPT_WT>45.36</KEPT_WT>');
  });
});
