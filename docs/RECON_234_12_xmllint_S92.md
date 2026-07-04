# RECON — 234.12 xmllint confirmation (Session 92)

**Date:** 2026-07-04 · **Ticket #2126** · Artifact-before-edit proof for the 07-02 DFO UAT 234 regression (WS1038).
**Method:** read-only extraction of on-device AsyncStorage + `xmllint --noout --schema`. No source touched, no DFO POST.

## VERDICT (one line)
**CONFIRMED by artifacts:** the 234.12 regression is caused by exactly ONE breaking change — `LOST_GEAR_IND` went Mandatory→**Blocked** (`maxOccurs="1"`→`"0"`). Our app still emits `<LOST_GEAR_IND>N</LOST_GEAR_IND>`, which the new XSD prohibits. Removing that one line makes the doc fully valid against the new XSD. Fix for S92 = de-emit `LOST_GEAR_IND` (generator) + remove its UI.

## ⚠️ The xmllint error names the WRONG element — read this
xmllint reports the failure at **`MM_INTER_IND` line 39**, NOT `LOST_GEAR_IND`. That is a libxml2 reporting artifact, not a second problem. With `LOST_GEAR_IND` prohibited (`maxOccurs=0`), the still-emitted element desyncs the sequence and the "not expected" error surfaces on the **next** sibling (`MM_INTER_IND`). Doc order is `SAR_IND(37) → LOST_GEAR_IND(38) → MM_INTER_IND(39)`; the validator accepted SAR_IND **and** LOST_GEAR_IND, then tripped on MM_INTER_IND. A future debugger chasing "MM_INTER_IND" would be chasing a ghost — the XSD diff is the authority.

## Canonical paths (keyed by XSD filename date, NEVER folder name)
| Package | Folder | XSD |
|---|---|---|
| NEW (234.12) | `~/Desktop/DFO/ELOG_F234/` | `…Homard_20260624 000000.xsd` |
| OLD (234.11) | `~/Desktop/DFO/ELOG_F234_old_234-11/` | `…Homard_20260130 000000.xsd` |

`20260130` = OLD (234.11), `20260624` = NEW (234.12). `ELOG_F234` (no S) now holds the NEW schema; the old package was relocated to `ELOG_F234_old_234-11/`, byte-preserved.

## Artifact provenance (read-only)
- Sim container: `booted` → `…/Application/1811A4C3…/Library/Application Support/com.Nickerson.LobsterLog/RCTAsyncLocalStorage_V1/`
- uid namespace: `FwXYZPYypabp508Yw2bWPz5OgWx1`; keys `<base>::<uid>` → md5-named blob files.
  - register `@lobsterlog_transmission_register::<uid>` → `fcdb470346cead8936f7123b863db6f6`
  - archive `@lobsterlog_xml_archive::<uid>` → `2616f875d127e0cf1493dd9738032e00`
- **`docs/s92_rejected_0702.xml`** (1832 B) — `LL-20260702-003`, earliest of 6 failed 07-02 attempts, from the register record's `xmlSnapshot`. The 6 retries differ ONLY by regenerated timestamps (START_DT/END_DT/DG_CLOSE_DT) — structurally identical.
- **`docs/s92_accepted_0701.xml`** (1830 B) — `LL-20260701-001`, CONF 163045, from the `xml_archive` blob; byte-identical to that record's register `xmlSnapshot` (cross-checked).
- Both docs are bare `<ELOG>` documents (not SOAP/base64) and both carry `<LOST_GEAR_IND>N</LOST_GEAR_IND>`.

## xmllint output (verbatim)
```
# 1. REJECTED (0702) vs NEW 20260624  — expect FAIL
s92_rejected_0702.xml:39: element MM_INTER_IND: Schemas validity error : Element 'MM_INTER_IND': This element is not expected.
s92_rejected_0702.xml fails to validate            [exit 3]

# 2. ACCEPTED (0701) vs NEW 20260624  — expect FAIL
s92_accepted_0701.xml:39: element MM_INTER_IND: Schemas validity error : Element 'MM_INTER_IND': This element is not expected.
s92_accepted_0701.xml fails to validate            [exit 3]

# 3. REJECTED (0702) vs OLD 20260130  — expect PASS (doc was valid under 234.11; server changed, not us)
s92_rejected_0702.xml validates                    [exit 0]

# 4. CONFIRMATION: REJECTED with <LOST_GEAR_IND> line removed, vs NEW 20260624
rej_no_lostgear.xml validates                      [exit 0]   ← de-emitting LOST_GEAR_IND is the complete fix
```

## XSD diff (OLD 20260130 → NEW 20260624) — COMPLETE
Whitespace-normalized `diff` surfaced exactly these changes; nothing else:

1. **`LOST_GEAR_IND` `maxOccurs="1"` → `maxOccurs="0"`** (also `minOccurs="1"`→`"0"`) — the ONLY breaking change. Element is now prohibited.
2. `SOAKED_DUR` type `integer_5` → `integer_05` (rename).
3. `NB_GEAR_HLD` type `integer_4` → `integer_04` (rename).
4. New `simpleType integer_05` added (0..99999) to back the SOAKED_DUR rename.
5. Metadata comment `xsd_start_date: 2025-10-27` → `2026-06-24`.
6. Trailing newline added at EOF.

### Integer renames — width check (Step 2d)
**No width change.** Only the lower bound relaxes 1→0; both types are non-breaking (they *widen* the accepted set, so no previously-valid doc can be rejected by them):

| Field | OLD type (range) | NEW type (range) | Delta |
|---|---|---|---|
| `SOAKED_DUR` | `integer_5` (1..99999) | `integer_05` (0..99999) | min 1→0; max unchanged (5-digit) |
| `NB_GEAR_HLD` | `integer_4` (1..9999) | `integer_04` (0..9999) | min 1→0; max unchanged (4-digit) |

(`integer_4` and `integer_04` both already existed in the OLD XSD; `integer_5` still exists in NEW, now unused. The renames just repoint two fields onto the min-0 variants.)

## Implication for S92 build
- **Only action required:** stop emitting `LOST_GEAR_IND` in `dfoXmlGenerator.ts` and remove its form UI (+ any validator min:1 gate on it). The integer renames need NO code change — our values already satisfy the (wider) new ranges.
- After de-emit, re-run lint #1 against the NEW XSD → expect PASS (proven by confirmation lint #4).
- Then the banked live recovery 234 send (doubles as the cross-midnight trip).

## Notes
- Recommend git-ignoring the two raw `docs/s92_*.xml` artifacts — they carry LIC_NO/VRN (UAT test triplet, but still) and are reproducible from the register. This `.md` quotes the load-bearing lines, so it stands alone as the committed evidence.
