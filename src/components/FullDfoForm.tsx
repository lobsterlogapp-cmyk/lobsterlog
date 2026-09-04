import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useTimer } from '../context/TimerContext';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Dimensions,
  Alert,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { openAndroidDateTime, openAndroidDate } from '../utils/androidDateTimePicker';
import * as Location from 'expo-location';
import {
  Calendar,
  Anchor,
  Scale,
  Clock,
  Fish,
  Info,
  Save,
  Play,
  Square,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  AlertTriangle,
  LocateFixed,
  StickyNote,
  Lock,
  Edit3,
} from 'lucide-react-native';
import {
  saveLog,
  saveDraft,
  loadLogById,
  loadAllLogs,          // S147 Run 4 (Rule 33) — the register snapshot the close doors ask
  generateNewLogMeta,
  loadLastLog,
  saveActiveDraft,
  loadActiveDraft,
  clearActiveDraft,
  DfoLog,
  LogRemarks,
  ExtraEffortDetail,
  ExtraEffortNode,
  ExtraSarDetail,
  usedDataGroupKeys,
  stampOpenEfforts,
  effortsFromData,
  effortsAnyOpen,
  effortsAnyClosed,
  sarYesOnAnotherEffort,
  sarNoToggleRefused,
  fishesHailArea,
  fishes38b,
  baitRowsAllClosed,
  stampOpenBaitRows,
  rowsAllClosed,
  stampOpenRows,
  sarBlocksFromData,
  sarBlocksAllClosed,
  sarBlocksAnyClosed,
  sarBlocksAnyOpen,
  stampOpenSarBlocks,
  isNoteLocked,
  effortDeleteRefused,
  closedRowActionRefused,
  LOG_REMARK_KEYS,
  seedRemarksFromLog,
  closedWeightUnit,
  weightFromKg,
  reunitOpenWeights,
  DRAFT_WEIGHT_UNIT_KEY,
  sealBaitRowWeights,
  sealBycatchRowWeights,
  sealEffort1Weights,
  sealEffortNodeWeights,
  sealPersonalUseWeight,
  sealTransferWeight,
  sealHailInWeight,
  sealSarBlock1Weight,
  sealSarBlockWeights,
} from '../utils/dfoLogStorage';
import type { WeightUnit } from '../utils/dfoLogStorage';
import { triggerBackup } from '../utils/dfoBackup';
import { isFieldRequired, missingInContainer, MissingField, FieldValues, EFFORT_LEVEL_KEYS, latestEffortEnd, missingFieldIsMixed, outOfTableInvalid } from '../utils/dfoRequirements';
// S147 Run 4 (Rule 33, BE-1): the ONE clock rule that is not a requirements-table entry — it
// reads every other saved log, which FieldValues cannot carry. See effortOverlapBullet below.
import { findEffortOverlap } from '../utils/dfoXmlGenerator';
import { applySarCaptureChoice, SarBlockWriter, SarCaptureDeps } from '../utils/sarCapture';
import { REQUIRED_ASTERISK_COLOR } from '../styles/GlobalStyles';
import {
  DFO_FMA_LIST,
  DFO_LGRID_BY_FMA,
  DFO_STAT_SECT_BY_FMA,
  DFO_FMA_STAT_SECT_REQUIRED,
  DFO_FMA_GRID_MAP,
  getDfoFmaList,
  getDfoBaitTypeList,
  baitConditionState,
  getDfoPconsSpeciesList,
  DFO_SUBFORM_FIELD_CONFIG,
  DFO_FMA_38B,
  effortCoordsEntryAllowed,
  DFO_FMA_NB_VNTCH,
  DFO_FMA_NB_VNTCH_YOU,
  DFO_TRAP_SIZE_LIST,
  DFO_GEAR_SUBTYPE_LIST,
  DFO_HLIN_COMPANY_LIST,
  DFO_HLOUT_COMPANY_LIST,
  DFO_SPECIE_SZ_LABEL_OVERRIDE,
  glfLegalSpecieSzIds,
  DFO_SAR_SPECIES_OFFERED,
  clampCoord4,
} from '../utils/dfoConstants';
import { loadCaptainProfile } from '../utils/captainStorage';
import { useTranslation } from 'react-i18next';
import CrewSelector from './CrewSelector';
import DfoPortSelector from './DfoPortSelector';
import { CrewMember } from '../utils/crewStorage';
import { MV_CATCH_USAGE, MV_PARTNERSHIP_TYPE, MV_SAR_LIST, MV_SPECIMENS_CONDITION, MV_BAIT_CONDITION, MV_GRID, MV_BAIT_TYPE, MV_SPECIES, MV_SPECIES_SIZE } from '../data/reftables';

export interface FullDfoFormHandle {
  saveDraft: () => Promise<void>;
}

interface FullDfoFormProps {
  editingLogId: string | null;
  onSaved: () => void;
  readOnly?: boolean;
  onBack?: () => void;
}

// S134: closeDt/note are OPTIONAL additions — each bait row is its own BAIT_USED occurrence
// and closes independently (§5 per-occurrence closure). Legacy rows without them parse
// unchanged and fall back to the card-level dgCloseBaitUsed STAMP at emit. S142 (defect 44):
// there is no longer a note fallback — a row with no note of its own emits no REM.
// S153 Phase 1: closeUnit is the unit this row's lbs was CONVERTED AND STORED in at its own
// close (R1/R2). It rides beside closeDt because the row is what closes — founder ruling A
// accepts that two rows of one card may therefore carry different units. Absent = pounds (R5).
type BaitEntry = { type: string; lbs: string; condition?: number; closeDt?: string; closeUnit?: WeightUnit; note?: string; };
// S134 Phase 3: closeDt/note are OPTIONAL additions — each bycatch row is its own PCONS
// occurrence and closes independently (the bait pattern). Legacy rows parse unchanged and
// fall back to the card-level dgClosePconsBycatch STAMP at emit. S142 (defect 44): there is
// no longer a note fallback — a row with no note of its own emits no REM.
// S153 Phase 1: closeUnit as on BaitEntry above — same shape, same reason, same fallback.
// S158 (defect 133): specieSzId is the PCONS.SPECIE_SZ_ID the harvester picks — Mandatory on
// GLF(89), Blocked on 88/90/91 (Subforms row 56). OPTIONAL on the type, like usage: rows saved
// before S158 carry no size and must read BLANK (ruling R4 — never pre-seed the value the app
// used to invent). The close door is what asks him for it.
type BycatchEntry = { species: string; lbs: string; usage?: string; specieSzId?: string; closeDt?: string; closeUnit?: WeightUnit; note?: string; };

// S124 Phase 3: the dgClose* data-map keys the generator reads for DG_CLOSE_DT, one per
// closeable Form-234 data group (§5.2.1). PCONS has two occurrences (bycatch + personal use);
// SAR closes as one block (whole-sub-card, S124 ruling); Landing (dgCloseLanding) is added in
// Phase 5. These are the keys hydrated into / written from the `closes` state.
const CLOSE_DATA_KEYS = [
  'dgCloseEffort', 'dgCloseBaitUsed', 'dgClosePconsBycatch', 'dgClosePconsPersonal',
  'dgCloseSar', 'dgCloseTransfer', 'dgCloseHlin', 'dgCloseHlout', 'dgCloseLanding',
] as const;

// S153 Phase 1: the flat unit tags, mirroring CLOSE_DATA_KEYS exactly — hydrated into and
// written from their own `closeUnits` state, spread into the data map beside `...closes`.
// FOUR keys, not nine: only the groups that (a) seal a weight AND (b) have no per-row or
// per-node home of their own. Bait and bycatch tag their ROWS; efforts 2+ tag their NODE;
// HLOUT and LANDING seal no weight at all. Effort 1 is here because it lives in the
// legacy flat keys and has no node to carry it.
//
// ⚠ S153B: SAR now seals a weight too (SAR.WT), but it is deliberately NOT a fifth key here.
// This array mirrors CLOSE_DATA_KEYS, whose SAR member is `dgCloseSar` — the LEGACY CARD
// stamp, which no longer closes anything (S135 ruling 4: only blocks close). Block 1's real
// stamp is the flat `sarCloseDt`, so its tag is the flat `sarCloseUnit`, hydrated and written
// with the other sar* scalars; blocks 2+ tag their own ExtraSarDetail. Pairing the tag with
// `dgCloseSar` here would hang it off a stamp that is never written.
const CLOSE_UNIT_DATA_KEYS = [
  'dgCloseEffortUnit', 'dgClosePconsPersonalUnit', 'dgCloseTransferUnit', 'dgCloseHlinUnit',
] as const;

// MARINE_MAMMAL_OPTIONS removed (S136 Phase 2, ruling 4) — the MM detail fields left the
// 234 surface; species capture lives on Form 222 (MV_NOAA_MM_SPECIES).

// PCONS USG_ID choices offered on MAR-90 bycatch entries — a curated subset of
// MV_CATCH_USAGE_rel1 (generated reftable). Labels render via i18n usageOption_<codeId>;
// descEn here is the fallback. Order is the picker display order.
const PCONS_USAGE_CODE_IDS = [37822, 37814, 37818, 37820, 37824];
const BYCATCH_USAGE_OPTIONS = PCONS_USAGE_CODE_IDS
  .map(id => MV_CATCH_USAGE.find(u => u.codeId === id))
  .filter((u): u is NonNullable<typeof u> => u != null)
  .map(u => ({ label: u.descEn, value: String(u.codeId) }));

// Locale display text for a generated-reftable row — descFr in French with descEn as the
// fallback (S98 pattern). Display-only; stored values stay the codeId.
const refDesc = (r: { descEn: string; descFr?: string } | undefined, isFr: boolean) =>
  r ? (isFr && r.descFr) || r.descEn : undefined;

// S159 (R3) — bycatch size display only: Rules 283a–d mandate the displayed wording for
// 826/828, overriding the MV_SPECIES_SIZE reftable; every other code falls through to
// refDesc. The stored/emitted value stays the codeId — no XML byte moves.
const sizeDesc = (s: { codeId: number; descEn: string; descFr?: string } | undefined, isFr: boolean) => {
  if (!s) return undefined;
  const fence = DFO_SPECIE_SZ_LABEL_OVERRIDE[s.codeId];
  return fence ? (isFr ? fence.fr : fence.en) : refDesc(s, isFr);
};

// S101b Round C (L1/L3) — FR display for the bait-type and catch/bycatch species labels,
// keyed by codeId from the vendored MV tables. Display-only: BaitEntry.type /
// BycatchEntry.species keep storing the EN label, which is ALSO the generator's
// find-by-label emit key (BT_TYP_ID / SPECIE_ID) — never translate the stored value.
const BAIT_TYPE_FR = new Map<number, string>(MV_BAIT_TYPE.map(r => [r.codeId, r.descFr]));
const SPECIES_FR = new Map<number, string>(MV_SPECIES.map(r => [r.codeId, r.descFr]));

// Natural, numeric-aware sort for FMA labels so "20a10" sorts after "20a9a" (not after
// "20a1") and sub-letter entries land right (20a3a after 20a3; 20a9a after 20a9). Splits
// each label into digit / non-digit chunks; numeric chunks compare as numbers, text as
// text, and a shorter prefix sorts first. Display-time only — never mutates the source.
const compareFmaLabel = (a: { label: string }, b: { label: string }): number => {
  const ax = a.label.match(/\d+|\D+/g) ?? [];
  const bx = b.label.match(/\d+|\D+/g) ?? [];
  const n = Math.min(ax.length, bx.length);
  for (let i = 0; i < n; i++) {
    const ac = ax[i], bc = bx[i];
    const aNum = /^\d+$/.test(ac), bNum = /^\d+$/.test(bc);
    if (aNum && bNum) {
      const d = parseInt(ac, 10) - parseInt(bc, 10);
      if (d !== 0) return d;
    } else if (ac !== bc) {
      return ac < bc ? -1 : 1;
    }
  }
  return ax.length - bx.length;
};

// QC grid picker list height inside its Modal overlay — ~60% of screen (it owns the
// overlay now, vs the old 200px inline dropdown).
const GRID_LIST_MAX_H = Math.round(Dimensions.get('window').height * 0.6);

const formatTime = (d: Date): string => {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const formatDate = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const parseDateTime = (dateStr: string, timeStr: string): Date => {
  const d = new Date();
  if (dateStr) {
    const [y, mo, da] = dateStr.split('-').map(Number);
    if (!isNaN(y) && !isNaN(mo) && !isNaN(da)) {
      d.setFullYear(y, mo - 1, da);
    }
  }
  if (timeStr) {
    const [h, mi] = timeStr.split(':').map(Number);
    if (!isNaN(h) && !isNaN(mi)) {
      d.setHours(h, mi, 0, 0);
    }
  }
  return d;
};

// S135 Phase 4 (ruling 6): 'extraSarTime' is the combined Date & Time field on SAR blocks
// 2+ — one PickerField for every extra block, disambiguated by the block index (passed
// explicitly on Android, staged in extraSarPickerIdx for the iOS Done handler).
type PickerField = 'sailed' | 'startHaul' | 'stopHaul' | 'landing' | 'transfer' | 'sarTime' | 'extraSarTime' | 'extraEffortStart' | 'extraEffortEnd';
type SheetMode = 'bait' | 'bycatch' | null;

const FullDfoForm = forwardRef<FullDfoFormHandle, FullDfoFormProps>(({ editingLogId, onSaved, readOnly = false, onBack }, ref) => {
  const { t, i18n } = useTranslation('dfo');
  const { t: tc } = useTranslation('common');
  const isFr = i18n.language.startsWith('fr');

  // Core fields — start BLANK for new logs so completion % reflects real progress
  const [dateFished, setDateFished] = useState('');
  const [fmaId, setFmaId] = useState<number | null>(null);
  const [lgridCodeId, setLgridCodeId] = useState<number | null>(null);
  const [lgridDisplay, setLgridDisplay] = useState('');
  const [fmaPickerOpen, setFmaPickerOpen] = useState(false);
  const [lgridPickerOpen, setLgridPickerOpen] = useState(false);
  // STAT_SECT_ID (NL subform 91 only) — mirrors the lgrid picker state trio
  const [statSectId, setStatSectId] = useState<number | null>(null);
  const [statSectDisplay, setStatSectDisplay] = useState('');
  const [statSectPickerOpen, setStatSectPickerOpen] = useState(false);
  // GRID_ID (QC subform 88 only) — mirrors the stat-sect picker state trio (Rules 613x/614x)
  const [gridId, setGridId] = useState<number | null>(null);
  const [gridDisplay, setGridDisplay] = useState('');
  const [gridPickerOpen, setGridPickerOpen] = useState(false);
  const [gridSearch, setGridSearch] = useState('');
  // S121 multi-grid: ADDITIONAL catch-effort blocks (EFFORT_DETAIL 2..n). Block 1 stays the
  // legacy scalar fields below, so existing logs, figures, and emitted bytes are untouched.
  const [extraEfforts, setExtraEfforts] = useState<ExtraEffortDetail[]>([]);
  const [extraCollapsed, setExtraCollapsed] = useState<Record<number, boolean>>({});
  const [extraDropdown, setExtraDropdown] = useState<{ idx: number; kind: 'lgrid' | 'statSect' | 'trapSize' } | null>(null);
  // Which block the QC grid Modal is picking for: -1 = the block-1 scalars, n = extraEfforts[n]
  const [gridPickerTarget, setGridPickerTarget] = useState<number>(-1);
  const [catchWeight, setCatchWeight] = useState('');
  const [trapHauls, setTrapHauls] = useState('');
  // S124 Phase 6: did the harvester haul gear? Yes (default) = EFFORT used — ordinary trip,
  // unchanged. No = a setting day: the Catch & Effort + GPS cards collapse, EFFORT is omitted.
  const [effortYes, setEffortYes] = useState(true);
  // S136 Phase 3 (ruling 5): effort 1's licence line. licNo = the per-effort override
  // (flat d.licNo, absent → the profile licence transmits, legacy behavior);
  // profileLicence = the display fallback; licEditing = the small edit control's state.
  const [licNo, setLicNo] = useState('');
  const [licEditing, setLicEditing] = useState(false);
  const [profileLicence, setProfileLicence] = useState('');
  // S136 Phase 3 walk fix 2: Trap Group 1 collapses like groups 2+ (efforts never collapse
  // — ruling 7 — but trap groups do). Loaded logs start collapsed, same as the extras.
  const [block1Collapsed, setBlock1Collapsed] = useState(false);
  // S136 Phase 4: fishing efforts 2..n (EFFORT nodes — Rule 1050). Effort 1 stays the
  // legacy flat keys; these ride data.extraEffortNodes (written only when non-empty).
  const [extraEffortNodes, setExtraEffortNodes] = useState<ExtraEffortNode[]>([]);
  // Per-extra-effort UI state (all keyed by the extraEffortNodes index, i.e. UI effort n+2):
  // (effortNoteOpen removed — S136 UI round item 6: the note is an always-visible field.)
  const [extraLicEditingIdx, setExtraLicEditingIdx] = useState<number | null>(null);
  // One dropdown open at a time across every extra effort's pickers: group -1 = the
  // node-level pickers (fma / gearSubtype), 0+ = that trap group's picker.
  const [nodeDropdown, setNodeDropdown] = useState<{ node: number; group: number; kind: 'fma' | 'gearSubtype' | 'lgrid' | 'statSect' | 'trapSize' } | null>(null);
  const [nodeGroupCollapsed, setNodeGroupCollapsed] = useState<Record<string, boolean>>({});
  // Which extra effort the open 'extraEffortStart'/'extraEffortEnd' picker belongs to (iOS).
  const [extraEffortPickerIdx, setExtraEffortPickerIdx] = useState<number | null>(null);
  // The shared QC grid Modal's target when opened from an EXTRA EFFORT's trap group
  // (null = the legacy numeric gridPickerTarget routing: -1 effort 1's group 1, 0+ its extras).
  const [gridPickerNodeTarget, setGridPickerNodeTarget] = useState<{ node: number; group: number } | null>(null);
  const [portLanded, setPortLanded] = useState('');
  const [tripId, setTripId] = useState('');
  const [lgbkUid, setLgbkUid] = useState('');
  const [firstEntryDt, setFirstEntryDt] = useState('');
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [departurePort, setDeparturePort] = useState('');
  const [departurePortCodeId, setDeparturePortCodeId] = useState<number | null>(null);
  const [portLandedCodeId, setPortLandedCodeId] = useState<number | null>(null);

  const [timeSailed, setTimeSailed] = useState('');
  const [timeStartedHauling, setTimeStartedHauling] = useState('');
  const [timeStoppedHauling, setTimeStoppedHauling] = useState('');
  const [timeOfLanding, setTimeOfLanding] = useState('');
  // Per-field trip dates (S90, multi-day trips). Each timestamp carries its own date so a
  // trip can span midnight. Blank → the generator falls back to dateFished (same-day / old
  // logs / quick-capture). dateFished stays the trip's nominal date (= sail-start's date).
  const [sailDate, setSailDate] = useState('');
  const [haulStartDate, setHaulStartDate] = useState('');
  const [haulEndDate, setHaulEndDate] = useState('');
  const [landingDate, setLandingDate] = useState('');
  // S147 Phase 5a (CG-6): the fifth companion date. S90 gave the other four their own date and
  // skipped the transfer, so TRNSF_DT was stamped from dateFished alone — a transfer made after
  // midnight landed BEFORE the sail on the wire (Rule 248). Same shape as its four siblings:
  // blank → the generator falls back to dateFished, so every stored log emits unchanged.
  const [transferDate, setTransferDate] = useState('');
  // S147 Run 4 (Rule 33, BE-1): every saved log, read ONCE on mount so the close doors can ask
  // findEffortOverlap synchronously. See effortOverlapBullet for why this rule is not in the
  // requirements table. Staleness is bounded and harmless — a log saved elsewhere after this form
  // opened is missed at the door, and the send-time check (DfoLogsListScreen) is still there.
  const [allLogsSnapshot, setAllLogsSnapshot] = useState<DfoLog[]>([]);
  const [soakDuration, setSoakDuration] = useState('');

  const [baitEntries, setBaitEntries] = useState<BaitEntry[]>([]);
  const [bycatchEntries, setBycatchEntries] = useState<BycatchEntry[]>([]);
  const [bycatchYes, setBycatchYes] = useState<boolean | null>(null);

  const [gpsLat, setGpsLat] = useState('');
  const [gpsLng, setGpsLng] = useState('');
  // Standard v6.1 §11.3 / open Q3: LAT/LONG MODE attr — 'gps' when captured via GPS,
  // 'manual' once either coordinate is typed/edited by hand
  const [gpsSrc, setGpsSrc] = useState<'gps' | 'manual'>('manual');
  const [vNotchCount, setVNotchCount] = useState('');
  const [nbVntchYou, setNbVntchYou] = useState('');
  const [tripNum, setTripNum] = useState<number | undefined>(undefined);
  const [personalUse, setPersonalUse] = useState('');
  // S124 Phase 3: per-data-group closure. Keyed by the generator's dgClose* data-map field
  // (dfoXmlGenerator reads these); the value is the ISO close timestamp. A group with a value
  // here is locked (greyed, non-editable, timestamped). Closure is irreversible — no un-close.
  const [closes, setCloses] = useState<Record<string, string>>({});
  // S153 Phase 1: the flat unit tags (CLOSE_UNIT_DATA_KEYS), kept in their OWN record rather
  // than inside `closes` so that nothing which walks close STAMPS — isClosed, the send guard,
  // the note lock — can ever mistake a unit for a closure. Spread beside `...closes`.
  const [closeUnits, setCloseUnits] = useState<Record<string, string>>({});
  // S153 Phase 5: the live toggle, read from the profile at mount. It decides what an OPEN
  // section shows and does (R3/R8); a CLOSED section ignores it entirely and reads its own tag.
  const [unitPref, setUnitPref] = useState<WeightUnit>('lbs');
  const [transfers, setTransfers] = useState('');
  const [transferYes, setTransferYes] = useState<boolean | null>(null);
  // QC(88) only — TRANSFER node fields (Rules 248-252) replace the legacy free-text
  const [transferTime, setTransferTime] = useState('');
  const [transferWt, setTransferWt] = useState('');
  // S154D (W1 of seven wiring sites): the SOURCE half. Rule 251 makes exactly one of
  // FROM_VRN / FROM_PND_NUM required once a transfer exists, and until this build the
  // generator supplied the harvester's OWN vessel number unasked. Both boxes start empty.
  const [transferFromVrn, setTransferFromVrn] = useState('');
  const [transferFromPndNum, setTransferFromPndNum] = useState('');
  const [transferFromVname, setTransferFromVname] = useState('');
  const [transferToVname, setTransferToVname] = useState('');
  const [transferToVrn, setTransferToVrn] = useState('');
  const [transferToPndNum, setTransferToPndNum] = useState('');
  // QC(88) only — TRIP.USE_CR_IND (Rule 639: initial value 'N') + carrier VRN (Rule 642)
  const [useCrInd, setUseCrInd] = useState<'Y' | 'N'>('N');
  const [carrierVrn, setCarrierVrn] = useState('');
  // QC(88) only — TRIP.PRTNSHP_ID from MV_PARTNERSHIP_TYPE (39468 None / 39469 Buddy-up)
  const [prtnshpId, setPrtnshpId] = useState<number>(39468);
  // NL(91) only — EFFORT_DETAIL.TRP_SZ_ID from DFO_TRAP_SIZE_LIST (39682 Standard / 39683 Large)
  const [trapSize, setTrapSize] = useState('');
  const [trapSizePickerOpen, setTrapSizePickerOpen] = useState(false);
  // NL(91) only — EFFORT_BY_GEAR.GEAR_SBTYP_ID from DFO_GEAR_SUBTYPE_LIST (39684 Wooden / 39685 Wire mesh / 39686 Both)
  const [gearSubtypeId, setGearSubtypeId] = useState('');
  const [gearSubtypePickerOpen, setGearSubtypePickerOpen] = useState(false);

  // Track whether we're editing an already-completed log (don't downgrade on back)
  const [editingCompleted, setEditingCompleted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const [subformId, setSubformId] = useState<number>(90);
  const [regId, setRegId] = useState<number>(1004);

  const fieldConfig = useMemo(() => DFO_SUBFORM_FIELD_CONFIG[subformId] ?? DFO_SUBFORM_FIELD_CONFIG[90], [subformId]);
  const visibleFields = useMemo(() => new Set(fieldConfig.visible), [fieldConfig]);
  const isVisible = (f: string) => visibleFields.has(f);
  // S140 P2: requiredness comes from the shared table (dfoRequirements) — the config's
  // required[] arrays are no longer read for marks (visible[] stays: what is SHOWN is a
  // different question from what is REQUIRED). The context carries block 1's fishing area;
  // extra effort nodes ask the table with their own FMA directly (per-block context).
  const isRequired = (f: string) => isFieldRequired(f, { subformId, fmaId });

  // GRID_ID options (QC subform 88, Rules 613x/614x): MV_GRID rows whose DESC_FRE first
  // char equals the map digit for this FMA ("1" ≈ 3259 rows, "4" ≈ 957 — long list is correct).
  // Memoized on [subformId, fmaId] so the 5272-row filter doesn't re-run every render.
  const gridOptions = useMemo(() => {
    if (subformId !== 88 || fmaId === null) return [];
    const digit = DFO_FMA_GRID_MAP[fmaId];
    if (!digit) return [];
    return MV_GRID.filter(g => g.descFr.charAt(0) === digit);
  }, [subformId, fmaId]);

  // QC grid search filter (Phase 2.6): case-insensitive substring on the grid code (DESC_FRE),
  // layered on top of gridOptions — leadchar validity is unchanged. Empty query → full list.
  const gridOptionsFiltered = useMemo(() => {
    const q = gridSearch.trim().toLowerCase();
    return q ? gridOptions.filter(g => g.descFr.toLowerCase().includes(q)) : gridOptions;
  }, [gridOptions, gridSearch]);

  // LFA picker options: the per-subform FMA list, natural-sorted for display. Sorts a COPY
  // ([...]) — never mutates the source constant. codeId-based selection is order-independent.
  const fmaOptions = useMemo(() => [...getDfoFmaList(subformId)].sort(compareFmaLabel), [subformId]);

  // MAR-specific fields (Task 2)
  const [nbSpcmnBrd, setNbSpcmnBrd] = useState('');
  // NL-only (S110 Phase 2): CATCH.NB_SPCMN_KEPT — mandatory on the NL lobster catch
  // (Rule 976), blocked for QC/GLF/MAR (Subforms row 93).
  const [nbSpcmnKept, setNbSpcmnKept] = useState('');
  // QC/NL (S154 U2): CATCH.NB_SPCMN_DISC — the count thrown back. OPTIONAL on both regions
  // (Subforms row 95), blocked on GLF/MAR, so it is rendered unmarked and never demanded.
  const [nbSpcmnDisc, setNbSpcmnDisc] = useState('');
  const [hlinCompany, setHlinCompany] = useState('');
  const [hlinConfirmNo, setHlinConfirmNo] = useState('');
  const [hlinEta, setHlinEta] = useState('');
  const [hlinTotalWeight, setHlinTotalWeight] = useState('');
  const [hloutCompany, setHloutCompany] = useState('');
  const [hloutConfirmNo, setHloutConfirmNo] = useState('');
  // S137 Phase C (audit item 13, folded in by STOP-2c): the company fields are pickers over
  // the Rule 27/93 coded lists — a coded field must be a picker (S119), and free text let a
  // typo emit company code 0. Stored value + emit join stay on the EN label (STOP 6).
  const [hlinCompanyPickerOpen, setHlinCompanyPickerOpen] = useState(false);
  const [hloutCompanyPickerOpen, setHloutCompanyPickerOpen] = useState(false);

  // Per-section REM notes (T1). Mirrors LogRemarks; Catch & Effort writes haul+catch together.
  const [remarks, setRemarks] = useState<LogRemarks>({});
  const [noteOpen, setNoteOpen] = useState<Record<string, boolean>>({});
  const setNote = (key: keyof LogRemarks, value: string) =>
    setRemarks(prev => ({ ...prev, [key]: value }));
  const toggleNote = (openKey: string) =>
    setNoteOpen(prev => ({ ...prev, [openKey]: !prev[openKey] }));
  // S128 Phase 1 (§5.2.1 irreversibility): once a data group this note transmits into is
  // closed, the note can no longer change. The "Add a note" control is REMOVED (not greyed —
  // a control that can't be used is removed, S124), and an EXISTING note stays VISIBLE,
  // read-only (S125). isNoteLocked resolves the note→close-key mapping (single-sourced in
  // dfoLogStorage). This holds for all eight closeable note sections; 'trip' has no close key
  // so it is never locked.
  const renderNoteButton = (openKey: string) =>
    isNoteLocked(openKey, closes) ? null : (
    <TouchableOpacity style={styles.addNoteBtn} onPress={() => toggleNote(openKey)} activeOpacity={0.7}>
      <StickyNote size={13} color="#1E3A8A" />
      <Text style={styles.addNoteBtnText}>{t('form234.addNote')}</Text>
    </TouchableOpacity>
  );
  const renderNoteInput = (openKey: string, value: string, onChangeText: (v: string) => void) => {
    // Closed: the note is frozen. Show any existing note read-only; render nothing if empty.
    if (isNoteLocked(openKey, closes)) {
      return value.trim() ? (
        <TextInput
          style={styles.noteInput}
          value={value}
          multiline
          editable={false}
        />
      ) : null;
    }
    return noteOpen[openKey] ? (
      <TextInput
        style={styles.noteInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={t('form234.notePlaceholder')}
        placeholderTextColor="#94A3B8"
        multiline
        maxLength={2000}
        editable={!readOnly}
      />
    ) : null;
  };

  // Quick capture — driven by global TimerContext, no local state needed
  const {
    sailActive, sailStartTime, sailElapsed, sailLogId,
    haulActive, haulStartTime, haulEndTime, haulElapsed, haulLogId,
    startSail, stopSail, startHaul, stopHaul,
  } = useTimer();
  // S124: a running timer belongs to exactly one log. It only surfaces / resumes on THAT log —
  // on any other (or a newly-created) log it reads as not-running, so a deleted or backed-out
  // log's orphaned timer can't bleed in. (Unscoped timers — logId null, e.g. the legacy proposal
  // form — never match a DFO tripId, so they never surface here.)
  const sailActiveHere = sailActive && sailLogId === tripId;
  const haulActiveHere = haulActive && haulLogId === tripId;

  // Marine Mammal
  const [mmYes, setMmYes] = useState<boolean | null>(null);
  const [mmSpecies, setMmSpecies] = useState('');
  const [mmSpeciesOther, setMmSpeciesOther] = useState('');
  const [mmWhat, setMmWhat] = useState('');
  const [mmLat, setMmLat] = useState('');
  const [mmLng, setMmLng] = useState('');
  const [mmDate, setMmDate] = useState('');
  const [mmTime, setMmTime] = useState('');

  // Species at Risk
  const [sarYes, setSarYes] = useState<boolean | null>(null);
  const [sarSpecies, setSarSpecies] = useState('');
  const [sarSpeciesOther, setSarSpeciesOther] = useState('');
  const [sarWhat, setSarWhat] = useState('');
  const [sarLat, setSarLat] = useState('');
  const [sarLng, setSarLng] = useState('');
  const [sarDate, setSarDate] = useState('');
  const [sarTime, setSarTime] = useState('');
  const [sarDropdownOpen, setSarDropdownOpen] = useState(false);
  // SAR detail fields (S66b): NB_SPCMN count, SPCMN_COND_ID condition, and the LAT/LONG
  // MODE provenance flag (mirrors gpsSrc — 'gps' on capture, 'manual' on manual edit).
  const [sarNbSpcmn, setSarNbSpcmn] = useState('');
  // S153B: SAR.WT — block 1's weight and the unit it was CLOSED in. Both are NEW FLAT data
  // keys beside the other sar* scalars, because block 1 has no node to carry them: sarWt sits
  // with sarNbSpcmn/sarCondId, and sarCloseUnit sits beside block 1's own sarCloseDt exactly
  // as dgCloseEffortUnit sits beside dgCloseEffort. Blocks 2+ carry wt/closeUnit on their own
  // ExtraSarDetail. sarCloseUnit is written by the close doors (Phase 2), never typed.
  const [sarWt, setSarWt] = useState('');
  const [sarCloseUnit, setSarCloseUnit] = useState('');
  const [sarCondId, setSarCondId] = useState('');
  const [sarCondPickerOpen, setSarCondPickerOpen] = useState(false);
  // S121 multi-SAR: ADDITIONAL species-at-risk encounters (SAR node 2..n). Block 1 stays
  // the legacy sar* scalars above; gated on sarYes === true like block 1.
  const [extraSars, setExtraSars] = useState<ExtraSarDetail[]>([]);
  const [extraSarDropdown, setExtraSarDropdown] = useState<{ idx: number; kind: 'species' | 'cond' } | null>(null);
  const [sarGpsSrc, setSarGpsSrc] = useState<'gps' | 'manual'>('manual');
  // S135: block 1's OWN close stamp and note — NEW FLAT data keys beside the other sar*
  // scalars (ruling 1: block 1 does not move into extraSars; nothing stored is rewritten
  // on load). In Phase 1 only the adopt-on-add guard writes them; the per-block close/note
  // UI arrives in Phase 2.
  const [sarCloseDt, setSarCloseDt] = useState('');
  const [sarNote, setSarNote] = useState('');
  // S135 Phase 2: which SAR blocks have their note editor toggled open, keyed by UI index
  // (0 = block 1). Purely visual — a block whose note is non-empty always shows it; this map
  // only opens EMPTY editors, and resets when indexes shift (delete / toggle-No).
  const [sarNoteOpen, setSarNoteOpen] = useState<Record<number, boolean>>({});

  // Lost Gear — REMOVED (S93): LOST_GEAR_IND is Blocked in the 234.12 XSD (maxOccurs=0).
  // FGRS handles lost/found gear reporting externally; no app capture.

  // DateTime picker
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerField, setPickerField] = useState<PickerField | null>(null);
  // S135 Phase 4: which extra SAR block the open 'extraSarTime' picker belongs to (iOS).
  const [extraSarPickerIdx, setExtraSarPickerIdx] = useState<number | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [tempDate, setTempDate] = useState(new Date());

  // GPS capture loading state
  const [gpsCapturing, setGpsCapturing] = useState(false);

  // Add entry bottom sheet
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [sheetSelectedType, setSheetSelectedType] = useState('');
  const [sheetSelectedCodeId, setSheetSelectedCodeId] = useState<number | null>(null);
  const [sheetCustomType, setSheetCustomType] = useState('');
  const [sheetLbs, setSheetLbs] = useState('');
  const [sheetDropdownOpen, setSheetDropdownOpen] = useState(false);
  const [sheetUsage, setSheetUsage] = useState('');
  // BT_COND_ID (bait condition) — held only while a 'mandatory' bait type is selected
  const [sheetCondition, setSheetCondition] = useState<number | null>(null);
  const [sheetConditionOpen, setSheetConditionOpen] = useState(false);
  // S158: PCONS.SPECIE_SZ_ID (bycatch size) — held as the STRING codeId, matching how usage is
  // held and how the row stores it. Rendered on GLF(89) only; the other three never open it.
  const [sheetSpecieSzId, setSheetSpecieSzId] = useState('');
  const [sheetSizeOpen, setSheetSizeOpen] = useState(false);
  // S134: per-row bait note (Ruling B) + edit-in-place. sheetEditIndex null = adding a new
  // row; a number = the bait row being EDITED — confirm must UPDATE that row, never append
  // (an append here would double the bait weight sent to DFO).
  const [sheetNote, setSheetNote] = useState('');
  const [sheetEditIndex, setSheetEditIndex] = useState<number | null>(null);

  // Apply a stored DfoLog's fields into form state. Shared by the edit-load path AND the S95
  // crash-safety restore path (restoring the scratch draft is identical to opening a saved log).
  // S153 Phase 5 (R8): `liveUnit` is passed in rather than read from state, because the
  // profile is loaded in the same tick and setUnitPref has not landed yet when this runs.
  const hydrateFromLog = (log: DfoLog, liveUnit: WeightUnit = unitPref) => {
          setTripId(log.id);
          setLgbkUid(log.lgbkUid ?? '');
          setTripNum(log.tripNum);
          setFirstEntryDt(log.firstEntryDt ?? '');
          setDateFished(log.dateFished);
          setEditingCompleted(log.status === 'complete');
          setSubformId(log.subformId ?? 90);
          setRegId(log.regId ?? 1004);
          // S153 Phase 5 (R8): if the toggle moved while this form was unmounted — which is
          // the ONLY way it can move, since Settings unmounts it — re-express every still-OPEN
          // weight in the unit now selected, once, before anything is hydrated from it. Closed
          // groups and closed rows are untouched (R2). Nothing is deleted: a blank or
          // non-numeric box passes straight through, so a flip can never manufacture the
          // declared 0 that Rule 789 would treat as a real quantity.
          const reunited = reunitOpenWeights(log.data, liveUnit);
          const d = reunited ? { ...log.data, ...reunited } : log.data;
          // Persist the re-expression straight away, but ONLY for a draft. A completed log is
          // being reviewed, not worked on, and must not be silently rewritten on open.
          if (reunited && log.status !== 'complete') {
            void saveLog({ ...log, data: d as Record<string, string> });
          }
          setFmaId(d.fmaId ? Number(d.fmaId) : null);
          setLgridCodeId(d.lgridCodeId ? Number(d.lgridCodeId) : null);
          setLgridDisplay(d.lgridDisplay || '');
          setStatSectId(d.statSectId ? Number(d.statSectId) : null);
          setStatSectDisplay(d.statSectDisplay || '');
          setGridId(d.gridId ? Number(d.gridId) : null);
          setGridDisplay(d.gridDisplay || '');
          setCatchWeight(d.catchWeight || '');
          setTrapHauls(d.trapHauls || '');
          // S124 Phase 6: default Yes for old logs (they always had a haul); only an explicit 'false' means no-haul.
          setEffortYes(d.effortYes === 'false' ? false : true);
          // S136 Phase 3: effort 1's licence override (absent on pre-S136 logs → profile licence)
          setLicNo(d.licNo || '');
          // S136 Phase 4: fishing efforts 2..n (absent on pre-S136 logs)
          try {
            const en = JSON.parse(d.extraEffortNodes || '[]');
            setExtraEffortNodes(Array.isArray(en) ? en : []);
          } catch { setExtraEffortNodes([]); }
          setNodeGroupCollapsed({});
          setPortLanded(d.portLanded || '');
          setPortLandedCodeId(d.portLandedCodeId ? Number(d.portLandedCodeId) : null);
          try {
                      const cm = JSON.parse(d.crewRegistry || '[]');
                      setCrewMembers(Array.isArray(cm) ? cm : []);
                    } catch { setCrewMembers([]); }
                    setDeparturePort(d.departurePort || '');
          setDeparturePortCodeId(d.departurePortCodeId ? Number(d.departurePortCodeId) : null);
          setTimeSailed(d.timeSailed || '');
          setTimeStartedHauling(d.timeStartedHauling || '');
          setTimeStoppedHauling(d.timeStoppedHauling || '');
          setTimeOfLanding(d.timeOfLanding || '');
          // Per-field dates: absent on old (pre-S90) logs → left blank, generator falls
          // back to dateFished, so an existing single-day log re-saves byte-identically.
          setSailDate(d.sailDate || '');
          setHaulStartDate(d.haulStartDate || '');
          setHaulEndDate(d.haulEndDate || '');
          setLandingDate(d.landingDate || '');
          setSoakDuration(d.soakDuration || '');
          setGpsLat(d.gpsLat || '');
          setGpsLng(d.gpsLng || '');
          setGpsSrc(d.gpsSrc === 'gps' ? 'gps' : 'manual');
          setVNotchCount(d.vNotchCount || '');
          setNbVntchYou(d.nbVntchYou || '');
          setPersonalUse(d.personalUse || '');
          // S124: hydrate any closed sections from their dgClose* data keys (present only on
          // logs saved after a section was closed; absent on older logs → nothing loads).
          {
            const loaded: Record<string, string> = {};
            for (const k of CLOSE_DATA_KEYS) { if (d[k]) loaded[k] = d[k]; }
            setCloses(loaded);
            // S153 Phase 1: hydrate the flat unit tags the same way. Absent on every log
            // saved before S153 → nothing loads → closedWeightUnit reads them as pounds (R5).
            const loadedUnits: Record<string, string> = {};
            for (const k of CLOSE_UNIT_DATA_KEYS) { if (d[k]) loadedUnits[k] = d[k]; }
            setCloseUnits(loadedUnits);
          }
          setTransfers(d.transfers || '');
          setTransferTime(d.transferTime || '');
          setTransferDate(d.transferDate || '');  // S147 Phase 5a — blank on every pre-existing log
          setTransferWt(d.transferWt || '');
          // S154D (W2): no log written before this build carries these four keys, so they
          // hydrate blank — that `|| ''` IS the no-migration guarantee. An old QC log opens
          // with an empty source, which is the truth: nobody ever typed one.
          setTransferFromVrn(d.transferFromVrn || '');
          setTransferFromPndNum(d.transferFromPndNum || '');
          setTransferFromVname(d.transferFromVname || '');
          setTransferToVname(d.transferToVname || '');
          setTransferToVrn(d.transferToVrn || '');
          setTransferToPndNum(d.transferToPndNum || '');
          setUseCrInd(d.useCrInd === 'Y' ? 'Y' : 'N');
          setCarrierVrn(d.carrierVrn || '');
          setPrtnshpId(d.prtnshpId ? Number(d.prtnshpId) : 39468);
          setTrapSize(d.trapSize || '');
          setGearSubtypeId(d.gearSubtypeId || '');
          // S121 multi-grid: additional catch-effort blocks (absent on pre-S121 logs).
          // Loaded blocks start collapsed to their one-line summary.
          try {
            const ex = JSON.parse(d.extraEffortDetails || '[]');
            const arr: ExtraEffortDetail[] = Array.isArray(ex) ? ex : [];
            setExtraEfforts(arr);
            const coll: Record<number, boolean> = {};
            arr.forEach((_, i) => { coll[i] = true; });
            setExtraCollapsed(coll);
            setBlock1Collapsed(true); // walk fix 2: group 1 loads collapsed, like groups 2+
          } catch { setExtraEfforts([]); }
          try {
            const bc = JSON.parse(d.baitEntries || '[]');
            setBaitEntries(bc);
          } catch { setBaitEntries([]); }
          try {
            const byc = JSON.parse(d.bycatchEntries || '[]');
            setBycatchEntries(byc);
            if (d.bycatchYes === 'true') setBycatchYes(true);
            else if (d.bycatchYes === 'false') setBycatchYes(false);
            else if (byc.length > 0) setBycatchYes(true); // back-fill for old logs
          } catch { setBycatchEntries([]); }
          if (d.transferYes === 'true') { setTransferYes(true); }
          else if (d.transferYes === 'false') { setTransferYes(false); }
          else if (d.transfers && d.transfers !== '') { setTransferYes(true); } // back-fill

          if (d.mmYes === 'true') {
            setMmYes(true);
            setMmSpecies(d.mmSpecies || '');
            setMmSpeciesOther(d.mmSpeciesOther || '');
            setMmWhat(d.mmWhat || '');
            setMmLat(d.mmLat || '');
            setMmLng(d.mmLng || '');
            setMmDate(d.mmDate || '');
            setMmTime(d.mmTime || '');
          } else if (d.mmYes === 'false') {
            setMmYes(false);
          }

          if (d.sarYes === 'true') {
            setSarYes(true);
            setSarSpecies(d.sarSpecies || '');
            setSarSpeciesOther(d.sarSpeciesOther || '');
            setSarWhat(d.sarWhat || '');
            setSarLat(d.sarLat || '');
            setSarLng(d.sarLng || '');
            setSarDate(d.sarDate || '');
            setSarTime(d.sarTime || '');
            setSarNbSpcmn(d.sarNbSpcmn || '');
            // S153B: SAR.WT and block 1's unit tag (both absent on pre-S153B logs → '')
            setSarWt(d.sarWt || '');
            setSarCloseUnit(d.sarCloseUnit || '');
            setSarCondId(d.sarCondId || '');
            setSarGpsSrc(d.sarGpsSrc === 'gps' ? 'gps' : 'manual');
            // S135: block 1's own stamp/note (absent on pre-S135 logs)
            setSarCloseDt(d.sarCloseDt || '');
            setSarNote(d.sarNote || '');
            // S121 multi-SAR: additional encounters (absent on pre-S121 logs)
            try {
              const ex = JSON.parse(d.extraSars || '[]');
              setExtraSars(Array.isArray(ex) ? ex : []);
            } catch { setExtraSars([]); }
          } else if (d.sarYes === 'false') {
            setSarYes(false);
          }

          // Lost Gear load removed (S93) — LOST_GEAR_IND Blocked in 234.12; old logs' stored
          // lostGear* keys (if any) are simply ignored, no longer surfaced or re-emitted.
          // MAR-specific fields
          setNbSpcmnBrd(d.nbSpcmnBrd || '');
          setNbSpcmnKept(d.nbSpcmnKept || '');
          setNbSpcmnDisc(d.nbSpcmnDisc || '');
          setHlinCompany(d.hlinCompany || '');
          setHlinConfirmNo(d.hlinConfirmNo || '');
          setHlinEta(d.hlinEta || '');
          setHlinTotalWeight(d.hlinTotalWeight || '');
          setHloutCompany(d.hloutCompany || '');
          setHloutConfirmNo(d.hloutConfirmNo || '');
          // Per-section REM notes — restore existing; Catch & Effort uses haul+catch together.
          // S142 (defect 44): this used to be a hand-written list of names that had drifted
          // from LogRemarks — `personalUse` was missing, so a Personal Use note was dropped on
          // reopen and then erased by the next save. Both the values and the open flags now
          // derive from LOG_REMARK_KEYS, the one list that TypeScript keeps in step with the
          // type, so a note can never again be lost by being left off a list here.
          const seeded = seedRemarksFromLog(log);
          setRemarks(seeded);
          // Open the box for any note that has text, so a restored note is VISIBLE rather than
          // hidden behind "Add a note". Keys with no note box of their own (bait, pcons, sar —
          // per-row/per-block since S134/S135) get an inert entry that nothing reads.
          setNoteOpen(
            Object.fromEntries(LOG_REMARK_KEYS.map(k => [k, !!seeded[k]])) as Record<string, boolean>
          );
  };

  useEffect(() => {
    const loadExisting = async () => {
      // S136 Phase 3: the licence line's display fallback — loaded on BOTH paths (the edit
      // path never loaded the profile before; the line must show the profile licence when
      // no per-effort override is stored).
      const captainProfile = await loadCaptainProfile();
      setProfileLicence(captainProfile.fishingNumber || '');
      // S153 Phase 5: the live toggle. Read here because the profile is already in hand, and
      // because this form UNMOUNTS whenever the harvester goes to Settings (App.tsx renders it
      // only on view 'dfo-demo') — so a flip is always seen at mount, never mid-session.
      setUnitPref(captainProfile.units === 'kg' ? 'kg' : 'lbs');
      if (editingLogId) {
        void loadAllLogs().then(setAllLogsSnapshot); // S147 Run 4 (Rule 33) — see above
        const log = await loadLogById(editingLogId);
        if (log) hydrateFromLog(log, captainProfile.units === 'kg' ? 'kg' : 'lbs');
      } else {
        // New log — today's date + fresh trip ID
        const today = formatDate(new Date());
        setDateFished(today);
        const profileSubformId = captainProfile.subformId ?? 90;
        setSubformId(profileSubformId);
        setRegId(captainProfile.regId ?? 1004);
        // S147 Run 4 (Rule 33): one read of the register for the close doors.
        void loadAllLogs().then(setAllLogsSnapshot);
        const meta = await generateNewLogMeta(today, profileSubformId);
        setTripId(meta.id);
        setLgbkUid(meta.lgbkUid);
        setFirstEntryDt(meta.firstEntryDt);
        setTripNum(meta.tripNum);
        // Pre-fill crew, ports, and LFA from the last completed log
        const last = await loadLastLog();
        if (last) {
          try {
            const cm = JSON.parse(last.data.crewRegistry || '[]');
            if (Array.isArray(cm) && cm.length > 0) setCrewMembers(cm);
          } catch {}
          if (last.data.departurePort) setDeparturePort(last.data.departurePort);
          if (last.data.departurePortCodeId) setDeparturePortCodeId(Number(last.data.departurePortCodeId));
          if (last.data.portLanded) setPortLanded(last.data.portLanded);
          if (last.data.portLandedCodeId) setPortLandedCodeId(Number(last.data.portLandedCodeId));
        }
        // LFA priority: (1) most recent log fmaId, (2) profile fmaId
        const lastFmaId = last?.data?.fmaId ? Number(last.data.fmaId) : null;
        const prefillFmaId = lastFmaId ?? captainProfile.fmaId ?? null;
        if (prefillFmaId) setFmaId(prefillFmaId);
      }
      setIsLoaded(true);
      // S95 Item 2 — crash-safety restore. The scratch draft is written debounced while a NEW
      // log is entered and cleared on save/back, so a surviving scratch means the app died
      // mid-entry. Offer to restore it (new logs only; existing logs already persist to dfo_logs).
      if (!editingLogId) {
        const scratch = await loadActiveDraft();
        if (scratch) {
          Alert.alert(
            t('form234.restoreDraftTitle'),
            t('form234.restoreDraftBody'),
            [
              { text: t('form234.restoreDraftDiscard'), style: 'destructive', onPress: () => { void clearActiveDraft(); } },
              { text: t('form234.restoreDraftRestore'), onPress: () => { hydrateFromLog(scratch); } },
            ],
          );
        }
      }
          };
          loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingLogId]);

  useEffect(() => {
    if (!editingLogId && dateFished && isLoaded) {
      generateNewLogMeta(dateFished, subformId).then(meta => {
        setTripId(meta.id);
        setLgbkUid(meta.lgbkUid);
        setFirstEntryDt(meta.firstEntryDt);
        setTripNum(meta.tripNum);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFished]);

  // Sync global timer start times into form fields whenever they change.
  // This means if the haul/sail was started before opening this form
  // (or is still running from a previous session), the fields always
  // reflect the correct start time.
  useEffect(() => {
    if (sailStartTime && sailLogId === tripId) setTimeSailed(sailStartTime);
  }, [sailStartTime, sailLogId, tripId]);

  // S136 Phase 5: the TimerContext sync effects write EFFORT 1's flat keys — they must only
  // do so while effort 1 is the effort the haul timer serves. When an EXTRA effort is
  // running (its start/stop are stamped at press time in handleHaulPress), or effort 1's
  // window is already complete, the effects stand down — the pre-S136 unconditional write
  // is exactly how the shipped silent-restart defect overwrote a finished window.
  const effort1OwnsHaulTimer = (): boolean =>
    !extraEffortNodes.some(e => (e.haulStartTime ?? '').trim() !== '' && !(e.haulEndTime ?? '').trim())
    && !(timeStartedHauling.trim() !== '' && timeStoppedHauling.trim() !== '');

  useEffect(() => {
    if (haulStartTime && haulLogId === tripId && effort1OwnsHaulTimer()) setTimeStartedHauling(haulStartTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [haulStartTime, haulLogId, tripId]);

  // Adopt a haul-end time only when it arrives AFTER this form mounts (normal Quick
  // Capture: open the form, then Start/Stop Haul). A value already present in the global
  // TimerContext AT mount is a STALE leftover from a previous log's haul — haulEndTime
  // latches, reset only on the next startHaul — and must NOT pre-fill a new log; on the
  // Edit path the saved value loaded above must stand instead. Session 76.
  const haulEndAtMountRef = useRef<string | null>(null);
  useEffect(() => {
    if (haulEndAtMountRef.current === null) {
      haulEndAtMountRef.current = haulEndTime; // baseline: ignore whatever was present at mount
      return;
    }
    if (haulEndTime && haulEndTime !== haulEndAtMountRef.current && effort1OwnsHaulTimer()) {
      setTimeStoppedHauling(haulEndTime);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [haulEndTime]);

  const buildLogData = (): Record<string, string> => ({
    fmaId: String(fmaId ?? ''),
        lgridCodeId: String(lgridCodeId ?? ''),
        lgridDisplay,
        statSectId: String(statSectId ?? ''),
        statSectDisplay,
        gridId: String(gridId ?? ''),
        gridDisplay,
        catchWeight, trapHauls,
    effortYes: String(effortYes), // S124 Phase 6: 'false' = no-haul → generator omits EFFORT
    // S136 Phase 3: effort 1's licence override — written only when set, so an untouched
    // legacy log keeps its exact stored shape (the extraEffortDetails rationale below)
    ...(licNo ? { licNo } : {}),
    // S136 Phase 4: fishing efforts 2..n — written only when a second effort exists
    ...(extraEffortNodes.length > 0 ? { extraEffortNodes: JSON.stringify(extraEffortNodes) } : {}),

    portLanded, portLandedCodeId: String(portLandedCodeId ?? ''),
    crewRegistry: JSON.stringify(crewMembers),
    departurePort, departurePortCodeId: String(departurePortCodeId ?? ''),
    timeSailed, timeStartedHauling, timeStoppedHauling,
    timeOfLanding, soakDuration,
    sailDate, haulStartDate, haulEndDate, landingDate,
    baitEntries: JSON.stringify(baitEntries),
    bycatchYes: String(bycatchYes),
    bycatchEntries: JSON.stringify(bycatchEntries),
    gpsLat, gpsLng, gpsSrc, vNotchCount, nbVntchYou,
    transferYes: String(transferYes),
    transfers, personalUse,
    // S124: persist any closed-section timestamps (dgClose* keys) — the generator reads them.
    ...closes,
    // S153 Phase 1: and the unit each of those flat groups was closed in. Written only once
    // a close has stamped one, so a log with nothing closed carries no unit key at all and
    // its stored shape is byte-identical to pre-S153.
    ...closeUnits,
    // S153 Phase 5 (R8): the unit the still-OPEN weights above are expressed in. Needed
    // because a toggle flip always happens while this form is unmounted, so the next mount
    // has to be able to tell what unit it is looking at.
    [DRAFT_WEIGHT_UNIT_KEY]: unitPref,
    transferTime, transferDate, transferWt,
    // S154D (W3): the four new keys ride the same data map as their siblings — no DfoLog
    // interface change, no migration (see dfoLogStorage.ts:472).
    transferFromVrn, transferFromPndNum, transferFromVname, transferToVname,
    transferToVrn, transferToPndNum,
    useCrInd, carrierVrn, prtnshpId: String(prtnshpId),
    trapSize,
    gearSubtypeId,
    // S121: additional catch-effort blocks — key written only when blocks exist, so
    // pre-S121 logs and single-grid logs keep their exact stored shape.
    ...(extraEfforts.length > 0 ? { extraEffortDetails: JSON.stringify(extraEfforts) } : {}),
    mmYes: String(mmYes),
    mmSpecies, mmSpeciesOther, mmWhat, mmLat, mmLng, mmDate, mmTime,
    sarYes: String(sarYes),
    sarSpecies, sarSpeciesOther, sarWhat, sarLat, sarLng, sarDate, sarTime,
    sarNbSpcmn, sarCondId, sarGpsSrc,
    // S153B: SAR.WT rides with the other sar* scalars (always written, like sarNbSpcmn — an
    // empty string is the field's own empty state, and tag() drops it at emit).
    sarWt,
    // S135: block 1's own stamp/note — written only when set, so an untouched legacy
    // log keeps its exact stored shape (the extraSars rationale below)
    ...(sarCloseDt ? { sarCloseDt } : {}),
    ...(sarNote ? { sarNote } : {}),
    // S153B: block 1's unit tag — written ONLY when set, exactly like its stamp above, so a
    // log that never closed a SAR block keeps its stored shape byte-for-byte.
    ...(sarCloseUnit ? { sarCloseUnit } : {}),
    // S121: additional SAR encounters — key written only when blocks exist (see
    // extraEffortDetails above for the rationale)
    ...(extraSars.length > 0 ? { extraSars: JSON.stringify(extraSars) } : {}),
    // lostGear* write-out removed (S93) — LOST_GEAR_IND Blocked in 234.12, no longer captured.
    // MAR-specific
    nbSpcmnBrd,
    // NL-specific (S110 Phase 2)
    nbSpcmnKept,
    // QC/NL (S154 U2) — optional discard count
    nbSpcmnDisc,
    hlinCompany, hlinConfirmNo, hlinEta, hlinTotalWeight,
    hloutCompany, hloutConfirmNo,
  });

  // Persist only non-empty notes (trimmed). Catch & Effort already mirrors haul+catch.
  const buildRemarks = (): LogRemarks => {
    const out: LogRemarks = {};
    (Object.keys(remarks) as (keyof LogRemarks)[]).forEach(k => {
      const v = remarks[k];
      if (v && v.trim() !== '') out[k] = v.trim();
    });
    return out;
  };

  const hasMeaningfulData = (): boolean => {
    const d = buildLogData();
    for (const [, val] of Object.entries(d)) {
      if (val && val.trim() && val !== 'null' && val !== 'None' && val !== '[]') {
        return true;
      }
    }
    return false;
  };

  // One place building the draft-shaped DfoLog — used by Back, the imperative saveDraft, AND the
  // S95 crash-safety scratch write, so all three stay in sync.
  const buildDraftLog = (): DfoLog => ({
    id: tripId,
    lgbkUid,
    firstEntryDt,
    mode: 'full',
    status: 'draft',
    dateFished: dateFished || formatDate(new Date()),
    createdAt: Date.now(),
    data: buildLogData(),
    remarks: buildRemarks(),
    subformId,
    regId,
    tripNum,
  });

  // S95 Item 2 — debounced crash-safety scratch write for a NEW in-progress log, so an app crash
  // mid-entry can't destroy the trip. Keyed on a serialized snapshot of the actual form content,
  // so unrelated re-renders (e.g. timer ticks) don't reset the debounce. New logs only; existing
  // logs/drafts already persist to dfo_logs. Best-effort; never blocks the UI.
  const draftSnapshot = JSON.stringify({ df: dateFished, d: buildLogData(), r: buildRemarks() });
  // Baseline = the prefilled state captured right after load. We only scratch-write once the user
  // actually diverges from it, so pre-fill (crew/ports/FMA from the last log) alone never triggers
  // a spurious restore prompt on the next new log.
  const draftBaselineRef = useRef<string | null>(null);
  useEffect(() => {
    if (isLoaded && draftBaselineRef.current === null) draftBaselineRef.current = draftSnapshot;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);
  useEffect(() => {
    if (editingLogId || readOnly || !isLoaded || editingCompleted) return;
    if (draftSnapshot === draftBaselineRef.current) return; // no user change beyond the prefill yet
    if (!hasMeaningfulData()) return;
    const timer = setTimeout(() => { void saveActiveDraft(buildDraftLog()); }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftSnapshot, editingLogId, readOnly, isLoaded, editingCompleted]);

  useImperativeHandle(ref, () => ({
    saveDraft: async () => {
      if (!isLoaded) return;
      if (editingCompleted) return;
      if (!hasMeaningfulData()) return;

      await saveLog(buildDraftLog());
      void clearActiveDraft(); // in-progress work is now a saved draft — drop the scratch
    },
  }));

  const handleBack = async () => {
    if (!readOnly && isLoaded && !editingCompleted && hasMeaningfulData()) {
      await saveLog(buildDraftLog());
    }
    void clearActiveDraft(); // S95: work is now a saved draft (or nothing meaningful) — drop scratch
    onBack?.();
  };

  // Shared GPS fill. Keeps Accuracy.High (234 coords feed the regulator XML — no
  // precision regression). Clamps to the XSD ≤4-decimal limit (shared clampCoord4),
  // races the fix against a timeout, and never writes a blank/0 coordinate on a bad fix.
  // alertOnFail is opt-in: the manual "Capture GPS" button surfaces a loud Alert on
  // failure. The auto-triggers (Stop Haul / MM=Yes) stay silent — every coord
  // they fill is either not a regulator field (MM) or hard-blocked before emit if empty
  // (effort LAT/LONG via validateElogXml Rule 3059; SAR LAT/LONG via handleSave + validator).
  // S138: the SAR capture prompt's Yes also passes alertOnFail — it is an explicit user
  // request, so a failure alerts like the manual button (B4). Returns true ONLY when a
  // usable fix was written, so callers can record provenance from the actual outcome.
  const captureGps = async (
    setLat: (v: string) => void,
    setLng: (v: string) => void,
    opts?: { alertOnFail?: boolean }
  ): Promise<boolean> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (opts?.alertOnFail) Alert.alert(t('form234.gpsDeniedTitle'), t('form234.gpsDeniedBody'));
        return false; // fields untouched
      }
      // expo-location has no first-class timeout — race the fix against a rejecting timer.
      const loc = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('gps-timeout')), 15000);
        }),
      ]);
      const lat = loc?.coords?.latitude;
      const lng = loc?.coords?.longitude;
      if (
        typeof lat !== 'number' || !isFinite(lat) ||
        typeof lng !== 'number' || !isFinite(lng)
      ) {
        if (opts?.alertOnFail) Alert.alert(t('form234.gpsNoFixTitle'), t('form234.gpsNoFixBody'));
        return false; // never write 0/blank coordinates on a bad fix
      }
      setLat(clampCoord4(String(lat)));
      setLng(clampCoord4(String(lng)));
      return true;
    } catch (_e) {
      if (opts?.alertOnFail) Alert.alert(t('form234.gpsNoFixTitle'), t('form234.gpsNoFixBody'));
      return false;
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  // S138 Defect 16: the capture prompt — one line of body text, two pinned buttons, no
  // title — fired for EVERY SAR block (block 1 and each added block) through the ONE
  // shared applySarCaptureChoice routine (sarCapture.ts). Where the Rule-781 mandated
  // prompt fires (SAR indicator flip to Yes), this popup waits for its OK; the mandated
  // text and its own single OK are fenced and never merged with these buttons (R3).
  const promptSarCapture = (w: SarBlockWriter) => {
    const deps: SarCaptureDeps = {
      stampNow: () => {
        const now = new Date();
        return { date: formatDate(now), time: formatTime(now) };
      },
      capture: (setLat, setLng) => captureGps(setLat, setLng, { alertOnFail: true }),
    };
    Alert.alert('', t('form234.sarCaptureBody'), [
      { text: t('form234.sarCaptureYes'), onPress: () => { void applySarCaptureChoice(true, w, deps); } },
      { text: t('form234.sarCaptureNo'), onPress: () => { void applySarCaptureChoice(false, w, deps); } },
    ]);
  };

  const handleSailPress = async () => {
    if (!sailActiveHere) {
      const now = new Date();
      await startSail(tripId);
      // timeSailed synced via useEffect on sailStartTime; stamp its companion date now.
      // Sail-start drives the trip's nominal date, same as the picker path.
      setSailDate(formatDate(now));
      setDateFished(formatDate(now));
    } else {
      const now = new Date();
      const { time } = stopSail();
      // S124: "Stop Sail = landed" writes the LANDING time. Skip the stamp if the Landing card
      // is already closed — don't reach into a frozen group. The timer still stops normally.
      if (!isClosed('dgCloseLanding')) {
        setTimeOfLanding(time); // Stop Sail = landed
        setLandingDate(formatDate(now)); // companion date for the landing time
      }
    }
  };

  // ── S136 Phase 5: Quick Capture serves EVERY effort (rulings 10 + 11) ──────────────────
  // Which effort does the haul button act on right now, derived from data alone:
  //   • the RUNNING effort (start stamped, no stop) — the button stops IT;
  //   • else effort 1 while it is open with no start yet — the fresh first haul;
  //   • else 'new' — every effort's window is complete, so the next tap is "tap 3" and
  //     must CONFIRM before creating the next effort (the guard that fixes the shipped
  //     silent-restart defect: a finished window can never be overwritten from here again).
  const quickHaulTarget = (): number | 'new' => {
    if (timeStartedHauling.trim() && !timeStoppedHauling.trim()) return 0;
    const running = extraEffortNodes.findIndex(e => (e.haulStartTime ?? '').trim() !== '' && !(e.haulEndTime ?? '').trim());
    if (running >= 0) return running + 1;
    if (!timeStartedHauling.trim() && !isClosed('dgCloseEffort')) return 0;
    return 'new';
  };

  // Ruling 11: Yes on the tap-3 confirm CREATES the next effort card, already stamped with
  // its start time, and the timer runs for it. LFA pre-fills from the previous effort (the
  // add-button default); one open trap group, per the XSD's ≥1 EFFORT_DETAIL.
  const startNewEffortFromCapture = async () => {
    const now = new Date();
    const prevFma = extraEffortNodes.length > 0
      ? extraEffortNodes[extraEffortNodes.length - 1].fmaId
      : (fmaId != null ? String(fmaId) : undefined);
    setExtraEffortNodes(prev => [...prev, {
      ...(prevFma ? { fmaId: prevFma } : {}),
      haulStartDate: formatDate(now), haulStartTime: formatTime(now),
      details: [{}],
    }]);
    await startHaul(tripId);
  };

  // The most recent effort with a stamped haul window — feeds the idle button label.
  const latestHaulRange = (): { start: string; end: string } | null => {
    for (let i = extraEffortNodes.length - 1; i >= 0; i--) {
      const e = extraEffortNodes[i];
      if ((e.haulStartTime ?? '').trim()) return { start: e.haulStartTime ?? '', end: e.haulEndTime ?? '' };
    }
    return timeStartedHauling ? { start: timeStartedHauling, end: timeStoppedHauling } : null;
  };

  const handleHaulPress = async () => {
      const target = quickHaulTarget();
      if (target === 'new') {
        // Tap 3 (ruling 10, §5.2 ruled wording: bare title, Yes/No). No does NOTHING AT
        // ALL — no state change of any kind. The pre-S136 behavior here was the shipped
        // defect: a silent restart overwrote a real haul window with a zero-length one.
        Alert.alert(
          t('form234.newHaulConfirmTitle'),
          undefined,
          [
            { text: tc('common.no'), style: 'cancel' },
            { text: tc('common.yes'), onPress: () => { void startNewEffortFromCapture(); } },
          ],
        );
        return;
      }
      if (target === 0) {
        // Effort 1 — the pre-S136 flow. S124: once effort 1 is closed, Quick Capture must
        // not write into the frozen group (tap 3 handles the closed-and-complete case above).
        if (isClosed('dgCloseEffort')) return;
        if (!haulActiveHere) {
          const now = new Date();
          await startHaul(tripId);
          // timeStartedHauling synced via useEffect on haulStartTime; stamp companion date now.
          setHaulStartDate(formatDate(now));
        } else {
          const now = new Date();
          stopHaul();
          // timeStoppedHauling synced via useEffect on haulEndTime; stamp companion date now.
          setHaulEndDate(formatDate(now));
          // S136 UI-round conformance follow-through: the silent stop-tap capture only
          // where coordinate ENTRY is allowed (Rule 3059) — it must not fill fields the
          // harvester can no longer see (MAR non-38b, NL).
          if (effortCoordsEntryAllowed(subformId, fmaId)) {
            // S140 P2 defect 48: stamp 'gps' only on a real fix (§11.3 MODE="G"); a failed
            // capture leaves the fields untouched, so their provenance stays untouched too.
            // Stays silent — auto-triggers deliberately don't alert (S96).
            const ok = await captureGps(setGpsLat, setGpsLng);
            if (ok) setGpsSrc('gps');
          }
        }
        return;
      }
      // An EXTRA effort is running — stop IT. Its start was stamped when it was created,
      // so the stop stamps its own end (+ trap group 1's coordinates where entry is allowed).
      const idx = target - 1;
      const { date, time } = stopHaul();
      updateEffortNode(idx, { haulEndDate: date, haulEndTime: time });
      const nodeFmaNum = extraEffortNodes[idx]?.fmaId ? Number(extraEffortNodes[idx].fmaId) : null;
      if (effortCoordsEntryAllowed(subformId, nodeFmaNum)) {
        // S140 P2 defect 48: 'gps' only on success (silent auto-trigger, S96).
        const ok = await captureGps(
          (v: string) => updateNodeGroup(idx, 0, { gpsLat: v }),
          (v: string) => updateNodeGroup(idx, 0, { gpsLng: v }),
        );
        if (ok) updateNodeGroup(idx, 0, { gpsSrc: 'gps' }); // §11.3
      }
    };

  // S124 Phase 6: is there Catch & Effort measurement data the user would lose by declaring
  // no-haul? Excludes the pre-filled fishing area (FMA/grid/section) — those ride in from the
  // last log, so an otherwise-untouched card still counts as "empty" (just collapses, no confirm).
  const hasEffortData = (): boolean =>
    !!(catchWeight.trim() || trapHauls.trim() || timeStartedHauling.trim() || timeStoppedHauling.trim() ||
       soakDuration.trim() || gpsLat.trim() || gpsLng.trim() || trapSize || gearSubtypeId ||
       nbSpcmnKept.trim() || nbSpcmnDisc.trim() || nbSpcmnBrd.trim() || vNotchCount.trim() || nbVntchYou.trim() ||
       licNo.trim() || extraEfforts.length > 0 || extraEffortNodes.length > 0);

  // Clear every Catch & Effort / GPS field (all EFFORT / EFFORT_DETAIL) so a later Yes re-opens
  // the card empty.
  const wipeEffort = () => {
    setFmaId(null);
    setLgridCodeId(null); setLgridDisplay('');
    setStatSectId(null); setStatSectDisplay('');
    setGridId(null); setGridDisplay('');
    setCatchWeight(''); setTrapHauls('');
    setTimeStartedHauling(''); setTimeStoppedHauling('');
    setHaulStartDate(''); setHaulEndDate('');
    setSoakDuration('');
    setGpsLat(''); setGpsLng(''); setGpsSrc('manual');
    setTrapSize(''); setGearSubtypeId('');
    setNbSpcmnKept(''); setNbSpcmnDisc(''); setNbSpcmnBrd('');
    setVNotchCount(''); setNbVntchYou('');
    setLicNo(''); setLicEditing(false); // S136: the licence override is effort data too
    setBlock1Collapsed(false);
    setExtraEfforts([]);
    // S136 Phase 4: a no-haul day has ZERO efforts — the wipe is only reachable when no
    // effort is closed (handleEffortToggle refuses otherwise, §4.2 ruling).
    setExtraEffortNodes([]);
    setNodeGroupCollapsed({}); setNodeDropdown(null);
    setExtraLicEditingIdx(null);
  };

  // The "did you haul?" toggle. Yes re-opens the (already-wiped) card. No wipes the effort data,
  // confirming first only when there is data to lose (an empty card just collapses).
  // S136 Phase 4 (§4.2 ruling): No is REFUSED while ANY effort is closed — closed
  // occurrences are irreversible (§5.2.1) and the wipe would destroy them (the S134/S135
  // toggle-guard shape). Nothing changes on refusal.
  const handleEffortToggle = (val: boolean) => {
    if (readOnly) return;
    if (val) { setEffortYes(true); return; }
    if (effortAnyClosed()) {
      Alert.alert(t('form234.catchEffortSection'), t('form234.effortClosedNoToggle'));
      return;
    }
    if (hasEffortData()) {
      Alert.alert(
        t('form234.effortNoConfirmTitle'),
        t('form234.effortNoConfirmBody'),
        [
          { text: t('form234.closeConfirmNotYet'), style: 'cancel' },
          { text: t('form234.effortNoConfirmYes'), style: 'destructive', onPress: () => { wipeEffort(); setEffortYes(false); } },
        ],
      );
    } else {
      setEffortYes(false);
    }
  };

  // S136 Phase 2 (ruling 4): the Yes path keeps ONLY the Rule 781 mandated prompt — the
  // date/time stamp and GPS capture served the removed detail fields, and firing a GPS
  // permission ask for fields that no longer exist would be noise. The No path still wipes
  // the (now surface-less) detail state, exactly as the toggle always has.
  const handleMmYes = (val: boolean) => {
    setMmYes(val);
    if (val) {
      Alert.alert('', t('form234.mmInterIndPrompt'), [{ text: tc('nav.ok') }]);
    } else {
      setMmSpecies(''); setMmSpeciesOther(''); setMmWhat('');
      setMmLat(''); setMmLng(''); setMmDate(''); setMmTime('');
    }
  };

  const handleSarYes = (val: boolean) => {
    // S135 Phase 3 (ruling 5, the bycatch shape): flipping to No wipes every SAR block —
    // REFUSED while any block is closed (its own stamp or the legacy card stamp), because
    // closed occurrences are irreversible (§5.2.1). Nothing changes on refusal; with only
    // OPEN blocks the wipe below behaves exactly as before.
    // S136 Phase 4: the SAR pool is TRIP-level and survives while ANY effort answers Yes —
    // effort 1's No neither wipes it nor needs the refusal when another effort is Yes.
    // Both conditions are single-sourced in dfoLogStorage (tested there).
    if (!val && sarYesOnAnotherEffort(liveEffortData(), 0)) {
      setSarYes(false);
      return;
    }
    if (!val && sarNoToggleRefused(liveEffortData(), 0)) {
      Alert.alert(t('form234.sarSubsection'), t('form234.sarClosedNoToggle'));
      return;
    }
    setSarYes(val);
    if (val) {
      // S138: the Rule-781 mandated prompt fires FIRST, unchanged, with its own OK (R3);
      // the capture popup follows its dismissal. Stamping/capture moved behind the
      // popup's Yes — No leaves date/time/coords blank for hand entry, and the block's
      // provenance stays 'manual' (fresh block 1 is 'manual' by init/wipe/hydration).
      Alert.alert('', t('form234.sarIndPrompt'), [{
        text: tc('nav.ok'),
        onPress: () => promptSarCapture({
          setDateTime: (date, time) => { setSarDate(date); setSarTime(time); },
          setLat: setSarLat,
          setLng: setSarLng,
          setGpsSrc: setSarGpsSrc,
        }),
      }]);
    } else {
      setSarSpecies(''); setSarSpeciesOther(''); setSarWhat('');
      setSarLat(''); setSarLng(''); setSarDate(''); setSarTime('');
      setSarNbSpcmn(''); setSarCondId(''); setSarGpsSrc('manual');
      setSarCloseDt(''); setSarNote(''); setSarNoteOpen({}); // S135: block 1's own stamp/note clear with it
      setSarDropdownOpen(false); setSarCondPickerOpen(false);
      setExtraSars([]); setExtraSarDropdown(null); // S121: No clears the extra encounters too
    }
  };

  // handleLostGearYes removed (S93) — LOST_GEAR_IND Blocked in 234.12; question deleted below.

  const openPicker = (field: PickerField, extraIdx?: number) => {
    let current: Date;
    switch (field) {
      case 'sailed':      current = parseDateTime(sailDate || dateFished, timeSailed); break;
      case 'startHaul':  current = parseDateTime(haulStartDate || dateFished, timeStartedHauling); break;
      case 'stopHaul':   current = parseDateTime(haulEndDate || dateFished, timeStoppedHauling); break;
      case 'landing':    current = parseDateTime(landingDate || dateFished, timeOfLanding); break;
      case 'transfer':   current = parseDateTime(transferDate || dateFished, transferTime); break;
      case 'sarTime':    current = parseDateTime(sarDate, sarTime); break;
      // S135 Phase 4: SAR blocks 2+ — seed from the block's own stored strings (tolerant
      // parse: a blank/typed-malformed half falls back to now, never crashes the seed).
      case 'extraSarTime':
        current = parseDateTime(extraSars[extraIdx ?? -1]?.date ?? '', extraSars[extraIdx ?? -1]?.time ?? '');
        break;
      // S136 Phase 4: efforts 2+ — each node's own haul window, seeded from its stored
      // strings (dateFished fallback matches the emit's).
      case 'extraEffortStart':
        current = parseDateTime(extraEffortNodes[extraIdx ?? -1]?.haulStartDate || dateFished, extraEffortNodes[extraIdx ?? -1]?.haulStartTime ?? '');
        break;
      case 'extraEffortEnd':
        current = parseDateTime(extraEffortNodes[extraIdx ?? -1]?.haulEndDate || dateFished, extraEffortNodes[extraIdx ?? -1]?.haulEndTime ?? '');
        break;
    }
    if (Platform.OS === 'android') {
      // Imperative date→time flow — avoids the mode="datetime" unmount-dismiss crash (S95).
      // extraIdx rides the closure, so the async callback can never read a stale index.
      openAndroidDateTime(current, (d) => applyPickerValueForField(field, d, extraIdx));
      return;
    }
    // iOS: stage into the Modal spinner (Done → applyPickerValue).
    setPickerDate(current);
    setTempDate(current);
    setPickerField(field);
    setExtraSarPickerIdx(extraIdx ?? null);
    setExtraEffortPickerIdx(extraIdx ?? null); // S136 P4: which extra effort owns the iOS spinner
    setPickerVisible(true);
  };

  // Writes the picked Date into the field's stored strings. Takes `field` explicitly so the
  // async Android imperative callback can never read a stale `pickerField` state value.
  const applyPickerValueForField = (field: PickerField | null, d: Date, extraIdx?: number) => {
      if (field === null) {
        // Date Fished date-only picker
        setDateFished(formatDate(d));
        return;
      }
      switch (field) {
        case 'sailed':
          // Sail-start owns the trip's nominal date: keep its own date AND drive dateFished.
          setSailDate(formatDate(d)); setDateFished(formatDate(d)); setTimeSailed(formatTime(d)); break;
        case 'startHaul':
          setHaulStartDate(formatDate(d)); setTimeStartedHauling(formatTime(d)); break;
        case 'stopHaul':
          setHaulEndDate(formatDate(d)); setTimeStoppedHauling(formatTime(d)); break;
        case 'landing':
          setLandingDate(formatDate(d)); setTimeOfLanding(formatTime(d)); break;
        case 'transfer':
          setTransferDate(formatDate(d)); setTransferTime(formatTime(d)); break;
        case 'sarTime':
          setSarDate(formatDate(d)); setSarTime(formatTime(d)); break;
        case 'extraSarTime': {
          // S135 Phase 4: same YYYY-MM-DD / HH:MM strings the old type-in boxes held —
          // stored slots and the SAR_DT emit are byte-unchanged; only the entry changed.
          const i = extraIdx ?? extraSarPickerIdx;
          if (i != null && i >= 0) updateExtraSar(i, { date: formatDate(d), time: formatTime(d) });
          break;
        }
        case 'extraEffortStart': {
          const i = extraIdx ?? extraEffortPickerIdx;
          if (i != null && i >= 0) updateEffortNode(i, { haulStartDate: formatDate(d), haulStartTime: formatTime(d) });
          break;
        }
        case 'extraEffortEnd': {
          const i = extraIdx ?? extraEffortPickerIdx;
          if (i != null && i >= 0) updateEffortNode(i, { haulEndDate: formatDate(d), haulEndTime: formatTime(d) });
          break;
        }
      }
    };

  // iOS Modal "Done" applies the staged value against the current pickerField state.
  const applyPickerValue = (d: Date) => applyPickerValueForField(pickerField, d);

  const openSheet = (mode: SheetMode) => {
    setSheetMode(mode);
    setSheetSelectedType('');
    setSheetSelectedCodeId(null);
    setSheetCustomType('');
    setSheetLbs('');
    setSheetUsage('');
    setSheetCondition(null);
    setSheetConditionOpen(false);
    setSheetSpecieSzId('');     // S158: a new row starts with no size — he picks it
    setSheetSizeOpen(false);
    setSheetDropdownOpen(false);
    setSheetNote('');           // S134: a new row starts with a fresh, empty note (Ruling B)
    setSheetEditIndex(null);    // S134: add mode
    setSheetVisible(true);
  };

  // S134: reopen the SAME sheet on an existing bait row, seeded with that row's values.
  // Confirm updates the row in place (see handleSheetConfirm). A stored type that matches
  // no list label is a custom 'Other' entry — reopen it as Other + the stored text.
  const openBaitEdit = (index: number) => {
    const e = baitEntries[index];
    // S160 Phase 4: closed row → no edit, structurally (missing row refuses too, as before).
    if (closedRowActionRefused(e, closes['dgCloseBaitUsed'])) return;
    const match = getDfoBaitTypeList(subformId).find(b => b.label === e.type);
    setSheetMode('bait');
    setSheetSelectedType(match ? e.type : 'Other');
    setSheetSelectedCodeId(match?.codeId ?? null);
    setSheetCustomType(match ? '' : e.type);
    setSheetLbs(e.lbs);
    setSheetUsage('');
    setSheetCondition(e.condition ?? null);
    setSheetConditionOpen(false);
    setSheetDropdownOpen(false);
    setSheetNote(e.note ?? '');
    setSheetEditIndex(index);
    setSheetVisible(true);
  };

  // S134 Phase 3: reopen the sheet on an existing bycatch row (the bait pattern). Confirm
  // updates the row in place. A stored species matching no list label is a custom 'Other'.
  const openBycatchEdit = (index: number) => {
    const e = bycatchEntries[index];
    // S160 Phase 4: closed row → no edit, structurally (missing row refuses too, as before).
    if (closedRowActionRefused(e, closes['dgClosePconsBycatch'])) return;
    // S159 (P1): matched against the PCONS list — the same set the picker offers and the
    // generator emits from (Rule 974a/b/c). A legacy row holding an old 36-list species
    // (e.g. 'Crab, Jonah' on QC) matches nothing and reopens as custom 'Other' with the
    // stored text — same un-emittable row it always was (emit '0' → send refused), now
    // visibly outside the list instead of dressed as a lawful pick.
    const match = getDfoPconsSpeciesList(subformId).find(o => o.label === e.species);
    setSheetMode('bycatch');
    setSheetSelectedType(match ? e.species : 'Other');
    setSheetSelectedCodeId(match?.codeId ?? null);
    setSheetCustomType(match ? '' : e.species);
    setSheetLbs(e.lbs);
    setSheetUsage(e.usage ?? '');
    setSheetCondition(null);
    setSheetConditionOpen(false);
    // S158 ruling R4: a row saved before this change carries no size and reads BLANK — the app
    // must not put words in his mouth where a CHOICE exists. S159 (R1/R2) narrows that: on GLF
    // the stored size is seeded only if still legal for the stored species (Rules 651a/b). A
    // non-lobster row has exactly ONE lawful value, so blank or illegal seeds 10670 — R2's
    // visible locked auto-fill, not a silent one. A lobster row with a blank/illegal size seeds
    // blank: two lawful values exist, he picks. Local sheet state only — the stored row moves
    // only when he saves the sheet.
    {
      const stored = e.specieSzId ?? '';
      if (subformId === 89) {
        const legal = glfLegalSpecieSzIds(match?.codeId);
        setSheetSpecieSzId(legal.includes(stored) ? stored : (legal.length === 1 ? legal[0] : ''));
      } else {
        setSheetSpecieSzId(stored);
      }
    }
    setSheetSizeOpen(false);
    setSheetDropdownOpen(false);
    setSheetNote(e.note ?? '');
    setSheetEditIndex(index);
    setSheetVisible(true);
  };

  const handleSheetConfirm = () => {
    // S159 (R4): a bait 'Other' stores DFO's own list label — the generator's label match
    // then emits BT_TYP_ID 814. The wire never carries the harvester's typed text; his
    // description lives in the row's NOTE (emitted as this occurrence's REM). The
    // custom-text path survives ONLY for the bycatch legacy-reopen (no bycatch list
    // offers 'Other'). A legacy free-text bait row that reopens as Other and is saved
    // converts to the lawful 814 shape — visibly, with the note required below.
    const finalType = sheetSelectedType === 'Other' && sheetMode === 'bycatch'
      ? sheetCustomType.trim() : sheetSelectedType;
    if (!finalType) {
      Alert.alert(t('form234.missingTitle'), sheetMode === 'bait' ? t('form234.pleaseSelectBait') : t('form234.pleaseSelectSpecies'));
      return;
    }
    if (!sheetLbs.trim()) {
      Alert.alert(t('form234.missingTitle'), t('form234.pleaseEnterWeight'));
      return;
    }
    if (sheetMode === 'bycatch' && subformId === 90 && !sheetUsage) {
      Alert.alert(t('form234.missingTitle'), t('form234.pleaseSelectUsage'));
      return;
    }
    // S158: PCONS.SPECIE_SZ_ID is Mandatory on GLF(89) (Subforms row 56) — the usage HARD BLOCK
    // one line above, mirrored. This is the FIRST of the two doors: it stops a sizeless row
    // being created at all. The close door (bycatchRowMissing → the requirements table) is the
    // second, and it is the one that catches rows saved before this change.
    if (sheetMode === 'bycatch' && subformId === 89 && !sheetSpecieSzId) {
      Alert.alert(t('form234.missingTitle'), t('form234.pleaseSelectSize'));
      return;
    }
    // S159 (R4): bait 'Other' (814) requires the description in the row's NOTE — the
    // door, not the lock: refused HERE, before the row exists, never after it seals.
    // Same dialog as the S158 size refusal one block up (one pattern, not two).
    if (sheetMode === 'bait' && sheetSelectedType === 'Other' && !sheetNote.trim()) {
      Alert.alert(t('form234.missingTitle'), t('form234.pleaseDescribeBaitNote'));
      return;
    }
    if (sheetMode === 'bait') {
      // BT_COND_ID: when the rule makes condition mandatory for this type/region (Rule 3060/984),
      // a value must be chosen before the entry can be added (HARD block, to spec).
      const condState = sheetSelectedCodeId != null
        ? baitConditionState(subformId, sheetSelectedCodeId)
        : 'blocked';
      if (condState === 'mandatory' && sheetCondition == null) {
        Alert.alert(t('form234.missingTitle'), t('form234.pleaseSelectBaitCondition'));
        return;
      }
      const condition = condState === 'mandatory' ? sheetCondition ?? undefined : undefined;
      const note = sheetNote.trim() || undefined;
      if (sheetEditIndex != null) {
        // S134 edit-in-place: UPDATE the row (spread keeps any fields the sheet doesn't
        // carry) — appending here would double the bait weight sent to DFO.
        setBaitEntries(prev => prev.map((en, i) =>
          i === sheetEditIndex ? { ...en, type: finalType, lbs: sheetLbs.trim(), condition, note } : en));
      } else {
        const newRow: BaitEntry = { type: finalType, lbs: sheetLbs.trim(), condition, note };
        // S134 T1: a NEW row must never inherit a close through the legacy card-stamp
        // fallback. If this log still carries a pre-S134 dgCloseBaitUsed, first copy that
        // stamp into each existing row lacking its own (same value -> identical emitted
        // bytes) and drop the card key; the new row then joins genuinely OPEN. This is the
        // one value-preserving rewrite, triggered only by the harvester's own add.
        const legacyCardStamp = closes['dgCloseBaitUsed'];
        if (legacyCardStamp) {
          const adopted = JSON.parse(stampOpenBaitRows(JSON.stringify(baitEntries), legacyCardStamp)) as BaitEntry[];
          setBaitEntries([...adopted, newRow]);
          setCloses(prev => { const { dgCloseBaitUsed: _dropped, ...rest } = prev; return rest; });
        } else {
          setBaitEntries(prev => [...prev, newRow]);
        }
      }
    } else {
      const note = sheetNote.trim() || undefined;
      if (sheetEditIndex != null) {
        // S134 Phase 3 edit-in-place: UPDATE the row — appending here would double the
        // bycatch weight sent to DFO.
        // S158 (W2): specieSzId joins the named members. The spread preserves an existing size,
        // but without naming it here the sheet could not CHANGE one — an edit would silently
        // keep the old pick.
        setBycatchEntries(prev => prev.map((en, i) =>
          i === sheetEditIndex ? { ...en, species: finalType, lbs: sheetLbs.trim(), usage: sheetUsage || undefined, specieSzId: sheetSpecieSzId || undefined, note } : en));
      } else {
        // S158 (W1): this literal names every member a new row gets. A member missing HERE is
        // never written at all, and TypeScript cannot warn — every member past species/lbs is
        // optional.
        const newRow: BycatchEntry = { species: finalType, lbs: sheetLbs.trim(), usage: sheetUsage || undefined, specieSzId: sheetSpecieSzId || undefined, note };
        // S134 Phase 3: adopt-on-add — a NEW row must never inherit a close through the
        // legacy card-stamp fallback (same one value-preserving rewrite as bait).
        const legacyCardStamp = closes['dgClosePconsBycatch'];
        if (legacyCardStamp) {
          const adopted = JSON.parse(stampOpenRows(JSON.stringify(bycatchEntries), legacyCardStamp)) as BycatchEntry[];
          setBycatchEntries([...adopted, newRow]);
          setCloses(prev => { const { dgClosePconsBycatch: _dropped, ...rest } = prev; return rest; });
        } else {
          setBycatchEntries(prev => [...prev, newRow]);
        }
      }
    }
    setSheetVisible(false);
  };

  // S160 Phase 4 (the S140 effortDeleteRefused pattern): a CLOSED row can never be deleted —
  // structural, not render-only. The trash icons are already hidden on closed rows; these
  // guards stop any future caller from destroying a closed occurrence (§5.1 rule 6 / A.1.2).
  const deleteBait = (index: number) => {
    if (closedRowActionRefused(baitEntries[index], closes['dgCloseBaitUsed'])) return;
    setBaitEntries(prev => prev.filter((_, i) => i !== index));
  };
  const deleteBycatch = (index: number) => {
    if (closedRowActionRefused(bycatchEntries[index], closes['dgClosePconsBycatch'])) return;
    setBycatchEntries(prev => prev.filter((_, i) => i !== index));
  };

  // Options carry codeId so a selection resolves its codeId from the chosen list entry
  // directly (never by re-matching the label string). The bycatch codeId is DISPLAY
  // metadata only (FR lookup) — BycatchEntry still persists just the label (S101b L3).
  const getSheetOptions = (): { label: string; codeId?: number }[] => {
    switch (sheetMode) {
      case 'bait': return getDfoBaitTypeList(subformId).map(b => ({ label: b.label, codeId: b.codeId }));
      // S159 (P1, Rule 974a/b/c): the option source IS the emit lookup's list — one set,
      // never two lists agreeing by coincidence (34 of the old 36 QC/NL options had no
      // emit row and every pick of one died at the send gate).
      case 'bycatch': return getDfoPconsSpeciesList(subformId).map(s => ({ label: s.label, codeId: s.codeId }));
      default: return [];
    }
  };

  // S101b L1/L3 display-only FR: stored EN label → app-list row (the SAME in-list label
  // match the generator does at emit) → codeId → MV descFr; falls back to the stored
  // label (covers custom 'Other' bait text and any unmatched legacy value).
  const baitTypeDisplay = (label: string): string => {
    if (!isFr) return label;
    const row = getDfoBaitTypeList(subformId).find(b => b.label === label);
    return (row && BAIT_TYPE_FR.get(row.codeId)) || label;
  };
  const bycatchSpeciesDisplay = (label: string): string => {
    if (!isFr) return label;
    // S159 (P1): same PCONS list as the options and the emit. A legacy off-list species
    // falls back to its stored EN label (the documented fallback) — which is also what
    // the emit would fail to match, so the odd label is the honest render.
    const row = getDfoPconsSpeciesList(subformId).find(s => s.label === label);
    return (row && SPECIES_FR.get(row.codeId)) || label;
  };
  const sheetTypeDisplay = (label: string): string =>
    sheetMode === 'bait' ? baitTypeDisplay(label) : bycatchSpeciesDisplay(label);

  // Display-only helper (S93): render a trip-timestamp as locale-aware date + time —
  // e.g. "Jul 5, 12:33" (EN) / "5 juill., 12:33" (FR). Combines the field's companion date
  // (fallback dateFished) with its HH:MM time. Storage, companion-date keys, and the generator
  // are UNTOUCHED — this only changes what the Time Sailed/Hauling/Landing/Transfer buttons
  // render (four until S147 Phase 5a gave the transfer its own date; five since).
  const formatDateTimeDisplay = (dateStr: string, timeStr: string): string => {
    if (!timeStr) return '';
    const d = parseDateTime(dateStr || dateFished, timeStr);
    const locale = i18n.language.startsWith('fr') ? 'fr-CA' : 'en-CA';
    return `${d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}, ${timeStr}`;
  };

  const renderTimestampField = (
    label: string, value: string, field: PickerField, isProblem: boolean = false, isReq: boolean = false,
    extraIdx?: number, // S135 Phase 4: which SAR block 2+ this field belongs to (default: none)
    sealed: boolean = false // S140 P3 (ruled): a sealed blank must not invite a tap it ignores
  ) => (
    <View style={styles.fieldRow}>
      <View style={styles.labelRow}>
        {isProblem && <View style={styles.problemDot} />}
        <Text style={styles.label}>{label}{isReq && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
      </View>
      <TouchableOpacity style={styles.timeButton} onPress={() => { if (!readOnly) openPicker(field, extraIdx); }}>
        <Text style={[styles.timeButtonText, !value && styles.timeButtonPlaceholder]}>
          {value || t(sealed ? 'form234.notSetLabel' : 'form234.tapToSetDateTime')}
        </Text>
        <Clock size={16} color="#64748B" />
      </TouchableOpacity>
    </View>
  );

  // ── S121 multi-grid helpers ─────────────────────────────────────────────────────────
  const updateExtra = (idx: number, patch: Partial<ExtraEffortDetail>) => {
    setExtraEfforts(prev => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  };

  const addExtraEffort = () => {
    // Collapse the filled blocks to their summaries, open the new one
    setBlock1Collapsed(true); // walk fix 2: group 1 collapses with the rest
    setExtraCollapsed(prev => {
      const next = { ...prev };
      extraEfforts.forEach((_, i) => { next[i] = true; });
      next[extraEfforts.length] = false;
      return next;
    });
    setExtraEfforts(prev => [...prev, {}]);
  };

  const removeExtraEffort = (idx: number) => {
    setExtraEfforts(prev => prev.filter((_, i) => i !== idx));
    setExtraCollapsed(prev => {
      const next: Record<number, boolean> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const i = Number(k);
        if (i < idx) next[i] = v;
        else if (i > idx) next[i - 1] = v;
      });
      return next;
    });
    if (extraDropdown?.idx === idx) setExtraDropdown(null);
  };

  // S136 Phase 3 walk fix 2: deleting Trap Group 1 slides the next group up into the legacy
  // flat keys (the S135 removeSarBlock block-1 pattern) — the reader's list is identical
  // minus the deleted group, so the bytes the remaining groups transmit are unchanged by
  // construction. With no group 2, the delete wipes group 1's fields.
  const removeTrapGroup = (uiIdx: number) => {
    if (uiIdx === 0) {
      if (extraEfforts.length > 0) {
        const [first, ...rest] = extraEfforts;
        setLgridCodeId(first.lgridCodeId ? Number(first.lgridCodeId) : null);
        setLgridDisplay(first.lgridDisplay ?? '');
        setGridId(first.gridId ? Number(first.gridId) : null);
        setGridDisplay(first.gridDisplay ?? '');
        setStatSectId(first.statSectId ? Number(first.statSectId) : null);
        setStatSectDisplay(first.statSectDisplay ?? '');
        setCatchWeight(first.catchWeight ?? '');
        setTrapHauls(first.trapHauls ?? '');
        setSoakDuration(first.soakDuration ?? '');
        setGpsLat(first.gpsLat ?? ''); setGpsLng(first.gpsLng ?? '');
        setGpsSrc(first.gpsSrc === 'gps' ? 'gps' : 'manual');
        setTrapSize(first.trapSize ?? '');
        setNbSpcmnKept(first.nbSpcmnKept ?? ''); setNbSpcmnDisc(first.nbSpcmnDisc ?? '');
        setNbSpcmnBrd(first.nbSpcmnBrd ?? '');
        setVNotchCount(first.vNotchCount ?? ''); setNbVntchYou(first.nbVntchYou ?? '');
        setExtraEfforts(rest);
        setExtraCollapsed(prev => {
          const next: Record<number, boolean> = {};
          Object.entries(prev).forEach(([k, v]) => {
            const i = Number(k);
            if (i > 0) next[i - 1] = v;
          });
          return next;
        });
        setBlock1Collapsed(false); // the promoted values are new to the eye — show them
      } else {
        setLgridCodeId(null); setLgridDisplay('');
        setGridId(null); setGridDisplay('');
        setStatSectId(null); setStatSectDisplay('');
        setCatchWeight(''); setTrapHauls(''); setSoakDuration('');
        setGpsLat(''); setGpsLng(''); setGpsSrc('manual');
        setTrapSize(''); setNbSpcmnKept(''); setNbSpcmnBrd('');
        setVNotchCount(''); setNbVntchYou('');
      }
      setLgridPickerOpen(false); setStatSectPickerOpen(false); setGridPickerOpen(false);
      setExtraDropdown(null);
    } else {
      removeExtraEffort(uiIdx - 1);
    }
  };

  // Trap Group 1's flat state as an ExtraEffortDetail — feeds the shared collapsed summary.
  const block1Detail = (): ExtraEffortDetail => ({
    lgridCodeId: lgridCodeId ? String(lgridCodeId) : '', lgridDisplay,
    gridId: gridId ? String(gridId) : '', gridDisplay,
    statSectId: statSectId ? String(statSectId) : '', statSectDisplay,
    catchWeight, trapHauls, soakDuration,
    gpsLat, gpsLng, gpsSrc, trapSize,
    nbSpcmnKept, nbSpcmnDisc, nbSpcmnBrd, vNotchCount, nbVntchYou,
  });

  // ── S136 Phase 4: fishing efforts 2..n ───────────────────────────────────────────────
  // Effort 1 is the flat keys; efforts 2+ ride extraEffortNodes. UI index 0 = effort 1.

  // Thin adapter over the single-sourced dfoLogStorage predicate (tested there) — the
  // §4.2 refusal condition. The component owns no refusal logic (S136 extraction ruling).
  const effortAnyClosed = (): boolean => effortsAnyClosed(liveEffortData());

  const updateEffortNode = (idx: number, patch: Partial<ExtraEffortNode>) => {
    setExtraEffortNodes(prev => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  };

  // A new effort starts always-expanded (ruling 7) with one open trap group — the XSD
  // demands ≥1 EFFORT_DETAIL per effort, so the empty group is the form to fill, not chrome.
  // S136 P4 (founder-added): the new effort's LFA arrives PRE-FILLED from the previous
  // effort's — a default copied at ADD TIME only, visible and freely changeable through the
  // ordinary picker (no lock, no confirm), never a live link: changing the earlier effort's
  // LFA afterwards touches nothing here. (The same shape as the new-log LFA pre-fill from
  // the last log.) Grid/section picks are NOT copied — they stay FMA-scoped per effort and
  // the picker's change-reset behaves exactly as today.
  const addEffortNode = () => {
    const prevFma = extraEffortNodes.length > 0
      ? extraEffortNodes[extraEffortNodes.length - 1].fmaId
      : (fmaId != null ? String(fmaId) : undefined);
    setExtraEffortNodes(prev => [...prev, { ...(prevFma ? { fmaId: prevFma } : {}), details: [{}] }]);
  };

  const updateNodeGroup = (nodeIdx: number, gIdx: number, patch: Partial<ExtraEffortDetail>) => {
    setExtraEffortNodes(prev => prev.map((e, i) => i === nodeIdx
      ? { ...e, details: (e.details ?? []).map((g, j) => (j === gIdx ? { ...g, ...patch } : g)) }
      : e));
  };

  const addNodeGroup = (nodeIdx: number) => {
    // Collapse the node's filled groups, open the new one (the addExtraEffort shape)
    setNodeGroupCollapsed(prev => {
      const next = { ...prev };
      (extraEffortNodes[nodeIdx]?.details ?? []).forEach((_, j) => { next[`${nodeIdx}:${j}`] = true; });
      next[`${nodeIdx}:${(extraEffortNodes[nodeIdx]?.details ?? []).length}`] = false;
      return next;
    });
    setExtraEffortNodes(prev => prev.map((e, i) => i === nodeIdx
      ? { ...e, details: [...(e.details ?? []), {}] } : e));
  };

  const removeNodeGroup = (nodeIdx: number, gIdx: number) => {
    // Extras' groups are uniform (no flat block) — remove is a plain filter; keep ≥1 group
    // by wiping the last one instead of deleting it (an effort must hold a trap group).
    setExtraEffortNodes(prev => prev.map((e, i) => {
      if (i !== nodeIdx) return e;
      const details = e.details ?? [];
      return details.length > 1
        ? { ...e, details: details.filter((_, j) => j !== gIdx) }
        : { ...e, details: [{}] };
    }));
    setNodeGroupCollapsed(prev => {
      const next: Record<string, boolean> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const [n, g] = k.split(':').map(Number);
        if (n !== nodeIdx) { next[k] = v; return; }
        if (g < gIdx) next[k] = v;
        else if (g > gIdx) next[`${n}:${g - 1}`] = v;
      });
      return next;
    });
    if (nodeDropdown?.node === nodeIdx) setNodeDropdown(null);
  };

  // Delete an effort (ruling 8) — OPEN efforts only (the trash is hidden on closed ones).
  // Deleting effort 1 promotes effort 2 into the legacy flat keys CARRYING its stamp, its
  // note and its trap groups: the reader's list is identical minus the deleted effort, so
  // the bytes every surviving effort transmits are unchanged by construction (the S135
  // slide-up argument, one level up). With no effort 2, the delete wipes effort 1's fields
  // (same end state as the toggle-No wipe, without flipping the toggle).
  const removeEffortNode = (uiIdx: number) => {
    // S140 P3 (design ruling 6): a CLOSED effort can never be deleted — structural, not
    // render-only. The trash icons are already hidden on closed efforts; this guard stops
    // any future caller from laundering a closed effort 1's stamp through the slide-up.
    if (effortDeleteRefused(uiIdx, closes['dgCloseEffort'], JSON.stringify(extraEffortNodes))) return;
    if (uiIdx === 0) {
      if (extraEffortNodes.length > 0) {
        const [first, ...rest] = extraEffortNodes;
        // Effort scalars → the flat keys
        setHaulStartDate(first.haulStartDate ?? ''); setTimeStartedHauling(first.haulStartTime ?? '');
        setHaulEndDate(first.haulEndDate ?? ''); setTimeStoppedHauling(first.haulEndTime ?? '');
        setFmaId(first.fmaId ? Number(first.fmaId) : null);
        setLicNo(first.licNo ?? '');
        setSarYes(first.sarYes === 'true' ? true : (first.sarYes === 'false' ? false : null));
        setMmYes(first.mmYes === 'true' ? true : (first.mmYes === 'false' ? false : null));
        setGearSubtypeId(first.gearSubtypeId ?? '');
        // Its stamp rides up (ruling 8); an unstamped promotion CLEARS the flat stamp
        setCloses(prev => {
          const next = { ...prev };
          if (first.closeDt) next['dgCloseEffort'] = first.closeDt;
          else delete next['dgCloseEffort'];
          return next;
        });
        // Its note rides up into the legacy remarks pair (catch mirrors haul, as the UI writes)
        setNote('catch', first.note ?? ''); setNote('haul', first.note ?? '');
        // Its trap groups: group 1 → the flat block, groups 2+ → extraEffortDetails
        const [g1, ...gRest] = first.details ?? [];
        setLgridCodeId(g1?.lgridCodeId ? Number(g1.lgridCodeId) : null);
        setLgridDisplay(g1?.lgridDisplay ?? '');
        setGridId(g1?.gridId ? Number(g1.gridId) : null);
        setGridDisplay(g1?.gridDisplay ?? '');
        setStatSectId(g1?.statSectId ? Number(g1.statSectId) : null);
        setStatSectDisplay(g1?.statSectDisplay ?? '');
        setCatchWeight(g1?.catchWeight ?? ''); setTrapHauls(g1?.trapHauls ?? '');
        setSoakDuration(g1?.soakDuration ?? '');
        setGpsLat(g1?.gpsLat ?? ''); setGpsLng(g1?.gpsLng ?? '');
        setGpsSrc(g1?.gpsSrc === 'gps' ? 'gps' : 'manual');
        setTrapSize(g1?.trapSize ?? '');
        setNbSpcmnKept(g1?.nbSpcmnKept ?? ''); setNbSpcmnDisc(g1?.nbSpcmnDisc ?? '');
        setNbSpcmnBrd(g1?.nbSpcmnBrd ?? '');
        setVNotchCount(g1?.vNotchCount ?? ''); setNbVntchYou(g1?.nbVntchYou ?? '');
        setExtraEfforts(gRest);
        setBlock1Collapsed(false);
        setExtraEffortNodes(rest);
      } else {
        wipeEffort();
      }
      setNodeDropdown(null); setExtraLicEditingIdx(null); setNodeGroupCollapsed({});
    } else {
      setExtraEffortNodes(prev => prev.filter((_, i) => i !== uiIdx - 1));
      setNodeDropdown(null); setExtraLicEditingIdx(null);
      setNodeGroupCollapsed(prev => {
        const next: Record<string, boolean> = {};
        Object.entries(prev).forEach(([k, v]) => {
          const [n, g] = k.split(':').map(Number);
          if (n < uiIdx - 1) next[k] = v;
          else if (n > uiIdx - 1) next[`${n - 1}:${g}`] = v;
        });
        return next;
      });
    }
  };

  // S136 UI round item 4 (ruled): deleting a FISHING EFFORT confirms first — the effort
  // and everything in it (trap groups, haul times, answers, note) goes, and effort 1's
  // delete promotes effort 2 into the flat keys. Trap groups, bait/bycatch rows and SAR
  // blocks keep their existing confirm-free delete (deliberately untouched).
  const confirmRemoveEffortNode = (uiIdx: number) => {
    Alert.alert(
      t('form234.deleteEffortConfirmTitle'),
      t('form234.deleteEffortConfirmBody'),
      [
        { text: tc('nav.cancel'), style: 'cancel' },
        { text: tc('nav.delete'), style: 'destructive', onPress: () => removeEffortNode(uiIdx) },
      ],
    );
  };

  // Close ONE extra effort (ruling 8): stamps that effort only and persists immediately —
  // closure is irreversible and must survive without a later Save (the closeBaitRow shape).
  // Effort 1's close is closeEffortNode (the flat dgCloseEffort), defined below.
  const closeEffortNodeAt = (idx: number) => {
    if (readOnly) return;
    const e = extraEffortNodes[idx];
    if (!e || e.closeDt) return;
    {
      // S140 P3: the gate — this node's full set with its OWN fishing area.
      const { rows, mixed } = nodeMissingRows(e);
      const overlap = effortOverlapMissing();  // S147 Run 4 — Rule 33
      const all = overlap ? [...rows, closeBulletText(overlap)] : rows;
      const allMixed = mixed || (!!overlap && bulletIsMixed(overlap));
      if (all.length) { showCloseBlocked(all, allMixed); return; }
    }
    Alert.alert(
      t('form234.closeEffortConfirmTitle'),
      t('form234.closeEffortConfirmBody'),
      [
        { text: t('form234.closeConfirmNotYet'), style: 'cancel' },
        {
          text: t('form234.closeConfirmYes'),
          style: 'destructive',
          onPress: async () => {
            const nowIso = new Date().toISOString();
            // S153 Phase 2: this node seals the KEPT_WT of its OWN trap groups (node.details),
            // and carries its own unit tag beside its own closeDt — efforts 2+ have a node to
            // hold it, unlike effort 1 which uses the flat key.
            const unit = await currentWeightUnit();
            const next = sealEffortNodeWeights(extraEffortNodes, unit, idx)
              .map((en, i) => (i === idx ? { ...en, closeDt: nowIso } : en));
            setExtraEffortNodes(next);
            if (isLoaded && !editingCompleted) {
              void saveLog({ ...buildDraftLog(), data: { ...buildLogData(), extraEffortNodes: JSON.stringify(next) } });
            }
          },
        },
      ],
    );
  };

  // "Close & Save All Efforts" (ruling 9, the bait shape): closes every open effort with
  // ONE stamp via the single-sourced stampOpenEfforts (skip-never-restamp), writes no
  // card-level key beyond effort 1's own dgCloseEffort, confirms with a count, persists
  // immediately. The button is hidden when nothing is open.
  const closeAllOpenEfforts = () => {
    if (readOnly) return;
    // Counted through the ONE reader so the confirm's count and the stamping can't drift.
    const openCount = effortsFromData(liveEffortData()).filter(e => !e.closeDt).length;
    if (openCount === 0) return;
    {
      // S140 P3 all-or-nothing (ruled): any incomplete open effort → NOTHING closes; one
      // message lists every missing field grouped by effort ("Fishing Effort N — Field").
      const allRows: string[] = [];
      let anyMixed = false;
      if (effortYes && !closes['dgCloseEffort']) {
        const r1 = effort1MissingRows();
        anyMixed = anyMixed || r1.mixed;
        allRows.push(...r1.rows.map(r => `${t('form234.effortNodeTitle', { n: 1 })} — ${r}`));
      }
      extraEffortNodes.forEach((e, i) => {
        if (!e.closeDt) {
          const rn = nodeMissingRows(e);
          anyMixed = anyMixed || rn.mixed;
          allRows.push(...rn.rows.map(r => `${t('form234.effortNodeTitle', { n: i + 2 })} — ${r}`));
        }
      });
      const overlap = effortOverlapMissing();  // S147 Run 4 — Rule 33, once for the whole set
      if (overlap) { allRows.push(closeBulletText(overlap)); anyMixed = anyMixed || bulletIsMixed(overlap); }
      if (allRows.length) { showCloseBlocked(allRows, anyMixed); return; }
    }
    Alert.alert(
      t('form234.closeConfirmTitle', { section: t('form234.catchEffortSection') }),
      t('form234.closeEffortAllConfirmBody', { count: openCount }),
      [
        { text: t('form234.closeConfirmNotYet'), style: 'cancel' },
        {
          text: t('form234.closeConfirmYes'),
          style: 'destructive',
          onPress: async () => {
            const nowIso = new Date().toISOString();
            // S153 Phase 2: convert ONLY what was still open. stampOpenEfforts already skips
            // (never restamps) an effort that carries a stamp, and the same skip rule governs
            // conversion — an effort closed an hour ago on lbs keeps its number AND its unit
            // (R2), even though this tap seals its neighbours on kg (R4).
            const unit = await currentWeightUnit();
            const effort1WasOpen = !closes['dgCloseEffort'];
            const sealedAll = effort1WasOpen ? sealEffort1Weights(catchWeight, extraEfforts, unit) : null;
            const cwKg = sealedAll ? sealedAll.catchWeight : catchWeight;
            const detailsNext = sealedAll ? sealedAll.details : extraEfforts;
            const converted = sealEffortNodeWeights(extraEffortNodes, unit);
            const stamped = stampOpenEfforts(closes['dgCloseEffort'], JSON.stringify(converted), nowIso);
            const nodesNext = JSON.parse(stamped.extraEffortNodes) as ExtraEffortNode[];
            setCloses(prev => ({ ...prev, dgCloseEffort: stamped.dgCloseEffort }));
            setExtraEffortNodes(nodesNext);
            if (effort1WasOpen) {
              setCatchWeight(cwKg);
              setExtraEfforts(detailsNext);
              setCloseUnits(prev => ({ ...prev, dgCloseEffortUnit: unit }));
            }
            if (isLoaded && !editingCompleted) {
              void saveLog({ ...buildDraftLog(), data: {
                ...buildLogData(), dgCloseEffort: stamped.dgCloseEffort,
                ...(effort1WasOpen ? { catchWeight: cwKg, dgCloseEffortUnit: unit } : {}),
                ...(effort1WasOpen && detailsNext.length > 0 ? { extraEffortDetails: JSON.stringify(detailsNext) } : {}),
                ...(nodesNext.length > 0 ? { extraEffortNodes: JSON.stringify(nodesNext) } : {}),
              } });
            }
          },
        },
      ],
    );
  };

  // SAR/MM Yes-No on an EXTRA effort. Yes fires the same mandated prompts as effort 1
  // (Rules 781 / 604 follow-ups). The refusal logic is single-sourced in dfoLogStorage
  // (sarNoToggleRefused, tested there): refused only when this is the LAST effort
  // answering Yes AND any SAR block is closed; with another effort still Yes the flag
  // flips freely and the trip-level pool stands.
  const handleNodeSarYes = (idx: number, val: boolean) => {
    if (!val && sarNoToggleRefused(liveEffortData(), idx + 1)) {
      Alert.alert(t('form234.sarSubsection'), t('form234.sarClosedNoToggle'));
      return;
    }
    updateEffortNode(idx, { sarYes: String(val) });
    if (val) Alert.alert('', t('form234.sarIndPrompt'), [{ text: tc('nav.ok') }]);
  };
  const handleNodeMmYes = (idx: number, val: boolean) => {
    updateEffortNode(idx, { mmYes: String(val) });
    if (val) Alert.alert('', t('form234.mmInterIndPrompt'), [{ text: tc('nav.ok') }]);
  };

  // One numeric/text field of an extra effort's trap group (the extraField shape).
  // S154B: `valueOverride` is the extraSarInput shape (S153B) — this helper is addressed by
  // KEY, so a caller that must transform what it shows (a closed weight read back in its own
  // unit) has no other way in. Only the catch weight passes it; every other field is untouched.
  const nodeGroupField = (
    nodeIdx: number, gIdx: number, label: string, key: keyof ExtraEffortDetail,
    keyboardType: any = 'numeric', isReq: boolean = false,
    onChange?: (v: string) => void,
    valueOverride?: string
  ) => (
    <View style={styles.fieldRow}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}{isReq && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
      </View>
      <TextInput
        style={[styles.input, readOnly && styles.inputReadOnly]}
        value={valueOverride ?? ((extraEffortNodes[nodeIdx]?.details?.[gIdx]?.[key] as string) ?? '')}
        onChangeText={onChange ?? ((v: string) => updateNodeGroup(nodeIdx, gIdx, { [key]: v }))}
        placeholder="0"
        placeholderTextColor="#94A3B8"
        editable={!readOnly}
        keyboardType={keyboardType}
      />
    </View>
  );

  // One trap group of an EXTRA effort — the renderExtraEffortBlock field set, addressed by
  // (node, group) instead of the effort-1 extras index, gated by the NODE's own FMA.
  const renderNodeGroup = (nodeIdx: number, g: ExtraEffortDetail, gIdx: number, nodeFma: number | null, nodeClosed: boolean) => {
    const collapsed = !!nodeGroupCollapsed[`${nodeIdx}:${gIdx}`];
    // S136 UI round item 1 (Rule 3059 conformance): the ONE single-sourced entry gate.
    const showCoords = effortCoordsEntryAllowed(subformId, nodeFma);
    const dd = (kind: 'lgrid' | 'statSect' | 'trapSize') =>
      nodeDropdown?.node === nodeIdx && nodeDropdown.group === gIdx && nodeDropdown.kind === kind;
    const toggleDd = (kind: 'lgrid' | 'statSect' | 'trapSize') => {
      if (readOnly) return;
      setNodeDropdown(cur => (cur?.node === nodeIdx && cur.group === gIdx && cur.kind === kind) ? null : { node: nodeIdx, group: gIdx, kind });
    };
    return (
      <View key={`n${nodeIdx}g${gIdx}`} style={styles.trapGroupBlock}>
        <View style={styles.effortBlockHeader}>
          <Text style={styles.effortBlockTitle}>{t('form234.catchEffortBlock', { n: gIdx + 1 })}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {!readOnly && !nodeClosed && (
              <TouchableOpacity style={styles.deleteBtn} onPress={() => removeNodeGroup(nodeIdx, gIdx)}>
                <Trash2 size={16} color="#EF4444" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.deleteBtn} onPress={() => setNodeGroupCollapsed(prev => ({ ...prev, [`${nodeIdx}:${gIdx}`]: !collapsed }))}>
              {collapsed ? <ChevronDown size={18} color="#64748B" /> : <ChevronUp size={18} color="#64748B" />}
            </TouchableOpacity>
          </View>
        </View>
        {collapsed ? (
          <TouchableOpacity onPress={() => setNodeGroupCollapsed(prev => ({ ...prev, [`${nodeIdx}:${gIdx}`]: false }))}>
            {/* S154B — THE FIX. This summary used to inherit EFFORT 1's close stamp and unit tag
                from inside extraSummary while describing a group of THIS node. Two ways that went
                wrong: a closed node under an open effort 1 printed its raw stored kilograms, and
                an OPEN node under an effort 1 closed on lbs printed the weight multiplied by
                2.20462 — a wrong number in a box the harvester could still edit. It now reads the
                node's own stamps: the SAME pair of expressions the group's weight field uses
                above, so the collapsed line and the open card can never disagree. */}
            <Text style={styles.effortBlockSummary} numberOfLines={1}>{extraSummary(g, !!extraEffortNodes[nodeIdx]?.closeDt, extraEffortNodes[nodeIdx]?.closeUnit)}</Text>
          </TouchableOpacity>
        ) : (
          <>
            {subformId === 90 && nodeFma !== null && (DFO_LGRID_BY_FMA[nodeFma] ?? []).length > 0 && (
              <View style={styles.fieldRow}>
                <Text style={styles.label}>{t('form234.lgridLabel')}{isFieldRequired('lgridCodeId', { subformId, fmaId: nodeFma }) && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                <TouchableOpacity style={styles.timeButton} onPress={() => toggleDd('lgrid')}>
                  <Text style={[styles.timeButtonText, !g.lgridDisplay && styles.timeButtonPlaceholder]}>
                    {g.lgridDisplay || t('form234.selectGrid')}
                  </Text>
                  <ChevronDown size={16} color="#64748B" />
                </TouchableOpacity>
                {dd('lgrid') && (
                  <View style={[styles.dropdownList, { maxHeight: 200 }]}>
                    <ScrollView nestedScrollEnabled>
                      {(DFO_LGRID_BY_FMA[nodeFma] ?? []).map(gr => (
                        <TouchableOpacity
                          key={gr.codeId}
                          style={[styles.dropdownItem, g.lgridCodeId === String(gr.codeId) && styles.dropdownItemActive]}
                          onPress={() => { updateNodeGroup(nodeIdx, gIdx, { lgridCodeId: String(gr.codeId), lgridDisplay: String(gr.display) }); setNodeDropdown(null); }}
                        >
                          <Text style={[styles.dropdownItemText, g.lgridCodeId === String(gr.codeId) && styles.dropdownItemTextActive]}>
                            {gr.display}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
            {subformId === 88 && nodeFma !== null && nodeFma in DFO_FMA_GRID_MAP && (
              <View style={styles.fieldRow}>
                <Text style={styles.label}>{t('form234.gridLabel')}{isFieldRequired('gridId', { subformId, fmaId: nodeFma }) && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => { if (readOnly) return; setGridSearch(''); setGridPickerNodeTarget({ node: nodeIdx, group: gIdx }); setGridPickerOpen(true); }}
                >
                  <Text style={[styles.timeButtonText, !g.gridDisplay && styles.timeButtonPlaceholder]}>
                    {g.gridDisplay || t('form234.selectQcGrid')}
                  </Text>
                  <ChevronDown size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
            )}
            {subformId === 91 && nodeFma !== null && DFO_FMA_STAT_SECT_REQUIRED.has(nodeFma) && (
              <View style={styles.fieldRow}>
                <Text style={styles.label}>{t('form234.statSectLabel')}{isFieldRequired('statSectId', { subformId, fmaId: nodeFma }) && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                <TouchableOpacity style={styles.timeButton} onPress={() => toggleDd('statSect')}>
                  <Text style={[styles.timeButtonText, !g.statSectDisplay && styles.timeButtonPlaceholder]}>
                    {g.statSectDisplay || t('form234.selectStatSect')}
                  </Text>
                  <ChevronDown size={16} color="#64748B" />
                </TouchableOpacity>
                {dd('statSect') && (
                  <View style={[styles.dropdownList, { maxHeight: 200 }]}>
                    <ScrollView nestedScrollEnabled>
                      {(DFO_STAT_SECT_BY_FMA[nodeFma] ?? []).map(r => {
                        const label = i18n.language.startsWith('fr') ? r.statSectDescFr : r.statSectDescEn;
                        return (
                          <TouchableOpacity
                            key={r.statSectCodeId}
                            style={[styles.dropdownItem, g.statSectId === String(r.statSectCodeId) && styles.dropdownItemActive]}
                            onPress={() => { updateNodeGroup(nodeIdx, gIdx, { statSectId: String(r.statSectCodeId), statSectDisplay: label }); setNodeDropdown(null); }}
                          >
                            <Text style={[styles.dropdownItemText, g.statSectId === String(r.statSectCodeId) && styles.dropdownItemTextActive]}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
            {/* S154B: the VALUE takes the same closed-flag and the same tag as the LABEL beside
                it. Before this, only the label converted — a group closed on lbs drew its raw
                stored kilograms under an (LBS) heading. The node's OWN closeDt/closeUnit, never
                effort 1's. An open group is shown untouched (showWeight's open branch). */}
            {nodeGroupField(nodeIdx, gIdx, wLabel('form234.catchWeightLabel', !!extraEffortNodes[nodeIdx]?.closeDt, extraEffortNodes[nodeIdx]?.closeUnit), 'catchWeight', 'numeric', isRequired('catchWeight'), undefined,
              showWeight(extraEffortNodes[nodeIdx]?.details?.[gIdx]?.catchWeight ?? '', !!extraEffortNodes[nodeIdx]?.closeDt, extraEffortNodes[nodeIdx]?.closeUnit))}
            {nodeGroupField(nodeIdx, gIdx, t('form234.trapHaulsLabel'), 'trapHauls', 'numeric', isRequired('trapHauls'))}
            {subformId !== 90 &&
              nodeGroupField(nodeIdx, gIdx, t('form234.soakDurationLabel'), 'soakDuration', 'decimal-pad', isRequired('soakDuration'))}
            {subformId === 88 && nodeFma != null && DFO_FMA_NB_VNTCH.has(nodeFma) &&
              nodeGroupField(nodeIdx, gIdx, t('form234.nbVntchLabel'), 'vNotchCount', 'numeric', isFieldRequired('vNotchCount', { subformId, fmaId: nodeFma }))}
            {nodeFma != null && DFO_FMA_NB_VNTCH_YOU.has(nodeFma) &&
              nodeGroupField(nodeIdx, gIdx, t('form234.nbVntchYouLabel'), 'nbVntchYou', 'numeric', isFieldRequired('nbVntchYou', { subformId, fmaId: nodeFma }))}
            {subformId === 91 &&
              nodeGroupField(nodeIdx, gIdx, t('form234.nbSpcmnKeptLabel'), 'nbSpcmnKept', 'numeric', isFieldRequired('nbSpcmnKept', { subformId, fmaId: nodeFma }))}
            {/* NB_SPCMN_DISC — same config gate again; region is per-LOG, not per-effort */}
            {isVisible('nbSpcmnDisc') &&
              nodeGroupField(nodeIdx, gIdx, t('form234.nbSpcmnDiscLabel'), 'nbSpcmnDisc', 'numeric', isFieldRequired('nbSpcmnDisc', { subformId, fmaId: nodeFma }))}
            {subformId === 91 && (
              <View style={styles.fieldRow}>
                <Text style={styles.label}>{t('form234.trapSizeLabel')}{isFieldRequired('trapSize', { subformId, fmaId: nodeFma }) && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                <TouchableOpacity style={styles.timeButton} onPress={() => toggleDd('trapSize')}>
                  <Text style={[styles.timeButtonText, !g.trapSize && styles.timeButtonPlaceholder]}>
                    {g.trapSize ? t(`form234.trapSizeOption_${g.trapSize}`, { defaultValue: DFO_TRAP_SIZE_LIST.find(s => String(s.codeId) === g.trapSize)?.label ?? t('form234.selectTrapSize') }) : t('form234.selectTrapSize')}
                  </Text>
                  <ChevronDown size={16} color="#64748B" />
                </TouchableOpacity>
                {dd('trapSize') && (
                  <View style={styles.dropdownList}>
                    {DFO_TRAP_SIZE_LIST.map(s => (
                      <TouchableOpacity
                        key={s.codeId}
                        style={[styles.dropdownItem, g.trapSize === String(s.codeId) && styles.dropdownItemActive]}
                        onPress={() => { updateNodeGroup(nodeIdx, gIdx, { trapSize: String(s.codeId) }); setNodeDropdown(null); }}
                      >
                        <Text style={[styles.dropdownItemText, g.trapSize === String(s.codeId) && styles.dropdownItemTextActive]}>
                          {t(`form234.trapSizeOption_${s.codeId}`, { defaultValue: s.label })}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
            {subformId === 90 && nodeFma === DFO_FMA_38B &&
              nodeGroupField(nodeIdx, gIdx, t('form234.nbSpcmnBrdLabel'), 'nbSpcmnBrd', 'numeric', isFieldRequired('nbSpcmnBrd', { subformId, fmaId: nodeFma }))}
            {showCoords && (
              <>
                {!readOnly && !nodeClosed && (
                  <TouchableOpacity
                    style={styles.captureGpsBtn}
                    onPress={async () => {
                      setGpsCapturing(true);
                      // S140 P2 defect 48: 'gps' only on success — a failed capture leaves
                      // the fields (and so their provenance) untouched.
                      const ok = await captureGps(
                        (v: string) => updateNodeGroup(nodeIdx, gIdx, { gpsLat: v }),
                        (v: string) => updateNodeGroup(nodeIdx, gIdx, { gpsLng: v }),
                        { alertOnFail: true }
                      );
                      if (ok) updateNodeGroup(nodeIdx, gIdx, { gpsSrc: 'gps' }); // §11.3: GPS read → MODE="G"
                      setGpsCapturing(false);
                    }}
                    disabled={gpsCapturing}
                    activeOpacity={0.8}
                  >
                    <LocateFixed size={15} color="#4338CA" />
                    <Text style={styles.captureGpsBtnText}>
                      {gpsCapturing ? t('form234.capturingGps') : t('form234.captureGpsButton')}
                    </Text>
                  </TouchableOpacity>
                )}
                {nodeGroupField(nodeIdx, gIdx, t('form234.latitudeLabel'), 'gpsLat', 'numeric', isFieldRequired('gpsCoords', { subformId, fmaId: nodeFma }),
                  (v: string) => updateNodeGroup(nodeIdx, gIdx, { gpsLat: v, gpsSrc: 'manual' }))}
                {nodeGroupField(nodeIdx, gIdx, t('form234.longitudeLabel'), 'gpsLng', 'numeric', isFieldRequired('gpsCoords', { subformId, fmaId: nodeFma }),
                  (v: string) => updateNodeGroup(nodeIdx, gIdx, { gpsLng: v, gpsSrc: 'manual' }))}
              </>
            )}
          </>
        )}
      </View>
    );
  };

  // One EXTRA fishing effort (UI effort i+2) — the effort-1 block's structure, addressed
  // to extraEffortNodes[i]: licence line, own note, own LFA, gear subtype (NL), its OWN
  // trap groups, its own haul window, the two mandated Y/N questions, its own Close & Save.
  // Always expanded (ruling 7). Closed (ruling 8): greyed, values readable, trash /
  // licence-edit / close gone, "Closed <date time>" banner.
  const renderExtraEffortNode = (e: ExtraEffortNode, i: number) => {
    const nodeClosed = !!e.closeDt;
    const nodeFma = e.fmaId ? Number(e.fmaId) : null;
    const note = e.note ?? '';
    const ddFma = nodeDropdown?.node === i && nodeDropdown.group === -1 && nodeDropdown.kind === 'fma';
    const ddGear = nodeDropdown?.node === i && nodeDropdown.group === -1 && nodeDropdown.kind === 'gearSubtype';
    return (
      <View key={`effort-${i}`} style={styles.effortBlock}>
        <View style={styles.effortBlockHeader}>
          <Text style={styles.effortBlockTitle}>{t('form234.effortNodeTitle', { n: i + 2 })}</Text>
          {/* S136 UI round item 6 (RULED): title + delete only — the note affordance moved
              to the always-visible NOTE field below the questions. */}
          {!readOnly && !nodeClosed && (
            <TouchableOpacity style={[styles.deleteBtn, { marginLeft: 18 }]} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => confirmRemoveEffortNode(i + 1)}>
              <Trash2 size={16} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.licenceLine}>
          {extraLicEditingIdx === i && !nodeClosed ? (
            <>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={e.licNo ?? ''}
                onChangeText={(v: string) => updateEffortNode(i, { licNo: v })}
                placeholder={profileLicence}
                placeholderTextColor="#94A3B8"
                autoFocus
                autoCapitalize="characters"
                onBlur={() => setExtraLicEditingIdx(null)}
              />
              <TouchableOpacity onPress={() => setExtraLicEditingIdx(null)} activeOpacity={0.8} style={{ marginLeft: 14, paddingVertical: 6 }} hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}>
                <Text style={styles.licenceEditText}>{tc('nav.done')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.licenceLineText}>
                {t('form234.effortLicenceLine', { no: e.licNo || profileLicence })}
              </Text>
              {!readOnly && !nodeClosed && (
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      t('form234.effortLicenceEditConfirmTitle'),
                      t('form234.effortLicenceEditConfirmBody'),
                      [
                        { text: tc('nav.cancel'), style: 'cancel' },
                        { text: t('form234.effortLicenceEdit'), onPress: () => setExtraLicEditingIdx(i) },
                      ],
                    );
                  }}
                  activeOpacity={0.8}
                  hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
                  style={{ paddingVertical: 6 }}
                >
                  <Text style={styles.licenceEditText}>{t('form234.effortLicenceEdit')}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
        <View pointerEvents={nodeClosed ? 'none' : 'auto'} style={nodeClosed ? styles.closedBody : undefined}>
          <View style={styles.fieldRow}>
            <Text style={styles.label}>{t('form234.fishingAreaLabel')}{isRequired('fmaId') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => { if (readOnly) return; setNodeDropdown(cur => (cur?.node === i && cur.group === -1 && cur.kind === 'fma') ? null : { node: i, group: -1, kind: 'fma' }); }}
            >
              <Text style={[styles.timeButtonText, !nodeFma && styles.timeButtonPlaceholder]}>
                {nodeFma ? t(`form234.fmaOption_${nodeFma}`, { defaultValue: getDfoFmaList(subformId).find(f => f.codeId === nodeFma)?.label ?? t('form234.selectLfa') }) : t('form234.selectLfa')}
              </Text>
              <ChevronDown size={16} color="#64748B" />
            </TouchableOpacity>
            {ddFma && (
              <View style={styles.dropdownList}>
                {fmaOptions.map(f => (
                  <TouchableOpacity
                    key={f.codeId}
                    style={[styles.dropdownItem, nodeFma === f.codeId && styles.dropdownItemActive]}
                    onPress={() => {
                      // The FMA scopes this effort's grid/section picks — clear them on change
                      setExtraEffortNodes(prev => prev.map((en, j) => j === i
                        ? { ...en, fmaId: String(f.codeId), details: (en.details ?? []).map(gr => ({
                            ...gr, lgridCodeId: '', lgridDisplay: '', gridId: '', gridDisplay: '',
                            statSectId: '', statSectDisplay: '',
                          })) }
                        : en));
                      setNodeDropdown(null);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, nodeFma === f.codeId && styles.dropdownItemTextActive]}>
                      {t(`form234.fmaOption_${f.codeId}`, { defaultValue: f.label })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          {/* S136 UI round item 2 (RULED): the effort's haul times sit directly under its
              LFA picker, above the trap groups — same shape as effort 1. */}
          {isVisible('haulStartTime') && renderTimestampField(t('form234.timeStartedHaulingLabel'), formatDateTimeDisplay(e.haulStartDate ?? '', e.haulStartTime ?? ''), 'extraEffortStart', false, isRequired('haulStartTime'), i, nodeClosed)}
          {isVisible('haulEndTime') && renderTimestampField(t('form234.timeStoppedHaulingLabel'), formatDateTimeDisplay(e.haulEndDate ?? '', e.haulEndTime ?? ''), 'extraEffortEnd', false, isRequired('haulEndTime'), i, nodeClosed)}
          {isVisible('gearSubtypeId') && (
            <View style={styles.fieldRow}>
              <Text style={styles.label}>{t('form234.gearSubtypeLabel')}{isRequired('gearSubtypeId') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => { if (readOnly) return; setNodeDropdown(cur => (cur?.node === i && cur.group === -1 && cur.kind === 'gearSubtype') ? null : { node: i, group: -1, kind: 'gearSubtype' }); }}
              >
                <Text style={[styles.timeButtonText, !e.gearSubtypeId && styles.timeButtonPlaceholder]}>
                  {e.gearSubtypeId ? t(`form234.gearSubtypeOption_${e.gearSubtypeId}`, { defaultValue: DFO_GEAR_SUBTYPE_LIST.find(s => String(s.codeId) === e.gearSubtypeId)?.label ?? t('form234.selectGearSubtype') }) : t('form234.selectGearSubtype')}
                </Text>
                <ChevronDown size={16} color="#64748B" />
              </TouchableOpacity>
              {ddGear && (
                <View style={styles.dropdownList}>
                  {DFO_GEAR_SUBTYPE_LIST.map(s => (
                    <TouchableOpacity
                      key={s.codeId}
                      style={[styles.dropdownItem, e.gearSubtypeId === String(s.codeId) && styles.dropdownItemActive]}
                      onPress={() => { updateEffortNode(i, { gearSubtypeId: String(s.codeId) }); setNodeDropdown(null); }}
                    >
                      <Text style={[styles.dropdownItemText, e.gearSubtypeId === String(s.codeId) && styles.dropdownItemTextActive]}>
                        {t(`form234.gearSubtypeOption_${s.codeId}`, { defaultValue: s.label })}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
          {(e.details ?? []).map((g, j) => renderNodeGroup(i, g, j, nodeFma, nodeClosed))}
          {!readOnly && !nodeClosed && (
            <TouchableOpacity style={[styles.addBtn, { marginTop: 4 }]} onPress={() => addNodeGroup(i)}>
              <Plus size={16} color="#1E3A8A" />
              <Text style={styles.addBtnText}>{t('form234.addCatchEffort')}</Text>
            </TouchableOpacity>
          )}
          <View style={{ height: 14 }} />
          {renderYesNoToggle(t('form234.sarIndLabel'), e.sarYes === 'true' ? true : (e.sarYes === 'false' ? false : null), (v: boolean) => handleNodeSarYes(i, v), false, isRequired('sarInd'))}
          {renderYesNoToggle(t('form234.mmInterIndLabel'), e.mmYes === 'true' ? true : (e.mmYes === 'false' ? false : null), (v: boolean) => handleNodeMmYes(i, v), false, isRequired('mmInterInd'))}
          {/* S136 UI round item 6 (RULED): the always-visible one-line NOTE field below the
              questions (the bycatch-sheet shape); hidden only when closed AND empty. */}
          {!(nodeClosed && !note.trim()) && (
            <View style={styles.fieldRow}>
              <Text style={styles.label}>{t('form234.effortNoteLabel')}</Text>
              <TextInput
                style={[styles.input, readOnly && styles.inputReadOnly]}
                value={note}
                onChangeText={(v: string) => updateEffortNode(i, { note: v })}
                placeholder={t('form234.effortNotePlaceholder')}
                placeholderTextColor="#94A3B8"
                maxLength={2000}
                editable={!readOnly && !nodeClosed}
              />
            </View>
          )}
        </View>
        {nodeClosed ? (
          <View style={styles.closedBanner}>
            <Lock size={14} color="#64748B" />
            <Text style={styles.closedBannerText}>{t('form234.closedAtLabel', { time: formatClose(e.closeDt) })}</Text>
          </View>
        ) : !readOnly && (
          <TouchableOpacity style={styles.closeSectionBtn} onPress={() => closeEffortNodeAt(i)} activeOpacity={0.8}>
            <Lock size={16} color="#B45309" />
            <Text style={styles.closeSectionBtnText}>{t('form234.closeEffortButton')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Collapsed one-line summary — S121 STOP-1a ruled format: "Grid 1589 — 420 lbs — 225 hauls".
  // Regions without a grid drop that segment; NL leads with its Statistical Section.
  //
  // S154B: the close stamp and unit tag are now PARAMETERS, and they are REQUIRED.
  // They used to be read from inside here as `isClosed('dgCloseEffort')` and
  // `closeUnits.dgCloseEffortUnit` — effort 1's stamps. That is right for the two effort-1
  // callers and WRONG for the third, which summarises a trap group of an effort 2+ NODE, whose
  // close state and unit are its own. Reading effort 1 from inside a shared helper is what made
  // one caller silently wrong, so nothing is inherited any more: each caller names its own.
  //
  // ⚠ REQUIRED, not optional — deliberately different from the S153B/S154B `valueOverride`
  // shape. There, the parameter is optional because ~20 unrelated callers must not be forced to
  // reason about a weight they do not draw (R2). Here there are exactly THREE callers and the
  // failure mode IS forgetting, so the compiler is made to ask. An optional parameter defaulting
  // to effort 1's stamps would leave this same defect one new call site away.
  const extraSummary = (e: ExtraEffortDetail, isGroupClosed: boolean, closeTag?: string): string => {
    const parts: string[] = [];
    if (subformId === 90 && e.lgridDisplay) parts.push(t('form234.summaryLgrid', { g: e.lgridDisplay }));
    if (subformId === 88 && e.gridDisplay) parts.push(t('form234.summaryGrid', { g: e.gridDisplay }));
    if (subformId === 91 && e.statSectDisplay) parts.push(e.statSectDisplay);
    if (e.catchWeight?.trim()) parts.push(wSuffix(e.catchWeight.trim(), isGroupClosed, closeTag));
    if (e.trapHauls?.trim()) parts.push(t('form234.haulsSuffix', { n: e.trapHauls.trim() }));
    return parts.length > 0 ? parts.join(' — ') : t('form234.effortBlockEmpty');
  };

  // S154B: same `valueOverride` as nodeGroupField and extraSarInput, for the same reason —
  // the helper takes a KEY, so a closed weight cannot be back-converted without it.
  const extraField = (
    idx: number, label: string, key: keyof ExtraEffortDetail,
    keyboardType: any = 'numeric', isReq: boolean = false,
    onChange?: (v: string) => void,
    valueOverride?: string
  ) => (
    <View style={styles.fieldRow}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}{isReq && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
      </View>
      <TextInput
        style={[styles.input, readOnly && styles.inputReadOnly]}
        value={valueOverride ?? ((extraEfforts[idx]?.[key] as string) ?? '')}
        onChangeText={onChange ?? ((v: string) => updateExtra(idx, { [key]: v }))}
        placeholder="0"
        placeholderTextColor="#94A3B8"
        editable={!readOnly}
        keyboardType={keyboardType}
      />
    </View>
  );

  // One additional catch-effort block — region-aware per the S121 STOP-1b ruling (full XSD
  // EFFORT_DETAIL/CATCH field set per block): MAR grid (+38b GPS/broodstock), QC grid + soak
  // + GPS + v-notch, GLF soak + GPS, NL soak + trap size + specimens kept + stat section.
  const renderExtraEffortBlock = (e: ExtraEffortDetail, i: number) => {
    const collapsed = !!extraCollapsed[i];
    // S136 UI round item 1 (Rule 3059 conformance): the ONE single-sourced entry gate.
    const showBlockCoords = effortCoordsEntryAllowed(subformId, fmaId);
    return (
      <View key={i} style={styles.trapGroupBlock}>
        <View style={styles.effortBlockHeader}>
          <Text style={styles.effortBlockTitle}>{t('form234.catchEffortBlock', { n: i + 2 })}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {!readOnly && !isClosed('dgCloseEffort') && (
              <TouchableOpacity style={styles.deleteBtn} onPress={() => removeExtraEffort(i)}>
                <Trash2 size={16} color="#EF4444" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.deleteBtn} onPress={() => setExtraCollapsed(prev => ({ ...prev, [i]: !collapsed }))}>
              {collapsed ? <ChevronDown size={18} color="#64748B" /> : <ChevronUp size={18} color="#64748B" />}
            </TouchableOpacity>
          </View>
        </View>
        {collapsed ? (
          <TouchableOpacity onPress={() => setExtraCollapsed(prev => ({ ...prev, [i]: false }))}>
            {/* S154B — CORRECT TODAY, AND UNCHANGED. This is a trap group of EFFORT 1, so
                effort 1's stamps are the right ones. The two expressions below are the exact
                text that used to sit inside extraSummary; they moved out to the call site, they
                did not change. Behaviour here is identical before and after. */}
            <Text style={styles.effortBlockSummary} numberOfLines={1}>{extraSummary(e, isClosed('dgCloseEffort'), closeUnits.dgCloseEffortUnit)}</Text>
          </TouchableOpacity>
        ) : (
          <>
            {/* MAR settlement grid — same list/gate as block 1; star from the table (Rule 619) */}
            {subformId === 90 && fmaId !== null && (DFO_LGRID_BY_FMA[fmaId] ?? []).length > 0 && (
              <View style={styles.fieldRow}>
                <Text style={styles.label}>{t('form234.lgridLabel')}{isRequired('lgridCodeId') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => { if (readOnly) return; setExtraDropdown(cur => (cur?.idx === i && cur.kind === 'lgrid') ? null : { idx: i, kind: 'lgrid' }); }}
                >
                  <Text style={[styles.timeButtonText, !e.lgridDisplay && styles.timeButtonPlaceholder]}>
                    {e.lgridDisplay || t('form234.selectGrid')}
                  </Text>
                  <ChevronDown size={16} color="#64748B" />
                </TouchableOpacity>
                {extraDropdown?.idx === i && extraDropdown.kind === 'lgrid' && (
                  <View style={[styles.dropdownList, { maxHeight: 200 }]}>
                    <ScrollView nestedScrollEnabled>
                      {(DFO_LGRID_BY_FMA[fmaId] ?? []).map(g => (
                        <TouchableOpacity
                          key={g.codeId}
                          style={[styles.dropdownItem, e.lgridCodeId === String(g.codeId) && styles.dropdownItemActive]}
                          onPress={() => { updateExtra(i, { lgridCodeId: String(g.codeId), lgridDisplay: String(g.display) }); setExtraDropdown(null); }}
                        >
                          <Text style={[styles.dropdownItemText, e.lgridCodeId === String(g.codeId) && styles.dropdownItemTextActive]}>
                            {g.display}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
            {/* QC grid — reuses the block-1 search Modal via gridPickerTarget */}
            {subformId === 88 && fmaId !== null && fmaId in DFO_FMA_GRID_MAP && (
              <View style={styles.fieldRow}>
                <Text style={styles.label}>{t('form234.gridLabel')}{isRequired('gridId') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => { if (readOnly) return; setGridSearch(''); setGridPickerNodeTarget(null); setGridPickerTarget(i); setGridPickerOpen(true); }}
                >
                  <Text style={[styles.timeButtonText, !e.gridDisplay && styles.timeButtonPlaceholder]}>
                    {e.gridDisplay || t('form234.selectQcGrid')}
                  </Text>
                  <ChevronDown size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
            )}
            {/* NL statistical section — same FMA gate as block 1 */}
            {subformId === 91 && fmaId !== null && DFO_FMA_STAT_SECT_REQUIRED.has(fmaId) && (
              <View style={styles.fieldRow}>
                <Text style={styles.label}>{t('form234.statSectLabel')}{isRequired('statSectId') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => { if (readOnly) return; setExtraDropdown(cur => (cur?.idx === i && cur.kind === 'statSect') ? null : { idx: i, kind: 'statSect' }); }}
                >
                  <Text style={[styles.timeButtonText, !e.statSectDisplay && styles.timeButtonPlaceholder]}>
                    {e.statSectDisplay || t('form234.selectStatSect')}
                  </Text>
                  <ChevronDown size={16} color="#64748B" />
                </TouchableOpacity>
                {extraDropdown?.idx === i && extraDropdown.kind === 'statSect' && (
                  <View style={[styles.dropdownList, { maxHeight: 200 }]}>
                    <ScrollView nestedScrollEnabled>
                      {(DFO_STAT_SECT_BY_FMA[fmaId] ?? []).map(r => {
                        const label = i18n.language.startsWith('fr') ? r.statSectDescFr : r.statSectDescEn;
                        return (
                          <TouchableOpacity
                            key={r.statSectCodeId}
                            style={[styles.dropdownItem, e.statSectId === String(r.statSectCodeId) && styles.dropdownItemActive]}
                            onPress={() => { updateExtra(i, { statSectId: String(r.statSectCodeId), statSectDisplay: label }); setExtraDropdown(null); }}
                          >
                            <Text style={[styles.dropdownItemText, e.statSectId === String(r.statSectCodeId) && styles.dropdownItemTextActive]}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
            {/* S154B: the VALUE now takes the same closed-flag and tag as the LABEL, the way
                group 1 of this same effort already did at the renderField site. Effort 1's
                groups close together (sealEffort1Weights), so the flat dgCloseEffort stamp
                is the right one here — unlike a node, which carries its own. */}
            {extraField(i, wLabel('form234.catchWeightLabel', isClosed('dgCloseEffort'), closeUnits.dgCloseEffortUnit), 'catchWeight', 'numeric', isRequired('catchWeight'), undefined,
              showWeight(extraEfforts[i]?.catchWeight ?? '', isClosed('dgCloseEffort'), closeUnits.dgCloseEffortUnit))}
            {extraField(i, t('form234.trapHaulsLabel'), 'trapHauls', 'numeric', isRequired('trapHauls'))}
            {/* SOAKED_DUR: blocked for MAR(90); per-EFFORT_DETAIL for 88/89/91 */}
            {subformId !== 90 &&
              extraField(i, t('form234.soakDurationLabel'), 'soakDuration', 'decimal-pad', isRequired('soakDuration'))}
            {/* NB_VNTCH: Rule 624's 28-FMA list (QC). NB_VNTCH_YOU: Rule 625's 47 — the same 28
                plus 19 NL FMAs where it is OPTIONAL (shown, unstarred). Both gated by FMA alone. */}
            {subformId === 88 && fmaId != null && DFO_FMA_NB_VNTCH.has(fmaId) &&
              extraField(i, t('form234.nbVntchLabel'), 'vNotchCount', 'numeric', isRequired('vNotchCount'))}
            {fmaId != null && DFO_FMA_NB_VNTCH_YOU.has(fmaId) &&
              extraField(i, t('form234.nbVntchYouLabel'), 'nbVntchYou', 'numeric', isRequired('nbVntchYou'))}
            {/* NL: specimens kept + trap size */}
            {subformId === 91 &&
              extraField(i, t('form234.nbSpcmnKeptLabel'), 'nbSpcmnKept', 'numeric', isRequired('nbSpcmnKept'))}
            {/* NB_SPCMN_DISC — same config gate as group 1, so the region test lives in ONE place */}
            {isVisible('nbSpcmnDisc') &&
              extraField(i, t('form234.nbSpcmnDiscLabel'), 'nbSpcmnDisc', 'numeric', isRequired('nbSpcmnDisc'))}
            {subformId === 91 && (
              <View style={styles.fieldRow}>
                <Text style={styles.label}>{t('form234.trapSizeLabel')}{isRequired('trapSize') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => { if (readOnly) return; setExtraDropdown(cur => (cur?.idx === i && cur.kind === 'trapSize') ? null : { idx: i, kind: 'trapSize' }); }}
                >
                  <Text style={[styles.timeButtonText, !e.trapSize && styles.timeButtonPlaceholder]}>
                    {e.trapSize ? t(`form234.trapSizeOption_${e.trapSize}`, { defaultValue: DFO_TRAP_SIZE_LIST.find(s => String(s.codeId) === e.trapSize)?.label ?? t('form234.selectTrapSize') }) : t('form234.selectTrapSize')}
                  </Text>
                  <ChevronDown size={16} color="#64748B" />
                </TouchableOpacity>
                {extraDropdown?.idx === i && extraDropdown.kind === 'trapSize' && (
                  <View style={styles.dropdownList}>
                    {DFO_TRAP_SIZE_LIST.map(s => (
                      <TouchableOpacity
                        key={s.codeId}
                        style={[styles.dropdownItem, e.trapSize === String(s.codeId) && styles.dropdownItemActive]}
                        onPress={() => { updateExtra(i, { trapSize: String(s.codeId) }); setExtraDropdown(null); }}
                      >
                        <Text style={[styles.dropdownItemText, e.trapSize === String(s.codeId) && styles.dropdownItemTextActive]}>
                          {t(`form234.trapSizeOption_${s.codeId}`, { defaultValue: s.label })}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
            {/* MAR 38b: broodstock count per CATCH (Rule 654) */}
            {subformId === 90 && fmaId === DFO_FMA_38B &&
              extraField(i, t('form234.nbSpcmnBrdLabel'), 'nbSpcmnBrd', 'numeric', isRequired('nbSpcmnBrd'))}
            {/* Per-block GPS — QC/GLF mandatory (rows 82/83); MAR 38b (Rule 3059); NL blocked */}
            {showBlockCoords && (
              <>
                {!readOnly && (
                  <TouchableOpacity
                    style={styles.captureGpsBtn}
                    onPress={async () => {
                      setGpsCapturing(true);
                      // S140 P2 defect 48: 'gps' only on success.
                      const ok = await captureGps(
                        (v: string) => updateExtra(i, { gpsLat: v }),
                        (v: string) => updateExtra(i, { gpsLng: v }),
                        { alertOnFail: true }
                      );
                      if (ok) updateExtra(i, { gpsSrc: 'gps' }); // §11.3: GPS-read coordinates → MODE="G"
                      setGpsCapturing(false);
                    }}
                    disabled={gpsCapturing}
                    activeOpacity={0.8}
                  >
                    <LocateFixed size={15} color="#4338CA" />
                    <Text style={styles.captureGpsBtnText}>
                      {gpsCapturing ? t('form234.capturingGps') : t('form234.captureGpsButton')}
                    </Text>
                  </TouchableOpacity>
                )}
                {extraField(i, t('form234.latitudeLabel'), 'gpsLat', 'numeric', isRequired('gpsCoords'),
                  (v: string) => updateExtra(i, { gpsLat: v, gpsSrc: 'manual' }))}
                {extraField(i, t('form234.longitudeLabel'), 'gpsLng', 'numeric', isRequired('gpsCoords'),
                  (v: string) => updateExtra(i, { gpsLng: v, gpsSrc: 'manual' }))}
              </>
            )}
          </>
        )}
      </View>
    );
  };

  // ── S121 multi-SAR helpers ──────────────────────────────────────────────────────────
  const updateExtraSar = (idx: number, patch: Partial<ExtraSarDetail>) => {
    setExtraSars(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const addExtraSar = () => {
    // S138: mirror handleSarYes — the block is born BLANK (no date/time/coords) and the
    // shared capture prompt below decides whether to stamp+capture (Yes) or leave it
    // for hand entry (No). gpsSrc starts 'manual' and only a successful fix flips it.
    const idx = extraSars.length;
    const newBlock: ExtraSarDetail = { gpsSrc: 'manual' };
    // S135 adopt-on-add (the bait pattern above): a NEW block must never inherit a close
    // through the legacy card-stamp fallback. If this log still carries a pre-S135
    // dgCloseSar, copy that stamp AND the shared rem.sar note onto every block lacking its
    // own — block 1 (flat keys) included; same values → identical emitted bytes — then
    // drop the card key so the new block joins genuinely OPEN. This is the one
    // value-preserving rewrite, triggered only by the harvester's own add; an untouched
    // legacy log is never rewritten. (The note is copied verbatim: rem.sar is locked while
    // the card is closed, so state equals the stored bytes.)
    const legacyCardStamp = closes['dgCloseSar'];
    if (legacyCardStamp) {
      const sharedNote = remarks.sar ?? '';
      if (!sarCloseDt) setSarCloseDt(legacyCardStamp);
      if (!sarNote && sharedNote) setSarNote(sharedNote);
      const adopted = extraSars.map(s => (s.closeDt ? s : {
        ...s, closeDt: legacyCardStamp, ...(s.note || !sharedNote ? {} : { note: sharedNote }),
      }));
      setExtraSars([...adopted, newBlock]);
      setCloses(prev => { const { dgCloseSar: _dropped, ...rest } = prev; return rest; });
      // S135 ruling 7: the shared note is CLEARED once copied — the existing blocks now own
      // their copies (identical bytes), and without this the new block would silently inherit
      // the legacy note through the emit's rem.sar fallback instead of starting blank.
      if (sharedNote) setRemarks(prev => ({ ...prev, sar: '' }));
    } else {
      setExtraSars(prev => [...prev, newBlock]);
    }
    // S138: no mandated prompt here (the SAR indicator is already Y when a block can be
    // added), so the capture popup fires directly — same shared routine as block 1.
    promptSarCapture({
      setDateTime: (date, time) => updateExtraSar(idx, { date, time }),
      setLat: (v: string) => updateExtraSar(idx, { lat: v }),
      setLng: (v: string) => updateExtraSar(idx, { lng: v }),
      setGpsSrc: (src) => updateExtraSar(idx, { gpsSrc: src }),
    });
  };

  const removeExtraSar = (idx: number) => {
    setExtraSars(prev => prev.filter((_, i) => i !== idx));
    if (extraSarDropdown?.idx === idx) setExtraSarDropdown(null);
  };

  // S135 Phase 2 (ruling 3): deleting a block by UI index (0 = block 1). Deleting block 1
  // SLIDES BLOCK 2 UP into the flat keys — every field travels, closeDt and note included,
  // so a slid CLOSED block stays closed and transmits identical bytes (sarBlocksFromData
  // maps the flat keys onto the same ExtraSarDetail shape the array item had). Only OPEN
  // blocks are deletable (a closed block's trash icon is hidden), so a closed block can
  // move up, never die. Deleting the LAST block clears block 1's fields; the empty titled
  // block stays while the toggle is Yes, and the SAR save gate keeps an empty first record
  // from ever completing/transmitting.
  const removeSarBlock = (uiIdx: number) => {
    // S160 Phase 4: a CLOSED SAR block can never be removed — structural, not render-only.
    // The target is block 1's flat stamp for uiIdx 0, else the extraSars block's own; the
    // legacy card-level dgCloseSar closes every block at once. (Removing an OPEN block 1
    // stays legal even when a closed block 2+ gets promoted into the flat keys — the stamp
    // travels with it below, so nothing closed is destroyed.)
    const sarTarget = uiIdx === 0 ? { closeDt: sarCloseDt || undefined } : extraSars[uiIdx - 1];
    if (closedRowActionRefused(sarTarget, closes['dgCloseSar'])) return;
    setSarNoteOpen({}); // indexes shift — collapse empty note editors (content-bearing notes stay visible)
    if (uiIdx === 0) {
      if (extraSars.length > 0) {
        const [first, ...rest] = extraSars;
        setSarSpecies(first.species ?? '');
        setSarSpeciesOther(first.speciesOther ?? '');
        setSarWhat(first.what ?? '');
        setSarLat(first.lat ?? ''); setSarLng(first.lng ?? '');
        setSarDate(first.date ?? ''); setSarTime(first.time ?? '');
        setSarNbSpcmn(first.nbSpcmn ?? ''); setSarCondId(first.condId ?? '');
        setSarGpsSrc(first.gpsSrc === 'gps' ? 'gps' : 'manual');
        setSarCloseDt(first.closeDt ?? ''); setSarNote(first.note ?? '');
        setExtraSars(rest);
      } else {
        setSarSpecies(''); setSarSpeciesOther(''); setSarWhat('');
        setSarLat(''); setSarLng(''); setSarDate(''); setSarTime('');
        setSarNbSpcmn(''); setSarCondId(''); setSarGpsSrc('manual');
        setSarCloseDt(''); setSarNote('');
      }
      setSarDropdownOpen(false); setSarCondPickerOpen(false); setExtraSarDropdown(null);
    } else {
      removeExtraSar(uiIdx - 1);
    }
  };

  // S153B: `valueOverride` lets a caller show something other than the raw stored string —
  // needed by SAR.WT, because a CLOSED block stores kilograms (R1) but must read back in the
  // unit it was closed in (R2 + Option 2). Every other call site omits it and is unchanged.
  const extraSarInput = (
    idx: number, label: string, key: keyof ExtraSarDetail,
    placeholder: string, keyboardType: any = 'default', isReq: boolean = false,
    onChange?: (v: string) => void,
    valueOverride?: string
  ) => (
    <View style={styles.fieldRow}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}{isReq && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
      </View>
      <TextInput
        style={[styles.input, readOnly && styles.inputReadOnly]}
        value={valueOverride ?? ((extraSars[idx]?.[key] as string) ?? '')}
        onChangeText={onChange ?? ((v: string) => updateExtraSar(idx, { [key]: v }))}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        editable={!readOnly}
        keyboardType={keyboardType}
      />
    </View>
  );

  // ── S135 Phase 2: the uniform per-block SAR chrome (ruling 2) ──────────────────────────
  // One frame for EVERY block — block 1 (flat keys) and blocks 2+ (extraSars) read
  // identically on screen: numbered title, trash + note button in the header while OPEN;
  // greyed frozen body, read-only note and the closedAtLabel lock bar while CLOSED (a
  // closed block loses trash, note and close buttons — ruling: its note stays VISIBLE).
  // The [ Close & Save ] control sits ON the block: these are inline sub-forms, no Edit sheet.
  const renderSarBlockChrome = (
    uiIdx: number,
    note: string,
    onNoteChange: (v: string) => void,
    closedStamp: string | undefined,
    onDelete: () => void,
    onCloseBlock: () => void,
    children: React.ReactNode,
  ) => {
    const closed = !!closedStamp;
    const showNote = closed ? !!note.trim() : (sarNoteOpen[uiIdx] || !!note.trim());
    return (
      <View key={`sar-${uiIdx}`} style={[styles.incidentBlock, { marginTop: 10 }, closed && styles.closedBody]}>
        <View style={styles.effortBlockHeader}>
          <Text style={styles.effortBlockTitle}>{t('form234.sarBlockTitle', { n: uiIdx + 1 })}</Text>
          {!readOnly && !closed && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                style={styles.addNoteBtn}
                onPress={() => setSarNoteOpen(prev => ({ ...prev, [uiIdx]: !prev[uiIdx] }))}
                activeOpacity={0.7}
              >
                <StickyNote size={13} color="#1E3A8A" />
                <Text style={styles.addNoteBtnText}>{t('form234.addNote')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
                <Trash2 size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View pointerEvents={closed ? 'none' : 'auto'}>
          {children}
        </View>
        {showNote && (
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={onNoteChange}
            placeholder={t('form234.notePlaceholder')}
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={2000}
            editable={!readOnly && !closed}
          />
        )}
        {closed ? (
          <View style={styles.closedBanner}>
            <Lock size={14} color="#64748B" />
            <Text style={styles.closedBannerText}>{t('form234.closedAtLabel', { time: formatClose(closedStamp) })}</Text>
          </View>
        ) : !readOnly && (
          <View style={styles.baitRowActions}>
            <TouchableOpacity style={styles.baitRowCloseBtn} onPress={onCloseBlock} activeOpacity={0.8}>
              <Lock size={14} color="#B45309" />
              <Text style={styles.baitRowCloseText}>{t('form234.sarBlockClose')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // One additional SAR encounter — mirrors the block-1 field set (species / description /
  // date+time / coords / count / condition). Date and time are stamped by the shared
  // capture prompt's Yes (S138), or left blank for hand entry on No. S135: the frame
  // (title / trash / note / close / lock bar) comes from the shared chrome; UI index i+1.
  const renderExtraSarBlock = (s: ExtraSarDetail, i: number) => renderSarBlockChrome(
    i + 1,
    s.note ?? '',
    (v: string) => updateExtraSar(i, { note: v }),
    sarBlockClosedStamp(s),
    () => removeSarBlock(i + 1),
    () => closeSarBlock(i + 1),
    <>
      <Text style={styles.label}>{t('form234.speciesLabel')}{isRequired('sarSpecies') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
      <TouchableOpacity
        style={styles.dropdownBtn}
        onPress={() => { if (readOnly) return; setExtraSarDropdown(cur => (cur?.idx === i && cur.kind === 'species') ? null : { idx: i, kind: 'species' }); }}
      >
        <Text style={[styles.dropdownBtnText, !s.species && styles.dropdownPlaceholder]}>
          {s.species
            ? (refDesc(MV_SAR_LIST.find(o => String(o.codeId) === s.species), isFr) ?? t('form234.selectSpecies'))
            : t('form234.selectSpecies')}
        </Text>
        <ChevronDown size={16} color="#64748B" />
      </TouchableOpacity>
      {extraSarDropdown?.idx === i && extraSarDropdown.kind === 'species' && (
        <View style={styles.dropdownList}>
          {/* S159 (P3, Rule 7): options from the six-species whitelist; the DISPLAY of a
              stored value (above) keeps resolving from the whole reftable, so a legacy
              off-list species still renders its proper name. */}
          {DFO_SAR_SPECIES_OFFERED.map(o => (
            <TouchableOpacity
              key={o.codeId}
              style={[styles.dropdownItem, s.species === String(o.codeId) && styles.dropdownItemActive]}
              onPress={() => { updateExtraSar(i, { species: String(o.codeId) }); setExtraSarDropdown(null); }}
            >
              <Text style={[styles.dropdownItemText, s.species === String(o.codeId) && styles.dropdownItemTextActive]}>
                {refDesc(o, isFr)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={{ height: 10 }} />
      {extraSarInput(i, t('form234.whatHappenedLabel'), 'what', t('form234.describeInteraction'))}
      {/* S135 Phase 4 (ruling 6): ONE combined Date & Time field opening the wheel picker —
          the exact block-1 shape (same label key, asterisk and display format). Stored
          slots (date/time strings) and the SAR_DT emit are unchanged. */}
      {renderTimestampField(
        t('form234.dateTimeLabel'),
        s.date && s.time ? `${s.date} ${s.time}` : '',
        'extraSarTime', false, isRequired('sarDateTime'), i, !!s.closeDt || isClosed('dgCloseSar'),
      )}
      <Text style={styles.label}>{t('form234.gpsLocationLabel')}{isRequired('sarGps') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
      <View style={styles.gpsRow}>
        <TextInput
          style={[styles.input, { flex: 1 }, readOnly && styles.inputReadOnly]}
          value={s.lat ?? ''}
          onChangeText={(v: string) => updateExtraSar(i, { lat: v, gpsSrc: 'manual' })}
          placeholder={t('form234.latPlaceholder')}
          placeholderTextColor="#94A3B8"
          editable={!readOnly}
          keyboardType="numeric"
        />
        <View style={{ width: 8 }} />
        <TextInput
          style={[styles.input, { flex: 1 }, readOnly && styles.inputReadOnly]}
          value={s.lng ?? ''}
          onChangeText={(v: string) => updateExtraSar(i, { lng: v, gpsSrc: 'manual' })}
          placeholder={t('form234.lngPlaceholder')}
          placeholderTextColor="#94A3B8"
          editable={!readOnly}
          keyboardType="numeric"
        />
      </View>
      {extraSarInput(i, t('form234.sarNbSpcmnLabel'), 'nbSpcmn', '0', 'numeric', isRequired('sarNbSpcmn'))}
      {/* S153B: SAR.WT on blocks 2+ — same slot, same optional-and-unmarked rule as block 1,
          reading THIS block's own closeUnit tag (blocks may carry different units — R4).
          A closed block stores kilograms and is shown back in the unit it was closed in
          (R2, Option 2), which is what the value override is for. */}
      {extraSarInput(i, wLabel('form234.sarWtLabel', !!sarBlockClosedStamp(s), s.closeUnit),
        'wt', '0', 'numeric', isRequired('sarWt'), undefined,
        showWeight(s.wt ?? '', !!sarBlockClosedStamp(s), s.closeUnit))}
      <View style={styles.fieldRow}>
        <Text style={styles.label}>{t('form234.sarCondLabel')}{isRequired('sarCondId') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
        <TouchableOpacity
          style={styles.timeButton}
          onPress={() => { if (readOnly) return; setExtraSarDropdown(cur => (cur?.idx === i && cur.kind === 'cond') ? null : { idx: i, kind: 'cond' }); }}
        >
          <Text style={[styles.timeButtonText, !s.condId && styles.timeButtonPlaceholder]}>
            {s.condId ? (refDesc(MV_SPECIMENS_CONDITION.find(c => String(c.codeId) === s.condId), isFr) ?? t('form234.sarCondPlaceholder')) : t('form234.sarCondPlaceholder')}
          </Text>
          <ChevronDown size={16} color="#64748B" />
        </TouchableOpacity>
        {extraSarDropdown?.idx === i && extraSarDropdown.kind === 'cond' && (
          <View style={styles.dropdownList}>
            {MV_SPECIMENS_CONDITION.map(c => (
              <TouchableOpacity
                key={c.codeId}
                style={[styles.dropdownItem, s.condId === String(c.codeId) && styles.dropdownItemActive]}
                onPress={() => { updateExtraSar(i, { condId: String(c.codeId) }); setExtraSarDropdown(null); }}
              >
                <Text style={[styles.dropdownItemText, s.condId === String(c.codeId) && styles.dropdownItemTextActive]}>
                  {refDesc(c, isFr)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </>,
  );

  // ── S124 Phase 3: data-group closure (Close & Save Section) ──────────────────────────────
  // --- S153 Phase 2: convert-at-close plumbing ---
  // R1 says the conversion uses "the toggle's CURRENT value", and the toggle lives on the free
  // app's Settings screen — a harvester can flip it while this form is open. So the unit is
  // read from the profile AT THE MOMENT OF CLOSE, not from the value cached at mount.
  const currentWeightUnit = async (): Promise<WeightUnit> => {
    const p = await loadCaptainProfile();
    return p.units === 'kg' ? 'kg' : 'lbs';
  };
  // The per-group conversion itself is PURE and lives in dfoLogStorage (sealBaitRowWeights,
  // sealBycatchRowWeights, sealEffort1Weights, sealEffortNodeWeights, and the three scalar
  // sealers) — the same shape the close STAMP helpers already use, so each group's conversion
  // is independently testable and independently mutable. This component only wires them.
  // --- S153 Phase 5: units on screen ---
  // ONE rule, applied everywhere a weight is shown or labelled:
  //   closed -> the unit it was CLOSED in (its tag). Frozen; the toggle cannot move it (R2).
  //   open   -> the unit currently selected (R3).
  const fieldUnit = (isFieldClosed: boolean, tag?: string): WeightUnit =>
    (isFieldClosed ? closedWeightUnit(tag) : unitPref);
  // What to SHOW. A closed section stores kilograms (R1) and must read back in its own unit
  // (Option 2), so it converts; an open section already holds what he typed, in the unit he
  // typed it in (ruling A), so it is shown untouched.
  const showWeight = (stored: string, isFieldClosed: boolean, tag?: string): string =>
    (isFieldClosed ? weightFromKg(stored, closedWeightUnit(tag)) : stored);
  // A field label with its unit appended — "ESTIMATED KEPT WEIGHT (LBS)". The bracket style
  // lives in the locale file, not here, so a language can punctuate it its own way.
  const unitWord = (u: WeightUnit) => t(u === 'kg' ? 'form234.unitShort_kg' : 'form234.unitShort_lbs');
  const wLabel = (labelKey: string, isFieldClosed: boolean, tag?: string): string =>
    t('form234.labelWithUnit', { label: t(labelKey), unit: unitWord(fieldUnit(isFieldClosed, tag)) });
  // The row-summary suffix ("50 lbs"), same rule.
  const wSuffix = (stored: string, isFieldClosed: boolean, tag?: string): string => {
    const u = fieldUnit(isFieldClosed, tag);
    return t('form234.lbsSuffix', {
      lbs: showWeight(stored, isFieldClosed, tag),
      unit: t(u === 'kg' ? 'form234.unitLower_kg' : 'form234.unitLower_lbs'),
    });
  };
  const isClosed = (k: string) => !!closes[k];
  // S134: a bait ROW is closed by its own stamp OR by the card-level close-all (the row's
  // stamp wins at emit; the card stamp is the fallback — the SAR pattern).
  const baitRowClosed = (e: BaitEntry) => !!(e.closeDt || closes['dgCloseBaitUsed']);
  // S134 Phase 3: same rule for bycatch rows (legacy dgClosePconsBycatch = fallback only).
  const bycatchRowClosed = (e: BycatchEntry) => !!(e.closeDt || closes['dgClosePconsBycatch']);
  // S135 Phase 2: same rule per SAR block — its own stamp, else the legacy card stamp.
  // Returns the stamp itself so the lock bar can show the right time.
  const sarBlockClosedStamp = (b: ExtraSarDetail): string | undefined =>
    b.closeDt || closes['dgCloseSar'] || undefined;
  // Live-state adapter in the stored-data shape, so the UI reads the block list through the
  // SAME sarBlocksFromData reader as the emit and the send guard (they cannot disagree).
  const liveSarData = (): Record<string, string | undefined> => ({
    sarSpecies, sarLat, sarLng, sarGpsSrc, sarDate, sarTime, sarNbSpcmn, sarCondId,
    sarWt,
    ...(sarCloseDt ? { sarCloseDt } : {}),
    ...(sarNote ? { sarNote } : {}),
    ...(sarCloseUnit ? { sarCloseUnit } : {}),
    ...(closes['dgCloseSar'] ? { dgCloseSar: closes['dgCloseSar'] } : {}),
    ...(extraSars.length > 0 ? { extraSars: JSON.stringify(extraSars) } : {}),
  });
  // Thin sarYes gate over the single-sourced dfoLogStorage predicate (tested there).
  // (sarAnyBlockClosed removed S136 P4 extraction — the toggle refusals now call
  // sarNoToggleRefused, which reads sarBlocksAnyClosed itself.)
  const sarAnyBlockOpen = (): boolean => sarYes === true && sarBlocksAnyOpen(liveSarData());
  // S136 P4 extraction: the live data-map view the EFFORT-level predicates read — the SAR
  // keys (they feed sarNoToggleRefused via sarBlocksAnyClosed) plus effort 1's flags and
  // the extra effort nodes, matching what buildLogData would write.
  const liveEffortData = (): Record<string, string | undefined> => ({
    ...liveSarData(),
    ...(sarYes !== null ? { sarYes: String(sarYes) } : {}),
    // S137: effort 1's FMA rides along so the hail predicates (fishesHailArea/fishes38b)
    // see every effort's area — the extras already travel in extraEffortNodes below.
    ...(fmaId != null ? { fmaId: String(fmaId) } : {}),
    ...(closes['dgCloseEffort'] ? { dgCloseEffort: closes['dgCloseEffort'] } : {}),
    ...(extraEffortNodes.length > 0 ? { extraEffortNodes: JSON.stringify(extraEffortNodes) } : {}),
  });
  // S137 (Rules 2024/2025): the hail sections are REQUIRED — and rendered — when ANY effort
  // fishes 38b or 41; blocked (hidden) otherwise. Single-sourced predicate, recomputed per
  // render so an area change on any effort updates the sections immediately.
  const hailRequired = fishesHailArea(liveEffortData());
  // S137 Phase B (Rules 660/661, STOP-4 rule-exact ruling): ETA and total weight are
  // mandatory when any effort fishes 38b, and their ENTRY is blocked otherwise — on a
  // 41-only log the two fields do not render inside the (still required) hail section.
  // Both-areas-on-one-trip does not occur in reality (founder ruling — separate fisheries);
  // if it ever appears in data, the existential predicate lands it on the 38b arm, which
  // asks for MORE rather than less. Defensive branch, not a supported case.
  const hail38b = fishes38b(liveEffortData());

  // S137 Phase C: ONE renderer for both company pickers (Rule 27 = 11 rows, Rule 93 = 4).
  // Rows display FR where the fence differs (only 25110's Rule-663 labelFr); the STORED
  // value and the generator's label→codeId join stay on the EN label. A legacy free-typed
  // value still displays verbatim on the button until a row is picked over it.
  const renderCompanyPicker = (
    list: readonly { codeId: number; label: string; labelFr?: string }[],
    value: string,
    setValue: (v: string) => void,
    open: boolean,
    setOpen: (v: boolean) => void,
    required: boolean,
  ) => {
    const show = (c: { label: string; labelFr?: string }) => (isFr && c.labelFr) || c.label;
    const current = list.find(c => c.label === value);
    return (
      <View style={styles.fieldRow}>
        <Text style={styles.label}>{t('form234.companyLabel')}{required && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
        <TouchableOpacity
          style={styles.timeButton}
          onPress={() => { if (readOnly) return; setOpen(!open); }}
        >
          <Text style={[styles.timeButtonText, !value && styles.timeButtonPlaceholder]}>
            {current ? show(current) : (value || t('form234.companyPlaceholder'))}
          </Text>
          <ChevronDown size={16} color="#64748B" />
        </TouchableOpacity>
        {open && (
          <View style={styles.dropdownList}>
            {list.map(c => (
              <TouchableOpacity
                key={c.codeId}
                style={[styles.dropdownItem, value === c.label && styles.dropdownItemActive]}
                onPress={() => { setValue(c.label); setOpen(false); }}
              >
                <Text style={[styles.dropdownItemText, value === c.label && styles.dropdownItemTextActive]}>
                  {show(c)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };
  // Local "YYYY-MM-DD HH:MM" — §2: the app's existing timestamp display format.
  const formatClose = (iso?: string): string => {
    if (!iso) return '';
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return '';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())} ${p(dt.getHours())}:${p(dt.getMinutes())}`;
  };
  // Confirm (never suppressible), then stamp the close and persist immediately — closure is
  // irreversible (DFO 234.7). The save merges the new stamp so the lock survives without a later Save.
  // ── S140 P3: THE CLOSE GATES ─────────────────────────────────────────────────────────
  // Every close path asks the P1 table (missingInContainer) BEFORE its confirm dialog —
  // a close with a missing or invalid required field REFUSES, names the fields, and says
  // the close is permanent (design B3.3, ruled: block, not warn; close-alls all-or-nothing).
  // Rule 1051 is untouched: an unused section has no close button, so no gate can fire.
  // The Rule-1052 landing warning stays FIRST and stays warn-and-continue.

  const indToValue = (v: boolean | null): string => (v === null ? '' : v ? 'Y' : 'N');

  // Bullet for one refused field: blank → its label; invalid → the ruled range line
  // (which carries the label itself); the exactly-one TO pair → both labels + suffix.
  // S147 Run 4 — Rule 33 (BE-1: the ONE clock rule outside the requirements table).
  //
  // WHY IT IS NOT AN ENTRY IN dfoRequirements.ts: it compares this log's efforts against EVERY
  // OTHER SAVED LOG. FieldValues is string-valued and cannot carry an array of logs;
  // missingInContainer is synchronous while loadAllLogs is async; and the comparison is per-LOG,
  // with no owning field to hang an isInvalid on. Ruled at S147 BE-1. Do not "tidy" this into the
  // table, and do not copy the pattern for a rule whose data the caller already holds.
  //
  // findEffortOverlap itself is pure and synchronous, and it skips the current log by id — which
  // matters, because once any section has been closed the current log IS in the snapshot, as a
  // stale copy that would otherwise overlap itself every time.
  //
  // S147 Run 5 (the French walk): it returns a MissingField, not a bare string. As a string it sat
  // outside the machinery that decides the refusal heading, so the bullet appeared under "these
  // required fields are still blank" although the haul times were filled and merely clashed — a
  // header contradicting the fields inside it. Routed through outOfTableInvalid it carries
  // reason:'invalid', so bulletIsMixed picks it up like any table bullet and the heading is right
  // by construction rather than by four call sites each remembering to OR a flag.
  const effortOverlapMissing = (): MissingField | null => {
    const clash = findEffortOverlap(buildDraftLog(), allLogsSnapshot);
    return clash ? outOfTableInvalid('form234.effortOverlapBullet', { logId: clash }) : null;
  };

  const closeBulletText = (m: MissingField): string => {
    if (m.reason === 'invalid') {
      // S147: a clock conflict names its own reason — the table chose it (invalidKey), because
      // one field can fail for two different rules and the fieldKey alone cannot say which.
      if (m.detailKey) return t(m.detailKey, m.detailParams);
      const rangeKey =
        m.fieldKey === 'soakDuration' ? 'form234.soakRangeError' :
        m.fieldKey === 'sarGps' ? 'form234.sarGpsRangeError' :
        m.fieldKey === 'gpsCoords' ? 'form234.gpsRangeError' : null;
      if (rangeKey) return t(rangeKey);
    }
    if (m.reason === 'pair-none' || m.reason === 'pair-both') {
      return `${t(m.labelKey)} / ${t(m.pairLabelKey ?? m.labelKey)} — ${t('form234.pairExactlyOne')}`;
    }
    return t(m.labelKey);
  };

  // S141 P4 amendment (W-2): a bullet is "mixed" when it reports a value that is WRONG rather
  // than missing. S147 Run 5: the predicate moved to dfoRequirements so it has ONE definition and
  // can be tested — a bullet that never reaches it is a heading that lies (see outOfTableInvalid).
  const bulletIsMixed = missingFieldIsMixed;

  // One refusal shape for all twelve close doors (W-1: the whole-log door passes its own
  // title key — its bullets can span several sections, so "this section" would misname it).
  const showCloseBlocked = (rows: string[], mixed = false, titleKey = 'form234.closeBlockedTitle') => {
    Alert.alert(
      t(titleKey),
      `${t(mixed ? 'form234.closeBlockedBodyMixed' : 'form234.closeBlockedBody')}\n• ${rows.join('\n• ')}`,
      [{ text: tc('nav.ok') }],
    );
  };

  // Effort-level vs per-trap-group split: the shared EFFORT_LEVEL_KEYS (dfoRequirements) —
  // one definition for the close gates, the footer close-all and the completion meter.

  const groupValues = (g: ExtraEffortDetail): FieldValues => ({
    catchWeight: g.catchWeight ?? '', trapHauls: g.trapHauls ?? '', soakDuration: g.soakDuration ?? '',
    gpsLat: g.gpsLat ?? '', gpsLng: g.gpsLng ?? '',
    gridId: g.gridDisplay ?? '', lgridCodeId: g.lgridDisplay ?? '', statSectId: g.statSectDisplay ?? '',
    vNotchCount: g.vNotchCount ?? '', nbVntchYou: g.nbVntchYou ?? '',
    nbSpcmnBrd: g.nbSpcmnBrd ?? '', nbSpcmnKept: g.nbSpcmnKept ?? '',
    // S154 (U2): the discard count rides here so the group's own close door checks a TYPED
    // value before sealing it (R2). Optional, so a blank never produces a bullet — only a
    // count outside DFO's 0–9999 does, while the field is still editable.
    nbSpcmnDisc: g.nbSpcmnDisc ?? '',
    trapSize: g.trapSize ?? '',
  });

  // Rows for ONE fishing effort: effort-level fields once, then every trap group with its
  // own values (per-block context). Group prefix only when the effort has several groups.
  const effortMissingRows = (ctxFma: number | null, effortLevel: FieldValues, groups: FieldValues[]): { rows: string[]; mixed: boolean } => {
    const ctx = { subformId, fmaId: ctxFma };
    const rows: string[] = [];
    let mixed = false;
    const list = groups.length ? groups : [{} as FieldValues];
    list.forEach((g, gi) => {
      for (const m of missingInContainer('effort', ctx, { ...effortLevel, ...g })) {
        if (gi > 0 && EFFORT_LEVEL_KEYS.has(m.fieldKey)) continue;
        const prefix = list.length > 1 && !EFFORT_LEVEL_KEYS.has(m.fieldKey)
          ? `${t('form234.catchEffortBlock', { n: gi + 1 })} — ` : '';
        rows.push(prefix + closeBulletText(m));
        if (bulletIsMixed(m)) mixed = true;
      }
    });
    return { rows, mixed };
  };

  // Effort 1 = the flat block (effort level + trap group 1) plus extraEfforts (groups 2+).
  const effort1MissingRows = (): { rows: string[]; mixed: boolean } => {
    const lvlAndG1: FieldValues = {
      fmaId: fmaId != null ? String(fmaId) : '',
      haulStartTime: timeStartedHauling, haulEndTime: timeStoppedHauling,
      // S147 Phase 1: each haul time's OWN date rides beside it, plus dateFished as the
      // fallback base — the two together are the timestamp the generator emits
      // (dfoXmlGenerator :274/:275, `haulStartDate || log.dateFished`). A time without its
      // date is half a timestamp: '02:00' vs '23:30' compared as strings says the haul ended
      // before it started, on exactly the cross-midnight trip S90 built these keys for.
      // Nothing reads these yet — no table entry names them, so no answer changes.
      haulStartDate, haulEndDate, dateFished,
      // S147 Phase 3: the trip half rides along so Rule 29 can be answered here — the sail is
      // on a card that never closes, so this door can always name an editable side.
      sailDate, sailTime: timeSailed,
      // S147 Run 4: the landing half, for the EFFORT side of Rule 46 — "does this haul end after
      // the landing?". Its twin on the landing entry asks the same question the other way round.
      landingDate, landingTime: timeOfLanding,
      sarInd: indToValue(sarYes), mmInterInd: indToValue(mmYes),
      gearSubtypeId,
      catchWeight, trapHauls, soakDuration,
      gpsLat, gpsLng,
      gridId: gridDisplay, lgridCodeId: lgridDisplay, statSectId: statSectDisplay,
      vNotchCount, nbVntchYou, nbSpcmnBrd, nbSpcmnKept, trapSize,
      // S154 (U2) — the Phase 3 carry: group 1 of effort 1 is fed by THIS map, not by
      // groupValues(), so without this line the close door would never check its typed value.
      nbSpcmnDisc,
    };
    return effortMissingRows(fmaId, lvlAndG1, [lvlAndG1, ...extraEfforts.map(groupValues)]);
  };

  const nodeMissingRows = (e: ExtraEffortNode): { rows: string[]; mixed: boolean } => {
    const lvl: FieldValues = {
      fmaId: e.fmaId ?? '', haulStartTime: e.haulStartTime ?? '', haulEndTime: e.haulEndTime ?? '',
      // S147 Phase 1 — efforts 2+ carry their own window dates (see effort1MissingRows).
      haulStartDate: e.haulStartDate ?? '', haulEndDate: e.haulEndDate ?? '', dateFished,
      sailDate, sailTime: timeSailed,  // S147 Phase 3 — Rule 29, see effort1MissingRows
      landingDate, landingTime: timeOfLanding,  // S147 Run 4 — Rule 46, effort side
      sarInd: e.sarYes === 'true' ? 'Y' : e.sarYes === 'false' ? 'N' : '',
      mmInterInd: e.mmYes === 'true' ? 'Y' : e.mmYes === 'false' ? 'N' : '',
      gearSubtypeId: e.gearSubtypeId ?? '',
    };
    const groups = (e.details?.length ? e.details : [{} as ExtraEffortDetail]).map(groupValues);
    return effortMissingRows(e.fmaId ? Number(e.fmaId) : null, lvl, groups);
  };

  // S153B: sarWt rides here so the block's own close door checks a TYPED weight before
  // sealing it (ruling A). It is optional, so a blank never produces a bullet — only a value
  // outside the XSD weight range does, while the field is still editable.
  const sarBlockValues = (uiIdx: number): FieldValues => {
    if (uiIdx === 0) return { sarDate, sarTime, sarSpecies, sarNbSpcmn, sarWt, sarCondId, sarLat, sarLng };
    const s = extraSars[uiIdx - 1];
    return {
      sarDate: s?.date ?? '', sarTime: s?.time ?? '', sarSpecies: s?.species ?? '',
      sarNbSpcmn: s?.nbSpcmn ?? '', sarWt: s?.wt ?? '',
      sarCondId: s?.condId ?? '', sarLat: s?.lat ?? '', sarLng: s?.lng ?? '',
    };
  };

  const baitRowMissing = (e: BaitEntry): MissingField[] => {
    const codeId = getDfoBaitTypeList(subformId).find(b => b.label === e.type)?.codeId ?? 0;
    return missingInContainer('baitRow', { subformId, fmaId }, {
      type: e.type ?? '', lbs: e.lbs ?? '',
      condition: e.condition != null ? String(e.condition) : '',
      baitTypeCodeId: String(codeId),
      // S159 (R4): the second door for the Other(814) note — the sheet gate is the first.
      note: e.note ?? '',
    });
  };

  // S158 (R2): specieSzId added — this is THE close door for the size. A row saved before this
  // change has no size, so on GLF(89) it reports missing here and the row refuses to close
  // until he picks one (ruling R4). Without this line the star would appear on a field no gate
  // checked, and the blank would travel all the way to the send validator.
  const bycatchRowMissing = (e: BycatchEntry): MissingField[] =>
    missingInContainer('bycatchRow', { subformId, fmaId }, {
      species: e.species ?? '', lbs: e.lbs ?? '', usage: e.usage ?? '',
      specieSzId: e.specieSzId ?? '',
    });

  // The generic closeSection serves five stamps — each maps to its table container.
  const rowsOf = (ms: MissingField[]): { rows: string[]; mixed: boolean } =>
    ({ rows: ms.map(closeBulletText), mixed: ms.some(bulletIsMixed) });

  // S147 Run 4 (Rule 46): every effort's end reduced to the LATEST one, as a date/time pair the
  // landing entry can compare. effortsFromData is THE one reader and buildLogData carries every
  // key it needs for effort 1 plus extraEffortNodes for efforts 2..n — so this sees all of them.
  // (liveEffortData would NOT: it carries no haul times, only areas and closure stamps.)
  const landingValues = (): FieldValues => {
    const last = latestEffortEnd(effortsFromData(buildLogData()), dateFished);
    return {
      portId: portLanded, landingTime: timeOfLanding, landingDate, dateFished,
      sailDate, sailTime: timeSailed,                                   // Rule 45
      lastEffortEndDate: last?.date ?? '', lastEffortEndTime: last?.time ?? '',  // Rule 46
    };
  };
  const sectionMissingRows = (dataKey: string): { rows: string[]; mixed: boolean } => {
    const ctx = { subformId, fmaId };
    switch (dataKey) {
      case 'dgCloseLanding':
        return rowsOf(missingInContainer('landing', ctx, landingValues()));
      case 'dgCloseTransfer':
        // S147 Phase 5a: transferDate + dateFished complete the date threading deferred at
        // Phase 1 §1.2 — the field exists now, so the transfer objects join the other eight.
        // S154D (FEED SITE F1 of three): the FROM pair and both names. ⚠ NOTHING IN THIS REPO
        // CAN TEST THIS OBJECT — it is a literal inside a React component and all 75 suites are
        // utils. A key missing here gives a close door blind to the field, with every test
        // green. F3 (the meter, in dfoLogStorage) was caught by a failing test; F1 and F2 have
        // no such net, which is why Phase 5 mutation-checks them and the walk exercises them.
        return rowsOf(missingInContainer('transfer', ctx, {
          transferTime, transferDate, dateFished,
          sailDate, sailTime: timeSailed,  // S147 Phase 3 — Rule 248
          transferWt, transferFromVrn, transferFromPndNum, transferFromVname, transferToVname,
          transferToVrn, transferToPndNum, carrierVrn, useCrInd,
        }));
      case 'dgCloseHlin':
        return rowsOf(missingInContainer('hlin', { subformId, effortFmaIds: hail38b ? [DFO_FMA_38B] : [] }, {
          hlinCompany, hlinConfirmNo, hlinEta, hlinTotalWeight,
        }));
      case 'dgCloseHlout':
        return rowsOf(missingInContainer('hlout', ctx, { hloutCompany, hloutConfirmNo }));
      case 'dgClosePconsPersonal':
        // Formality by construction: the close button only renders when the field is filled.
        return rowsOf(missingInContainer('personalUse', ctx, { personalUse }));
      default:
        return { rows: [], mixed: false };
    }
  };

  const closeSection = (dataKey: string, sectionTitleKey: string) => {
    if (readOnly || isClosed(dataKey)) return;
    {
      const { rows, mixed } = sectionMissingRows(dataKey);
      if (rows.length) { showCloseBlocked(rows, mixed); return; }
    }
    Alert.alert(
      t('form234.closeConfirmTitle', { section: t(sectionTitleKey) }),
      t('form234.closeConfirmBody'),
      [
        { text: t('form234.closeConfirmNotYet'), style: 'cancel' },
        {
          text: t('form234.closeConfirmYes'),
          style: 'destructive',
          onPress: async () => {
            const nowIso = new Date().toISOString();
            // S153 Phase 2 (R1/R10): convert the weight this group seals to kilograms and stamp
            // the unit — into BOTH the React state and the persisted map, in the same tick and
            // from the SAME values. State must not keep the typed pounds figure: buildLogData
            // rebuilds the whole map from state on every later save, so a stale state would put
            // pounds back under a 'kg' tag the next time anything saved.
            const unit = await currentWeightUnit();
            // Two objects, kept apart on purpose: `tags` are unit keys and belong in the
            // closeUnits record; `values` are converted weights and belong only in the saved
            // data map, because buildLogData() would otherwise read the pre-setState value.
            const tags: Record<string, string> = {};
            const values: Record<string, string> = {};
            // Three of this function's four groups seal a weight; HLOUT (and LANDING, which
            // routes here via closeLanding) seal none, so they fall through converting nothing.
            if (dataKey === 'dgClosePconsPersonal' && personalUse) {
              const kg = sealPersonalUseWeight(personalUse, unit);
              setPersonalUse(kg);
              values.personalUse = kg;
              tags.dgClosePconsPersonalUnit = unit;
            } else if (dataKey === 'dgCloseTransfer' && transferWt) {
              const kg = sealTransferWeight(transferWt, unit);
              setTransferWt(kg);
              values.transferWt = kg;
              tags.dgCloseTransferUnit = unit;
            } else if (dataKey === 'dgCloseHlin' && hlinTotalWeight) {
              const kg = sealHailInWeight(hlinTotalWeight, unit);
              setHlinTotalWeight(kg);
              values.hlinTotalWeight = kg;
              tags.dgCloseHlinUnit = unit;
            }
            setCloses(prev => ({ ...prev, [dataKey]: nowIso }));
            if (Object.keys(tags).length) setCloseUnits(prev => ({ ...prev, ...tags }));
            if (isLoaded && !editingCompleted) {
              void saveLog({ ...buildDraftLog(), data: { ...buildLogData(), ...values, ...tags, [dataKey]: nowIso } });
            }
          },
        },
      ],
    );
  };
  // S136 Phase 3 (§3.2 ruling): closing ONE fishing effort gets its own specific confirm
  // (the S135 SAR-block shape) instead of the generic section confirm — with several effort
  // blocks the generic title could not say which one is closing. Effort 1's stamp is the
  // legacy dgCloseEffort; the persistence mirrors closeSection exactly.
  const closeEffortNode = () => {
    if (readOnly || isClosed('dgCloseEffort')) return;
    {
      const { rows, mixed } = effort1MissingRows();
      // S147 Run 4: Rule 33 rides the SAME refusal, as one more bullet — a clock conflict is a
      // clock conflict whether the table found it or findEffortOverlap did. Run 5: it is a
      // MissingField, so it feeds bulletIsMixed like every other bullet and the heading follows.
      const overlap = effortOverlapMissing();
      const all = overlap ? [...rows, closeBulletText(overlap)] : rows;
      const allMixed = mixed || (!!overlap && bulletIsMixed(overlap));
      if (all.length) { showCloseBlocked(all, allMixed); return; }
    }
    Alert.alert(
      t('form234.closeEffortConfirmTitle'),
      t('form234.closeEffortConfirmBody'),
      [
        { text: t('form234.closeConfirmNotYet'), style: 'cancel' },
        {
          text: t('form234.closeConfirmYes'),
          style: 'destructive',
          onPress: async () => {
            const nowIso = new Date().toISOString();
            // S153 Phase 2: effort 1 seals CATCH.KEPT_WT for EVERY trap group it owns — the
            // top-level catchWeight (group 1) and every extraEfforts row (groups 2..n). Both
            // convert together because they close together.
            const unit = await currentWeightUnit();
            const sealed1 = sealEffort1Weights(catchWeight, extraEfforts, unit);
            const cwKg = sealed1.catchWeight;
            const detailsNext = sealed1.details;
            setCatchWeight(cwKg);
            setExtraEfforts(detailsNext);
            setCloseUnits(prev => ({ ...prev, dgCloseEffortUnit: unit }));
            setCloses(prev => ({ ...prev, dgCloseEffort: nowIso }));
            if (isLoaded && !editingCompleted) {
              void saveLog({ ...buildDraftLog(), data: {
                ...buildLogData(),
                catchWeight: cwKg,
                ...(detailsNext.length > 0 ? { extraEffortDetails: JSON.stringify(detailsNext) } : {}),
                dgCloseEffortUnit: unit,
                dgCloseEffort: nowIso,
              } });
            }
          },
        },
      ],
    );
  };

  // Foot control: nothing when the group is unused; a lock + timestamp banner when closed; the
  // Close & Save Section button otherwise (hidden in read-only view).
  // S136 Phase 3 walk fix 4: per-occurrence closes label the button "Close & Save" (the
  // bait/SAR twin) via buttonLabelKey — "Close & Save Section" is wrong for one occurrence
  // and collided with Landing's. Every other call site keeps the default label.
  const renderCloseControl = (dataKey: string, sectionTitleKey: string, used: boolean, onClose?: () => void, buttonLabelKey: string = 'form234.closeSectionButton') => {
    if (!used) return null;
    if (isClosed(dataKey)) {
      return (
        <View style={styles.closedBanner}>
          <Lock size={14} color="#64748B" />
          <Text style={styles.closedBannerText}>{t('form234.closedAtLabel', { time: formatClose(closes[dataKey]) })}</Text>
        </View>
      );
    }
    if (readOnly) return null;
    return (
      <TouchableOpacity style={styles.closeSectionBtn} onPress={onClose ?? (() => closeSection(dataKey, sectionTitleKey))} activeOpacity={0.8}>
        <Lock size={16} color="#B45309" />
        <Text style={styles.closeSectionBtnText}>{t(buttonLabelKey)}</Text>
      </TouchableOpacity>
    );
  };

  // ── S134 Phase 3: per-row bycatch closure (the bait pattern, verbatim) ─────────────────
  const closeBycatchRow = (index: number) => {
    if (readOnly) return;
    const e = bycatchEntries[index];
    if (!e || bycatchRowClosed(e)) return;
    {
      const ms = bycatchRowMissing(e);
      if (ms.length) { showCloseBlocked(ms.map(closeBulletText), ms.some(bulletIsMixed)); return; }
    }
    Alert.alert(
      t('form234.closeBycatchRowConfirmTitle'),
      t('form234.closeBycatchRowConfirmBody'),
      [
        { text: t('form234.closeConfirmNotYet'), style: 'cancel' },
        {
          text: t('form234.closeConfirmYes'),
          style: 'destructive',
          onPress: async () => {
            const nowIso = new Date().toISOString();
            // S153 Phase 2: per-row conversion and tag, exactly as bait above.
            const unit = await currentWeightUnit();
            const next = sealBycatchRowWeights(bycatchEntries, unit, index)
              .map((en, i) => (i === index ? { ...en, closeDt: nowIso } : en));
            setBycatchEntries(next);
            if (isLoaded && !editingCompleted) {
              void saveLog({ ...buildDraftLog(), data: { ...buildLogData(), bycatchEntries: JSON.stringify(next) } });
            }
          },
        },
      ],
    );
  };

  // S134 Phase 3: the bycatch card control closes EVERY OPEN ROW (own stamps) and writes NO
  // card-level stamp — identical to the bait close-all.
  const closeAllOpenBycatchRows = () => {
    if (readOnly) return;
    const lockCount = bycatchEntries.filter(e => !bycatchRowClosed(e)).length;
    if (lockCount === 0) return;
    {
      const allRows: string[] = [];
      let anyMixed = false;
      bycatchEntries.forEach((en, i) => {
        if (bycatchRowClosed(en)) return;
        bycatchRowMissing(en).forEach(m => {
          if (bulletIsMixed(m)) anyMixed = true;
          allRows.push(`${en.species?.trim() || t('form234.bycatchRowTitle', { n: i + 1 })} — ${closeBulletText(m)}`);
        });
      });
      if (allRows.length) { showCloseBlocked(allRows, anyMixed); return; }
    }
    Alert.alert(
      t('form234.closeConfirmTitle', { section: t('form234.bycatchSubsection') }),
      t('form234.closeBycatchAllConfirmBody', { count: lockCount }),
      [
        { text: t('form234.closeConfirmNotYet'), style: 'cancel' },
        {
          text: t('form234.closeConfirmYes'),
          style: 'destructive',
          onPress: async () => {
            const nowIso = new Date().toISOString();
            // S153 Phase 2: convert + tag every OPEN row before stamping it.
            const unit = await currentWeightUnit();
            const converted = sealBycatchRowWeights(bycatchEntries, unit);
            const next = JSON.parse(stampOpenRows(JSON.stringify(converted), nowIso)) as BycatchEntry[];
            setBycatchEntries(next);
            if (isLoaded && !editingCompleted) {
              void saveLog({ ...buildDraftLog(), data: { ...buildLogData(), bycatchEntries: JSON.stringify(next) } });
            }
          },
        },
      ],
    );
  };

  // Props that grey + freeze a closed card/block's editable body (blocks all input).
  const closedBodyProps = (dataKey: string) => ({
    pointerEvents: (isClosed(dataKey) ? 'none' : 'auto') as 'none' | 'auto',
    style: isClosed(dataKey) ? styles.closedBody : undefined,
  });

  // S124 Phase 5: closing the Landing section runs Rule 1052 FIRST — if no EFFORT occurrence
  // has been entered, DFO mandates the verbatim warning (a warning, not a block) before the
  // app's own Close confirm. With an effort present, go straight to the standard close confirm.
  // Rule 980 — is the landing more than 24 hours in the future? ONE definition, asked by the
  // whole-log door and (S147 Phase 5b, CG-7) by the Landing card's own close. Uses the landing
  // field's own date with the S90 dateFished fallback, matching the emit.
  const landingIs24hFuture = (): boolean => {
    const landDateStr = landingDate || dateFished;
    if (!landDateStr || !timeOfLanding) return false;
    const [ly, lm, ld] = landDateStr.split('-').map(Number);
    const [lh, lmin] = timeOfLanding.split(':').map(Number);
    const landMs = new Date(ly, (lm ?? 1) - 1, ld ?? 1, lh ?? 0, lmin ?? 0).getTime();
    return !isNaN(landMs) && landMs > Date.now() + 24 * 3600 * 1000;
  };

  const closeLanding = () => {
    if (readOnly || isClosed('dgCloseLanding')) return;
    // S124 Phase 6: Rule 1052 keys off the haul declaration — no EFFORT occurrence (effortYes
    // false) → show DFO's mandated warning first. With a haul declared, go straight to the confirm.
    const hasEffort = effortYes;
    const doClose = () => closeSection('dgCloseLanding', 'form234.landingSection');
    // S147 Phase 5b (CG-7): Rule 980 now fires HERE too, not only at Close & Save All — a
    // harvester could previously seal a landing three days in the future from this card in
    // silence. It stays DFO's WARNING, chained ahead of the close confirm exactly as the
    // whole-log door chains it: warn, then continue. It never refuses.
    const proceed = () => {
      if (landingIs24hFuture()) {
        Alert.alert(
          t('form234.landing24hWarningTitle'),
          t('form234.landing24hWarningBody'),
          [{ text: tc('nav.ok'), onPress: doClose }],
        );
      } else {
        doClose();
      }
    };
    if (hasEffort) { proceed(); return; }
    Alert.alert(
      t('form234.rule1052Title'),
      t('form234.rule1052Warning'),
      [
        { text: t('form234.closeConfirmNotYet'), style: 'cancel' }, // go back to add the effort
        { text: t('form234.rule1052Continue'), onPress: proceed },  // "otherwise, continue"
      ],
    );
  };

  // ── S134: per-row bait closure (§5 per-occurrence) ─────────────────────────────────────
  // Closes ONE bait row: stamps that row's own closeDt and persists immediately (closure is
  // irreversible and must survive without a later Save — mirrors closeSection). Other rows
  // are untouched; the Add Bait control stays live.
  const closeBaitRow = (index: number) => {
    if (readOnly) return;
    const e = baitEntries[index];
    if (!e || baitRowClosed(e)) return;
    {
      // Normally a no-op — the add-sheet makes blank rows unconstructable; armour for
      // legacy/hydrated drafts (which have S134 edit-in-place as their fix path).
      const ms = baitRowMissing(e);
      if (ms.length) { showCloseBlocked(ms.map(closeBulletText), ms.some(bulletIsMixed)); return; }
    }
    Alert.alert(
      t('form234.closeBaitRowConfirmTitle'),
      t('form234.closeBaitRowConfirmBody'),
      [
        { text: t('form234.closeConfirmNotYet'), style: 'cancel' },
        {
          text: t('form234.closeConfirmYes'),
          style: 'destructive',
          onPress: async () => {
            const nowIso = new Date().toISOString();
            // S153 Phase 2: this ROW seals its own BT_WT, so it converts and tags on its own
            // (founder ruling A) — its neighbours in the same card are untouched.
            const unit = await currentWeightUnit();
            const next = sealBaitRowWeights(baitEntries, unit, index)
              .map((en, i) => (i === index ? { ...en, closeDt: nowIso } : en));
            setBaitEntries(next);
            if (isLoaded && !editingCompleted) {
              // buildLogData reads the (still-stale) state, so override baitEntries with `next`.
              void saveLog({ ...buildDraftLog(), data: { ...buildLogData(), baitEntries: JSON.stringify(next) } });
            }
          },
        },
      ],
    );
  };

  // S134 T1 (supersedes the D2 build): the card-level control closes EVERY OPEN ROW — each
  // row gets its own closeDt — and writes NO card-level stamp. The card has no closed state
  // of its own; only rows do. Already-closed rows are untouched (their earlier stamp stays).
  // The button renders only while at least one row is open, so it disappears once everything
  // is closed and reappears when a new (open) row is added.
  const closeAllOpenBaitRows = () => {
    if (readOnly) return;
    const lockCount = baitEntries.filter(e => !baitRowClosed(e)).length;
    if (lockCount === 0) return;
    {
      const allRows: string[] = [];
      let anyMixed = false;
      baitEntries.forEach((en, i) => {
        if (baitRowClosed(en)) return;
        baitRowMissing(en).forEach(m => {
          if (bulletIsMixed(m)) anyMixed = true;
          allRows.push(`${en.type?.trim() || t('form234.baitRowTitle', { n: i + 1 })} — ${closeBulletText(m)}`);
        });
      });
      if (allRows.length) { showCloseBlocked(allRows, anyMixed); return; }
    }
    Alert.alert(
      t('form234.closeConfirmTitle', { section: t('form234.baitReportingSection') }),
      t('form234.closeBaitAllConfirmBody', { count: lockCount }),
      [
        { text: t('form234.closeConfirmNotYet'), style: 'cancel' },
        {
          text: t('form234.closeConfirmYes'),
          style: 'destructive',
          onPress: async () => {
            const nowIso = new Date().toISOString();
            // S153 Phase 2: convert + tag every OPEN row before stamping it.
            const unit = await currentWeightUnit();
            const converted = sealBaitRowWeights(baitEntries, unit);
            const next = JSON.parse(stampOpenBaitRows(JSON.stringify(converted), nowIso)) as BaitEntry[];
            setBaitEntries(next);
            if (isLoaded && !editingCompleted) {
              void saveLog({ ...buildDraftLog(), data: { ...buildLogData(), baitEntries: JSON.stringify(next) } });
            }
          },
        },
      ],
    );
  };

  // ── S135 Phase 2: per-block SAR closure (the bait pattern on inline blocks) ────────────
  // Closes ONE SAR block: block 1 stamps the flat sarCloseDt, blocks 2+ stamp their own
  // extraSars item. Persists immediately (closure is irreversible and must survive without
  // a later Save — mirrors closeBaitRow, with buildLogData's stale state overridden).
  const closeSarBlock = (uiIdx: number) => {
    if (readOnly) return;
    const b = sarBlocksFromData(liveSarData())[uiIdx];
    if (!b || sarBlockClosedStamp(b)) return;
    {
      const ms = missingInContainer('sar', { subformId, fmaId }, sarBlockValues(uiIdx));
      if (ms.length) { showCloseBlocked(ms.map(closeBulletText), ms.some(bulletIsMixed)); return; }
    }
    Alert.alert(
      t('form234.closeSarBlockConfirmTitle'),
      t('form234.closeSarBlockConfirmBody'),
      [
        { text: t('form234.closeConfirmNotYet'), style: 'cancel' },
        {
          text: t('form234.closeConfirmYes'),
          style: 'destructive',
          onPress: async () => {
            const nowIso = new Date().toISOString();
            // S153B: this BLOCK seals its own SAR.WT, so it converts and tags on its own — its
            // neighbours in the same card are untouched (R4: two blocks of one log may end up
            // carrying different units). Same shape as closeBaitRow.
            const unit = await currentWeightUnit();
            if (uiIdx === 0) {
              // Block 1's weight and tag are FLAT keys, so both go into state AND into the
              // saved map in the same tick — buildLogData() rebuilds from state on every later
              // save, so a stale state would put the pounds figure back under a 'kg' tag (R10).
              const wtKg = sealSarBlock1Weight(sarWt, unit);
              setSarWt(wtKg);
              setSarCloseUnit(unit);
              setSarCloseDt(nowIso);
              if (isLoaded && !editingCompleted) {
                void saveLog({ ...buildDraftLog(), data: { ...buildLogData(),
                  sarWt: wtKg, sarCloseUnit: unit, sarCloseDt: nowIso } });
              }
            } else {
              const next = sealSarBlockWeights(extraSars, unit, uiIdx - 1)
                .map((en, i) => (i === uiIdx - 1 ? { ...en, closeDt: nowIso } : en));
              setExtraSars(next);
              if (isLoaded && !editingCompleted) {
                void saveLog({ ...buildDraftLog(), data: { ...buildLogData(), extraSars: JSON.stringify(next) } });
              }
            }
          },
        },
      ],
    );
  };

  // S135 Phase 2 (ruling 4): the SAR card control closes EVERY OPEN BLOCK — each block gets
  // its own stamp (block 1 = sarCloseDt) — and writes NO card-level stamp; the card never
  // seals. Identical to the bait/bycatch close-all shape; hidden while no block is open.
  const closeAllOpenSarBlocks = () => {
    if (readOnly) return;
    const lockCount = sarBlocksFromData(liveSarData()).filter(b => !sarBlockClosedStamp(b)).length;
    if (lockCount === 0) return;
    {
      // All-or-nothing (ruled): grouped by block ("Species at Risk N — Field").
      const allRows: string[] = [];
      let anyMixed = false;
      sarBlocksFromData(liveSarData()).forEach((b, i) => {
        if (sarBlockClosedStamp(b)) return;
        missingInContainer('sar', { subformId, fmaId }, sarBlockValues(i))
          .forEach(m => {
            if (bulletIsMixed(m)) anyMixed = true;
            allRows.push(`${t('form234.sarBlockTitle', { n: i + 1 })} — ${closeBulletText(m)}`);
          });
      });
      if (allRows.length) { showCloseBlocked(allRows, anyMixed); return; }
    }
    Alert.alert(
      t('form234.closeConfirmTitle', { section: t('form234.sarSubsection') }),
      t('form234.closeSarAllConfirmBody', { count: lockCount }),
      [
        { text: t('form234.closeConfirmNotYet'), style: 'cancel' },
        {
          text: t('form234.closeConfirmYes'),
          style: 'destructive',
          onPress: async () => {
            const nowIso = new Date().toISOString();
            // S153B: ONE unit for this door — every block it seals is sealed in the same
            // instant, so they all take the toggle's value at that instant. Blocks already
            // closed keep their own number and their own tag (R2), which is what makes R4
            // reachable: an earlier block may carry a different unit from these.
            const unit = await currentWeightUnit();
            // Block 1 converts only if it is STILL OPEN — the same skip-never-restamp rule its
            // stamp follows, read through the same predicate the bullet loop above uses (so a
            // legacy dgCloseSar card-close counts as closed here too).
            const b1Open = !sarBlockClosedStamp(sarBlocksFromData(liveSarData())[0]);
            const wt1 = b1Open ? sealSarBlock1Weight(sarWt, unit) : sarWt;
            // Convert every open block, THEN stamp — the closeAllOpenBaitRows shape exactly.
            const converted = sealSarBlockWeights(extraSars, unit);
            const stamped = stampOpenSarBlocks(sarCloseDt || undefined, JSON.stringify(converted), nowIso);
            const closeNext = stamped.sarCloseDt;
            const extrasNext = JSON.parse(stamped.extraSars) as ExtraSarDetail[];
            if (b1Open) { setSarWt(wt1); setSarCloseUnit(unit); }
            setSarCloseDt(closeNext);
            setExtraSars(extrasNext);
            if (isLoaded && !editingCompleted) {
              void saveLog({ ...buildDraftLog(), data: { ...buildLogData(),
                ...(b1Open ? { sarWt: wt1, sarCloseUnit: unit } : {}),
                sarCloseDt: closeNext,
                ...(extrasNext.length > 0 ? { extraSars: JSON.stringify(extrasNext) } : {}),
              } });
            }
          },
        },
      ],
    );
  };

  const renderField = (
    label: string, value: string, setter: (v: string) => void,
    placeholder: string, isProblem: boolean = false,
    fieldReadOnly: boolean = false, keyboardType: any = 'default', isReq: boolean = false,
    // S154D R4: the XSD maxLength for this field, so an over-long value cannot be typed in
    // the first place. OPTIONAL and undefined by default — every one of the ~20 existing call
    // sites keeps today's behaviour (RN treats an undefined maxLength as no limit), so this
    // parameter can only ever affect a call site that asks for it. The 222/233 screens have
    // used maxLength on their free-text fields since S111; the logbook had it only on notes.
    maxLength?: number,
  ) => (
    <View style={styles.fieldRow}>
      <View style={styles.labelRow}>
        {isProblem && <View style={styles.problemDot} />}
        <Text style={styles.label}>{label}{isReq && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
      </View>
      <TextInput
        style={[styles.input, (readOnly || fieldReadOnly) && styles.inputReadOnly]}
        value={value}
        onChangeText={setter}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        editable={!readOnly && !fieldReadOnly}
        keyboardType={keyboardType}
        maxLength={maxLength}
      />
    </View>
  );

  const renderYesNoToggle = (
    label: string,
    value: boolean | null,
    onToggle: (v: boolean) => void,
    // S124: softYes uses the muted "Accepted ✓" chip greens for selected-Yes. The EFFORT toggle
    // is green by default on every log (on screen constantly), so the vibrant fill is too loud;
    // the three Interactions toggles keep the vibrant green (they only turn green on a tap).
    softYes: boolean = false,
    required: boolean = false // S140 P3 ruling: the blocking toggles carry the table's star
  ) => (
    <View style={styles.yesNoRow}>
      <Text style={styles.yesNoLabel}>{label}{required && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
      <View style={styles.yesNoButtons}>
        <TouchableOpacity
          style={[styles.yesNoBtn, value === false && styles.yesNoBtnNoActive]}
          onPress={() => { if (!readOnly) onToggle(false); }}
        >
          <Text style={[styles.yesNoBtnText, value === false && styles.yesNoBtnNoText]}>{tc('common.no')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.yesNoBtn, value === true && (softYes ? styles.yesNoBtnYesActiveSoft : styles.yesNoBtnYesActive)]}
          onPress={() => { if (!readOnly) onToggle(true); }}
        >
          <Text style={[styles.yesNoBtnText, value === true && (softYes ? styles.yesNoBtnYesTextSoft : styles.yesNoBtnYesText)]}>{tc('common.yes')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderIncidentFields = (
    species: string,
    setSpecies: (v: string) => void,
    speciesOther: string,
    setSpeciesOther: (v: string) => void,
    dropdownOpen: boolean,
    setDropdownOpen: (v: boolean) => void,
    speciesOptions: readonly (string | { codeId: number; descEn: string; descFr?: string })[],
    what: string,
    setWhat: (v: string) => void,
    lat: string,
    setLat: (v: string) => void,
    lng: string,
    setLng: (v: string) => void,
    dateStr: string,
    timeStr: string,
    pickerFieldName: PickerField,
    // S135 Phase 2 (ruling 2 finish + asterisk ruling): SAR-block-1 mode. When true: (a) no
    // bordered container of its own — block 1 sits inside the shared block chrome, and the
    // inner wrapper read as a card inside a card; (b) Species / Date & Time / GPS Location
    // carry the required asterisk (all Mandatory for SAR on every subform —
    // Subforms_requirements_234.xlsx rows 32-40). The Marine Mammal call site does not pass
    // it, so MM renders byte-identically (default false keeps the exact current markup;
    // MM's fields are not DFO elements and stay unmarked by ruling).
    bare: boolean = false,
    sealed: boolean = false // S140 P3: block-1 SAR closed state, for the timestamp display
  ) => {
    // Normalize to { value, label }: plain strings (Marine Mammal) keep the EN string as
    // the stored value/code and translate at render via mmSpeciesLabels (defaultValue =
    // the code, S98 chip pattern — d.mmSpecies bytes and the 'Other' sentinel compares
    // stay on the EN string); coded rows (SAR / MV_SAR_LIST) store codeId as the value
    // and display the locale desc (descEn fallback) — a real SPECIE_ID either way.
    const opts = speciesOptions.map(o =>
      typeof o === 'string'
        ? { value: o, label: t(`form234.mmSpeciesLabels.${o}`, { defaultValue: o }) }
        : { value: String(o.codeId), label: (isFr && o.descFr) || o.descEn });
    const selectedLabel = opts.find(o => o.value === species)?.label ?? species;
    return (
    <View style={bare ? undefined : styles.incidentBlock}>
      <Text style={styles.label}>{t('form234.speciesLabel')}{bare && isRequired('sarSpecies') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
      <TouchableOpacity
        style={styles.dropdownBtn}
        onPress={() => setDropdownOpen(!dropdownOpen)}
      >
        <Text style={[styles.dropdownBtnText, !species && styles.dropdownPlaceholder]}>
          {selectedLabel || t('form234.selectSpecies')}
        </Text>
        <ChevronDown size={16} color="#64748B" />
      </TouchableOpacity>

      {dropdownOpen && (
        <View style={styles.dropdownList}>
          {opts.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.dropdownItem, species === opt.value && styles.dropdownItemActive]}
              onPress={() => {
                setSpecies(opt.value);
                if (opt.value !== 'Other') setSpeciesOther('');
                setDropdownOpen(false);
              }}
            >
              <Text style={[styles.dropdownItemText, species === opt.value && styles.dropdownItemTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {species === 'Other' && (
        <TextInput
          style={[styles.input, { marginTop: 8 }]}
          value={speciesOther}
          onChangeText={setSpeciesOther}
          placeholder={t('form234.enterSpecies')}
          placeholderTextColor="#94A3B8"
          autoFocus
        />
      )}

      <View style={{ height: 10 }} />
      {renderField(t('form234.whatHappenedLabel'), what, setWhat, t('form234.describeInteraction'))}
      {renderTimestampField(t('form234.dateTimeLabel'), dateStr && timeStr ? `${dateStr} ${timeStr}` : '', pickerFieldName, false, bare && isRequired('sarDateTime'), undefined, sealed)}

      <Text style={[styles.label, { marginTop: 6 }]}>{t('form234.gpsLocationLabel')}{bare && isRequired('sarGps') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
      <View style={styles.gpsRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={lat}
          onChangeText={setLat}
          placeholder={t('form234.latPlaceholder')}
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
        />
        <View style={{ width: 8 }} />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={lng}
          onChangeText={setLng}
          placeholder={t('form234.lngPlaceholder')}
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
        />
      </View>
    </View>
    );
  };

  // renderLostGearFields removed (S93) — LOST_GEAR_IND Blocked in 234.12; question deleted below.

  // S124 Phase 4: the USED data groups that are still OPEN (not yet closed). Same "used" gates
  // as the per-card Close controls (Phase 3) — keep in sync. Excludes already-closed groups.
  // S125 Phase 9: uses the SINGLE shared "used" formula (usedDataGroupKeys, dfoLogStorage) — the
  // same one the send-path guard uses — so the two can never drift. Only the !isClosed filter (the
  // session close state) is UI-specific.
  const openUsedGroups = (): string[] =>
    usedDataGroupKeys({
      // S137: any-effort hail qualification through the ONE predicate (Rules 2024/2025).
      subformId, hailFma: fishesHailArea(liveEffortData()),
      effortYes, // S128 Phase 5: a no-haul day omits EFFORT — don't count it as an open section
      baitCount: baitEntries.length,
      bycatchYes: bycatchYes === true, bycatchCount: bycatchEntries.length,
      personalUse,
      // S136 Phase 4: the SAR pool is used when ANY effort answers Yes (per-effort SAR_IND)
      sarYes: sarYes === true || extraEffortNodes.some(e => e.sarYes === 'true'),
      transferYes: transferYes === true,
      hlinCompany, hlinConfirmNo, hlinTotalWeight, hloutCompany, hloutConfirmNo,
    }).filter(k => !(k === 'dgCloseEffort'
      // S136 Phase 4: the effort key stays OPEN while ANY effort lacks its stamp — mirrors
      // the send guard's effortsAllClosed, so Close & Save All stamps efforts 2+ too.
      ? (!!closes['dgCloseEffort'] && extraEffortNodes.every(e => !!e.closeDt))
      : isClosed(k))
      // S134: the row-based groups (bait; bycatch since Phase 3) also count as closed when
      // every row carries its own closeDt — mirrors the send guard (unclosedUsedGroupKeys)
      // via the same shared helper, so Close & Save All neither restamps nor counts them.
      // S135: SAR joins them — closed when every block from the ONE reader carries its own
      // stamp (block 1 = the flat sarCloseDt).
      && !(k === 'dgCloseBaitUsed' && baitRowsAllClosed(JSON.stringify(baitEntries)))
      && !(k === 'dgClosePconsBycatch' && rowsAllClosed(JSON.stringify(bycatchEntries)))
      && !(k === 'dgCloseSar' && sarBlocksAllClosed(liveSarData())));

  const handleSave = async () => {
    // S124 Phase 1: bait is now OPTIONAL (Rule 1051 — the app must not force a data group; a
    // gear-retrieval day baits nothing). This gate stays but goes quiet on its own now that
    // 'baitEntries' is out of every subform's `required` array (isRequired → false); it still
    // guards correctly if a future subform re-requires bait.
    if (isRequired('baitEntries') && baitEntries.length === 0) {
      Alert.alert(t('form234.missingFieldsTitle'), t('form234.missingBait'), [{ text: tc('nav.ok') }]);
      return;
    }
    // ── S141 P4: THE TWELFTH CLOSE DOOR ASKS THE SHARED TABLE ──────────────────────────
    // This button closes every open section and marks the log complete, permanently — the
    // last close door, not a mere save. It now asks dfoRequirements.ts through the SAME
    // helpers every other close door uses, so the marks, the eleven section closes and this
    // door make one claim. The old private list (FULL_DFO_REQUIRED_FIELDS), its
    // fieldCheckMap/fieldLabels twins and the hand-written per-gate alerts are retired.
    // R-A (ruled, reasons on record): three old entries leave the gate as app-supplied —
    //   Log Book UID / First Entry Date: the app writes both at form open; no screen can
    //   blank them; the send validator still refuses a missing LGBK_UID.
    //   Operator Name: the old check value was the constant 'ok' — it could never block;
    //   the pre-send profile gate (isProfileComplete) is the real enforcement.
    // §14 amendment: the refusal takes the eleven doors' voice — same permanence body (the
    // W-2 mixed variant when any bullet is a wrong-not-blank value), the W-1 whole-log
    // title, and the R-B group checks fold in as bullets (the CHECKS are unchanged — only
    // their wrapper; "is there a row / an answer?" stays app chrome outside the table).
    // ── S153B (founder ruling): THIS DOOR CHECKS WHAT IS STILL OPEN ────────────────────────
    // A closed occurrence is NOT re-inspected here. Once a section, row, effort or SAR block
    // has been sealed by its own Close & Save, no later door looks at it again.
    //
    // WHY. A refusal is only worth making where the man can act on it. A closed body renders
    // under `pointerEvents: 'none'`, so a bullet naming a field inside one asks him to fix
    // something he cannot reach — a wall, not a door. Every SECTION-level door already works
    // this way (closeSarBlock returns on sarBlockClosedStamp; closeAllOpenSarBlocks skips
    // closed blocks when it builds bullets; closeBaitRow returns on baitRowClosed). This
    // twelfth door was the only one that reported on sealed occurrences, in EVERY container —
    // not just SAR. The protection moves upstream instead: each occurrence's own close door
    // refuses a bad value while the field is still editable, so nothing bad gets sealed.
    //
    // It also matches what this door DOES: it closes every still-open group. It never re-closes
    // a sealed one, so inspecting sealed ones was never part of the job.
    //
    // ACCEPTED COST, on the record (founder): a bad value sealed by some other route now passes
    // here silently, the log is marked complete, and he meets the wall at send as a raw
    // validator string rather than a sentence in his own language.
    //
    // DELIBERATELY NOT FILTERED — the three R-B chrome bullets below (bycatch "Yes but no
    // rows", the transfer answer, and Rule 33's cross-log overlap). None is a per-occurrence
    // field check: they ask "is there a row / an answer?" and "does this log clash with
    // another?", which is the app-chrome-vs-table distinction §14 already draws. Nothing they
    // name lives inside a frozen body.
    const missing: string[] = [];
    let anyMixed = false;
    const push = (m: MissingField, prefix = '') => {
      if (bulletIsMixed(m)) anyMixed = true;
      missing.push(prefix + closeBulletText(m));
    };

    // TRIP — dates/times, region-gated departure port and crew, the bycatch toggle.
    missingInContainer('trip', { subformId, fmaId }, {
      startDt: dateFished,
      // S147 Phase 1: startDt stays bound to dateFished — it is the field the asterisk and the
      // blank check are about, and nothing there may change. sailDate rides ALONGSIDE it because
      // the wire carries `sailDate || dateFished` (dfoXmlGenerator :97) and the two diverge when
      // the Trip card's date-only picker moves dateFished after a sail time was set: the sail
      // picker writes both, the Date Fished picker writes only dateFished.
      sailDate,
      sailTime: timeSailed,
      departurePort,
      crewNb: crewMembers.length > 0 ? String(crewMembers.length) : '',
      bycatchAnswered: indToValue(bycatchYes),
    }).forEach(m => push(m));
    // R-B bullet (W-3): Yes to bycatch obliges at least one declared row (species + weight).
    if (bycatchYes === true && bycatchEntries.length === 0) {
      missing.push(t('form234.bycatchNoRowsBullet'));
    }

    // EFFORTS — every effort with its OWN FMA; per-trap-group fields per group. On a no-haul
    // day (S124 Phase 6) the EFFORT node is omitted, so the whole family is skipped. The
    // SAR/MM indicator answers ride these rows (they are table fields, kind 'answered').
    if (effortYes) {
      const multi = extraEffortNodes.length > 0;
      // S153B (founder ruling): a CLOSED occurrence is not re-inspected here. Effort 1's trap
      // groups close WITH effort 1 (they share dgCloseEffort), so the one stamp covers the
      // whole effort-1 family — level fields and every group.
      if (!isClosed('dgCloseEffort')) {
        const r1 = effort1MissingRows();
        anyMixed = anyMixed || r1.mixed;
        r1.rows.forEach(r =>
          missing.push(multi ? `${t('form234.effortNodeTitle', { n: 1 })} — ${r}` : r));
      }
      extraEffortNodes.forEach((e, i) => {
        if (e.closeDt) return;  // S153B: sealed by its own Close & Save — not this door's business
        const rn = nodeMissingRows(e);
        anyMixed = anyMixed || rn.mixed;
        rn.rows.forEach(r =>
          missing.push(`${t('form234.effortNodeTitle', { n: i + 2 })} — ${r}`));
      });

      // SAR blocks — mandatory once ANY effort answered Yes (S136 P4 pool).
      const anySarYes = sarYes === true || extraEffortNodes.some(e => e.sarYes === 'true');
      if (anySarYes) {
        // S153B: read the block list through the ONE reader so "which block is closed?" is
        // answered here exactly as the SAR card's own close-all answers it — including the
        // legacy card-level dgCloseSar, which sealed every block at once.
        const sarBlocks = sarBlocksFromData(liveSarData());
        const blocks = sarBlocks.length;
        for (let i = 0; i < blocks; i++) {
          if (sarBlockClosedStamp(sarBlocks[i])) continue;  // S153B: sealed — skip
          missingInContainer('sar', { subformId, fmaId }, sarBlockValues(i)).forEach(m =>
            push(m, blocks > 1 ? `${t('form234.sarBlockTitle', { n: i + 1 })} — ` : ''));
        }
      }
    }

    // BAIT / BYCATCH rows — mandatory-once-used members. The add-sheet builds complete rows,
    // so these fire only on hydrated/legacy drafts (the old per-row alert chain, now table
    // rows with the close-alls' row prefixes).
    // S153B: closed rows skipped — baitRowClosed/bycatchRowClosed are the SAME predicates the
    // per-row close doors and the card close-alls use, so all three agree about a sealed row.
    baitEntries.forEach((e, i) => {
      if (baitRowClosed(e)) return;
      baitRowMissing(e).forEach(m =>
        push(m, `${e.type?.trim() || t('form234.baitRowTitle', { n: i + 1 })} — `));
    });
    bycatchEntries.forEach((e, i) => {
      if (bycatchRowClosed(e)) return;
      bycatchRowMissing(e).forEach(m =>
        push(m, `${e.species?.trim() || t('form234.bycatchRowTitle', { n: i + 1 })} — `));
    });

    // LANDING — Port Landed is table-mandatory on ALL FOUR regions; the old list omitted it
    // on 89/90 (the recon's R4 hole, closed here).
    // S147: the SAME values the Landing card's own close builds, so the two doors cannot
    // disagree about a timestamp.
    // S153B: skipped once the Landing card is sealed by its own close.
    if (!isClosed('dgCloseLanding')) {
      missingInContainer('landing', { subformId, fmaId }, landingValues()).forEach(m => push(m));
    }

    // HAIL — when any effort fishes 38b/41 on MAR (Rules 2024/2025); ETA + total weight join
    // on the 38b trigger only (Rules 660/661) — same ctx shape as sectionMissingRows.
    // S144 defect 65: these two ALWAYS name their section first. HLIN and HLOUT share the
    // same two field labels (COMPANY / CONFIRMATION NO.), so bare bullets put the same word
    // in this one list twice with nothing telling the harvester which card is short — and on
    // 38b the hail-in ETA/total-weight bullets sit BETWEEN the two identical pairs, so even
    // reading by position fails. Unlike the numbered series (efforts, SAR blocks), these are
    // two differently-named sections that are always both required together, so there is no
    // one-of case to suppress the prefix for: it is unconditional. The section names come
    // from the same two keys the send-time hail refusal already uses to name these cards
    // (CLOSE_SECTION_NAME_KEY, DfoLogsListScreen) — the two refusals about the same two cards
    // now say the same words. No new strings.
    // S153B: each hail card is skipped once IT is sealed — separately, because HLIN and HLOUT
    // close on their own stamps and one can be sealed while the other is still open.
    if (subformId === 90 && hailRequired) {
      if (!isClosed('dgCloseHlin')) {
        missingInContainer('hlin', { subformId, effortFmaIds: hail38b ? [DFO_FMA_38B] : [] }, {
          hlinCompany, hlinConfirmNo, hlinEta, hlinTotalWeight,
        }).forEach(m => push(m, `${t('form234.hlinSection')} — `));
      }
      if (!isClosed('dgCloseHlout')) {
        missingInContainer('hlout', { subformId, fmaId }, {
          hloutCompany, hloutConfirmNo,
        }).forEach(m => push(m, `${t('form234.hloutSection')} — `));
      }
    }

    // TRANSFER (QC 88) — the full container when a transfer is recorded (time, weight, the
    // exactly-one destination pair, carrier VRN); the carrier VRN ALONE whenever the carrier
    // question is Yes, transfer or not (Rule 642 doesn't care — LANDING.VRN is mandatory the
    // moment a carrier is used, and the send validator refuses without it).
    if (subformId === 88) {
      // R-B bullet (W-3): the transfer question itself must be answered — app chrome, not a
      // table field (the table asks "is the row filled?", never "is there an answer?").
      if (transferYes === null) {
        missing.push(t('form234.transferAnswerBullet'));
      }
      const transferValues = {
        // S147 Phase 5a — see sectionMissingRows.
        // S154D (FEED SITE F2 of three) — same four keys as F1 above. If these two objects
        // ever disagree, the card's own Close button and the whole-log save gate refuse
        // different things on the same data, which is the worst kind of bug to find on a boat.
        transferTime, transferDate, dateFished,
        sailDate, sailTime: timeSailed,  // S147 Phase 3 — Rule 248
        transferWt, transferFromVrn, transferFromPndNum, transferFromVname, transferToVname,
        transferToVrn, transferToPndNum, carrierVrn, useCrInd,
      };
      // S153B: both transfer paths skip once the Transfers card is sealed — the carrier-VRN
      // path too, since that field lives on the same card and freezes with it.
      if (isClosed('dgCloseTransfer')) {
        // sealed — not this door's business
      } else if (transferYes === true) {
        missingInContainer('transfer', { subformId, fmaId }, transferValues)
          .forEach(m => push(m));
      } else if (useCrInd === 'Y') {
        missingInContainer('transfer', { subformId, fmaId }, transferValues)
          .filter(m => m.fieldKey === 'carrierVrn')
          .forEach(m => push(m));
      }
    }

    // S147 Run 4 — Rule 33, once for the log (BE-1: not a table entry; see effortOverlapMissing).
    // Run 5: pushed through push(), the same helper every table bullet uses, so it sets anyMixed.
    if (effortYes) {
      const overlap = effortOverlapMissing();
      if (overlap) push(overlap);
    }

    // PERSONAL USE — mandatory once used, but "used" IS the weight being non-blank, so there
    // is nothing checkable here (same formality the Personal Use close door records).

    if (missing.length > 0) {
      // §14: the same refusal shape as the eleven section doors — permanence line first,
      // then the bullets — under the whole-log title (W-1). "Missing Fields" / "before
      // saving" retired: this button doesn't save, it closes permanently, and only the
      // REQUIRED fields matter.
      showCloseBlocked(missing, anyMixed, 'form234.closeLogBlockedTitle');
      return;
    }

    // Rule 980: WARNING (non-blocking) when the landing is more than 24 hours in the future.
    // S147 Phase 5b (CG-7): the test moved to landingIs24hFuture() so the Landing card's own
    // close can ask the SAME question — it fires at both doors now, and it stays a warning.
    const landingWarn = landingIs24hFuture();

    // S124 Phase 4: "Close & Save All" — this complete-save path closes every USED group still
    // open, with ONE shared timestamp. The draft paths (Back / saveDraft / autosave) are
    // untouched and still close nothing — only closeSection and this path ever stamp a close.
    const openUsed = openUsedGroups();

    // Persist as a complete log, merging the close-all stamps into the data map.
    const persist = (
      extraCloses: Record<string, string>,
      baitNext: BaitEntry[] | null = null,
      bycatchNext: BycatchEntry[] | null = null,
      sarCloseNext: string | null = null,
      extraSarsNext: ExtraSarDetail[] | null = null,
      effortNodesNext: ExtraEffortNode[] | null = null,
      // S153 Phase 2: the converted scalar weights + their unit tags for every group this
      // door seals. Data-map keys, so they can be spread straight in; the setState calls
      // below keep the SCREEN in step with them (R10 — state and storage must never diverge).
      weightData: Record<string, string> = {},
    ) => {
      if (Object.keys(extraCloses).length) setCloses(prev => ({ ...prev, ...extraCloses }));
      if (baitNext) setBaitEntries(baitNext);
      if (bycatchNext) setBycatchEntries(bycatchNext);
      if (sarCloseNext) setSarCloseDt(sarCloseNext);
      if (extraSarsNext) setExtraSars(extraSarsNext);
      if (effortNodesNext) setExtraEffortNodes(effortNodesNext);
      // S153 Phase 2: mirror the converted weights into state, and the unit tags into
      // closeUnits. Without this the next buildLogData() would rebuild from the pre-close
      // pounds figures and quietly overwrite the kilograms just written (R10).
      if (weightData.catchWeight !== undefined) setCatchWeight(weightData.catchWeight);
      if (weightData.personalUse !== undefined) setPersonalUse(weightData.personalUse);
      if (weightData.transferWt !== undefined) setTransferWt(weightData.transferWt);
      if (weightData.hlinTotalWeight !== undefined) setHlinTotalWeight(weightData.hlinTotalWeight);
      if (weightData.extraEffortDetails !== undefined) {
        try { setExtraEfforts(JSON.parse(weightData.extraEffortDetails) as ExtraEffortDetail[]); } catch { /* noop */ }
      }
      // S153B: SAR block 1's pair lives in its OWN state, beside its own flat stamp — not in
      // the closeUnits record, which mirrors CLOSE_DATA_KEYS (whose SAR member is the legacy
      // dgCloseSar). Both are still spread into the saved map by `...weightData` below.
      if (weightData.sarWt !== undefined) setSarWt(weightData.sarWt);
      if (weightData.sarCloseUnit !== undefined) setSarCloseUnit(weightData.sarCloseUnit);
      // ...so sarCloseUnit is excluded here despite ending in 'Unit'. Without the exclusion it
      // would land in closeUnits under a key nothing reads, and block 1's label would go on
      // showing the toggle's unit after the block was sealed.
      const tagEntries = Object.entries(weightData)
        .filter(([k]) => k.endsWith('Unit') && k !== 'sarCloseUnit');
      if (tagEntries.length) setCloseUnits(prev => ({ ...prev, ...Object.fromEntries(tagEntries) }));
      const log: DfoLog = {
        id: tripId,
        lgbkUid,
        firstEntryDt,
        mode: 'full',
        status: 'complete',
        dateFished,
        createdAt: Date.now(),
        // buildLogData reads the (still-stale) state, so the per-row stamps ride explicit
        // overrides (S134: the close-all's bait/bycatch members stamp ROWS, never the card).
        data: {
          ...buildLogData(), ...extraCloses,
          ...(baitNext ? { baitEntries: JSON.stringify(baitNext) } : {}),
          ...(bycatchNext ? { bycatchEntries: JSON.stringify(bycatchNext) } : {}),
          // S135: the close-all's SAR member stamps BLOCKS, never the card (ruling 4).
          ...(sarCloseNext ? { sarCloseDt: sarCloseNext } : {}),
          ...(extraSarsNext && extraSarsNext.length > 0 ? { extraSars: JSON.stringify(extraSarsNext) } : {}),
          // S136 P4: the close-all's effort member stamps EACH open effort (effort 1 via its
          // own dgCloseEffort in extraCloses; efforts 2+ via their own closeDt here).
          ...(effortNodesNext && effortNodesNext.length > 0 ? { extraEffortNodes: JSON.stringify(effortNodesNext) } : {}),
          // S153 Phase 2: last, so the converted weights and their tags win over the stale
          // values buildLogData() read out of state above.
          ...weightData,
        },
        remarks: buildRemarks(),
        subformId,
        regId,
        tripNum,
      };
      void (async () => {
        const ok = await saveLog(log);
        if (ok) {
          void clearActiveDraft(); // S95: committed to dfo_logs — drop the crash-safety scratch
          triggerBackup(); // best-effort cloud backup; fire-and-forget, never blocks save
          onSaved();
        } else {
          Alert.alert(tc('settings.errorTitle'), t('form234.saveError'));
        }
      })();
    };

    // count > 0 → confirm naming how many will close (i18next plural); count 0 → plain save.
    const confirmThenSave = async () => {
      if (openUsed.length > 0) {
        const stamp = new Date().toISOString();
        // S153 Phase 2: ONE unit for this whole door — every group it seals is sealed in the
        // same instant, so they all take the toggle's value at that instant.
        const unit = await currentWeightUnit();
        // S134: the row-based groups have NO card-level close state — when the close-all
        // covers bait or bycatch, it stamps each still-open ROW's own closeDt instead of
        // writing the card key. S135: SAR is per-BLOCK the same way (block 1 = sarCloseDt).
        // S136 P4: dgCloseEffort is effort 1's OWN stamp — never blanket-restamped. When the
        // effort group is open, stampOpenEfforts fills effort 1's stamp (only if missing)
        // and every open effort 2+'s own closeDt (skip-never-restamp).
        const extra = Object.fromEntries(openUsed
          .filter(k => k !== 'dgCloseBaitUsed' && k !== 'dgClosePconsBycatch' && k !== 'dgCloseSar' && k !== 'dgCloseEffort')
          .map(k => [k, stamp]));
        // S153 Phase 2: the converted scalar weights + tags this door seals, built alongside
        // the stamps. Only groups in openUsed convert — anything already closed keeps the
        // number and the unit it was closed with (R2), which is how one log ends up carrying
        // two units (R4).
        const weightData: Record<string, string> = {};
        let effortNodesNext: ExtraEffortNode[] | null = null;
        if (openUsed.includes('dgCloseEffort')) {
          const effort1WasOpen = !closes['dgCloseEffort'];
          if (effort1WasOpen) {
            const sealedCA = sealEffort1Weights(catchWeight, extraEfforts, unit);
            if (catchWeight) weightData.catchWeight = sealedCA.catchWeight;
            if (sealedCA.details.length > 0) weightData.extraEffortDetails = JSON.stringify(sealedCA.details);
            weightData.dgCloseEffortUnit = unit;
          }
          const convertedNodes = sealEffortNodeWeights(extraEffortNodes, unit);
          const effortStamped = stampOpenEfforts(closes['dgCloseEffort'], JSON.stringify(convertedNodes), stamp);
          extra['dgCloseEffort'] = effortStamped.dgCloseEffort;
          effortNodesNext = JSON.parse(effortStamped.extraEffortNodes) as ExtraEffortNode[];
        }
        if (openUsed.includes('dgClosePconsPersonal') && personalUse) {
          weightData.personalUse = sealPersonalUseWeight(personalUse, unit);
          weightData.dgClosePconsPersonalUnit = unit;
        }
        if (openUsed.includes('dgCloseTransfer') && transferWt) {
          weightData.transferWt = sealTransferWeight(transferWt, unit);
          weightData.dgCloseTransferUnit = unit;
        }
        if (openUsed.includes('dgCloseHlin') && hlinTotalWeight) {
          weightData.hlinTotalWeight = sealHailInWeight(hlinTotalWeight, unit);
          weightData.dgCloseHlinUnit = unit;
        }
        const baitNext = openUsed.includes('dgCloseBaitUsed')
          ? (JSON.parse(stampOpenBaitRows(JSON.stringify(sealBaitRowWeights(baitEntries, unit)), stamp)) as BaitEntry[])
          : null;
        const bycatchNext = openUsed.includes('dgClosePconsBycatch')
          ? (JSON.parse(stampOpenRows(JSON.stringify(sealBycatchRowWeights(bycatchEntries, unit)), stamp)) as BycatchEntry[])
          : null;
        const sarOpenHere = openUsed.includes('dgCloseSar');
        // S153B: SAR is no longer the one member of this door that stamps without sealing.
        // Block 1's converted weight and tag ride `weightData` (the channel this door already
        // uses for every scalar weight it seals); blocks 2+ convert inside the array below,
        // before the stamper wraps it — the bait/bycatch shape.
        if (sarOpenHere && !sarBlockClosedStamp(sarBlocksFromData(liveSarData())[0])) {
          weightData.sarWt = sealSarBlock1Weight(sarWt, unit);
          weightData.sarCloseUnit = unit;
        }
        // Single-sourced stamping (skip-never-restamp), same helper as the card's close-all.
        const sarStamped = sarOpenHere
          ? stampOpenSarBlocks(sarCloseDt || undefined,
              JSON.stringify(sealSarBlockWeights(extraSars, unit)), stamp)
          : null;
        const sarCloseNext = sarStamped ? sarStamped.sarCloseDt : null;
        const extraSarsNext = sarStamped ? (JSON.parse(sarStamped.extraSars) as ExtraSarDetail[]) : null;
        Alert.alert(
          t('form234.closeAllConfirmTitle'),
          t('form234.closeAllConfirmBody', { count: openUsed.length }),
          [
            { text: t('form234.closeConfirmNotYet'), style: 'cancel' },
            { text: t('form234.closeAllConfirmYes'), style: 'destructive', onPress: () => persist(extra, baitNext, bycatchNext, sarCloseNext, extraSarsNext, effortNodesNext, weightData) },
          ],
        );
      } else {
        Alert.alert(
          t('form234.plainSaveConfirmTitle'),
          undefined,
          [
            { text: t('form234.closeConfirmNotYet'), style: 'cancel' },
            { text: t('form234.plainSaveConfirmYes'), onPress: () => persist({}) },
          ],
        );
      }
    };

    // Rule 980 stays a chained, non-blocking warning ahead of the confirm.
    const proceedThroughLandingWarn = () => {
      if (landingWarn) {
        Alert.alert(t('form234.landing24hWarningTitle'), t('form234.landing24hWarningBody'), [{ text: tc('nav.ok'), onPress: confirmThenSave }]);
      } else {
        void confirmThenSave();
      }
    };

    // S141 P4 (R-D ruling): Rule 1052 — DFO's mandated no-effort warning fires on EVERY close
    // path that can seal landing information with no fishing effort, not only the Landing
    // card's own close (closeLanding). This close-all stamps dgCloseLanding, so it warns
    // FIRST — the SAME strings verbatim (the wording is a fence), warn-and-continue, never a
    // block: a no-effort landing day is a legal day (setting day, gear-retrieval day).
    if (!effortYes && openUsed.includes('dgCloseLanding')) {
      Alert.alert(
        t('form234.rule1052Title'),
        t('form234.rule1052Warning'),
        [
          { text: t('form234.closeConfirmNotYet'), style: 'cancel' },
          { text: t('form234.rule1052Continue'), onPress: proceedThroughLandingWarn },
        ],
      );
    } else {
      proceedThroughLandingWarn();
    }
  };

  return (
    <View style={styles.container}>
      {/* Back to logs header */}
      <TouchableOpacity style={styles.backHeader} onPress={handleBack} activeOpacity={0.7}>
        <ChevronLeft size={16} color="#1E3A8A" />
        <Text style={styles.backHeaderText}>{t('form234.backToLogs')}</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {!readOnly && <View style={styles.captureCard}>
          <Text style={styles.captureTitle}>{t('form234.quickCaptureTitle')}</Text>
          <Text style={styles.captureSubtitle}>{t('form234.quickCaptureSubtitle')}</Text>
          <View style={styles.captureRow}>
            <TouchableOpacity
              style={[styles.captureBtn, sailActiveHere && styles.captureBtnActive]}
              onPress={handleSailPress}
            >
              {sailActiveHere
                ? <Square size={18} color="#FFFFFF" />
                : <Play size={18} color={timeSailed ? '#15803D' : '#1E3A8A'} />}
              <Text style={[
                styles.captureBtnText,
                sailActiveHere && styles.captureBtnTextActive,
                !sailActiveHere && !!timeSailed && styles.captureBtnTextDone,
              ]}>
                {sailActiveHere
                  ? `${t('form234.stopSail')}  ${sailElapsed}`
                  : timeSailed ? t('form234.sailed', { time: timeSailed }) : t('form234.startSail')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              /* S136 Phase 5: no longer disabled when effort 1 is closed — the button now
                 serves EVERY effort (tap 3 creates the next one behind its confirm), so a
                 closed effort 1 must not dead-end Quick Capture. Writes into a closed
                 effort stay impossible (the target derivation + branch guards). */
              style={[styles.captureBtn, haulActiveHere && styles.captureBtnActive]}
              onPress={handleHaulPress}
            >
              {haulActiveHere
                ? <Square size={18} color="#FFFFFF" />
                : <Play size={18} color={latestHaulRange() ? '#15803D' : '#1E3A8A'} />}
              <Text style={[
                styles.captureBtnText,
                haulActiveHere && styles.captureBtnTextActive,
                !haulActiveHere && !!latestHaulRange() && styles.captureBtnTextDone,
              ]}>
                {haulActiveHere
                  ? `${t('form234.stopHaul')}  ${haulElapsed}`
                  : (() => {
                      // Idle: show the LATEST effort's window (pre-S136 this always showed
                      // effort 1's, which reads stale once effort 2 exists).
                      const r = latestHaulRange();
                      return r
                        ? t('form234.hauledRange', { start: r.start, end: r.end || '?' })
                        : t('form234.startHaul');
                    })()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#DBEAFE' }]}><Calendar size={16} color="#1E3A8A" /></View>
            <Text style={styles.sectionTitle}>{t('form234.tripInfoSection')}</Text>
            {renderNoteButton('trip')}
          </View>
          {renderNoteInput('trip', remarks.trip ?? '', (v) => setNote('trip', v))}
          {/* DATE FISHED — date picker, auto-fills today on new log. S140 P2 ruling 2:
              marked (TRIP.START_DT, matrix row 16 — same element as Time Sailed). */}
          <View style={styles.fieldRow}>
            <Text style={styles.label}>{t('form234.dateFishedLabel')}{isRequired('startDt') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => {
                if (readOnly) return;
                const [y, mo, d] = dateFished ? dateFished.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()];
                const initial = new Date(y, mo - 1, d);
                if (Platform.OS === 'android') {
                  // Imperative single date dialog — no declarative picker mounted (S95).
                  openAndroidDate(initial, (picked) => applyPickerValueForField(null, picked));
                  return;
                }
                setTempDate(initial);
                setPickerDate(initial);
                setPickerField(null); // null = date-only mode
                setPickerVisible(true);
              }}
            >
              <Text style={[styles.timeButtonText, !dateFished && styles.timeButtonPlaceholder]}>
                {dateFished || t('form234.tapToSelectDate')}
              </Text>
              <Calendar size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
          {renderField(t('form234.tripIdLabel'), tripId, () => {}, '', false, true)}
          {isVisible('crewNb') && (
            <View style={styles.fieldRow}>
              <Text style={styles.label}>{t('form234.crewRegistryLabel')}{isRequired('crewNb') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
              <CrewSelector selected={crewMembers} onChange={setCrewMembers} />
            </View>
          )}
          {/* S128 Phase 4: departure port (TRIP.PORT_ID, Rule 299) is Mandatory on QC(88)/NL(91)
              and BLOCKED on GLF(89)/MAR(90). Gate the render on isVisible so a blocked field is
              not shown (S120) — renders on 88/91 only, matching the generator's 88/91 emit gate;
              this render previously showed on all four subforms. */}
          {isVisible('departurePort') && (
          <View style={styles.fieldRow}>
            <Text style={styles.label}>{t('form234.departurePortLabel')}{isRequired('departurePort') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
            <DfoPortSelector
              value={departurePort}
              codeId={departurePortCodeId}
              subformId={subformId}
              placeholder={t('form234.selectDeparturePort')}
              disabled={readOnly}
              onChange={(sel) => { setDeparturePort(sel.name); setDeparturePortCodeId(sel.codeId); }}
            />
          </View>
          )}
          {/* S124 Phase 5: TIME SAILED moved here (under departure port) from the dissolved
              Timestamps card. TRIP data — Trip Information is NOT a closeable group (no button). */}
          {isVisible('sailTime') && renderTimestampField(t('form234.timeSailedLabel'), formatDateTimeDisplay(sailDate, timeSailed), 'sailed', false, isRequired('sailTime'))}
        </View>

        {/* S124 Phase 5: LANDING card (port landed + time of landing) sits between Trip Info and
            Catch & Effort (founder ruling). Own Close & Save Section; closing runs Rule 1052
            (no-effort warning) FIRST via closeLanding, then the app's confirm, then lock. */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#FEE2E2' }]}><Clock size={16} color="#B91C1C" /></View>
            <Text style={styles.sectionTitle}>{t('form234.landingSection')}</Text>
            {renderNoteButton('landing')}
          </View>
          {renderNoteInput('landing', remarks.landing ?? '', (v) => setNote('landing', v))}
          <View {...closedBodyProps('dgCloseLanding')}>
          {isVisible('portId') && (
          <View style={styles.fieldRow}>
            <Text style={styles.label}>{t('form234.portLandedLabel')}{isRequired('portId') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
            <DfoPortSelector
              value={portLanded}
              codeId={portLandedCodeId}
              subformId={subformId}
              placeholder={t('form234.selectPortLanded')}
              disabled={readOnly}
              onChange={(sel) => { setPortLanded(sel.name); setPortLandedCodeId(sel.codeId); }}
            />
          </View>
          )}
          {isVisible('landingTime') && renderTimestampField(t('form234.timeOfLandingLabel'), formatDateTimeDisplay(landingDate, timeOfLanding), 'landing', false, isRequired('landingTime'), undefined, isClosed('dgCloseLanding'))}
          </View>
          {renderCloseControl('dgCloseLanding', 'form234.landingSection', true, closeLanding)}
        </View>

        {/* S124 Phase 5: the Timestamps card is DISSOLVED — time sailed → Trip Info (above);
            haul start/stop + soak → Catch & Effort (below); landing → the Landing card (above). */}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#DCFCE7' }]}><Scale size={16} color="#15803D" /></View>
            <Text style={styles.sectionTitle}>{t('form234.catchEffortSection')}</Text>
            {/* S136 Phase 4: the card-header note is GONE — each effort owns its note (a
                shared note that stays editable while another effort is closed is the S128
                hole again). Effort 1's note button lives on ITS block header below. */}
          </View>
          {/* S136 Phase 3 (ruling 5): the licence line — locked display, small edit control,
              above "Did you haul gear?". Shows the per-effort override when stored (d.licNo),
              else the profile licence. Editing swaps the line for a text input; blur saves.
              No confirm — the effort's Close & Save is the freeze (edit control hidden once
              closed, ruling 8). */}
          <View style={styles.licenceLine}>
            {licEditing ? (
              <>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={licNo}
                  onChangeText={setLicNo}
                  placeholder={profileLicence}
                  placeholderTextColor="#94A3B8"
                  autoFocus
                  autoCapitalize="characters"
                  onBlur={() => setLicEditing(false)}
                />
                {/* Walk fix 1: an explicit way to finish — Done ends the edit (blur still
                    works too; both routes land on the same setLicEditing(false)). */}
                <TouchableOpacity onPress={() => setLicEditing(false)} activeOpacity={0.8} style={{ marginLeft: 14, paddingVertical: 6 }} hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}>
                  <Text style={styles.licenceEditText}>{tc('nav.done')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.licenceLineText}>
                  {t('form234.effortLicenceLine', { no: licNo || profileLicence })}
                </Text>
                {!readOnly && !isClosed('dgCloseEffort') && (
                  <TouchableOpacity
                    onPress={() => {
                      // Walk fix 1: a short confirm before the field unlocks — the licence
                      // is what this effort TRANSMITS, so an accidental tap must not open it.
                      Alert.alert(
                        t('form234.effortLicenceEditConfirmTitle'),
                        t('form234.effortLicenceEditConfirmBody'),
                        [
                          { text: tc('nav.cancel'), style: 'cancel' },
                          { text: t('form234.effortLicenceEdit'), onPress: () => setLicEditing(true) },
                        ],
                      );
                    }}
                    activeOpacity={0.8}
                    hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
                    style={{ paddingVertical: 6 }}
                  >
                    <Text style={styles.licenceEditText}>{t('form234.effortLicenceEdit')}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
          {/* S124 Phase 6: "did you haul?" — Yes (default) shows the card; No collapses it (a
              setting day) and omits EFFORT. Styled like the Interactions & Other toggles.
              S136 ruling 6: the toggle stays ONCE, on effort 1 only (Rule 1052 mechanism). */}
          {renderYesNoToggle(t('form234.effortQuestion'), effortYes, handleEffortToggle, true)}
          {effortYes && (<>
          {/* S136 Phase 3 (rulings 3/7): effort 1 renders as a titled block, ALWAYS expanded
              (only trap groups collapse), with its trap groups beneath it and its own
              Close & Save. Phase 4 repeats this block for efforts 2+. */}
          <View style={styles.effortBlock}>
            <View style={styles.effortBlockHeader}>
              <Text style={styles.effortBlockTitle}>{t('form234.effortNodeTitle', { n: 1 })}</Text>
              {/* S136 UI round item 6 (RULED): the header holds ONLY the title and the delete —
                  the note affordance moved to the always-visible NOTE field below the
                  questions. Delete (ruling 8): open efforts only, confirms first (item 4);
                  deleting slides effort 2 up into the flat keys. */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {!readOnly && !isClosed('dgCloseEffort') && (
                  <TouchableOpacity style={[styles.deleteBtn, { marginLeft: 18 }]} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => confirmRemoveEffortNode(0)}>
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          <View {...closedBodyProps('dgCloseEffort')}>
          {/* LFA Selector */}
                    <View style={styles.fieldRow}>
                      <Text style={styles.label}>{t('form234.fishingAreaLabel')}{isRequired('fmaId') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                      <TouchableOpacity
                        style={styles.timeButton}
                        onPress={() => { if (readOnly) return; setFmaPickerOpen(o => !o); setLgridPickerOpen(false); }}
                      >
                        <Text style={[styles.timeButtonText, !fmaId && styles.timeButtonPlaceholder]}>
                          {fmaId ? t(`form234.fmaOption_${fmaId}`, { defaultValue: getDfoFmaList(subformId).find(f => f.codeId === fmaId)?.label ?? t('form234.selectLfa') }) : t('form234.selectLfa')}
                        </Text>
                        <ChevronDown size={16} color="#64748B" />
                      </TouchableOpacity>
                      {fmaPickerOpen && (
                        <View style={styles.dropdownList}>
                          {fmaOptions.map(f => (
                            <TouchableOpacity
                              key={f.codeId}
                              style={[styles.dropdownItem, fmaId === f.codeId && styles.dropdownItemActive]}
                              onPress={() => {
                                setFmaId(f.codeId);
                                setLgridCodeId(null);
                                setLgridDisplay('');
                                setStatSectId(null);
                                setStatSectDisplay('');
                                setGridId(null);
                                setGridDisplay('');
                                setGridSearch('');
                                // S121: the extra blocks' grid/section picks are FMA-scoped too
                                setExtraEfforts(prev => prev.map(e => ({
                                  ...e, lgridCodeId: '', lgridDisplay: '', gridId: '', gridDisplay: '',
                                  statSectId: '', statSectDisplay: '',
                                })));
                                setFmaPickerOpen(false);
                              }}
                            >
                              <Text style={[styles.dropdownItemText, fmaId === f.codeId && styles.dropdownItemTextActive]}>
                                {t(`form234.fmaOption_${f.codeId}`, { defaultValue: f.label })}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

          {/* S136 UI round item 2 (RULED): the two haul times sit in the effort header area —
              directly under the LFA picker, above the trap groups. EFFORT-level pair
              (START_DT / END_DT), one per effort. */}
          {isVisible('haulStartTime') && renderTimestampField(t('form234.timeStartedHaulingLabel'), formatDateTimeDisplay(haulStartDate, timeStartedHauling), 'startHaul', false, isRequired('haulStartTime'), undefined, isClosed('dgCloseEffort'))}
          {isVisible('haulEndTime') && renderTimestampField(t('form234.timeStoppedHaulingLabel'), formatDateTimeDisplay(haulEndDate, timeStoppedHauling), 'stopHaul', false, isRequired('haulEndTime'), undefined, isClosed('dgCloseEffort'))}
          {/* GEAR_SBTYP_ID: NL(91) only — EFFORT_BY_GEAR level, so it sits with the effort's
              own fields ABOVE the trap groups (S136 walk fix 2 moved it up from between the
              group fields). Values from DFO_GEAR_SUBTYPE_LIST; i18n display, .label fallback. */}
          {isVisible('gearSubtypeId') && (
            <View style={styles.fieldRow}>
              <Text style={styles.label}>{t('form234.gearSubtypeLabel')}{isRequired('gearSubtypeId') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => { if (readOnly) return; setGearSubtypePickerOpen(o => !o); }}
              >
                <Text style={[styles.timeButtonText, !gearSubtypeId && styles.timeButtonPlaceholder]}>
                  {gearSubtypeId ? t(`form234.gearSubtypeOption_${gearSubtypeId}`, { defaultValue: DFO_GEAR_SUBTYPE_LIST.find(s => String(s.codeId) === gearSubtypeId)?.label ?? t('form234.selectGearSubtype') }) : t('form234.selectGearSubtype')}
                </Text>
                <ChevronDown size={16} color="#64748B" />
              </TouchableOpacity>
              {gearSubtypePickerOpen && (
                <View style={styles.dropdownList}>
                  {DFO_GEAR_SUBTYPE_LIST.map(s => (
                    <TouchableOpacity
                      key={s.codeId}
                      style={[styles.dropdownItem, gearSubtypeId === String(s.codeId) && styles.dropdownItemActive]}
                      onPress={() => {
                        setGearSubtypeId(String(s.codeId));
                        setGearSubtypePickerOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, gearSubtypeId === String(s.codeId) && styles.dropdownItemTextActive]}>
                        {t(`form234.gearSubtypeOption_${s.codeId}`, { defaultValue: s.label })}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
          {/* S136 walk fix 2: Trap Group 1 renders EXACTLY like groups 2+ — titled, framed,
              same trash/collapse controls (the S135 block-1 pattern). Its fields are the
              legacy flat keys; delete slides group 2 up into them (removeTrapGroup). */}
          <View style={styles.trapGroupBlock}>
            <View style={styles.effortBlockHeader}>
              <Text style={styles.effortBlockTitle}>{t('form234.catchEffortBlock', { n: 1 })}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {!readOnly && !isClosed('dgCloseEffort') && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => removeTrapGroup(0)}>
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.deleteBtn} onPress={() => setBlock1Collapsed(c => !c)}>
                  {block1Collapsed ? <ChevronDown size={18} color="#64748B" /> : <ChevronUp size={18} color="#64748B" />}
                </TouchableOpacity>
              </View>
            </View>
            {block1Collapsed ? (
              <TouchableOpacity onPress={() => setBlock1Collapsed(false)}>
                {/* S154B — CORRECT TODAY, AND UNCHANGED. Group 1 of effort 1: block1Detail()
                    wraps the flat catchWeight, which closes under the same dgCloseEffort stamp
                    its weight field already reads. Same two expressions as before, moved from
                    inside extraSummary to here verbatim. Behaviour identical before and after. */}
                <Text style={styles.effortBlockSummary} numberOfLines={1}>{extraSummary(block1Detail(), isClosed('dgCloseEffort'), closeUnits.dgCloseEffortUnit)}</Text>
              </TouchableOpacity>
            ) : (<>
                    {/* LGRID Selector — shown for any FMA that has a grid list (≡ the 13
                        Rule-619 LFAs); S140 P2: the star now comes from the table (Rule 619
                        makes the grid DFO-mandatory on those LFAs, incl. LFA 34) */}
                    {fmaId !== null && (DFO_LGRID_BY_FMA[fmaId] ?? []).length > 0 && (
                      <View style={styles.fieldRow}>
                        <Text style={styles.label}>{t('form234.lgridLabel')}{isRequired('lgridCodeId') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                        <TouchableOpacity
                          style={styles.timeButton}
                          onPress={() => { if (readOnly) return; setLgridPickerOpen(o => !o); setFmaPickerOpen(false); }}
                        >
                          <Text style={[styles.timeButtonText, !lgridDisplay && styles.timeButtonPlaceholder]}>
                            {lgridDisplay || t('form234.selectGrid')}
                          </Text>
                          <ChevronDown size={16} color="#64748B" />
                        </TouchableOpacity>
                        {lgridPickerOpen && (
                          <View style={[styles.dropdownList, { maxHeight: 200 }]}>
                            <ScrollView nestedScrollEnabled>
                              {(DFO_LGRID_BY_FMA[fmaId] ?? []).map(g => (
                                <TouchableOpacity
                                  key={g.codeId}
                                  style={[styles.dropdownItem, lgridCodeId === g.codeId && styles.dropdownItemActive]}
                                  onPress={() => {
                                    setLgridCodeId(g.codeId);
                                    setLgridDisplay(String(g.display));
                                    setLgridPickerOpen(false);
                                  }}
                                >
                                  <Text style={[styles.dropdownItemText, lgridCodeId === g.codeId && styles.dropdownItemTextActive]}>
                                    {g.display}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                      </View>
                    )}

                    {/* STAT_SECT_ID Selector — NL(91) ONLY, mandatory for the Rule 621 FMAs.
                        Blocked for 88/89/90 (Rule 608); visible implies required here. */}
                    {subformId === 91 && fmaId !== null && DFO_FMA_STAT_SECT_REQUIRED.has(fmaId) && (
                      <View style={styles.fieldRow}>
                        <Text style={styles.label}>{t('form234.statSectLabel')}{isRequired('statSectId') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                        <TouchableOpacity
                          style={styles.timeButton}
                          onPress={() => { if (readOnly) return; setStatSectPickerOpen(o => !o); setFmaPickerOpen(false); }}
                        >
                          <Text style={[styles.timeButtonText, !statSectDisplay && styles.timeButtonPlaceholder]}>
                            {statSectDisplay || t('form234.selectStatSect')}
                          </Text>
                          <ChevronDown size={16} color="#64748B" />
                        </TouchableOpacity>
                        {statSectPickerOpen && (
                          <View style={[styles.dropdownList, { maxHeight: 200 }]}>
                            <ScrollView nestedScrollEnabled>
                              {(DFO_STAT_SECT_BY_FMA[fmaId] ?? []).map(r => {
                                const label = i18n.language.startsWith('fr') ? r.statSectDescFr : r.statSectDescEn;
                                return (
                                  <TouchableOpacity
                                    key={r.statSectCodeId}
                                    style={[styles.dropdownItem, statSectId === r.statSectCodeId && styles.dropdownItemActive]}
                                    onPress={() => {
                                      setStatSectId(r.statSectCodeId);
                                      setStatSectDisplay(label);
                                      setStatSectPickerOpen(false);
                                    }}
                                  >
                                    <Text style={[styles.dropdownItemText, statSectId === r.statSectCodeId && styles.dropdownItemTextActive]}>
                                      {label}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </ScrollView>
                          </View>
                        )}
                      </View>
                    )}

                    {/* GRID_ID Selector — QC(88) ONLY, mandatory for the Rules 613x/614x FMAs.
                        Map-membership IS the "required, not blocked" gate: the 29 Rule-1011
                        blocked FMAs are absent from DFO_FMA_GRID_MAP, so they never show this.
                        Visible implies required → label always carries *. Long list is expected. */}
                    {subformId === 88 && fmaId !== null && fmaId in DFO_FMA_GRID_MAP && (
                      <View style={styles.fieldRow}>
                        <Text style={styles.label}>{t('form234.gridLabel')}{isRequired('gridId') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                        <TouchableOpacity
                          style={styles.timeButton}
                          onPress={() => { if (readOnly) return; setGridSearch(''); setGridPickerNodeTarget(null); setGridPickerTarget(-1); setGridPickerOpen(true); setFmaPickerOpen(false); }}
                        >
                          <Text style={[styles.timeButtonText, !gridDisplay && styles.timeButtonPlaceholder]}>
                            {gridDisplay || t('form234.selectQcGrid')}
                          </Text>
                          <ChevronDown size={16} color="#64748B" />
                        </TouchableOpacity>
                      </View>
                    )}
          {renderField(wLabel('form234.catchWeightLabel', isClosed('dgCloseEffort'), closeUnits.dgCloseEffortUnit), showWeight(catchWeight, isClosed('dgCloseEffort'), closeUnits.dgCloseEffortUnit), setCatchWeight, '0', false, false, 'numeric', isRequired('catchWeight'))}
          {renderField(t('form234.trapHaulsLabel'), trapHauls, setTrapHauls, '0', false, false, 'numeric', isRequired('trapHauls'))}
          {/* S124: soak (group-1 EFFORT_DETAIL) stays here with group 1's fields. The two haul
              times are EFFORT-level (one pair per node) and render AFTER the trap groups, below. */}
          {isVisible('soakDuration') && renderField(t('form234.soakDurationLabel'), soakDuration, setSoakDuration, t('form234.soakDurationPlaceholder'), false, false, 'decimal-pad', isRequired('soakDuration'))}
          {/* NB_SPCMN_KEPT: NL(91) only — mandatory on the lobster catch (Rule 976), blocked
              for QC/GLF/MAR (Subforms row 93). isVisible-gated so 88/89/90 screens are
              pixel-identical to pre-S110 (S110 Phase 2). */}
          {isVisible('nbSpcmnKept') &&
            renderField(t('form234.nbSpcmnKeptLabel'), nbSpcmnKept, setNbSpcmnKept, '0', false, false, 'numeric', isRequired('nbSpcmnKept'))}
          {/* NB_SPCMN_DISC (S154 U2): QC(88) + NL(91) only — Optional on both (Subforms row 95),
              blocked on GLF/MAR, so it is absent from their `visible` config and never renders.
              UNMARKED: isRequired asks the shared table, which answers 'optional', so no asterisk.
              XSD catch_type order — it follows NB_SPCMN_KEPT where that exists (NL) and takes the
              same slot where it does not (QC, where row 93 blocks the kept count). */}
          {isVisible('nbSpcmnDisc') &&
            renderField(t('form234.nbSpcmnDiscLabel'), nbSpcmnDisc, setNbSpcmnDisc, '0', false, false, 'numeric', isRequired('nbSpcmnDisc'))}
          {/* NB_VNTCH: mandatory in Rule 624's 28-FMA list (QC), blocked elsewhere.
              NB_VNTCH_YOU: shown across Rule 625's 47 FMAs — starred on Rule 626's 28, shown
              unstarred on the 19 NL FMAs where it is optional, absent elsewhere. FMA-gated only. */}
          {subformId === 88 && fmaId != null && DFO_FMA_NB_VNTCH.has(fmaId) &&
            renderField(t('form234.nbVntchLabel'), vNotchCount, setVNotchCount, '0', false, false, 'numeric', isRequired('vNotchCount'))}
          {fmaId != null && DFO_FMA_NB_VNTCH_YOU.has(fmaId) &&
            renderField(t('form234.nbVntchYouLabel'), nbVntchYou, setNbVntchYou, '0', false, false, 'numeric', isRequired('nbVntchYou'))}
          {/* NB_SPCMN_BRD: MAR(90) FMA 38b only — mandatory there (Rule 654), blocked elsewhere (Rule 655) */}
          {isVisible('nbSpcmnBrd') && fmaId === DFO_FMA_38B &&
            renderField(t('form234.nbSpcmnBrdLabel'), nbSpcmnBrd, setNbSpcmnBrd, '0', false, false, 'numeric', isRequired('nbSpcmnBrd'))}
          {/* TRP_SZ_ID: NL(91) only — mandatory (Subforms_requirements row 79), blocked for 88/89/90.
              Values from DFO_TRAP_SIZE_LIST (39682 Standard / 39683 Large; Rule 611). */}
          {isVisible('trapSize') && (
            <View style={styles.fieldRow}>
              <Text style={styles.label}>{t('form234.trapSizeLabel')}{isRequired('trapSize') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => { if (readOnly) return; setTrapSizePickerOpen(o => !o); }}
              >
                <Text style={[styles.timeButtonText, !trapSize && styles.timeButtonPlaceholder]}>
                  {trapSize ? t(`form234.trapSizeOption_${trapSize}`, { defaultValue: DFO_TRAP_SIZE_LIST.find(s => String(s.codeId) === trapSize)?.label ?? t('form234.selectTrapSize') }) : t('form234.selectTrapSize')}
                </Text>
                <ChevronDown size={16} color="#64748B" />
              </TouchableOpacity>
              {trapSizePickerOpen && (
                <View style={styles.dropdownList}>
                  {DFO_TRAP_SIZE_LIST.map(s => (
                    <TouchableOpacity
                      key={s.codeId}
                      style={[styles.dropdownItem, trapSize === String(s.codeId) && styles.dropdownItemActive]}
                      onPress={() => {
                        setTrapSize(String(s.codeId));
                        setTrapSizePickerOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, trapSize === String(s.codeId) && styles.dropdownItemTextActive]}>
                        {t(`form234.trapSizeOption_${s.codeId}`, { defaultValue: s.label })}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
          {/* S136 Phase 3: the standalone GPS Coordinates card is GONE — LAT/LONG are trap-group
              data (EFFORT_DETAIL), so trap group 1's coordinates live here with its other
              fields, exactly where the extra blocks already carry theirs.
              S136 UI round item 1 (RULED — conformance fix): group 1 joins groups 2+ on the
              single-sourced entry gate. Rule 3059: « la saisie … doivent être bloquées » —
              on MAR the ENTRY itself is blocked outside 38b, so the old isVisible gate
              (90 visible on every FMA) was an entry breach and the S110 R2 over-collection;
              both closed here. Stored non-38b MAR coords on old drafts stay untouched
              (hydrate + write back verbatim, never rendered or emitted — the NL precedent). */}
          {effortCoordsEntryAllowed(subformId, fmaId) && (
            <>
              {!readOnly && !isClosed('dgCloseEffort') && (
                <TouchableOpacity
                  style={styles.captureGpsBtn}
                  onPress={async () => {
                    setGpsCapturing(true);
                    // S140 P2 defect 48: 'gps' only on success.
                    const ok = await captureGps(setGpsLat, setGpsLng, { alertOnFail: true });
                    if (ok) setGpsSrc('gps'); // §11.3: GPS-read coordinates → MODE="G"
                    setGpsCapturing(false);
                  }}
                  disabled={gpsCapturing}
                  activeOpacity={0.8}
                >
                  <LocateFixed size={15} color="#4338CA" />
                  <Text style={styles.captureGpsBtnText}>
                    {gpsCapturing ? t('form234.capturingGps') : t('form234.captureGpsButton')}
                  </Text>
                </TouchableOpacity>
              )}
              {renderField(t('form234.latitudeLabel'), gpsLat, (v: string) => { setGpsLat(v); setGpsSrc('manual'); }, '0.0000', false, false, 'numeric', isRequired('gpsCoords'))}
              {renderField(t('form234.longitudeLabel'), gpsLng, (v: string) => { setGpsLng(v); setGpsSrc('manual'); }, '0.0000', false, false, 'numeric', isRequired('gpsCoords'))}
            </>
          )}
            </>)}
          </View>
          {/* Phase 2.7: list+search live in a Modal overlay (NOT in the form ScrollView) so
              the FlatList is no longer a nested VirtualizedList. S136 walk fix 2: HOISTED
              out of the Trap Group 1 frame — the Modal serves every group's grid button
              (gridPickerTarget), so a collapsed group 1 must not unmount it. */}
          {subformId === 88 && (
            <Modal
              visible={gridPickerOpen}
              transparent
              animationType="slide"
              onRequestClose={() => { setGridPickerOpen(false); setGridSearch(''); }}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => { setGridPickerOpen(false); setGridSearch(''); }}
              >
                <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                  <View style={styles.sheetContent}>
                    <Text style={styles.sheetTitle}>{t('form234.gridLabel')}</Text>
                    <TextInput
                      style={[styles.input, { marginBottom: 12 }]}
                      value={gridSearch}
                      onChangeText={setGridSearch}
                      placeholder={t('form234.selectQcGrid')}
                      placeholderTextColor="#94A3B8"
                      autoCorrect={false}
                      autoCapitalize="characters"
                    />
                    <FlatList
                      data={gridOptionsFiltered}
                      keyExtractor={(g) => String(g.codeId)}
                      style={{ maxHeight: GRID_LIST_MAX_H }}
                      keyboardShouldPersistTaps="handled"
                      initialNumToRender={20}
                      windowSize={10}
                      maxToRenderPerBatch={20}
                      removeClippedSubviews={true}
                      renderItem={({ item: g }) => {
                        // S121: the Modal serves group 1 (target -1) AND the extra groups.
                        // S136 P4: a set gridPickerNodeTarget routes to an EXTRA EFFORT's group.
                        const active = gridPickerNodeTarget
                          ? (extraEffortNodes[gridPickerNodeTarget.node]?.details?.[gridPickerNodeTarget.group]?.gridId ?? '') === String(g.codeId)
                          : gridPickerTarget === -1
                            ? gridId === g.codeId
                            : (extraEfforts[gridPickerTarget]?.gridId ?? '') === String(g.codeId);
                        return (
                        <TouchableOpacity
                          style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                          onPress={() => {
                            if (gridPickerNodeTarget) {
                              updateNodeGroup(gridPickerNodeTarget.node, gridPickerNodeTarget.group, { gridId: String(g.codeId), gridDisplay: g.descFr });
                            } else if (gridPickerTarget === -1) {
                              setGridId(g.codeId);
                              setGridDisplay(g.descFr);
                            } else {
                              updateExtra(gridPickerTarget, { gridId: String(g.codeId), gridDisplay: g.descFr });
                            }
                            setGridPickerOpen(false);
                            setGridSearch('');
                          }}
                        >
                          <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>
                            {g.descFr}
                          </Text>
                        </TouchableOpacity>
                        );
                      }}
                    />
                    <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => { setGridPickerOpen(false); setGridSearch(''); }}>
                      <Text style={styles.sheetCancelText}>{tc('nav.cancel')}</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
          )}
          {/* S121 multi-grid: additional trap groups (EFFORT_DETAIL 2..n), each with
              its own grid, weight, hauls, and region fields. Group 1 = the framed block above. */}
          {extraEfforts.map((e, i) => renderExtraEffortBlock(e, i))}
          {!readOnly && !isClosed('dgCloseEffort') && (
            <TouchableOpacity style={[styles.addBtn, { marginTop: 4 }]} onPress={addExtraEffort}>
              <Plus size={16} color="#1E3A8A" />
              <Text style={styles.addBtnText}>{t('form234.addCatchEffort')}</Text>
            </TouchableOpacity>
          )}
          {/* S136 Phase 3 (ruling 3) + UI round item 3 (RULED: they stay at the bottom): the
              two Y/N interaction questions are EFFORT elements (SAR_IND / MM_INTER_IND,
              mandatory per occurrence) — asked ON the effort, after its trap groups, as a
              closing attestation. The labels are the Rule 603 / Rule 780 mandated texts,
              reused verbatim. Answering Yes on species at risk opens the existing card in
              Interactions & Other; the detail blocks and their per-block closes are
              untouched there. */}
          <View style={{ height: 14 }} />
          {renderYesNoToggle(t('form234.sarIndLabel'), sarYes, handleSarYes, false, isRequired('sarInd'))}
          {renderYesNoToggle(t('form234.mmInterIndLabel'), mmYes, handleMmYes, false, isRequired('mmInterInd'))}
          {/* S136 UI round item 6 (RULED): the effort note is an always-visible ONE-LINE
              labelled field below the questions (the bycatch-sheet NOTE shape) — the header
              "Add a note" affordance is gone. Same storage as ever (remarks catch+haul,
              same text); freezes with the effort (inside the closedBody wrapper); hidden
              only when closed AND empty. */}
          {!(isClosed('dgCloseEffort') && !(remarks.catch ?? '').trim()) && (
            <View style={styles.fieldRow}>
              <Text style={styles.label}>{t('form234.effortNoteLabel')}</Text>
              <TextInput
                style={[styles.input, readOnly && styles.inputReadOnly]}
                value={remarks.catch ?? ''}
                onChangeText={(v: string) => { setNote('catch', v); setNote('haul', v); }}
                placeholder={t('form234.effortNotePlaceholder')}
                placeholderTextColor="#94A3B8"
                maxLength={2000}
                editable={!readOnly && !isClosed('dgCloseEffort')}
              />
            </View>
          )}
          </View>
          {/* EFFORT close — one closure per effort (§5.2.1; ruling 5 confirm wording).
              Shown only when a haul is declared (Phase 6). */}
          {renderCloseControl('dgCloseEffort', 'form234.catchEffortSection', true, closeEffortNode, 'form234.closeEffortButton')}
          </View>
          {/* S136 Phase 4: fishing efforts 2..n — each a complete titled block (always
              expanded, ruling 7) with its own licence, note, area, trap groups, haul window,
              indicators and Close & Save. */}
          {extraEffortNodes.map((e, i) => renderExtraEffortNode(e, i))}
          {!readOnly && (
            <TouchableOpacity style={[styles.addBtn, { marginTop: 4 }]} onPress={addEffortNode}>
              <Plus size={16} color="#1E3A8A" />
              <Text style={styles.addBtnText}>{t('form234.addEffortNode')}</Text>
            </TouchableOpacity>
          )}
          {/* Close & Save All Efforts (ruling 9, the bait shape): every open effort, one
              stamp, count-confirmed, hidden when nothing is open. */}
          {!readOnly && effortsAnyOpen(liveEffortData()) && (
            <TouchableOpacity style={[styles.closeSectionBtn, { marginTop: 8 }]} onPress={closeAllOpenEfforts} activeOpacity={0.8}>
              <Lock size={16} color="#B45309" />
              <Text style={styles.closeSectionBtnText}>{t('form234.closeAllEffortsButton')}</Text>
            </TouchableOpacity>
          )}
          </>)}
        </View>

        {isVisible('baitEntries') && (
        <View style={styles.section}>
          {/* S134: the card-level Add-a-note affordance is REMOVED — bait notes are per row
              now (Ruling B), entered in the add/edit sheet. S142 (defect 44): the legacy
              card-level rem.bait is untouched in storage but is RETIRED — no edit surface and
              no longer emitted, so it can never speak for a row whose note box is empty. */}
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#FEE2E2' }]}><Fish size={16} color="#B91C1C" /></View>
            <Text style={styles.sectionTitle}>{t('form234.baitReportingSection')}{isRequired('baitEntries') && <Text style={{ color: REQUIRED_ASTERISK_COLOR, fontSize: 13 }}> *</Text>}</Text>
          </View>
          {/* S134 T1: NO card-level freeze — the card has no closed state of its own. */}
          {baitEntries.length === 0 && <Text style={styles.emptyHint}>{t('form234.noBaitYet')}</Text>}
          {baitEntries.map((entry, i) => {
            const rowClosed = baitRowClosed(entry);
            const condLabel = entry.condition != null
              ? refDesc(MV_BAIT_CONDITION.find(c => c.codeId === entry.condition), isFr)
              : undefined;
            return (
            <View key={i} style={[styles.baitRowWrap, rowClosed && styles.closedBody]}>
              <View style={[styles.entryRow, { marginBottom: 0 }]}>
                <View style={styles.entryInfo}>
                  <Text style={styles.entryType}>{baitTypeDisplay(entry.type)}</Text>
                  {/* S134 (D1c, defect 12): the condition, mandatory in the sheet, now shows
                      on the row instead of vanishing after entry. */}
                  {!!condLabel && <Text style={styles.entryLbs}>{condLabel}</Text>}
                  <Text style={styles.entryLbs}>{wSuffix(entry.lbs, baitRowClosed(entry), entry.closeUnit)}</Text>
                  {!!entry.note?.trim() && <Text style={styles.baitRowNote}>{entry.note}</Text>}
                </View>
                {/* D1b: a CLOSED row loses its trash icon; open rows keep theirs. */}
                {!readOnly && !rowClosed && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteBait(i)}>
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
              {/* D1: split side-by-side pair BELOW the row (logs-list Edit|Delete pattern);
                  D1b: closed → the pair is replaced by the same grey lock bar the card uses. */}
              {rowClosed ? (
                <View style={styles.closedBanner}>
                  <Lock size={14} color="#64748B" />
                  <Text style={styles.closedBannerText}>{t('form234.closedAtLabel', { time: formatClose(entry.closeDt || closes['dgCloseBaitUsed']) })}</Text>
                </View>
              ) : !readOnly && (
                <View style={styles.baitRowActions}>
                  <TouchableOpacity style={styles.baitRowEditBtn} onPress={() => openBaitEdit(i)} activeOpacity={0.8}>
                    <Edit3 size={14} color="#1E3A8A" />
                    <Text style={styles.baitRowEditText}>{t('form234.baitRowEdit')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.baitRowCloseBtn} onPress={() => closeBaitRow(i)} activeOpacity={0.8}>
                    <Lock size={14} color="#B45309" />
                    <Text style={styles.baitRowCloseText}>{t('form234.baitRowClose')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            );
          })}
          {/* S134 T1: Add Bait is ALWAYS available — never gated on any close state. A row
              added after closes joins OPEN (a legacy card stamp is adopted into the existing
              rows and dropped at add time, so nothing can be inherited). */}
          {!readOnly && (
            <TouchableOpacity style={styles.addBtn} onPress={() => openSheet('bait')}>
              <Plus size={16} color="#1E3A8A" />
              <Text style={styles.addBtnText}>{t('form234.addBait')}</Text>
            </TouchableOpacity>
          )}
          {/* S134 T1: the card control closes OPEN ROWS ONLY (own key, bait card only — T2).
              Visible only while at least one row is open; no section-level banner EVER (rows
              carry their own lock bars). */}
          {!readOnly && baitEntries.some(e => !baitRowClosed(e)) && (
            <TouchableOpacity style={styles.closeSectionBtn} onPress={closeAllOpenBaitRows} activeOpacity={0.8}>
              <Lock size={16} color="#B45309" />
              <Text style={styles.closeSectionBtnText}>{t('form234.closeAllBaitButton')}</Text>
            </TouchableOpacity>
          )}
        </View>
        )}

        {/* S136 Phase 3: the standalone GPS Coordinates card is REMOVED — trap group 1's
            LAT/LONG and Capture GPS now live inside the Catch & Effort card with the group's
            other fields (see above), where the extra trap groups already carry theirs. */}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#FEF3C7' }]}><Anchor size={16} color="#B45309" /></View>
            <Text style={styles.sectionTitle}>{t('form234.interactionsSection')}</Text>
            {/* S134 Phase 3 (B4): the shared card-header note is GONE — bycatch notes are
                per row and Personal Use has its own note. S142 (defect 44): a legacy
                rem.pcons is untouched in storage but is RETIRED — no edit surface and no
                longer emitted, so it can no longer be substituted into a bycatch row or into
                the Personal Use record. Accepted consequence: on 88/89/91 this header has no
                note button at all (Personal Use is MAR-only). */}
          </View>

          {/* Bycatch */}
          <View style={[styles.incidentSection, { marginBottom: 12 }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#EDE9FE' }]}>
                <AlertTriangle size={16} color="#7C3AED" />
              </View>
              <Text style={[styles.sectionTitle, { fontSize: 13 }]}>{t('form234.bycatchSubsection')}</Text>
            </View>
            {/* S134 Phase 3: NO card-level freeze — only rows have close states. Flipping
                the toggle to No is refused while any row is closed (it would delete closed
                occurrences — §5.2.1). */}
            {renderYesNoToggle(t('form234.bycatchQuestion'), bycatchYes, (val) => {
              if (!val && bycatchEntries.some(e => bycatchRowClosed(e))) {
                Alert.alert(t('form234.bycatchSubsection'), t('form234.bycatchClosedNoToggle'));
                return;
              }
              setBycatchYes(val);
              if (!val) setBycatchEntries([]);
            }, false, isRequired('bycatchAnswered'))}
            {bycatchYes === true && (
              <View style={styles.incidentBlock}>
                {bycatchEntries.length === 0 && <Text style={styles.emptyHint}>{t('form234.noBycatchYet')}</Text>}
                {bycatchEntries.map((entry, i) => {
                  const rowClosed = bycatchRowClosed(entry);
                  return (
                  <View key={i} style={[styles.baitRowWrap, rowClosed && styles.closedBody]}>
                    <View style={[styles.entryRow, { marginBottom: 0 }]}>
                      <View style={styles.entryInfo}>
                        <Text style={styles.entryType}>{bycatchSpeciesDisplay(entry.species)}</Text>
                        {entry.usage && (
                          <Text style={[styles.entryLbs, { color: '#64748B' }]}>{t(`form234.usageOption_${entry.usage}`)}</Text>
                        )}
                        <Text style={styles.entryLbs}>{wSuffix(entry.lbs, bycatchRowClosed(entry), entry.closeUnit)}</Text>
                        {!!entry.note?.trim() && <Text style={styles.baitRowNote}>{entry.note}</Text>}
                      </View>
                      {!readOnly && !rowClosed && (
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteBycatch(i)}>
                          <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                    {rowClosed ? (
                      <View style={styles.closedBanner}>
                        <Lock size={14} color="#64748B" />
                        <Text style={styles.closedBannerText}>{t('form234.closedAtLabel', { time: formatClose(entry.closeDt || closes['dgClosePconsBycatch']) })}</Text>
                      </View>
                    ) : !readOnly && (
                      <View style={styles.baitRowActions}>
                        <TouchableOpacity style={styles.baitRowEditBtn} onPress={() => openBycatchEdit(i)} activeOpacity={0.8}>
                          <Edit3 size={14} color="#1E3A8A" />
                          <Text style={styles.baitRowEditText}>{t('form234.bycatchRowEdit')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.baitRowCloseBtn} onPress={() => closeBycatchRow(i)} activeOpacity={0.8}>
                          <Lock size={14} color="#B45309" />
                          <Text style={styles.baitRowCloseText}>{t('form234.bycatchRowClose')}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  );
                })}
                {/* S134 Phase 3: Add Bycatch is ALWAYS available — never gated on any close
                    state (adopt-on-add keeps a new row from inheriting a legacy stamp). */}
                {!readOnly && (
                  <TouchableOpacity style={[styles.addBtn, { marginTop: 4 }]} onPress={() => openSheet('bycatch')}>
                    <Plus size={16} color="#1E3A8A" />
                    <Text style={styles.addBtnText}>{t('form234.addBycatch')}</Text>
                  </TouchableOpacity>
                )}
                {/* S134 Phase 3: the card control closes OPEN ROWS ONLY (own key — B3).
                    Visible only while at least one row is open; no section banner ever. */}
                {!readOnly && bycatchEntries.some(e => !bycatchRowClosed(e)) && (
                  <TouchableOpacity style={[styles.closeSectionBtn, { marginTop: 8 }]} onPress={closeAllOpenBycatchRows} activeOpacity={0.8}>
                    <Lock size={16} color="#B45309" />
                    <Text style={styles.closeSectionBtnText}>{t('form234.closeAllBycatchButton')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* S136 Phase 3 (ruling 3): the two Y/N questions moved ONTO the effort (they are
              per-EFFORT elements) — asked in the Catch & Effort card. The marine-mammal
              sub-card is gone entirely (its details left in Phase 2; its toggle moved).
              The species-at-risk card below OPENS when an effort answers Yes; its detail
              blocks and their per-block closes are untouched (S135). Bycatch + Personal Use
              are TRIP-level PCONS and stay unconditional. */}
          {effortYes && (sarYes === true || extraEffortNodes.some(e => e.sarYes === 'true')) && (<>
          <View style={styles.incidentSection}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#EDE9FE' }]}>
                <AlertTriangle size={16} color="#7C3AED" />
              </View>
              <Text style={[styles.sectionTitle, { fontSize: 13 }]}>{t('form234.sarSubsection')}</Text>
              {/* S135 (ruling 2): no card-header note affordance — SAR notes are per block.
                  The legacy shared rem.sar stays in storage and still emits as the fallback
                  for blocks without their own note; it has no edit surface any more. */}
            </View>
            {/* S135 Phase 3: NO card-level freeze — only blocks carry close states (ruling
                4). S136 Phase 3: the Yes/No toggle moved onto the effort (Catch & Effort
                card); this card renders only while an effort answers Yes. Flipping that
                toggle to No while any block is closed is still REFUSED inside handleSarYes
                (S135 ruling 5) — closed occurrences are irreversible (§5.2.1). */}
            {(
              <>
                {/* Block 1 — the flat sar* keys, framed by the SAME chrome as blocks 2+
                    (ruling 2): titled "Species at Risk 1", own trash / note / Close & Save.
                    Its closed state = the flat sarCloseDt, else the legacy card stamp. */}
                {renderSarBlockChrome(
                  0,
                  sarNote,
                  setSarNote,
                  sarCloseDt || closes['dgCloseSar'] || undefined,
                  () => removeSarBlock(0),
                  () => closeSarBlock(0),
                  <>
                    {renderIncidentFields(
              sarSpecies, setSarSpecies,
              sarSpeciesOther, setSarSpeciesOther,
              sarDropdownOpen, setSarDropdownOpen,
              DFO_SAR_SPECIES_OFFERED, // S159 (P3, Rule 7): the six-species whitelist

              sarWhat, setSarWhat,
              sarLat, (v: string) => { setSarLat(v); setSarGpsSrc('manual'); },
              sarLng, (v: string) => { setSarLng(v); setSarGpsSrc('manual'); },
              sarDate, sarTime, 'sarTime',
              true, // S135 bare: no inner container — the block chrome IS the card
              !!(sarCloseDt || closes['dgCloseSar']) // S140 P3: sealed display
            )}
                {renderField(t('form234.sarNbSpcmnLabel'), sarNbSpcmn, setSarNbSpcmn, '0', false, false, 'numeric', isRequired('sarNbSpcmn'))}
                {/* S153B: SAR.WT — OPTIONAL and UNMARKED (no asterisk; the table's state is
                    'optional', so isRequired returns false and nothing here forces a value).
                    Placed between the count and the condition to match the XSD sar_type
                    sequence and the dictionary's ELEMENT_ORDER, so the card reads in the
                    order the wire carries. The label takes its unit from the shared wLabel
                    (the tag when closed, the toggle when open — R2/R3). */}
                {renderField(
                  wLabel('form234.sarWtLabel', !!(sarCloseDt || closes['dgCloseSar']), sarCloseUnit),
                  showWeight(sarWt, !!(sarCloseDt || closes['dgCloseSar']), sarCloseUnit),
                  setSarWt, '0', false, false, 'numeric', isRequired('sarWt'),
                )}
                <View style={styles.fieldRow}>
                  <Text style={styles.label}>{t('form234.sarCondLabel')}{isRequired('sarCondId') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => { if (readOnly) return; setSarCondPickerOpen(o => !o); }}
                  >
                    <Text style={[styles.timeButtonText, !sarCondId && styles.timeButtonPlaceholder]}>
                      {sarCondId ? refDesc(MV_SPECIMENS_CONDITION.find(s => String(s.codeId) === sarCondId), isFr) ?? t('form234.sarCondPlaceholder') : t('form234.sarCondPlaceholder')}
                    </Text>
                    <ChevronDown size={16} color="#64748B" />
                  </TouchableOpacity>
                  {sarCondPickerOpen && (
                    <View style={styles.dropdownList}>
                      {MV_SPECIMENS_CONDITION.map(s => (
                        <TouchableOpacity
                          key={s.codeId}
                          style={[styles.dropdownItem, sarCondId === String(s.codeId) && styles.dropdownItemActive]}
                          onPress={() => { setSarCondId(String(s.codeId)); setSarCondPickerOpen(false); }}
                        >
                          <Text style={[styles.dropdownItemText, sarCondId === String(s.codeId) && styles.dropdownItemTextActive]}>
                            {refDesc(s, isFr)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                  </>,
                )}
                {/* S121 multi-SAR: additional encounters (SAR node 2..n), each its own
                    species/date/coords/count/condition. Block 1 = the block above. */}
                {extraSars.map((s, i) => renderExtraSarBlock(s, i))}
                {/* S135: Add is ALWAYS available — never gated on any close state (this is
                    what makes the Phase 1 adopt-on-add guard reachable; a new block can
                    never inherit a close). */}
                {!readOnly && (
                  <TouchableOpacity style={[styles.addBtn, { marginTop: 10 }]} onPress={addExtraSar}>
                    <Plus size={16} color="#1E3A8A" />
                    <Text style={styles.addBtnText}>{t('form234.addSarEncounter')}</Text>
                  </TouchableOpacity>
                )}
                {/* S135 (ruling 4): the card control is a CLOSE-ALL — stamps every open
                    block's own closeDt, writes NO card-level stamp, never seals the card;
                    hidden while no block is open. No section-level lock banner ever. */}
                {!readOnly && sarAnyBlockOpen() && (
                  <TouchableOpacity style={[styles.closeSectionBtn, { marginTop: 8 }]} onPress={closeAllOpenSarBlocks} activeOpacity={0.8}>
                    <Lock size={16} color="#B45309" />
                    <Text style={styles.closeSectionBtnText}>{t('form234.closeAllSarButton')}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
          </>)}

          {/* Lost / Found Gear question REMOVED (S93) — LOST_GEAR_IND is Blocked in the 234.12
              XSD (maxOccurs=0, Rule 608). FGRS handles lost/found gear reporting externally;
              the app no longer asks or emits it for any of the four subforms. */}

          {/* Carrier + Partnership + Transfers — QC(88) only; TRANSFER blocked for 89/90/91 */}
          {subformId === 88 && <View style={styles.incidentSection}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#EDE9FE' }]}>
                <AlertTriangle size={16} color="#7C3AED" />
              </View>
              <Text style={[styles.sectionTitle, { fontSize: 13 }]}>{t('form234.transfersSubsection')}</Text>
              {renderNoteButton('transfer')}
            </View>
            <View {...closedBodyProps('dgCloseTransfer')}>
            {renderNoteInput('transfer', remarks.transfer ?? '', (v) => setNote('transfer', v))}
            {/* USE_CR_IND (Rule 639: defaults to No) + carrier VRN (Rule 642) */}
            {renderYesNoToggle(t('form234.useCarrierQuestion'), useCrInd === 'Y', (val) => {
              setUseCrInd(val ? 'Y' : 'N');
              if (!val) setCarrierVrn('');
            })}
            {useCrInd === 'Y' && (
              <View style={styles.incidentBlock}>
                {renderField(t('form234.carrierVrnLabel'), carrierVrn, setCarrierVrn, '0', false, false, 'numeric', isFieldRequired('carrierVrn', { subformId, fmaId }, { useCrInd }))}
              </View>
            )}
            {/* PRTNSHP_ID — MV_PARTNERSHIP_TYPE picker */}
            <Text style={[styles.sheetLabel, { marginTop: 10 }]}>{t('form234.partnershipLabel')}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 6 }}>
              {MV_PARTNERSHIP_TYPE.map(opt => (
                <TouchableOpacity
                  key={opt.codeId}
                  style={[styles.dropdownItem, prtnshpId === opt.codeId && styles.dropdownItemActive, { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 }]}
                  onPress={() => setPrtnshpId(opt.codeId)}
                >
                  <Text style={[styles.dropdownItemText, prtnshpId === opt.codeId && styles.dropdownItemTextActive]}>
                    {t(`form234.partnershipOption_${opt.codeId}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {renderYesNoToggle(t('form234.transfersQuestion'), transferYes, (val) => {
              setTransferYes(val);
              // S154D (W4): the four new setters MUST be cleared here too. R7 rules that the
              // group-used formula needs no change BECAUSE these boxes live inside
              // `transferYes === true` — a value cannot exist unless the group is used. That
              // argument only holds if answering No empties them; otherwise four values sit on
              // a log that says no transfer happened, with no close door that will ever look
              // at them.
              if (!val) {
                setTransfers(''); setTransferTime(''); setTransferDate(''); setTransferWt('');
                setTransferFromVrn(''); setTransferFromPndNum(''); setTransferFromVname('');
                setTransferToVname(''); setTransferToVrn(''); setTransferToPndNum('');
              }
            })}
            {transferYes === true && (
              <View style={styles.incidentBlock}>
                {/* S147 Phase 5a (CG-6): the fifth timestamp joins its four siblings on the wheel
                    picker. The old hand-typed HH:MM box could not carry a date, and an unparseable
                    entry became 00:00 silently (localToUtcIso: Number('abc') -> NaN -> 0). The label
                    key is unchanged — its four siblings are also worded "TIME" and render date+time. */}
                {renderTimestampField(t('form234.transferTimeLabel'), formatDateTimeDisplay(transferDate, transferTime), 'transfer', false, isRequired('transferTime'), undefined, isClosed('dgCloseTransfer'))}
                {renderField(wLabel('form234.transferWtLabel', isClosed('dgCloseTransfer'), closeUnits.dgCloseTransferUnit), showWeight(transferWt, isClosed('dgCloseTransfer'), closeUnits.dgCloseTransferUnit), setTransferWt, '0', false, false, 'numeric', isRequired('transferWt'))}
                {/* S154D (W5) — Rule 251: exactly ONE of the FROM pair, mirroring the TO pair
                    below box-for-box (R2). Each box clears the other as it is typed, both are
                    marked, one hint sits under the pair. The vessel NAME goes between them on
                    the wire (XSD :378-380) but LAST on screen, so the two mutually-clearing
                    boxes stay adjacent and the pair reads as one question — the emit orders
                    itself independently at dfoXmlGenerator.ts:576-581.
                    maxLength (R4) makes an over-long value untypeable: 12 / 30 / 50, straight
                    from the XSD simple types.
                    ⚠ The VRN box carries the SAME '0' placeholder as its shipped mirror below,
                    and the pond box the same blank one — matching the card, per the S154 §12.2
                    precedent (U2 kept its siblings' placeholder deliberately; changing it is a
                    decision about every box at once, not one field's call). The '0' is a poor
                    hint for a vessel number and it is now on two boxes instead of one — flagged
                    in the gate doc, not fixed here. It matters MORE on a pond box, which is why
                    that one stays blank: DFO's own instruction is to write 0 when a pond has no
                    number, so a grey 0 there would read as an answer already given. */}
                {renderField(t('form234.transferFromVrnLabel'), transferFromVrn, (v: string) => { setTransferFromVrn(v); if (v) setTransferFromPndNum(''); }, '0', false, false, 'numeric', isRequired('transferFromVrn'), 12)}
                {renderField(t('form234.transferFromPndNumLabel'), transferFromPndNum, (v: string) => { setTransferFromPndNum(v); if (v) setTransferFromVrn(''); }, '', false, false, 'default', isRequired('transferFromPndNum'), 30)}
                <Text style={styles.emptyHint}>{t('form234.transferFromHint')}</Text>
                {renderField(t('form234.transferFromVnameLabel'), transferFromVname, setTransferFromVname, '', false, false, 'default', isRequired('transferFromVname'), 50)}
                {/* Rule 252: exactly ONE of the TO pair — both members marked (S140 P2) */}
                {renderField(t('form234.transferToVrnLabel'), transferToVrn, (v: string) => { setTransferToVrn(v); if (v) setTransferToPndNum(''); }, '0', false, false, 'numeric', isRequired('transferToVrn'), 12)}
                {renderField(t('form234.transferToPndNumLabel'), transferToPndNum, (v: string) => { setTransferToPndNum(v); if (v) setTransferToVrn(''); }, '', false, false, 'default', isRequired('transferToPndNum'), 30)}
                <Text style={styles.emptyHint}>{t('form234.transferToHint')}</Text>
                {renderField(t('form234.transferToVnameLabel'), transferToVname, setTransferToVname, '', false, false, 'default', isRequired('transferToVname'), 50)}
              </View>
            )}
            </View>
            {renderCloseControl('dgCloseTransfer', 'form234.transfersSubsection', transferYes === true)}
          </View>}

          {/* PCONS occurrence #2 — Personal Use, its own sub-card so it closes independently
              of the Bycatch occurrence (S124 ruling). MAR(90) ONLY — its node's hardcoded
              USG_ID is Blocked on 88/89/91 (Subforms_requirements_234.xlsx row 58, S134). */}
          {subformId === 90 && <View style={styles.incidentSection}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#EDE9FE' }]}>
                <AlertTriangle size={16} color="#7C3AED" />
              </View>
              <Text style={[styles.sectionTitle, { fontSize: 13 }]}>{t('form234.personalUseSection')}</Text>
              {/* S134 Phase 3 (B4): Personal Use gets its OWN note, locked by its own close
                  (NOTE_CLOSE_KEYS.personalUse → dgClosePconsPersonal). Single occurrence,
                  single close — deliberately NOT per-row. */}
              {renderNoteButton('personalUse')}
            </View>
            <View {...closedBodyProps('dgClosePconsPersonal')}>
            {renderNoteInput('personalUse', remarks.personalUse ?? '', (v) => setNote('personalUse', v))}
            {/* S140 P2 ruling 3: deliberately UNMARKED — this field IS the "is the group
                used" signal, and Rule 1051 forbids forcing an unused section; a star would
                read as an obligation. The table's personalUse entry serves the close gate
                (P3) once the group is used, not a mark. The one site that does not ask the
                table for a star. */}
            {renderField(wLabel('form234.personalUseLabel', isClosed('dgClosePconsPersonal'), closeUnits.dgClosePconsPersonalUnit), showWeight(personalUse, isClosed('dgClosePconsPersonal'), closeUnits.dgClosePconsPersonalUnit), setPersonalUse, '0', false, false, 'numeric')}
            </View>
            {renderCloseControl('dgClosePconsPersonal', 'form234.personalUseSection', personalUse.trim().length > 0)}
          </View>}
        </View>

        {hailRequired && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#DBEAFE' }]}><Anchor size={16} color="#1E3A8A" /></View>
            <Text style={styles.sectionTitle}>{t('form234.hlinSection')}</Text>
            {renderNoteButton('hlin')}
          </View>
          {/* S137 STOP-2a ruling: the sections carry a why-line whenever they render. */}
          <Text style={styles.hailRequiredNote}>{t('form234.hailRequiredNote')}</Text>
          <View {...closedBodyProps('dgCloseHlin')}>
          {renderNoteInput('hlin', remarks.hlin ?? '', (v) => setNote('hlin', v))}
          {renderCompanyPicker(DFO_HLIN_COMPANY_LIST, hlinCompany, setHlinCompany, hlinCompanyPickerOpen, setHlinCompanyPickerOpen, isRequired('hlinCompany'))}
          {renderField(t('form234.confirmNoLabel'), hlinConfirmNo, setHlinConfirmNo, t('form234.confirmNoPlaceholder'), false, false, 'default', isRequired('hlinConfirmNo'))}
          {/* Rules 660/661: mandatory with a 38b effort (asterisked — shown ⇔ mandatory),
              entry BLOCKED on a 41-only log (hidden, the S110 blocked-means-hide precedent). */}
          {/* Rules 660/661 key on "any effort fishes 38b" — hail38b IS that fact, translated
              into the table's context shape (S140 P2). */}
          {hail38b && renderField(t('form234.etaLabel'), hlinEta, setHlinEta, t('form234.etaPlaceholder'), false, false, 'default', isFieldRequired('hlinEta', { subformId, effortFmaIds: hail38b ? [DFO_FMA_38B] : [] }))}
          {hail38b && renderField(wLabel('form234.totalWeightLabel', isClosed('dgCloseHlin'), closeUnits.dgCloseHlinUnit), showWeight(hlinTotalWeight, isClosed('dgCloseHlin'), closeUnits.dgCloseHlinUnit), setHlinTotalWeight, '0', false, false, 'numeric', isFieldRequired('hlinTotalWeight', { subformId, effortFmaIds: hail38b ? [DFO_FMA_38B] : [] }))}
          </View>
          {/* S153 Phase 4 (R9): the weight counts too, so a typed weight raises the close door. */}
          {renderCloseControl('dgCloseHlin', 'form234.hlinSection', !!(hlinCompany || hlinConfirmNo || hlinTotalWeight))}
        </View>
        )}

        {hailRequired && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#DBEAFE' }]}><Anchor size={16} color="#1E3A8A" /></View>
            <Text style={styles.sectionTitle}>{t('form234.hloutSection')}</Text>
            {renderNoteButton('hlout')}
          </View>
          <Text style={styles.hailRequiredNote}>{t('form234.hailRequiredNote')}</Text>
          <View {...closedBodyProps('dgCloseHlout')}>
          {renderNoteInput('hlout', remarks.hlout ?? '', (v) => setNote('hlout', v))}
          {renderCompanyPicker(DFO_HLOUT_COMPANY_LIST, hloutCompany, setHloutCompany, hloutCompanyPickerOpen, setHloutCompanyPickerOpen, isRequired('hloutCompany'))}
          {renderField(t('form234.confirmNoLabel'), hloutConfirmNo, setHloutConfirmNo, t('form234.confirmNoPlaceholder'), false, false, 'default', isRequired('hloutConfirmNo'))}
          </View>
          {renderCloseControl('dgCloseHlout', 'form234.hloutSection', !!(hloutCompany || hloutConfirmNo))}
        </View>
        )}

        {!readOnly && (
          <TouchableOpacity style={styles.submitButton} onPress={handleSave}>
            <Save size={18} color="#FFFFFF" />
            <Text style={styles.submitText}>
              {openUsedGroups().length > 0 ? t('form234.closeAllButton') : t('form234.saveButton')}
            </Text>
          </TouchableOpacity>
        )}

      </ScrollView>

      {Platform.OS === 'ios' && (
        <Modal visible={pickerVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setPickerVisible(false)}>
                  <Text style={styles.modalCancel}>{tc('nav.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { applyPickerValue(tempDate); setPickerVisible(false); }}>
                  <Text style={styles.modalConfirm}>{tc('nav.done')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode={pickerField === null ? 'date' : 'datetime'}
                display="spinner"
                onChange={(_e: DateTimePickerEvent, s?: Date) => { if (s) setTempDate(s); }}
                style={{ backgroundColor: '#FFFFFF' }}
              />
            </View>
          </View>
        </Modal>
      )}
      {/* Android has no declarative picker mount — it uses the imperative
          openAndroidDateTime / openAndroidDate helpers (S95), which sidestep the
          mode="datetime" unmount-dismiss crash. iOS keeps the Modal spinner above. */}

      <Modal visible={sheetVisible} transparent animationType="slide">
        {/* S95: the bait/bycatch sheet portals outside the main-form KAV, so it needs its own —
            this is where "bait pounds" (sheetLbs) is entered and was being covered on Android. */}
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSheetVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.sheetContent}>
              <Text style={styles.sheetTitle}>
                {sheetMode === 'bait'
                  ? (sheetEditIndex != null ? t('form234.editBait') : t('form234.addBait'))
                  : (sheetEditIndex != null ? t('form234.editBycatch') : t('form234.addBycatch'))}
              </Text>

              <Text style={styles.sheetLabel}>
                {sheetMode === 'bait' ? t('form234.baitTypeLabel') : t('form234.speciesLabel')}
                {isFieldRequired(sheetMode === 'bait' ? 'type' : 'species', { subformId, fmaId }, {}, sheetMode === 'bait' ? 'baitRow' : 'bycatchRow') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}
              </Text>
              <TouchableOpacity style={styles.dropdownBtn} onPress={() => setSheetDropdownOpen(o => !o)}>
                <Text style={[styles.dropdownBtnText, !sheetSelectedType && styles.dropdownPlaceholder]}>
                  {sheetSelectedType ? sheetTypeDisplay(sheetSelectedType) : t('form234.selectPlaceholder')}
                </Text>
                <ChevronDown size={16} color="#64748B" />
              </TouchableOpacity>

              {sheetDropdownOpen && (
                <View style={[styles.dropdownList, { maxHeight: 220 }]}>
                  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {getSheetOptions().map(opt => (
                      <TouchableOpacity
                        key={opt.label}
                        style={[styles.dropdownItem, sheetSelectedType === opt.label && styles.dropdownItemActive]}
                        onPress={() => {
                          setSheetSelectedType(opt.label);
                          setSheetSelectedCodeId(opt.codeId ?? null);
                          // Type changed → drop any held condition so a stale pick can't persist
                          // (covers a flip into a 'blocked' state).
                          setSheetCondition(null);
                          setSheetConditionOpen(false);
                          setSheetDropdownOpen(false);
                          // S159 (R1/R2): on a Gulf bycatch sheet the legal size set is a
                          // function of the species — re-derive on every species change. A held
                          // size still legal is kept; an illegal one is dropped; when exactly
                          // one size is legal (non-lobster → 10670) it is filled, and the box
                          // renders it locked — visible, never silent (Rules 651a/b).
                          if (sheetMode === 'bycatch' && subformId === 89) {
                            const legal = glfLegalSpecieSzIds(opt.codeId);
                            setSheetSpecieSzId(prev =>
                              legal.includes(prev) ? prev : (legal.length === 1 ? legal[0] : ''));
                            setSheetSizeOpen(false);
                          }
                        }}
                      >
                        <Text style={[styles.dropdownItemText, sheetSelectedType === opt.label && styles.dropdownItemTextActive]}>
                          {sheetTypeDisplay(opt.label)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* S159 (R4): the free-text name box survives ONLY for the bycatch
                  legacy-reopen. A bait 'Other' has no name box — the wire carries DFO's
                  own code 814 and the description goes in the NOTE below (required). */}
              {sheetSelectedType === 'Other' && sheetMode === 'bycatch' && (
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  value={sheetCustomType}
                  onChangeText={setSheetCustomType}
                  placeholder={t('form234.enterSpecies')}
                  placeholderTextColor="#94A3B8"
                  autoFocus
                />
              )}
              {sheetSelectedType === 'Other' && sheetMode === 'bait' && (
                <Text style={[styles.emptyHint, { marginTop: 8, marginBottom: 0 }]}>
                  {t('form234.baitOtherDescribeLine')}
                </Text>
              )}

              {/* BT_COND_ID — only when the rule makes condition mandatory for this type/region
                  (Rule 3060 MAR / Rule 984 QC-GLF; blocked types and NL-91 render nothing).
                  Options from MV_BAIT_CONDITION (ingested, carries FR). */}
              {sheetMode === 'bait' && sheetSelectedCodeId != null &&
                baitConditionState(subformId, sheetSelectedCodeId) === 'mandatory' && (
                <>
                  <Text style={[styles.sheetLabel, { marginTop: 14 }]}>
                    {t('form234.baitConditionLabel')}{isFieldRequired('condition', { subformId, fmaId }, { baitTypeCodeId: String(sheetSelectedCodeId) }, 'baitRow') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}
                  </Text>
                  <TouchableOpacity style={styles.dropdownBtn} onPress={() => setSheetConditionOpen(o => !o)}>
                    <Text style={[styles.dropdownBtnText, sheetCondition == null && styles.dropdownPlaceholder]}>
                      {sheetCondition != null
                        ? refDesc(MV_BAIT_CONDITION.find(c => c.codeId === sheetCondition), isFr) ?? t('form234.selectPlaceholder')
                        : t('form234.selectPlaceholder')}
                    </Text>
                    <ChevronDown size={16} color="#64748B" />
                  </TouchableOpacity>
                  {sheetConditionOpen && (
                    <View style={styles.dropdownList}>
                      {MV_BAIT_CONDITION.map(c => (
                        <TouchableOpacity
                          key={c.codeId}
                          style={[styles.dropdownItem, sheetCondition === c.codeId && styles.dropdownItemActive]}
                          onPress={() => { setSheetCondition(c.codeId); setSheetConditionOpen(false); }}
                        >
                          <Text style={[styles.dropdownItemText, sheetCondition === c.codeId && styles.dropdownItemTextActive]}>
                            {refDesc(c, isFr)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}

              {/* S158 — PCONS.SPECIE_SZ_ID. Mandatory on GLF(89), BLOCKED on 88/90/91
                  (Subforms_requirements_234.xlsx row 56), so ruling R2: on the other three this
                  renders NOTHING — no label, no empty control. The gate is the same inline
                  subform conditional the MAR-only USAGE field uses further down; the shape of the
                  control is the bait CONDITION dropdown above, and it sits in the same slot,
                  between the species and the weight, which is also its XSD order (SPECIE_SZ_ID
                  before WT). S159 (R1/R2, Rules 651a/b): the options are a function of the
                  species picked above — lobster offers exactly 826/828 (in the Rules 283a–d
                  fenced wording via sizeDesc), any other species has exactly one lawful size,
                  so the box renders it FILLED AND LOCKED (visible, no tap — hiding it and
                  filling silently is the shape of defect 133). No species yet → the box is an
                  inert placeholder, because the legal set does not exist until the species
                  does. Reverses the S158 R1 "offer all eight" ruling. */}
              {sheetMode === 'bycatch' && subformId === 89 && (() => {
                const szLegal = sheetSelectedType ? glfLegalSpecieSzIds(sheetSelectedCodeId) : null;
                return (
                  <>
                    <Text style={[styles.sheetLabel, { marginTop: 14 }]}>
                      {t('form234.bycatchSizeLabel')}{isFieldRequired('specieSzId', { subformId, fmaId }, {}, 'bycatchRow') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}
                    </Text>
                    {szLegal && szLegal.length > 1 ? (
                      <>
                        <TouchableOpacity style={styles.dropdownBtn} onPress={() => setSheetSizeOpen(o => !o)}>
                          <Text style={[styles.dropdownBtnText, !sheetSpecieSzId && styles.dropdownPlaceholder]}>
                            {sheetSpecieSzId
                              ? sizeDesc(MV_SPECIES_SIZE.find(s => String(s.codeId) === sheetSpecieSzId), isFr) ?? t('form234.selectPlaceholder')
                              : t('form234.selectPlaceholder')}
                          </Text>
                          <ChevronDown size={16} color="#64748B" />
                        </TouchableOpacity>
                        {sheetSizeOpen && (
                          <View style={styles.dropdownList}>
                            {MV_SPECIES_SIZE.filter(s => szLegal.includes(String(s.codeId))).map(s => (
                              <TouchableOpacity
                                key={s.codeId}
                                style={[styles.dropdownItem, sheetSpecieSzId === String(s.codeId) && styles.dropdownItemActive]}
                                onPress={() => { setSheetSpecieSzId(String(s.codeId)); setSheetSizeOpen(false); }}
                              >
                                <Text style={[styles.dropdownItemText, sheetSpecieSzId === String(s.codeId) && styles.dropdownItemTextActive]}>
                                  {sizeDesc(s, isFr)}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </>
                    ) : szLegal ? (
                      // Exactly one lawful size (non-lobster → 10670 Unsized): filled and
                      // locked. A plain View — no touch target, no chevron. The value shown is
                      // the value saved: the species-change handler and the edit seed both hold
                      // sheetSpecieSzId at the one legal id whenever this branch renders.
                      <View style={styles.dropdownBtn}>
                        <Text style={styles.dropdownBtnText}>
                          {sizeDesc(MV_SPECIES_SIZE.find(s => String(s.codeId) === szLegal[0]), isFr)}
                        </Text>
                      </View>
                    ) : (
                      // No species picked yet — inert placeholder; the species control above
                      // must be answered first.
                      <View style={styles.dropdownBtn}>
                        <Text style={[styles.dropdownBtnText, styles.dropdownPlaceholder]}>
                          {t('form234.selectPlaceholder')}
                        </Text>
                      </View>
                    )}
                  </>
                );
              })()}

              {/* S153: the sheet only ever edits an OPEN row (a closed row has no Edit button), so the
                  unit here is always the live toggle — for BOTH elements this one key serves. */}
              <Text style={[styles.sheetLabel, { marginTop: 14 }]}>{wLabel('form234.weightLbsLabel', false)}{isFieldRequired('lbs', { subformId, fmaId }, {}, sheetMode === 'bait' ? 'baitRow' : 'bycatchRow') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
              <TextInput
                style={styles.input}
                value={sheetLbs}
                onChangeText={setSheetLbs}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
              />

              {/* S134 (Ruling B / Phase 3 B2): per-row note — one REM per BAIT_USED / PCONS
                  occurrence. Optional (unmarked-means-optional, the screen convention) —
                  EXCEPT bait 'Other' (S159 R4): the requirements row makes the note
                  mandatory when the bait-type codeId is 814, and the star follows it. */}
              {(sheetMode === 'bait' || sheetMode === 'bycatch') && (
                <>
                  <Text style={[styles.sheetLabel, { marginTop: 14 }]}>
                    {sheetMode === 'bait' ? t('form234.baitNoteLabel') : t('form234.bycatchNoteLabel')}
                    {sheetMode === 'bait' && isFieldRequired('note', { subformId, fmaId }, { baitTypeCodeId: String(sheetSelectedCodeId ?? 0) }, 'baitRow') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}
                  </Text>
                  <TextInput
                    style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                    value={sheetNote}
                    onChangeText={setSheetNote}
                    placeholder={sheetMode === 'bait'
                      // S159 walk defect: on a bait Other the note is REQUIRED — the label's
                      // star and the box's own hint must make the same claim (the S155
                      // principle). Every other note keeps the shared optional wording.
                      ? (sheetSelectedType === 'Other' ? t('form234.baitNoteRequiredPlaceholder') : t('form234.baitNotePlaceholder'))
                      : t('form234.bycatchNotePlaceholder')}
                    placeholderTextColor="#94A3B8"
                    multiline
                    maxLength={2000}
                  />
                </>
              )}

              {sheetMode === 'bycatch' && subformId === 90 && (
                <>
                  <Text style={[styles.sheetLabel, { marginTop: 14 }]}>
                    {t('form234.usageLabel')}{isFieldRequired('usage', { subformId, fmaId }, {}, 'bycatchRow') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}
                  </Text>
                  <View style={{ gap: 6, marginTop: 4 }}>
                    {BYCATCH_USAGE_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.dropdownItem, sheetUsage === opt.value && styles.dropdownItemActive, { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 }]}
                        onPress={() => setSheetUsage(opt.value)}
                      >
                        <Text style={[styles.dropdownItemText, sheetUsage === opt.value && styles.dropdownItemTextActive]}>
                          {t(`form234.usageOption_${opt.value}`)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <TouchableOpacity style={styles.sheetConfirmBtn} onPress={handleSheetConfirm}>
                <Text style={styles.sheetConfirmText}>
                  {sheetEditIndex != null ? t('form234.saveEntry') : t('form234.addEntry')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setSheetVisible(false)}>
                <Text style={styles.sheetCancelText}>{tc('nav.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
});

FullDfoForm.displayName = 'FullDfoForm';

const styles = StyleSheet.create({
  container: { flex: 1 },
  backHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#EFF6FF', borderBottomWidth: 1, borderBottomColor: '#BFDBFE',
  },
  backHeaderText: { fontSize: 13, fontWeight: '700', color: '#1E3A8A' },
  captureGpsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 8, marginBottom: 10,
    backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE',
  },
  captureGpsBtnText: { fontSize: 13, fontWeight: '700', color: '#4338CA' },
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A',
    padding: 12, borderRadius: 10, marginBottom: 16,
  },
  infoText: { flex: 1, color: '#78350F', fontSize: 12, lineHeight: 16 },
  captureCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0',
  },
  captureTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  captureSubtitle: { fontSize: 12, color: '#64748B', marginBottom: 12 },
  captureRow: { flexDirection: 'row', gap: 10 },
  captureBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 10,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  captureBtnActive: { backgroundColor: '#B91C1C', borderColor: '#B91C1C' },
  captureBtnDisabled: { opacity: 0.4 },
  captureBtnText: { fontSize: 13, fontWeight: '700', color: '#1E3A8A' },
  captureBtnTextActive: { color: '#FFFFFF' },
  captureBtnTextDone: { color: '#15803D' },
  section: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 12, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  sectionIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', flex: 1 },
  // S137: the why-line under the hail section headers (STOP-2a ruling).
  hailRequiredNote: { fontSize: 12.5, color: '#64748B', fontStyle: 'italic', marginBottom: 8 },
  problemPill: { backgroundColor: '#FEE2E2', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  problemPillText: { fontSize: 10, fontWeight: '700', color: '#B91C1C' },
  fieldRow: { marginBottom: 10 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  label: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 0.5, marginBottom: 4 },
  problemDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: '#1E293B',
  },
  inputReadOnly: { backgroundColor: '#F1F5F9', color: '#64748B' },
  timeButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
  },
  timeButtonText: { fontSize: 15, color: '#1E293B' },
  timeButtonPlaceholder: { color: '#94A3B8' },
  subSectionLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 0.5, marginBottom: 8 },
  emptyHint: { fontSize: 13, color: '#94A3B8', marginBottom: 8, fontStyle: 'italic' },
  entryRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8,
  },
  entryInfo: { flex: 1 },
  entryType: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  entryLbs: { fontSize: 12, color: '#64748B', marginTop: 1 },
  deleteBtn: { padding: 4 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#1E3A8A', borderStyle: 'dashed',
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#1E3A8A' },
  // S124 Phase 3: data-group closure chrome
  closeSectionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 8, marginTop: 10,
    backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#B45309',
  },
  closeSectionBtnText: { fontSize: 13, fontWeight: '700', color: '#B45309' },
  closedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    paddingVertical: 9, paddingHorizontal: 10, borderRadius: 8,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1',
  },
  closedBannerText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  closedBody: { opacity: 0.55 },
  // S134: per-row bait chrome — the split Edit | Close & Save pair below each row
  // (logs-list Edit|Delete pattern), plus the row wrapper and per-row note line.
  baitRowWrap: { marginBottom: 8 },
  baitRowNote: { fontSize: 12, color: '#64748B', fontStyle: 'italic', marginTop: 3 },
  baitRowActions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  baitRowEditBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: '#1E3A8A', backgroundColor: '#EFF6FF',
  },
  baitRowEditText: { fontSize: 13, fontWeight: '700', color: '#1E3A8A' },
  baitRowCloseBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: '#B45309', backgroundColor: '#FEF3C7',
  },
  baitRowCloseText: { fontSize: 13, fontWeight: '700', color: '#B45309' },
  // S121 multi-grid: additional catch-effort block chrome
  effortBlock: {
    backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0',
  },
  // S136 walk fix 3: trap groups sit a shade DARKER than the effort block and the cards,
  // so the nesting reads (effort #F8FAFC on white cards; groups #EEF2F6). Trap groups only.
  trapGroupBlock: {
    backgroundColor: '#EEF2F6', borderRadius: 10, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#CBD5E1',
  },
  effortBlockHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 4,
  },
  effortBlockTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  effortBlockSummary: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  // S136 Phase 3: the per-effort licence line (locked display + small edit control)
  licenceLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  licenceLineText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  licenceEditText: { fontSize: 13, fontWeight: '700', color: '#1E3A8A' },
  yesNoRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  yesNoLabel: { fontSize: 13, color: '#1E293B', fontWeight: '600', flex: 1 },
  yesNoButtons: { flexDirection: 'row', gap: 6 },
  yesNoBtn: {
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  yesNoBtnNoActive: { backgroundColor: '#F1F5F9', borderColor: '#94A3B8' },
  yesNoBtnYesActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  // S124: muted selected-Yes, matching the sent-log "Accepted ✓" chip (SentLogCard successBadge).
  yesNoBtnYesActiveSoft: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  yesNoBtnYesTextSoft: { color: '#15803D' },
  yesNoBtnText: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  yesNoBtnNoText: { color: '#475569' },
  yesNoBtnYesText: { color: '#FFFFFF' },
  incidentSection: {
    backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0',
  },
  incidentBlock: {
    backgroundColor: '#FFFFFF', borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  gpsRow: { flexDirection: 'row', marginBottom: 10 },
  submitButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#1E3A8A', paddingVertical: 14, borderRadius: 10,
  },
  submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 16,
    borderTopRightRadius: 16, paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  modalCancel: { fontSize: 16, color: '#64748B', fontWeight: '600' },
  modalConfirm: { fontSize: 16, color: '#1E3A8A', fontWeight: '700' },
  sheetContent: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 16,
    borderTopRightRadius: 16, padding: 20, paddingBottom: 40,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  sheetLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 0.5, marginBottom: 6 },
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12,
  },
  dropdownBtnText: { fontSize: 15, color: '#1E293B' },
  dropdownPlaceholder: { color: '#94A3B8' },
  dropdownList: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 8, marginTop: 4, overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: { backgroundColor: '#EFF6FF' },
  dropdownItemText: { fontSize: 15, color: '#1E293B' },
  dropdownItemTextActive: { color: '#1E3A8A', fontWeight: '700' },
  sheetConfirmBtn: {
    backgroundColor: '#1E3A8A', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 20,
  },
  sheetConfirmText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  sheetCancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  sheetCancelText: { color: '#64748B', fontWeight: '600', fontSize: 15 },
  addNoteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
  },
  addNoteBtnText: { fontSize: 11, fontWeight: '700', color: '#1E3A8A' },
  noteInput: {
    borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8,
    padding: 10, fontSize: 14, color: '#1E293B', backgroundColor: '#F8FAFC',
    minHeight: 64, textAlignVertical: 'top', marginBottom: 12,
  },
});

export default FullDfoForm;
