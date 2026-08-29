// S151B guard — ruling L-2 (full): the transmission-record export is written in the app's
// language, not just its field labels.
//
// This is the ONLY document the app ever hands a harvester that leaves the phone entirely. If it
// comes out half-translated — French field names wrapped around an English legal paragraph — he is
// handed a worse artefact than either language done properly, on the one record a fishery officer
// may ask to see. These tests pin the parts that make L-2 real rather than nominal.
//
// ⚠⚠ S151C — WHY THIS SUITE NOW DRIVES REAL i18next.
// The first version of these tests handed the builder a hand-rolled stub `t` that did a dotted
// lookup straight into the JSON. Every test passed, and the feature was still completely broken:
// the module asked for `export.title` while the block lives in dfo.json and `defaultNS` is
// `common`, so in the real app EVERY lookup missed and returned its English fallback. A walk on
// the sim found it — the French popup rendered in French and named an entirely English document.
//
// The stub was the hiding place. It resolved keys the way the tests assumed i18next worked rather
// than the way i18next actually works, so the one line where the app meets the translation library
// was never exercised. These tests now init a real i18next instance with the SAME ns/defaultNS
// config as src/i18n/index.ts, so a missing namespace prefix fails here instead of on a harvester's
// phone. `DEFAULT_EXPORT_T` is still asserted separately to prove the builder needs no i18n at all.
jest.mock('react-native-blob-util', () => ({
  fs: { dirs: { CacheDir: '/tmp/cache', DocumentDir: '/tmp/docs' }, writeFile: jest.fn() },
  android: { actionViewIntent: jest.fn() },
}));

import i18next from 'i18next';
import {
  buildTransmissionRecordExport,
  EXPORT_FIELD_LABELS,
  EXPORT_FIELD_LABEL_KEYS,
  DEFAULT_EXPORT_T,
  type ExportT,
} from '../exportTransmissionRecord';
import type { TransmissionRecord, XmlArchiveEntry } from '../dfoLogStorage';

const EN_DFO = require('../../i18n/locales/en/dfo.json');
const FR_DFO = require('../../i18n/locales/fr/dfo.json');
const EN_COMMON = require('../../i18n/locales/en/common.json');
const FR_COMMON = require('../../i18n/locales/fr/common.json');
const EN_MAP = require('../../i18n/locales/en/map.json');
const FR_MAP = require('../../i18n/locales/fr/map.json');

// Built the way src/i18n/index.ts builds it — same namespaces, same defaultNS, same bundles.
// If either of those changes, this suite changes with it, which is the point.
const APP_NS = ['common', 'dfo', 'map'];
const APP_DEFAULT_NS = 'common';

async function makeRealT(lng: 'en' | 'fr'): Promise<ExportT> {
  const inst = i18next.createInstance();
  await inst.init({
    lng,
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr'],
    ns: APP_NS,
    defaultNS: APP_DEFAULT_NS,
    resources: {
      en: { common: EN_COMMON, dfo: EN_DFO, map: EN_MAP },
      fr: { common: FR_COMMON, dfo: FR_DFO, map: FR_MAP },
    },
    interpolation: { escapeValue: false },
  });
  // Exactly the adapter useAuth.ts passes in production.
  return (key, fallback, vars) => inst.t(key, { defaultValue: fallback, ...(vars ?? {}) }) as string;
}

let tEn: ExportT;
let tFr: ExportT;
beforeAll(async () => {
  tEn = await makeRealT('en');
  tFr = await makeRealT('fr');
});

/** The leaf name inside the export block, from a namespaced key like `dfo:export.fieldVrn`. */
const leafOf = (key: string) => key.split('.').pop() as string;

const GENERATED_AT = Date.UTC(2026, 7, 28, 21, 40, 12);
const UID = 'uidEXPORTTEST';

const accepted: TransmissionRecord = {
  id: 'LL-20260828-001',
  logId: 'LL-20260828-001',
  attemptedAt: Date.UTC(2026, 7, 28, 15, 51, 3),
  outcome: 'success',
  httpStatus: 200,
  fileName: '1004-104460-20260828155103.XML',
  confNumber: '164051',
  xmlSnapshot: '<ELOG><GENERAL_INFO><CIE_ID>44542</CIE_ID></GENERAL_INFO></ELOG>',
  soapSnapshot: '<soap:Envelope><p_elogkey>U0VDUkVUS0VZ</p_elogkey></soap:Envelope>',
  vrn: '104460',
  tripNum: 2,
  xsdValid: true,
  wsErrCode: 'WS0000',
  kind: 'logbook',
};

const failed: TransmissionRecord = {
  id: 'FORM222-OYTWTM',
  logId: 'FORM222-OYTWTM',
  attemptedAt: Date.UTC(2026, 7, 14, 12, 39, 0),
  outcome: 'failure',
  httpStatus: 500,
  errorMessage: 'Internal Server Error',
  fileName: '1004-104460-20260814123900.XML',
  xmlSnapshot: '<ELOG><MM_INTER><INTERACT_IND>N</INTERACT_IND></MM_INTER></ELOG>',
  soapSnapshot: '<soap:Envelope><p_elogkey>U0VDUkVUS0VZ</p_elogkey></soap:Envelope>',
  vrn: '104460',
  xsdValid: false,
  wsErrCode: 'WS1038',
  kind: 'form222',
  failureKind: 'refused',
};

const archive: XmlArchiveEntry[] = [
  {
    logId: 'LL-20260828-001',
    savedAt: Date.UTC(2026, 7, 28, 15, 51, 4),
    xml: '<ELOG><GENERAL_INFO><CIE_ID>44542</CIE_ID></GENERAL_INFO></ELOG>',
  },
];

const build = (t?: ExportT, records = [accepted, failed], arc = archive) =>
  buildTransmissionRecordExport({ records, archive: arc, uid: UID, generatedAt: GENERATED_AT, t });

// Every hardcoded English phrase that used to reach the file. If any of these survives into the
// French document, a string was missed — which is exactly the half-translated failure L-2 forbids.
const ENGLISH_MARKERS = [
  'LOBSTERLOG - TRANSMISSION RECORD',
  'Generated:',
  'Account:',
  'Records:',
  'Sent XML documents:',
  'This is your copy of the reports',
  'Department of',
  'The law requires you to keep these records',
  'the app no longer holds them',
  'SENT XML DOCUMENTS',
  'END OF RECORD',
  'RECORD 1 OF 2',
  'XML 1 OF 1',
  'Saved at (UTC)',
  'Accepted by DFO',
  'Logbook (Form 234)',
  'Form 222 (marine mammal)',
  'DFO rejected it',
  'present, not included',
  'Record ID',
  'Log ID',
  'Attempted at (UTC)',
  'Outcome',
  'HTTP status',
  'Error message',
  'XML file name',
  'DFO confirmation number',
  'Sent XML',
  'SOAP envelope',
  'Vessel number (VRN)',
  'Trip number',
  'XSD validation',
  'DFO response code',
  'Report type',
  'Failure kind',
];

describe('L-2 — the export follows the app language', () => {
  it('produces the English document unchanged when no t is supplied', () => {
    const out = build(undefined);
    for (const m of ENGLISH_MARKERS) expect(out).toContain(m);
  });

  it('the English bundle and the built-in fallbacks agree, string for string', () => {
    // If these ever drift, the document silently changes language-to-language for English users
    // depending on whether i18n happened to be initialised.
    expect(build(tEn)).toBe(build(undefined));
  });

  it('produces a French document with NO English left in it', () => {
    const out = build(tFr);
    const survivors = ENGLISH_MARKERS.filter(m => out.includes(m));
    expect(survivors).toEqual([]);
  });

  it('carries the French chrome, headings and legal paragraph', () => {
    const out = build(tFr);
    expect(out).toContain('LOBSTERLOG - REGISTRE DE TRANSMISSION');
    expect(out).toContain('DOCUMENTS XML TRANSMIS');
    expect(out).toContain('FIN DU REGISTRE');
    expect(out).toContain('ENREGISTREMENT 1 SUR 2');
    expect(out).toContain('XML 1 SUR 1');
    expect(out).toContain('La loi vous oblige à conserver ces');
    expect(out).toContain('l’application ne les conserve plus.');
  });

  it('no French line begins with a bare elision apostrophe', () => {
    // Caught for real: hand-wrapping the legal paragraph dropped the "l" from "l’application",
    // leaving a line that opened "’application ne les conserve plus." Every assertion above
    // still passed — only rendering the document showed it. A wrap that eats the article is
    // invisible to substring tests, so pin the shape rather than the one phrase.
    for (const l of build(tFr).split('\n')) {
      expect(l.startsWith('’')).toBe(false);
    }
  });

  it('carries all 16 field labels in French', () => {
    const out = build(tFr);
    for (const field of Object.keys(EXPORT_FIELD_LABELS)) {
      const fr = FR_DFO.export[leafOf(EXPORT_FIELD_LABEL_KEYS[field])];
      expect(typeof fr).toBe('string');
      expect(out).toContain(fr);
    }
  });

  it('translates the VALUES too, not only the labels', () => {
    const out = build(tFr);
    expect(out).toContain('Accepté par le MPO');       // outcome
    expect(out).toContain('Journal de bord (formulaire 234)'); // kind
    expect(out).toContain('Le MPO l’a rejeté');        // failureKind
    expect(out).toContain('Réussie');                  // xsdValid true
    expect(out).toContain('Échouée');                  // xsdValid false
    expect(out).toContain('présente, non incluse');    // soapSnapshot
    expect(out).toContain('2 (1 acceptés, 1 échoués)'); // the summary count line
  });

  it('still withholds the ELOG key in French', () => {
    const out = build(tFr);
    expect(out).not.toContain('U0VDUkVUS0VZ');
    expect(out).not.toContain('p_elogkey');
  });

  it('is still plain text in French — no markdown', () => {
    const out = build(tFr);
    expect(out).not.toContain('*');
    expect(out).not.toContain('```');
  });

  it('says so plainly in French when there is nothing to export', () => {
    const out = build(tFr, [], []);
    expect(out).toContain('Aucune transmission n’a été enregistrée');
    expect(out).toContain('Aucun document XML n’a été archivé');
  });
});

describe('R4 — the label column is sized from the language', () => {
  // Reads the pad back off the rendered output rather than testing the arithmetic: the value
  // column must start at the same offset on every line, in whichever language.
  const offsets = (out: string) =>
    out
      .split('\n')
      .filter(l => /^[^\s].*?:\s{2,}\S/.test(l))
      .map(l => l.indexOf(l.trimEnd().split(/:\s{2,}/)[1] ?? ''));

  it('English still starts its values at column 26', () => {
    const o = offsets(build(undefined));
    expect(o.length).toBeGreaterThan(5);
    expect(new Set(o)).toEqual(new Set([26]));
  });

  it('French widens to fit its longest label, and stays aligned', () => {
    const o = offsets(build(tFr));
    expect(o.length).toBeGreaterThan(5);
    expect(new Set(o).size).toBe(1);          // one column, not ragged
    expect([...new Set(o)][0]).toBeGreaterThan(26); // wider than English
  });

  it('the longest French label is not swallowed by the column', () => {
    const out = build(tFr);
    const vrnLabel = FR_DFO.export.fieldVrn;  // the 39-character NEB label
    const row = out.split('\n').find(l => l.startsWith(vrnLabel + ':'));
    expect(row).toBeDefined();
    // there is a real gap between label and value, not a collision
    expect(row!).toMatch(new RegExp(`^${vrnLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s{2,}104460$`));
  });
});

describe('S151C — every export key is namespaced, and every one really resolves', () => {
  // The S151B defect in one sentence: the module asked for `export.title`, the block lives in
  // dfo.json, and `defaultNS` is `common` — so all 42 lookups missed and silently returned their
  // English fallback, in both languages. The aggregate "no English survives" test above would
  // catch a wholesale regression; this catches ONE key losing its prefix, which is how it would
  // actually come back. It reads the production source, so it cannot be satisfied by a stub.
  const SOURCE = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'exportTransmissionRecord.ts'),
    'utf8',
  );
  const keysInSource: string[] = (SOURCE.match(/'(?:dfo:)?export\.[A-Za-z0-9]+'/g) ?? []).map(
    (s: string) => s.slice(1, -1),
  );

  it('the source still asks for all 42 export keys', () => {
    expect(new Set(keysInSource).size).toBe(42);
  });

  it('EVERY export key the module requests carries the dfo: namespace', () => {
    const unprefixed = keysInSource.filter(k => !k.startsWith('dfo:'));
    expect(unprefixed).toEqual([]);
  });

  it('every requested key resolves through real i18next — none falls back', () => {
    // A key that lost its prefix returns the English fallback in French. Comparing the French
    // render of each key against the English one makes that visible key-by-key: every export
    // string in this app differs between the two languages (asserted separately below), so
    // "French === English" for any key means that key did not resolve.
    const notResolving = keysInSource.filter(k => tFr(k, '<<MISS>>') === '<<MISS>>');
    expect(notResolving).toEqual([]);
  });

  it('every requested key renders differently in French than in English', () => {
    const stuckOnEnglish = keysInSource.filter(k => tFr(k, '<<MISS>>') === tEn(k, '<<MISS>>'));
    expect(stuckOnEnglish).toEqual([]);
  });
});

describe('R2 — the French lives in the JSON bundles, and the sets match', () => {
  it('en/dfo.json and fr/dfo.json declare the SAME export keys', () => {
    const en = Object.keys(EN_DFO.export).sort();
    const fr = Object.keys(FR_DFO.export).sort();
    expect(fr).toEqual(en);
    expect(en.length).toBe(42);
  });

  it('every field label key referenced by the code exists in BOTH bundles', () => {
    for (const field of Object.keys(EXPORT_FIELD_LABELS)) {
      const leaf = leafOf(EXPORT_FIELD_LABEL_KEYS[field]);
      expect(typeof EN_DFO.export[leaf]).toBe('string');
      expect(typeof FR_DFO.export[leaf]).toBe('string');
    }
  });

  it('no French export string is left identical to its English twin', () => {
    // A copy-paste that never got translated would otherwise pass every other test here.
    const untranslated = Object.keys(EN_DFO.export).filter(
      k => EN_DFO.export[k] === FR_DFO.export[k],
    );
    expect(untranslated).toEqual([]);
  });

  it('placeholders match between the two languages, key for key', () => {
    const ph = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort();
    for (const k of Object.keys(EN_DFO.export)) {
      expect(ph(FR_DFO.export[k])).toEqual(ph(EN_DFO.export[k]));
    }
  });

  it('the builder needs no i18n at all — DEFAULT_EXPORT_T still interpolates', () => {
    expect(DEFAULT_EXPORT_T('any.key', 'RECORD {{n}} OF {{total}}', { n: 3, total: 9 })).toBe(
      'RECORD 3 OF 9',
    );
    expect(DEFAULT_EXPORT_T('any.key', 'no vars here')).toBe('no vars here');
  });
});

describe('locale bundles — interpolation placeholders are well formed', () => {
  // S151B R5. fr/common.json's account.exportSavedBody shipped `{fileName}` where i18next needs
  // `{{fileName}}`, so the French harvester was told his record was saved "sous le nom {fileName}"
  // and never learned the file's name — on the one screen this whole feature exists for. A
  // single-brace placeholder renders as literal text, silently, in whichever language holds it.
  const BUNDLES: Array<[string, any]> = [
    ['en/common.json', EN_COMMON],
    ['fr/common.json', FR_COMMON],
    ['en/dfo.json', EN_DFO],
    ['fr/dfo.json', FR_DFO],
    ['en/map.json', EN_MAP],
    ['fr/map.json', FR_MAP],
  ];

  const walk = (o: any, prefix = ''): Array<[string, string]> =>
    Object.entries(o).flatMap(([k, v]) =>
      v && typeof v === 'object'
        ? walk(v, `${prefix}${k}.`)
        : typeof v === 'string'
          ? ([[`${prefix}${k}`, v]] as Array<[string, string]>)
          : [],
    );

  it('no bundle contains a single-brace {placeholder}', () => {
    const bad: string[] = [];
    for (const [name, bundle] of BUNDLES) {
      for (const [key, value] of walk(bundle)) {
        if (/(?<!\{)\{[A-Za-z_]\w*\}(?!\})/.test(value)) bad.push(`${name} → ${key}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('the French delete-account body interpolates the file name', () => {
    expect(FR_COMMON.account.exportSavedBody).toContain('{{fileName}}');
    expect(FR_COMMON.account.exportSavedBody).not.toContain('{fileName}.');
  });
});
