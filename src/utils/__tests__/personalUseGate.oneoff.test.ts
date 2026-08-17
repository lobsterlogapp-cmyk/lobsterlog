// ONE-OFF (Session 134 guard test): personal-use PCONS gated to MAR(90) ONLY.
// Subforms_requirements_234.xlsx row 58: PCONS.USG_ID is Blocked on QC-88/GLF-89/NL-91 and
// Mandatory on MAR-90. The app's personal-use node hardcodes <USG_ID>37822</USG_ID>, so the
// WHOLE node is withheld off-90 (S134 ruling D1) — a stored (stale) personalUse value on a
// blocked subform must neither emit (D1/D3: ignored on read, never cleared) nor count as an
// unclosed data group the harvester can no longer see or close (D2, the send-guard formula).
// The same data on MAR-90 must keep emitting the node + USG_ID and keep counting the open group.
import { generateElogXml } from '../dfoXmlGenerator';
import { unclosedUsedGroupKeys } from '../dfoLogStorage';

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

// Minimal fixture: NO bycatch, so the personal-use node is the only possible PCONS source;
// personalUse carries a value but dgClosePconsPersonal is deliberately NEVER stamped.
function makeLog(subformId: number, regId: number): any {
  return {
    id: `test-log-pu-${subformId}`,
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
      mmYes: 'false',
      sarYes: 'false',
    },
  };
}

test('a stored personalUse value emits NO USG_ID / NO PCONS and counts NO open group on 88/89/91, while MAR-90 still emits and counts both', () => {
  // Blocked subforms: node withheld, stale value not counted as an unclosed section
  for (const [sf, regId] of [[88, 1006], [89, 1014], [91, 1002]] as const) {
    const log = makeLog(sf, regId);
    const xml = generateElogXml(log, profile);
    expect(xml).not.toContain('<USG_ID>');
    expect(xml).not.toContain('<PCONS>'); // no bycatch in the fixture → no PCONS node at all
    expect(unclosedUsedGroupKeys(log)).not.toContain('dgClosePconsPersonal');
  }

  // MAR-90: same data still emits the personal-use node with its hardcoded USG_ID…
  const mar = makeLog(90, 1004);
  const xmlMar = generateElogXml(mar, profile);
  expect(xmlMar).toContain('<PCONS>');
  expect(xmlMar).toContain('<USG_ID>37822</USG_ID>');
  // …and the open (never-closed) group still trips the send guard's refusal list.
  expect(unclosedUsedGroupKeys(mar)).toContain('dgClosePconsPersonal');
});
