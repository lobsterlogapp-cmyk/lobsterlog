# ARCHIVE-GREP — recovery 234 send verification (Session 93)

**Date:** 2026-07-05 · **Ticket #2126** · Read-only verification of the actual SENT bytes for the
live recovery 234 send, per docs/GATE_234_12_DEEMIT_S93.md §c. No container write/delete/rewrite.

## VERDICT (one line)
**CONFIRMED clean.** The recovery send (LL-20260704-001, Trip #9) emitted **zero LOST_GEAR_IND**
in its actual archived bytes — the 234.12 de-emit held on a real send. SAR_IND/MM_INTER_IND
present. Two observations flagged below (same-day, not cross-midnight; a second newer entry).

## Source (read-only)
- Container: `xcrun simctl get_app_container booted com.Nickerson.LobsterLog data`
  → `…/Application/1811A4C3-E28D-409A-A13E-59A2AC0444E9/`
- Store: `Library/Application Support/com.Nickerson.LobsterLog/RCTAsyncLocalStorage_V1/`
- Key `@lobsterlog_xml_archive::FwXYZPYypabp508Yw2bWPz5OgWx1` — **manifest value is `null`**, so the
  blob lives in the md5(key)-named file **`2616f875d127e0cf1493dd9738032e00`** (both cases handled;
  matches the S92-banked value). 13 entries `[{logId, savedAt, xml}]`; success-archive only.

## The recovery send — entry idx 11
Matched by `logId = LL-20260704-001` **and** `TRIP_NUM = 9` (the prompt's "Trip #9"). Its
`DG_CLOSE_DT = 20260705153219` equals the send filename `1004-104460-20260705153219.XML` → this
IS the recovery send. MAR-90 · VRN 104460 · LIC_NO 104460 · LGBK_UID IHETKR · savedAt
1783265543776 (2026-07-05 15:32:23 UTC).

### LOST_GEAR_IND — **0** (element count 0, substring count 0)
Raw EFFORT indicator sequence (LOST_GEAR_IND absent between SAR_IND and MM_INTER_IND):
```
<FMA_ID>1589</FMA_ID>
<SAR_IND>N</SAR_IND>
<MM_INTER_IND>N</MM_INTER_IND>
<DG_CLOSE_DT>20260705153219</DG_CLOSE_DT>
```

### START_DT / END_DT — TRIP, EFFORT, LANDING (date_12 = YYYYMMDDHHMM, UTC)
| Node | Element | Raw | Readable |
|---|---|---|---|
| TRIP | START_DT (sail) | `202607050229` | 2026-07-05 02:29 |
| TRIP | FIRST_ENTRY_DT (date_14) | `20260705153001` | 2026-07-05 15:30:01 |
| EFFORT | START_DT (haul start) | `202607050330` | 2026-07-05 03:30 |
| EFFORT | END_DT (haul end) | `202607050430` | 2026-07-05 04:30 |
| LANDING | START_DT (landing) | `202607050630` | 2026-07-05 06:30 |

**Day-rollover? NO — this is a SAME-DAY trip.** All four operational timestamps fall on
2026-07-05 (sail 02:29 → haul 03:30–04:30 → landing 06:30). No cross-midnight rollover.

### Sanity — indicators present
`SAR_IND = N` · `MM_INTER_IND = N` — both emitted (mandatory, intact).

## Whole-blob vs newest entry
- **Whole-blob LOST_GEAR_IND substring count: 12.** All 12 come from the six pre-234.12 logbook
  sends (idx 0–5: LL-20260629-001/002, LL-20260630-001/002/003, LL-20260701-001), each carrying
  `<LOST_GEAR_IND>N</LOST_GEAR_IND>` = 2 substring hits → 6 × 2 = 12. **Legitimate** (234.11 era).
- **Newest / recovery entries: 0.** Every entry from idx 6 onward (the FORM222/FORM233 rows and
  both of today's logbook sends) is 0.

Full per-entry LOST_GEAR_IND census:
| idx | logId | savedAt (UTC) | LGI substr |
|---|---|---|---|
| 0 | LL-20260629-001 | 2026-06-29 … | 2 |
| 1 | LL-20260629-002 | 2026-06-29 … | 2 |
| 2 | LL-20260630-001 | 2026-06-30 … | 2 |
| 3 | LL-20260630-002 | 2026-06-30 … | 2 |
| 4 | LL-20260630-003 | 2026-06-30 … | 2 |
| 5 | LL-20260701-001 | 2026-07-01 … | 2 |
| 6 | FORM233-LEQOAG | 2026-07-02 | 0 |
| 7 | FORM222-HNWCKA | 2026-07-02 | 0 |
| 8 | FORM233-DGLQVS | 2026-07-02 | 0 |
| 9 | FORM222-KKRTOX | 2026-07-02 | 0 |
| 10 | FORM233-UCZXCB | 2026-07-02 | 0 |
| **11** | **LL-20260704-001 (recovery, Trip #9)** | **2026-07-05 15:32:23** | **0** |
| 12 | LL-20260702-002 (Trip #8) | 2026-07-05 15:33:09 | 0 |

## ⚠️ Two observations (read-only — flagged, not acted on)
1. **The recovery send was a SAME-DAY trip, not the planned cross-midnight one.** The gate doc §b
   / banked plan was sail 23:30 D1 / haul 02:00 D2. The actual sent bytes (entry 11) are all on
   2026-07-05, so the S90 multi-day companion-date path (and the S93 date+time display) were NOT
   exercised by this send. De-emit verification is unaffected (still 0), but the cross-midnight
   live proof remains outstanding.
2. **"Newest by savedAt" ≠ the named recovery send.** The single newest entry by `savedAt` is
   idx 12, **LL-20260702-002 (Trip #8)**, saved ~46 s AFTER the recovery send (15:33:09 vs
   15:32:23 UTC) — a separate MAR-90 07-02 same-day log, also **0 LOST_GEAR_IND**. I matched the
   recovery send by `logId`+`TRIP_NUM` (the xml_archive stores neither filename nor CONF, so
   filename/CONF matching happens via the transmission register, not here). Worth confirming this
   second 07-02 send (Trip #8) was intended.

## Notes
- Read-only throughout: only `manifest.json` + the archive blob were opened for reading; nothing in
  the container was modified, deleted, or rewritten.
- CONF 163081 / WS0000 come from the transmission register (not the xml_archive); this doc verifies
  the emitted XML payload only, which is the point — "Accepted ✓ is not emit-proof."
