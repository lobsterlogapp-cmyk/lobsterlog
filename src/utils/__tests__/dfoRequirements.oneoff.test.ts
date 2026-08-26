// S140 P1 — the shared DFO required-field table's own suite (dfoRequirements.ts).
// Four concerns, per the ruled design (DESIGN_S139 B4 row P1):
//   A. GOLDEN — the table reproduces today's correct behaviour (per-subform answers,
//      FMA gates, the absorbed baitConditionState formula, requiredGroups).
//   B. TIER 1 — the seven "no door is safe" fields (RECON_S139B A2) each get the answer
//      the old layers missed.
//   C. VALUE CHECKS — the fixed P1 list: send-validator ranges/formats only, nothing new.
//   D. AGREEMENT — the table cross-checked against the independent send validators
//      (validateElogXml / validateForm222Xml / validateForm233Xml) so the two sources
//      cannot drift apart unnoticed; the validator's KNOWN deferred gaps (ruling 5:
//      settlement grid, kept weight, hail presence; ruling 3's five 222 inputs) are
//      asserted AS gaps — if a future session closes one, a test here fires on purpose.
// Fixtures mirror latLongPerRegion.oneoff.test.ts (proven valid:true per subform).

import {
  DFO_REQUIREMENTS_TABLE,
  fieldRequirement,
  isFieldRequired,
  missingInContainer,
  requiredGroups,
  RequirementContext,
} from '../dfoRequirements';
import { DFO_SUBFORM_FIELD_CONFIG } from '../dfoConstants';
import { generateElogXml, validateElogXml } from '../dfoXmlGenerator';
import { generateForm222Xml, validateForm222Xml } from '../dfoForm222Generator';
import { generateForm233Xml, validateForm233Xml } from '../dfoForm233Generator';
import { closeAllGroups } from './support/closeAllGroups';

const profile: any = {
  operatorName: 'Test Operator',
  vesselNumber: '123456',
  dfoLicenceNo: '300123',
  dfoFin: '123456789',
  fishingNumber: '300123',
  licenceHolderFin: '123456789',
  regId: 1004,
  units: 'lbs',
  language: 'en',
};

const ctx = (subformId: number, fmaId?: number, effortFmaIds?: number[]): RequirementContext =>
  ({ subformId, fmaId, effortFmaIds });

// ─── 234 fixtures (same overrides as latLongPerRegion / genSampleAllSubforms) ───

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
      lostGearYes: 'false',
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
    log.data.fmaId = '25640'; // LFA 17b — grid blocked (Rule 1011), not a NB_VNTCH FMA
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
    log.data.transferToVrn = '106461';
    return log;
  }
  if (subformId === 89) {
    const log = baseLog(89, 1014);
    log.data.fmaId = '1526'; // LFA 15
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
    log.data.fmaId = '28599'; // 38b
    log.data.portLanded = "ABBOTT'S HARBOUR";
    log.data.portLandedCodeId = '20913';
    log.data.crewRegistry = JSON.stringify(['Crew One', 'Crew Two']);
    log.data.lgridCodeId = '101';
    log.data.gpsLat = '44.1234';
    log.data.gpsLng = '-66.5432';
    log.data.gpsSrc = 'gps';
    log.data.nbSpcmnBrd = '3';
    log.data.baitEntries = JSON.stringify([{ type: 'Mackerel, Atlantic', lbs: '100' }]);
    return log;
  }
  const log = baseLog(91, 1002);
  log.data.fmaId = '2071'; // LFA 01 — outside the Rule-621 stat-sect set
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

const gen = (log: any) => generateElogXml(closeAllGroups(log), profile);

// ════════════════════════════════════════════════════════════════════════════
// A. GOLDEN — today's correct behaviour, reproduced by the table
// ════════════════════════════════════════════════════════════════════════════

describe('golden: per-subform answers', () => {
  test('soak duration: mandatory 88/89/91, blocked on MAR 90 (row 81)', () => {
    expect(isFieldRequired('soakDuration', ctx(88))).toBe(true);
    expect(isFieldRequired('soakDuration', ctx(89))).toBe(true);
    expect(isFieldRequired('soakDuration', ctx(91))).toBe(true);
    expect(isFieldRequired('soakDuration', ctx(90))).toBe(false);
    expect(fieldRequirement('soakDuration')!.state(ctx(90), {})).toBe('blocked');
  });

  test('NL-only trio: trap size / gear subtype (rows 79/75) on 91 only', () => {
    for (const f of ['trapSize', 'gearSubtypeId']) {
      expect(isFieldRequired(f, ctx(91))).toBe(true);
      for (const sf of [88, 89, 90]) expect(isFieldRequired(f, ctx(sf))).toBe(false);
    }
  });

  test('departure port (row 19): 88/91 mandatory, 89/90 blocked', () => {
    expect(isFieldRequired('departurePort', ctx(88))).toBe(true);
    expect(isFieldRequired('departurePort', ctx(91))).toBe(true);
    expect(isFieldRequired('departurePort', ctx(89))).toBe(false);
    expect(isFieldRequired('departurePort', ctx(90))).toBe(false);
  });

  test('crew (row 18): 88/90 mandatory, 89/91 blocked', () => {
    expect(isFieldRequired('crewNb', ctx(88))).toBe(true);
    expect(isFieldRequired('crewNb', ctx(90))).toBe(true);
    expect(isFieldRequired('crewNb', ctx(89))).toBe(false);
    expect(isFieldRequired('crewNb', ctx(91))).toBe(false);
  });

  test('hail members: MAR-only (rows 42/43/49/50); ETA/weight need a 38b effort (Rules 660/661)', () => {
    for (const f of ['hlinCompany', 'hlinConfirmNo']) {
      expect(isFieldRequired(f, ctx(90), {}, 'hlin')).toBe(true);
      expect(isFieldRequired(f, ctx(88), {}, 'hlin')).toBe(false);
    }
    expect(isFieldRequired('hlinEta', ctx(90, undefined, [28599]))).toBe(true);
    expect(isFieldRequired('hlinEta', ctx(90, undefined, [1589]))).toBe(false);
    expect(isFieldRequired('hlinTotalWeight', ctx(90, undefined, [28599]))).toBe(true);
    expect(isFieldRequired('hlinTotalWeight', ctx(90, undefined, [1589]))).toBe(false);
  });

  test('bait condition absorbs baitConditionState unchanged (Rules 984 vs 3060, opposite directions)', () => {
    const cond = fieldRequirement('condition', 'baitRow')!;
    // QC/GLF: mandatory only for herring (3392) / mackerel (1315), else blocked
    expect(cond.state(ctx(88), { baitTypeCodeId: '3392' })).toBe('mandatory');
    expect(cond.state(ctx(89), { baitTypeCodeId: '1315' })).toBe('mandatory');
    expect(cond.state(ctx(88), { baitTypeCodeId: '814' })).toBe('blocked');
    // MAR: blocked only for refuse/electronic/synthetic, else mandatory
    expect(cond.state(ctx(90), { baitTypeCodeId: '38503' })).toBe('blocked');
    expect(cond.state(ctx(90), { baitTypeCodeId: '1315' })).toBe('mandatory');
    // NL: blocked outright (row 27)
    expect(cond.state(ctx(91), { baitTypeCodeId: '1315' })).toBe('blocked');
  });

  test('answered kind: the indicators need Y or N, and a blank is never an answer (Rule 602)', () => {
    const missing = missingInContainer('effort', ctx(90, 28599), {
      fmaId: '28599', haulStartTime: '06:00', haulEndTime: '13:30', trapHauls: '250',
      catchWeight: '500', gpsLat: '44.1234', gpsLng: '-66.5432', nbSpcmnBrd: '3',
      sarInd: '', mmInterInd: 'N',
    });
    expect(missing.map(m => m.fieldKey)).toEqual(['sarInd']);
  });

  test('app-supplied fields are documentation — never required, never in a gate list', () => {
    // reportDate left this list at P2: reclassified mandatory (S140 P2 ruling 1) so its
    // on-screen star survives the repoint — it is prefilled, so gates never find it blank.
    for (const [f, container] of [
      ['operName', 'trip'], ['lgbkUid', 'trip'], ['useCrInd', 'trip'],
      ['targetSpecies', 'effort'], ['specieSzId', 'bycatchRow'],
      ['gearDamageInd', 'form222'], ['fin', 'form233'],
    ] as const) {
      expect(isFieldRequired(f, ctx(88))).toBe(false);
      expect(fieldRequirement(f, container)!.kind).toBe('app-supplied');
    }
    expect(missingInContainer('trip', ctx(88), {
      startDt: '2026-06-10', sailTime: '05:30', departurePort: 'RIMOUSKI', crewNb: '2',
      bycatchAnswered: 'N',
    })).toEqual([]);
  });

  test('a complete effort block has nothing missing (per subform)', () => {
    expect(missingInContainer('effort', ctx(88, 25640), {
      fmaId: '25640', haulStartTime: '06:00', haulEndTime: '13:30', trapHauls: '250',
      catchWeight: '500', soakDuration: '2', gpsLat: '48.4488', gpsLng: '-68.5236',
      sarInd: 'N', mmInterInd: 'N',
    })).toEqual([]);
    expect(missingInContainer('effort', ctx(91, 2071), {
      fmaId: '2071', haulStartTime: '06:00', haulEndTime: '13:30', trapHauls: '250',
      catchWeight: '500', soakDuration: '2', trapSize: '39682', gearSubtypeId: '39684',
      nbSpcmnKept: '120', sarInd: 'N', mmInterInd: 'N',
    })).toEqual([]);
  });

  test('requiredGroups: hail on a MAR log with a 38b or 41 effort, nothing anywhere else (Rules 2024/2025)', () => {
    expect(requiredGroups(ctx(90, undefined, [28599]))).toEqual(['hlin', 'hlout']);
    expect(requiredGroups(ctx(90, undefined, [1595]))).toEqual(['hlin', 'hlout']);
    expect(requiredGroups(ctx(90, undefined, [1589]))).toEqual([]);
    expect(requiredGroups(ctx(88, undefined, [28599]))).toEqual([]);
    expect(requiredGroups(ctx(91, undefined, []))).toEqual([]);
  });

  test('every non-app-supplied entry carries an existing-style i18n labelKey', () => {
    for (const e of DFO_REQUIREMENTS_TABLE) {
      if (e.kind === 'app-supplied') expect(e.labelKey).toBeNull();
      else expect(e.labelKey).toMatch(/^form2(34|22|33)\.\w+$/);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// B. THE SEVEN TIER-1 FIELDS (RECON_S139B A2) — the table answers where every
//    old layer was silent
// ════════════════════════════════════════════════════════════════════════════

describe('Tier 1: the seven "no door is safe" fields', () => {
  test('1. soak duration, block 1 — per-block context means block 1 IS checked', () => {
    // The table takes the container, not the whole form: block 1 and block 7 get
    // identical treatment. Blank soak on 88 flags; on 90 it stays silent (blocked).
    const values = {
      fmaId: '25640', haulStartTime: '06:00', haulEndTime: '13:30', trapHauls: '250',
      catchWeight: '500', gpsLat: '48.4488', gpsLng: '-68.5236', sarInd: 'N', mmInterInd: 'N',
    };
    const missing = missingInContainer('effort', ctx(88, 25640), values);
    expect(missing).toEqual([
      { fieldKey: 'soakDuration', labelKey: 'form234.soakDurationLabel', reason: 'blank' },
    ]);
  });

  test('2. port landed — mandatory on ALL FOUR regions incl. 89/90 (row 100)', () => {
    for (const sf of [88, 89, 90, 91]) {
      expect(isFieldRequired('portId', ctx(sf))).toBe(true);
      expect(missingInContainer('landing', ctx(sf), { landingTime: '14:45' }))
        .toEqual([{ fieldKey: 'portId', labelKey: 'form234.portLandedLabel', reason: 'blank' }]);
    }
  });

  test('3. GPS on MAR 38b — mandatory there, blocked on every other MAR area; 88/89 always; 91 never', () => {
    expect(isFieldRequired('gpsCoords', ctx(90, 28599))).toBe(true);   // Rule 3059
    expect(isFieldRequired('gpsCoords', ctx(90, 1589))).toBe(false);
    expect(fieldRequirement('gpsCoords')!.state(ctx(90, 1589), {})).toBe('blocked');
    expect(isFieldRequired('gpsCoords', ctx(88, 25640))).toBe(true);
    expect(isFieldRequired('gpsCoords', ctx(89, 1526))).toBe(true);
    expect(fieldRequirement('gpsCoords')!.state(ctx(91, 2071), {})).toBe('blocked');
    const missing = missingInContainer('effort', ctx(90, 28599), {
      fmaId: '28599', haulStartTime: '06:00', haulEndTime: '13:30', trapHauls: '250',
      catchWeight: '500', nbSpcmnBrd: '3', sarInd: 'N', mmInterInd: 'N',
    });
    expect(missing.map(m => m.fieldKey)).toEqual(['gpsCoords']);
  });

  test('4. carrier VRN — mandatory when the carrier question is Yes, blocked otherwise (Rules 641/642); rides the transfer container', () => {
    expect(fieldRequirement('carrierVrn')!.container).toBe('transfer');
    expect(isFieldRequired('carrierVrn', ctx(88), { useCrInd: 'Y' })).toBe(true);
    expect(fieldRequirement('carrierVrn')!.state(ctx(88), { useCrInd: 'N' })).toBe('blocked');
    expect(fieldRequirement('carrierVrn')!.state(ctx(90), { useCrInd: 'Y' })).toBe('blocked');
    const missing = missingInContainer('transfer', ctx(88), {
      useCrInd: 'Y', transferTime: '15:00', transferWt: '50', transferToVrn: '106461',
    });
    expect(missing).toEqual([
      { fieldKey: 'carrierVrn', labelKey: 'form234.carrierVrnLabel', reason: 'blank' },
    ]);
  });

  test('5+6. the two v-notch counts — FMA-gated on QC (Rules 624/625/626, 28-FMA list)', () => {
    for (const f of ['vNotchCount', 'nbVntchYou']) {
      expect(isFieldRequired(f, ctx(88, 25656))).toBe(true);   // LFA 19a1 — in the list
      expect(fieldRequirement(f)!.state(ctx(88, 25640), {})).toBe('blocked'); // 17b — outside
      expect(fieldRequirement(f)!.state(ctx(90, 25656), {})).toBe('blocked'); // not QC
    }
    const missing = missingInContainer('effort', ctx(88, 25656), {
      fmaId: '25656', haulStartTime: '06:00', haulEndTime: '13:30', trapHauls: '250',
      catchWeight: '500', soakDuration: '2', gpsLat: '48.4488', gpsLng: '-68.5236',
      sarInd: 'N', mmInterInd: 'N',
    });
    expect(missing.map(m => m.fieldKey).sort()).toEqual(['nbVntchYou', 'vNotchCount']);
  });

  test('7. berried females — lobster in MAR 38b only (Rule 654)', () => {
    expect(isFieldRequired('nbSpcmnBrd', ctx(90, 28599))).toBe(true);
    expect(fieldRequirement('nbSpcmnBrd')!.state(ctx(90, 1589), {})).toBe('blocked');
    expect(fieldRequirement('nbSpcmnBrd')!.state(ctx(88, 28599), {})).toBe('blocked');
    const missing = missingInContainer('effort', ctx(90, 28599), {
      fmaId: '28599', haulStartTime: '06:00', haulEndTime: '13:30', trapHauls: '250',
      catchWeight: '500', gpsLat: '44.1234', gpsLng: '-66.5432', sarInd: 'N', mmInterInd: 'N',
    });
    expect(missing.map(m => m.fieldKey)).toEqual(['nbSpcmnBrd']);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// C. VALUE CHECKS — the fixed P1 list (send-validator ranges/formats, nothing new)
// ════════════════════════════════════════════════════════════════════════════

describe('value checks: a sealed invalid value is the same dead end as a sealed blank', () => {
  const effortValues = (soak: string) => ({
    fmaId: '25640', haulStartTime: '06:00', haulEndTime: '13:30', trapHauls: '250',
    catchWeight: '500', soakDuration: soak, gpsLat: '48.4488', gpsLng: '-68.5236',
    sarInd: 'N', mmInterInd: 'N',
  });

  test('soak: 12 days seals a dead logbook (Rule 165 caps at 9); 9 passes; 2.5 passes (the validator accepts non-whole days); 0 fails', () => {
    expect(missingInContainer('effort', ctx(88, 25640), effortValues('12')))
      .toEqual([{ fieldKey: 'soakDuration', labelKey: 'form234.soakDurationLabel', reason: 'invalid' }]);
    expect(missingInContainer('effort', ctx(88, 25640), effortValues('9'))).toEqual([]);
    expect(missingInContainer('effort', ctx(88, 25640), effortValues('2.5'))).toEqual([]);
    expect(missingInContainer('effort', ctx(88, 25640), effortValues('0')))
      .toEqual([{ fieldKey: 'soakDuration', labelKey: 'form234.soakDurationLabel', reason: 'invalid' }]);
  });

  test('effort GPS: range only (emit clamps decimals) — lat 80 / long -30 invalid, 5-decimal input fine', () => {
    const base = effortValues('2');
    expect(missingInContainer('effort', ctx(88, 25640), { ...base, gpsLat: '80' })
      .map(m => m.reason)).toEqual(['invalid']);
    expect(missingInContainer('effort', ctx(88, 25640), { ...base, gpsLng: '-30' })
      .map(m => m.reason)).toEqual(['invalid']);
    expect(missingInContainer('effort', ctx(88, 25640), { ...base, gpsLat: '48.44881' }))
      .toEqual([]); // clampCoord4 launders this at emit — rejecting it would be a NEW check
  });

  test('SAR GPS: full validator format — 5 decimals IS invalid (SAR coords emit unclamped)', () => {
    const sar = {
      sarDate: '2026-06-10', sarTime: '08:00', sarSpecies: '1234', sarNbSpcmn: '1',
      sarCondId: '5678', sarLat: '44.1234', sarLng: '-66.5432',
    };
    expect(missingInContainer('sar', ctx(90, 28599), sar)).toEqual([]);
    expect(missingInContainer('sar', ctx(90, 28599), { ...sar, sarLat: '44.12345' })
      .map(m => ({ f: m.fieldKey, r: m.reason }))).toEqual([{ f: 'sarGps', r: 'invalid' }]);
    expect(missingInContainer('sar', ctx(90, 28599), { ...sar, sarLng: '-30' })
      .map(m => m.reason)).toEqual(['invalid']);
  });

  test('crew: count must be 1–20 (Rule 444)', () => {
    const trip = { startDt: '2026-06-10', sailTime: '05:30', departurePort: 'X', crewNb: '21', bycatchAnswered: 'N' };
    expect(missingInContainer('trip', ctx(88), trip).map(m => ({ f: m.fieldKey, r: m.reason })))
      .toEqual([{ f: 'crewNb', r: 'invalid' }]);
    expect(missingInContainer('trip', ctx(88), { ...trip, crewNb: '20' })).toEqual([]);
  });

  test('233 logbook reference: optional, but a typed value must be six capital letters (Rule 953)', () => {
    const form = { periodStartDate: '2026-06-01', periodEndDate: '2026-06-07', reason: 'Weather' };
    expect(missingInContainer('form233', ctx(90), form)).toEqual([]); // blank optional = fine
    expect(missingInContainer('form233', ctx(90), { ...form, logbookUidRefered: 'abc123' })
      .map(m => ({ f: m.fieldKey, r: m.reason })))
      .toEqual([{ f: 'logbookUidRefered', r: 'invalid' }]);
    expect(missingInContainer('form233', ctx(90), { ...form, logbookUidRefered: 'ABCDEF' }))
      .toEqual([]);
  });

  test('222 coordinates: XSD ranges (clamped at emit, so range only)', () => {
    const y: Record<string, string> = {
      interactInd: 'Y', reportDate: '2026-06-11', lgbkNumRef: 'QWERTY', interactionDate: '2026-06-10',
      interactionTime: '08:30', lat: '44.1234', lon: '-66.5432', speciesLabel: 'Gray Seal',
      nbAnimals: '2', interactionTypeLabel: 'Entanglement', observerNm: 'Jane',
      contactInfo: 'x@y.z', siteDsc: 'Off the ledge', eventDsc: 'Swam clear',
      confidenceLabel: 'Sure', specimenCondLabel: 'Alive', lengthCatLabel: 'Adult',
    };
    expect(missingInContainer('form222', ctx(90), y)).toEqual([]);
    expect(missingInContainer('form222', ctx(90), { ...y, lat: '90' })
      .map(m => ({ f: m.fieldKey, r: m.reason }))).toEqual([{ f: 'lat', r: 'invalid' }]);
  });

  test('transfer TO pair: exactly one (Rule 252) — zero and two both refuse', () => {
    const base = { useCrInd: 'N', transferTime: '15:00', transferWt: '50' };
    expect(missingInContainer('transfer', ctx(88), { ...base, transferToVrn: '106461' }))
      .toEqual([]);
    expect(missingInContainer('transfer', ctx(88), base)).toEqual([
      { fieldKey: 'transferToVrn', labelKey: 'form234.transferToVrnLabel',
        pairLabelKey: 'form234.transferToPndNumLabel', reason: 'pair-none' },
    ]);
    expect(missingInContainer('transfer', ctx(88),
      { ...base, transferToVrn: '106461', transferToPndNum: 'P42' })
      .map(m => m.reason)).toEqual(['pair-both']);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// D. VALIDATOR AGREEMENT — the table vs the deliberately-independent send
//    validators, field by field, behaviourally (real XML through the real
//    generator). Drift in either source fires here.
// ════════════════════════════════════════════════════════════════════════════

describe('agreement (234): where the validator has a direction, the table matches it', () => {
  test('SOAKED_DUR: blank soak errors on 88/89/91 exactly where the table says mandatory; MAR blocked both sides', () => {
    for (const sf of [88, 89, 91]) {
      const log = makeLog(sf);
      delete log.data.soakDuration;
      const { errors } = validateElogXml(gen(log), sf);
      expect(errors.some(e => e.includes('SOAKED_DUR is required'))).toBe(true);
      expect(isFieldRequired('soakDuration', ctx(sf))).toBe(true);
    }
    // MAR: the fixture has no soak, the validator raises nothing, the table says blocked
    const { errors } = validateElogXml(gen(makeLog(90)), 90);
    expect(errors.filter(e => e.includes('SOAKED_DUR'))).toEqual([]);
    expect(fieldRequirement('soakDuration')!.state(ctx(90), {})).toBe('blocked');
  });

  test('TRP_SZ_ID: NL-mandatory / elsewhere-blocked, both directions', () => {
    const nl = makeLog(91);
    delete nl.data.trapSize;
    expect(validateElogXml(gen(nl), 91).errors.some(e => e.includes('TRP_SZ_ID is mandatory')))
      .toBe(true);
    expect(isFieldRequired('trapSize', ctx(91))).toBe(true);
    // blocked direction via injection (generator never emits it off-91)
    const injected = gen(makeLog(88)).replace('<CATCH>', '<TRP_SZ_ID>39682</TRP_SZ_ID>\n<CATCH>');
    expect(validateElogXml(injected, 88).errors.some(e => e.includes('TRP_SZ_ID is blocked')))
      .toBe(true);
    expect(fieldRequirement('trapSize')!.state(ctx(88), {})).toBe('blocked');
  });

  test('GEAR_SBTYP_ID: NL-mandatory', () => {
    const nl = makeLog(91);
    delete nl.data.gearSubtypeId;
    expect(validateElogXml(gen(nl), 91).errors.some(e => e.includes('GEAR_SBTYP_ID is required')))
      .toBe(true);
    expect(isFieldRequired('gearSubtypeId', ctx(91))).toBe(true);
  });

  test('effort LAT/LONG: mandatory 88/89 and MAR-38b; the table gives the same three answers', () => {
    for (const sf of [88, 89]) {
      const log = makeLog(sf);
      delete log.data.gpsLat; delete log.data.gpsLng;
      expect(validateElogXml(gen(log), sf).errors.some(e => e.includes('LAT and LONG are mandatory')))
        .toBe(true);
      expect(isFieldRequired('gpsCoords', ctx(sf, Number(makeLog(sf).data.fmaId)))).toBe(true);
    }
    const mar = makeLog(90);
    delete mar.data.gpsLat; delete mar.data.gpsLng;
    expect(validateElogXml(gen(mar), 90).errors.some(e => e.includes('Rule 3059'))).toBe(true);
    expect(isFieldRequired('gpsCoords', ctx(90, 28599))).toBe(true);
  });

  test('GRID_ID: Rule 1012 mandatory on a map FMA; Rule 1011 blocked on the 29 — table matches', () => {
    const qc = makeLog(88);
    qc.data.fmaId = '1534'; // LFA 22 — map "4", grid mandatory
    expect(validateElogXml(gen(qc), 88).errors.some(e => e.includes('Rule 1012'))).toBe(true);
    expect(isFieldRequired('gridId', ctx(88, 1534))).toBe(true);
    expect(fieldRequirement('gridId')!.state(ctx(88, 25640), {})).toBe('blocked'); // 17b in the 29
  });

  test('STAT_SECT_ID: Rule 621 mandatory inside the 17-FMA set — table matches (FMA-gated like the validator)', () => {
    const nl = makeLog(91);
    nl.data.fmaId = '1653'; // in DFO_FMA_STAT_SECT_REQUIRED
    expect(validateElogXml(gen(nl), 91).errors.some(e => e.includes('Rule 621'))).toBe(true);
    expect(isFieldRequired('statSectId', ctx(91, 1653))).toBe(true);
    expect(fieldRequirement('statSectId')!.state(ctx(91, 2071), {})).toBe('blocked');
  });

  test('NB_VNTCH / NB_VNTCH_YOU: mandatory on a Rule-624 FMA — table matches', () => {
    const qc = makeLog(88);
    qc.data.fmaId = '25656'; // LFA 19a1 — in both lists (grid blocked there, none emitted)
    const { errors } = validateElogXml(gen(qc), 88);
    expect(errors.some(e => e.includes('NB_VNTCH is mandatory'))).toBe(true);
    expect(errors.some(e => e.includes('NB_VNTCH_YOU is mandatory'))).toBe(true);
    expect(isFieldRequired('vNotchCount', ctx(88, 25656))).toBe(true);
    expect(isFieldRequired('nbVntchYou', ctx(88, 25656))).toBe(true);
  });

  test('NB_SPCMN_BRD: Rule 654 mandatory for lobster in MAR 38b — table matches', () => {
    const mar = makeLog(90);
    delete mar.data.nbSpcmnBrd;
    expect(validateElogXml(gen(mar), 90).errors.some(e => e.includes('Rule 654'))).toBe(true);
    expect(isFieldRequired('nbSpcmnBrd', ctx(90, 28599))).toBe(true);
  });

  test('NB_SPCMN_KEPT: Rule 976 mandatory on the NL lobster catch — table matches', () => {
    const nl = makeLog(91);
    delete nl.data.nbSpcmnKept;
    expect(validateElogXml(gen(nl), 91).errors.some(e => e.includes('Rule 976'))).toBe(true);
    expect(isFieldRequired('nbSpcmnKept', ctx(91))).toBe(true);
  });

  test('carrier VRN: Rule 642 when the carrier question is Yes — table matches', () => {
    const qc = makeLog(88);
    delete qc.data.carrierVrn;
    expect(validateElogXml(gen(qc), 88).errors.some(e => e.includes('Rule 642'))).toBe(true);
    expect(isFieldRequired('carrierVrn', ctx(88), { useCrInd: 'Y' })).toBe(true);
  });

  test('CREW_NB / TRIP.PORT_ID: the trip-level directions — table matches', () => {
    const qc = makeLog(88);
    qc.data.crewRegistry = '[]';
    delete qc.data.departurePort; delete qc.data.departurePortCodeId;
    const { errors } = validateElogXml(gen(qc), 88);
    expect(errors.some(e => e.includes('CREW_NB is required'))).toBe(true);
    expect(errors.some(e => e.includes('PORT_ID is required for QC(88)/NL(91)'))).toBe(true);
    expect(isFieldRequired('crewNb', ctx(88))).toBe(true);
    expect(isFieldRequired('departurePort', ctx(88))).toBe(true);
  });

  test('LANDING.PORT_ID: mandatory everywhere — the Tier-1 89/90 gap the old save gate had, agreed on all four', () => {
    for (const sf of [88, 89, 90, 91]) {
      const log = makeLog(sf);
      delete log.data.portLanded; delete log.data.portLandedCodeId;
      expect(validateElogXml(gen(log), sf).errors
        .some(e => e.includes('LANDING') && e.includes('PORT_ID required'))).toBe(true);
      expect(isFieldRequired('portId', ctx(sf))).toBe(true);
    }
  });

  test('transfer TO pair: Rule 252 exactly-one — table pair semantics match', () => {
    const qc = makeLog(88);
    delete qc.data.transferToVrn;
    expect(validateElogXml(gen(qc), 88).errors.some(e => e.includes('Rule 252'))).toBe(true);
    expect(missingInContainer('transfer', ctx(88),
      { useCrInd: 'N', transferTime: '15:00', transferWt: '50' })
      .map(m => m.reason)).toEqual(['pair-none']);
  });

  // S142 defect 52 — THE RE-CUT PIN. Until this build, this test lived in the KNOWN-GAPS
  // block below and asserted the OPPOSITE of its second line: that a 38b log with blank
  // hail fields produced NO HLIN/HLOUT error, i.e. that the validator had zero hail
  // enforcement while the table was deliberately ahead. Closing the gap fired that test ON
  // PURPOSE. It now asserts agreement in both directions, and has moved into this block —
  // where the already-closed rules (654, 252, 985…) live. Written down because a test that
  // goes red because something was FIXED looks identical to one that goes red because
  // something BROKE; this note is the only thing that tells them apart.
  test('hail presence: Rules 2024/2025 — the validator now requires both groups on a 38b log, and the table agrees', () => {
    const { errors } = validateElogXml(gen(makeLog(90)), 90); // 38b fixture, hail fields blank
    expect(errors.some(e => e.includes('HLIN is required') && e.includes('Rule 2024'))).toBe(true);
    expect(errors.some(e => e.includes('HLOUT is required') && e.includes('Rule 2025'))).toBe(true);
    expect(requiredGroups(ctx(90, undefined, [28599]))).toEqual(['hlin', 'hlout']);
  });

  test('hail presence: neither gate asks for a hail on a MAR log with no 38b/41 effort', () => {
    const mar = makeLog(90);
    mar.data.fmaId = '1589'; // LFA 34 — outside the Rules 2024/2025 set
    delete mar.data.gpsLat; delete mar.data.gpsLng; delete mar.data.gpsSrc; // non-38b: blocked
    delete mar.data.nbSpcmnBrd;
    const { errors } = validateElogXml(gen(mar), 90);
    expect(errors.filter(e => e.includes('HLIN') || e.includes('HLOUT'))).toEqual([]);
    expect(requiredGroups(ctx(90, undefined, [1589]))).toEqual([]);
  });
});

describe('agreement (234): the validator\'s KNOWN deferred gaps stay gaps (ruling 5) — the table is deliberately ahead', () => {
  test('settlement grid: table mandates on a Rule-619 LFA; the validator (still) has no mandatory direction', () => {
    const mar = makeLog(90);
    mar.data.fmaId = '1589'; // LFA 34 — in the Rule-619 list
    delete mar.data.lgridCodeId;
    delete mar.data.gpsLat; delete mar.data.gpsLng; delete mar.data.gpsSrc; // non-38b: blocked
    delete mar.data.nbSpcmnBrd;
    const { errors } = validateElogXml(gen(mar), 90);
    expect(errors.filter(e => e.includes('LGRID'))).toEqual([]); // the P5-deferred gap
    expect(isFieldRequired('lgridCodeId', ctx(90, 1589))).toBe(true); // the table is ahead
  });

  test('kept weight: table mandates (Rule 631, lobster); the validator (still) has no direction', () => {
    const mar = makeLog(90);
    delete mar.data.catchWeight;
    const { errors } = validateElogXml(gen(mar), 90);
    expect(errors.filter(e => e.includes('KEPT_WT'))).toEqual([]);
    expect(isFieldRequired('catchWeight', ctx(90, 28599))).toBe(true);
  });

});

describe('agreement (222/233): the form validators', () => {
  const entry222 = (over: Record<string, string>) => ({
    uid: 'ABCDEF', savedAt: 1760000000000, reportDate: '2026-06-11',
    interactionDate: '2026-06-10', interactionTime: '08:30', lat: '44.1234', lon: '-66.5432',
    speciesLabel: 'Gray Seal', nbAnimals: '2', interactionTypeLabel: 'Entanglement',
    injuryInd: 'Y', deathInd: 'N', entangleInd: 'Y', releaseInd: 'Y', gearDamageInd: 'N',
    observerNm: 'Jane Observer', contactInfo: '123 Wharf Rd', remarks: '',
    lgbkNumRef: 'QWERTY', interactInd: 'Y', sentToDfo: false, ...over,
  } as any);

  test('222 Y-path: a blank observer name errors at send exactly where the table says mandatory', () => {
    const xml = generateForm222Xml(entry222({ observerNm: '' }), profile);
    expect(validateForm222Xml(xml).errors.some(e => e.includes('NAME'))).toBe(true);
    expect(isFieldRequired('observerNm', ctx(90), { interactInd: 'Y' })).toBe(true);
  });

  test('222: the five ruled-in inputs have NO validator direction (the known 10-vs-28 gap) — the table is deliberately ahead (ruling 3)', () => {
    const xml = generateForm222Xml(entry222({}), profile); // siteDsc etc. all absent
    const { valid, errors } = validateForm222Xml(xml);
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
    for (const f of ['siteDsc', 'eventDsc', 'confidenceLabel', 'specimenCondLabel', 'lengthCatLabel']) {
      expect(isFieldRequired(f, ctx(90), { interactInd: 'Y' })).toBe(true);
      expect(fieldRequirement(f)!.state(ctx(90), { interactInd: 'N' })).toBe('blocked'); // Rule 594
    }
  });

  test('233: a blank reason errors at send; the table flags it at the close', () => {
    const entry: any = {
      uid: 'ABCDEF', savedAt: 1760000000000, periodStartDate: '2026-06-01',
      periodEndDate: '2026-06-07', reason: '', licenceNo: '300123', fin: '123456789',
      sentToDfo: false,
    };
    const xml = generateForm233Xml(entry, profile);
    expect(validateForm233Xml(xml).errors.some(e => e.includes('REASON'))).toBe(true);
    expect(missingInContainer('form233', ctx(90),
      { periodStartDate: '2026-06-01', periodEndDate: '2026-06-07', reason: '' })
      .map(m => m.fieldKey)).toEqual(['reason']);
  });

  test('233 logbook reference: the validator\'s Rule-953 format check and the table\'s value check agree', () => {
    const entry: any = {
      uid: 'ABCDEF', savedAt: 1760000000000, periodStartDate: '2026-06-01',
      periodEndDate: '2026-06-07', reason: 'Weather', licenceNo: '300123', fin: '123456789',
      logbookUidRefered: 'abc123', sentToDfo: false,
    };
    const xml = generateForm233Xml(entry, profile);
    expect(validateForm233Xml(xml).errors.some(e => e.includes('Rule 953'))).toBe(true);
    expect(missingInContainer('form233', ctx(90),
      { periodStartDate: '2026-06-01', periodEndDate: '2026-06-07', reason: 'Weather',
        logbookUidRefered: 'abc123' }).map(m => m.reason)).toEqual(['invalid']);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// P2 (S140) — THE MARK REPOINT: golden answers for every star the screens now
// draw by asking the table instead of deciding for themselves
// ════════════════════════════════════════════════════════════════════════════

describe('P2 marks: the table answers every star the screens now draw', () => {
  test('config parity: every key in every subform\'s old required[] gets the same star from the table (the isRequired wrapper swap is invisible)', () => {
    for (const sf of [88, 89, 90, 91]) {
      for (const key of DFO_SUBFORM_FIELD_CONFIG[sf].required) {
        expect(isFieldRequired(key, ctx(sf))).toBe(true);
      }
    }
  });

  test('the dormant bait-section key stays dormant through the wrapper', () => {
    for (const sf of [88, 89, 90, 91]) {
      expect(isFieldRequired('baitEntries', ctx(sf))).toBe(false);
    }
  });

  test('Date Fished (startDt) is marked on all four (ruling 2)', () => {
    for (const sf of [88, 89, 90, 91]) {
      expect(isFieldRequired('startDt', ctx(sf))).toBe(true);
    }
  });

  test('222 report date keeps its star (ruling 1): reclassified mandatory, prefilled so a gate check is inert', () => {
    expect(isFieldRequired('reportDate', ctx(90))).toBe(true);
    expect(fieldRequirement('reportDate', 'form222')!.kind).toBe('per-subform');
  });

  test('transfer TO pair: both members marked on QC (Rule 252), nowhere else', () => {
    expect(isFieldRequired('transferToVrn', ctx(88))).toBe(true);
    expect(isFieldRequired('transferToPndNum', ctx(88))).toBe(true);
    expect(isFieldRequired('transferToVrn', ctx(90))).toBe(false);
  });

  test('add-sheet fields: type/species + weight marked everywhere, usage MAR-only (ruling 4)', () => {
    for (const sf of [88, 89, 90, 91]) {
      expect(isFieldRequired('type', ctx(sf), {}, 'baitRow')).toBe(true);
      expect(isFieldRequired('lbs', ctx(sf), {}, 'baitRow')).toBe(true);
      expect(isFieldRequired('species', ctx(sf), {}, 'bycatchRow')).toBe(true);
      expect(isFieldRequired('lbs', ctx(sf), {}, 'bycatchRow')).toBe(true);
    }
    expect(isFieldRequired('usage', ctx(90), {}, 'bycatchRow')).toBe(true);
    expect(isFieldRequired('usage', ctx(88), {}, 'bycatchRow')).toBe(false);
  });

  test('the 222 five + coordinates mark only when the interaction answer is Yes (Rules 593/594)', () => {
    for (const f of ['siteDsc', 'eventDsc', 'confidenceLabel', 'specimenCondLabel',
                     'lengthCatLabel', 'lat', 'lon']) {
      expect(isFieldRequired(f, ctx(90), { interactInd: 'Y' })).toBe(true);
      expect(isFieldRequired(f, ctx(90), { interactInd: 'N' })).toBe(false);
    }
  });

  test('S140 P3 ruling: the three blocking toggles are one claim — starred via the table, with SHORT bullet labels', () => {
    // Bycatch is app chrome (the PCONS usage question), save-gated today, starred by ruling.
    for (const sf of [88, 89, 90, 91]) {
      expect(isFieldRequired('bycatchAnswered', ctx(sf))).toBe(true);
    }
    expect(fieldRequirement('bycatchAnswered', 'trip')!.kind).toBe('answered');
    // The refusal bullets read as labels, not sentences — the labelKey IS the short form.
    expect(fieldRequirement('sarInd', 'effort')!.labelKey).toBe('form234.sarIndShortLabel');
    expect(fieldRequirement('mmInterInd', 'effort')!.labelKey).toBe('form234.mmIndShortLabel');
    expect(fieldRequirement('bycatchAnswered', 'trip')!.labelKey).toBe('form234.bycatchShortLabel');
    // An unanswered toggle still refuses through the gate list (the block half of the claim).
    expect(missingInContainer('trip', ctx(90), {
      startDt: '2026-08-25', sailTime: '05:30', crewNb: '2', bycatchAnswered: '',
    }).map(m => ({ f: m.fieldKey, l: m.labelKey })))
      .toEqual([{ f: 'bycatchAnswered', l: 'form234.bycatchShortLabel' }]);
  });

  test('hail extras mark exactly when an effort fishes 38b (Rules 660/661 — 41 alone does not qualify)', () => {
    expect(isFieldRequired('hlinEta', ctx(90, undefined, [28599]), {}, 'hlin')).toBe(true);
    expect(isFieldRequired('hlinEta', ctx(90, undefined, [1595]), {}, 'hlin')).toBe(false);
    expect(isFieldRequired('hlinTotalWeight', ctx(90, undefined, [28599]), {}, 'hlin')).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// P3b (S141) ruling 2 — the three seal-then-unsendable value checks, each pinned
// against the independent form validator that already refuses it at send. The close
// door stays EXACTLY as wide as the send door: every table 'invalid' here has a
// matching validator error, and the table goes quiet exactly where the validator does.
// ════════════════════════════════════════════════════════════════════════════

describe('P3b (S141) ruling 2: form value checks agree with the send validators', () => {
  const y222 = (over: Record<string, string> = {}): Record<string, string> => ({
    interactInd: 'Y', reportDate: '2026-06-11', lgbkNumRef: 'QWERTY', interactionDate: '2026-06-10',
    interactionTime: '08:30', lat: '44.1234', lon: '-66.5432', speciesLabel: 'Gray Seal',
    nbAnimals: '2', interactionTypeLabel: 'Entanglement', observerNm: 'Jane',
    contactInfo: 'x@y.z', siteDsc: 'Off the ledge', eventDsc: 'Swam clear',
    confidenceLabel: 'Sure', specimenCondLabel: 'Alive', lengthCatLabel: 'Adult', ...over,
  });
  const entry222 = (over: Record<string, string>): any => ({
    uid: 'ABCDEF', savedAt: 1760000000000, reportDate: '2026-06-11',
    interactionDate: '2026-06-10', interactionTime: '08:30', lat: '44.1234', lon: '-66.5432',
    speciesLabel: 'Gray Seal', nbAnimals: '2', interactionTypeLabel: 'Entanglement',
    injuryInd: 'N', deathInd: 'N', entangleInd: 'N', releaseInd: 'N', gearDamageInd: 'N',
    observerNm: 'Jane Observer', contactInfo: '123 Wharf Rd', remarks: '',
    lgbkNumRef: 'QWERTY', interactInd: 'Y', sentToDfo: false, ...over,
  });
  const entry233 = (over: Record<string, string>): any => ({
    uid: 'ABCDEF', savedAt: 1760000000000, periodStartDate: '2026-06-01',
    periodEndDate: '2026-06-07', reason: 'Weather', licenceNo: '300123', fin: '123456789',
    sentToDfo: false, ...over,
  });

  test('222 animal count: a 5-digit value is invalid at the table AND refused at send (NB_SPCMN_BEST 0–9999)', () => {
    expect(missingInContainer('form222', ctx(90), y222({ nbAnimals: '12345' }))
      .map(m => ({ f: m.fieldKey, r: m.reason }))).toEqual([{ f: 'nbAnimals', r: 'invalid' }]);
    const xml = generateForm222Xml(entry222({ nbAnimals: '12345' }), profile);
    expect(validateForm222Xml(xml).errors.some(e => e.includes('NB_SPCMN_BEST'))).toBe(true);
    // 4 digits stays clean both sides
    expect(missingInContainer('form222', ctx(90), y222({ nbAnimals: '9999' }))).toEqual([]);
  });

  test('222 date order: an interaction date after the report date is invalid at the table AND refused at send (Rules 566/590/591)', () => {
    expect(missingInContainer('form222', ctx(90), y222({ interactionDate: '2026-06-12' }))
      .map(m => ({ f: m.fieldKey, r: m.reason }))).toEqual([{ f: 'interactionDate', r: 'invalid' }]);
    const xml = generateForm222Xml(entry222({ interactionDate: '2026-06-12' }), profile);
    expect(validateForm222Xml(xml).errors.some(e => e.includes('Rule 591'))).toBe(true);
  });

  test('222 future report date: invalid exactly where the validator checks (Y-path, interaction date present — Rule 592)', () => {
    const future = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    expect(missingInContainer('form222', ctx(90),
      y222({ reportDate: future, interactionDate: future }))
      .map(m => ({ f: m.fieldKey, r: m.reason }))).toEqual([{ f: 'reportDate', r: 'invalid' }]);
    const xml = generateForm222Xml(
      entry222({ reportDate: future, interactionDate: future }), profile);
    expect(validateForm222Xml(xml).errors.some(e => e.includes('Rule 592'))).toBe(true);
    // Exactness pin: with NO interaction date, the validator never reaches the future
    // check — and neither does the table (blank refusal only, no invalid).
    expect(missingInContainer('form222', ctx(90),
      y222({ reportDate: future, interactionDate: '' }))
      .every(m => m.reason === 'blank')).toBe(true);
  });

  test('233 period order: an end date before the start date is invalid at the table AND refused at send', () => {
    const form = { periodStartDate: '2026-06-07', periodEndDate: '2026-06-01', reason: 'Weather' };
    expect(missingInContainer('form233', ctx(90), form)
      .map(m => ({ f: m.fieldKey, r: m.reason }))).toEqual([{ f: 'periodEndDate', r: 'invalid' }]);
    const xml = generateForm233Xml(
      entry233({ periodStartDate: '2026-06-07', periodEndDate: '2026-06-01' }), profile);
    expect(validateForm233Xml(xml).errors.some(e => e.includes('END_DT is before START_DT'))).toBe(true);
  });
});
