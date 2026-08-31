// ONE-OFF (Session 154D, U6 guard test): the Quebec TRANSFER source fields —
// TRANSFER.FROM_VRN / FROM_VNAME / FROM_PND_NUM, plus the destination vessel name TO_VNAME.
//
// WRITTEN BEFORE THE EMIT EXISTS, ON PURPOSE. Every assertion below describes the behaviour
// this build is about to create; against tip b3cfec3 the file is expected to be RED. What it
// must never be is red for the wrong reason — a bad fixture, a crash on an undefined lookup —
// so every table lookup uses `?.` and every fixture is copied from a suite already proven to
// produce valid:true documents (nbSpcmnDisc / nbSpcmnKept / latLongPerRegion).
//
// ── DFO authority behind each group ───────────────────────────────────────────────────────
//
//  • Subforms_requirements_234.xlsx (at 2026-08-27), rows read off the LABEL CELL, not off a
//    remembered number:
//        row 106 FROM_PND_NUM (Element_id 1058) · row 107 FROM_VRN (648)
//        row 108 FROM_VNAME   (649)             · row 111 TO_VNAME (647)
//    All four: Optional QC-88 · Blocked GLF-89 · Blocked MAR-90 · Blocked NL-91.
//
//  • XSD transfer_type, "…Homard_20260624 000000.xsd":377-392 — the sequence is
//        TRNSF_DT → FROM_VRN → FROM_VNAME → FROM_PND_NUM → TO_VRN → TO_VNAME → TO_PND_NUM
//        → DG_CLOSE_DT → REM → TRANSFER_DTL
//    Note the vessel NAME sits BETWEEN the two members of its exclusive pair. Types:
//    string_12 / string_50 / string_30 (:48, :66, :78), each restricted from the local
//    `string` type at :34 which carries minLength=1 — so a blank value is not a legal
//    element and must be OMITTED, never emitted empty.
//
//  • Rule 251 (FS-NAT-234-12-EN:1854-1858 / FR:1901-1906), the rule this build exists to
//    satisfy honestly. The English is ambiguous; the French is not:
//        « Si le nœud Transfer est utilisé, un seul des deux éléments suivants
//          DOIT OBLIGATOIREMENT contenir une valeur : Transfer.From_vrn / Transfer.From_pnd_num »
//    Exactly one. Never both, never neither. Triggered by the TRANSFER node existing.
//
//  • Rule 252 (EN:1859-1863) is the same sentence for the TO pair and is already shipped —
//    the FROM pair mirrors its implementation exactly (ruling R2).
//
//  • FROM_PND_NUM long description (XML_dictionary.csv:767): "…Write 0 if pond (or pound)
//    does not have any number or identifier". A pond with no number is the literal string
//    "0", which is a VALUE and therefore satisfies Rule 251. Group C pins that a typed "0"
//    survives, because tag() drops blanks and "0" must not be mistaken for one.
//
// ── S154D ruling R1, and why the first two tests look destructive ─────────────────────────
//
// Today dfoXmlGenerator.ts:576 emits `tag('FROM_VRN', captainProfile.vesselNumber)` — every
// Quebec transfer ever sent has silently carried the harvester's OWN vessel number, whether
// or not that is what happened. R1: that stops. The box starts empty and nothing goes in it
// unless he types it. Group A pins the absence and pins that the close/send path REFUSES the
// resulting document under Rule 251 rather than quietly inventing a source.
//
// ⚠ The byte pin at multiGrid.oneoff.test.ts:185 breaks by design when the emit lands. Its
// replacement value is re-derived by RUNNING THE GENERATOR IN NODE, never by copying what a
// failing test printed and never by hand-editing the literal. A hand-edited pin is not a pin.

import fs from 'fs';
import { generateElogXml, validateElogXml } from '../dfoXmlGenerator';
import {
  fieldRequirement,
  isFieldRequired,
  missingInContainer,
  containerProgress,
  RequirementContext,
  FieldValues,
} from '../dfoRequirements';
import { closeAllGroups } from './support/closeAllGroups';

const profile: any = {
  operatorName: 'Test Operator',
  vesselNumber: '123456',          // the value R1 removes from FROM_VRN
  dfoLicenceNo: '300123',
  dfoFin: '123456789',
  fishingNumber: '300123',
  licenceHolderFin: '123456789',
  units: 'lbs',
  language: 'en',
};

const ctx = (subformId: number): RequirementContext => ({ subformId });

// ── Fixtures ──────────────────────────────────────────────────────────────────────────────
// QC-88 carrying a recorded transfer. Copied from nbSpcmnDisc.oneoff.test.ts's QC fixture,
// which is proven to produce a valid:true document — so anything this suite reports about
// validity is about the transfer source fields and nothing else.

function baseLog(subformId: number, regId: number): any {
  return {
    id: `test-log-${subformId}`,
    dateFished: '2026-06-10',
    lgbkUid: 'ABCDEF',
    firstEntryDt: '2026-06-10T08:55:00.000Z',
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
      hlinCompany: '',
      hlinConfirmNo: '',
      hloutCompany: '',
      hloutConfirmNo: '',
    },
  };
}

/** QC-88 with a transfer recorded and a DESTINATION set (Rule 252 satisfied), so that the
 *  only thing any Rule-251 assertion can be reacting to is the FROM pair. */
function qcTransferLog(): any {
  const log = baseLog(88, 1006);
  log.data.fmaId = '25640';
  log.data.crewRegistry = JSON.stringify(['Crew One', 'Crew Two']);
  log.data.departurePort = 'RIMOUSKI';
  log.data.departurePortCodeId = '22648';
  log.data.portLanded = 'RIMOUSKI';
  log.data.portLandedCodeId = '22648';
  log.data.soakDuration = '2';
  log.data.baitEntries = JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]);
  log.data.gpsLat = '48.4488';
  log.data.gpsLng = '-68.5236';
  log.data.gpsSrc = 'gps';
  log.data.useCrInd = 'Y';
  log.data.carrierVrn = '106460';
  log.data.prtnshpId = '39468';
  log.data.transferYes = 'true';
  log.data.transferTime = '15:00';
  log.data.transferWt = '50';
  log.data.transferToVrn = '106461';   // reserved QC vessel, Test_values p.1 line 66
  return closeAllGroups(log);
}

/** A region where the whole TRANSFER data group is Blocked, carrying every source key set —
 *  the blocked direction must ignore all of them. */
function nonQcLogWithTransferKeys(subformId: number, regId: number): any {
  const log = baseLog(subformId, regId);
  log.data.fmaId = subformId === 89 ? '1526' : subformId === 90 ? '28599' : '2071';
  log.data.portLanded = 'ABOITEAU';
  log.data.portLandedCodeId = '19322';
  log.data.soakDuration = '2';
  log.data.baitEntries = JSON.stringify([{ type: 'Squid, Illex', lbs: '100' }]);
  log.data.gpsLat = '46.2412';
  log.data.gpsLng = '-64.5433';
  log.data.gpsSrc = 'manual';
  log.data.transferYes = 'true';
  log.data.transferTime = '15:00';
  log.data.transferWt = '50';
  log.data.transferFromVrn = '106461';
  log.data.transferFromVname = 'Le Vent du Nord';
  log.data.transferFromPndNum = 'P42';
  log.data.transferToVname = 'Miss Sarah';
  return closeAllGroups(log);
}

const has = (xml: string, el: string): boolean => xml.includes(`<${el}>`);
const valueOf = (xml: string, el: string): string | null => {
  const m = xml.match(new RegExp(`<${el}>([^<]*)</${el}>`));
  return m ? m[1] : null;
};
const rule251Errors = (errors: string[]): string[] => errors.filter(e => e.includes('Rule 251'));

// ══════════════════════════════════════════════════════════════════════════════════════════
// GROUP A — R1: the app stops declaring a source on the harvester's behalf
// ══════════════════════════════════════════════════════════════════════════════════════════

describe('A — FROM_VRN is no longer auto-filled from the profile (S154D R1)', () => {
  test('A1 a QC transfer with no source typed emits NO <FROM_VRN> — the profile VRN stays out of it', () => {
    const xml = generateElogXml(qcTransferLog(), profile);
    expect(xml).toContain('<TRANSFER>');            // the node itself is unaffected
    expect(has(xml, 'FROM_VRN')).toBe(false);
    expect(xml).not.toContain('<FROM_VRN>123456</FROM_VRN>');
  });

  test('A2 …and that document is REFUSED under Rule 251, rather than silently invented into compliance', () => {
    const xml = generateElogXml(qcTransferLog(), profile);
    const { valid, errors } = validateElogXml(xml, 88);
    expect(rule251Errors(errors).length).toBe(1);
    expect(valid).toBe(false);
  });

  test('A3 the destination half is untouched by R1 — TO_VRN still emits what he typed', () => {
    const xml = generateElogXml(qcTransferLog(), profile);
    expect(valueOf(xml, 'TO_VRN')).toBe('106461');
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// GROUP B — the FROM pair emits exactly what he typed, and satisfies Rule 251
// ══════════════════════════════════════════════════════════════════════════════════════════

describe('B — the FROM pair (Rule 251: exactly one)', () => {
  test('B1 a typed source VRN emits <FROM_VRN>, omits <FROM_PND_NUM>, and the document validates', () => {
    const log = qcTransferLog();
    log.data.transferFromVrn = '106461';
    const xml = generateElogXml(log, profile);
    expect(valueOf(xml, 'FROM_VRN')).toBe('106461');
    expect(has(xml, 'FROM_PND_NUM')).toBe(false);
    const { valid, errors } = validateElogXml(xml, 88);
    expect(rule251Errors(errors)).toEqual([]);
    expect(valid).toBe(true);
  });

  test('B2 a typed source pond emits <FROM_PND_NUM>, omits <FROM_VRN>, and the document validates', () => {
    const log = qcTransferLog();
    log.data.transferFromPndNum = 'P42';
    const xml = generateElogXml(log, profile);
    expect(valueOf(xml, 'FROM_PND_NUM')).toBe('P42');
    expect(has(xml, 'FROM_VRN')).toBe(false);
    const { valid, errors } = validateElogXml(xml, 88);
    expect(rule251Errors(errors)).toEqual([]);
    expect(valid).toBe(true);
  });

  test('B3 both stored: exactly ONE element reaches the wire — mirroring the shipped TO pair (R2)', () => {
    // The card clears one box when the other is typed, so "both" is unreachable through the
    // UI. If storage ever holds both anyway, the emit must behave like the TO pair already
    // does at dfoXmlGenerator.ts:577-578 (pond wins) — one element, sendable document —
    // rather than producing a file DFO will refuse.
    const log = qcTransferLog();
    log.data.transferFromVrn = '106461';
    log.data.transferFromPndNum = 'P42';
    const xml = generateElogXml(log, profile);
    const bothPresent = Number(has(xml, 'FROM_VRN')) + Number(has(xml, 'FROM_PND_NUM'));
    expect(bothPresent).toBe(1);
    expect(valueOf(xml, 'FROM_PND_NUM')).toBe('P42');
    expect(validateElogXml(xml, 88).valid).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// GROUP C — the zero/blank behaviour (DFO's "Write 0", and minLength=1)
// ══════════════════════════════════════════════════════════════════════════════════════════

describe('C — a typed zero goes, a blank does not', () => {
  test('C1 a pond with no number is the literal "0" and it EMITS (dictionary:767 "Write 0")', () => {
    const log = qcTransferLog();
    log.data.transferFromPndNum = '0';
    const xml = generateElogXml(log, profile);
    expect(xml).toContain('<FROM_PND_NUM>0</FROM_PND_NUM>');
    // "0" is a value, so Rule 251 is satisfied by it
    expect(rule251Errors(validateElogXml(xml, 88).errors)).toEqual([]);
  });

  test('C2 blank and whitespace-only values emit NO element at all (XSD string minLength=1)', () => {
    const log = qcTransferLog();
    log.data.transferFromVrn = '';
    log.data.transferFromVname = '   ';
    log.data.transferFromPndNum = '';
    log.data.transferToVname = '';
    const xml = generateElogXml(log, profile);
    expect(has(xml, 'FROM_VRN')).toBe(false);
    expect(has(xml, 'FROM_VNAME')).toBe(false);
    expect(has(xml, 'FROM_PND_NUM')).toBe(false);
    expect(has(xml, 'TO_VNAME')).toBe(false);
    expect(xml).not.toContain('<FROM_VNAME></FROM_VNAME>');
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// GROUP D — the two vessel names, and the XSD sequence they sit inside
// ══════════════════════════════════════════════════════════════════════════════════════════

describe('D — FROM_VNAME / TO_VNAME and element order', () => {
  test('D1 both names emit their text verbatim, accents and apostrophes intact', () => {
    const log = qcTransferLog();
    log.data.transferFromVrn = '106461';
    log.data.transferFromVname = "Le Vent du Nord";
    log.data.transferToVname = "L'Étoile de Gaspé";
    const xml = generateElogXml(log, profile);
    expect(valueOf(xml, 'FROM_VNAME')).toBe('Le Vent du Nord');
    expect(valueOf(xml, 'TO_VNAME')).toBe('L&apos;Étoile de Gaspé');
    expect(validateElogXml(xml, 88).valid).toBe(true);
  });

  test('D2 the six elements sit in XSD sequence order — the name BETWEEN its pair members', () => {
    // The one arrangement that can go wrong: FROM_VNAME must come after FROM_VRN and before
    // FROM_PND_NUM, and TO_VNAME after TO_VRN and before TO_PND_NUM. Emitting the pond before
    // the name produces an out-of-order document the strict sequence walker will refuse.
    const log = qcTransferLog();
    log.data.transferFromVrn = '106461';
    log.data.transferFromVname = 'Source Boat';
    log.data.transferToVname = 'Dest Boat';
    delete log.data.transferToVrn;
    log.data.transferToPndNum = 'P99';
    const xml = generateElogXml(log, profile);

    // ⚠ Offsets are taken INSIDE the <TRANSFER> block, not across the whole document.
    // The first version of this test used whole-document indexOf and failed on
    // DG_CLOSE_DT — which appears in BAIT_USED, EFFORT, LANDING and TRANSFER, so it was
    // comparing the transfer's element order against BAIT_USED's close stamp at offset 677.
    // The generator was right and the test was wrong; it was rewritten rather than shipped.
    const block = xml.slice(xml.indexOf('<TRANSFER>'), xml.indexOf('</TRANSFER>'));
    const at = (el: string) => block.indexOf(`<${el}>`);
    expect(at('TRNSF_DT')).toBeGreaterThan(-1);
    expect(at('FROM_VRN')).toBeGreaterThan(at('TRNSF_DT'));
    expect(at('FROM_VNAME')).toBeGreaterThan(at('FROM_VRN'));
    expect(at('TO_VNAME')).toBeGreaterThan(at('FROM_VNAME'));
    expect(at('TO_PND_NUM')).toBeGreaterThan(at('TO_VNAME'));
    expect(at('DG_CLOSE_DT')).toBeGreaterThan(at('TO_PND_NUM'));
    expect(at('TRANSFER_DTL')).toBeGreaterThan(at('DG_CLOSE_DT'));

    const { valid, errors } = validateElogXml(xml, 88);
    expect(errors.filter(e => e.includes('out-of-order'))).toEqual([]);
    expect(valid).toBe(true);
  });

  test('D4 the length cap measures the DECODED name — apostrophes must not cost 5 characters each', () => {
    // The validator's parser (dfoXmlGenerator.ts:617) stores element text exactly as it sits
    // on the wire, so  L'Étoile  is held as  L&apos;Étoile . A cap that measured the escaped
    // form would refuse a legal 50-character name carrying three apostrophes — 15 characters
    // of budget spent on punctuation the harvester cannot see. This is the case the plain
    // 'A'-string tests in group F cannot reach.
    const name = "L'Anse-à-l'Ourse dit l'Étoile du Nord & Fils";  // 44 chars decoded
    expect(name.length).toBeLessThanOrEqual(50);
    const log = qcTransferLog();
    log.data.transferFromVrn = '106461';
    log.data.transferFromVname = name;
    const xml = generateElogXml(log, profile);
    // On the wire it is longer than 50 once escaped — that must NOT be what is measured.
    expect(valueOf(xml, 'FROM_VNAME')!.length).toBeGreaterThan(50);
    expect(validateElogXml(xml, 88).valid).toBe(true);
  });

  test('D3 a name alone does not satisfy Rule 251 — a name is not an identifier', () => {
    const log = qcTransferLog();
    log.data.transferFromVname = 'Source Boat';   // name only, no VRN, no pond
    const xml = generateElogXml(log, profile);
    expect(valueOf(xml, 'FROM_VNAME')).toBe('Source Boat');
    expect(rule251Errors(validateElogXml(xml, 88).errors).length).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// GROUP E — the blocked direction (rows 106/107/108/111: Blocked on 89, 90, 91)
// ══════════════════════════════════════════════════════════════════════════════════════════

describe('E — blocked outside Quebec', () => {
  test.each([[89, 1014], [90, 1004], [91, 1002]])(
    'E%# subform %s emits no TRANSFER node and none of the four source elements, even with all keys stored',
    (sf, reg) => {
      const xml = generateElogXml(nonQcLogWithTransferKeys(sf as number, reg as number), profile);
      expect(xml).not.toContain('<TRANSFER>');
      expect(has(xml, 'FROM_VRN')).toBe(false);
      expect(has(xml, 'FROM_VNAME')).toBe(false);
      expect(has(xml, 'FROM_PND_NUM')).toBe(false);
      expect(has(xml, 'TO_VNAME')).toBe(false);
    },
  );

  test('E4 an injected FROM_VNAME on a MAR-90 document is refused (TRANSFER blocked)', () => {
    const xml = generateElogXml(nonQcLogWithTransferKeys(90, 1004), profile)
      .replace('  </TRIP>',
        '    <TRANSFER>\n' +
        '      <TRNSF_DT>202606101800</TRNSF_DT>\n' +
        '      <FROM_VNAME>Injected</FROM_VNAME>\n' +
        '      <FROM_PND_NUM>P1</FROM_PND_NUM>\n' +
        '      <TO_PND_NUM>P2</TO_PND_NUM>\n' +
        '      <DG_CLOSE_DT>20260610150000</DG_CLOSE_DT>\n' +
        '      <TRANSFER_DTL>\n' +
        '        <SPECIE_ID>1312</SPECIE_ID>\n' +
        '        <SPECIE_FRM_ID>4691</SPECIE_FRM_ID>\n' +
        '        <WT>1.00</WT>\n' +
        '      </TRANSFER_DTL>\n' +
        '    </TRANSFER>\n  </TRIP>');
    const { valid, errors } = validateElogXml(xml, 90);
    expect(errors.some(e => e.includes('TRANSFER is blocked for subform 90'))).toBe(true);
    expect(valid).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// GROUP F — R4: max lengths enforced in-app, so an over-long value cannot reach DFO
// ══════════════════════════════════════════════════════════════════════════════════════════
//
// The recon found NO maxLength enforcement anywhere in the 234 validator (LEAF_CHECKS.string
// at dfoXmlGenerator.ts:652 is `v => v.length > 0`), so today a 60-character vessel name
// passes every in-app gate and bounces at DFO. R4 closes that for these fields.
//
// ⚠ R4 named three caps — 30 / 50 / 50. FROM_VRN's string_12 cap is the fourth, and it exists
// only BECAUSE of R1: the box became harvester-typed in this build, and a typed box with no
// cap is the exact defect R4 was written to close. Recorded in the gate doc as an R4
// extension that follows from R1, not as a silent widening of the ruling.

describe('F — length caps (R4)', () => {
  const overLong = (n: number) => 'A'.repeat(n);

  test('F1 a 51-character FROM_VNAME is refused (string_50)', () => {
    const log = qcTransferLog();
    log.data.transferFromVrn = '106461';
    log.data.transferFromVname = overLong(51);
    const { valid, errors } = validateElogXml(generateElogXml(log, profile), 88);
    expect(errors.some(e => e.includes('FROM_VNAME'))).toBe(true);
    expect(valid).toBe(false);
  });

  test('F2 a 51-character TO_VNAME is refused (string_50)', () => {
    const log = qcTransferLog();
    log.data.transferFromVrn = '106461';
    log.data.transferToVname = overLong(51);
    const { valid, errors } = validateElogXml(generateElogXml(log, profile), 88);
    expect(errors.some(e => e.includes('TO_VNAME'))).toBe(true);
    expect(valid).toBe(false);
  });

  test('F3 a 31-character FROM_PND_NUM is refused (string_30)', () => {
    const log = qcTransferLog();
    log.data.transferFromPndNum = overLong(31);
    const { valid, errors } = validateElogXml(generateElogXml(log, profile), 88);
    expect(errors.some(e => e.includes('FROM_PND_NUM'))).toBe(true);
    expect(valid).toBe(false);
  });

  test('F4 a 13-character FROM_VRN is refused (string_12 — the R4 extension R1 created)', () => {
    const log = qcTransferLog();
    log.data.transferFromVrn = overLong(13);
    const { valid, errors } = validateElogXml(generateElogXml(log, profile), 88);
    expect(errors.some(e => e.includes('FROM_VRN'))).toBe(true);
    expect(valid).toBe(false);
  });

  test('F5 values EXACTLY at the limit pass — the cap is inclusive, not off by one', () => {
    const log = qcTransferLog();
    log.data.transferFromVrn = overLong(12);
    log.data.transferFromVname = overLong(50);
    log.data.transferToVname = overLong(50);
    const { valid } = validateElogXml(generateElogXml(log, profile), 88);
    expect(valid).toBe(true);

    const pondLog = qcTransferLog();
    pondLog.data.transferFromPndNum = overLong(30);
    expect(validateElogXml(generateElogXml(pondLog, profile), 88).valid).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// SAMPLES FOR THE xmllint GATE — the house pattern (form222T6Fields:111, form233Rem:62)
// ══════════════════════════════════════════════════════════════════════════════════════════
//
// The app's own sequence walker is NOT the XSD, so the real gate is:
//   xmllint --noout --schema \
//     "~/Desktop/DFO/ELOG_F234/39673.234.NATIONAL - ELOG - Logbook - Lobster - JBE - \
//      Journal de bord - Homard_20260624 000000.xsd" <sample>
// Two samples because no single legal document can carry all six elements — each pair
// permits exactly one member (Rules 251/252). Between them every one of the six is exercised.

describe('samples for the xmllint gate', () => {
  const dir = process.env.CLAUDE_JOB_DIR ? `${process.env.CLAUDE_JOB_DIR}/tmp` : '/tmp';
  beforeAll(() => { fs.mkdirSync(dir, { recursive: true }); });

  test('writes the vessel-source sample (FROM_VRN + FROM_VNAME + TO_VNAME + TO_PND_NUM)', () => {
    const log = qcTransferLog();
    log.data.transferFromVrn = '106462';
    log.data.transferFromVname = 'Le Vent du Nord';
    log.data.transferToVname = "L'Étoile de Gaspé";
    delete log.data.transferToVrn;
    log.data.transferToPndNum = 'P99';
    const xml = generateElogXml(log, profile);
    fs.writeFileSync(`${dir}/sample_transfer_from_vessel.xml`, xml);
    expect(validateElogXml(xml, 88).valid).toBe(true);
  });

  test('writes the pond-source sample (FROM_PND_NUM + TO_VRN)', () => {
    const log = qcTransferLog();
    log.data.transferFromPndNum = 'P42';
    const xml = generateElogXml(log, profile);
    fs.writeFileSync(`${dir}/sample_transfer_from_pond.xml`, xml);
    expect(validateElogXml(xml, 88).valid).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// GROUP G — the requirements table: the FROM pair becomes a real pair, not documentation
// ══════════════════════════════════════════════════════════════════════════════════════════

describe('G — dfoRequirements (R2: mirror the shipped TO pair)', () => {
  const filled: FieldValues = {
    useCrInd: 'N', transferTime: '15:00', transferDate: '2026-06-10', dateFished: '2026-06-10',
    sailDate: '2026-06-10', sailTime: '05:30',
    transferWt: '50', transferToVrn: '106461', transferToPndNum: '',
  };

  test('G1 both FROM members are table entries in the transfer container, linked as a pair', () => {
    expect(fieldRequirement('transferFromVrn')?.container).toBe('transfer');
    expect(fieldRequirement('transferFromVrn')?.kind).toBe('exactly-one-of-a-pair');
    expect(fieldRequirement('transferFromVrn')?.pairWith).toBe('transferFromPndNum');
    expect(fieldRequirement('transferFromPndNum')?.container).toBe('transfer');
    expect(fieldRequirement('transferFromPndNum')?.kind).toBe('exactly-one-of-a-pair');
    expect(fieldRequirement('transferFromPndNum')?.pairWith).toBe('transferFromVrn');
  });

  test('G2 the app-supplied placeholder row is retired — the pair is real now', () => {
    expect(fieldRequirement('transferFrom')).toBeUndefined();
  });

  test('G3 both members are starred on QC and marked nowhere else', () => {
    expect(isFieldRequired('transferFromVrn', ctx(88))).toBe(true);
    expect(isFieldRequired('transferFromPndNum', ctx(88))).toBe(true);
    for (const sf of [89, 90, 91]) {
      expect(isFieldRequired('transferFromVrn', ctx(sf))).toBe(false);
      expect(isFieldRequired('transferFromPndNum', ctx(sf))).toBe(false);
    }
  });

  test('G4 the close door refuses zero of the pair, refuses both, and accepts exactly one', () => {
    const none = missingInContainer('transfer', ctx(88), filled);
    expect(none).toEqual([{
      fieldKey: 'transferFromVrn',
      labelKey: 'form234.transferFromVrnLabel',
      pairLabelKey: 'form234.transferFromPndNumLabel',
      reason: 'pair-none',
    }]);

    const both = missingInContainer('transfer', ctx(88),
      { ...filled, transferFromVrn: '106461', transferFromPndNum: 'P42' });
    expect(both.map(m => m.reason)).toEqual(['pair-both']);

    expect(missingInContainer('transfer', ctx(88), { ...filled, transferFromVrn: '106461' })).toEqual([]);
    expect(missingInContainer('transfer', ctx(88), { ...filled, transferFromPndNum: 'P42' })).toEqual([]);
  });

  test('G5 a pond number of "0" satisfies the door — it is a value, not a blank', () => {
    expect(missingInContainer('transfer', ctx(88), { ...filled, transferFromPndNum: '0' })).toEqual([]);
  });

  test('G6 the names are optional — never starred, never demanded at the door', () => {
    expect(isFieldRequired('transferFromVname', ctx(88))).toBe(false);
    expect(isFieldRequired('transferToVname', ctx(88))).toBe(false);
    expect(missingInContainer('transfer', ctx(88),
      { ...filled, transferFromVrn: '106461', transferFromVname: '', transferToVname: '' })).toEqual([]);
  });

  test('G7 the meter counts the FROM pair as ONE unit, exactly like the TO pair', () => {
    const one = containerProgress('transfer', ctx(88), { ...filled, transferFromVrn: '106461' });
    const none = containerProgress('transfer', ctx(88), filled);
    expect(one.total).toBe(none.total);            // the denominator does not depend on filling it
    expect(one.filled).toBe(none.filled + 1);      // and filling one member advances it by exactly 1

    const both = containerProgress('transfer', ctx(88),
      { ...filled, transferFromVrn: '106461', transferFromPndNum: 'P42' });
    expect(both.filled).toBe(none.filled);         // both filled is not progress — it is a refusal
  });
});
