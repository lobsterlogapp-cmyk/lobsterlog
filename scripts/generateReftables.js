#!/usr/bin/env node
/**
 * generateReftables.js — DFO reference-table codegen (Session 51).
 *
 * Reads vendored DFO MV_* CSVs (Windows-1252) from data/dfo-reftables/ and emits
 * typed TypeScript modules under src/data/reftables/. Generated files are COMMITTED;
 * re-run this script only when DFO ships a new rel version of a table, then review
 * the git diff (Standard v6.1 §15 replication obligation).
 *
 * Pattern per docs/REFTABLE_INGESTION_PLAN.md (option C: build-script codegen).
 *
 * Usage: node scripts/generateReftables.js
 */

const fs = require('fs');
const path = require('path');

const CSV_DIR = path.join(__dirname, '..', 'data', 'dfo-reftables');
const OUT_DIR = path.join(__dirname, '..', 'src', 'data', 'reftables');

// DFO CSV column → TS field. Key column (codeId / noaaCode) is whichever appears first.
const COLUMN_MAP = {
  CODE_ID: { field: 'codeId', type: 'number' },
  NOAA_SPECIES_CODE: { field: 'noaaCode', type: 'string' }, // MV_NOAA_MM_SPECIES keys on this, NOT CODE_ID
  DESC_FRE: { field: 'descFr', type: 'string' },
  DESC_ENG: { field: 'descEn', type: 'string' },
  ABBRV_FRE: { field: 'abbrevFr', type: 'string' },
  ABBRV_ENG: { field: 'abbrevEn', type: 'string' },
  GEAR_CLASS_DESC_FRE: { field: 'gearClassFr', type: 'string' },
  GEAR_CLASS_DESC_ENG: { field: 'gearClassEn', type: 'string' },
};

const TABLES = [
  // MV_PORT — full 3,970-row port table (TRIP.PORT_ID / LANDING.PORT_ID). MV_PORT-specific
  // column mapping: DESC_*→name*, nullable PROV_CODE_ID (foreign ports have none), and the
  // redundant PROV_DESC_* columns dropped (province names come from MV_PROVINCE by codeId).
  {
    csv: 'MV_PORT_rel7.csv', module: 'mvPort', exportName: 'MV_PORT', iface: 'DfoPort',
    columns: {
      CODE_ID:       { field: 'codeId', type: 'number' },
      DESC_FRE:      { field: 'nameFr', type: 'string' },
      DESC_ENG:      { field: 'nameEn', type: 'string' },
      PROV_CODE_ID:  { field: 'provCodeId', type: 'number?' },
      PROV_DESC_FRE: null,
      PROV_DESC_ENG: null,
    },
    extraExports: ['PORTS_BY_PROVINCE'],
    derived: (name, iface) =>
`// Derived: ports grouped by province code (foreign / no-province ports excluded).
export const PORTS_BY_PROVINCE: Record<number, ${iface}[]> = (() => {
  const m: Record<number, ${iface}[]> = {};
  for (const p of ${name}) {
    if (p.provCodeId == null) continue;
    if (!m[p.provCodeId]) m[p.provCodeId] = [];
    m[p.provCodeId].push(p);
  }
  return m;
})();`,
  },
  // Form 234 pickers
  { csv: 'MV_CATCH_USAGE_rel1.csv', module: 'mvCatchUsage', exportName: 'MV_CATCH_USAGE', iface: 'DfoCatchUsage' },
  { csv: 'MV_SPECIMENS_CONDITION_rel1.csv', module: 'mvSpecimensCondition', exportName: 'MV_SPECIMENS_CONDITION', iface: 'DfoSpecimensCondition' },
  { csv: 'MV_SAR_LIST_rel8.csv', module: 'mvSarList', exportName: 'MV_SAR_LIST', iface: 'DfoSarList' },
  { csv: 'MV_BAIT_CONDITION_rel2.csv', module: 'mvBaitCondition', exportName: 'MV_BAIT_CONDITION', iface: 'DfoBaitCondition' },
  { csv: 'MV_PARTNERSHIP_TYPE_rel1.csv', module: 'mvPartnershipType', exportName: 'MV_PARTNERSHIP_TYPE', iface: 'DfoPartnershipType' },
  // Form 222 marine mammal cluster
  { csv: 'MV_NOAA_MM_SPECIES_rel3.csv', module: 'mvNoaaMmSpecies', exportName: 'MV_NOAA_MM_SPECIES', iface: 'DfoNoaaMmSpecies' },
  { csv: 'MV_INCIDENT_TYPE_rel4.csv', module: 'mvIncidentType', exportName: 'MV_INCIDENT_TYPE', iface: 'DfoIncidentType' },
  { csv: 'MV_MM_LENGTH_CATEGORY_rel4.csv', module: 'mvMmLengthCategory', exportName: 'MV_MM_LENGTH_CATEGORY', iface: 'DfoMmLengthCategory' },
  { csv: 'MV_MM_SPECIMENS_CONDITION_rel3.csv', module: 'mvMmSpecimensCondition', exportName: 'MV_MM_SPECIMENS_CONDITION', iface: 'DfoMmSpecimensCondition' },
  { csv: 'MV_CONFIDENCE_LEVEL_rel3.csv', module: 'mvConfidenceLevel', exportName: 'MV_CONFIDENCE_LEVEL', iface: 'DfoConfidenceLevel' },
  { csv: 'MV_GEAR_DESCRIPTION_rel13.csv', module: 'mvGearDescription', exportName: 'MV_GEAR_DESCRIPTION', iface: 'DfoGearDescription' },
  { csv: 'MV_PROVINCE_rel3.csv', module: 'mvProvince', exportName: 'MV_PROVINCE', iface: 'DfoProvince' },
  // Spatial pickers (Session 72 ingest). MV_GRID — 5,272-row grid table (EFFORT.LGRID_ID /
  // GRID_ID): CODE_ID + DESC_*, all in the shared COLUMN_MAP, so no per-table override needed.
  { csv: 'MV_GRID_rel1.csv', module: 'mvGrid', exportName: 'MV_GRID', iface: 'DfoGrid' },
  // MV_STAT_DISTRICT_SECTION — 199-row district/section table carrying its parent stat-area
  // columns. STAT_AREA_ID is populated for only 62/199 rows (sections with no parent stat area
  // have none), so it's nullable; STAT_AREA_DESC_* come through as '' on those rows.
  {
    csv: 'MV_STAT_DISTRICT_SECTION_rel8.csv', module: 'mvStatDistrictSection',
    exportName: 'MV_STAT_DISTRICT_SECTION', iface: 'DfoStatDistrictSection',
    columns: {
      CODE_ID:            { field: 'codeId', type: 'number' },
      DESC_FRE:           { field: 'descFr', type: 'string' },
      DESC_ENG:           { field: 'descEn', type: 'string' },
      STAT_AREA_ID:       { field: 'statAreaId', type: 'number?' },
      STAT_AREA_DESC_FRE: { field: 'statAreaDescFr', type: 'string' },
      STAT_AREA_DESC_ENG: { field: 'statAreaDescEn', type: 'string' },
    },
  },
];

/** RFC-4180-ish CSV parse: quoted fields, "" escapes, embedded commas. No embedded newlines in DFO tables. */
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur); cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function tsString(s) {
  return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

const tsType = t => (t === 'number?' ? 'number | null' : t);

function generateTable({ csv, module: moduleName, exportName, iface, columns, extraExports, derived }) {
  const raw = fs.readFileSync(path.join(CSV_DIR, csv));
  // DFO ships Windows-1252; decode properly so French accents survive (Standard §3.11).
  const text = new TextDecoder('windows-1252').decode(raw).replace(/^﻿/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);

  const headers = parseCsvLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''));
  const map = columns || COLUMN_MAP; // per-table override (e.g. MV_PORT) else the shared map
  const cols = headers.map(h => {
    if (h in map) return map[h]; // an explicit `null` means "parse the cell but don't emit it"
    const m = COLUMN_MAP[h];
    if (!m) throw new Error(`${csv}: unmapped column "${h}" — add it to COLUMN_MAP or the table's columns`);
    return m;
  });
  const emit = cols.map((c, i) => ({ c, i })).filter(x => x.c); // dropped (null) columns excluded

  const rows = lines.slice(1).map(line => {
    const cells = parseCsvLine(line);
    if (cells.length !== cols.length) throw new Error(`${csv}: row has ${cells.length} cells, expected ${cols.length}: ${line}`);
    return emit.map(({ c, i }) => {
      const v = cells[i].trim();
      if (c.type === 'number' || c.type === 'number?') {
        if (v === '') {
          if (c.type === 'number?') return 'null';
          throw new Error(`${csv}: empty ${headers[i]} but column is non-nullable number`);
        }
        const n = Number(v);
        if (!Number.isFinite(n)) throw new Error(`${csv}: non-numeric ${headers[i]}: "${v}"`);
        return String(n);
      }
      return tsString(v);
    });
  });

  const genDate = new Date().toISOString().slice(0, 10);
  const fields = emit.map(({ c }) => `  ${c.field}: ${tsType(c.type)};`).join('\n');
  const body = rows
    .map(cells => '  { ' + cells.map((v, k) => `${emit[k].c.field}: ${v}`).join(', ') + ' },')
    .join('\n');

  const out =
    `// GENERATED FILE — DO NOT EDIT BY HAND.\n` +
    `// Source: data/dfo-reftables/${csv} (${rows.length} rows, generated ${genDate})\n` +
    `// Regenerate with: node scripts/generateReftables.js\n\n` +
    `export interface ${iface} {\n${fields}\n}\n\n` +
    `export const ${exportName}: ${iface}[] = [\n${body}\n];\n` +
    (derived ? '\n' + derived(exportName, iface) + '\n' : '');

  fs.writeFileSync(path.join(OUT_DIR, `${moduleName}.ts`), out, 'utf8');
  return { moduleName, exportName, iface, rowCount: rows.length, extraExports: extraExports || [] };
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const results = TABLES.map(generateTable);

const index =
  `// GENERATED FILE — DO NOT EDIT BY HAND. Regenerate: node scripts/generateReftables.js\n\n` +
  results.map(r => {
    const names = [r.exportName, ...r.extraExports];
    return `export { ${names.join(', ')}, type ${r.iface} } from './${r.moduleName}';`;
  }).join('\n') + '\n';
fs.writeFileSync(path.join(OUT_DIR, 'index.ts'), index, 'utf8');

for (const r of results) console.log(`  ${r.exportName.padEnd(28)} ${String(r.rowCount).padStart(4)} rows -> src/data/reftables/${r.moduleName}.ts`);
console.log(`Generated ${results.length} tables + index.ts`);
