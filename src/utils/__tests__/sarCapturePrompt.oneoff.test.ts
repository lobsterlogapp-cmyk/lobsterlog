// S138 Defect 16: pins the SAR capture-prompt contract (applySarCaptureChoice — the ONE
// shared routine behind the popup on every SAR block) plus the wire consequence:
//   Yes           → stamps date+time, captures GPS, records 'gps' ONLY on a real fix;
//   No            → touches nothing (block stays blank + 'manual' for hand entry);
//   failed fix    → must NOT claim a satellite fix ('manual', MODE="M" on the wire).
import { applySarCaptureChoice, SarBlockWriter } from '../sarCapture';
import { generateElogXml } from '../dfoXmlGenerator';
import { closeAllGroups } from './support/closeAllGroups';

// Records every write so the tests can assert both content and call order.
function makeRecorder() {
  const calls: string[] = [];
  const state: any = { date: '', time: '', lat: '', lng: '', gpsSrc: 'manual' };
  const w: SarBlockWriter = {
    setDateTime: (date, time) => { calls.push('setDateTime'); state.date = date; state.time = time; },
    setLat: (v) => { calls.push('setLat'); state.lat = v; },
    setLng: (v) => { calls.push('setLng'); state.lng = v; },
    setGpsSrc: (src) => { calls.push(`setGpsSrc:${src}`); state.gpsSrc = src; },
  };
  return { calls, state, w };
}

const stampNow = () => ({ date: '2026-08-24', time: '10:15' });

test('Yes with a good fix: stamps date+time, writes coords, records gps — in that order', async () => {
  const { calls, state, w } = makeRecorder();
  await applySarCaptureChoice(true, w, {
    stampNow,
    capture: async (setLat, setLng) => { setLat('44.1234'); setLng('-66.5432'); return true; },
  });
  expect(state).toEqual({ date: '2026-08-24', time: '10:15', lat: '44.1234', lng: '-66.5432', gpsSrc: 'gps' });
  expect(calls).toEqual(['setDateTime', 'setLat', 'setLng', 'setGpsSrc:gps']);
});

test('Yes with a FAILED fix: date+time still stamp, coords untouched, and the record does NOT claim a satellite fix', async () => {
  const { calls, state, w } = makeRecorder();
  await applySarCaptureChoice(true, w, {
    stampNow,
    capture: async () => false, // denied / timeout / bad fix — captureGps writes nothing
  });
  expect(state.date).toBe('2026-08-24');
  expect(state.time).toBe('10:15');
  expect(state.lat).toBe('');
  expect(state.lng).toBe('');
  expect(state.gpsSrc).toBe('manual');
  expect(calls).not.toContain('setGpsSrc:gps');
});

test('No: touches nothing — block stays blank and manual for hand entry', async () => {
  const { calls, state, w } = makeRecorder();
  await applySarCaptureChoice(false, w, {
    stampNow,
    capture: async () => { throw new Error('capture must not run on No'); },
  });
  expect(calls).toEqual([]);
  expect(state).toEqual({ date: '', time: '', lat: '', lng: '', gpsSrc: 'manual' });
});

// ── Wire level: 'manual' means MODE="M", 'gps' means MODE="G" — on block 1 AND block 2 ──

const profile: any = {
  operatorName: 'Test Operator',
  vesselNumber: '123456',
  fishingNumber: '300123',
  licenceHolderFin: '123456789',
  units: 'lbs',
  language: 'en',
};

function baseMar90(): any {
  return {
    id: 'sar-s138',
    dateFished: '2026-06-10',
    lgbkUid: 'ABCDEF',
    firstEntryDt: '2026-06-10T08:55:00.000Z',
    sentToDfo: false,
    subformId: 90,
    regId: 1004,
    data: {
      timeSailed: '05:30',
      timeStartedHauling: '06:00',
      timeStoppedHauling: '13:30',
      timeOfLanding: '14:45',
      crewRegistry: JSON.stringify(['Crew One']),
      catchWeight: '500',
      trapHauls: '250',
      bycatchEntries: '[]',
      personalUse: '10',
      dgClosePcons: '2026-06-10T15:00:00.000Z',
      fmaId: '28599',
      lgridCodeId: '101',
      portLandedCodeId: '20913',
      gpsLat: '44.1234', gpsLng: '-66.5432', gpsSrc: 'gps',
      nbSpcmnBrd: '3',
      baitEntries: JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]),
      mmYes: 'false',
      hlinCompany: '', hlinConfirmNo: '', hloutCompany: '', hloutConfirmNo: '',
    },
  };
}

test('hand-entered blocks emit MODE="M"; a captured block emits MODE="G"', () => {
  const log = baseMar90();
  log.data.sarYes = 'true';
  // Block 1: the popup's No path then hand entry — provenance stays manual
  log.data.sarSpecies = '10561';
  log.data.sarLat = '44.2000';
  log.data.sarLng = '-66.7000';
  log.data.sarGpsSrc = 'manual';
  log.data.sarDate = '2026-06-10';
  log.data.sarTime = '12:15';
  log.data.sarNbSpcmn = '1';
  log.data.sarCondId = '11881';
  // Block 2: the popup's Yes path with a good fix
  log.data.extraSars = JSON.stringify([{
    species: '35110', lat: '44.3000', lng: '-66.8000', gpsSrc: 'gps',
    date: '2026-06-10', time: '13:05', nbSpcmn: '2', condId: '11881',
  }]);

  const xml = generateElogXml(closeAllGroups(log), profile);
  expect(xml).toContain('<LAT MODE="M">44.2000</LAT>');
  expect(xml).toContain('<LONG MODE="M">-66.7000</LONG>');
  expect(xml).toContain('<LAT MODE="G">44.3000</LAT>');
  expect(xml).toContain('<LONG MODE="G">-66.8000</LONG>');
});
