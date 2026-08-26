// ONE-OFF (Session 121, Phase 2 guard): multi-SAR emission.
// ADDITIVE PROOF — a single-SAR log (no extraSars key: every pre-S121 log and every log
// where the user records one encounter) must emit BYTE-IDENTICAL XML to the pre-multi-SAR
// generator. PRE_S121_SAR_BASELINE below was captured by running the generator BEFORE the
// SAR loop refactor against this exact fixture. Two-SAR logs must emit two complete <SAR>
// nodes (XSD sar_type is 0..unbounded under TRIP) and still pass the structural validator.
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

function makeSarLog(): any {
  return {
    id: 'x', dateFished: '2026-06-10', lgbkUid: 'ABCDEF',
    firstEntryDt: '2026-06-10T08:55:00.000Z', tripNum: 7, subformId: 90, regId: 1004,
    data: {
      timeSailed: '05:30', timeStartedHauling: '06:00', timeStoppedHauling: '13:30', timeOfLanding: '14:45',
      crewRegistry: JSON.stringify(['Crew One', 'Crew Two']), catchWeight: '500', trapHauls: '250',
      bycatchEntries: '[]', personalUse: '10', mmYes: 'false',
      fmaId: '28599', portLanded: "ABBOTT'S HARBOUR", portLandedCodeId: '20913',
      lgridCodeId: '101', lgridDisplay: '101', gpsLat: '44.1234', gpsLng: '-66.5432', gpsSrc: 'gps', nbSpcmnBrd: '3',
      baitEntries: JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]),
      dgCloseBaitUsed: '2026-06-10T15:00:00.000Z', dgClosePcons: '2026-06-10T15:00:00.000Z',
      dgCloseEffort: '2026-06-10T15:00:00.000Z', dgCloseLanding: '2026-06-10T15:00:00.000Z',
      dgCloseSar: '2026-06-10T15:00:00.000Z',
      sarYes: 'true',
      sarSpecies: '35427', sarLat: '44.1500', sarLng: '-66.6000', sarGpsSrc: 'gps',
      sarDate: '2026-06-10', sarTime: '09:15', sarNbSpcmn: '1', sarCondId: '38996',
    },
  };
}

// S142 defect 52: a 38b log must carry both hail groups (Rules 2024/2025), so any test that
// asserts the document VALIDATES adds them through here. Kept OFF the shared fixture so
// PRE_S121_SAR_BASELINE — a deliberate byte pin — stays byte-for-byte untouched.
// 'Atlantic Catch Data Ltd.' (25095) is valid under both Rule 27 (HLIN) and Rule 93 (HLOUT).
function withHail(log: any): any {
  log.data.hlinCompany = 'Atlantic Catch Data Ltd.';
  log.data.hlinConfirmNo = 'HI-1001';
  log.data.dgCloseHlin = '2026-06-10T15:00:00.000Z';
  log.data.hloutCompany = 'Atlantic Catch Data Ltd.';
  log.data.hloutConfirmNo = 'HO-1001';
  log.data.dgCloseHlout = '2026-06-10T15:00:00.000Z';
  return log;
}

const count = (xml: string, frag: string): number => xml.split(frag).length - 1;

const PRE_S121_SAR_BASELINE = `<?xml version="1.0" encoding="UTF-8"?>
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
    <SAR>
      <SAR_DT>202606101215</SAR_DT>
      <LAT MODE="G">44.1500</LAT>
      <LONG MODE="G">-66.6000</LONG>
      <SPECIE_ID>35427</SPECIE_ID>
      <NB_SPCMN>1</NB_SPCMN>
      <SPCMN_COND_ID>38996</SPCMN_COND_ID>
      <DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>
    </SAR>
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
      <SAR_IND>Y</SAR_IND>
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

test('single-SAR log emits BYTE-IDENTICAL XML to the pre-multi-SAR generator', () => {
  const xml = generateElogXml(closeAllGroups(makeSarLog()), profile);
  expect(xml).toBe(PRE_S121_SAR_BASELINE);
  expect(count(xml, '<SAR>')).toBe(1);
});

test('two-SAR log emits two complete SAR nodes in order and validates', () => {
  const log = withHail(makeSarLog());
  log.data.extraSars = JSON.stringify([{
    species: '35110', lat: '44.3000', lng: '-66.8000', gpsSrc: 'manual',
    date: '2026-06-10', time: '11:40', nbSpcmn: '2', condId: '38997',
  }]);
  const xml = generateElogXml(closeAllGroups(log), profile);
  expect(count(xml, '<SAR>')).toBe(2);
  expect(count(xml, '</SAR>')).toBe(2);
  expect(count(xml, '<SAR_DT>')).toBe(2);
  expect(xml).toContain('<SPECIE_ID>35427</SPECIE_ID>');
  expect(xml).toContain('<SPECIE_ID>35110</SPECIE_ID>');
  // Encounter order preserved: block 1 first
  expect(xml.indexOf('<SPECIE_ID>35427</SPECIE_ID>')).toBeLessThan(xml.indexOf('<SPECIE_ID>35110</SPECIE_ID>'));
  // The second encounter carries its own coords/mode/count/condition
  expect(xml).toContain('<LAT MODE="M">44.3000</LAT>');
  expect(xml).toContain('<NB_SPCMN>2</NB_SPCMN>');
  expect(xml).toContain('<SPCMN_COND_ID>38997</SPCMN_COND_ID>');
  const validation = validateElogXml(xml, 90);
  expect(validation.errors).toEqual([]);
  expect(validation.valid).toBe(true);
});

test('SAR_IND=N emits no SAR node even if a stray extraSars key exists (gate preserved)', () => {
  const log = makeSarLog();
  log.data.sarYes = 'false';
  log.data.extraSars = JSON.stringify([{ species: '35110', lat: '44.3', lng: '-66.8', date: '2026-06-10', time: '11:40', nbSpcmn: '2', condId: '38997' }]);
  const xml = generateElogXml(closeAllGroups(log), profile);
  expect(count(xml, '<SAR>')).toBe(0);
  expect(xml).toContain('<SAR_IND>N</SAR_IND>');
});

test('a stored extraSars key with an empty array emits exactly one SAR node (defensive)', () => {
  const log = makeSarLog();
  log.data.extraSars = '[]';
  expect(generateElogXml(closeAllGroups(log), profile)).toBe(PRE_S121_SAR_BASELINE);
});
