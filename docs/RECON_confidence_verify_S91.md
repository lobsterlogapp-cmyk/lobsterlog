# PRE-PHASE — Confidence picker verify (S91)

**Read-only recon. No send, no code change.** Booted sim `iPhone 17 Pro` (F5B8F071…), app `com.Nickerson.LobsterLog`. Git tree still clean at `baf683f` (this doc is the only new/untracked file).

## Verdict: mapping is CORRECT — not off by a row. But the proposed test can't run as designed.

## Why the designed test can't produce `39598`

The plan was: create a throwaway 222 with 'Probable', save without sending, then grep `form222_entries` for the codeId, expecting `39598`.

But `form222_entries` **does not store the codeId.** It stores the confidence **label string**. Confirmed against the live blob (`…/RCTAsyncLocalStorage_V1/f0323b6601fc562632547591c8536aeb`, = md5 of `@form222_entries::FwXYZPYypabp508Yw2bWPz5OgWx1`):

```
…,"confidenceLabel":"Uncertain",…      (entry HNWCKA)
…,"confidenceLabel":"",…               (entry KKRTOX)
```

`grep -E "3959[0-9]|3960[0-9]"` on that blob returns **nothing**. The codeId only ever exists in generated XML — `<ID_CNFDNCE_ID>` — which is produced at send time. Since the test forbids sending, `39598` can never appear. Grepping `form222_entries` for it would look like a failure when it's just the wrong field.

## The mapping is label-keyed (position-independent), so "off by a row" is structurally impossible

Reftable — `src/data/reftables/mvConfidenceLevel.ts` (from `MV_CONFIDENCE_LEVEL_rel3.csv`, 4 rows):

| codeId | descEn |
|--------|--------|
| 39597 | Certain |
| **39598** | **Probable** |
| 39599 | Possible |
| **39600** | **Uncertain** |

Chain:
- Picker options = `CONFIDENCE_LEVEL_LABELS` = `MV_CONFIDENCE_LEVEL.map(c => c.descEn)` — `Form222Screen.tsx:587`.
- Selecting a row stores the **label string** verbatim via `set('confidenceLabel')` — `Form222Screen.tsx:590`.
- At XML gen, codeId is resolved by **string match**, not row index — `dfoForm222Generator.ts:177`:
  `const conf = CONFIDENCE_LEVELS.find(c => c.label === entry.confidenceLabel)` → `ID_CNFDNCE_ID = conf.codeId` (`:182`).

Because the same `descEn` value is both the picker label and the codeId lookup key, tapping "Probable" stores `"Probable"` → matches `{descEn:'Probable', codeId:39598}` → emits `39598`. Guaranteed. The only way to get an off-by-a-row is if the picker's visible list were offset from the reftable — it is literally derived from it, so it can't be.

## Existing data already proves the full chain end-to-end (no new send needed)

The `39600` send you remembered is already on disk. Cross-checking the two stores for the same entry:

- `form222_entries` entry **HNWCKA**: `confidenceLabel:"Uncertain"`, `sentToDfo:true`.
- XML archive (`…/2616f875d127e0cf1493dd9738032e00`) carries exactly one confidence code: `<NOAA_SPECIE_COD>124</NOAA_SPECIE_COD> <ID_CNFDNCE_ID>39600</ID_CNFDNCE_ID>` (species 124 = Gray Seal, HNWCKA's species).
- Reftable: `39600 = Uncertain`.

So: **you tapped "Uncertain"** (that's what's persisted), and it correctly transmitted **39600 = Uncertain.** That is the "163057 carried 39600" send — the tap and the wire agree. No off-by-one. (The other sent entry, KKRTOX, had an empty confidence label, so it emitted no `ID_CNFDNCE_ID` — consistent with only one `39600` in the archive.)

## Recommendation

Per your rule this lands in the **"39598 → mapping confirmed correct → proceed to Phase 1 recon"** branch, on stronger evidence than the throwaway would have given. But it deviates from the exact test you wrote, so I'm holding for your call. Options:

- **A (recommended):** Accept the existing-data + source proof. Nothing to delete (no throwaway was created). I proceed to Phase 1 recon.
- **B:** Still want a fresh device throwaway. Corrected read-only step: create the 222 with 'Probable', save without sending, then run — literal, real path:

  ```
  grep -o -E '"confidenceLabel":"[^"]*"' "/Users/jonny/Library/Developer/CoreSimulator/Devices/F5B8F071-300D-4709-9807-BD6D936D5C58/data/Containers/Data/Application/1811A4C3-E28D-409A-A13E-59A2AC0444E9/Library/Application Support/com.Nickerson.LobsterLog/RCTAsyncLocalStorage_V1/f0323b6601fc562632547591c8536aeb"
  ```

  Expected last match: `"confidenceLabel":"Probable"`. That confirms the picker persists the label — but it cannot show `39598` (no send), so it adds nothing over A. Then delete the throwaway in-app.
