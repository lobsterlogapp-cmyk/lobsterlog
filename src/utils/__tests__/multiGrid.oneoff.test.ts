// ONE-OFF (Session 121, Phase 1 guard): multi-grid catch-effort emission.
// ADDITIVE PROOF — a single-grid log (no extraEffortDetails key, i.e. every pre-S121 log
// and every log the user never adds a block to) must emit BYTE-IDENTICAL XML to the
// pre-S121 generator. The four PRE_S121_BASELINE_* constants below were captured by
// running the UNMODIFIED generator (pre-change working tree) against these exact fixtures;
// toBe() against them is the byte-for-byte guarantee protecting the 20 graded TRG files.
// S134: the personal-use PCONS block was DELETED from the 88/89/91 baselines — that node is
// now MAR(90)-only (its hardcoded USG_ID is Blocked on 88/89/91, row 58); the 90 baseline is untouched.
// Two-grid logs must emit one EFFORT_DETAIL per block with sequential GEAR_GRP_NUM
// (Rule 609x) and one CATCH per block, and still pass the structural validator.
import { generateElogXml, validateElogXml } from '../dfoXmlGenerator';
import { closeAllGroups } from './support/closeAllGroups';

const profile: any = {
  operatorName: 'Test Operator',
  vesselNumber: '123456',
  fishingNumber: '300123',
  licenceHolderFin: '123456789',
  units: 'lbs',
  language: 'en',
};

const FIXED_CLOSE = '2026-06-10T15:00:00.000Z';

function baseLog(subformId: number, regId: number): any {
  return {
    id: `test-log-${subformId}`,
    dateFished: '2026-06-10',
    lgbkUid: 'ABCDEF',
    firstEntryDt: '2026-06-10T08:55:00.000Z',
    tripNum: 7,
    sentToDfo: false,
    subformId,
    regId,
    data: {
      timeSailed: '05:30',
      timeStartedHauling: '06:00',
      timeStoppedHauling: '13:30',
      timeOfLanding: '14:45',
      crewRegistry: '[]',
      catchWeight: '500',
      trapHauls: '250',
      bycatchEntries: '[]',
      personalUse: '10',
      dgCloseBaitUsed: FIXED_CLOSE,
      dgClosePcons: FIXED_CLOSE,
      dgCloseEffort: FIXED_CLOSE,
      dgCloseLanding: FIXED_CLOSE,
      dgCloseTransfer: FIXED_CLOSE,
      mmYes: 'false',
      sarYes: 'false',
      hlinCompany: '',
      hlinConfirmNo: '',
      hloutCompany: '',
      hloutConfirmNo: '',
    },
  };
}

function makeLog(subformId: number): any {
  if (subformId === 88) {
    const log = baseLog(88, 1006);
    log.data.fmaId = '25640';
    log.data.crewRegistry = JSON.stringify(['Crew One', 'Crew Two']);
    log.data.departurePort = 'RIMOUSKI';
    log.data.departurePortCodeId = '22648';
    log.data.portLanded = 'RIMOUSKI';
    log.data.portLandedCodeId = '22648';
    log.data.soakDuration = '2';
    log.data.gpsLat = '48.4488';
    log.data.gpsLng = '-68.5236';
    log.data.gpsSrc = 'gps';
    log.data.baitEntries = JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]);
    log.data.useCrInd = 'Y';
    log.data.carrierVrn = '106460';
    log.data.prtnshpId = '39468';
    log.data.transferYes = 'true';
    log.data.transferTime = '15:00';
    log.data.transferWt = '50';
    // S154D R1: FROM_VRN is no longer supplied from the profile, so a QC transfer without a
    // typed source is REFUSED under Rule 251 — and a byte pin on a document DFO would reject
    // is a weaker pin than one on a legal document. 106462 is a third reserved Quebec vessel
    // (Test_values p.1), keeping source, destination and carrier three different boats.
    log.data.transferFromVrn = '106462';
    log.data.transferToVrn = '106461';
    return log;
  }
  if (subformId === 89) {
    const log = baseLog(89, 1014);
    log.data.fmaId = '1526';
    log.data.portLanded = 'ABOITEAU';
    log.data.portLandedCodeId = '19322';
    log.data.soakDuration = '2';
    log.data.gpsLat = '46.2412';
    log.data.gpsLng = '-64.5433';
    log.data.gpsSrc = 'manual';
    log.data.baitEntries = JSON.stringify([{ type: 'Squid, Illex', lbs: '100' }]);
    return log;
  }
  if (subformId === 90) {
    const log = baseLog(90, 1004);
    log.data.fmaId = '28599';
    log.data.portLanded = "ABBOTT'S HARBOUR";
    log.data.portLandedCodeId = '20913';
    log.data.crewRegistry = JSON.stringify(['Crew One', 'Crew Two']);
    log.data.lgridCodeId = '101';
    log.data.lgridDisplay = '101';
    log.data.gpsLat = '44.1234';
    log.data.gpsLng = '-66.5432';
    log.data.gpsSrc = 'gps';
    log.data.nbSpcmnBrd = '3';
    log.data.baitEntries = JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]);
    return log;
  }
  const log = baseLog(91, 1002);
  log.data.fmaId = '2071';
  log.data.departurePort = 'PORT AUX BASQUES (CHANNEL)';
  log.data.departurePortCodeId = '21331';
  log.data.portLanded = 'PORT AUX BASQUES (CHANNEL)';
  log.data.portLandedCodeId = '21331';
  log.data.soakDuration = '2';
  log.data.trapSize = '39682';
  log.data.gearSubtypeId = '39684';
  log.data.nbSpcmnKept = '120';
  log.data.baitEntries = JSON.stringify([{ type: 'Squid, Illex', lbs: '100' }]);
  return log;
}

const count = (xml: string, frag: string): number => xml.split(frag).length - 1;

const PRE_S121_BASELINE_88 = `<?xml version="1.0" encoding="UTF-8"?>
<ELOG>
  <GENERAL_INFO>
    <CIE_ID>44542</CIE_ID>
    <SOFT_VER>0</SOFT_VER>
    <REG_ID>1006</REG_ID>
    <FIN>123456789</FIN>
    <VRN>123456</VRN>
    <FORM_VER_ID>234</FORM_VER_ID>
    <SUBFORM_ID>88</SUBFORM_ID>
  </GENERAL_INFO>
  <TRIP>
    <TRIP_NUM>7</TRIP_NUM>
    <OPER_NAME>Test Operator</OPER_NAME>
    <START_DT>202606100830</START_DT>
    <CREW_NB>2</CREW_NB>
    <PORT_ID>22648</PORT_ID>
    <FIRST_ENTRY_DT>20260610085500</FIRST_ENTRY_DT>
    <USE_CR_IND>Y</USE_CR_IND>
    <PRTNSHP_ID>39468</PRTNSHP_ID>
    <LGBK_UID>ABCDEF</LGBK_UID>
    <BAIT_USED>
      <BT_TYP_ID>1315</BT_TYP_ID>
      <BT_WT>45.36</BT_WT>
      <DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>
    </BAIT_USED>
    <EFFORT>
      <START_DT>202606100900</START_DT>
      <END_DT>202606101630</END_DT>
      <LIC_NO>300123</LIC_NO>
      <FMA_ID>25640</FMA_ID>
      <SAR_IND>N</SAR_IND>
      <MM_INTER_IND>N</MM_INTER_IND>
      <DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>
      <TGT_SPECIES>
        <SPECIE_ID>1312</SPECIE_ID>
      </TGT_SPECIES>
      <EFFORT_BY_GEAR>
        <GEAR_ID>925</GEAR_ID>
        <EFFORT_DETAIL>
          <SOAKED_DUR>2880</SOAKED_DUR>
          <NB_GEAR_HLD>250</NB_GEAR_HLD>
          <GEAR_GRP_NUM>1</GEAR_GRP_NUM>
          <LAT MODE="G">48.4488</LAT>
          <LONG MODE="G">-68.5236</LONG>
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
      <PORT_ID>22648</PORT_ID>
      <VRN>106460</VRN>
      <DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>
    </LANDING>
    <TRANSFER>
      <TRNSF_DT>202606101800</TRNSF_DT>
      <FROM_VRN>106462</FROM_VRN>
      <TO_VRN>106461</TO_VRN>
      <DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>
      <TRANSFER_DTL>
        <SPECIE_ID>1312</SPECIE_ID>
        <SPECIE_FRM_ID>4691</SPECIE_FRM_ID>
        <WT>22.68</WT>
      </TRANSFER_DTL>
    </TRANSFER>
  </TRIP>
</ELOG>`;

const PRE_S121_BASELINE_89 = `<?xml version="1.0" encoding="UTF-8"?>
<ELOG>
  <GENERAL_INFO>
    <CIE_ID>44542</CIE_ID>
    <SOFT_VER>0</SOFT_VER>
    <REG_ID>1014</REG_ID>
    <FIN>123456789</FIN>
    <VRN>123456</VRN>
    <FORM_VER_ID>234</FORM_VER_ID>
    <SUBFORM_ID>89</SUBFORM_ID>
  </GENERAL_INFO>
  <TRIP>
    <TRIP_NUM>7</TRIP_NUM>
    <OPER_NAME>Test Operator</OPER_NAME>
    <START_DT>202606100830</START_DT>
    <FIRST_ENTRY_DT>20260610085500</FIRST_ENTRY_DT>
    <LGBK_UID>ABCDEF</LGBK_UID>
    <BAIT_USED>
      <BT_TYP_ID>1359</BT_TYP_ID>
      <BT_WT>45.36</BT_WT>
      <DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>
    </BAIT_USED>
    <EFFORT>
      <START_DT>202606100900</START_DT>
      <END_DT>202606101630</END_DT>
      <LIC_NO>300123</LIC_NO>
      <FMA_ID>1526</FMA_ID>
      <SAR_IND>N</SAR_IND>
      <MM_INTER_IND>N</MM_INTER_IND>
      <DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>
      <TGT_SPECIES>
        <SPECIE_ID>1312</SPECIE_ID>
      </TGT_SPECIES>
      <EFFORT_BY_GEAR>
        <GEAR_ID>925</GEAR_ID>
        <EFFORT_DETAIL>
          <SOAKED_DUR>2880</SOAKED_DUR>
          <NB_GEAR_HLD>250</NB_GEAR_HLD>
          <GEAR_GRP_NUM>1</GEAR_GRP_NUM>
          <LAT MODE="M">46.2412</LAT>
          <LONG MODE="M">-64.5433</LONG>
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
      <PORT_ID>19322</PORT_ID>
      <DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>
    </LANDING>
  </TRIP>
</ELOG>`;

const PRE_S121_BASELINE_90 = `<?xml version="1.0" encoding="UTF-8"?>
<ELOG>
  <GENERAL_INFO>
    <CIE_ID>44542</CIE_ID>
    <SOFT_VER>0</SOFT_VER>
    <REG_ID>1004</REG_ID>
    <FIN>123456789</FIN>
    <VRN>123456</VRN>
    <FORM_VER_ID>234</FORM_VER_ID>
    <SUBFORM_ID>90</SUBFORM_ID>
  </GENERAL_INFO>
  <TRIP>
    <TRIP_NUM>7</TRIP_NUM>
    <OPER_NAME>Test Operator</OPER_NAME>
    <START_DT>202606100830</START_DT>
    <CREW_NB>2</CREW_NB>
    <FIRST_ENTRY_DT>20260610085500</FIRST_ENTRY_DT>
    <LGBK_UID>ABCDEF</LGBK_UID>
    <BAIT_USED>
      <BT_TYP_ID>1315</BT_TYP_ID>
      <BT_WT>45.36</BT_WT>
      <DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>
    </BAIT_USED>
    <PCONS>
      <SPECIE_ID>1312</SPECIE_ID>
      <SPECIE_FRM_ID>4691</SPECIE_FRM_ID>
      <WT>4.54</WT>
      <USG_ID>37822</USG_ID>
      <DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>
    </PCONS>
    <EFFORT>
      <START_DT>202606100900</START_DT>
      <END_DT>202606101630</END_DT>
      <LIC_NO>300123</LIC_NO>
      <FMA_ID>28599</FMA_ID>
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
          <LAT MODE="G">44.1234</LAT>
          <LONG MODE="G">-66.5432</LONG>
          <CATCH>
            <SPECIE_ID>1312</SPECIE_ID>
            <KEPT_WT>226.80</KEPT_WT>
            <SPECIE_FRM_ID>4691</SPECIE_FRM_ID>
            <NB_SPCMN_BRD>3</NB_SPCMN_BRD>
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

const PRE_S121_BASELINE_91 = `<?xml version="1.0" encoding="UTF-8"?>
<ELOG>
  <GENERAL_INFO>
    <CIE_ID>44542</CIE_ID>
    <SOFT_VER>0</SOFT_VER>
    <REG_ID>1002</REG_ID>
    <FIN>123456789</FIN>
    <VRN>123456</VRN>
    <FORM_VER_ID>234</FORM_VER_ID>
    <SUBFORM_ID>91</SUBFORM_ID>
  </GENERAL_INFO>
  <TRIP>
    <TRIP_NUM>7</TRIP_NUM>
    <OPER_NAME>Test Operator</OPER_NAME>
    <START_DT>202606100830</START_DT>
    <PORT_ID>21331</PORT_ID>
    <FIRST_ENTRY_DT>20260610085500</FIRST_ENTRY_DT>
    <LGBK_UID>ABCDEF</LGBK_UID>
    <BAIT_USED>
      <BT_TYP_ID>1359</BT_TYP_ID>
      <BT_WT>45.36</BT_WT>
      <DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>
    </BAIT_USED>
    <EFFORT>
      <START_DT>202606100900</START_DT>
      <END_DT>202606101630</END_DT>
      <LIC_NO>300123</LIC_NO>
      <FMA_ID>2071</FMA_ID>
      <SAR_IND>N</SAR_IND>
      <MM_INTER_IND>N</MM_INTER_IND>
      <DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>
      <TGT_SPECIES>
        <SPECIE_ID>1312</SPECIE_ID>
      </TGT_SPECIES>
      <EFFORT_BY_GEAR>
        <GEAR_ID>925</GEAR_ID>
        <GEAR_SBTYP_ID>39684</GEAR_SBTYP_ID>
        <EFFORT_DETAIL>
          <SOAKED_DUR>2880</SOAKED_DUR>
          <NB_GEAR_HLD>250</NB_GEAR_HLD>
          <GEAR_GRP_NUM>1</GEAR_GRP_NUM>
          <TRP_SZ_ID>39682</TRP_SZ_ID>
          <CATCH>
            <SPECIE_ID>1312</SPECIE_ID>
            <KEPT_WT>226.80</KEPT_WT>
            <NB_SPCMN_KEPT>120</NB_SPCMN_KEPT>
            <SPECIE_FRM_ID>4691</SPECIE_FRM_ID>
          </CATCH>
        </EFFORT_DETAIL>
      </EFFORT_BY_GEAR>
    </EFFORT>
    <LANDING>
      <START_DT>202606101745</START_DT>
      <PORT_ID>21331</PORT_ID>
      <DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>
    </LANDING>
  </TRIP>
</ELOG>`;

test.each([88, 89, 90, 91])(
  'subform %s single-grid log emits BYTE-IDENTICAL XML to the pre-S121 generator',
  (sf) => {
    const xml = generateElogXml(closeAllGroups(makeLog(sf)), profile);
    const baseline = { 88: PRE_S121_BASELINE_88, 89: PRE_S121_BASELINE_89, 90: PRE_S121_BASELINE_90, 91: PRE_S121_BASELINE_91 }[sf as 88 | 89 | 90 | 91];
    expect(xml).toBe(baseline);
    expect(count(xml, '<EFFORT_DETAIL>')).toBe(1);
    expect(count(xml, '<GEAR_GRP_NUM>1</GEAR_GRP_NUM>')).toBe(1);
    expect(xml).not.toContain('<GEAR_GRP_NUM>2</GEAR_GRP_NUM>');
  },
);

test('MAR-90 (38b) two-grid log emits two EFFORT_DETAIL with sequential GEAR_GRP_NUM and one CATCH each', () => {
  const log = makeLog(90);
  log.data.extraEffortDetails = JSON.stringify([{
    lgridCodeId: '102', lgridDisplay: '102',
    catchWeight: '300', trapHauls: '100',
    gpsLat: '44.2000', gpsLng: '-66.6000', gpsSrc: 'manual',
    nbSpcmnBrd: '2',
  }]);
  // S142 defect 52: this test asserts the document VALIDATES, and a 38b log must carry both
  // hail groups (Rules 2024/2025). Set here rather than on the shared makeLog(90) fixture so
  // PRE_S121_BASELINE_90 — a deliberate byte pin — stays byte-for-byte untouched.
  log.data.hlinCompany = 'Atlantic Catch Data Ltd.';
  log.data.hlinConfirmNo = 'HI-1001';
  // S161: Rules 660/661 now enforced — the 38b HLIN needs its ETA and weight (S154D fixture rule).
  log.data.hlinEta = '12:00';
  log.data.hlinTotalWeight = '111';
  log.data.dgCloseHlin = '2026-06-10T15:00:00.000Z';
  log.data.hloutCompany = 'Atlantic Catch Data Ltd.';
  log.data.hloutConfirmNo = 'HO-1001';
  log.data.dgCloseHlout = '2026-06-10T15:00:00.000Z';
  const xml = generateElogXml(closeAllGroups(log), profile);
  expect(count(xml, '<EFFORT_DETAIL>')).toBe(2);
  expect(count(xml, '</EFFORT_DETAIL>')).toBe(2);
  expect(xml).toContain('<GEAR_GRP_NUM>1</GEAR_GRP_NUM>');
  expect(xml).toContain('<GEAR_GRP_NUM>2</GEAR_GRP_NUM>');
  expect(count(xml, '<CATCH>')).toBe(2);
  // Each block carries its own grid and weight (500 lbs -> 226.80 kg; 300 lbs -> 136.08 kg)
  expect(xml).toContain('<LGRID_ID>101</LGRID_ID>');
  expect(xml).toContain('<LGRID_ID>102</LGRID_ID>');
  expect(xml).toContain('<KEPT_WT>226.80</KEPT_WT>');
  expect(xml).toContain('<KEPT_WT>136.08</KEPT_WT>');
  // Block order preserved: block 1 (grid 101) before block 2 (grid 102)
  expect(xml.indexOf('<LGRID_ID>101</LGRID_ID>')).toBeLessThan(xml.indexOf('<LGRID_ID>102</LGRID_ID>'));
  // The second block's manual coords carry MODE="M"; block 1 keeps MODE="G"
  expect(xml).toContain('<LAT MODE="G">44.1234</LAT>');
  expect(xml).toContain('<LAT MODE="M">44.2</LAT>');
  const validation = validateElogXml(xml, 90);
  expect(validation.errors).toEqual([]);
  expect(validation.valid).toBe(true);
});

test('QC-88 two-grid log: each EFFORT_DETAIL carries its own SOAKED_DUR and coords, and validates', () => {
  const log = makeLog(88);
  log.data.extraEffortDetails = JSON.stringify([{
    catchWeight: '200', trapHauls: '80', soakDuration: '1',
    gpsLat: '48.5000', gpsLng: '-68.6000', gpsSrc: 'gps',
  }]);
  const xml = generateElogXml(closeAllGroups(log), profile);
  expect(count(xml, '<EFFORT_DETAIL>')).toBe(2);
  expect(count(xml, '<SOAKED_DUR>')).toBe(2);
  expect(xml).toContain('<SOAKED_DUR>2880</SOAKED_DUR>'); // block 1: 2 days
  expect(xml).toContain('<SOAKED_DUR>1440</SOAKED_DUR>'); // block 2: 1 day
  expect(count(xml, '<LAT MODE=')).toBe(2);
  expect(xml).toContain('<GEAR_GRP_NUM>2</GEAR_GRP_NUM>');
  const validation = validateElogXml(xml, 88);
  expect(validation.errors).toEqual([]);
  expect(validation.valid).toBe(true);
});

test('a stored extraEffortDetails key with an empty array emits exactly one EFFORT_DETAIL (defensive)', () => {
  const log = makeLog(90);
  log.data.extraEffortDetails = '[]';
  expect(generateElogXml(closeAllGroups(log), profile)).toBe(PRE_S121_BASELINE_90);
});
