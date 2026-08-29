// ONE-OFF guard test — TYPED-ZERO EMISSION. Rewritten in Session 152A; the suite now states
// the CURRENT behaviour as a guarantee. Full record: docs/GATE_S152A_RULE_789_ZERO.md.
//
// THE GUARANTEE THIS SUITE PINS — FS-NAT-234-12 **Rule 789** (FS234.txt:365-377, on the SAR,
// PCONS, BAIT_USED, TRANSFER_DTL and CATCH nodes):
//
//   "In the client application, these elements must have an initial value equal to "null"
//    (empty). If the user wants to declare a quantity (0 or greater than 0) using this element,
//    then the value must be entered manually by the user. A null or empty value must not be
//    interpreted as a 0 by the client application."
//
// Rule 789 has TWO halves and this suite pins BOTH:
//   (a) a TYPED 0 is a declared quantity and MUST reach the transmitted file;
//   (b) a BLANK is NOT a zero and must still emit nothing.
//
// The app used to do the inverse of (a): kgStr() returned '' for a typed 0, and each call site's
// guard then deleted the row — or the entire node — that the zero was declared in. A QC transfer
// declared at 0 lb lost its date, both vessel numbers, the close stamp and BOTH copies of the
// harvester's own written note; the file that reached DFO held no trace a transfer was declared.
// Nothing warned him: dfoRequirements' blank('0') is false (the section closed clean) and
// BAIT_USED / PCONS / TRANSFER are all min:0 in TRIP_SPEC (the validator passed the file).
//
// FIVE of the six kgStr() call sites now pass allowZero:
//   • CATCH.KEPT_WT        — Rule 2020 zero-catch + Rules 630/631 (S120, unchanged here)
//   • BAIT_USED.BT_WT      — Rule 789 (S152A)
//   • bycatch PCONS.WT     — Rule 789 (S152A)
//   • personal-use PCONS.WT— Rule 789 (S152A)
//   • TRANSFER_DTL.WT      — Rule 789 (S152A)
// The SIXTH — HLIN.TOT_WT_ONBRD — deliberately does NOT: it is not in Rule 789's element list.
// See the fence test at the foot of this file, and the open question recorded with it.
import { generateElogXml } from '../dfoXmlGenerator';

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

function mar90Log(): any {
  return {
    id: 'test-log-keptwt-zero',
    dateFished: '2026-06-10',
    lgbkUid: 'ABCDEF',
    firstEntryDt: '2026-06-10T08:55:00.000Z',
    sentToDfo: false,
    subformId: 90,
    regId: 1004,
    data: {
      timeSailed: '05:30',
      timeStartedHauling: '06:00',
      timeStoppedHauling: '13:30',
      timeOfLanding: '14:45',
      crewRegistry: JSON.stringify(['Crew One']),
      fmaId: '1589',
      catchWeight: '500',
      trapHauls: '250',
      bycatchEntries: '[]',
      personalUse: '',
      portLanded: "Abbott's Harbour",
      portLandedCodeId: '20913',
      lgridCodeId: '101',
      baitEntries: JSON.stringify([{ type: 'Herring, Atlantic', lbs: '100', condition: 1232 }]),
      mmYes: 'false',
      sarYes: 'false',
    },
  };
}

// QC-88 base — the only subform where TRANSFER is reachable (Rules 248-252).
function qc88Log(): any {
  const log = mar90Log();
  log.id = 'test-log-transfer-zero';
  log.subformId = 88;
  log.regId = 1006;
  log.data.fmaId = '25640'; // LFA 17b
  log.data.crewRegistry = JSON.stringify(['Crew One', 'Crew Two']);
  log.data.departurePortCodeId = '22648'; // Rimouski (QC)
  log.data.portLandedCodeId = '22648';
  log.data.lgridCodeId = '';             // LGRID is MAR-90 only
  log.data.soakDuration = '2';
  log.data.useCrInd = 'Y';
  log.data.carrierVrn = '106460';
  log.data.transferYes = 'true';
  log.data.transferTime = '15:00';
  log.data.transferToVrn = '106461';
  return log;
}

// ── CATCH.KEPT_WT — the S120 half, unchanged ──────────────────────────────────────────────
describe('CATCH.KEPT_WT zero-catch emission (Rule 2020)', () => {
  test('catchWeight "0" emits <KEPT_WT>0.00</KEPT_WT>', () => {
    const log = mar90Log();
    log.data.catchWeight = '0';
    const xml = generateElogXml(log, profile);
    expect(xml).toContain('<KEPT_WT>0.00</KEPT_WT>');
  });

  test('catchWeight "" still omits KEPT_WT', () => {
    const log = mar90Log();
    log.data.catchWeight = '';
    const xml = generateElogXml(log, profile);
    expect(xml).not.toContain('<KEPT_WT>');
  });

  test('catchWeight "abc" still omits KEPT_WT', () => {
    const log = mar90Log();
    log.data.catchWeight = 'abc';
    const xml = generateElogXml(log, profile);
    expect(xml).not.toContain('<KEPT_WT>');
  });

  test('catchWeight "-5" still omits KEPT_WT', () => {
    const log = mar90Log();
    log.data.catchWeight = '-5';
    const xml = generateElogXml(log, profile);
    expect(xml).not.toContain('<KEPT_WT>');
  });

  test('a normal weight is unchanged (500 lbs → 226.80 kg)', () => {
    const log = mar90Log();
    log.data.catchWeight = '500';
    const xml = generateElogXml(log, profile);
    expect(xml).toContain('<KEPT_WT>226.80</KEPT_WT>');
  });
});

// ── Rule 789 (a) — A TYPED ZERO SURVIVES TO THE FILE. These four were the defect. ─────────
describe('Rule 789 (a): a typed 0 is a declared quantity and reaches the transmitted file', () => {
  // WAS case 6, INVERTED in S152A. Before the fix this asserted the node was ABSENT — the
  // harvester declared no personal use and the declaration was silently deleted.
  test('personal use "0" EMITS the PCONS node with <WT>0.00</WT> and its USG_ID', () => {
    const log = mar90Log();
    log.data.personalUse = '0';
    const xml = generateElogXml(log, profile);
    expect(xml).toContain('<PCONS>');
    expect(xml).toContain('<WT>0.00</WT>');
    expect(xml).toContain('<USG_ID>37822</USG_ID>');
  });

  // WAS case 7, INVERTED in S152A. Before the fix the whole BAIT_USED row vanished — type,
  // condition, close stamp and note along with the weight.
  test('a 0-lb bait entry EMITS the BAIT_USED node with <BT_WT>0.00</BT_WT>', () => {
    const log = mar90Log();
    log.data.baitEntries = JSON.stringify([{ type: 'Herring, Atlantic', lbs: '0', condition: 1232 }]);
    const xml = generateElogXml(log, profile);
    expect(xml).toContain('<BAIT_USED>');
    expect(xml).toContain('<BT_WT>0.00</BT_WT>');
    // the rest of the row survived with it
    expect(xml).toContain('<BT_TYP_ID>');
  });

  // NEW in S152A — this call site had NO test at all before.
  test('a 0-lb bycatch row EMITS its PCONS node with <WT>0.00</WT>', () => {
    const log = mar90Log();
    log.data.bycatchEntries = JSON.stringify([{ species: 'Crab, Jonah', lbs: '0' }]);
    const xml = generateElogXml(log, profile);
    expect(xml).toContain('<PCONS>');
    expect(xml).toContain('<WT>0.00</WT>');
    expect(xml).toContain('<SPECIE_ID>1286</SPECIE_ID>'); // the species survived with it
  });

  // NEW in S152A — this call site had NO test at all before, and it is the worst loss:
  // the guard dropped the ENTIRE TRANSFER subtree, not one element.
  test('a 0-lb QC-88 transfer EMITS the whole TRANSFER subtree with <WT>0.00</WT>', () => {
    const log = qc88Log();
    log.data.transferWt = '0';
    log.remarks = { transfer: 'Transfer remark' };
    const xml = generateElogXml(log, profile);
    expect(xml).toContain('<TRANSFER>');
    expect(xml).toContain('<TRANSFER_DTL>');
    expect(xml).toContain('<WT>0.00</WT>');
    // everything the old guard deleted along with the weight:
    expect(xml).toContain('<TRNSF_DT>');
    expect(xml).toContain('<FROM_VRN>123456</FROM_VRN>');
    expect(xml).toContain('<TO_VRN>106461</TO_VRN>');
    // BOTH copies of the harvester's own note
    expect((xml.match(/<REM>Transfer remark<\/REM>/g) ?? [])).toHaveLength(2);
  });
});

// ── Rule 789 (b) — A BLANK IS NOT A ZERO. This is what keeps old logs byte-identical. ────
describe('Rule 789 (b): a blank is not a zero — nothing is emitted', () => {
  test('a blank personal use still emits NO PCONS node', () => {
    const log = mar90Log();
    log.data.personalUse = '';
    const xml = generateElogXml(log, profile);
    expect(xml).not.toContain('<PCONS>');
    expect(xml).not.toContain('<USG_ID>');
  });

  test('a blank bait weight still emits NO BAIT_USED node', () => {
    const log = mar90Log();
    log.data.baitEntries = JSON.stringify([{ type: 'Herring, Atlantic', lbs: '', condition: 1232 }]);
    const xml = generateElogXml(log, profile);
    expect(xml).not.toContain('<BAIT_USED>');
  });

  test('a blank bycatch weight still emits NO PCONS node', () => {
    const log = mar90Log();
    log.data.bycatchEntries = JSON.stringify([{ species: 'Crab, Jonah', lbs: '' }]);
    const xml = generateElogXml(log, profile);
    expect(xml).not.toContain('<PCONS>');
  });

  test('a blank QC-88 transfer weight still emits NO TRANSFER subtree', () => {
    const log = qc88Log();
    log.data.transferWt = '';
    const xml = generateElogXml(log, profile);
    expect(xml).not.toContain('<TRANSFER>');
  });

  test('a NEGATIVE weight is still not a declaration — no node on any of the four', () => {
    const log = mar90Log();
    log.data.personalUse = '-1';
    log.data.baitEntries = JSON.stringify([{ type: 'Herring, Atlantic', lbs: '-1', condition: 1232 }]);
    log.data.bycatchEntries = JSON.stringify([{ species: 'Crab, Jonah', lbs: '-1' }]);
    const xml = generateElogXml(log, profile);
    expect(xml).not.toContain('<PCONS>');
    expect(xml).not.toContain('<BAIT_USED>');
  });
});

// ── THE FENCE — HLIN.TOT_WT_ONBRD is deliberately NOT in this build ───────────────────────
// This pins the FENCE, not an endorsement. Rule 789's element list names Bait_used.Bt_wt,
// Pcons.Wt, Transfer_dtl.Wt and Sar.Nb_spcmn. HLIN.TOT_WT_ONBRD is NOT in it, so S152A ruled
// it out and left it on the default.
//
// ⚠ OPEN QUESTION, RECORDED NOT SOLVED (S152A): on area 38b, Rules 660/661 make
// HLIN.TOT_WT_ONBRD MANDATORY. Under this ruling a typed 0 there still makes a mandatory
// element vanish, and what the send validator does next has never been checked. If a future
// session rules on that and fixes it, THIS TEST IS EXPECTED TO GO RED — that is the signal
// working, not a regression. Do not "fix" it by weakening it; re-rule it.
describe('the fence: HLIN.TOT_WT_ONBRD is ruled OUT of Rule 789 and keeps the default', () => {
  test('a 0 hail-in total weight still omits TOT_WT_ONBRD', () => {
    const log = mar90Log();
    log.data.fmaId = '28599'; // area 38b — the FMA where HLIN is reachable
    log.data.hlinCompany = 'Atlantic Catch Data Ltd.';
    log.data.hlinConfirmNo = 'HLIN-001';
    log.data.hlinTotalWeight = '0';
    const xml = generateElogXml(log, profile);
    expect(xml).toContain('<HLIN>');            // the hail node itself is emitted
    expect(xml).not.toContain('<TOT_WT_ONBRD>'); // but the zeroed weight is not
  });
});
