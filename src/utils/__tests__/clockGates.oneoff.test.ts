// ONE-OFF (S147 Run 3 guard): the clock rules moved from the send button to the close doors.
//
// Rules 30 / 32 / 29 / 45 / 248 were enforced ONLY by validateElogXml — after the log was already
// `status: 'complete'`, i.e. after every used section was permanently sealed. This suite proves the
// requirements table now refuses them while the losing half is still editable, and — the case that
// catches a wrong build — that it does NOT refuse a legitimate cross-midnight trip.
//
// ⚠ The cross-midnight cases are the point of the suite. A times-only comparison ('02:00' < '23:30'
// as strings) passes every other test here and refuses real overnight trips on the water.
import { missingInContainer, containerProgress, MissingField } from '../dfoRequirements';

const QC = { subformId: 88, fmaId: 25640 };   // QC-88: the only subform with TRANSFER
const MAR = { subformId: 90, fmaId: 38065 };

// Fixed past dates — Rule 30 compares against the real clock, so fixtures must sit in the past.
const DAY1 = '2026-06-10';
const DAY2 = '2026-06-11';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysFromNow = (n: number) => iso(new Date(Date.now() + n * 86400000));

const detail = (ms: MissingField[], fieldKey: string) =>
  ms.find(m => m.fieldKey === fieldKey && m.reason === 'invalid')?.detailKey;

/** A complete, clean effort: sailed 05:30, hauled 06:00-13:30, all on day 1. */
const effort = (over: Record<string, string> = {}) => ({
  fmaId: '38065', sarInd: 'N', mmInterInd: 'N',
  catchWeight: '500', trapHauls: '250', lgridCodeId: '101',
  dateFished: DAY1,
  sailDate: DAY1, sailTime: '05:30',
  haulStartDate: DAY1, haulStartTime: '06:00',
  haulEndDate: DAY1, haulEndTime: '13:30',
  ...over,
});

const landing = (over: Record<string, string> = {}) => ({
  portId: 'ABBOTT’S HARBOUR',
  dateFished: DAY1,
  sailDate: DAY1, sailTime: '05:30',
  landingDate: DAY1, landingTime: '14:45',
  ...over,
});

const transfer = (over: Record<string, string> = {}) => ({
  transferWt: '50', transferToVrn: '106461', useCrInd: 'N',
  dateFished: DAY1,
  sailDate: DAY1, sailTime: '05:30',
  transferDate: DAY1, transferTime: '15:00',
  ...over,
});

// ── the clean baseline: nothing here may refuse ──────────────────────────────────────────

test('a clean same-day trip refuses nothing at any of the three doors', () => {
  expect(missingInContainer('effort', MAR, effort())).toEqual([]);
  expect(missingInContainer('landing', MAR, landing())).toEqual([]);
  expect(missingInContainer('transfer', QC, transfer())).toEqual([]);
});

// ── ⚠ THE CROSS-MIDNIGHT CASES — a times-only comparison fails every one of these ────────

test('Rule 32 — a haul that runs 23:30 to 02:00 the NEXT day closes clean', () => {
  const ms = missingInContainer('effort', MAR, effort({
    sailTime: '23:00',
    haulStartDate: DAY1, haulStartTime: '23:30',
    haulEndDate: DAY2, haulEndTime: '02:00',
  }));
  expect(ms).toEqual([]);
});

test('Rule 45 — landing at 02:00 the NEXT day, after a 23:30 sail, closes clean', () => {
  const ms = missingInContainer('landing', MAR, landing({
    sailTime: '23:30',
    landingDate: DAY2, landingTime: '02:00',
  }));
  expect(ms).toEqual([]);
});

test('Rule 248 — a QC transfer at 02:00 the NEXT day, after a 23:30 sail, closes clean', () => {
  const ms = missingInContainer('transfer', QC, transfer({
    sailTime: '23:30',
    transferDate: DAY2, transferTime: '02:00',
  }));
  expect(ms).toEqual([]);
});

// ── Rule 30 — haul start must not be in the future ───────────────────────────────────────

test('Rule 30 — a haul start two days from now is refused, and says so', () => {
  const future = daysFromNow(2);
  const ms = missingInContainer('effort', MAR, effort({
    dateFished: future, sailDate: future, haulStartDate: future, haulEndDate: future,
  }));
  expect(detail(ms, 'haulStartTime')).toBe('form234.haulStartFutureError');
});

test('Rule 30 — "in the future" is reported ahead of "before the sail" on the same field', () => {
  // Both rules live on haulStartTime. A haul stamped next month with a sail time after it is a
  // wrong DATE, not an ordering problem — naming the sail time would send him to the wrong card.
  const future = daysFromNow(2);
  const ms = missingInContainer('effort', MAR, effort({
    dateFished: future, sailDate: future, sailTime: '23:00',
    haulStartDate: future, haulStartTime: '06:00',
    haulEndDate: future, haulEndTime: '13:30',
  }));
  expect(detail(ms, 'haulStartTime')).toBe('form234.haulStartFutureError');
});

// ── Rule 32 — the haul cannot end before it started ──────────────────────────────────────

test('Rule 32 — haul stop before haul start is refused at the effort door', () => {
  const ms = missingInContainer('effort', MAR, effort({ haulEndTime: '05:00' }));
  expect(detail(ms, 'haulEndTime')).toBe('form234.haulEndOrderError');
});

// ── Rule 29 — the haul cannot start before the boat sailed ───────────────────────────────

test('Rule 29 — haul start before the sail is refused, naming the trip half', () => {
  const ms = missingInContainer('effort', MAR, effort({ sailTime: '07:00' }));
  expect(detail(ms, 'haulStartTime')).toBe('form234.haulStartOrderError');
});

// ── Rule 45 — the landing cannot precede the trip start ──────────────────────────────────

test('Rule 45 — landing before the sail is refused at the landing door', () => {
  const ms = missingInContainer('landing', MAR, landing({ landingTime: '04:00' }));
  expect(detail(ms, 'landingTime')).toBe('form234.landingOrderError');
});

// ── Rule 248 — the transfer cannot precede the trip start (QC 88) ────────────────────────

test('Rule 248 — a transfer before the sail is refused at the transfer door', () => {
  const ms = missingInContainer('transfer', QC, transfer({ transferTime: '04:00' }));
  expect(detail(ms, 'transferTime')).toBe('form234.transferOrderError');
});

// ── CG-8 — silence when a comparison cannot be made ──────────────────────────────────────

test('CG-8 — no sail time yet: the haul comparison is simply not made', () => {
  const ms = missingInContainer('effort', MAR, effort({ sailTime: '', sailDate: '' }));
  expect(ms).toEqual([]); // NOT a complaint about a field the harvester has not reached
});

test('CG-8 — a blank haul start is reported as blank, never as a clock conflict', () => {
  const ms = missingInContainer('effort', MAR, effort({ haulStartTime: '' }));
  const m = ms.find(x => x.fieldKey === 'haulStartTime');
  expect(m?.reason).toBe('blank');
  expect(m?.detailKey).toBeUndefined();
});

test('CG-8 — no dates at all (the pre-S147 fixture shape) still refuses nothing', () => {
  // Every close-gate suite written before S147 passes times with no dates. CG-2/CG-8 say a
  // comparison that cannot be made is not made — this is why those suites stayed green.
  const ms = missingInContainer('effort', MAR, {
    fmaId: '38065', sarInd: 'N', mmInterInd: 'N',
    catchWeight: '500', trapHauls: '250', lgridCodeId: '101',
    haulStartTime: '06:00', haulEndTime: '13:30',
  });
  expect(ms).toEqual([]);
});

// ── the meter cannot disagree with the door (verify row 10) ──────────────────────────────

test('the completion meter does not count a time the door would refuse', () => {
  const clean = containerProgress('effort', MAR, effort());
  const conflicted = containerProgress('effort', MAR, effort({ haulEndTime: '05:00' }));
  expect(clean.filled).toBe(clean.total);            // 100% on a closeable effort
  expect(conflicted.filled).toBe(clean.filled - 1);  // one short on a refusable one
  expect(conflicted.filled).toBeLessThan(conflicted.total);
});

// ── the container fence: a door that owns no half of a comparison asks nothing new ───────

test('CG-2 in practice — a bait row close cannot surface a clock conflict', () => {
  // The reading recorded in the gate doc: "every door" means every door that owns half of a
  // comparison. It holds by construction — missingInContainer filters to ONE container, so a
  // bait row can never see an effort or landing entry however wrong the times are.
  const ms = missingInContainer('baitRow', MAR, {
    type: 'Mackerel, Atlantic', lbs: '100', baitTypeCodeId: '1315', condition: '1',
    // a deliberately broken clock riding in the same bag:
    dateFished: DAY1, sailDate: DAY1, sailTime: '23:00',
    haulStartDate: DAY1, haulStartTime: '06:00',
  });
  expect(ms.every(m => m.fieldKey !== 'haulStartTime')).toBe(true);
});
