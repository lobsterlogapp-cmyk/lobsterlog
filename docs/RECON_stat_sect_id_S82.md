# Recon — STAT_SECT_ID state + lgridCodeId template trace (Session 82)

RECON ONLY. No edits, no build, no commit. Line numbers are as-found.

## 1. STAT_SECT_ID — current state, by layer (each separate)

Config (DFO_SUBFORM_FIELD_CONFIG, dfoConstants.ts):
- NOT present. `statSectId` appears in NO subform's visible or required array
  (88/89/90/91 all checked, lines ~1430–1456). Zero hits for statSectId/STAT_SECT
  in dfoConstants.ts.

Generator emit (dfoXmlGenerator.ts):
- NO emit guard. There is no `tag('STAT_SECT_ID', …)` anywhere. STAT_SECT_ID is
  never written to the XML on any subform.

Validator (dfoXmlGenerator.ts):
- ONE reference only — a sequence slot in EFFORT_DETAIL_SPEC, line 492:
  `{ name: 'STAT_SECT_ID', min: 0, max: 1, type: 'id' },`
- min:0 = optional; no subform overlay, no mandatory check, no blocked check.
- Net: schema-tolerated-if-present, but never produced, never required, never blocked.

Summary: STAT_SECT_ID is a known schema slot with ZERO wiring — no state, no UI,
no emit, no per-subform rule. (Its candidate options source MV_STAT_DISTRICT_SECTION
is generated but unconsumed — see prior reftable audit.)

## 2. lgridCodeId end-to-end — SPLIT pattern, not uniform

It is NOT one clean rule. The gating MECHANISM differs by layer:

UI render (FullDfoForm.tsx:1275) — FMA-gated, NOT subform-gated, NOT isVisible():
- Gate: `{fmaId !== null && (DFO_LGRID_BY_FMA[fmaId] ?? []).length > 0 && (`
- `isVisible('lgridCodeId')` / `isRequired('lgridCodeId')` are NEVER called — the
  render keys off the FMA directly, so config visible[90] is not consulted here.
- Options (1290): `(DFO_LGRID_BY_FMA[fmaId] ?? []).map(g => …)` — per-FMA grid arrays
  (DFO_LGRID_BY_FMA, dfoConstants.ts:67; keyed by FMA codeId → {codeId, display}).

UI save-gate (FullDfoForm.tsx:1022) — FMA-driven mandatory (Rule 619 shape):
- `lgridCodeId: DFO_FMA_LGRID_REQUIRED.has(fmaId ?? 0) ? (lgridDisplay || '') : 'ok',`
- DFO_FMA_LGRID_REQUIRED (dfoConstants.ts:50) = FMA codeIds 1581–1593 (LFAs 27–38,
  per the Rule 619 comment at :27). Required only when the effort FMA is in that set;
  else auto-passes 'ok'. So mandatoriness is FMA-conditional, real Rule 619.

Generator emit (dfoXmlGenerator.ts:268) — SUBFORM-gated, NOT FMA:
- `if (subformId === 90) effort += tag('LGRID_ID', d.lgridCodeId, '          ');`
  (value-gate AND-ed in via tag()).

Validator (dfoXmlGenerator.ts:794) — SUBFORM-gated, NOT FMA:
- `if (subformId !== 90 && get(ed, 'LGRID_ID').length > 0)` → "blocked for subform N".
  Optional on 90, so no mandatory check.

So: FMA-gating IS REAL, but only in the UI layer (options + required). The
emit/validate layer is subform-gated (MAR-90). The two co-align in practice only
because the grid FMAs 1581–1593 are Maritimes LFAs — i.e. FMA∈grid-set ⇒ subform 90.
A clean "Rule 619" template would be FMA-gated in ALL layers; lgrid is not.

## 3. Filter key — is the effort FMA in scope where a STAT_SECT_ID picker would render?

- fmaId is component state: `const [fmaId, setFmaId] = useState<number | null>(null);`
  (FullDfoForm.tsx:131) — in scope for the whole render.
- The FMA picker sets it (setFmaId, ~1258) immediately ABOVE the lgrid block; the lgrid
  picker reads it at :1275/:1290. A STAT_SECT_ID picker placed in the same effort
  section (mirroring lgrid) would have fmaId already selected and readable.
- Confirmed: YES — fmaId is selected and in scope at that render point.

Note (in scope, not a fix): the lgrid UI gates on FMA while its emit/validate gate on
subform — flagging because it affects whether lgrid is a faithful template. Reporting
only; nothing changed.
