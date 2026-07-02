# GATE C — 234 coordinate clamp (Session 90, Phase C)

Closes the S70 divergence where the 222/233 form path clamped LAT/LONG to the XSD's
≤4-decimal limit but the 234 logbook path emitted them raw. No commit.

## The divergence, before

- Form path (dfoForm222Generator.ts:155–156) clamped: `clampCoord4(entry.lat/lon)`.
- Logbook path (dfoXmlGenerator.ts:288–289) emitted raw: `xmlEscape(d.gpsLat/d.gpsLng)`.

So a MAR FMA-38b logbook with a high-precision GPS read (>4 decimals) would emit an
XSD-invalid coordinate and draw WS1038 — exactly the failure the 222 path already guards.

## Reuse, not a second copy

`clampCoord4` was `export`ed from dfoForm222Generator.ts, but importing it into
dfoXmlGenerator would create a CIRCULAR import: dfoForm222Generator already imports
`buildSaveIncomingFileEnvelope`/`toCloseTimestamp` from dfoXmlGenerator. So per the
instruction I moved the single definition to a shared, cycle-safe home:

- Moved `clampCoord4` verbatim (body unchanged) into `dfoConstants.ts` — which imports only
  from `../data/reftables`, never from a generator, and which BOTH generators already import
  from. Comment generalized to note it is shared (234 + 222) and why it lives there.
- `dfoForm222Generator.ts`: deleted the local definition; added `clampCoord4` to its existing
  `import { … } from './dfoConstants'`. Its two call sites (LAT/LONG emit) are unchanged.
- `dfoXmlGenerator.ts`: added `clampCoord4` to its existing `import { … } from './dfoConstants'`.
- `formVrnAndCoordClamp.oneoff.test.ts`: repointed its `clampCoord4` import to `../dfoConstants`
  (the canonical location) and corrected the file header note (clampCoord4 now spans both paths).

One definition, two importers, no copy. Function body byte-identical to the old form-path
version, so behavior matches the form path exactly.

## The 234 emission, after

```
if (subformId === 90 && Number(d.fmaId) === DFO_FMA_38B && d.gpsLat && d.gpsLng) {
  const coordMode = d.gpsSrc === 'gps' ? 'G' : 'M';
  effort += `          <LAT MODE="${coordMode}">${xmlEscape(clampCoord4(d.gpsLat))}</LAT>\n`;
  effort += `          <LONG MODE="${coordMode}">${xmlEscape(clampCoord4(d.gpsLng))}</LONG>\n`;
}
```

Emit-only: the clamp runs at XML generation. The stored/displayed coordinate and the MODE
provenance (G/M) are untouched; the FMA-38b gate is untouched.

## Local behavior check — high-precision input

Using the shared clampCoord4 (Math.round(n*10000)/10000, no trailing-zero pad):

- `43.8237491`  → before (raw): `43.8237491`  → after (clamped): `43.8237`
- `-65.6353660736118` → after: `-65.6354` (rounds, leading minus preserved)
- `43.53` (already ≤4 dp) → `43.53` unchanged
- non-numeric / empty → returned trimmed (validator can still flag it)

So a >4-decimal GPS read now emits at most 4 decimals, matching the XSD LAT/LONG type, and a
value already within 4 decimals is emitted unchanged (no gratuitous re-formatting).

## Verification

- tsc: 33/33 (baseline held, zero new).
- jest formVrnAndCoordClamp.oneoff: PASS (6/6) — including the two high-precision rounding
  cases and the minus-preservation case, now exercised against the moved definition.
- jest full suite: 17 suites passed, 55 tests passed.

## Live-send note

Banked per instruction — the 234 UAT is currently rejecting all logbook documents with
WS1038 due to a DFO server-side XSD change (see WS1038_S90.md step 4). Also, this clamp only
affects MAR FMA-38b logbooks (the only ones that emit LAT/LONG). The clamped emission will be
provable in a sent 38b document once the UAT endpoint recovers / the new DFO package lands. I
did not POST anything.

## Files changed (Phase C)

- src/utils/dfoConstants.ts — added shared `clampCoord4`.
- src/utils/dfoForm222Generator.ts — removed local def, import from dfoConstants.
- src/utils/dfoXmlGenerator.ts — import clampCoord4, apply to LAT/LONG emit.
- src/utils/__tests__/formVrnAndCoordClamp.oneoff.test.ts — import repoint + header note.
