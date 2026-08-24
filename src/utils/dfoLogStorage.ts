import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateLgbkUid } from './dfoUids';
import { dfoKey, DFO_STORE_BASES } from './dfoStorageKeys';
import {
  DFO_FMA_LIST,
  DFO_LGRID_BY_FMA,
  DFO_FMA_LGRID_REQUIRED,
  DFO_SUBFORM_REGISTRY,
} from '../utils/dfoConstants';
// --- TYPES ---
export type DfoLogMode = 'full' | 'proposal';
export type DfoLogStatus = 'draft' | 'complete';

// Per-section REM (note) text, grouped at the human-section level. Each key fans out to
// one or more XSD REM nodes in dfoXmlGenerator.ts (T1 Logbook test):
//   trip -> TRIP | bait -> BAIT_USED (legacy fallback; bait notes are per-row since S134) |
//   haul -> EFFORT + EFFORT_BY_GEAR + EFFORT_DETAIL | catch -> CATCH | landing -> LANDING |
//   hlin -> HLIN | hlout -> HLOUT | pcons -> legacy shared PCONS fallback (bycatch notes are
//   per-row and Personal Use has its own key since S134 Phase 3) |
//   personalUse -> the Personal Use PCONS node | transfer -> TRANSFER + TRANSFER_DTL (QC-88) |
//   sar -> SAR
// All optional, free text, type string_2000 (max 2000 chars) in the XSD.
export interface LogRemarks {
  trip?: string;
  bait?: string;
  haul?: string;
  catch?: string;
  landing?: string;
  hlin?: string;
  hlout?: string;
  pcons?: string;
  personalUse?: string;
  transfer?: string;
  sar?: string;
}

// S121 multi-grid: one ADDITIONAL catch-effort block (EFFORT_DETAIL 2..n + its CATCH).
// Block 1 stays the legacy top-level data keys, so old logs and single-grid logs are
// untouched; blocks 2+ ride data.extraEffortDetails as a JSON array of these. All values
// are strings, matching the DfoLog.data map convention. The *Display twins are UI labels
// (grid number / section name); only the *Id/code fields reach the XML.
// S121 multi-SAR: one ADDITIONAL species-at-risk encounter (SAR node 2..n). Block 1 stays
// the legacy d.sar* keys; blocks 2+ ride data.extraSars as a JSON array of these. Emitted
// only when SAR_IND='Y' (same gate as block 1). `speciesOther`/`what` are UI-only, matching
// the block-1 fields that never reach the XML.
export interface ExtraSarDetail {
  species?: string;       // MV_SAR_LIST codeId → SAR.SPECIE_ID
  speciesOther?: string;  // UI-only free text (no XSD element)
  what?: string;          // UI-only description (stored, not emitted — matches block 1)
  lat?: string; lng?: string; gpsSrc?: string;
  date?: string; time?: string;   // YYYY-MM-DD / HH:MM → SAR_DT
  nbSpcmn?: string;
  condId?: string;        // MV_SPECIMENS_CONDITION codeId → SPCMN_COND_ID
  closeDt?: string;       // S124: per-block DG_CLOSE_DT (ISO) — SAR closes one block at a time
  note?: string;          // S135: per-block REM text; absent → falls back to rem.sar at emit
}

export interface ExtraEffortDetail {
  lgridCodeId?: string; lgridDisplay?: string;   // MAR settlement grid
  gridId?: string; gridDisplay?: string;         // QC grid (MV_GRID codeId)
  statSectId?: string; statSectDisplay?: string; // NL statistical section
  catchWeight?: string;
  trapHauls?: string;
  soakDuration?: string;                         // days in UI; minutes on the wire
  gpsLat?: string; gpsLng?: string; gpsSrc?: string;
  trapSize?: string;                             // NL TRP_SZ_ID
  nbSpcmnKept?: string;                          // NL CATCH count (Rule 976)
  nbSpcmnBrd?: string;                           // MAR 38b CATCH count (Rule 654)
  vNotchCount?: string; nbVntchYou?: string;     // QC FMA-gated v-notch counts
}

// S136 multi-effort: one ADDITIONAL fishing effort (EFFORT node 2..n — Rule 1050; XSD
// trip_type EFFORT 0..unbounded). ⚠ NAMING: this is the EFFORT level — a separate haul
// time window with its own licence, area, indicators and closure. It is NOT the trap-group
// level: `ExtraEffortDetail` above (state `extraEfforts`, data key `extraEffortDetails`)
// repeats EFFORT_DETAIL *within* one effort. The two levels never share a bare name —
// everything at this level says "Node".
// Effort 1 stays in the legacy flat data keys (fmaId, timeStartedHauling, sarYes, mmYes,
// dgCloseEffort, extraEffortDetails, remarks.haul/catch…); efforts 2+ ride
// data.extraEffortNodes as a JSON array of these, written only when a second effort exists
// (the S121/S135 additive pattern, third use). All values are strings per the data-map
// convention. Effort 1's note lives in log.remarks (haul/catch), so `note` here serves
// efforts 2+ only; it fans out inside its effort exactly as effort 1's does (S136 §1.2
// ruling: EFFORT.REM + EFFORT_BY_GEAR.REM + each EFFORT_DETAIL.REM + each CATCH.REM).
export interface ExtraEffortNode {
  haulStartDate?: string; haulStartTime?: string;  // → EFFORT.START_DT (own date + HH:MM)
  haulEndDate?: string;   haulEndTime?: string;    // → EFFORT.END_DT
  fmaId?: string;                                  // → EFFORT.FMA_ID (also gates the region fields)
  licNo?: string;                                  // → EFFORT.LIC_NO; blank → profile licence
  sarYes?: string;                                 // 'true'/'false' → SAR_IND Y/N
  mmYes?: string;                                  // 'true'/'false' → MM_INTER_IND Y/N
  gearSubtypeId?: string;                          // NL → EFFORT_BY_GEAR.GEAR_SBTYP_ID
  note?: string;                                   // per-effort REM text (fans out, see above)
  closeDt?: string;                                // per-effort DG_CLOSE_DT (ISO)
  details?: ExtraEffortDetail[];                   // its OWN trap groups (EFFORT_DETAIL 1..n)
}

export interface DfoLog {
  id: string;                    // e.g. "LL-20260421-001"
  lgbkUid: string;               // Rule 181: 6 random uppercase letters, permanent per log
  firstEntryDt: string;          // ISO UTC timestamp when log was first created
  mode: DfoLogMode;              // 'full' or 'proposal'
  status?: DfoLogStatus;         // 'draft' or 'complete'
  sentToDfo?: boolean;           // true once "Send to DFO" is confirmed
  dateFished: string;            // "YYYY-MM-DD"
  createdAt: number;             // timestamp, for sorting
  data: Record<string, string>;  // all form fields as key/value
  subformId?: number;            // 88 | 89 | 90 | 91 — defaults to 90 (MAR) if missing
  regId?: number;                // 1006 | 1014 | 1004 | 1002
  tripNum?: number;              // Rule 48: sequential per vessel trip, allocated at creation
  remarks?: LogRemarks;          // optional per-section REM notes (T1); rides along, no migration
}

// --- CORE HELPERS ---

// Load every saved log, newest first
export const loadAllLogs = async (): Promise<DfoLog[]> => {
  try {
    const raw = await AsyncStorage.getItem(dfoKey(DFO_STORE_BASES.dfo_logs));
    if (!raw) return [];
    const logs: DfoLog[] = JSON.parse(raw);
    // Back-fill status and sentToDfo for any logs saved before these fields existed
    const withDefaults = logs.map(l => ({
          ...l,
          status: l.status ?? ('complete' as DfoLogStatus),
          sentToDfo: l.sentToDfo ?? false,
          lgbkUid: l.lgbkUid ?? generateLgbkUid(),
          firstEntryDt: l.firstEntryDt ?? new Date(l.createdAt).toISOString(),
          subformId: l.subformId ?? 90,
          regId: l.regId ?? 1004,
        }));
    return withDefaults.sort((a, b) => b.createdAt - a.createdAt);
  } catch (err) {
    console.error('Failed to load DFO logs:', err);
    return [];
  }
};

// Save a new log OR update an existing one (by id)
export const saveLog = async (log: DfoLog): Promise<boolean> => {
  try {
    const existing = await loadAllLogs();
    const withoutThisId = existing.filter((l) => l.id !== log.id);
    const updated = [...withoutThisId, log];
    await AsyncStorage.setItem(dfoKey(DFO_STORE_BASES.dfo_logs), JSON.stringify(updated));
    return true;
  } catch (err) {
    console.error('Failed to save DFO log:', err);
    return false;
  }
};

// --- CRASH-SAFETY SCRATCH DRAFT (S95, Item 2) ---
// A single uid-namespaced in-progress snapshot, written debounced while a NEW log is being entered,
// so an app crash mid-entry can't destroy the trip. Cleared on successful save/back (and therefore
// before any send — a log must be saved before it can be sent). Intentionally NOT in DFO_STORE_BASES:
// it is transient device-local crash-safety, not user data to back up / migrate / wipe; the dfoKey()
// uid-namespacing keeps it account-isolated. Best-effort: never throws into a caller.
const ACTIVE_DRAFT_BASE = '@lobsterlog:dfo_active_draft';

export const saveActiveDraft = async (log: DfoLog): Promise<void> => {
  try {
    await AsyncStorage.setItem(dfoKey(ACTIVE_DRAFT_BASE), JSON.stringify(log));
  } catch (err) {
    console.error('Failed to write active draft:', err);
  }
};

export const loadActiveDraft = async (): Promise<DfoLog | null> => {
  try {
    const raw = await AsyncStorage.getItem(dfoKey(ACTIVE_DRAFT_BASE));
    if (!raw) return null;
    return JSON.parse(raw) as DfoLog;
  } catch (err) {
    console.error('Failed to read active draft:', err);
    return null;
  }
};

export const clearActiveDraft = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(dfoKey(ACTIVE_DRAFT_BASE));
  } catch (err) {
    console.error('Failed to clear active draft:', err);
  }
};

// Load a single log by its id
export const loadLogById = async (id: string): Promise<DfoLog | null> => {
  const all = await loadAllLogs();
  return all.find((l) => l.id === id) || null;
};

// Delete a log by id
export const deleteLog = async (id: string): Promise<boolean> => {
  try {
    const existing = await loadAllLogs();
    const filtered = existing.filter((l) => l.id !== id);
    await AsyncStorage.setItem(dfoKey(DFO_STORE_BASES.dfo_logs), JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error('Failed to delete DFO log:', err);
    return false;
  }
};

// Mark a log as sent to DFO
export const markSentToDfo = async (id: string): Promise<boolean> => {
  try {
    const existing = await loadAllLogs();
    const updated = existing.map(l => l.id === id ? { ...l, sentToDfo: true } : l);
    await AsyncStorage.setItem(dfoKey(DFO_STORE_BASES.dfo_logs), JSON.stringify(updated));
    return true;
  } catch (err) {
    console.error('Failed to mark log as sent:', err);
    return false;
  }
};

// Generate the next Trip ID for a given date
export const generateNewLogMeta = async (dateFished: string, subformId: number = 90): Promise<{
  id: string;
  lgbkUid: string;
  firstEntryDt: string;
  subformId: number;
  regId: number;
  tripNum: number;
}> => {
  const datePart = dateFished.replace(/-/g, '');
  const all = await loadAllLogs();
  const sameDay = all.filter((l) => l.id.startsWith(`LL-${datePart}-`));
  const nextSeq = (sameDay.length + 1).toString().padStart(3, '0');
  const regId = DFO_SUBFORM_REGISTRY[subformId]?.regId ?? 1004;
  // Rule 48: trip number allocated automatically and sequentially per new vessel trip.
  // Logs saved before tripNum existed count via all.length so numbering never collides.
  const tripNum = Math.max(all.length, ...all.map(l => l.tripNum ?? 0)) + 1;
  return {
    id: `LL-${datePart}-${nextSeq}`,
    lgbkUid: generateLgbkUid(),
    firstEntryDt: new Date().toISOString(),
    subformId,
    regId,
    tripNum,
  };
};

// --- DRAFT HELPERS ---

// Save a draft (status = 'draft') — all other fields same as saveLog
export const saveDraft = async (log: Omit<DfoLog, 'status'>): Promise<boolean> => {
  return saveLog({ ...log, status: 'draft' });
};

// --- S125 Phase 9: the SINGLE per-data-group "used" definition ---
// One formula, two callers (ruling 2): FullDfoForm.openUsedGroups (the Close & Save controls, from
// live state) and the send-path guard (from a stored log). Keeping it single-sourced is what stops
// a group being silently dropped from a file. Keys are the generator's dgClose* data-map keys.
export interface DataGroupInputs {
  subformId: number;
  fmaId: number;            // NaN when absent — the hlFma test below is false for NaN
  effortYes: boolean;       // S128 Phase 5: false on a no-haul (setting) day → EFFORT omitted
  baitCount: number;
  bycatchYes: boolean;
  bycatchCount: number;
  personalUse: string;
  sarYes: boolean;
  transferYes: boolean;
  hlinCompany: string; hlinConfirmNo: string;
  hloutCompany: string; hloutConfirmNo: string;
}

export function usedDataGroupKeys(v: DataGroupInputs): string[] {
  const hlFma = v.fmaId === 28599 || v.fmaId === 1595;
  const used: Record<string, boolean> = {
    // S128 Phase 5: EFFORT is used only when a haul is declared — on a no-haul day the generator
    // omits the whole EFFORT node (dfoXmlGenerator: `if (d.effortYes !== 'false')`), so counting
    // it "used" over-counted the open sections and stamped an orphan close nothing reads.
    dgCloseEffort: v.effortYes,
    dgCloseLanding: true,   // LANDING always used (port landed is mandatory)
    dgCloseBaitUsed: v.baitCount > 0,
    dgClosePconsBycatch: v.bycatchYes && v.bycatchCount > 0,
    dgClosePconsPersonal: v.subformId === 90 && v.personalUse.trim().length > 0,
    // SAR lives inside EFFORT — the generator gates it on effortYes too, so it can't be "used"
    // on a no-haul day even if a stale sarYes survived a haul→no-haul toggle.
    dgCloseSar: v.effortYes && v.sarYes,
    dgCloseTransfer: v.subformId === 88 && v.transferYes,
    dgCloseHlin: hlFma && !!(v.hlinCompany || v.hlinConfirmNo),
    dgCloseHlout: hlFma && !!(v.hloutCompany || v.hloutConfirmNo),
  };
  return Object.keys(used).filter(k => used[k]);
}

// Data-side adapter: build the inputs from a stored log's data map (the same representation the
// generator reads). Single-sourced so the "data map → used" mapping lives in exactly one place.
export function dataGroupInputsFromLog(log: Pick<DfoLog, 'subformId' | 'data'>): DataGroupInputs {
  const d = log.data;
  const len = (s?: string) => { try { return (JSON.parse(s || '[]') as unknown[]).length; } catch { return 0; } };
  return {
    subformId: log.subformId ?? 90,
    fmaId: Number(d.fmaId),
    // Matches the generator's gate exactly: missing key (old logs) = haul, only 'false' = no-haul.
    effortYes: d.effortYes !== 'false',
    baitCount: len(d.baitEntries),
    bycatchYes: d.bycatchYes === 'true',
    bycatchCount: len(d.bycatchEntries),
    personalUse: d.personalUse ?? '',
    // S136 Phase 4: SAR_IND is per-effort — the trip-level SAR pool is "used" (and emitted)
    // when ANY effort answered Yes, matching the generator's gate exactly. Single-effort
    // logs behave identically (effort 1's sarYes IS d.sarYes).
    sarYes: effortsFromData(d).some(e => e.sarYes === 'true'),
    transferYes: d.transferYes === 'true',
    hlinCompany: d.hlinCompany ?? '', hlinConfirmNo: d.hlinConfirmNo ?? '',
    hloutCompany: d.hloutCompany ?? '', hloutConfirmNo: d.hloutConfirmNo ?? '',
  };
}

// S134: bait — and, since Phase 3, bycatch — close PER ROW (per-occurrence closure, §5).
// A row-based group counts as closed when the legacy card-level stamp exists OR every
// stored row carries its own closeDt. One definition, two callers per group (the send
// guard below and FullDfoForm's openUsedGroups) — keep them on this helper so they can't drift.
export function rowsAllClosed(entriesJson?: string): boolean {
  try {
    const rows = JSON.parse(entriesJson || '[]') as { closeDt?: string }[];
    return rows.length > 0 && rows.every(r => !!r.closeDt);
  } catch { return false; }
}
// Bait-named alias kept so the S134 bait-pilot call sites and tests stay untouched.
export const baitRowsAllClosed = rowsAllClosed;

// S134 T1: stamp every still-open row with `stamp`; rows that already carry their own
// closeDt are untouched (skip, never restamp). Serves bait AND bycatch (S134 Phase 3),
// three callers each in FullDfoForm: the card's close-all button, the group's member of
// the form-level Close & Save All (both of which write NO card-level stamp — only rows
// have close states), and the adopt-on-add path that converts a legacy card-level stamp
// into per-row stamps (same value → identical emitted bytes) so a newly added row can
// never inherit a close.
export function stampOpenRows(entriesJson: string | undefined, stamp: string): string {
  try {
    const rows = JSON.parse(entriesJson || '[]') as { closeDt?: string }[];
    return JSON.stringify(rows.map(r => (r.closeDt ? r : { ...r, closeDt: stamp })));
  } catch { return entriesJson ?? '[]'; }
}
// Bait-named alias kept so the S134 bait-pilot call sites and tests stay untouched.
export const stampOpenBaitRows = stampOpenRows;

// S135: SAR closes PER BLOCK (§5 per-occurrence closure — the bait/bycatch pattern, but
// SAR's occurrences are NOT one uniform JSON array: block 1 lives as flat d.sar* keys with
// its own stamp/note in the new flat d.sarCloseDt / d.sarNote keys (ruling 1 — block 1
// does not move into extraSars), blocks 2+ ride d.extraSars. This is THE one reader that
// synthesizes the uniform block list, mirroring the synthesis the generator's <SAR> loop
// has done since S121. The emit, the send-guard escape below, and FullDfoForm's close-all
// all read THIS list, so they cannot disagree about what a "block" is.
export function sarBlocksFromData(d: Record<string, string | undefined>): ExtraSarDetail[] {
  let extraSars: ExtraSarDetail[] = [];
  try {
    const parsed = JSON.parse(d.extraSars || '[]');
    if (Array.isArray(parsed)) extraSars = parsed;
  } catch { /* noop */ }
  return [
    { species: d.sarSpecies, lat: d.sarLat, lng: d.sarLng, gpsSrc: d.sarGpsSrc,
      date: d.sarDate, time: d.sarTime, nbSpcmn: d.sarNbSpcmn, condId: d.sarCondId,
      closeDt: d.sarCloseDt || undefined, note: d.sarNote || undefined },
    ...extraSars,
  ];
}

// True when EVERY SAR block carries its own close stamp. Block 1 is always in the reader's
// list, so this is never vacuously true — an unstamped block 1 keeps the group open.
export function sarBlocksAllClosed(d: Record<string, string | undefined>): boolean {
  return sarBlocksFromData(d).every(b => !!b.closeDt);
}

// S135 Phase 2: the close-all-visibility / toggle-lockout predicates, single-sourced so the
// UI and the tests read the same rule. A block counts as closed by its own stamp OR by the
// legacy card-level dgCloseSar, which closed every block at once — so a legacy-closed log
// has nothing open and at least one thing closed.
export function sarBlocksAnyClosed(d: Record<string, string | undefined>): boolean {
  return !!d.dgCloseSar || sarBlocksFromData(d).some(b => !!b.closeDt);
}
export function sarBlocksAnyOpen(d: Record<string, string | undefined>): boolean {
  return !d.dgCloseSar && sarBlocksFromData(d).some(b => !b.closeDt);
}

// S135 Phase 2: stamp every still-open SAR block with `stamp` — block 1 via the flat
// sarCloseDt (kept if already set, never restamped), blocks 2+ via stampOpenRows (same
// skip-never-restamp rule). ONE definition for both writers (the SAR card's close-all and
// the form-level Close & Save All), mirroring stampOpenRows for bait/bycatch.
export function stampOpenSarBlocks(
  sarCloseDt: string | undefined,
  extraSarsJson: string | undefined,
  stamp: string,
): { sarCloseDt: string; extraSars: string } {
  return {
    sarCloseDt: sarCloseDt || stamp,
    extraSars: stampOpenRows(extraSarsJson, stamp),
  };
}

// S136 Phase 1: THE one reader that synthesizes the uniform effort list, mirroring
// sarBlocksFromData. Effort 1 is synthesized first from the legacy flat keys — including
// its trap groups (the legacy top-level detail fields as group 1, then extraEffortDetails),
// which until S136 the generator synthesized locally — then efforts 2+ from
// data.extraEffortNodes. The emit, the send guard and the close-all all read THIS list, so
// they cannot disagree about what an "effort" is. Effort 1's note is NOT here (it lives in
// log.remarks, which `d` cannot see) — the generator branches on index 0 for notes.
export function effortsFromData(d: Record<string, string | undefined>): ExtraEffortNode[] {
  let extraDetails: ExtraEffortDetail[] = [];
  try {
    const parsed = JSON.parse(d.extraEffortDetails || '[]');
    if (Array.isArray(parsed)) extraDetails = parsed;
  } catch { /* noop */ }
  let extraNodes: ExtraEffortNode[] = [];
  try {
    const parsed = JSON.parse(d.extraEffortNodes || '[]');
    if (Array.isArray(parsed)) extraNodes = parsed;
  } catch { /* noop */ }
  return [
    {
      haulStartDate: d.haulStartDate, haulStartTime: d.timeStartedHauling,
      haulEndDate: d.haulEndDate, haulEndTime: d.timeStoppedHauling,
      fmaId: d.fmaId,
      // S136 Phase 3 (ruling 5): effort 1's licence can be edited on the card; the override
      // rides the flat d.licNo key (absent on every pre-S136 log → profile licence, the
      // legacy behavior, byte-identical).
      licNo: d.licNo || undefined,
      sarYes: d.sarYes, mmYes: d.mmYes,
      gearSubtypeId: d.gearSubtypeId,
      closeDt: d.dgCloseEffort || undefined,
      details: [
        {
          lgridCodeId: d.lgridCodeId, gridId: d.gridId, statSectId: d.statSectId,
          catchWeight: d.catchWeight, trapHauls: d.trapHauls, soakDuration: d.soakDuration,
          gpsLat: d.gpsLat, gpsLng: d.gpsLng, gpsSrc: d.gpsSrc, trapSize: d.trapSize,
          nbSpcmnKept: d.nbSpcmnKept, nbSpcmnBrd: d.nbSpcmnBrd,
          vNotchCount: d.vNotchCount, nbVntchYou: d.nbVntchYou,
        },
        ...extraDetails,
      ],
    },
    ...extraNodes,
  ];
}

// True when EVERY effort carries its own close stamp (effort 1's = the legacy
// dgCloseEffort). Effort 1 is always in the reader's list, so this is never vacuously true.
export function effortsAllClosed(d: Record<string, string | undefined>): boolean {
  return effortsFromData(d).every(e => !!e.closeDt);
}

export function effortsAnyOpen(d: Record<string, string | undefined>): boolean {
  return effortsFromData(d).some(e => !e.closeDt);
}

// S136 Phase 4 extraction (ruled): the toggle-refusal predicates live HERE, single-sourced
// the way sarBlocksAnyClosed was in S135 — the component calls them, it does not own the
// logic. All three read the ONE effort reader, so the refusals and the emit can never
// disagree about what an "effort" is.

// True when ANY effort carries a close stamp (effort 1's = the flat dgCloseEffort, via the
// reader). This is the "Did you haul gear?" No-refusal condition (§4.2 ruling): a closed
// effort is irreversible (§5.2.1), so the wipe must be refused. NOTE: anyClosed is NOT
// !effortsAnyOpen — with two efforts one closed and one open, both are true.
export function effortsAnyClosed(d: Record<string, string | undefined>): boolean {
  return effortsFromData(d).some(e => !!e.closeDt);
}

// True when an effort OTHER than reader-index exceptIdx (0 = effort 1) answers SAR = Yes.
// While another effort says Yes, the trip-level SAR pool stays emitted, so this effort's
// flag may flip to No freely — no wipe, no refusal.
export function sarYesOnAnotherEffort(d: Record<string, string | undefined>, exceptIdx: number): boolean {
  return effortsFromData(d).some((e, i) => i !== exceptIdx && e.sarYes === 'true');
}

// The SAR flip-to-No refusal for the effort at reader-index exceptIdx: refused when this
// is the LAST effort answering Yes AND any SAR block is closed (own stamp or the legacy
// card stamp) — dropping the last Yes would take the closed, irreversible blocks out of
// the emit (the S128 hole). With another effort still Yes the pool stands and the flip is
// free; with only open blocks the wipe behaves as before.
export function sarNoToggleRefused(d: Record<string, string | undefined>, exceptIdx: number): boolean {
  return !sarYesOnAnotherEffort(d, exceptIdx) && sarBlocksAnyClosed(d);
}

// S137 Phase 6: true when ANY effort answered marine-mammal Yes — effort 1's flat mmYes and
// the extras' node flags, through the ONE effort reader (the sarYes twin at the callers above).
export function mmYesOnAnyEffort(d: Record<string, string | undefined>): boolean {
  return effortsFromData(d).some(e => e.mmYes === 'true');
}

// S137 Phase 6: a minimal structural view of a Form 222 entry. Deliberately NOT the
// Form222Entry type — importing it would close the cycle dfoLogStorage →
// dfoForm222Generator → dfoXmlGenerator → dfoLogStorage (the S90 clampCoord4 hazard class).
export interface Form222LinkView {
  interactInd: string;
  status?: string;
  sentToDfo?: boolean;
  closeDt?: string;
  lgbkNumRef?: string;
}

// S137 Phase 6: the logs that owe a marine-mammal declaration — the red-button condition
// (rulings R-D/R-E/R-F). A log owes when (a) any effort answered MM Yes, (b) it is closed
// (status 'complete' — sent logs are complete too, so they stay in), and (c) no QUALIFYING
// 222 names its lgbkUid. Qualifying = a Yes-declaration that is not a draft by the list's
// own S125 classification: sent, or complete with a real Close & Save stamp (closeDt) —
// pre-S125 sent records lack closeDt, which is why the sentToDfo arm exists. An N-entry
// never discharges (R-F), and deleting the qualifying 222 re-opens the debt because this
// is computed live from both stores (R-G).
export function logsOwingForm222<
  T extends { status?: DfoLogStatus; lgbkUid: string; data: Record<string, string | undefined> },
>(
  logs: T[],
  entries: Form222LinkView[],
): T[] {
  const cleared = new Set(
    entries
      .filter(e =>
        e.interactInd === 'Y' &&
        (e.sentToDfo === true || (e.status === 'complete' && !!e.closeDt)) &&
        !!e.lgbkNumRef)
      .map(e => e.lgbkNumRef as string),
  );
  return logs.filter(l =>
    l.status === 'complete' && mmYesOnAnyEffort(l.data) && !cleared.has(l.lgbkUid));
}

// Stamp every still-open effort with `stamp` — effort 1 via the flat dgCloseEffort (kept if
// already set, never restamped), efforts 2+ via their own closeDt (same skip rule). ONE
// definition for both writers (the per-card close-all and the form-level Close & Save All),
// mirroring stampOpenSarBlocks.
export function stampOpenEfforts(
  dgCloseEffort: string | undefined,
  extraEffortNodesJson: string | undefined,
  stamp: string,
): { dgCloseEffort: string; extraEffortNodes: string } {
  let nodes: ExtraEffortNode[] = [];
  try {
    const parsed = JSON.parse(extraEffortNodesJson || '[]');
    if (Array.isArray(parsed)) nodes = parsed;
  } catch { /* noop */ }
  return {
    dgCloseEffort: dgCloseEffort || stamp,
    extraEffortNodes: JSON.stringify(nodes.map(e => (e.closeDt ? e : { ...e, closeDt: stamp }))),
  };
}

// The send-path guard's refusal list: used groups whose data map carries NO real close stamp.
// Non-empty ⇒ the send must refuse and name these sections (loud, not lossy).
// S134: the row-based groups (bait; bycatch since Phase 3) are also satisfied by
// all-rows-closed — nothing writes their card keys any more (legacy logs only), so a log
// whose rows were each closed individually must not be refused.
// S135: SAR joins them — closed when the legacy card stamp exists OR every block from
// sarBlocksFromData carries its own stamp.
// S136: EFFORT closes PER OCCURRENCE — dgCloseEffort is effort 1's OWN stamp, not a
// card-level one, so the effort key is judged on the whole list: unclosed whenever ANY
// effort from effortsFromData lacks its stamp (a set dgCloseEffort no longer satisfies the
// guard while an effort 2+ is open). Single-effort legacy logs behave identically (their
// one effort's closeDt IS dgCloseEffort).
export function unclosedUsedGroupKeys(log: Pick<DfoLog, 'subformId' | 'data'>): string[] {
  return usedDataGroupKeys(dataGroupInputsFromLog(log)).filter(k => {
    if (k === 'dgCloseEffort') return !effortsAllClosed(log.data);
    return !log.data[k]
      && !(k === 'dgCloseBaitUsed' && rowsAllClosed(log.data.baitEntries))
      && !(k === 'dgClosePconsBycatch' && rowsAllClosed(log.data.bycatchEntries))
      && !(k === 'dgCloseSar' && sarBlocksAllClosed(log.data));
  });
}

// --- S128 Phase 1: per-section REM note lock (§5.2.1 irreversibility) ---
// Once a data group's DG_CLOSE_DT is stamped, NOTHING that group transmits can change —
// and that includes its REM note. This maps each LogRemarks note key to the data-group
// close key(s) whose stamp freezes it. A note is locked the moment ANY group it transmits
// into is closed (founder ruling S128: 'pcons' rides BOTH PCONS occurrences — Bycatch AND
// Personal Use — so either close freezes it). 'trip' has no close control (never locked)
// and is intentionally absent from the map.
// S134: 'bait' is absent too — bait notes are PER ROW now (each row's note rides the row,
// locked by that row's own close). The legacy card-level rem.bait has no edit surface any
// more (the bait card's Add-a-note affordance was removed), so it needs no lock entry; it
// still EMITS as the fallback for legacy rows without their own note.
// S134 Phase 3: 'pcons' is absent for the same reason — bycatch notes are per row, and the
// Interactions & Other header note affordance was removed; the legacy shared rem.pcons
// still emits as the fallback. Personal Use gained its OWN note ('personalUse'), locked by
// the Personal Use close (it stays a single occurrence with a single card-level close).
// S135 Phase 2: 'sar' is absent too — SAR notes are PER BLOCK now (block 1's rides the flat
// sarNote key, blocks 2+ ride their extraSars item; each locks with its own block's close).
// The legacy shared rem.sar has no edit surface any more and still emits as the fallback.
export const NOTE_CLOSE_KEYS: Record<string, string[]> = {
  landing:     ['dgCloseLanding'],
  catch:       ['dgCloseEffort'],   // the Catch & Effort note writes catch+haul, all inside EFFORT
  haul:        ['dgCloseEffort'],   // (haul is written together with catch; same close group)
  personalUse: ['dgClosePconsPersonal'],
  transfer:    ['dgCloseTransfer'],
  hlin:        ['dgCloseHlin'],
  hlout:       ['dgCloseHlout'],
};

// True when the note for `noteKey` may no longer change because a group it transmits into
// is already closed. `closes` is the DG_CLOSE_DT stamp map (data-map keys → ISO stamp).
export function isNoteLocked(noteKey: string, closes: Record<string, string>): boolean {
  return (NOTE_CLOSE_KEYS[noteKey] ?? []).some(k => !!closes[k]);
}

// --- COMPLETION PERCENTAGE ---

// Required fields for the Full DFO form — per subform
export const FULL_DFO_REQUIRED_FIELDS: Record<number, string[]> = {
  88: ['operName', 'startDt', 'fmaId', 'gridId', 'catchWeight', 'trapHauls', 'lgbkUid', 'firstEntryDt', 'crewNb', 'portId', 'gpsCoords', 'sailTime', 'haulStartTime', 'haulEndTime', 'landingTime'],
  89: ['operName', 'startDt', 'fmaId', 'catchWeight', 'trapHauls', 'lgbkUid', 'firstEntryDt', 'gpsCoords', 'sailTime', 'haulStartTime', 'haulEndTime', 'landingTime'],
  90: ['operName', 'startDt', 'fmaId', 'lgridCodeId', 'catchWeight', 'trapHauls', 'lgbkUid', 'firstEntryDt', 'crewNb', 'sailTime', 'haulStartTime', 'haulEndTime', 'landingTime'],
  91: ['operName', 'startDt', 'fmaId', 'catchWeight', 'trapHauls', 'lgbkUid', 'firstEntryDt', 'portId', 'trapSize', 'gearSubtypeId', 'statSectId', 'nbSpcmnKept', 'sailTime', 'haulStartTime', 'haulEndTime', 'landingTime'],
};

export function getRequiredFields(subformId: number): string[] {
  return FULL_DFO_REQUIRED_FIELDS[subformId] ?? FULL_DFO_REQUIRED_FIELDS[90];
}

// Required fields for the Proposal form (9 text fields + bycatch array = 10 total)
const PROPOSAL_REQUIRED_FIELDS = [
  'dateFished', 'departurePort', 'portLanded', 'crewRegistry',
  'gridNumber', 'catchWeight', 'trapHauls',
  'timeStartedHauling', 'timeStoppedHauling',
];

export const getCompletionPercent = (log: DfoLog): number => {
  const requiredFields = log.mode === 'full'
    ? getRequiredFields(log.subformId ?? 90)
    : PROPOSAL_REQUIRED_FIELDS;

  // Merge dateFished into data map for unified lookup
  const dataWithTop: Record<string, string> = {
    dateFished: log.dateFished,
    ...log.data,
  };

  let filled = 0;
  for (const field of requiredFields) {
    const val = dataWithTop[field];
    if (val && val.trim() !== '') filled++;
  }

  // Array fields: bait (full only) + bycatch (both)
  const arrayTotal = log.mode === 'full' ? 2 : 1;
  let arrayFilled = 0;

  try {
    const bycatch = JSON.parse(log.data.bycatchEntries || '[]');
    if (bycatch.length > 0) arrayFilled++;
  } catch { /* noop */ }

  if (log.mode === 'full') {
    try {
      const bait = JSON.parse(log.data.baitEntries || '[]');
      if (bait.length > 0) arrayFilled++;
    } catch { /* noop */ }
  }

  const total = requiredFields.length + arrayTotal;
  return Math.round(((filled + arrayFilled) / total) * 100);
};

// --- LAST LOG HELPER ---

// Returns the single most recent completed log (any form type),
// used to pre-fill crew and ports on a new log.
export const loadLastLog = async (): Promise<DfoLog | null> => {
  const all = await loadAllLogs(); // already sorted newest first
  return all.find(l => l.status === 'complete') ?? null;
};

// --- TRANSMISSION REGISTER (DFO Standard: 3-year retention) ---

const THREE_YEARS_MS = 94608000000;

export interface TransmissionRecord {
  id: string;           // same as the DfoLog id it belongs to
  logId: string;        // DfoLog.id
  attemptedAt: number;  // Date.now()
  outcome: 'success' | 'failure';
  httpStatus?: number;  // HTTP status code if available
  errorMessage?: string;
  fileName?: string;    // transmitted XML file name (Standard v6.1 §13.3.1)
  confNumber?: string;  // <CONF> from WS_RESP, when the service returned one
  xmlSnapshot: string;  // the full XML string that was sent
  soapSnapshot: string; // the full SOAP envelope that was sent
  // §13.3.1 register snapshot — point-in-time values captured at send (Session 60).
  // These are NOT re-derived at display time: they record what was true when sent.
  vrn?: string;         // vessel registration number (captainProfile.vesselNumber at send)
  tripNum?: number;     // DfoLog.tripNum at send (Rule 48 sequential trip number)
  xsdValid?: boolean;   // result of validateElogXml() run before the POST
  wsErrCode?: string;   // parsed WS_RESP <ERR> (e.g. 'WS0000' on success)
  kind?: 'logbook' | 'form222' | 'form233';  // discriminator for Scope B register display
}

export async function saveTransmissionRecord(record: TransmissionRecord): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(dfoKey(DFO_STORE_BASES.transmission_register));
    const existing: TransmissionRecord[] = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - THREE_YEARS_MS;
    const pruned = existing.filter(r => r.attemptedAt >= cutoff);
    pruned.push(record);
    await AsyncStorage.setItem(dfoKey(DFO_STORE_BASES.transmission_register), JSON.stringify(pruned));
  } catch (err) {
    console.error('Failed to save transmission record:', err);
  }
}

export async function loadTransmissionRegister(): Promise<TransmissionRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(dfoKey(DFO_STORE_BASES.transmission_register));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function transmissionKind(
  record: Pick<TransmissionRecord, 'kind' | 'logId'>
): 'logbook' | 'form222' | 'form233' {
  // Prefer the explicit kind field when present (new records stamp it).
  if (record.kind) return record.kind;
  // Fall back to the logId prefix so pre-existing records (e.g. the S70
  // live 222/233 sends) classify with no migration / no re-send.
  if (record.logId.startsWith('FORM222-')) return 'form222';
  if (record.logId.startsWith('FORM233-')) return 'form233';
  return 'logbook';
}

// --- XML ARCHIVE (DFO Standard: 3-year retention) ---

export interface XmlArchiveEntry {
  logId: string;
  savedAt: number;  // Date.now()
  xml: string;      // full XML string (not SOAP wrapped)
}

export async function saveXmlArchiveEntry(entry: XmlArchiveEntry): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(dfoKey(DFO_STORE_BASES.xml_archive));
    const existing: XmlArchiveEntry[] = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - THREE_YEARS_MS;
    const pruned = existing.filter(e => e.logId !== entry.logId && e.savedAt >= cutoff);
    pruned.push(entry);
    await AsyncStorage.setItem(dfoKey(DFO_STORE_BASES.xml_archive), JSON.stringify(pruned));
  } catch (err) {
    console.error('Failed to save XML archive entry:', err);
  }
}

export async function loadXmlArchive(): Promise<XmlArchiveEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(dfoKey(DFO_STORE_BASES.xml_archive));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}