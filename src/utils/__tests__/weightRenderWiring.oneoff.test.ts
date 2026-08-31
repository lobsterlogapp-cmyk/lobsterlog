// S154B Phase 3 — THE WEIGHT-WIRING GUARD.
//
// WHY THIS EXISTS
// S153 moved weights to kilograms at close and gave every weight a display rule: a closed card
// shows what the harvester typed, in the unit he typed it in. It wired that rule into every
// render site it could reach through a VALUE parameter and stopped where the parameter did not
// exist. Four sites were left half-done and nothing noticed for a whole session, because
// FullDfoForm cannot be rendered under jest in this repo — no test can see what a card shows.
//
// So this test does not render anything. It READS FullDfoForm.tsx AS TEXT and checks the wiring.
//
// TWO FAULTS, TWO CHECKS. They are different failures and one scan cannot sensibly catch both:
//
//   CHECK 1 — A MISSING CONVERTER. The label went through the converter and the value did not,
//   so a closed card drew raw stored kilograms under an (LBS) heading.
//   At 605a35e this was FullDfoForm.tsx:2528 (effort 1, groups 2+) and :2127 (efforts 2+).
//
//   CHECK 2 — THE WRONG STAMP AND TAG. The value went through the converter, but a SHARED
//   helper read the close stamp and unit tag out of its own scope — effort 1's — while
//   describing a trap group of an effort 2+ node, which carries its own.
//   At 605a35e this was extraSummary (:2387), reached from :2050. This is the fault with a path
//   to a wrong number on the wire: an OPEN node under an effort 1 closed on lbs printed the
//   weight multiplied by 2.20462, in a box the harvester could still edit and "correct".
//
// ⚠ WHAT THIS GUARD CANNOT SEE — read this before trusting it.
//   1. It is GREP-SHAPED. It finds weights by the identifiers listed in SCANNED_IDENTIFIERS
//      below. A weight drawn by hand-written string interpolation — `${w} lbs` — touching none
//      of those names is INVISIBLE to it. The S154 recon's own fourteen-site count has the same
//      shape and says so.
//   2. CHECK 2 makes the wrong-stamp fault structurally impossible to INHERIT: a shared helper
//      must be told its stamps. It cannot tell whether a caller passes the RIGHT stamps. That is
//      semantic, and only the walk can prove it.
//   3. CHECK 1 compares multisets, so it is order-independent. Two sites that SWAPPED stamp
//      pairs with each other would still balance and would pass.
//   4. It reads ONE file. A weight rendered anywhere else is not scanned.
//
// PREFER FAILING LOUD. Every rule below is written so that something UNRECOGNISED fails the
// test rather than passing quietly: an unregistered weight label key, a registered key that has
// vanished, a new ruled-open site, or a new shared weight helper all fail until a human
// registers them and, in doing so, has to think about the value.
import fs from 'fs';
import path from 'path';

const SOURCE = path.join(__dirname, '..', '..', 'components', 'FullDfoForm.tsx');

// ── THE REGISTRY — every identifier this guard scans for ────────────────────────────────
// Named here, and repeated in docs/GATE_S154B_WEIGHT_DISPLAY.md, so the blind spot is legible.
export const SCANNED_IDENTIFIERS = {
  /** the label helper — appends the unit word: "ESTIMATED KEPT WEIGHT (LBS)" */
  label: 'wLabel',
  /** the value converter — a closed weight read back in the unit it was closed in */
  value: 'showWeight',
  /** the row-summary form, label and value together: "200 lbs" */
  suffix: 'wSuffix',
  /** reading a close stamp out of enclosing scope — what a shared helper must never do */
  stampReads: ["isClosed(", 'closeUnits.'],
};

/** Every locale key that names a WEIGHT. An unregistered key passed to wLabel fails CHECK 1. */
export const WEIGHT_LABEL_KEYS = [
  'form234.catchWeightLabel',   // CATCH.KEPT_WT
  'form234.sarWtLabel',         // SAR.WT
  'form234.transferWtLabel',    // TRANSFER_DTL.WT
  'form234.personalUseLabel',   // PCONS.WT (personal use)
  'form234.totalWeightLabel',   // HLIN.TOT_WT_ONBRD
  'form234.weightLbsLabel',     // BT_WT / PCONS.WT — the bait+bycatch sheet
];

/**
 * Sites RULED to draw an OPEN value only, so they correctly do NOT convert (S154B R4).
 * The bait/bycatch add-edit sheet: a closed row cannot open it — both cards replace the
 * Edit|Close pair with the lock bar — so its value is always what he is typing right now.
 * These must call wLabel with a LITERAL false and must NOT convert. Any new entry here is a
 * deliberate, reviewed exception.
 */
export const RULED_OPEN_KEYS = ['form234.weightLbsLabel'];

/** Shared weight helpers that MUST be told their stamps rather than reading them (CHECK 2). */
export const REGISTERED_SHARED_WEIGHT_HELPERS = ['extraSummary'];

// ── source-reading primitives ───────────────────────────────────────────────────────────

/** Split a call's argument text on top-level commas. */
function splitTopLevel(inner: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of inner) {
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch;
  }
  parts.push(cur.trim());
  return parts.map(p => p.replace(/\s+/g, ' ').trim());
}

/** The paren-balanced arguments of the call whose name starts at `at`. */
function callArgs(src: string, at: number, name: string): string[] {
  let i = at + name.length + 1;
  let depth = 0;
  let inner = '';
  while (i < src.length) {
    const ch = src[i];
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') {
      if (depth === 0) break;
      depth--;
    }
    inner += ch;
    i++;
  }
  return splitTopLevel(inner);
}

export interface CallSite { line: number; index: number; args: string[] }

/** Every call to `name(` — definitions (`const name = `) do not match, having a space. */
function callSitesOf(src: string, name: string): CallSite[] {
  const out: CallSite[] = [];
  const re = new RegExp('(?<![\\w.])' + name + '\\(', 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    out.push({
      line: src.slice(0, m.index).split('\n').length,
      index: m.index,
      args: callArgs(src, m.index, name),
    });
  }
  return out;
}

/** The body text of `const NAME = (...) => …`, walked paren-balanced from the arrow. */
function arrowBody(src: string, startIdx: number): string {
  const arrow = src.indexOf('=>', startIdx);
  if (arrow < 0) return '';
  let i = arrow + 2;
  let depth = 0;
  let opened = false;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '(' || ch === '[' || ch === '{') { depth++; opened = true; }
    else if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
      if (opened && depth === 0) return src.slice(arrow, i + 1);
      if (depth < 0) return src.slice(arrow, i);
    }
    i++;
  }
  return src.slice(arrow);
}

/** The character range of a named helper's body, so calls inside it can be excluded. */
function bodyRange(src: string, name: string): [number, number] {
  const m = new RegExp('^ {2}const ' + name + ' = ', 'm').exec(src);
  if (!m) return [-1, -1];
  const body = arrowBody(src, m.index);
  const start = src.indexOf(body, m.index);
  return [start, start + body.length];
}

// ── THE ANALYSIS ────────────────────────────────────────────────────────────────────────

export interface WeightWiringReport {
  /** wLabel calls on a registered weight key, in the 3-argument (converting) form */
  convertingLabels: { line: number; key: string; stamps: string }[];
  /** wLabel calls on a registered weight key in the 2-argument ruled-open form */
  ruledOpenLabels: { line: number; key: string; stamps: string }[];
  /** showWeight render calls (the definition and the use inside wSuffix are excluded) */
  valueConversions: { line: number; stamps: string }[];
  /** keys handed to wLabel that nobody registered — loud failure */
  unregisteredKeys: { line: number; key: string }[];
  /** registered keys that no longer appear at all — loud failure, stops a dead registry */
  vanishedKeys: string[];
  /**
   * Stamp pairs used by more weight LABELS than by converted VALUES — CHECK 1 faults.
   * Reported per stamp pair, listing EVERY label line that uses it, because when two
   * containers legitimately share a pair (effort 1 group 1 and effort 1 groups 2+ both close
   * under dgCloseEffort) the guard can prove one of them is unwired but cannot say which.
   * It names the candidates rather than accusing a line it has not actually convicted.
   */
  labelsWithoutValue: {
    stamps: string; keys: string[]; labelLines: number[]; valueLines: number[]; shortfall: number;
  }[];
  /** every component-level arrow helper that forwards to the converter */
  forwarders: { name: string; line: number; callers: number; readsStamps: string[] }[];
  /** forwarders reached from more than one call site */
  sharedForwarders: string[];
  /** shared forwarders that read a close stamp from enclosing scope — CHECK 2 faults */
  sharedForwardersReadingStamps: { name: string; line: number; reads: string[] }[];
}

export function analyseWeightWiring(src: string): WeightWiringReport {
  const [wsStart, wsEnd] = bodyRange(src, SCANNED_IDENTIFIERS.suffix);

  const convertingLabels: WeightWiringReport['convertingLabels'] = [];
  const ruledOpenLabels: WeightWiringReport['ruledOpenLabels'] = [];
  const unregisteredKeys: WeightWiringReport['unregisteredKeys'] = [];

  for (const site of callSitesOf(src, SCANNED_IDENTIFIERS.label)) {
    const key = site.args[0].replace(/^'|'$/g, '');
    if (!WEIGHT_LABEL_KEYS.includes(key)) { unregisteredKeys.push({ line: site.line, key }); continue; }
    const stamps = site.args.slice(1).join(', ');
    if (site.args.length >= 3) convertingLabels.push({ line: site.line, key, stamps });
    else ruledOpenLabels.push({ line: site.line, key, stamps });
  }

  const vanishedKeys = WEIGHT_LABEL_KEYS.filter(
    k => !convertingLabels.some(l => l.key === k) && !ruledOpenLabels.some(l => l.key === k),
  );

  // showWeight render sites: exclude the composition inside wSuffix (helper, not a render site)
  const valueConversions = callSitesOf(src, SCANNED_IDENTIFIERS.value)
    .filter(s => !(wsStart >= 0 && s.index > wsStart && s.index < wsEnd))
    .map(s => ({ line: s.line, stamps: s.args.slice(1).join(', ') }));

  // CHECK 1: every converting label's stamp pair must be matched, one for one, by a value
  // converted with the SAME pair. Counted per pair rather than consumed in file order — two
  // containers may legitimately share a pair, and a consuming pass would blame whichever of
  // them it happened to reach second. Report the shortfall and name every candidate.
  const labelsWithoutValue: WeightWiringReport['labelsWithoutValue'] = [];
  for (const stamps of Array.from(new Set(convertingLabels.map(l => l.stamps)))) {
    const labels = convertingLabels.filter(l => l.stamps === stamps);
    const values = valueConversions.filter(v => v.stamps === stamps);
    if (labels.length <= values.length) continue;
    labelsWithoutValue.push({
      stamps,
      keys: Array.from(new Set(labels.map(l => l.key))),
      labelLines: labels.map(l => l.line),
      valueLines: values.map(v => v.line),
      shortfall: labels.length - values.length,
    });
  }

  // CHECK 2: shared helpers that forward to the converter must be TOLD their stamps.
  const forwarders: WeightWiringReport['forwarders'] = [];
  const core = [SCANNED_IDENTIFIERS.value, SCANNED_IDENTIFIERS.suffix, SCANNED_IDENTIFIERS.label,
                'fieldUnit', 'unitWord'];
  const declRe = /^ {2}const (\w+) = (?:async )?\(/gm;
  let d: RegExpExecArray | null;
  while ((d = declRe.exec(src)) !== null) {
    const name = d[1];
    if (core.includes(name)) continue;
    const body = arrowBody(src, d.index);
    if (!body.includes(SCANNED_IDENTIFIERS.suffix + '(') && !body.includes(SCANNED_IDENTIFIERS.value + '(')) continue;
    const callers = (src.match(new RegExp('(?<![\\w.])' + name + '\\(', 'g')) || []).length;
    const readsStamps = SCANNED_IDENTIFIERS.stampReads.filter(r => body.includes(r));
    forwarders.push({ name, line: src.slice(0, d.index).split('\n').length, callers, readsStamps });
  }
  const sharedForwarders = forwarders.filter(f => f.callers > 1).map(f => f.name);
  const sharedForwardersReadingStamps = forwarders
    .filter(f => f.callers > 1 && f.readsStamps.length > 0)
    .map(f => ({ name: f.name, line: f.line, reads: f.readsStamps }));

  return {
    convertingLabels, ruledOpenLabels, valueConversions, unregisteredKeys, vanishedKeys,
    labelsWithoutValue, forwarders, sharedForwarders, sharedForwardersReadingStamps,
  };
}

// ────────────────────────────────────────────────────────────────────────────────────────
// THE FROZEN PRE-FIX EXCERPT.
// Copied VERBATIM out of `git show 605a35e:src/components/FullDfoForm.tsx` — lines 2050,
// 2127, 2387-2395, 2442 and 4678. It is here so the guard's ability to FAIL is proven on every
// run, for ever, not just once in a session log. A guard that has never failed is not a guard.
// Do not "fix" this fixture. It is a photograph of the defect.
// ────────────────────────────────────────────────────────────────────────────────────────
const PRE_FIX_605a35e = `
            <Text style={styles.effortBlockSummary} numberOfLines={1}>{extraSummary(g)}</Text>
            {nodeGroupField(nodeIdx, gIdx, wLabel('form234.catchWeightLabel', !!extraEffortNodes[nodeIdx]?.closeDt, extraEffortNodes[nodeIdx]?.closeUnit), 'catchWeight', 'numeric', isRequired('catchWeight'))}
  const extraSummary = (e: ExtraEffortDetail): string => {
    const parts: string[] = [];
    if (subformId === 90 && e.lgridDisplay) parts.push(t('form234.summaryLgrid', { g: e.lgridDisplay }));
    if (subformId === 88 && e.gridDisplay) parts.push(t('form234.summaryGrid', { g: e.gridDisplay }));
    if (subformId === 91 && e.statSectDisplay) parts.push(e.statSectDisplay);
    if (e.catchWeight?.trim()) parts.push(wSuffix(e.catchWeight.trim(), isClosed('dgCloseEffort'), closeUnits.dgCloseEffortUnit));
    if (e.trapHauls?.trim()) parts.push(t('form234.haulsSuffix', { n: e.trapHauls.trim() }));
    return parts.length > 0 ? parts.join(' - ') : t('form234.effortBlockEmpty');
  };
            <Text style={styles.effortBlockSummary} numberOfLines={1}>{extraSummary(e)}</Text>
            {extraField(i, wLabel('form234.catchWeightLabel', isClosed('dgCloseEffort'), closeUnits.dgCloseEffortUnit), 'catchWeight', 'numeric', isRequired('catchWeight'))}
                <Text style={styles.effortBlockSummary} numberOfLines={1}>{extraSummary(block1Detail())}</Text>
`;

describe('S154B guard — the guard itself can FAIL (frozen 605a35e excerpt)', () => {
  const bad = analyseWeightWiring(PRE_FIX_605a35e);

  test('CHECK 1 catches the two sites whose VALUE was never converted', () => {
    // Two labels went through the converter; no value did.
    expect(bad.convertingLabels).toHaveLength(2);
    expect(bad.valueConversions).toHaveLength(0);
    expect(bad.labelsWithoutValue).toHaveLength(2);
    const stamps = bad.labelsWithoutValue.map(f => f.stamps).sort();
    expect(stamps).toEqual([
      "!!extraEffortNodes[nodeIdx]?.closeDt, extraEffortNodes[nodeIdx]?.closeUnit",  // :2127
      "isClosed('dgCloseEffort'), closeUnits.dgCloseEffortUnit",                     // :2528
    ]);
    // Each pair is short by exactly one converted value, and none was converted at all here.
    expect(bad.labelsWithoutValue.map(f => f.shortfall)).toEqual([1, 1]);
    expect(bad.labelsWithoutValue.every(f => f.valueLines.length === 0)).toBe(true);
  });

  test('CHECK 2 catches the shared helper that read effort 1 out of its own scope', () => {
    expect(bad.sharedForwarders).toContain('extraSummary');
    const fault = bad.sharedForwardersReadingStamps.find(f => f.name === 'extraSummary');
    expect(fault).toBeDefined();
    expect(fault!.reads.sort()).toEqual(['closeUnits.', 'isClosed(']);
  });

  test('the two checks catch DIFFERENT faults — neither alone covers 605a35e', () => {
    // CHECK 1 is blind to the extraSummary fault: extraSummary draws no wLabel at all, so no
    // amount of label/value pairing can see it. Its two faults are the field sites only.
    expect(bad.labelsWithoutValue.flatMap(f => f.keys))
      .toEqual(['form234.catchWeightLabel', 'form234.catchWeightLabel']);
    // CHECK 2 is blind to the two field sites: they are not shared helpers at all.
    expect(bad.sharedForwardersReadingStamps.map(f => f.name))
      .toEqual(['extraSummary']);
  });
});

describe('S154B guard — CHECK 1: every labelled weight has a converted value', () => {
  const src = fs.readFileSync(SOURCE, 'utf8');
  const r = analyseWeightWiring(src);

  test('every key handed to wLabel is a REGISTERED weight key (fails loud on a new one)', () => {
    expect(r.unregisteredKeys).toEqual([]);
  });

  test('every registered key still exists (fails loud on a dead registry entry)', () => {
    expect(r.vanishedKeys).toEqual([]);
  });

  test('the ruled-open sites are exactly the reviewed exceptions, and pass a literal false', () => {
    expect(r.ruledOpenLabels.map(l => l.key)).toEqual(RULED_OPEN_KEYS);
    for (const l of r.ruledOpenLabels) expect(l.stamps).toBe('false');
  });

  test('⭐ every converting weight LABEL has a VALUE converted with the same stamps', () => {
    // This is the S154 defect, stated as an invariant: a label that converts while its value
    // does not is exactly a raw kilogram figure under an (LBS) heading.
    expect(r.labelsWithoutValue).toEqual([]);
  });

  test('the catch weight is wired at all three of its containers', () => {
    const catchSites = r.convertingLabels.filter(l => l.key === 'form234.catchWeightLabel');
    expect(catchSites).toHaveLength(3);   // effort 1 group 1, effort 1 groups 2+, efforts 2+
  });
});

describe('S154B guard — CHECK 2: a shared weight helper is TOLD its stamps', () => {
  const src = fs.readFileSync(SOURCE, 'utf8');
  const r = analyseWeightWiring(src);

  test('the set of shared weight helpers is the registered one (fails loud on a new one)', () => {
    expect(r.sharedForwarders.sort()).toEqual([...REGISTERED_SHARED_WEIGHT_HELPERS].sort());
  });

  test('⭐ no shared weight helper reads a close stamp from its own scope', () => {
    // A helper reached from several containers cannot know whose weight it is drawing. If it
    // reads isClosed(...)/closeUnits... itself it is guessing, and at 605a35e it guessed
    // effort 1 while describing an effort 2+ node.
    expect(r.sharedForwardersReadingStamps).toEqual([]);
  });
});
