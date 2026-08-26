// S134 — per-occurrence closure on BAIT_USED (§5: "close each occurrence of a data group
// independently"; DFO ruling, Lisa Doyle, Aug 17 2026). Each bait row may carry its OWN
// closeDt and note; the card-level dgCloseBaitUsed is the STAMP fallback (Ruling D3 — the
// SAR pattern, no data rewrite).
// S142 (defect 44) — the card-level rem.bait NOTE fallback is GONE. rem.bait lost its edit
// box in S134, so it could only ever fill a REM slot the harvester had left empty. A row
// with no note of its own now emits no REM at all. Case 2 below is the guard.
import { generateElogXml } from '../dfoXmlGenerator';
import { unclosedUsedGroupKeys, baitRowsAllClosed, stampOpenBaitRows, DfoLog } from '../dfoLogStorage';
import { EMPTY_PROFILE, CaptainProfile } from '../captainStorage';

const profile: CaptainProfile = {
  ...EMPTY_PROFILE, regId: 1004, subformId: 90, vesselNumber: '104460',
  licenceHolderFin: '100400460', fishingNumber: '104460', dfoLicenceNo: '104460', elogKey: 'x',
};

// Minimal MAR-90 log (the phase9UnclosedGroups fixture) — bait rows injected per test.
const mar90 = (): DfoLog => ({
  id: 's134', lgbkUid: 'ABCDEF', firstEntryDt: '2026-06-10T08:55:00.000Z', mode: 'full',
  status: 'complete', dateFished: '2026-06-10', createdAt: 1, subformId: 90, regId: 1004,
  sentToDfo: false,
  data: {
    timeSailed: '05:30', timeStartedHauling: '06:00', timeStoppedHauling: '13:30', timeOfLanding: '14:45',
    crewRegistry: JSON.stringify(['Crew One']), catchWeight: '500', trapHauls: '250',
    fmaId: '38065', lgridCodeId: '101', portLanded: "Abbott's Harbour", portLandedCodeId: '20913',
    bycatchEntries: '[]', personalUse: '', mmYes: 'false', sarYes: 'false',
    hlinCompany: '', hlinConfirmNo: '', hloutCompany: '', hloutConfirmNo: '',
    dgCloseEffort: '2026-06-10T15:00:00.000Z',
    dgCloseLanding: '2026-06-10T15:00:00.000Z',
    baitEntries: '[]',
  },
});

const baitBlocks = (xml: string) => xml.match(/<BAIT_USED>[\s\S]*?<\/BAIT_USED>/g) ?? [];

// ── Case 1: two rows closed at DIFFERENT times carry DIFFERENT stamps and DIFFERENT notes ──
test('two bait rows closed at different times carry different DG_CLOSE_DT values and different REM text; a no-note row emits no REM', () => {
  const log = mar90();
  log.data.baitEntries = JSON.stringify([
    { type: 'Mackerel, Atlantic', lbs: '100', closeDt: '2026-06-10T14:10:00.000Z', note: 'First tub' },
    { type: 'Herring, Atlantic',  lbs: '50',  closeDt: '2026-06-10T16:25:00.000Z', note: 'Second tub' },
    { type: 'Squid, Illex',       lbs: '25',  closeDt: '2026-06-10T17:40:00.000Z' }, // closed, NO note
  ]);
  // No card-level dgCloseBaitUsed and no rem.bait — every stamp/note is the row's own.
  const xml = generateElogXml(log, profile);
  const blocks = baitBlocks(xml);
  expect(blocks).toHaveLength(3);

  // Different close times, row by row (date_14, UTC)
  expect(blocks[0]).toContain('<DG_CLOSE_DT>20260610141000</DG_CLOSE_DT>');
  expect(blocks[1]).toContain('<DG_CLOSE_DT>20260610162500</DG_CLOSE_DT>');
  expect(blocks[2]).toContain('<DG_CLOSE_DT>20260610174000</DG_CLOSE_DT>');

  // Different REM text, row by row; the no-note row omits REM entirely (Ruling D4)
  expect(blocks[0]).toContain('<REM>First tub</REM>');
  expect(blocks[1]).toContain('<REM>Second tub</REM>');
  expect(blocks[2]).not.toContain('<REM>');

  // All rows individually closed → the send guard does NOT demand the card-level key
  expect(baitRowsAllClosed(log.data.baitEntries)).toBe(true);
  expect(unclosedUsedGroupKeys(log)).toEqual([]);
});

// A row's own stamp WINS over a LEGACY card-level stamp (T1: nothing writes dgCloseBaitUsed
// any more — this pins the emit fallback that keeps pre-S134 logs correct).
test('row stamp beats a legacy card-level stamp; unstamped rows fall back to it', () => {
  const log = mar90();
  log.data.dgCloseBaitUsed = '2026-06-10T18:00:00.000Z'; // legacy card stamp, later
  log.data.baitEntries = JSON.stringify([
    { type: 'Mackerel, Atlantic', lbs: '100', closeDt: '2026-06-10T14:10:00.000Z' }, // closed earlier
    { type: 'Herring, Atlantic',  lbs: '50' },                                       // only the close-all
  ]);
  const blocks = baitBlocks(generateElogXml(log, profile));
  expect(blocks[0]).toContain('<DG_CLOSE_DT>20260610141000</DG_CLOSE_DT>'); // kept its own time
  expect(blocks[1]).toContain('<DG_CLOSE_DT>20260610180000</DG_CLOSE_DT>'); // card fallback
});

// A partially row-closed log (no card stamp, one row still open) must still be refused.
test('one open row and no card stamp: the send guard still lists bait as unclosed', () => {
  const log = mar90();
  log.data.baitEntries = JSON.stringify([
    { type: 'Mackerel, Atlantic', lbs: '100', closeDt: '2026-06-10T14:10:00.000Z' },
    { type: 'Herring, Atlantic',  lbs: '50' }, // open
  ]);
  expect(baitRowsAllClosed(log.data.baitEntries)).toBe(false);
  expect(unclosedUsedGroupKeys(log)).toEqual(['dgCloseBaitUsed']);
});

// ── T1: the card control (and the form-level close-all) stamp ROWS, never the card ──
test('close-all stamps each open row with its own closeDt and writes no card-level stamp', () => {
  const log = mar90();
  const before = [
    { type: 'Mackerel, Atlantic', lbs: '100', closeDt: '2026-06-10T14:10:00.000Z' }, // already closed
    { type: 'Herring, Atlantic',  lbs: '50' },                                       // open
    { type: 'Squid, Illex',       lbs: '25' },                                       // open
  ];
  // What both close-all callers run (card button + the form-level Close & Save All):
  log.data.baitEntries = stampOpenBaitRows(JSON.stringify(before), '2026-06-10T18:00:00.000Z');
  // No card key was written — the card has no closed state of its own (T1).
  expect(log.data.dgCloseBaitUsed).toBeUndefined();
  const rows = JSON.parse(log.data.baitEntries) as { closeDt?: string }[];
  expect(rows[0].closeDt).toBe('2026-06-10T14:10:00.000Z'); // skipped, NOT restamped
  expect(rows[1].closeDt).toBe('2026-06-10T18:00:00.000Z');
  expect(rows[2].closeDt).toBe('2026-06-10T18:00:00.000Z');
  const blocks = baitBlocks(generateElogXml(log, profile));
  expect(blocks[0]).toContain('<DG_CLOSE_DT>20260610141000</DG_CLOSE_DT>');
  expect(blocks[1]).toContain('<DG_CLOSE_DT>20260610180000</DG_CLOSE_DT>');
  expect(blocks[2]).toContain('<DG_CLOSE_DT>20260610180000</DG_CLOSE_DT>');
  // All rows own-stamped -> the group is closed with NO card stamp anywhere
  expect(baitRowsAllClosed(log.data.baitEntries)).toBe(true);
  expect(unclosedUsedGroupKeys(log)).toEqual([]);
});

test('a row added after a close-all is genuinely open: emits NO DG_CLOSE_DT until closed itself', () => {
  const log = mar90();
  const closed = stampOpenBaitRows(JSON.stringify([
    { type: 'Mackerel, Atlantic', lbs: '100' },
    { type: 'Herring, Atlantic',  lbs: '50' },
  ]), '2026-06-10T18:00:00.000Z');
  // "+ Add Bait" afterwards: a normal OPEN row joins; still no card key anywhere.
  const withNew = JSON.stringify([...JSON.parse(closed), { type: 'Squid, Illex', lbs: '25' }]);
  log.data.baitEntries = withNew;
  const blocks = baitBlocks(generateElogXml(log, profile));
  expect(blocks).toHaveLength(3);
  expect(blocks[2]).toContain('<BT_TYP_ID>');
  expect(blocks[2]).not.toContain('<DG_CLOSE_DT>'); // open — no stamp, no inheritance
  // and the send guard lists bait again until that row is closed
  expect(unclosedUsedGroupKeys(log)).toEqual(['dgCloseBaitUsed']);
});

test('adding to a LEGACY card-stamped log: the stamp is adopted into existing rows and the new row does NOT inherit it', () => {
  const log = mar90();
  const legacyStamp = '2026-06-10T15:00:00.000Z';
  const legacyRows = JSON.stringify([
    { type: 'Mackerel, Atlantic', lbs: '100' },
    { type: 'Herring, Atlantic',  lbs: '50' },
  ]);
  // The adopt-on-add path (FullDfoForm handleSheetConfirm): copy the card stamp into each
  // existing row (same value -> identical emitted bytes), DROP the card key, append open.
  const adopted = stampOpenBaitRows(legacyRows, legacyStamp);
  log.data.baitEntries = JSON.stringify([...JSON.parse(adopted), { type: 'Squid, Illex', lbs: '25' }]);
  // card key dropped — deliberately NOT set on log.data
  const blocks = baitBlocks(generateElogXml(log, profile));
  expect(blocks).toHaveLength(3);
  // The two legacy rows emit the SAME bytes the fallback used to produce for them:
  expect(blocks[0]).toContain('<DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>');
  expect(blocks[1]).toContain('<DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>');
  // The NEW row inherits nothing:
  expect(blocks[2]).not.toContain('<DG_CLOSE_DT>');
});

// ── Case 2: a LEGACY-shape log — the card STAMP still carries; the card NOTE no longer does ──
// Was: "emits byte-identically to HEAD", against bytes captured at HEAD (d7e084b) before the
// S134 change. S142 (defect 44) deliberately broke that byte-identity for the REM line only:
// rem.bait is retired (no edit box since S134) and the generator no longer falls back to it,
// so these two rows — which have no note of their own — now emit NO REM. The two
// <REM>Shared bait note</REM> lines that stood after each <DG_CLOSE_DT> were removed from the
// golden below; every other byte is unchanged, which is the point of keeping the golden.
test('legacy-shape log: the card-level STAMP still carries to every row, and the retired card-level note no longer emits', () => {
  const log = mar90();
  log.remarks = { bait: 'Shared bait note' }; // retired key — must NOT reach the XML
  log.data.dgCloseBaitUsed = '2026-06-10T15:00:00.000Z';
  log.data.baitEntries = JSON.stringify([
    { type: 'Mackerel, Atlantic', lbs: '100' },
    { type: 'Herring, Atlantic', lbs: '50' },
  ]);
  const expected = `<?xml version="1.0" encoding="UTF-8"?>
<ELOG>
  <GENERAL_INFO>
    <CIE_ID>44542</CIE_ID>
    <SOFT_VER>0</SOFT_VER>
    <REG_ID>1004</REG_ID>
    <FIN>100400460</FIN>
    <VRN>104460</VRN>
    <FORM_VER_ID>234</FORM_VER_ID>
    <SUBFORM_ID>90</SUBFORM_ID>
  </GENERAL_INFO>
  <TRIP>
    <TRIP_NUM>1</TRIP_NUM>
    <START_DT>202606100830</START_DT>
    <CREW_NB>1</CREW_NB>
    <FIRST_ENTRY_DT>20260610085500</FIRST_ENTRY_DT>
    <LGBK_UID>ABCDEF</LGBK_UID>
    <BAIT_USED>
      <BT_TYP_ID>1315</BT_TYP_ID>
      <BT_WT>45.36</BT_WT>
      <DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>
    </BAIT_USED>
    <BAIT_USED>
      <BT_TYP_ID>3392</BT_TYP_ID>
      <BT_WT>22.68</BT_WT>
      <DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>
    </BAIT_USED>
    <EFFORT>
      <START_DT>202606100900</START_DT>
      <END_DT>202606101630</END_DT>
      <LIC_NO>104460</LIC_NO>
      <FMA_ID>38065</FMA_ID>
      <SAR_IND>N</SAR_IND>
      <MM_INTER_IND>N</MM_INTER_IND>
      <DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>
      <TGT_SPECIES>
        <SPECIE_ID>1312</SPECIE_ID>
      </TGT_SPECIES>
      <EFFORT_BY_GEAR>
        <GEAR_ID>925</GEAR_ID>
        <EFFORT_DETAIL>
          <NB_GEAR_HLD>250</NB_GEAR_HLD>
          <LGRID_ID>101</LGRID_ID>
          <GEAR_GRP_NUM>1</GEAR_GRP_NUM>
          <CATCH>
            <SPECIE_ID>1312</SPECIE_ID>
            <KEPT_WT>226.80</KEPT_WT>
            <SPECIE_FRM_ID>4691</SPECIE_FRM_ID>
          </CATCH>
        </EFFORT_DETAIL>
      </EFFORT_BY_GEAR>
    </EFFORT>
    <LANDING>
      <START_DT>202606101745</START_DT>
      <PORT_ID>20913</PORT_ID>
      <DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>
    </LANDING>
  </TRIP>
</ELOG>`;
  expect(generateElogXml(log, profile)).toBe(expected);
  // S142 (defect 44), stated as its own claim so a future restore of the fallback fails loudly
  expect(generateElogXml(log, profile)).not.toContain('Shared bait note');
});
