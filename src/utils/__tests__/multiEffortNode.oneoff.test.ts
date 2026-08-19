// ONE-OFF (Session 136, Phase 1 guard): multi-EFFORT emission (Rule 1050 / defect 23).
// ⚠ LEVELS: ExtraEffortNode = the EFFORT level (a separate haul time window). The trap
// groups one level down (ExtraEffortDetail / data.extraEffortDetails) are covered by the
// S121 multiGrid suite, whose full-document baselines remain the byte-for-byte pin proving
// a single-effort log emits identically to pre-S136.
// This suite proves: the one reader (effortsFromData) synthesizes effort 1 from the legacy
// flat keys; efforts 2+ emit their own complete <EFFORT> nodes (own window, licence, FMA,
// indicators, closure, trap groups, note fan-out per the S136 §1.2 ruling); the closure
// helpers and the send guard treat efforts per occurrence; and Rule 33 overlap is
// per-effort, within-log and licence-aware.
import { generateElogXml, validateElogXml, findEffortOverlap } from '../dfoXmlGenerator';
import {
  effortsFromData, effortsAllClosed, effortsAnyOpen, stampOpenEfforts,
  unclosedUsedGroupKeys, ExtraEffortNode,
} from '../dfoLogStorage';

const profile: any = {
  operatorName: 'Test Operator',
  vesselNumber: '123456',
  fishingNumber: '300123',
  licenceHolderFin: '123456789',
  units: 'lbs',
  language: 'en',
};

const FIXED_CLOSE = '2026-06-10T15:00:00.000Z';
const SECOND_CLOSE = '2026-06-11T16:00:00.000Z';

function marLog(): any {
  return {
    id: 'test-log-90',
    dateFished: '2026-06-10',
    lgbkUid: 'ABCDEF',
    firstEntryDt: '2026-06-10T08:55:00.000Z',
    tripNum: 7,
    sentToDfo: false,
    subformId: 90,
    regId: 1004,
    data: {
      timeSailed: '05:30',
      timeStartedHauling: '06:00',
      timeStoppedHauling: '13:30',
      timeOfLanding: '14:45',
      crewRegistry: JSON.stringify(['Crew One', 'Crew Two']),
      fmaId: '38065',
      lgridCodeId: '101',
      lgridDisplay: '101',
      catchWeight: '500',
      trapHauls: '250',
      bycatchEntries: '[]',
      personalUse: '',
      portLanded: "ABBOTT'S HARBOUR",
      portLandedCodeId: '20913',
      baitEntries: '[]',
      dgCloseEffort: FIXED_CLOSE,
      dgCloseLanding: FIXED_CLOSE,
      mmYes: 'false',
      sarYes: 'false',
    },
  };
}

const SECOND_EFFORT: ExtraEffortNode = {
  haulStartDate: '2026-06-11', haulStartTime: '07:15',
  haulEndDate: '2026-06-11', haulEndTime: '12:45',
  fmaId: '38066',
  sarYes: 'false', mmYes: 'true',
  note: 'Second window note',
  closeDt: SECOND_CLOSE,
  details: [{ lgridCodeId: '202', lgridDisplay: '202', catchWeight: '300', trapHauls: '120' }],
};

function twoEffortLog(overrides: Partial<ExtraEffortNode> = {}): any {
  const log = marLog();
  log.data.extraEffortNodes = JSON.stringify([{ ...SECOND_EFFORT, ...overrides }]);
  // The trip lands after its LAST effort (Rule 46) — day 2, after effort 2's window.
  log.data.landingDate = '2026-06-11';
  return log;
}

const count = (xml: string, frag: string): number => xml.split(frag).length - 1;

// ── the one reader ─────────────────────────────────────────────────────────────────────

test('effortsFromData synthesizes effort 1 from the legacy flat keys', () => {
  const efforts = effortsFromData(marLog().data);
  expect(efforts).toHaveLength(1);
  expect(efforts[0].fmaId).toBe('38065');
  expect(efforts[0].haulStartTime).toBe('06:00');
  expect(efforts[0].closeDt).toBe(FIXED_CLOSE);
  expect(efforts[0].licNo).toBeUndefined();
  expect(efforts[0].details).toHaveLength(1);
  expect(efforts[0].details?.[0].lgridCodeId).toBe('101');
});

test('effortsFromData appends efforts 2+ with their own trap groups', () => {
  const efforts = effortsFromData(twoEffortLog().data);
  expect(efforts).toHaveLength(2);
  expect(efforts[1].fmaId).toBe('38066');
  expect(efforts[1].details).toHaveLength(1);
  expect(efforts[1].details?.[0].lgridCodeId).toBe('202');
});

// ── emit ───────────────────────────────────────────────────────────────────────────────

test('a second effort emits its own complete EFFORT node after effort 1', () => {
  const xml = generateElogXml(twoEffortLog(), profile);
  expect(count(xml, '<EFFORT>')).toBe(2);
  expect(count(xml, '</EFFORT>')).toBe(2);
  // Each effort carries its own mandatory scalars
  expect(count(xml, '<SAR_IND>')).toBe(2);
  expect(count(xml, '<MM_INTER_IND>')).toBe(2);
  expect(count(xml, '<TGT_SPECIES>')).toBe(2);
  expect(count(xml, '<GEAR_ID>925</GEAR_ID>')).toBe(2);
  // Effort 2's own values, in the second node (after effort 1's)
  expect(xml.indexOf('<FMA_ID>38066</FMA_ID>')).toBeGreaterThan(xml.indexOf('<FMA_ID>38065</FMA_ID>'));
  expect(xml).toContain('<MM_INTER_IND>Y</MM_INTER_IND>'); // effort 2 answered Yes
  expect(xml).toContain('<DG_CLOSE_DT>20260611160000</DG_CLOSE_DT>'); // effort 2's own close
  expect(xml).toContain('<LGRID_ID>202</LGRID_ID>'); // effort 2's own trap group
  // Each effort's trap groups restart GEAR_GRP_NUM at 1 (Rule 609x: sequential per EFFORT)
  expect(count(xml, '<GEAR_GRP_NUM>1</GEAR_GRP_NUM>')).toBe(2);
});

test("effort 2's note fans out to all four slots (S136 §1.2 ruling)", () => {
  const xml = generateElogXml(twoEffortLog(), profile);
  // EFFORT.REM + EFFORT_BY_GEAR.REM + EFFORT_DETAIL.REM + CATCH.REM
  expect(count(xml, '<REM>Second window note</REM>')).toBe(4);
});

test('LIC_NO: effort 2 uses its own licence when set, the profile licence otherwise', () => {
  const withOwn = generateElogXml(twoEffortLog({ licNo: '400999' }), profile);
  expect(count(withOwn, '<LIC_NO>300123</LIC_NO>')).toBe(1); // effort 1 = profile
  expect(count(withOwn, '<LIC_NO>400999</LIC_NO>')).toBe(1); // effort 2 = its own
  const fallback = generateElogXml(twoEffortLog(), profile);
  expect(count(fallback, '<LIC_NO>300123</LIC_NO>')).toBe(2); // both = profile
});

test('a two-effort document passes the structural validator', () => {
  const result = validateElogXml(generateElogXml(twoEffortLog(), profile), 90);
  expect(result.errors).toEqual([]);
  expect(result.valid).toBe(true);
});

test('an empty extraEffortNodes key changes nothing (additive reader)', () => {
  const plain = generateElogXml(marLog(), profile);
  const withEmpty = marLog();
  withEmpty.data.extraEffortNodes = '[]';
  expect(generateElogXml(withEmpty, profile)).toBe(plain);
  expect(count(plain, '<EFFORT>')).toBe(1);
});

test('a no-haul day emits zero EFFORT nodes even with a stale extraEffortNodes', () => {
  const log = twoEffortLog();
  log.data.effortYes = 'false';
  const xml = generateElogXml(log, profile);
  expect(count(xml, '<EFFORT>')).toBe(0);
});

// ── closure helpers + send guard ───────────────────────────────────────────────────────

test('effortsAllClosed / effortsAnyOpen judge every effort, not just effort 1', () => {
  const closed = twoEffortLog().data;
  expect(effortsAllClosed(closed)).toBe(true);
  expect(effortsAnyOpen(closed)).toBe(false);
  const open2 = twoEffortLog({ closeDt: undefined }).data;
  expect(effortsAllClosed(open2)).toBe(false);
  expect(effortsAnyOpen(open2)).toBe(true);
});

test('stampOpenEfforts stamps only open efforts, never restamps', () => {
  const { dgCloseEffort, extraEffortNodes } = stampOpenEfforts(
    FIXED_CLOSE,
    JSON.stringify([{ ...SECOND_EFFORT, closeDt: undefined }]),
    SECOND_CLOSE,
  );
  expect(dgCloseEffort).toBe(FIXED_CLOSE); // already closed — untouched
  const nodes = JSON.parse(extraEffortNodes);
  expect(nodes[0].closeDt).toBe(SECOND_CLOSE); // open — stamped
});

test('the send guard refuses while any effort is open, even with dgCloseEffort set', () => {
  const open2 = twoEffortLog({ closeDt: undefined });
  expect(unclosedUsedGroupKeys(open2)).toContain('dgCloseEffort');
  const allClosed = twoEffortLog();
  expect(unclosedUsedGroupKeys(allClosed)).not.toContain('dgCloseEffort');
});

// ── Rule 33 overlap: per-effort, within-log, licence-aware ─────────────────────────────

test('findEffortOverlap flags two overlapping efforts in the SAME log', () => {
  const log = twoEffortLog({
    haulStartDate: '2026-06-10', haulStartTime: '10:00',
    haulEndDate: '2026-06-10', haulEndTime: '15:00', // overlaps effort 1 (06:00–13:30)
  });
  expect(findEffortOverlap(log, [log])).toBe(log.id);
});

test('findEffortOverlap accepts non-overlapping efforts in the same log', () => {
  expect(findEffortOverlap(twoEffortLog(), [twoEffortLog()])).toBeNull(); // day 2 window
});

test('findEffortOverlap ignores an overlap under a DIFFERENT licence (Rule 33)', () => {
  const log = twoEffortLog({
    licNo: '400999',
    haulStartDate: '2026-06-10', haulStartTime: '10:00',
    haulEndDate: '2026-06-10', haulEndTime: '15:00',
  });
  expect(findEffortOverlap(log, [log])).toBeNull();
});

test('findEffortOverlap still catches the legacy cross-log overlap', () => {
  const a = marLog();
  const b = marLog();
  b.id = 'test-log-90-b';
  b.data.timeStartedHauling = '12:00';
  b.data.timeStoppedHauling = '16:00'; // overlaps a's 06:00–13:30
  expect(findEffortOverlap(b, [a, b])).toBe(a.id);
});
