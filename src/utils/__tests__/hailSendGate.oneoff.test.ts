// S142 defect 52 — THE HAIL SEND GATE AND THE '0' COMPANY CODE.
//
// Two faults on one path, fixed in one commit:
//
//   F1 — validateElogXml had NO hail check. DFO's Rules 2024/2025 say a MAR-90 logbook with
//        any fishing effort in FMA 38b (28599) or 41 (1595) MUST carry at least one HLIN and
//        one HLOUT, and that both are BLOCKED otherwise. The close gate has enforced this
//        since 247f9c5, but a log that reached the send by any other route transmitted with
//        no hail at all. The XSD cannot catch it — HLIN/HLOUT are minOccurs="0" there,
//        because a schema has no way to say "unless the log fished 38b".
//
//   F2 — when the stored company name matched nothing in Rule 27's / Rule 93's list, the
//        generator wrote company code '0'. There is no company '0' in Mv_service_provider:
//        the file transmitted and told DFO the hail was issued by a company that does not
//        exist. The fallback is now the empty string, so the element is omitted and the
//        validator's existing min:1 structural check refuses the file — a truthful refusal
//        instead of a false statement DFO's schema happily accepts.
//
// Authority quoted in docs/GATE_S142_HAIL_SEND_GATE.md §2.1-2.2:
//   FS-NAT-234-12-EN L243-252 / FS-NAT-234-12-FR L257-268 (Rules 2024/2025)
//   FS-NAT-234-12-EN L468-484 (Rule 27, 11 HLIN companies) / L517-526 (Rule 93, 4 HLOUT)
//   Subforms_requirements_234.xlsx rows 42-52, MAR-90 column I

import { generateElogXml, validateElogXml, hailGateSections } from '../dfoXmlGenerator';
import { DFO_HLIN_COMPANY_LIST, DFO_HLOUT_COMPANY_LIST } from '../dfoConstants';

const profile: any = {
  operatorName: 'Test Operator', vesselNumber: '104460',
  fishingNumber: '104460', licenceHolderFin: '100400460',
  elogKey: 'TESTKEY', units: 'lbs', language: 'en',
};

const CLOSE = '2026-06-10T15:00:00.000Z';

// A conformant MAR-90 38b logbook: both hail groups present, company valid under BOTH
// Rule 27 and Rule 93 (25095 Atlantic Catch Data Ltd. is the one name on both lists).
function makeMar38bLog(): any {
  return {
    id: 'x', dateFished: '2026-06-10', lgbkUid: 'ABCDEF',
    firstEntryDt: '2026-06-10T08:55:00.000Z', tripNum: 7, subformId: 90, regId: 1004,
    data: {
      timeSailed: '05:30', timeStartedHauling: '06:00',
      timeStoppedHauling: '13:30', timeOfLanding: '14:45',
      crewRegistry: JSON.stringify(['Crew One', 'Crew Two']),
      catchWeight: '500', trapHauls: '250',
      bycatchEntries: '[]', personalUse: '10', dgClosePconsPersonal: CLOSE,
      mmYes: 'false', sarYes: 'false',
      fmaId: '28599', // 38b
      portLanded: "ABBOTT'S HARBOUR", portLandedCodeId: '20913',
      lgridCodeId: '101', lgridDisplay: '101',
      gpsLat: '44.1234', gpsLng: '-66.5432', gpsSrc: 'gps', nbSpcmnBrd: '3',
      baitEntries: JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]),
      hlinCompany: 'Atlantic Catch Data Ltd.', hlinConfirmNo: 'HI-1001',
      // S161: the Rule 660/661 validator arm made ETA_DT + TOT_WT_ONBRD required on a 38b
      // HLIN — this fixture predates the arm (the S154D fixture rule: lawful source, never
      // a weakened assertion). No companion date: the trip-day fallback is the proven path.
      hlinEta: '12:00', hlinTotalWeight: '111',
      hloutCompany: 'Atlantic Catch Data Ltd.', hloutConfirmNo: 'HO-1001',
      dgCloseHlin: CLOSE, dgCloseHlout: CLOSE,
      dgCloseEffort: CLOSE, dgCloseLanding: CLOSE, dgCloseBaitUsed: CLOSE,
    },
  };
}

const gen = (log: any) => generateElogXml(log, profile);
const count = (xml: string, frag: string): number => xml.split(frag).length - 1;

// ── F1: the gate ──────────────────────────────────────────────────────────────

describe('F1 — Rules 2024/2025 hail presence at the send gate', () => {
  test('a conformant 38b log with both hail groups PASSES — the gate does not over-block', () => {
    const xml = gen(makeMar38bLog());
    expect(count(xml, '<HLIN>')).toBe(1);
    expect(count(xml, '<HLOUT>')).toBe(1);
    const { valid, errors } = validateElogXml(xml, 90);
    expect(errors.filter(e => e.includes('HLIN') || e.includes('HLOUT'))).toEqual([]);
    expect(valid).toBe(true);
  });

  test('38b log with NO hail is REFUSED, naming both groups and both rules', () => {
    const log = makeMar38bLog();
    log.data.hlinCompany = ''; log.data.hlinConfirmNo = '';
    log.data.hloutCompany = ''; log.data.hloutConfirmNo = '';
    const xml = gen(log);
    expect(xml).not.toContain('<HLIN>');
    expect(xml).not.toContain('<HLOUT>');
    const { valid, errors } = validateElogXml(xml, 90);
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('HLIN is required') && e.includes('Rule 2024'))).toBe(true);
    expect(errors.some(e => e.includes('HLOUT is required') && e.includes('Rule 2025'))).toBe(true);
  });

  test('LFA 41 alone triggers the gate — this is the 38b-OR-41 set, not fishes38b', () => {
    // The whole point of riding DFO_FMA_HLIN_REQUIRED rather than the 38b-only predicate:
    // Rules 660/661 (ETA / total weight) key on 38b alone, Rules 2024/2025 do not.
    const log = makeMar38bLog();
    log.data.fmaId = '1595'; // LFA 41
    delete log.data.gpsLat; delete log.data.gpsLng; delete log.data.gpsSrc; // 3059: 38b only
    delete log.data.nbSpcmnBrd;                                            // 654: 38b only
    log.data.hlinCompany = ''; log.data.hlinConfirmNo = '';
    log.data.hloutCompany = ''; log.data.hloutConfirmNo = '';
    const { errors } = validateElogXml(gen(log), 90);
    expect(errors.some(e => e.includes('HLIN is required'))).toBe(true);
    expect(errors.some(e => e.includes('HLOUT is required'))).toBe(true);
  });

  test('one group present and the other missing is still refused — both are required', () => {
    const log = makeMar38bLog();
    log.data.hloutCompany = ''; log.data.hloutConfirmNo = '';
    const { errors } = validateElogXml(gen(log), 90);
    expect(errors.some(e => e.includes('HLIN is required'))).toBe(false);
    expect(errors.some(e => e.includes('HLOUT is required') && e.includes('Rule 2025'))).toBe(true);
  });

  test('the gate is FMA-scoped, not universal: a MAR log outside 38b/41 needs no hail', () => {
    const log = makeMar38bLog();
    log.data.fmaId = '1589'; // LFA 34
    delete log.data.gpsLat; delete log.data.gpsLng; delete log.data.gpsSrc;
    delete log.data.nbSpcmnBrd;
    log.data.hlinCompany = ''; log.data.hlinConfirmNo = '';
    log.data.hloutCompany = ''; log.data.hloutConfirmNo = '';
    const { errors } = validateElogXml(gen(log), 90);
    expect(errors.filter(e => e.includes('HLIN') || e.includes('HLOUT'))).toEqual([]);
  });

  test('the multi-effort hole stays shut: a 38b effort 2 arms the gate', () => {
    const log = makeMar38bLog();
    log.data.fmaId = '1589'; // effort 1 is LFA 34
    delete log.data.gpsLat; delete log.data.gpsLng; delete log.data.gpsSrc;
    delete log.data.nbSpcmnBrd;
    log.data.hlinCompany = ''; log.data.hlinConfirmNo = '';
    log.data.hloutCompany = ''; log.data.hloutConfirmNo = '';
    log.data.extraEffortNodes = JSON.stringify([{
      fmaId: '28599', startDt: '06:30', endDt: '12:00',
      sarYes: 'false', mmYes: 'false', closeDt: CLOSE,
      details: [{ catchWeight: '100', trapHauls: '50', lgridCodeId: '101',
        gpsLat: '44.1234', gpsLng: '-66.5432', gpsSrc: 'gps', nbSpcmnBrd: '1' }],
    }]);
    const { errors } = validateElogXml(gen(log), 90);
    expect(errors.some(e => e.includes('HLIN is required'))).toBe(true);
    expect(errors.some(e => e.includes('HLOUT is required'))).toBe(true);
  });

  test('blocked direction: an injected hail on a non-qualifying log is refused', () => {
    // Rules 2024/2025 second sentence — "Otherwise, data group HLIN must be blocked."
    // The generator's own gate prevents this; the validator now says so about the bytes.
    const log = makeMar38bLog();
    log.data.fmaId = '1589';
    delete log.data.gpsLat; delete log.data.gpsLng; delete log.data.gpsSrc;
    delete log.data.nbSpcmnBrd;
    const clean = gen(log);
    expect(clean).not.toContain('<HLIN>');
    const injected = clean.replace(
      '    <PCONS>',
      `    <HLIN>\n      <HLIN_CIE_ID>25095</HLIN_CIE_ID>\n      <HLIN_NUM>HI-1001</HLIN_NUM>\n` +
      `      <DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>\n    </HLIN>\n    <PCONS>`);
    const { valid, errors } = validateElogXml(injected, 90);
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('HLIN is blocked'))).toBe(true);
  });
});

// ── F2: the '0' company code ──────────────────────────────────────────────────

describe('F2 — an unmatched hail company emits nothing, never the false code \'0\'', () => {
  test('no company code \'0\' can be produced on either group', () => {
    // The confirmation-only path: a confirmation number typed with no company picked. The
    // group is still "used" (the emit gate is company OR number), so the block is emitted —
    // and before this fix its company code was the literal '0'.
    const log = makeMar38bLog();
    log.data.hlinCompany = '';
    log.data.hloutCompany = '';
    const xml = gen(log);
    expect(xml).toContain('<HLIN>');
    expect(xml).toContain('<HLOUT>');
    expect(xml).not.toContain('<HLIN_CIE_ID>0</HLIN_CIE_ID>');
    expect(xml).not.toContain('<HLOUT_CIE_ID>0</HLOUT_CIE_ID>');
    expect(xml).not.toContain('<HLIN_CIE_ID>');
    expect(xml).not.toContain('<HLOUT_CIE_ID>');
  });

  test('the omitted company code is REFUSED by the existing min:1 structural check', () => {
    const log = makeMar38bLog();
    log.data.hlinCompany = '';
    log.data.hloutCompany = '';
    const { valid, errors } = validateElogXml(gen(log), 90);
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('HLIN') && e.includes('missing required <HLIN_CIE_ID>'))).toBe(true);
    expect(errors.some(e => e.includes('HLOUT') && e.includes('missing required <HLOUT_CIE_ID>'))).toBe(true);
  });

  test('a stale/renamed company name is refused too, not silently coded \'0\'', () => {
    // The lookup keys on the stored ENGLISH label. If a list label ever changes, every
    // already-stored log naming the old text used to become '0' on its next generate.
    const log = makeMar38bLog();
    log.data.hlinCompany = 'Atlantic Catch Data Limited'; // not the stored label
    const xml = gen(log);
    expect(xml).not.toContain('<HLIN_CIE_ID>0</HLIN_CIE_ID>');
    expect(validateElogXml(xml, 90).valid).toBe(false);
  });

  test('every list label still resolves to its real Mv_service_provider code', () => {
    for (const c of DFO_HLIN_COMPANY_LIST) {
      const log = makeMar38bLog();
      log.data.hlinCompany = c.label;
      expect(gen(log)).toContain(`<HLIN_CIE_ID>${c.codeId}</HLIN_CIE_ID>`);
    }
    for (const c of DFO_HLOUT_COMPANY_LIST) {
      const log = makeMar38bLog();
      log.data.hloutCompany = c.label;
      expect(gen(log)).toContain(`<HLOUT_CIE_ID>${c.codeId}</HLOUT_CIE_ID>`);
    }
  });

  test('the DFO IVR entry (25110) is a HLOUT code only — Rule 27 has no such entry', () => {
    // This asymmetry is what ruled out "confirmation-only means the harvester hailed DFO's
    // IVR": that reading is unrepresentable for hail-in, so a blank company is a DECLINE.
    expect(DFO_HLOUT_COMPANY_LIST.some(c => c.codeId === 25110)).toBe(true);
    expect(DFO_HLIN_COMPANY_LIST.some(c => (c as { codeId: number }).codeId === 25110)).toBe(false);
  });
});

// ── The deck message ──────────────────────────────────────────────────────────

describe('hailGateSections — which cards the refusal names', () => {
  test('a missing group names its own close key', () => {
    const log = makeMar38bLog();
    log.data.hloutCompany = ''; log.data.hloutConfirmNo = '';
    const { errors } = validateElogXml(gen(log), 90);
    expect(hailGateSections(errors)).toEqual(['dgCloseHlout']);
  });

  test('a missing company code names its card too — same job from the deck', () => {
    const log = makeMar38bLog();
    log.data.hlinCompany = '';
    const { errors } = validateElogXml(gen(log), 90);
    expect(hailGateSections(errors)).toEqual(['dgCloseHlin']);
  });

  test('both faults at once name both cards', () => {
    const log = makeMar38bLog();
    log.data.hlinCompany = '';                                  // HLIN present, no company
    log.data.hloutCompany = ''; log.data.hloutConfirmNo = '';   // HLOUT absent entirely
    const { errors } = validateElogXml(gen(log), 90);
    expect(hailGateSections(errors)).toEqual(['dgCloseHlin', 'dgCloseHlout']);
  });

  test('a conformant log names nothing', () => {
    expect(hailGateSections(validateElogXml(gen(makeMar38bLog()), 90).errors)).toEqual([]);
  });

  test('the blocked direction is NOT routed to the deck message', () => {
    // "This group should not be here" is not a card the harvester can go and finish, so it
    // stays in the raw validation list rather than telling him to fill in a hail.
    expect(hailGateSections([
      'TRIP[1]: HLIN is blocked on subform 90 without a fishing effort in FMA 38b or 41 (Rule 2024)',
    ])).toEqual([]);
  });
});
