// T1 (TRG Logbook) — proves REM (note) emission at all 13 generator emit sites, and
// proves the blank-note path emits nothing. Also exercises T4 (a French-accented note).
//
// There are 13 REM emit SITES: trip×1, bait×1, pcons×2 (bycatch + personal-use),
// haul×3 (EFFORT / EFFORT_BY_GEAR / EFFORT_DETAIL — one note fans across all three),
// catch×1, hlin×1, hlout×1, landing×1, transfer×2 (TRANSFER / TRANSFER_DTL — one note
// fans across both, QC-88 only).
//
// HLIN/HLOUT (FMA 28599/1595 → MAR-90) and TRANSFER (QC-88 only) are mutually exclusive
// in a legitimate log, so coverage is split across two fixtures:
//   Fixture A (MAR-90, FMA 28599): 11 sites — trip, bait, pcons×2, haul×3, catch, hlin,
//                                  hlout, landing.
//   Fixture B (QC-88, transfer note only): the leftover transfer×2, and (since every other
//                                  note is blank) proof that blank notes emit no REM.
// 11 + 2 = all 13 sites proven. Each writes its XML to /tmp for xmllint validation.
import * as fs from 'fs';
import { generateElogXml } from '../dfoXmlGenerator';
import { DfoLog, LogRemarks } from '../dfoLogStorage';

const profile: any = {
  operatorName: 'Test Operator',
  vesselNumber: '123456',
  fishingNumber: '300123',
  licenceHolderFin: '123456789',
  units: 'lbs',
  language: 'en',
};

// French-accented note (also covers T4). Note the apostrophe → &apos; after xmlEscape.
const HAUL_NOTE = "Relâché près de l'île — pêche terminée";
const HAUL_NOTE_XML = "Relâché près de l&apos;île — pêche terminée"; // as it appears in the XML

// Count non-overlapping occurrences of a literal substring (regex-escape-free).
const countOcc = (hay: string, needle: string) => hay.split(needle).length - 1;
// Does the text between the first <openTag> and the matching </closeTag> contain needle?
const between = (xml: string, openTag: string, closeTag: string) => {
  const s = xml.indexOf(openTag);
  const e = xml.indexOf(closeTag, s);
  return s >= 0 && e > s ? xml.slice(s, e) : '';
};

function baseLog(subformId: number, regId: number): DfoLog {
  return {
    id: `t1-rem-${subformId}`,
    lgbkUid: 'ABCDEF',
    firstEntryDt: '2026-06-10T08:55:00.000Z',
    mode: 'full',
    dateFished: '2026-06-10',
    createdAt: 1,
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
      dgClosePcons: '2026-06-10T15:00:00.000Z',
      mmYes: 'false',
      sarYes: 'false',
      lostGearYes: 'false',
      hlinCompany: '',
      hlinConfirmNo: '',
      hloutCompany: '',
      hloutConfirmNo: '',
    },
  };
}

// ── Fixture A: MAR-90, FMA 28599 — reaches 11 of 13 sites ──────────────────────────────
test('T1/A MAR-90: REM emitted at 11 sites (trip, bait, pcons×2, haul×3, catch, hlin, hlout, landing)', () => {
  const log = baseLog(90, 1004);
  log.data.fmaId = '28599'; // 38b
  log.data.crewRegistry = JSON.stringify(['Crew One', 'Crew Two']);
  log.data.portLandedCodeId = '20913'; // Abbott's Harbour (NS)
  log.data.lgridCodeId = '101';
  // FMA 38b extras for a legitimate log
  log.data.gpsLat = '44.1234';
  log.data.gpsLng = '-66.5432';
  log.data.gpsSrc = 'gps';
  log.data.nbSpcmnBrd = '3';
  // bait → BAIT_USED; bycatch + personalUse → two PCONS nodes
  log.data.baitEntries = JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]);
  log.data.bycatchEntries = JSON.stringify([{ species: 'Crab, Jonah', lbs: '40' }]); // codeId 1286
  // hlin/hlout → valid company labels so *_CIE_ID is a real codeId (not 0, which fails integer_10)
  log.data.hlinCompany = 'Resmar';                  // 11682
  log.data.hlinConfirmNo = 'HLIN-001';
  log.data.hloutCompany = 'Atlantic Catch Data Ltd.'; // 25095
  log.data.hloutConfirmNo = 'HLOUT-001';

  const remarks: LogRemarks = {
    trip: 'Trip-level remark',
    bait: 'Bait remark',
    haul: HAUL_NOTE,       // fans across EFFORT / EFFORT_BY_GEAR / EFFORT_DETAIL
    catch: 'Catch remark',
    landing: 'Landing remark',
    hlin: 'Hail-in remark',
    hlout: 'Hail-out remark',
    pcons: 'PCONS remark', // fans across both PCONS nodes (bycatch + personal-use)
    // transfer intentionally omitted — TRANSFER is not reachable on MAR-90
  };
  log.remarks = remarks;

  const xml = generateElogXml(log, profile);
  fs.writeFileSync('/tmp/sample_t1_mar90.xml', xml);

  // Exactly 11 REM elements total
  expect(countOcc(xml, '<REM>')).toBe(11);

  // haul note fans across all three effort nodes (and T4: accents survive round-trip)
  expect(countOcc(xml, `<REM>${HAUL_NOTE_XML}</REM>`)).toBe(3);
  expect(xml).toContain('pêche terminée'); // accents not mangled
  expect(between(xml, '<EFFORT>', '<TGT_SPECIES>')).toContain(`<REM>${HAUL_NOTE_XML}</REM>`);
  expect(between(xml, '<EFFORT_BY_GEAR>', '<EFFORT_DETAIL>')).toContain(`<REM>${HAUL_NOTE_XML}</REM>`);
  expect(between(xml, '<EFFORT_DETAIL>', '<CATCH>')).toContain(`<REM>${HAUL_NOTE_XML}</REM>`);

  // pcons note fans across both PCONS nodes
  expect(countOcc(xml, '<REM>PCONS remark</REM>')).toBe(2);

  // single-node notes, each inside its own parent
  expect(between(xml, '<BAIT_USED>', '</BAIT_USED>')).toContain('<REM>Bait remark</REM>');
  expect(between(xml, '<CATCH>', '</CATCH>')).toContain('<REM>Catch remark</REM>');
  expect(between(xml, '<HLIN>', '</HLIN>')).toContain('<REM>Hail-in remark</REM>');
  expect(between(xml, '<HLOUT>', '</HLOUT>')).toContain('<REM>Hail-out remark</REM>');
  expect(between(xml, '<LANDING>', '</LANDING>')).toContain('<REM>Landing remark</REM>');
  // TRIP note sits right after LGBK_UID (its own direct child, not a descendant's)
  expect(xml).toMatch(/<\/LGBK_UID>\n\s*<REM>Trip-level remark<\/REM>/);

  // transfer note absent — node not emitted on MAR-90
  expect(xml).not.toContain('<TRANSFER>');
  expect(xml).not.toContain('Transfer remark');
});

// ── Fixture B: QC-88, only the transfer note — covers the leftover transfer×2 ───────────
test('T1/B QC-88: transfer note fans across TRANSFER + TRANSFER_DTL; all other notes blank → no REM', () => {
  const log = baseLog(88, 1006);
  log.data.fmaId = '25640'; // LFA 17b
  log.data.crewRegistry = JSON.stringify(['Crew One', 'Crew Two']);
  log.data.departurePortCodeId = '22648'; // Rimouski (QC)
  log.data.portLandedCodeId = '22648';
  log.data.soakDuration = '2';
  log.data.baitEntries = JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]);
  // QC-88 transfer (Rules 248-252)
  log.data.useCrInd = 'Y';
  log.data.carrierVrn = '106460';
  log.data.prtnshpId = '39468';
  log.data.transferYes = 'true';
  log.data.transferTime = '15:00';
  log.data.transferWt = '50';
  log.data.transferToVrn = '106461';

  // ONLY the transfer note is populated; every other section left blank.
  log.remarks = { transfer: 'Transfer remark' };

  const xml = generateElogXml(log, profile);
  fs.writeFileSync('/tmp/sample_t1_qc88.xml', xml);

  // Exactly 2 REM elements — both transfer; nothing leaked from the blank sections
  expect(countOcc(xml, '<REM>')).toBe(2);
  expect(countOcc(xml, '<REM>Transfer remark</REM>')).toBe(2);
  // one in TRANSFER (before TRANSFER_DTL), one in TRANSFER_DTL
  expect(between(xml, '<TRANSFER>', '<TRANSFER_DTL>')).toContain('<REM>Transfer remark</REM>');
  expect(between(xml, '<TRANSFER_DTL>', '</TRANSFER_DTL>')).toContain('<REM>Transfer remark</REM>');
});
