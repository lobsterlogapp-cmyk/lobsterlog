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
  // Form 234 pickers
  { csv: 'MV_CATCH_USAGE_rel1.csv', module: 'mvCatchUsage', exportName: 'MV_CATCH_USAGE', iface: 'DfoCatchUsage' },
  { csv: 'MV_SPECIMENS_CONDITION_rel1.csv', module: 'mvSpecimensCondition', exportName: 'MV_SPECIMENS_CONDITION', iface: 'DfoSpecimensCondition' },
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

function generateTable({ csv, module: moduleName, exportName, iface }) {
  const raw = fs.readFileSync(path.join(CSV_DIR, csv));
  // DFO ships Windows-1252; decode properly so French accents survive (Standard §3.11).
  const text = new TextDecoder('windows-1252').decode(raw).replace(/^﻿/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);

  const headers = parseCsvLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''));
  const cols = headers.map(h => {
    const m = COLUMN_MAP[h];
    if (!m) throw new Error(`${csv}: unmapped column "${h}" — add it to COLUMN_MAP`);
    return m;
  });

  const rows = lines.slice(1).map(line => {
    const cells = parseCsvLine(line);
    if (cells.length !== cols.length) throw new Error(`${csv}: row has ${cells.length} cells, expected ${cols.length}: ${line}`);
    return cells.map((c, i) => {
      const v = c.trim();
      if (cols[i].type === 'number') {
        const n = Number(v);
        if (!Number.isFinite(n)) throw new Error(`${csv}: non-numeric ${headers[i]}: "${v}"`);
        return String(n);
      }
      return tsString(v);
    });
  });

  const genDate = new Date().toISOString().slice(0, 10);
  const fields = cols.map(c => `  ${c.field}: ${c.type};`).join('\n');
  const body = rows
    .map(cells => '  { ' + cells.map((v, i) => `${cols[i].field}: ${v}`).join(', ') + ' },')
    .join('\n');

  const out =
    `// GENERATED FILE — DO NOT EDIT BY HAND.\n` +
    `// Source: data/dfo-reftables/${csv} (${rows.length} rows, generated ${genDate})\n` +
    `// Regenerate with: node scripts/generateReftables.js\n\n` +
    `export interface ${iface} {\n${fields}\n}\n\n` +
    `export const ${exportName}: ${iface}[] = [\n${body}\n];\n`;

  fs.writeFileSync(path.join(OUT_DIR, `${moduleName}.ts`), out, 'utf8');
  return { moduleName, exportName, iface, rowCount: rows.length };
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const results = TABLES.map(generateTable);

const index =
  `// GENERATED FILE — DO NOT EDIT BY HAND. Regenerate: node scripts/generateReftables.js\n\n` +
  results.map(r => `export { ${r.exportName}, type ${r.iface} } from './${r.moduleName}';`).join('\n') + '\n';
fs.writeFileSync(path.join(OUT_DIR, 'index.ts'), index, 'utf8');

for (const r of results) console.log(`  ${r.exportName.padEnd(28)} ${String(r.rowCount).padStart(4)} rows -> src/data/reftables/${r.moduleName}.ts`);
console.log(`Generated ${results.length} tables + index.ts`);
