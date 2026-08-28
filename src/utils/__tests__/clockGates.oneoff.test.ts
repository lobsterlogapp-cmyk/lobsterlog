// ONE-OFF (S147 Run 3 guard): the clock rules moved from the send button to the close doors.
//
// Rules 30 / 32 / 29 / 45 / 248 were enforced ONLY by validateElogXml — after the log was already
// `status: 'complete'`, i.e. after every used section was permanently sealed. This suite proves the
// requirements table now refuses them while the losing half is still editable, and — the case that
// catches a wrong build — that it does NOT refuse a legitimate cross-midnight trip.
//
// ⚠ The cross-midnight cases are the point of the suite. A times-only comparison ('02:00' < '23:30'
// as strings) passes every other test here and refuses real overnight trips on the water.
import { missingInContainer, containerProgress, MissingField, latestEffortEnd } from '../dfoRequirements';
import { getCompletionDetails, DfoLog } from '../dfoLogStorage';
import * as fs from 'fs';

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

// ═══ S147 RUN 4 — Rule 46 (both doors), Rule 33's close wording, and the reducer ═══════════
//
// ⚠ Rule 46 is the stranding cell. It is safe ONLY because BOTH doors ask: whichever of Landing
// and the effort is closed second is still open when it refuses. The pair of tests marked 5b is
// the proof — remove either entry and one close order seals both halves in silence.

/** An effort that ended at 13:30, with a landing at 14:45 — the clean pairing. */
const effortWithLanding = (over: Record<string, string> = {}) => effort({
  landingDate: DAY1, landingTime: '14:45', ...over,
});

const landingWithHaul = (over: Record<string, string> = {}) => landing({
  lastEffortEndDate: DAY1, lastEffortEndTime: '13:30', ...over,
});

test('Rule 46 — the clean pairing (haul ends 13:30, lands 14:45) refuses at neither door', () => {
  expect(missingInContainer('effort', MAR, effortWithLanding())).toEqual([]);
  expect(missingInContainer('landing', MAR, landingWithHaul())).toEqual([]);
});

test('Rule 46 — the LANDING door refuses a landing before the last haul ended', () => {
  const ms = missingInContainer('landing', MAR, landingWithHaul({ landingTime: '12:00' }));
  expect(detail(ms, 'landingTime')).toBe('form234.landingBeforeHaulError');
});

test('Rule 46 — the EFFORT door refuses a haul that ends after the landing', () => {
  const ms = missingInContainer('effort', MAR, effortWithLanding({ haulEndTime: '15:30' }));
  expect(detail(ms, 'haulEndTime')).toBe('form234.haulEndAfterLandingError');
});

test('5b — the SAME conflict is reported by BOTH doors, so neither close order can strand a log', () => {
  // One conflict: the haul ends 15:00, the landing is 14:45.
  const bad = { haulEndTime: '15:00', landingTime: '14:45' };
  // Closing the effort second → the effort door still open, and it refuses.
  const atEffort = missingInContainer('effort', MAR, effortWithLanding({ ...bad }));
  // Closing Landing second → the landing door still open, and it refuses.
  const atLanding = missingInContainer('landing', MAR,
    landingWithHaul({ landingTime: '14:45', lastEffortEndTime: '15:00' }));
  expect(detail(atEffort, 'haulEndTime')).toBe('form234.haulEndAfterLandingError');
  expect(detail(atLanding, 'landingTime')).toBe('form234.landingBeforeHaulError');
});

test('Rule 46 — Rule 32 is reported ahead of Rule 46 on the shared haulEndTime field', () => {
  // A haul that ends before it started AND after the landing: "ended before it started" is the
  // more fundamental error and naming the landing card would misdirect.
  const ms = missingInContainer('effort', MAR, effortWithLanding({
    haulStartTime: '16:00', haulEndTime: '15:30',
  }));
  expect(detail(ms, 'haulEndTime')).toBe('form234.haulEndOrderError');
});

test('Rule 46 — Rule 45 is reported ahead of Rule 46 on the shared landingTime field', () => {
  const ms = missingInContainer('landing', MAR,
    landingWithHaul({ landingTime: '04:00', lastEffortEndTime: '03:00' }));
  expect(detail(ms, 'landingTime')).toBe('form234.landingOrderError');
});

test('Rule 46 — a cross-midnight landing at 02:00 after a 23:00 haul end closes clean', () => {
  const ms = missingInContainer('landing', MAR, landingWithHaul({
    sailTime: '20:00',
    lastEffortEndDate: DAY1, lastEffortEndTime: '23:00',
    landingDate: DAY2, landingTime: '02:00',
  }));
  expect(ms).toEqual([]);
});

// ── row 14 — the reducer sees EVERY effort, not just the first ────────────────────────────

test('14 — latestEffortEnd picks the latest across efforts 1..n', () => {
  const last = latestEffortEnd(
    [{ haulEndDate: DAY1, haulEndTime: '10:00' },
     { haulEndDate: DAY1, haulEndTime: '15:00' },   // ← the latest
     { haulEndDate: DAY1, haulEndTime: '12:30' }],
    DAY1,
  );
  expect(last).toEqual({ date: DAY1, time: '15:00' });
});

test('14 — latestEffortEnd compares INSTANTS, so a next-day effort wins over a later clock time', () => {
  const last = latestEffortEnd(
    [{ haulEndDate: DAY1, haulEndTime: '23:00' },
     { haulEndDate: DAY2, haulEndTime: '02:00' }],  // ← later in time, earlier on the clock
    DAY1,
  );
  expect(last).toEqual({ date: DAY2, time: '02:00' });
});

test('14 — latestEffortEnd falls back to dateFished for an effort with no companion date', () => {
  expect(latestEffortEnd([{ haulEndTime: '13:30' }], DAY1)).toEqual({ date: DAY1, time: '13:30' });
});

test('14 — an unfinished effort is skipped, not treated as the latest', () => {
  const last = latestEffortEnd(
    [{ haulEndDate: DAY1, haulEndTime: '13:30' }, { haulEndDate: DAY1, haulEndTime: '' }],
    DAY1,
  );
  expect(last).toEqual({ date: DAY1, time: '13:30' });
  expect(latestEffortEnd([], DAY1)).toBeNull();
  expect(latestEffortEnd([{ haulEndTime: '' }], DAY1)).toBeNull();
});

test('14 — effort 2 ending later than effort 1 is what the landing is judged against', () => {
  // Effort 1 ends 10:00, effort 2 ends 15:00, landing 14:00. Judged against effort 1 alone this
  // would pass; against the real latest it must refuse.
  const last = latestEffortEnd(
    [{ haulEndDate: DAY1, haulEndTime: '10:00' }, { haulEndDate: DAY1, haulEndTime: '15:00' }],
    DAY1,
  );
  const ms = missingInContainer('landing', MAR, landing({
    landingTime: '14:00',
    lastEffortEndDate: last!.date, lastEffortEndTime: last!.time,
  }));
  expect(detail(ms, 'landingTime')).toBe('form234.landingBeforeHaulError');
});

// ── row 16 — Rule 33's close-door sentence must not tell him to fix it "before sending" ───

test('16 — the close-door overlap sentence does not say "before sending"', () => {
  const en = JSON.parse(fs.readFileSync('src/i18n/locales/en/dfo.json', 'utf8'));
  const fr = JSON.parse(fs.readFileSync('src/i18n/locales/fr/dfo.json', 'utf8'));
  expect(en.form234.effortOverlapBullet).not.toMatch(/before sending/i);
  expect(fr.form234.effortOverlapBullet).not.toMatch(/avant l’envoi|avant l'envoi/i);
  expect(en.form234.effortOverlapBullet).toContain('{{logId}}');
  expect(fr.form234.effortOverlapBullet).toContain('{{logId}}');
  // and the SEND sentence is untouched — BE-2 said amend for the door, not rewrite the original
  expect(en.logs.effortOverlapBody).toMatch(/before sending/i);
  expect(fr.logs.effortOverlapBody).toMatch(/avant l’envoi/i);
});

test('16 — the two Rule 46 bullets each name the OTHER card, per CG-4', () => {
  const en = JSON.parse(fs.readFileSync('src/i18n/locales/en/dfo.json', 'utf8')).form234;
  const fr = JSON.parse(fs.readFileSync('src/i18n/locales/fr/dfo.json', 'utf8')).form234;
  // the landing bullet points at Catch & Effort; the effort bullet points at Landing
  expect(en.landingBeforeHaulError).toContain(en.catchEffortSection);
  expect(en.haulEndAfterLandingError).toContain(en.landingSection);
  expect(fr.landingBeforeHaulError).toContain(fr.catchEffortSection);
  expect(fr.haulEndAfterLandingError).toContain(fr.landingSection);
  // and each quotes the other card's field label verbatim
  expect(en.landingBeforeHaulError).toContain(en.timeStoppedHaulingLabel);
  expect(en.haulEndAfterLandingError).toContain(en.timeOfLandingLabel);
  expect(fr.landingBeforeHaulError).toContain(fr.timeStoppedHaulingLabel);
  expect(fr.haulEndAfterLandingError).toContain(fr.timeOfLandingLabel);
});

// ── row 10, end to end: the METER must agree with the DOOR on Rule 46 ─────────────────────
//
// containerProgress already discounts a field its isInvalid rejects, but only if the meter is
// handed the same values the door builds. The meter's landing block is a SECOND, independent call
// site (getCompletionDetails), so a key the door has and the meter lacks reads 100% on a log the
// door refuses — a progress bar that lies. This walks the whole function, not containerProgress.

const meterLog = (data: Record<string, string>): DfoLog => ({
  id: 'LL-CLOCK-001', lgbkUid: 'ABCDEF', firstEntryDt: '2026-07-19T09:00:00Z',
  mode: 'full', status: 'draft',
  dateFished: data.dateFished ?? '2026-07-19', createdAt: 0,
  data, subformId: 90, regId: 1004,
});

/** The S141 worked example: a complete MAR-90 / LFA 34 log, which reads 100%. */
const COMPLETE_MAR: Record<string, string> = {
  dateFished: '2026-07-19', timeSailed: '05:30',
  crewRegistry: '[{"name":"A"}]', bycatchYes: 'false',
  fmaId: '1589', timeStartedHauling: '06:00', timeStoppedHauling: '13:30',
  sarYes: 'false', mmYes: 'false',
  trapHauls: '200', catchWeight: '250', lgridCodeId: '101',
  portLanded: 'Abbott’s Harbour', timeOfLanding: '14:45',
};

test('10 — the clean worked example still reads 100% (nothing here moved the baseline)', () => {
  expect(getCompletionDetails(meterLog(COMPLETE_MAR)).pct).toBe(100);
});

test('10 — a Rule 46 conflict drops the METER below 100%, not just the door', () => {
  // Landing 12:00, but the haul ran until 13:30 — the landing door refuses this.
  const bad = getCompletionDetails(meterLog({ ...COMPLETE_MAR, timeOfLanding: '12:00' }));
  const ok = getCompletionDetails(meterLog(COMPLETE_MAR));
  expect(bad.pct).toBeLessThan(100);
  expect(bad.filled).toBe(ok.filled - 1);   // exactly the landing time, nothing else
  expect(bad.total).toBe(ok.total);
});

test('10 — the meter sees efforts 2..n for Rule 46, exactly as the door does', () => {
  // Effort 1 ends 13:30 and the landing is 14:45 — fine on its own. Effort 2 ends 15:00, so the
  // real latest end is AFTER the landing. Judged against effort 1 alone this would read 100%.
  const twoEfforts = {
    ...COMPLETE_MAR,
    extraEffortNodes: JSON.stringify([{
      haulStartDate: '2026-07-19', haulStartTime: '14:00',
      haulEndDate: '2026-07-19', haulEndTime: '15:00',
      fmaId: '1589', sarYes: 'false', mmYes: 'false',
      details: [{ trapHauls: '100', catchWeight: '80', lgridCodeId: '101' }],
    }]),
  };
  expect(getCompletionDetails(meterLog(twoEfforts)).pct).toBeLessThan(100);
});

test('10 — a no-haul day is not judged against a haul end that does not exist', () => {
  const noHaul = getCompletionDetails(meterLog({
    dateFished: '2026-07-19', timeSailed: '05:30',
    crewRegistry: '[{"name":"A"}]', bycatchYes: 'false',
    effortYes: 'false',
    portLanded: 'Abbott’s Harbour', timeOfLanding: '14:45',
  }));
  expect(noHaul.pct).toBe(100);
});
