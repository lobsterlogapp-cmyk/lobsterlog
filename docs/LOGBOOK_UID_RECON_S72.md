# Logbook UID Recon — S72

**Date:** 2026-06-18
**Scope:** RECON ONLY — no code changed, nothing committed.
**Question driving this:** should we add a visible "Logbook Unique ID" (6 uppercase A–Z, like Jobel's "SGCAQE") to the 234 logbook?

> ⚠️ **Headline / premise correction:** The working assumption ("REPORT_UID was DROPPED from the 234 XSD; no UID element exists") is **wrong**. The 234 XSD carries a mandatory `LGBK_UID` element, and the app **already generates a Rule-181-compliant 6-upper-A–Z UID for every logbook today**. The Jobel-style ID is not a new field to build — it already exists in the XML and just isn't surfaced in the UI.

---

## 1. 234 XSD UID element — EXISTS, mandatory

File: `~/Desktop/DFO/ELOGS_F234/39673.234.NATIONAL - ELOG - Logbook - Lobster - JBE - Journal de bord - Homard_20260130 000000.xsd`

A unique-identifier element **does** exist at the TRIP (logbook) level — line 214:

```
<xs:element name="LGBK_UID"  minOccurs="1" maxOccurs="1" type="string_6"/>
```

| Property | Value |
|---|---|
| Element name | `LGBK_UID` |
| Node | `TRIP` (sits in the trip/logbook block, after `PRTNSHP_ID`, before `REM`) |
| Type | `string_6` |
| minOccurs / maxOccurs | `1` / `1` → **mandatory, exactly one** |
| Pattern/length restriction | `string_6` = `<xs:restriction base="string"><xs:maxLength value="6"/></xs:restriction>` (lines 42–46). **maxLength 6 only — NO regex pattern, NO minLength, NO uppercase/A–Z enforcement at the XSD level.** |

Note: there is no `REPORT_UID`, `TRIP_UID`, `LOG_UID`, `UID`, or `GUID` element anywhere in the 234 XSD — `LGBK_UID` is the only unique identifier. The "six uppercase A–Z" requirement is **not** in the XSD; it comes from the rule sheet (see §2). The XSD alone would accept any string ≤ 6 chars.

### Subforms_requirements_234.xlsx — per-region verdict

Row 14: node `TRIP`, element `LGBK_UID`, element_id `1082`, description "Unique identifier of the electronic logbook".

| Col | Region | Subform_id | Verdict |
|---|---|---|---|
| G14 | QC – Lobster | 88 | **Mandatory** |
| H14 | GLF – Lobster | 89 | **Mandatory** |
| I14 | MAR – Lobster | 90 | **Mandatory** |
| J14 | NL – Lobster | 91 | **Mandatory** |

LGBK_UID is **Mandatory in all four DFO regions** — no region blocks or makes it optional.

---

## 2. Rule text — Rule 181 (verbatim)

File: `FS-NAT-234-11-EN.pdf`. The only UID rule in the 234 sheet is **Rule 181** (no rules 952/953 appear anywhere in the 234 PDF — those are 233-sheet rules, not present here):

> **Rule No. 181 — Node: TRIP — Element: LGBK_UID**
> "The logbook unique identifier must be made up of six uppercase letters (A-Z) randomly generated."

Verbatim findings:
- **Format:** "six uppercase letters (A-Z) randomly generated" — i.e. `[A-Z]{6}`, random. ✅ matches the Jobel "SGCAQE" shape.
- **Uniqueness:** The rule text says only "logbook **unique** identifier … randomly generated." It does **not** state a uniqueness-enforcement scope (no "globally unique", "per-licence", or "per-trip" wording) and prescribes no collision check — it is effectively a **format rule + random-generation rule**, not an enforced-uniqueness constraint. With 26⁶ ≈ 309M space and random generation, uniqueness is probabilistic, not guaranteed/validated by the spec.
- **Mandatory/optional:** **Mandatory** — XSD `minOccurs=1` and Mandatory in all four regions (§1).

---

## 3. Am I already generating one? — YES

### `generateDfoXmlFileName()` (full) — `src/utils/dfoXmlGenerator.ts:954`

```ts
// XML file name per Standard v6.1 §3.10: [RegionalID]-[LicenceNumber]-[YYYYMMDDHHMMSS].XML
export function generateDfoXmlFileName(regId: number, licenceNo: string, when: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const ts =
    `${when.getUTCFullYear()}${p(when.getUTCMonth() + 1)}${p(when.getUTCDate())}` +
    `${p(when.getUTCHours())}${p(when.getUTCMinutes())}${p(when.getUTCSeconds())}`;
  return `${regId}-${licenceNo}-${ts}.XML`;
}
```

**§3.10 filename spec it implements** (comment at `dfoXmlGenerator.ts:952`): `[RegionalID]-[LicenceNumber]-[YYYYMMDDHHMMSS].XML`.

**Does any filename segment carry a random/unique 6-char token? NO.** The three segments are RegionalID, LicenceNumber, and a UTC timestamp. There is no random token in the filename — so the UID is unrelated to the filename and must be tracked separately (it lives in the XML body, not the file name).

### Is a logbook UID produced anywhere today? YES — three generators, all `[A-Z]{6}` random

| Location | Function | Body |
|---|---|---|
| `src/utils/dfoUids.ts:5` | `generateLgbkUid()` | `'ABCDEFGHIJKLMNOPQRSTUVWXYZ'`, 6× `charAt(Math.floor(Math.random()*26))` — the **canonical** one |
| `src/utils/dfoUids.ts:15` | `generateReportUid()` | `return generateLgbkUid();` (alias) |
| `src/utils/dfoXmlGenerator.ts:13` | `generateReportUid()` | duplicate inline copy, same 26-letter charset, 6 chars — **dead/duplicate**, see note |
| `src/utils/dfoForm233Generator.ts:30` | `generateForm233Uid()` | same charset, 6 chars (233 form) |

**Wiring (it's live, not just defined):**
- `dfoLogStorage.ts:2` imports `generateLgbkUid`; new logs get `lgbkUid: generateLgbkUid()` (`dfoLogStorage.ts:140`), and legacy/migrated logs backfill `l.lgbkUid ?? generateLgbkUid()` (`:63`). Comment at `:34`: "Rule 181: 6 random uppercase letters, permanent per log."
- Emitted into the XML: `dfoXmlGenerator.ts:211` → `trip += tag('LGBK_UID', log.lgbkUid, '    ')`.
- Validated: `dfoXmlGenerator.ts:707-710` Rule 181 check `/^[A-Z]{6}$/` on `LGBK_UID`, error "must be 6 uppercase letters A-Z (Rule 181)".
- It's stored permanently per log (`lgbkUid: string` on the log record) and is held in form state (`FullDfoForm.tsx:140` `useState`), so a stable value already exists per logbook — it's simply never *displayed* as a labelled field. **Surfacing it = read existing `log.lgbkUid`, no new generation needed.**

> Note (flagging, not fixing per instructions): there are **two** `generateReportUid()` exports — one in `dfoUids.ts:15` and a duplicate inline copy in `dfoXmlGenerator.ts:13`. The live LGBK_UID path uses `dfoUids.generateLgbkUid`. This duplication is pre-existing and unrelated to this recon; not touched.

---

## 4. 233 precedent — already has a 6-upper-A–Z generator

- 233 XSD (`~/Desktop/DFO/ELOG_F233/…_20260108 000000.xsd:359`) **does** carry `REPORT_UID` (string_6, `minOccurs=1`) plus optional `LOGBOOK_UID_REFERED` (string_6, `:360`). Same `string_6` = maxLength 6, no pattern.
- `Form233Generator` emits it: `dfoForm233Generator.ts:99` → `tag('REPORT_UID', entry.uid || generateForm233Uid(), …)`.
- Generator (`dfoForm233Generator.ts:30`):

```ts
export function generateForm233Uid(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let uid = '';
  for (let i = 0; i < 6; i++) uid += chars.charAt(Math.floor(Math.random() * chars.length));
  return uid;
}
```

- 233 validation (`dfoForm233Generator.ts:141`) only checks `REPORT_UID` is 1–6 chars (`/^.{1,6}$/`) — i.e. string_6 length, **not** the A–Z pattern. (233 generates fresh per transmission; comment at `:14` in `dfoUids.ts`.)

**Reuse verdict:** A 6-upper-A–Z helper already exists three times over. The one to reuse is **`dfoUids.generateLgbkUid()`** — it is the canonical, already-wired Rule-181 generator. No new generator should be written; `generateForm233Uid` and the inline `dfoXmlGenerator.generateReportUid` are redundant copies of the same logic.

---

## 4-sentence summary

1. The 234 XSD **does** contain a unique-identifier element — `LGBK_UID` (node TRIP, type `string_6`, `minOccurs/maxOccurs=1`, **mandatory in all four regions** per Subforms_requirements_234.xlsx row 14); the "REPORT_UID was dropped" note refers only to the *name* — the identifier itself was kept and renamed, not removed.
2. Rule 181 specifies the format as "six uppercase letters (A-Z) randomly generated" and is mandatory, but prescribes **only format + random generation, with no enforced-uniqueness scope** (no global/per-licence/per-trip uniqueness check), and the XSD's `string_6` enforces only maxLength 6 (the A–Z pattern lives in the rule, validated in-app at `dfoXmlGenerator.ts:709`).
3. The app **already generates a compliant `LGBK_UID` for every logbook today** via `dfoUids.generateLgbkUid()` (`[A-Z]{6}` random), stores it permanently per log, emits it at `dfoXmlGenerator.ts:211`, and validates it — but it is never displayed in the UI; the filename (`generateDfoXmlFileName`, §3.10 `RegID-Licence-Timestamp.XML`) contains **no** random token and is unrelated.
4. The 233 form sets the precedent (`REPORT_UID`, string_6, `generateForm233Uid()` at `dfoForm233Generator.ts:30`), but there is **no need to write a new generator** — `dfoUids.generateLgbkUid()` is the canonical, already-wired helper, so a "visible Logbook Unique ID" feature reduces to **surfacing the existing `log.lgbkUid` value in the UI**, not creating a field.
