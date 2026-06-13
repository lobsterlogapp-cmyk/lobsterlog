// DFO ELOG XML Generator — conforms to DFO Standard v6.1
// No correction/amendment mechanism (Session 48 decision): every transmission is a new
// completed log, read-only after sending.
// All weights in kg. Dates: XSD date_12 = YYYYMMDDHHMM, date_14 = YYYYMMDDHHMMSS (UTC,
// digits only). Flat ISO-8601 fields still inside TRIP are S2/S3 scope.

import forge from 'node-forge';
import { DfoLog } from './dfoLogStorage';
import { CaptainProfile } from './captainStorage';
import { getDfoBaitTypeList, getDfoPconsSpeciesList, DFO_SPECIE_FRM_ID, DFO_PCONS_OTHER_SIZE_ID, DFO_GEAR_ID, DFO_SOFT_VER, DFO_CIE_ID, DFO_FORM_VER_ID, DFO_HLIN_COMPANY_LIST, DFO_HLOUT_COMPANY_LIST, DFO_SUBFORM_REGISTRY, DFO_FMA_38B, DFO_FMA_NB_VNTCH, DFO_FMA_NB_VNTCH_YOU } from './dfoConstants';
import { MV_PARTNERSHIP_TYPE } from '../data/reftables';

export function generateReportUid(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let uid = '';
  for (let i = 0; i < 6; i++) {
    uid += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return uid;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Combines dateFished (YYYY-MM-DD) and a HH:MM time into a UTC ISO 8601 string,
// treating the inputs as device-local time.
function localToUtcIso(dateStr: string, timeStr: string): string {
  if (!dateStr) return '';
  const [y, mo, d] = dateStr.split('-').map(Number);
  if (isNaN(y) || isNaN(mo) || isNaN(d)) return '';
  let h = 0, mi = 0;
  if (timeStr) {
    const parts = timeStr.split(':').map(Number);
    h = isNaN(parts[0]) ? 0 : parts[0];
    mi = isNaN(parts[1]) ? 0 : parts[1];
  }
  return new Date(y, mo - 1, d, h, mi, 0, 0).toISOString();
}

function kgStr(lbs: string, inLbs: boolean): string {
  const n = parseFloat(lbs);
  if (isNaN(n) || n <= 0) return '';
  return (inLbs ? n / 2.20462 : n).toFixed(2);
}

function tag(name: string, value: string, indent: string = '  '): string {
  if (!value || !value.trim()) return '';
  return `${indent}<${name}>${xmlEscape(value.trim())}</${name}>\n`;
}

// XSD date_14 = YYYYMMDDHHMMSS (UTC, digits only)
export function toCloseTimestamp(isoStr?: string): string {
  const dt = isoStr ? new Date(isoStr) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}` +
         `${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}${pad(dt.getUTCSeconds())}`;
}

// XSD date_12 = YYYYMMDDHHMM (UTC, digits only — no '-'/'T'/':'/'Z'/ms)
function toDate12(isoStr: string): string {
  if (!isoStr) return '';
  const dt = new Date(isoStr);
  if (isNaN(dt.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}` +
         `${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}`;
}

export function generateElogXml(log: DfoLog, captainProfile: CaptainProfile): string {
  const d = log.data;
  const inLbs = captainProfile.units === 'lbs';
  const subformId = log.subformId ?? 90;
  const regId = log.regId ?? 1004;

  const startDt     = localToUtcIso(log.dateFished, d.timeSailed);
  const haulStartDt = localToUtcIso(log.dateFished, d.timeStartedHauling);
  const haulEndDt   = localToUtcIso(log.dateFished, d.timeStoppedHauling);
  const landDt      = localToUtcIso(log.dateFished, d.timeOfLanding);

  let crewNb = '';
  try {
    const crew = JSON.parse(d.crewRegistry || '[]');
    if (Array.isArray(crew) && crew.length > 0) crewNb = String(crew.length);
  } catch { /* noop */ }

  const catchWtKg = kgStr(d.catchWeight, inLbs);

  // BAIT_USED — XSD bait_used_type: BT_TYP_ID, BT_WT, BT_COND_ID?, DG_CLOSE_DT, REM?
  // One repeating <BAIT_USED> node per bait entry.
  let baitXml = '';
  try {
    const baitList = getDfoBaitTypeList(subformId);
    const entries: { type: string; lbs: string }[] = JSON.parse(d.baitEntries || '[]');
    const baitCloseDt = toCloseTimestamp(d.dgCloseBaitUsed);
    baitXml = entries.map(e => {
      const match = baitList.find(b => b.label === e.type);
      const typeCode = match ? String(match.codeId) : '0';
      const wtKg = kgStr(e.lbs, inLbs);
      if (!wtKg) return '';
      // BT_COND_ID: conditional per bait type (Item 13, Rules 3060/984/NL-block) —
      // no condition field in the bait UI yet; optional in XSD, omitted for now
      return `    <BAIT_USED>\n` +
             tag('BT_TYP_ID',   typeCode, '      ') +
             tag('BT_WT',       wtKg, '      ') +
             tag('DG_CLOSE_DT', baitCloseDt, '      ') +
             `    </BAIT_USED>\n`;
    }).join('');
  } catch { /* noop */ }

  let pconsXml = '';
  try {
    const pconsList = getDfoPconsSpeciesList(subformId);
    const bycatch: { species: string; lbs: string; usage?: string }[] = JSON.parse(d.bycatchEntries || '[]');
    const closeDt = toCloseTimestamp(d.dgClosePcons);
    const parts: string[] = [];

    for (const e of bycatch) {
      const match = pconsList.find(p => p.label === e.species);
      const specieId = match ? String(match.codeId) : '0';
      const wt = kgStr(e.lbs, inLbs);
      if (!wt) continue;
      const szId = specieId === '1312' ? '826' : String(DFO_PCONS_OTHER_SIZE_ID);
      const usgLine = subformId === 90 && e.usage ? `      <USG_ID>${xmlEscape(e.usage)}</USG_ID>\n` : '';
      parts.push(
        `    <PCONS>\n` +
        `      <SPECIE_ID>${xmlEscape(specieId)}</SPECIE_ID>\n` +
        `      <SPECIE_FRM_ID>${DFO_SPECIE_FRM_ID}</SPECIE_FRM_ID>\n` +
        `      <SPECIE_SZ_ID>${szId}</SPECIE_SZ_ID>\n` +
        `      <WT>${wt}</WT>\n` +
        usgLine +
        `      <DG_CLOSE_DT>${closeDt}</DG_CLOSE_DT>\n` +
        `    </PCONS>\n`
      );
    }

    const personalUseWt = kgStr(d.personalUse ?? '', inLbs);
    if (personalUseWt) {
      parts.push(
        `    <PCONS>\n` +
        `      <SPECIE_ID>1312</SPECIE_ID>\n` +
        `      <SPECIE_FRM_ID>${DFO_SPECIE_FRM_ID}</SPECIE_FRM_ID>\n` +
        `      <SPECIE_SZ_ID>826</SPECIE_SZ_ID>\n` +
        `      <WT>${personalUseWt}</WT>\n` +
        `      <USG_ID>37822</USG_ID>\n` +
        `      <DG_CLOSE_DT>${closeDt}</DG_CLOSE_DT>\n` +
        `    </PCONS>\n`
      );
    }

    pconsXml = parts.join('');
  } catch { /* noop */ }

  const mammalInc = d.mmYes === 'true' ? 'Y' : (d.mmYes === 'false' ? 'N' : '');
  const sarInc    = d.sarYes === 'true' ? 'Y' : (d.sarYes === 'false' ? 'N' : '');
  const lostGear  = d.lostGearYes === 'true' ? 'Y' : (d.lostGearYes === 'false' ? 'N' : '');

  // GENERAL_INFO — XSD general_info_type xs:sequence:
  //   CIE_ID, SOFT_VER, REG_ID, FIN, VRN, FORM_VER_ID, SUBFORM_ID
  let generalInfo = '';
  generalInfo += tag('CIE_ID',      DFO_CIE_ID, '    ');
  generalInfo += tag('SOFT_VER',    DFO_SOFT_VER, '    ');
  generalInfo += tag('REG_ID',      String(regId), '    ');
  generalInfo += tag('FIN',         captainProfile.dfoFin, '    ');
  generalInfo += tag('VRN',         captainProfile.vesselNumber, '    ');
  generalInfo += tag('FORM_VER_ID', String(DFO_FORM_VER_ID), '    ');
  generalInfo += tag('SUBFORM_ID',  String(subformId), '    ');

  // TRIP — XSD trip_type xs:sequence (scalar members):
  //   TRIP_NUM, OPER_NAME, START_DT, CREW_NB?, PORT_ID?, OBS_TRIP_NUM?, FIRST_ENTRY_DT,
  //   USE_CR_IND?, PRTNSHP_ID?, LGBK_UID, REM?
  let trip = '';
  // TRIP_NUM: Rule 48 — sequential per vessel trip, allocated at log creation
  trip += tag('TRIP_NUM',  String(log.tripNum ?? 1), '    ');
  trip += tag('OPER_NAME', captainProfile.operatorName, '    ');
  trip += tag('START_DT',  toDate12(startDt), '    ');
  // CREW_NB: Mandatory for QC(88) and MAR(90), Blocked for GLF(89) and NL(91)
  if (subformId === 88 || subformId === 90) trip += tag('CREW_NB', crewNb, '    ');
  // PORT_ID: Mandatory for QC(88) and NL(91), Blocked for GLF(89) and MAR(90)
  // TODO open question 4: XSD wants an integer PORT_ID code; departurePort is still a
  // free-text name — retype pending the ports name→code decision (blueprint §F)
  if (subformId === 88 || subformId === 91) trip += tag('PORT_ID', d.departurePort, '    ');
  // OBS_TRIP_NUM: Optional for MAR(90) only, Blocked for 88/89/91
  if (subformId === 90) trip += tag('OBS_TRIP_NUM', d.obsTripNum ?? '', '    ');
  trip += tag('FIRST_ENTRY_DT', toCloseTimestamp(log.firstEntryDt || undefined), '    ');
  // USE_CR_IND / PRTNSHP_ID: Mandatory for QC(88) only, Blocked for 89/90/91.
  // USE_CR_IND initial value 'N' (Rule 639); PRTNSHP_ID from MV_PARTNERSHIP_TYPE.
  if (subformId === 88) {
    trip += tag('USE_CR_IND', d.useCrInd === 'Y' ? 'Y' : 'N', '    ');
    trip += tag('PRTNSHP_ID', d.prtnshpId ?? '', '    ');
  }
  trip += tag('LGBK_UID', log.lgbkUid, '    ');

  // EFFORT — XSD effort_type xs:sequence (single effort per log):
  //   START_DT, END_DT, LIC_NO, FMA_ID, SAR_IND, LOST_GEAR_IND, MM_INTER_IND,
  //   DG_CLOSE_DT, REM?, TGT_SPECIES, EFFORT_BY_GEAR+
  let effort = '';
  effort += `    <EFFORT>\n`;
  effort += tag('START_DT',      toDate12(haulStartDt), '      ');
  effort += tag('END_DT',        toDate12(haulEndDt), '      ');
  // LIC_NO: the XSD's only licence element (string_18, mandatory) — LICENCE_NO dropped
  effort += tag('LIC_NO',        captainProfile.dfoLicenceNo, '      ');
  effort += tag('FMA_ID',        d.fmaId, '      ');
  // SAR_IND/LOST_GEAR_IND/MM_INTER_IND are mandatory Y/N — empty means unanswered, the
  // element is simply omitted here and the send must be blocked upstream (S4 validator)
  effort += tag('SAR_IND',       sarInc, '      ');
  effort += tag('LOST_GEAR_IND', lostGear, '      ');
  effort += tag('MM_INTER_IND',  mammalInc, '      ');
  effort += tag('DG_CLOSE_DT',   toCloseTimestamp(d.dgCloseEffort), '      ');
  // TGT_SPECIES: 1312 = lobster
  effort += `      <TGT_SPECIES>\n${tag('SPECIE_ID', '1312', '        ')}      </TGT_SPECIES>\n`;
  effort += `      <EFFORT_BY_GEAR>\n`;
  // GEAR_ID: 925 = Pot/Trap (Rule 270, mandatory all subforms)
  effort += tag('GEAR_ID', String(DFO_GEAR_ID), '        ');
  // GEAR_SBTYP_ID: Mandatory for NL(91), Blocked for QC/GLF/MAR (88/89/90)
  if (subformId === 91) effort += tag('GEAR_SBTYP_ID', d.gearSubtypeId ?? '', '        ');
  effort += `        <EFFORT_DETAIL>\n`;
  // SOAKED_DUR: blocked for MAR (subform 90) per subforms requirements v234.11.
  // UI captures DAYS (Rule 286); the wire unit is MINUTES (XML dictionary
  // UNIT_OF_MEASURE_ID 11850 = MIN), so convert days → minutes here.
  // Rule 165 cap (216 h = 12960 min) is enforced by the validator.
  if (subformId !== 90) {
    const soakDays = parseFloat(d.soakDuration);
    const soakMin = isNaN(soakDays) || soakDays <= 0 ? '' : String(Math.round(soakDays * 1440));
    effort += tag('SOAKED_DUR', soakMin, '          ');
  }
  // NB_VNTCH / NB_VNTCH_YOU: QC(88) only, mandatory/blocked by FMA (Rules 623-626)
  if (subformId === 88 && DFO_FMA_NB_VNTCH.has(Number(d.fmaId))) {
    effort += tag('NB_VNTCH', d.vNotchCount ?? '', '          ');
  }
  if (subformId === 88 && DFO_FMA_NB_VNTCH_YOU.has(Number(d.fmaId))) {
    effort += tag('NB_VNTCH_YOU', d.nbVntchYou ?? '', '          ');
  }
  effort += tag('NB_GEAR_HLD',  d.trapHauls, '          ');
  effort += tag('LGRID_ID',     d.lgridCodeId, '          ');
  // GEAR_GRP_NUM: sequential from 1 per EFFORT node (Rule 609x); always 1 for single-effort log
  effort += tag('GEAR_GRP_NUM', '1', '          ');
  // LAT/LONG: Rule 3059 — MAR(90) FMA 38b only (mandatory there, blocked in all other
  // MAR FMAs). MODE attribute per Standard v6.1 §11.3: G = GPS-captured, M = manual
  // entry/edit (open question 3 resolution; d.gpsSrc tracked by FullDfoForm).
  if (subformId === 90 && Number(d.fmaId) === DFO_FMA_38B && d.gpsLat && d.gpsLng) {
    const coordMode = d.gpsSrc === 'gps' ? 'G' : 'M';
    effort += `          <LAT MODE="${coordMode}">${xmlEscape(d.gpsLat)}</LAT>\n`;
    effort += `          <LONG MODE="${coordMode}">${xmlEscape(d.gpsLng)}</LONG>\n`;
  }
  effort += `          <CATCH>\n`;
  effort += tag('SPECIE_ID',     '1312', '            ');
  effort += tag('KEPT_WT',       catchWtKg, '            ');
  effort += tag('SPECIE_FRM_ID', String(DFO_SPECIE_FRM_ID), '            ');
  // NB_SPCMN_BRD: lobster in MAR(90) FMA 38b only — mandatory there (Rule 654),
  // blocked for every other FMA (Rule 655) and species (Rule 653)
  if (subformId === 90 && Number(d.fmaId) === DFO_FMA_38B) {
    effort += tag('NB_SPCMN_BRD', d.nbSpcmnBrd ?? '', '            ');
  }
  effort += `          </CATCH>\n`;
  effort += `        </EFFORT_DETAIL>\n`;
  effort += `      </EFFORT_BY_GEAR>\n`;
  effort += `    </EFFORT>\n`;

  // TRIP data groups in XSD trip_type order:
  //   BAIT_USED, SAR, HLIN, HLOUT, PCONS, EFFORT, LANDING, TRANSFER
  let body = '';
  body += baitXml;
  // SAR node NOT emitted yet — sar_type mandates NB_SPCMN and SPCMN_COND_ID (no UI
  // fields exist for either) and LAT/LONG with the required MODE="M"|"G" attribute
  // (open question 3). The EFFORT.SAR_IND flag still transmits; the SAR detail data
  // (sarSpecies/sarLat/sarLng/sarDate) stays app-side until those are resolved.
  // HLIN/HLOUT: Rules 2024/2025/1018 — emit only for FMA 28599 (38b) and 1595 (41)
  if (Number(d.fmaId) === 28599 || Number(d.fmaId) === 1595) {
    if (d.hlinCompany || d.hlinConfirmNo) {
      // HLIN_CIE_ID: integer company code via label→codeId lookup (Rule 27);
      // '0' when unmatched — TODO open question 4 (companies name→code confirmation)
      const hlinCie = DFO_HLIN_COMPANY_LIST.find(c => c.label === d.hlinCompany);
      body += `    <HLIN>\n`;
      body += tag('HLIN_CIE_ID',  hlinCie ? String(hlinCie.codeId) : '0', '      ');
      body += tag('HLIN_NUM',     d.hlinConfirmNo ?? '', '      ');
      body += tag('ETA_DT',       toDate12(d.hlinEta ?? ''), '      ');
      body += tag('TOT_WT_ONBRD', kgStr(d.hlinTotalWeight ?? '', inLbs), '      ');
      body += tag('DG_CLOSE_DT',  toCloseTimestamp(d.dgCloseHlin), '      ');
      body += `    </HLIN>\n`;
    }
    if (d.hloutCompany || d.hloutConfirmNo) {
      const hloutCie = DFO_HLOUT_COMPANY_LIST.find(c => c.label === d.hloutCompany);
      body += `    <HLOUT>\n`;
      body += tag('HLOUT_CIE_ID', hloutCie ? String(hloutCie.codeId) : '0', '      ');
      body += tag('HLOUT_NUM',    d.hloutConfirmNo ?? '', '      ');
      body += tag('DG_CLOSE_DT',  toCloseTimestamp(d.dgCloseHlout), '      ');
      body += `    </HLOUT>\n`;
    }
  }
  body += pconsXml;
  body += effort;
  // LANDING — XSD landing_type: START_DT, PORT_ID, VRN?, DG_CLOSE_DT, REM?
  if (landDt) {
    body += `    <LANDING>\n`;
    body += tag('START_DT', toDate12(landDt), '      ');
    // PORT_ID: mandatory in landing_type but emission gated to QC(88)/NL(91), still
    // free-text — TODO open question 4 (ports name→integer-code; whether MAR emits
    // LANDING.PORT_ID — DFO_MAR_PORT_LIST exists for it). MAR output will fail xmllint
    // here until resolved.
    if (subformId === 88 || subformId === 91) body += tag('PORT_ID', d.portLanded, '      ');
    // LANDING.VRN: carrier vessel — mandatory when USE_CR_IND='Y' (Rule 642),
    // blocked otherwise (Rule 641)
    if (subformId === 88 && d.useCrInd === 'Y') body += tag('VRN', d.carrierVrn ?? '', '      ');
    body += tag('DG_CLOSE_DT', toCloseTimestamp(d.dgCloseLanding), '      ');
    body += `    </LANDING>\n`;
  }
  // TRANSFER / TRANSFER_DTL: QC(88) only, Blocked for GLF/MAR/NL (89/90/91).
  // FROM side is always this vessel (Rule 251: one of FROM_VRN/FROM_PND_NUM);
  // TO side is a vessel VRN or a pond number, never both (Rule 252).
  // TRANSFER_DTL: lobster only (Rule 249: SPECIE_ID 1312), Round (Rule 250: 4691).
  if (subformId === 88 && d.transferYes === 'true') {
    const trnsfWtKg = kgStr(d.transferWt ?? '', inLbs);
    const trnsfDt = toDate12(localToUtcIso(log.dateFished, d.transferTime ?? ''));
    if (trnsfWtKg) {
      body += `    <TRANSFER>\n`;
      body += tag('TRNSF_DT', trnsfDt, '      ');
      body += tag('FROM_VRN', captainProfile.vesselNumber, '      ');
      if (d.transferToPndNum) body += tag('TO_PND_NUM', d.transferToPndNum, '      ');
      else body += tag('TO_VRN', d.transferToVrn ?? '', '      ');
      body += tag('DG_CLOSE_DT', toCloseTimestamp(d.dgCloseTransfer), '      ');
      body += `      <TRANSFER_DTL>\n`;
      body += tag('SPECIE_ID', '1312', '        ');
      body += tag('SPECIE_FRM_ID', String(DFO_SPECIE_FRM_ID), '        ');
      body += tag('WT', trnsfWtKg, '        ');
      body += `      </TRANSFER_DTL>\n`;
      body += `    </TRANSFER>\n`;
    }
  }

  // <ELOG> carries NO attributes — the only one the XSD allows is NODE_ID, which is
  // DFO-internal and must never be emitted.
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
         `<ELOG>\n` +
         `  <GENERAL_INFO>\n${generalInfo}  </GENERAL_INFO>\n` +
         `  <TRIP>\n${trip}${body}  </TRIP>\n` +
         `</ELOG>`;
}

// ── Structural validation against the DFO Form 234 XSD (39673.234.xsd) ─────────────
// React Native has no native XSD validator, so this parses the document into a tree and
// walks it against a declarative mirror of the XSD complex-type sequences (S4 rewrite —
// the old flat, name-based checks predate the GENERAL_INFO/TRIP/EFFORT restructure).

interface XmlNode {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}

// Minimal parser for this generator's own output: element-only or text-only nodes,
// double-quoted attributes, no comments/CDATA/PIs (the XML declaration is stripped).
// Returns the root node, or an error string if the document is malformed.
function parseXml(xml: string): XmlNode | string {
  const src = xml.replace(/^\s*<\?xml[^?]*\?>\s*/, '');
  const tokenRe = /<(\/?)([A-Za-z_][\w]*)((?:\s+[\w]+="[^"]*")*)\s*(\/?)>|([^<]+)/g;
  const root: XmlNode = { name: '#root', attrs: {}, children: [], text: '' };
  const stack: XmlNode[] = [root];
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(src)) !== null) {
    const [, close, name, attrStr, selfClose, text] = m;
    const top = stack[stack.length - 1];
    if (text !== undefined) {
      if (text.trim()) top.text += text.trim();
      continue;
    }
    if (close) {
      if (top.name !== name) return `Malformed XML: </${name}> does not match open <${top.name}>`;
      stack.pop();
      continue;
    }
    const attrs: Record<string, string> = {};
    const attrRe = /([\w]+)="([^"]*)"/g;
    let a: RegExpExecArray | null;
    while ((a = attrRe.exec(attrStr || '')) !== null) attrs[a[1]] = a[2];
    const node: XmlNode = { name, attrs, children: [], text: '' };
    top.children.push(node);
    if (!selfClose) stack.push(node);
  }
  if (stack.length !== 1) return `Malformed XML: unclosed <${stack[stack.length - 1].name}>`;
  if (root.children.length !== 1) return 'Malformed XML: expected a single root element';
  return root.children[0];
}

// Leaf value types mirroring the XSD simple types
type LeafType = 'string' | 'int' | 'id' | 'date_12' | 'date_14' | 'ind_yn' | 'weight' | 'lat' | 'long';

const LEAF_CHECKS: Record<LeafType, { ok: (v: string) => boolean; want: string }> = {
  string:  { ok: v => v.length > 0, want: 'a non-empty string' },
  int:     { ok: v => /^\d+$/.test(v), want: 'a non-negative integer' },
  // integer_10 code-table ids are 1-based (e.g. BT_TYP_ID minInclusive=1) — catches the
  // '0' fallback emitted when a label→codeId lookup fails
  id:      { ok: v => /^\d+$/.test(v) && Number(v) >= 1, want: 'a positive integer code' },
  date_12: { ok: v => /^\d{4}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])[0-5]\d$/.test(v), want: 'date_12 (YYYYMMDDHHMM)' },
  date_14: { ok: v => /^\d{4}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])[0-5]\d[0-5]\d$/.test(v), want: 'date_14 (YYYYMMDDHHMMSS)' },
  ind_yn:  { ok: v => v === 'Y' || v === 'N', want: 'Y or N' },
  weight:  { ok: v => /^\d{1,6}(\.\d{1,3})?$/.test(v), want: 'a weight (max 6 integer digits, 3 decimals)' },
  lat:     { ok: v => /^\d{1,2}(\.\d{1,4})?$/.test(v) && Number(v) >= 38 && Number(v) <= 72, want: 'latitude 38–72, max 4 decimals' },
  long:    { ok: v => /^-\d{1,3}(\.\d{1,4})?$/.test(v) && Number(v) >= -148 && Number(v) <= -40, want: 'longitude -148…-40, max 4 decimals' },
};

interface ChildSpec {
  name: string;
  min: number;
  max: number; // Infinity = unbounded
  type?: LeafType;        // leaf element with a typed text value
  children?: ChildSpec[]; // complex element with an ordered xs:sequence
  // neither type nor children → contents not validated (e.g. TRANSFER, deferred Item 18)
}

const CATCH_SPEC: ChildSpec[] = [
  { name: 'SPECIE_ID',     min: 1, max: 1, type: 'id' },
  { name: 'KEPT_WT',       min: 0, max: 1, type: 'weight' },
  { name: 'NB_SPCMN_KEPT', min: 0, max: 1, type: 'int' },
  { name: 'NB_SPCMN_DISC', min: 0, max: 1, type: 'int' },
  { name: 'SPECIE_FRM_ID', min: 1, max: 1, type: 'id' },
  { name: 'NB_SPCMN_BRD',  min: 0, max: 1, type: 'int' },
  { name: 'REM',           min: 0, max: 1, type: 'string' },
];

const EFFORT_DETAIL_SPEC: ChildSpec[] = [
  { name: 'SOAKED_DUR',   min: 0, max: 1, type: 'int' },
  { name: 'NB_VNTCH',     min: 0, max: 1, type: 'int' },
  { name: 'NB_VNTCH_YOU', min: 0, max: 1, type: 'int' },
  { name: 'NB_GEAR_HLD',  min: 1, max: 1, type: 'int' },
  { name: 'LGRID_ID',     min: 0, max: 1, type: 'id' },
  { name: 'GRID_ID',      min: 0, max: 1, type: 'id' },
  { name: 'GEAR_GRP_NUM', min: 1, max: 1, type: 'int' },
  { name: 'LAT',          min: 0, max: 1, type: 'lat' },
  { name: 'LONG',         min: 0, max: 1, type: 'long' },
  { name: 'TRP_SZ_ID',    min: 0, max: 1, type: 'id' },
  { name: 'STAT_SECT_ID', min: 0, max: 1, type: 'id' },
  { name: 'REM',          min: 0, max: 1, type: 'string' },
  { name: 'CATCH',        min: 1, max: Infinity, children: CATCH_SPEC },
];

const EFFORT_SPEC: ChildSpec[] = [
  { name: 'START_DT',      min: 1, max: 1, type: 'date_12' },
  { name: 'END_DT',        min: 1, max: 1, type: 'date_12' },
  { name: 'LIC_NO',        min: 1, max: 1, type: 'string' },
  { name: 'FMA_ID',        min: 1, max: 1, type: 'id' },
  { name: 'SAR_IND',       min: 1, max: 1, type: 'ind_yn' },
  { name: 'LOST_GEAR_IND', min: 1, max: 1, type: 'ind_yn' },
  { name: 'MM_INTER_IND',  min: 1, max: 1, type: 'ind_yn' },
  { name: 'DG_CLOSE_DT',   min: 1, max: 1, type: 'date_14' },
  { name: 'REM',           min: 0, max: 1, type: 'string' },
  { name: 'TGT_SPECIES',   min: 1, max: 1, children: [
    { name: 'SPECIE_ID', min: 1, max: 1, type: 'id' },
  ] },
  { name: 'EFFORT_BY_GEAR', min: 1, max: Infinity, children: [
    { name: 'GEAR_ID',       min: 1, max: 1, type: 'id' },
    { name: 'GEAR_SBTYP_ID', min: 0, max: 1, type: 'id' },
    { name: 'REM',           min: 0, max: 1, type: 'string' },
    { name: 'EFFORT_DETAIL', min: 1, max: 9999, children: EFFORT_DETAIL_SPEC },
  ] },
];

const TRIP_SPEC: ChildSpec[] = [
  { name: 'TRIP_NUM',       min: 1, max: 1, type: 'int' },
  { name: 'OPER_NAME',      min: 1, max: 1, type: 'string' },
  { name: 'START_DT',       min: 1, max: 1, type: 'date_12' },
  { name: 'CREW_NB',        min: 0, max: 1, type: 'int' },
  // PORT_ID is an integer code in the XSD; free-text names will fail here until the
  // ports name→code retype lands (open question 4)
  { name: 'PORT_ID',        min: 0, max: 1, type: 'id' },
  { name: 'OBS_TRIP_NUM',   min: 0, max: 1, type: 'string' },
  { name: 'FIRST_ENTRY_DT', min: 1, max: 1, type: 'date_14' },
  { name: 'USE_CR_IND',     min: 0, max: 1, type: 'ind_yn' },
  { name: 'PRTNSHP_ID',     min: 0, max: 1, type: 'id' },
  { name: 'LGBK_UID',       min: 1, max: 1, type: 'string' },
  { name: 'REM',            min: 0, max: 1, type: 'string' },
  { name: 'BAIT_USED', min: 0, max: Infinity, children: [
    { name: 'BT_TYP_ID',   min: 1, max: 1, type: 'id' },
    { name: 'BT_WT',       min: 1, max: 1, type: 'weight' },
    { name: 'BT_COND_ID',  min: 0, max: 1, type: 'id' },
    { name: 'DG_CLOSE_DT', min: 1, max: 1, type: 'date_14' },
    { name: 'REM',         min: 0, max: 1, type: 'string' },
  ] },
  { name: 'SAR', min: 0, max: Infinity, children: [
    { name: 'SAR_DT',        min: 1, max: 1, type: 'date_12' },
    { name: 'LAT',           min: 1, max: 1, type: 'lat' },
    { name: 'LONG',          min: 1, max: 1, type: 'long' },
    { name: 'SPECIE_ID',     min: 1, max: 1, type: 'id' },
    { name: 'NB_SPCMN',      min: 1, max: 1, type: 'int' },
    { name: 'WT',            min: 0, max: 1, type: 'weight' },
    { name: 'SPCMN_COND_ID', min: 1, max: 1, type: 'id' },
    { name: 'DG_CLOSE_DT',   min: 1, max: 1, type: 'date_14' },
    { name: 'REM',           min: 0, max: 1, type: 'string' },
  ] },
  { name: 'HLIN', min: 0, max: Infinity, children: [
    { name: 'HLIN_CIE_ID',  min: 1, max: 1, type: 'id' },
    { name: 'HLIN_NUM',     min: 1, max: 1, type: 'string' },
    { name: 'ETA_DT',       min: 0, max: 1, type: 'date_12' },
    { name: 'TOT_WT_ONBRD', min: 0, max: 1, type: 'weight' },
    { name: 'DG_CLOSE_DT',  min: 1, max: 1, type: 'date_14' },
    { name: 'REM',          min: 0, max: 1, type: 'string' },
  ] },
  { name: 'HLOUT', min: 0, max: Infinity, children: [
    { name: 'HLOUT_CIE_ID', min: 1, max: 1, type: 'id' },
    { name: 'HLOUT_NUM',    min: 1, max: 1, type: 'string' },
    { name: 'DG_CLOSE_DT',  min: 1, max: 1, type: 'date_14' },
    { name: 'REM',          min: 0, max: 1, type: 'string' },
  ] },
  { name: 'PCONS', min: 0, max: Infinity, children: [
    { name: 'SPECIE_ID',     min: 1, max: 1, type: 'id' },
    { name: 'SPECIE_FRM_ID', min: 1, max: 1, type: 'id' },
    { name: 'SPECIE_SZ_ID',  min: 0, max: 1, type: 'id' },
    { name: 'WT',            min: 1, max: 1, type: 'weight' },
    { name: 'USG_ID',        min: 0, max: 1, type: 'id' },
    { name: 'DG_CLOSE_DT',   min: 1, max: 1, type: 'date_14' },
    { name: 'REM',           min: 0, max: 1, type: 'string' },
  ] },
  { name: 'EFFORT', min: 0, max: Infinity, children: EFFORT_SPEC },
  { name: 'LANDING', min: 0, max: Infinity, children: [
    { name: 'START_DT',    min: 1, max: 1, type: 'date_12' },
    // XSD-mandatory; min 0 here only so the overlay below can emit a more specific
    // error message (pointing at open question 4) than the generic structural one
    { name: 'PORT_ID',     min: 0, max: 1, type: 'id' },
    { name: 'VRN',         min: 0, max: 1, type: 'string' },
    { name: 'DG_CLOSE_DT', min: 1, max: 1, type: 'date_14' },
    { name: 'REM',         min: 0, max: 1, type: 'string' },
  ] },
  // TRANSFER — XSD transfer_type (QC-88 only; Rules 248-252)
  { name: 'TRANSFER', min: 0, max: Infinity, children: [
    { name: 'TRNSF_DT',     min: 1, max: 1, type: 'date_12' },
    { name: 'FROM_VRN',     min: 0, max: 1, type: 'string' },
    { name: 'FROM_VNAME',   min: 0, max: 1, type: 'string' },
    { name: 'FROM_PND_NUM', min: 0, max: 1, type: 'string' },
    { name: 'TO_VRN',       min: 0, max: 1, type: 'string' },
    { name: 'TO_VNAME',     min: 0, max: 1, type: 'string' },
    { name: 'TO_PND_NUM',   min: 0, max: 1, type: 'string' },
    { name: 'DG_CLOSE_DT',  min: 1, max: 1, type: 'date_14' },
    { name: 'REM',          min: 0, max: 1, type: 'string' },
    { name: 'TRANSFER_DTL', min: 1, max: Infinity, children: [
      { name: 'SPECIE_ID',     min: 1, max: 1, type: 'id' },
      { name: 'SPECIE_FRM_ID', min: 1, max: 1, type: 'id' },
      { name: 'WT',            min: 1, max: 1, type: 'weight' },
      { name: 'REM',           min: 0, max: 1, type: 'string' },
    ] },
  ] },
];

const ELOG_SPEC: ChildSpec[] = [
  { name: 'GENERAL_INFO', min: 1, max: 1, children: [
    { name: 'CIE_ID',      min: 1, max: 1, type: 'id' },
    { name: 'SOFT_VER',    min: 1, max: 1, type: 'string' },
    { name: 'REG_ID',      min: 1, max: 1, type: 'id' },
    { name: 'FIN',         min: 1, max: 1, type: 'string' },
    { name: 'VRN',         min: 1, max: 1, type: 'string' },
    { name: 'FORM_VER_ID', min: 1, max: 1, type: 'id' },
    { name: 'SUBFORM_ID',  min: 1, max: 1, type: 'id' },
  ] },
  { name: 'TRIP', min: 1, max: Infinity, children: TRIP_SPEC },
];

function validateNode(node: XmlNode, spec: ChildSpec, path: string, errors: string[]): void {
  // Attributes: the only attribute anywhere in the XSD is DFO-internal NODE_ID (never
  // emitted) plus the required MODE="M"|"G" on LAT/LONG
  const isCoord = node.name === 'LAT' || node.name === 'LONG';
  for (const a of Object.keys(node.attrs)) {
    if (!(isCoord && a === 'MODE')) errors.push(`${path}: attribute ${a} is not allowed`);
  }
  if (isCoord) {
    const mode = node.attrs['MODE'];
    if (mode !== 'M' && mode !== 'G') errors.push(`${path}: requires MODE="M" or MODE="G", got "${mode ?? ''}"`);
  }

  if (spec.type) {
    if (node.children.length > 0) {
      errors.push(`${path}: expected a value, found child elements`);
      return;
    }
    const check = LEAF_CHECKS[spec.type];
    if (!check.ok(node.text)) errors.push(`${path}: expected ${check.want}, got "${node.text}"`);
    return;
  }
  if (!spec.children) return; // contents intentionally unvalidated (TRANSFER)
  if (node.text) errors.push(`${path}: unexpected text content "${node.text}"`);
  validateSequence(node, spec.children, path, errors);
}

// Walks an element's children against an ordered xs:sequence with occurrence bounds.
// Anything left over after the sequence is consumed is unexpected or out of order.
function validateSequence(node: XmlNode, specs: ChildSpec[], path: string, errors: string[]): void {
  let i = 0;
  for (const cs of specs) {
    let count = 0;
    while (i < node.children.length && node.children[i].name === cs.name) {
      const childPath = cs.max === 1 ? `${path}.${cs.name}` : `${path}.${cs.name}[${count + 1}]`;
      validateNode(node.children[i], cs, childPath, errors);
      count++;
      i++;
    }
    if (count < cs.min) errors.push(`${path}: missing required <${cs.name}>`);
    if (count > cs.max) errors.push(`${path}: too many <${cs.name}> (${count}, max ${cs.max})`);
  }
  for (; i < node.children.length; i++) {
    errors.push(`${path}: unexpected or out-of-order element <${node.children[i].name}>`);
  }
}

export function validateElogXml(xml: string, subformId: number): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const parsed = parseXml(xml);
  if (typeof parsed === 'string') return { valid: false, errors: [parsed] };
  if (parsed.name !== 'ELOG') return { valid: false, errors: [`Root element must be ELOG, got <${parsed.name}>`] };

  validateNode(parsed, { name: 'ELOG', min: 1, max: 1, children: ELOG_SPEC }, 'ELOG', errors);

  // ── Subform overlays (Subforms_requirements_234.xlsx v234.11) ──
  const get = (n: XmlNode, name: string): XmlNode[] => n.children.filter(c => c.name === name);

  const generalInfo = get(parsed, 'GENERAL_INFO')[0];
  if (generalInfo) {
    const sub = get(generalInfo, 'SUBFORM_ID')[0];
    if (sub && sub.text !== String(subformId)) {
      errors.push(`GENERAL_INFO.SUBFORM_ID is ${sub.text} but the log says ${subformId}`);
    }
    // Rule 985 (+979a-d): subform ↔ DFO administrative region cross-check
    const reg = get(generalInfo, 'REG_ID')[0];
    const expectedRegId = DFO_SUBFORM_REGISTRY[subformId]?.regId;
    if (reg && expectedRegId !== undefined && reg.text !== String(expectedRegId)) {
      errors.push(`GENERAL_INFO.REG_ID must be ${expectedRegId} for subform ${subformId} (Rule 985), got ${reg.text}`);
    }
  }

  // Current UTC moment as date_12 — date_12 strings are fixed-width digits, so
  // lexicographic comparison is chronological comparison
  const nowP = (n: number) => String(n).padStart(2, '0');
  const nowD = new Date();
  const nowDate12 =
    `${nowD.getUTCFullYear()}${nowP(nowD.getUTCMonth() + 1)}${nowP(nowD.getUTCDate())}` +
    `${nowP(nowD.getUTCHours())}${nowP(nowD.getUTCMinutes())}`;
  const isDate12 = (s: string) => /^\d{12}$/.test(s);

  get(parsed, 'TRIP').forEach((trip, ti) => {
    const p = `TRIP[${ti + 1}]`;
    // CREW_NB: Mandatory for QC(88)/MAR(90), Blocked for GLF(89)/NL(91)
    const crewNbNode = get(trip, 'CREW_NB')[0];
    if ((subformId === 88 || subformId === 90) && !crewNbNode) {
      errors.push(`${p}: CREW_NB is required for QC(88)/MAR(90)`);
    }
    // Rule 444: crew count between 1 and 20
    if (crewNbNode) {
      const n = Number(crewNbNode.text);
      if (!Number.isInteger(n) || n < 1 || n > 20) {
        errors.push(`${p}: CREW_NB must be between 1 and 20 (Rule 444), got ${crewNbNode.text}`);
      }
    }
    // Rule 181: LGBK_UID = six random uppercase letters
    const lgbk = get(trip, 'LGBK_UID')[0];
    if (lgbk && !/^[A-Z]{6}$/.test(lgbk.text)) {
      errors.push(`${p}: LGBK_UID must be 6 uppercase letters A-Z (Rule 181), got "${lgbk.text}"`);
    }
    // TRIP.PORT_ID: Mandatory for QC(88)/NL(91), Blocked for GLF(89)/MAR(90)
    if ((subformId === 88 || subformId === 91) && get(trip, 'PORT_ID').length === 0) {
      errors.push(`${p}: PORT_ID is required for QC(88)/NL(91)`);
    }
    // USE_CR_IND / PRTNSHP_ID: Mandatory for QC(88), Blocked for 89/90/91
    const useCr = get(trip, 'USE_CR_IND')[0];
    const prtnshp = get(trip, 'PRTNSHP_ID')[0];
    if (subformId === 88) {
      if (!useCr) errors.push(`${p}: USE_CR_IND is required for QC(88)`);
      if (!prtnshp) errors.push(`${p}: PRTNSHP_ID is required for QC(88)`);
      else if (!MV_PARTNERSHIP_TYPE.some(t => String(t.codeId) === prtnshp.text)) {
        errors.push(`${p}: PRTNSHP_ID ${prtnshp.text} is not in MV_PARTNERSHIP_TYPE`);
      }
    } else {
      if (useCr) errors.push(`${p}: USE_CR_IND is blocked for subform ${subformId}`);
      if (prtnshp) errors.push(`${p}: PRTNSHP_ID is blocked for subform ${subformId}`);
    }

    const tripStart = get(trip, 'START_DT')[0]?.text ?? '';
    let lastEffortEnd = '';

    const efforts = get(trip, 'EFFORT');
    // XSD allows 0..n, but a fishing-day log without an EFFORT is meaningless — block it
    if (efforts.length === 0) errors.push(`${p}: at least one EFFORT is required`);
    efforts.forEach((ef, ei) => {
      const ep = `${p}.EFFORT[${ei + 1}]`;
      const efStart = get(ef, 'START_DT')[0]?.text ?? '';
      const efEnd = get(ef, 'END_DT')[0]?.text ?? '';
      const efFma = Number(get(ef, 'FMA_ID')[0]?.text ?? 0);
      // Rule 30: effort start must not be in the future
      if (isDate12(efStart) && efStart > nowDate12) {
        errors.push(`${ep}: START_DT is in the future (Rule 30)`);
      }
      // Rule 29: effort start ≥ trip start
      if (isDate12(efStart) && isDate12(tripStart) && efStart < tripStart) {
        errors.push(`${ep}: START_DT is before TRIP.START_DT (Rule 29)`);
      }
      // Rule 32: effort end ≥ effort start
      if (isDate12(efStart) && isDate12(efEnd) && efEnd < efStart) {
        errors.push(`${ep}: END_DT is before START_DT (Rule 32)`);
      }
      if (isDate12(efEnd) && efEnd > lastEffortEnd) lastEffortEnd = efEnd;

      get(ef, 'EFFORT_BY_GEAR').forEach((ebg, gi) => {
        const gp = `${ep}.EFFORT_BY_GEAR[${gi + 1}]`;
        // GEAR_SBTYP_ID: Mandatory for NL(91), Blocked for 88/89/90
        if (subformId === 91 && get(ebg, 'GEAR_SBTYP_ID').length === 0) {
          errors.push(`${gp}: GEAR_SBTYP_ID is required for NL(91)`);
        }
        get(ebg, 'EFFORT_DETAIL').forEach((ed, di) => {
          const dp = `${gp}.EFFORT_DETAIL[${di + 1}]`;
          const soakedNode = get(ed, 'SOAKED_DUR')[0];
          // SOAKED_DUR: required for 88/89/91, blocked for MAR(90)
          if (subformId === 90 && soakedNode) {
            errors.push(`${dp}: SOAKED_DUR is blocked for MAR(90)`);
          }
          if (subformId !== 90 && !soakedNode) {
            errors.push(`${dp}: SOAKED_DUR is required for QC/GLF/NL`);
          }
          // Rule 165: soaked duration ≤ 216 hours (wire unit is minutes → 12960)
          if (soakedNode && Number(soakedNode.text) > 12960) {
            errors.push(`${dp}: SOAKED_DUR exceeds 216 hours / 12960 minutes (Rule 165), got ${soakedNode.text}`);
          }
          // Rules 623-626: NB_VNTCH / NB_VNTCH_YOU — QC FMA-conditional
          const vntch = get(ed, 'NB_VNTCH').length > 0;
          const vntchYou = get(ed, 'NB_VNTCH_YOU').length > 0;
          const vntchFma = subformId === 88 && DFO_FMA_NB_VNTCH.has(efFma);
          const vntchYouFma = subformId === 88 && DFO_FMA_NB_VNTCH_YOU.has(efFma);
          if (vntchFma && !vntch) errors.push(`${dp}: NB_VNTCH is mandatory for this FMA (Rule 624)`);
          if (!vntchFma && vntch) errors.push(`${dp}: NB_VNTCH is blocked for this FMA/subform (Rule 623)`);
          if (vntchYouFma && !vntchYou) errors.push(`${dp}: NB_VNTCH_YOU is mandatory for this FMA (Rule 626)`);
          if (!vntchYouFma && vntchYou) errors.push(`${dp}: NB_VNTCH_YOU is blocked for this FMA/subform (Rule 625)`);
          // Rule 3059: MAR(90) — LAT/LONG mandatory in FMA 38b (28599), blocked otherwise
          const hasLat = get(ed, 'LAT').length > 0;
          const hasLong = get(ed, 'LONG').length > 0;
          if (subformId === 90 && efFma === 28599 && (!hasLat || !hasLong)) {
            errors.push(`${dp}: LAT and LONG are mandatory for MAR FMA 38b (Rule 3059)`);
          }
          if (subformId === 90 && efFma !== 28599 && (hasLat || hasLong)) {
            errors.push(`${dp}: LAT/LONG are blocked outside MAR FMA 38b (Rule 3059)`);
          }
          // Rules 653/654/655: NB_SPCMN_BRD — lobster in MAR 38b only
          get(ed, 'CATCH').forEach((c, ci) => {
            const specie = get(c, 'SPECIE_ID')[0]?.text ?? '';
            const brd = get(c, 'NB_SPCMN_BRD').length > 0;
            const brdAllowed = subformId === 90 && efFma === 28599 && specie === '1312';
            if (brdAllowed && !brd) {
              errors.push(`${dp}.CATCH[${ci + 1}]: NB_SPCMN_BRD is mandatory for lobster in MAR FMA 38b (Rule 654)`);
            }
            if (!brdAllowed && brd) {
              errors.push(`${dp}.CATCH[${ci + 1}]: NB_SPCMN_BRD is blocked outside lobster/MAR FMA 38b (Rules 653/655)`);
            }
          });
        });
      });
    });

    // Rules 45/46: landing must follow trip start and the last effort end
    get(trip, 'LANDING').forEach((l, li) => {
      const landStart = get(l, 'START_DT')[0]?.text ?? '';
      if (isDate12(landStart) && isDate12(tripStart) && landStart < tripStart) {
        errors.push(`${p}.LANDING[${li + 1}]: START_DT is before TRIP.START_DT (Rule 45)`);
      }
      if (isDate12(landStart) && isDate12(lastEffortEnd) && landStart < lastEffortEnd) {
        errors.push(`${p}.LANDING[${li + 1}]: START_DT is before the last EFFORT.END_DT (Rule 46)`);
      }
      // Rules 641/642: LANDING.VRN mandatory iff USE_CR_IND='Y', blocked otherwise
      const landVrn = get(l, 'VRN').length > 0;
      const carrierYes = useCr?.text === 'Y';
      if (carrierYes && !landVrn) errors.push(`${p}.LANDING[${li + 1}]: VRN is required when USE_CR_IND='Y' (Rule 642)`);
      if (!carrierYes && landVrn) errors.push(`${p}.LANDING[${li + 1}]: VRN is blocked when USE_CR_IND is not 'Y' (Rule 641)`);
    });

    // TRANSFER: QC(88) only (blocked for 89/90/91); Rules 248/249/250/251/252
    const transfers = get(trip, 'TRANSFER');
    if (subformId !== 88 && transfers.length > 0) {
      errors.push(`${p}: TRANSFER is blocked for subform ${subformId}`);
    }
    transfers.forEach((tr, tri) => {
      const tp = `${p}.TRANSFER[${tri + 1}]`;
      const trnsfDt = get(tr, 'TRNSF_DT')[0]?.text ?? '';
      if (isDate12(trnsfDt) && isDate12(tripStart) && trnsfDt < tripStart) {
        errors.push(`${tp}: TRNSF_DT is before TRIP.START_DT (Rule 248)`);
      }
      const fromCount = get(tr, 'FROM_VRN').length + get(tr, 'FROM_PND_NUM').length;
      if (fromCount !== 1) errors.push(`${tp}: exactly one of FROM_VRN or FROM_PND_NUM is required (Rule 251)`);
      const toCount = get(tr, 'TO_VRN').length + get(tr, 'TO_PND_NUM').length;
      if (toCount !== 1) errors.push(`${tp}: exactly one of TO_VRN or TO_PND_NUM is required (Rule 252)`);
      get(tr, 'TRANSFER_DTL').forEach((dtl, di) => {
        const sp = get(dtl, 'SPECIE_ID')[0]?.text;
        if (sp !== '1312') errors.push(`${tp}.TRANSFER_DTL[${di + 1}]: SPECIE_ID must be 1312 (Rule 249)`);
        const frm = get(dtl, 'SPECIE_FRM_ID')[0]?.text;
        if (frm !== '4691') errors.push(`${tp}.TRANSFER_DTL[${di + 1}]: SPECIE_FRM_ID must be 4691 (Rule 250)`);
      });
    });

    // LANDING.PORT_ID is XSD-mandatory for ALL subforms — the DFO endpoint will reject
    // a LANDING without it, so the validator must block the send rather than green-light
    // a document xmllint rejects
    get(trip, 'LANDING').forEach((l, li) => {
      if (get(l, 'PORT_ID').length === 0) {
        errors.push(
          `${p}.LANDING[${li + 1}]: PORT_ID required — open question 4 (port codes) ` +
          `must be resolved before this subform can transmit.`
        );
      }
    });
  });

  return { valid: errors.length === 0, errors };
}

// Rule 33: the period covered by one fishing effort must not overlap the period of
// another previously entered effort under the same licence. Cross-log check — call
// before sending with every saved log. Returns the conflicting log id, or null.
export function findEffortOverlap(current: DfoLog, all: DfoLog[]): string | null {
  const window = (l: DfoLog): [number, number] | null => {
    const s = Date.parse(localToUtcIso(l.dateFished, l.data?.timeStartedHauling ?? ''));
    const e = Date.parse(localToUtcIso(l.dateFished, l.data?.timeStoppedHauling ?? ''));
    return isNaN(s) || isNaN(e) || e <= s ? null : [s, e];
  };
  const cur = window(current);
  if (!cur) return null;
  for (const other of all) {
    if (other.id === current.id) continue;
    const w = window(other);
    if (w && cur[0] < w[1] && w[0] < cur[1]) return other.id;
  }
  return null;
}

// --- DFO Web Service transmission (ELOG_Web_Service_3_6_Eng.pdf §3.1 SaveIncomingFile) ---

// UTF-8 string → base64. All three SaveIncomingFile params are base64 (guide §3.1.2.1).
function toBase64(s: string): string {
  return forge.util.encode64(forge.util.encodeUtf8(s));
}

// SOAP 1.1 — HTTP POST, Content-Type: text/xml; charset=utf-8, plus this SOAPAction header
export const DFO_SOAP_ACTION_SAVE = 'http://tempuri.org/SaveIncomingFile';

// XML file name per Standard v6.1 §3.10: [RegionalID]-[LicenceNumber]-[YYYYMMDDHHMMSS].XML
// Timestamp is generation time, UTC, 14 digits, no separators. Uncompressed .XML (no 7z).
export function generateDfoXmlFileName(regId: number, licenceNo: string, when: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const ts =
    `${when.getUTCFullYear()}${p(when.getUTCMonth() + 1)}${p(when.getUTCDate())}` +
    `${p(when.getUTCHours())}${p(when.getUTCMinutes())}${p(when.getUTCSeconds())}`;
  return `${regId}-${licenceNo}-${ts}.XML`;
}

// SOAP 1.1 envelope invoking SaveIncomingFile (namespace http://tempuri.org/), per the
// manually-written envelope example in guide §3.1.2.2.1. Auth is the ELOG key alone;
// CIE_ID and SOFT_VER travel only inside the ELOG XML (GENERAL_INFO), never the envelope.
// Base64 values are XML-safe, so no escaping is needed.
export function buildSaveIncomingFileEnvelope(elogKey: string, fileName: string, xmlBody: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <SaveIncomingFile xmlns="http://tempuri.org/">
      <p_elogkey>${toBase64(elogKey)}</p_elogkey>
      <p_filename>${toBase64(fileName)}</p_filename>
      <p_body>${toBase64(xmlBody)}</p_body>
    </SaveIncomingFile>
  </soap:Body>
</soap:Envelope>`;
}

// elogKey = harvester key issued by DFO (stored in secure storage, never hardcoded)
// fileName from generateDfoXmlFileName() — the service validates it server-side
export function generateSoapEnvelope(elogXml: string, elogKey: string, fileName: string): string {
  return buildSaveIncomingFileEnvelope(elogKey, fileName, elogXml);
}

// --- ValidateElogKey (guide §3.2) — read-only ELOG key check, no XML document ---

export const DFO_SOAP_ACTION_VALIDATE = 'http://tempuri.org/ValidateElogKey';

// §3.2.1: the key must be uppercase before base64 (lowercase encodes differently and the
// service rejects it), and must be at least 24 characters.
export function buildValidateElogKeyEnvelope(elogKey: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ValidateElogKey xmlns="http://tempuri.org/">
      <p_elogkey>${toBase64(elogKey.trim().toUpperCase())}</p_elogkey>
    </ValidateElogKey>
  </soap:Body>
</soap:Envelope>`;
}

// Error-code messages from guide §4 (the codes ValidateElogKey can return)
const VALIDATE_KEY_MESSAGES: Record<string, string> = {
  WS1001: 'ELOG key not provided in the SOAP statement',
  WS1003: 'ELOG key not found in the DFO database',
  WS1031: 'DFO Web service is out of order, please retry later',
  WS1036: 'A problem occurred while decoding the base64 string of the ELOG key',
};

// §3.2.3: response is a WS_RESP doc with only <ERR>; the key is valid iff ERR = WS1000.
// As with SaveIncomingFile, the doc usually arrives XML-escaped inside the SOAP result.
export function parseValidateElogKeyResponse(text: string): {
  valid: boolean;
  errorCode?: string;
  errorMessage?: string;
} {
  if (/<(soap:)?Fault[\s>]/i.test(text)) {
    const msg = text.match(/<faultstring[^>]*>([\s\S]*?)<\/faultstring>/i)?.[1]?.trim();
    return { valid: false, errorCode: 'SOAP_FAULT', errorMessage: msg ?? 'SOAP fault' };
  }
  let body = text;
  if (!/<WS_RESP>/i.test(body) && /&lt;WS_RESP&gt;/i.test(body)) {
    body = body
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  }
  const err = body.match(/<ERR\s*>\s*([^<]*)<\/\s*ERR\s*>/i)?.[1]?.trim();
  if (err === 'WS1000') return { valid: true };
  if (err) return { valid: false, errorCode: err, errorMessage: VALIDATE_KEY_MESSAGES[err] ?? `DFO Web Service error ${err}` };
  return { valid: false, errorCode: 'NO_WS_RESP', errorMessage: 'No WS_RESP document in response' };
}
