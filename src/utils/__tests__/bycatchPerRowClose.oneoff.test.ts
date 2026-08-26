// S134 Phase 3 — per-occurrence closure on PCONS(bycatch), copying the shipped bait
// pattern (95f0d32): each bycatch row may carry its OWN closeDt and note; the card-level
// dgClosePconsBycatch is the LEGACY STAMP fallback. Personal Use has its OWN note
// (remarks.personalUse).
// S142 (defect 44) — the shared rem.pcons NOTE fallback is GONE from BOTH sites. It lost its
// edit box in S134 Phase 3, and while it survived in the emit it was filling the Personal Use
// record with the retired Interactions/bycatch text on any log that carried one (two such
// files were already sent). A row or card with no note of its own now emits no REM.
import { generateElogXml } from '../dfoXmlGenerator';
import { unclosedUsedGroupKeys, rowsAllClosed, stampOpenRows, DfoLog } from '../dfoLogStorage';
import { EMPTY_PROFILE, CaptainProfile } from '../captainStorage';

const profile: CaptainProfile = {
  ...EMPTY_PROFILE, regId: 1004, subformId: 90, vesselNumber: '104460',
  licenceHolderFin: '100400460', fishingNumber: '104460', dfoLicenceNo: '104460', elogKey: 'x',
};

// Minimal MAR-90 log — bycatch rows injected per test. bycatchYes gates the "used"
// accounting (the emit iterates the entries regardless).
const mar90 = (): DfoLog => ({
  id: 's134b', lgbkUid: 'ABCDEF', firstEntryDt: '2026-06-10T08:55:00.000Z', mode: 'full',
  status: 'complete', dateFished: '2026-06-10', createdAt: 1, subformId: 90, regId: 1004,
  sentToDfo: false,
  data: {
    timeSailed: '05:30', timeStartedHauling: '06:00', timeStoppedHauling: '13:30', timeOfLanding: '14:45',
    crewRegistry: JSON.stringify(['Crew One']), catchWeight: '500', trapHauls: '250',
    fmaId: '38065', lgridCodeId: '101', portLanded: "Abbott's Harbour", portLandedCodeId: '20913',
    baitEntries: '[]',
    bycatchYes: 'true', bycatchEntries: '[]',
    personalUse: '', mmYes: 'false', sarYes: 'false',
    hlinCompany: '', hlinConfirmNo: '', hloutCompany: '', hloutConfirmNo: '',
    dgCloseEffort: '2026-06-10T15:00:00.000Z',
    dgCloseLanding: '2026-06-10T15:00:00.000Z',
  },
});

const pconsBlocks = (xml: string) => xml.match(/<PCONS>[\s\S]*?<\/PCONS>/g) ?? [];

// ── Two rows closed at DIFFERENT times carry DIFFERENT stamps and DIFFERENT notes ──
test('two bycatch rows closed at different times carry different DG_CLOSE_DT values and different REM text; a no-note row emits no REM', () => {
  const log = mar90();
  log.data.bycatchEntries = JSON.stringify([
    { species: 'Crab, Jonah', lbs: '40', usage: '37818', closeDt: '2026-06-10T14:10:00.000Z', note: 'First crab' },
    { species: 'Crab, Rock',  lbs: '20', closeDt: '2026-06-10T16:25:00.000Z', note: 'Second crab' },
    { species: 'Crab, Green', lbs: '10', closeDt: '2026-06-10T17:40:00.000Z' }, // closed, NO note
  ]);
  const blocks = pconsBlocks(generateElogXml(log, profile));
  expect(blocks).toHaveLength(3);
  expect(blocks[0]).toContain('<DG_CLOSE_DT>20260610141000</DG_CLOSE_DT>');
  expect(blocks[1]).toContain('<DG_CLOSE_DT>20260610162500</DG_CLOSE_DT>');
  expect(blocks[2]).toContain('<DG_CLOSE_DT>20260610174000</DG_CLOSE_DT>');
  expect(blocks[0]).toContain('<REM>First crab</REM>');
  expect(blocks[1]).toContain('<REM>Second crab</REM>');
  expect(blocks[2]).not.toContain('<REM>');
  expect(rowsAllClosed(log.data.bycatchEntries)).toBe(true);
  expect(unclosedUsedGroupKeys(log)).toEqual([]);
});

// A row's own stamp WINS over a LEGACY card-level stamp; unstamped rows fall back to it.
test('row stamp beats a legacy card-level stamp; unstamped rows fall back to it', () => {
  const log = mar90();
  log.data.dgClosePconsBycatch = '2026-06-10T18:00:00.000Z'; // legacy card stamp, later
  log.data.bycatchEntries = JSON.stringify([
    { species: 'Crab, Jonah', lbs: '40', closeDt: '2026-06-10T14:10:00.000Z' },
    { species: 'Crab, Rock',  lbs: '20' },
  ]);
  const blocks = pconsBlocks(generateElogXml(log, profile));
  expect(blocks[0]).toContain('<DG_CLOSE_DT>20260610141000</DG_CLOSE_DT>');
  expect(blocks[1]).toContain('<DG_CLOSE_DT>20260610180000</DG_CLOSE_DT>');
});

// A partially row-closed log (no card stamp, one row still open) must still be refused.
test('one open row and no card stamp: the send guard still lists bycatch as unclosed', () => {
  const log = mar90();
  log.data.bycatchEntries = JSON.stringify([
    { species: 'Crab, Jonah', lbs: '40', closeDt: '2026-06-10T14:10:00.000Z' },
    { species: 'Crab, Rock',  lbs: '20' }, // open
  ]);
  expect(rowsAllClosed(log.data.bycatchEntries)).toBe(false);
  expect(unclosedUsedGroupKeys(log)).toEqual(['dgClosePconsBycatch']);
});

// ── The card control (and the form-level close-all) stamp ROWS, never the card ──
test('close-all stamps each open row with its own closeDt and writes no card-level stamp', () => {
  const log = mar90();
  const before = [
    { species: 'Crab, Jonah', lbs: '40', closeDt: '2026-06-10T14:10:00.000Z' }, // already closed
    { species: 'Crab, Rock',  lbs: '20' },
    { species: 'Crab, Green', lbs: '10' },
  ];
  log.data.bycatchEntries = stampOpenRows(JSON.stringify(before), '2026-06-10T18:00:00.000Z');
  expect(log.data.dgClosePconsBycatch).toBeUndefined();
  const rows = JSON.parse(log.data.bycatchEntries) as { closeDt?: string }[];
  expect(rows[0].closeDt).toBe('2026-06-10T14:10:00.000Z'); // skipped, NOT restamped
  expect(rows[1].closeDt).toBe('2026-06-10T18:00:00.000Z');
  expect(rows[2].closeDt).toBe('2026-06-10T18:00:00.000Z');
  expect(rowsAllClosed(log.data.bycatchEntries)).toBe(true);
  expect(unclosedUsedGroupKeys(log)).toEqual([]);
});

test('a row added after a close-all is genuinely open: emits NO DG_CLOSE_DT until closed itself', () => {
  const log = mar90();
  const closed = stampOpenRows(JSON.stringify([
    { species: 'Crab, Jonah', lbs: '40' },
    { species: 'Crab, Rock',  lbs: '20' },
  ]), '2026-06-10T18:00:00.000Z');
  log.data.bycatchEntries = JSON.stringify([...JSON.parse(closed), { species: 'Crab, Green', lbs: '10' }]);
  const blocks = pconsBlocks(generateElogXml(log, profile));
  expect(blocks).toHaveLength(3);
  expect(blocks[2]).toContain('<SPECIE_ID>1917</SPECIE_ID>');
  expect(blocks[2]).not.toContain('<DG_CLOSE_DT>');
  expect(unclosedUsedGroupKeys(log)).toEqual(['dgClosePconsBycatch']);
});

test('adding to a LEGACY card-stamped log: the stamp is adopted into existing rows and the new row does NOT inherit it', () => {
  const log = mar90();
  const adopted = stampOpenRows(JSON.stringify([
    { species: 'Crab, Jonah', lbs: '40' },
    { species: 'Crab, Rock',  lbs: '20' },
  ]), '2026-06-10T15:00:00.000Z'); // the adopt-on-add path; card key then dropped
  log.data.bycatchEntries = JSON.stringify([...JSON.parse(adopted), { species: 'Crab, Green', lbs: '10' }]);
  const blocks = pconsBlocks(generateElogXml(log, profile));
  expect(blocks).toHaveLength(3);
  expect(blocks[0]).toContain('<DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>'); // same bytes the fallback produced
  expect(blocks[1]).toContain('<DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>');
  expect(blocks[2]).not.toContain('<DG_CLOSE_DT>'); // no inheritance
});

// ── B4: the personal-use note emits into the personal-use PCONS node ONLY ──
test('the personal-use note emits into the personal-use PCONS node only', () => {
  const log = mar90();
  log.data.personalUse = '10';
  log.data.dgClosePconsPersonal = '2026-06-10T15:30:00.000Z';
  log.data.bycatchEntries = JSON.stringify([
    { species: 'Crab, Jonah', lbs: '40', closeDt: '2026-06-10T14:10:00.000Z', note: 'Crab note' },
  ]);
  log.remarks = { personalUse: 'Personal use note' };
  const blocks = pconsBlocks(generateElogXml(log, profile));
  expect(blocks).toHaveLength(2); // bycatch node + personal-use node (USG_ID 37822)
  expect(blocks[0]).toContain('<REM>Crab note</REM>');
  expect(blocks[0]).not.toContain('Personal use note');
  expect(blocks[1]).toContain('<USG_ID>37822</USG_ID>');
  expect(blocks[1]).toContain('<REM>Personal use note</REM>');
  expect(blocks[1]).not.toContain('Crab note');
});

// ── A LEGACY-shape log — the card STAMPS still carry; the shared card NOTE no longer does ──
// Was: "emits byte-identically to HEAD", against bytes captured at HEAD (95f0d32) before the
// Phase-3 change. S142 (defect 44) deliberately broke that byte-identity for the REM lines
// only: rem.pcons is retired (no edit box since S134 Phase 3) and the generator no longer
// falls back to it — not on a bycatch row, and not on the Personal Use record. All THREE
// <REM>Shared pcons note</REM> lines were removed from the golden below (two bycatch rows and
// the personal-use node); every other byte is unchanged, which is the point of the golden.
//
// The third one is the defect's whole point: the personal-use PCONS was carrying the
// Interactions/bycatch note as if the harvester had written it about his own table lobster.
test('legacy-shape log: the card-level STAMPS still carry, and the retired shared note no longer emits — not on a bycatch row, not on Personal Use', () => {
  const log = mar90();
  log.remarks = { pcons: 'Shared pcons note' }; // retired key — must NOT reach the XML
  log.data.bycatchEntries = JSON.stringify([
    { species: 'Crab, Jonah', lbs: '40', usage: '37818' },
    { species: 'Crab, Rock', lbs: '20' },
  ]);
  log.data.personalUse = '10';
  log.data.dgClosePconsBycatch = '2026-06-10T15:00:00.000Z';
  log.data.dgClosePconsPersonal = '2026-06-10T15:30:00.000Z';
  const expected = EXPECTED_HEAD;
  expect(generateElogXml(log, profile)).toBe(expected);
});

const EXPECTED_HEAD = `<?xml version="1.0" encoding="UTF-8"?>
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
    <PCONS>
      <SPECIE_ID>1286</SPECIE_ID>
      <SPECIE_FRM_ID>4691</SPECIE_FRM_ID>
      <WT>18.14</WT>
      <USG_ID>37818</USG_ID>
      <DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>
    </PCONS>
    <PCONS>
      <SPECIE_ID>1287</SPECIE_ID>
      <SPECIE_FRM_ID>4691</SPECIE_FRM_ID>
      <WT>9.07</WT>
      <DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>
    </PCONS>
    <PCONS>
      <SPECIE_ID>1312</SPECIE_ID>
      <SPECIE_FRM_ID>4691</SPECIE_FRM_ID>
      <WT>4.54</WT>
      <USG_ID>37822</USG_ID>
      <DG_CLOSE_DT>20260610153000</DG_CLOSE_DT>
    </PCONS>
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
