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
  MapPin,
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
} from 'lucide-react-native';
import {
  saveLog,
  saveDraft,
  loadLogById,
  generateNewLogMeta,
  loadLastLog,
  getRequiredFields,
  saveActiveDraft,
  loadActiveDraft,
  clearActiveDraft,
  DfoLog,
  LogRemarks,
  ExtraEffortDetail,
  ExtraSarDetail,
} from '../utils/dfoLogStorage';
import { triggerBackup } from '../utils/dfoBackup';
import { REQUIRED_ASTERISK_COLOR } from '../styles/GlobalStyles';
import {
  DFO_FMA_LIST,
  DFO_LGRID_BY_FMA,
  DFO_FMA_LGRID_REQUIRED,
  DFO_STAT_SECT_BY_FMA,
  DFO_FMA_STAT_SECT_REQUIRED,
  DFO_FMA_GRID_MAP,
  getDfoFmaList,
  getDfoBaitTypeList,
  baitConditionState,
  getDfoCatchSpeciesList,
  DFO_SUBFORM_FIELD_CONFIG,
  DFO_FMA_38B,
  DFO_FMA_NB_VNTCH,
  DFO_FMA_NB_VNTCH_YOU,
  DFO_TRAP_SIZE_LIST,
  DFO_GEAR_SUBTYPE_LIST,
  clampCoord4,
} from '../utils/dfoConstants';
import { loadCaptainProfile } from '../utils/captainStorage';
import { useTranslation } from 'react-i18next';
import CrewSelector from './CrewSelector';
import DfoPortSelector from './DfoPortSelector';
import { CrewMember } from '../utils/crewStorage';
import { MV_CATCH_USAGE, MV_PARTNERSHIP_TYPE, MV_SAR_LIST, MV_SPECIMENS_CONDITION, MV_BAIT_CONDITION, MV_GRID, MV_BAIT_TYPE, MV_SPECIES } from '../data/reftables';

export interface FullDfoFormHandle {
  saveDraft: () => Promise<void>;
}

interface FullDfoFormProps {
  editingLogId: string | null;
  onSaved: () => void;
  readOnly?: boolean;
  onBack?: () => void;
}

type BaitEntry = { type: string; lbs: string; condition?: number; };
type BycatchEntry = { species: string; lbs: string; usage?: string; };

// S124 Phase 3: the dgClose* data-map keys the generator reads for DG_CLOSE_DT, one per
// closeable Form-234 data group (§5.2.1). PCONS has two occurrences (bycatch + personal use);
// SAR closes as one block (whole-sub-card, S124 ruling); Landing (dgCloseLanding) is added in
// Phase 5. These are the keys hydrated into / written from the `closes` state.
const CLOSE_DATA_KEYS = [
  'dgCloseEffort', 'dgCloseBaitUsed', 'dgClosePconsBycatch', 'dgClosePconsPersonal',
  'dgCloseSar', 'dgCloseTransfer', 'dgCloseHlin', 'dgCloseHlout', 'dgCloseLanding',
] as const;

const MARINE_MAMMAL_OPTIONS = ['North Atlantic Right Whale', 'Humpback Whale', 'Fin Whale', 'Minke Whale', 'Harbour Porpoise', 'Grey Seal', 'Harbour Seal', 'Atlantic White-sided Dolphin', 'Other'];

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

type PickerField = 'sailed' | 'startHaul' | 'stopHaul' | 'landing' | 'mmTime' | 'sarTime';
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
  const [transfers, setTransfers] = useState('');
  const [transferYes, setTransferYes] = useState<boolean | null>(null);
  // QC(88) only — TRANSFER node fields (Rules 248-252) replace the legacy free-text
  const [transferTime, setTransferTime] = useState('');
  const [transferWt, setTransferWt] = useState('');
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
  const requiredFields = useMemo(() => new Set(fieldConfig.required), [fieldConfig]);
  const isVisible = (f: string) => visibleFields.has(f);
  const isRequired = (f: string) => requiredFields.has(f);

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
  const [hlinCompany, setHlinCompany] = useState('');
  const [hlinConfirmNo, setHlinConfirmNo] = useState('');
  const [hlinEta, setHlinEta] = useState('');
  const [hlinTotalWeight, setHlinTotalWeight] = useState('');
  const [hloutCompany, setHloutCompany] = useState('');
  const [hloutConfirmNo, setHloutConfirmNo] = useState('');

  // Per-section REM notes (T1). Mirrors LogRemarks; Catch & Effort writes haul+catch together.
  const [remarks, setRemarks] = useState<LogRemarks>({});
  const [noteOpen, setNoteOpen] = useState<Record<string, boolean>>({});
  const setNote = (key: keyof LogRemarks, value: string) =>
    setRemarks(prev => ({ ...prev, [key]: value }));
  const toggleNote = (openKey: string) =>
    setNoteOpen(prev => ({ ...prev, [openKey]: !prev[openKey] }));
  const renderNoteButton = (openKey: string) => (
    <TouchableOpacity style={styles.addNoteBtn} onPress={() => toggleNote(openKey)} activeOpacity={0.7}>
      <StickyNote size={13} color="#1E3A8A" />
      <Text style={styles.addNoteBtnText}>{t('form234.addNote')}</Text>
    </TouchableOpacity>
  );
  const renderNoteInput = (openKey: string, value: string, onChangeText: (v: string) => void) =>
    noteOpen[openKey] ? (
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

  // Quick capture — driven by global TimerContext, no local state needed
  const {
    sailActive, sailStartTime, sailElapsed,
    haulActive, haulStartTime, haulEndTime, haulElapsed,
    startSail, stopSail, startHaul, stopHaul,
  } = useTimer();

  // Marine Mammal
  const [mmYes, setMmYes] = useState<boolean | null>(null);
  const [mmSpecies, setMmSpecies] = useState('');
  const [mmSpeciesOther, setMmSpeciesOther] = useState('');
  const [mmWhat, setMmWhat] = useState('');
  const [mmLat, setMmLat] = useState('');
  const [mmLng, setMmLng] = useState('');
  const [mmDate, setMmDate] = useState('');
  const [mmTime, setMmTime] = useState('');
  const [mmDropdownOpen, setMmDropdownOpen] = useState(false);

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
  const [sarCondId, setSarCondId] = useState('');
  const [sarCondPickerOpen, setSarCondPickerOpen] = useState(false);
  // S121 multi-SAR: ADDITIONAL species-at-risk encounters (SAR node 2..n). Block 1 stays
  // the legacy sar* scalars above; gated on sarYes === true like block 1.
  const [extraSars, setExtraSars] = useState<ExtraSarDetail[]>([]);
  const [extraSarDropdown, setExtraSarDropdown] = useState<{ idx: number; kind: 'species' | 'cond' } | null>(null);
  const [sarGpsSrc, setSarGpsSrc] = useState<'gps' | 'manual'>('manual');

  // Lost Gear — REMOVED (S93): LOST_GEAR_IND is Blocked in the 234.12 XSD (maxOccurs=0).
  // FGRS handles lost/found gear reporting externally; no app capture.

  // DateTime picker
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerField, setPickerField] = useState<PickerField | null>(null);
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

  // Apply a stored DfoLog's fields into form state. Shared by the edit-load path AND the S95
  // crash-safety restore path (restoring the scratch draft is identical to opening a saved log).
  const hydrateFromLog = (log: DfoLog) => {
          setTripId(log.id);
          setLgbkUid(log.lgbkUid ?? '');
          setTripNum(log.tripNum);
          setFirstEntryDt(log.firstEntryDt ?? '');
          setDateFished(log.dateFished);
          setEditingCompleted(log.status === 'complete');
          setSubformId(log.subformId ?? 90);
          setRegId(log.regId ?? 1004);
          const d = log.data;
          setFmaId(d.fmaId ? Number(d.fmaId) : null);
          setLgridCodeId(d.lgridCodeId ? Number(d.lgridCodeId) : null);
          setLgridDisplay(d.lgridDisplay || '');
          setStatSectId(d.statSectId ? Number(d.statSectId) : null);
          setStatSectDisplay(d.statSectDisplay || '');
          setGridId(d.gridId ? Number(d.gridId) : null);
          setGridDisplay(d.gridDisplay || '');
          setCatchWeight(d.catchWeight || '');
          setTrapHauls(d.trapHauls || '');
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
          }
          setTransfers(d.transfers || '');
          setTransferTime(d.transferTime || '');
          setTransferWt(d.transferWt || '');
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
            setSarCondId(d.sarCondId || '');
            setSarGpsSrc(d.sarGpsSrc === 'gps' ? 'gps' : 'manual');
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
          setHlinCompany(d.hlinCompany || '');
          setHlinConfirmNo(d.hlinConfirmNo || '');
          setHlinEta(d.hlinEta || '');
          setHlinTotalWeight(d.hlinTotalWeight || '');
          setHloutCompany(d.hloutCompany || '');
          setHloutConfirmNo(d.hloutConfirmNo || '');
          // Per-section REM notes — restore existing; Catch & Effort uses haul+catch together.
          const r = log.remarks ?? {};
          const ce = r.catch ?? r.haul ?? '';
          const seeded: LogRemarks = {
            trip: r.trip ?? '', landing: r.landing ?? '', catch: ce, haul: ce,
            bait: r.bait ?? '', pcons: r.pcons ?? '', transfer: r.transfer ?? '',
            hlin: r.hlin ?? '', hlout: r.hlout ?? '', sar: r.sar ?? '',
          };
          setRemarks(seeded);
          setNoteOpen({
            trip: !!seeded.trip, landing: !!seeded.landing, catch: !!ce, bait: !!seeded.bait,
            pcons: !!seeded.pcons, transfer: !!seeded.transfer, hlin: !!seeded.hlin, hlout: !!seeded.hlout,
            sar: !!seeded.sar,
          });
  };

  useEffect(() => {
    const loadExisting = async () => {
      if (editingLogId) {
        const log = await loadLogById(editingLogId);
        if (log) hydrateFromLog(log);
      } else {
        // New log — today's date + fresh trip ID
        const today = formatDate(new Date());
        setDateFished(today);
        const captainProfile = await loadCaptainProfile();
        const profileSubformId = captainProfile.subformId ?? 90;
        setSubformId(profileSubformId);
        setRegId(captainProfile.regId ?? 1004);
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
    if (sailStartTime) setTimeSailed(sailStartTime);
  }, [sailStartTime]);

  useEffect(() => {
    if (haulStartTime) setTimeStartedHauling(haulStartTime);
  }, [haulStartTime]);

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
    if (haulEndTime && haulEndTime !== haulEndAtMountRef.current) {
      setTimeStoppedHauling(haulEndTime);
    }
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
    transferTime, transferWt, transferToVrn, transferToPndNum,
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
    // S121: additional SAR encounters — key written only when blocks exist (see
    // extraEffortDetails above for the rationale)
    ...(extraSars.length > 0 ? { extraSars: JSON.stringify(extraSars) } : {}),
    // lostGear* write-out removed (S93) — LOST_GEAR_IND Blocked in 234.12, no longer captured.
    // MAR-specific
    nbSpcmnBrd,
    // NL-specific (S110 Phase 2)
    nbSpcmnKept,
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
  // alertOnFail is opt-in: only the manual "Capture GPS" button surfaces a loud Alert on
  // failure. The auto-triggers (Stop Haul / MM=Yes / SAR=Yes) stay silent — every coord
  // they fill is either not a regulator field (MM) or hard-blocked before emit if empty
  // (effort LAT/LONG via validateElogXml Rule 3059; SAR LAT/LONG via handleSave + validator).
  const captureGps = async (
    setLat: (v: string) => void,
    setLng: (v: string) => void,
    opts?: { alertOnFail?: boolean }
  ) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (opts?.alertOnFail) Alert.alert(t('form234.gpsDeniedTitle'), t('form234.gpsDeniedBody'));
        return; // fields untouched
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
        return; // never write 0/blank coordinates on a bad fix
      }
      setLat(clampCoord4(String(lat)));
      setLng(clampCoord4(String(lng)));
    } catch (_e) {
      if (opts?.alertOnFail) Alert.alert(t('form234.gpsNoFixTitle'), t('form234.gpsNoFixBody'));
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const handleSailPress = async () => {
    if (!sailActive) {
      const now = new Date();
      await startSail();
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

  const handleHaulPress = async () => {
      // S124: EFFORT is closeable. Once Catch & Effort is closed, Quick Capture must not write
      // haul times / GPS into the frozen group — this closes the bypass (button also disabled).
      if (isClosed('dgCloseEffort')) return;
      if (!haulActive) {
        const now = new Date();
        await startHaul();
        // timeStartedHauling synced via useEffect on haulStartTime; stamp companion date now.
        setHaulStartDate(formatDate(now));
      } else {
        const now = new Date();
        stopHaul();
        // timeStoppedHauling synced via useEffect on haulEndTime; stamp companion date now.
        setHaulEndDate(formatDate(now));
        await captureGps(setGpsLat, setGpsLng);
        setGpsSrc('gps'); // §11.3: GPS-read coordinates → MODE="G"
      }
    };

  const handleMmYes = async (val: boolean) => {
    setMmYes(val);
    if (val) {
      Alert.alert('', t('form234.mmInterIndPrompt'), [{ text: tc('nav.ok') }]);
      const now = new Date();
      setMmDate(formatDate(now));
      setMmTime(formatTime(now));
      await captureGps(setMmLat, setMmLng);
    } else {
      setMmSpecies(''); setMmSpeciesOther(''); setMmWhat('');
      setMmLat(''); setMmLng(''); setMmDate(''); setMmTime('');
      setMmDropdownOpen(false);
    }
  };

  const handleSarYes = async (val: boolean) => {
    setSarYes(val);
    if (val) {
      Alert.alert('', t('form234.sarIndPrompt'), [{ text: tc('nav.ok') }]);
      const now = new Date();
      setSarDate(formatDate(now));
      setSarTime(formatTime(now));
      await captureGps(setSarLat, setSarLng);
      setSarGpsSrc('gps'); // §11.3: GPS-read SAR coords → MODE="G"
    } else {
      setSarSpecies(''); setSarSpeciesOther(''); setSarWhat('');
      setSarLat(''); setSarLng(''); setSarDate(''); setSarTime('');
      setSarNbSpcmn(''); setSarCondId(''); setSarGpsSrc('manual');
      setSarDropdownOpen(false); setSarCondPickerOpen(false);
      setExtraSars([]); setExtraSarDropdown(null); // S121: No clears the extra encounters too
    }
  };

  // handleLostGearYes removed (S93) — LOST_GEAR_IND Blocked in 234.12; question deleted below.

  const openPicker = (field: PickerField) => {
    let current: Date;
    switch (field) {
      case 'sailed':      current = parseDateTime(sailDate || dateFished, timeSailed); break;
      case 'startHaul':  current = parseDateTime(haulStartDate || dateFished, timeStartedHauling); break;
      case 'stopHaul':   current = parseDateTime(haulEndDate || dateFished, timeStoppedHauling); break;
      case 'landing':    current = parseDateTime(landingDate || dateFished, timeOfLanding); break;
      case 'mmTime':     current = parseDateTime(mmDate, mmTime); break;
      case 'sarTime':    current = parseDateTime(sarDate, sarTime); break;
    }
    if (Platform.OS === 'android') {
      // Imperative date→time flow — avoids the mode="datetime" unmount-dismiss crash (S95).
      openAndroidDateTime(current, (d) => applyPickerValueForField(field, d));
      return;
    }
    // iOS: stage into the Modal spinner (Done → applyPickerValue).
    setPickerDate(current);
    setTempDate(current);
    setPickerField(field);
    setPickerVisible(true);
  };

  // Writes the picked Date into the field's stored strings. Takes `field` explicitly so the
  // async Android imperative callback can never read a stale `pickerField` state value.
  const applyPickerValueForField = (field: PickerField | null, d: Date) => {
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
        case 'mmTime':
          setMmDate(formatDate(d)); setMmTime(formatTime(d)); break;
        case 'sarTime':
          setSarDate(formatDate(d)); setSarTime(formatTime(d)); break;
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
    setSheetDropdownOpen(false);
    setSheetVisible(true);
  };

  const handleSheetConfirm = () => {
    const finalType = sheetSelectedType === 'Other' ? sheetCustomType.trim() : sheetSelectedType;
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
      setBaitEntries(prev => [...prev, { type: finalType, lbs: sheetLbs.trim(), condition }]);
    } else {
      setBycatchEntries(prev => [...prev, { species: finalType, lbs: sheetLbs.trim(), usage: sheetUsage || undefined }]);
    }
    setSheetVisible(false);
  };

  const deleteBait = (index: number) => setBaitEntries(prev => prev.filter((_, i) => i !== index));
  const deleteBycatch = (index: number) => setBycatchEntries(prev => prev.filter((_, i) => i !== index));

  // Options carry codeId so a selection resolves its codeId from the chosen list entry
  // directly (never by re-matching the label string). The bycatch codeId is DISPLAY
  // metadata only (FR lookup) — BycatchEntry still persists just the label (S101b L3).
  const getSheetOptions = (): { label: string; codeId?: number }[] => {
    switch (sheetMode) {
      case 'bait': return getDfoBaitTypeList(subformId).map(b => ({ label: b.label, codeId: b.codeId }));
      case 'bycatch': return getDfoCatchSpeciesList(subformId).map(s => ({ label: s.label, codeId: s.codeId }));
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
    const row = getDfoCatchSpeciesList(subformId).find(s => s.label === label);
    return (row && SPECIES_FR.get(row.codeId)) || label;
  };
  const sheetTypeDisplay = (label: string): string =>
    sheetMode === 'bait' ? baitTypeDisplay(label) : bycatchSpeciesDisplay(label);

  // Display-only helper (S93): render a trip-timestamp as locale-aware date + time —
  // e.g. "Jul 5, 12:33" (EN) / "5 juill., 12:33" (FR). Combines the field's companion date
  // (fallback dateFished) with its HH:MM time. Storage, companion-date keys, and the generator
  // are UNTOUCHED — this only changes what the four Time Sailed/Hauling/Landing buttons render.
  const formatDateTimeDisplay = (dateStr: string, timeStr: string): string => {
    if (!timeStr) return '';
    const d = parseDateTime(dateStr || dateFished, timeStr);
    const locale = i18n.language.startsWith('fr') ? 'fr-CA' : 'en-CA';
    return `${d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}, ${timeStr}`;
  };

  const renderTimestampField = (
    label: string, value: string, field: PickerField, isProblem: boolean = false, isReq: boolean = false
  ) => (
    <View style={styles.fieldRow}>
      <View style={styles.labelRow}>
        {isProblem && <View style={styles.problemDot} />}
        <Text style={styles.label}>{label}{isReq && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
      </View>
      <TouchableOpacity style={styles.timeButton} onPress={() => { if (!readOnly) openPicker(field); }}>
        <Text style={[styles.timeButtonText, !value && styles.timeButtonPlaceholder]}>
          {value || t('form234.tapToSetDateTime')}
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

  // Collapsed one-line summary — S121 STOP-1a ruled format: "Grid 1589 — 420 lbs — 225 hauls".
  // Regions without a grid drop that segment; NL leads with its Statistical Section.
  const extraSummary = (e: ExtraEffortDetail): string => {
    const parts: string[] = [];
    if (subformId === 90 && e.lgridDisplay) parts.push(t('form234.summaryLgrid', { g: e.lgridDisplay }));
    if (subformId === 88 && e.gridDisplay) parts.push(t('form234.summaryGrid', { g: e.gridDisplay }));
    if (subformId === 91 && e.statSectDisplay) parts.push(e.statSectDisplay);
    if (e.catchWeight?.trim()) parts.push(t('form234.lbsSuffix', { lbs: e.catchWeight.trim() }));
    if (e.trapHauls?.trim()) parts.push(t('form234.haulsSuffix', { n: e.trapHauls.trim() }));
    return parts.length > 0 ? parts.join(' — ') : t('form234.effortBlockEmpty');
  };

  const extraField = (
    idx: number, label: string, key: keyof ExtraEffortDetail,
    keyboardType: any = 'numeric', isReq: boolean = false,
    onChange?: (v: string) => void
  ) => (
    <View style={styles.fieldRow}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}{isReq && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
      </View>
      <TextInput
        style={[styles.input, readOnly && styles.inputReadOnly]}
        value={(extraEfforts[idx]?.[key] as string) ?? ''}
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
    const showBlockCoords = subformId === 88 || subformId === 89 ||
      (subformId === 90 && fmaId === DFO_FMA_38B);
    return (
      <View key={i} style={styles.effortBlock}>
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
            <Text style={styles.effortBlockSummary} numberOfLines={1}>{extraSummary(e)}</Text>
          </TouchableOpacity>
        ) : (
          <>
            {/* MAR settlement grid — same list/gate as block 1 */}
            {subformId === 90 && fmaId !== null && (DFO_LGRID_BY_FMA[fmaId] ?? []).length > 0 && (
              <View style={styles.fieldRow}>
                <Text style={styles.label}>{t('form234.lgridLabel')}</Text>
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
                <Text style={styles.label}>{t('form234.gridLabel')}<Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text></Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => { if (readOnly) return; setGridSearch(''); setGridPickerTarget(i); setGridPickerOpen(true); }}
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
                <Text style={styles.label}>{t('form234.statSectLabel')}<Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text></Text>
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
            {extraField(i, t('form234.catchWeightLabel'), 'catchWeight', 'numeric', isRequired('catchWeight'))}
            {extraField(i, t('form234.trapHaulsLabel'), 'trapHauls', 'numeric', isRequired('trapHauls'))}
            {/* SOAKED_DUR: blocked for MAR(90); per-EFFORT_DETAIL for 88/89/91 */}
            {subformId !== 90 &&
              extraField(i, t('form234.soakDurationLabel'), 'soakDuration', 'decimal-pad', isRequired('soakDuration'))}
            {/* NB_VNTCH / NB_VNTCH_YOU: QC(88) FMA-gated (Rules 623-626) */}
            {subformId === 88 && fmaId != null && DFO_FMA_NB_VNTCH.has(fmaId) &&
              extraField(i, t('form234.nbVntchLabel'), 'vNotchCount', 'numeric', true)}
            {subformId === 88 && fmaId != null && DFO_FMA_NB_VNTCH_YOU.has(fmaId) &&
              extraField(i, t('form234.nbVntchYouLabel'), 'nbVntchYou', 'numeric', true)}
            {/* NL: specimens kept + trap size */}
            {subformId === 91 &&
              extraField(i, t('form234.nbSpcmnKeptLabel'), 'nbSpcmnKept', 'numeric', true)}
            {subformId === 91 && (
              <View style={styles.fieldRow}>
                <Text style={styles.label}>{t('form234.trapSizeLabel')}<Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text></Text>
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
              extraField(i, t('form234.nbSpcmnBrdLabel'), 'nbSpcmnBrd', 'numeric', true)}
            {/* Per-block GPS — QC/GLF mandatory (rows 82/83); MAR 38b (Rule 3059); NL blocked */}
            {showBlockCoords && (
              <>
                {!readOnly && (
                  <TouchableOpacity
                    style={styles.captureGpsBtn}
                    onPress={async () => {
                      setGpsCapturing(true);
                      await captureGps(
                        (v: string) => updateExtra(i, { gpsLat: v }),
                        (v: string) => updateExtra(i, { gpsLng: v }),
                        { alertOnFail: true }
                      );
                      updateExtra(i, { gpsSrc: 'gps' }); // §11.3: GPS-read coordinates → MODE="G"
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
                {extraField(i, t('form234.latitudeLabel'), 'gpsLat', 'numeric', subformId !== 90,
                  (v: string) => updateExtra(i, { gpsLat: v, gpsSrc: 'manual' }))}
                {extraField(i, t('form234.longitudeLabel'), 'gpsLng', 'numeric', subformId !== 90,
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

  const addExtraSar = async () => {
    // Mirror handleSarYes: stamp the encounter's date/time now and try a GPS fix
    const now = new Date();
    const idx = extraSars.length;
    setExtraSars(prev => [...prev, { date: formatDate(now), time: formatTime(now), gpsSrc: 'manual' }]);
    await captureGps(
      (v: string) => updateExtraSar(idx, { lat: v }),
      (v: string) => updateExtraSar(idx, { lng: v }),
    );
    updateExtraSar(idx, { gpsSrc: 'gps' }); // §11.3: GPS-read SAR coords → MODE="G"
  };

  const removeExtraSar = (idx: number) => {
    setExtraSars(prev => prev.filter((_, i) => i !== idx));
    if (extraSarDropdown?.idx === idx) setExtraSarDropdown(null);
  };

  const extraSarInput = (
    idx: number, label: string, key: keyof ExtraSarDetail,
    placeholder: string, keyboardType: any = 'default', isReq: boolean = false,
    onChange?: (v: string) => void
  ) => (
    <View style={styles.fieldRow}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}{isReq && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
      </View>
      <TextInput
        style={[styles.input, readOnly && styles.inputReadOnly]}
        value={(extraSars[idx]?.[key] as string) ?? ''}
        onChangeText={onChange ?? ((v: string) => updateExtraSar(idx, { [key]: v }))}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        editable={!readOnly}
        keyboardType={keyboardType}
      />
    </View>
  );

  // One additional SAR encounter — mirrors the block-1 field set (species / description /
  // date+time / coords / count / condition). Date and time are plain inputs seeded from
  // the moment the block was added, same auto-stamp as handleSarYes.
  const renderExtraSarBlock = (s: ExtraSarDetail, i: number) => (
    <View key={i} style={[styles.incidentBlock, { marginTop: 10 }]}>
      <View style={styles.effortBlockHeader}>
        <Text style={styles.effortBlockTitle}>{t('form234.sarBlockTitle', { n: i + 2 })}</Text>
        {!readOnly && !isClosed('dgCloseSar') && (
          <TouchableOpacity style={styles.deleteBtn} onPress={() => removeExtraSar(i)}>
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.label}>{t('form234.speciesLabel')}<Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text></Text>
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
          {MV_SAR_LIST.map(o => (
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
      <Text style={styles.label}>{t('form234.dateTimeLabel')}<Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text></Text>
      <View style={styles.gpsRow}>
        <TextInput
          style={[styles.input, { flex: 1 }, readOnly && styles.inputReadOnly]}
          value={s.date ?? ''}
          onChangeText={(v: string) => updateExtraSar(i, { date: v })}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#94A3B8"
          editable={!readOnly}
        />
        <View style={{ width: 8 }} />
        <TextInput
          style={[styles.input, { flex: 1 }, readOnly && styles.inputReadOnly]}
          value={s.time ?? ''}
          onChangeText={(v: string) => updateExtraSar(i, { time: v })}
          placeholder="HH:MM"
          placeholderTextColor="#94A3B8"
          editable={!readOnly}
          keyboardType="numbers-and-punctuation"
        />
      </View>
      <Text style={styles.label}>{t('form234.gpsLocationLabel')}<Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text></Text>
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
      {extraSarInput(i, t('form234.sarNbSpcmnLabel'), 'nbSpcmn', '0', 'numeric', true)}
      <View style={styles.fieldRow}>
        <Text style={styles.label}>{t('form234.sarCondLabel')}<Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text></Text>
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
    </View>
  );

  // ── S124 Phase 3: data-group closure (Close & Save Section) ──────────────────────────────
  const isClosed = (k: string) => !!closes[k];
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
  const closeSection = (dataKey: string, sectionTitleKey: string) => {
    if (readOnly || isClosed(dataKey)) return;
    Alert.alert(
      t('form234.closeConfirmTitle', { section: t(sectionTitleKey) }),
      t('form234.closeConfirmBody'),
      [
        { text: t('form234.closeConfirmNotYet'), style: 'cancel' },
        {
          text: t('form234.closeConfirmYes'),
          style: 'destructive',
          onPress: () => {
            const nowIso = new Date().toISOString();
            setCloses(prev => ({ ...prev, [dataKey]: nowIso }));
            if (isLoaded && !editingCompleted) {
              void saveLog({ ...buildDraftLog(), data: { ...buildLogData(), [dataKey]: nowIso } });
            }
          },
        },
      ],
    );
  };
  // Foot control: nothing when the group is unused; a lock + timestamp banner when closed; the
  // Close & Save Section button otherwise (hidden in read-only view).
  const renderCloseControl = (dataKey: string, sectionTitleKey: string, used: boolean, onClose?: () => void) => {
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
        <Text style={styles.closeSectionBtnText}>{t('form234.closeSectionButton')}</Text>
      </TouchableOpacity>
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
  const closeLanding = () => {
    if (readOnly || isClosed('dgCloseLanding')) return;
    const hasEffort = !!(catchWeight.trim() || trapHauls.trim() || timeStartedHauling.trim() ||
      timeStoppedHauling.trim()) || extraEfforts.length > 0;
    const proceed = () => closeSection('dgCloseLanding', 'form234.landingSection');
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

  const renderField = (
    label: string, value: string, setter: (v: string) => void,
    placeholder: string, isProblem: boolean = false,
    fieldReadOnly: boolean = false, keyboardType: any = 'default', isReq: boolean = false
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
      />
    </View>
  );

  const renderYesNoToggle = (
    label: string,
    value: boolean | null,
    onToggle: (v: boolean) => void
  ) => (
    <View style={styles.yesNoRow}>
      <Text style={styles.yesNoLabel}>{label}</Text>
      <View style={styles.yesNoButtons}>
        <TouchableOpacity
          style={[styles.yesNoBtn, value === false && styles.yesNoBtnNoActive]}
          onPress={() => { if (!readOnly) onToggle(false); }}
        >
          <Text style={[styles.yesNoBtnText, value === false && styles.yesNoBtnNoText]}>{tc('common.no')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.yesNoBtn, value === true && styles.yesNoBtnYesActive]}
          onPress={() => { if (!readOnly) onToggle(true); }}
        >
          <Text style={[styles.yesNoBtnText, value === true && styles.yesNoBtnYesText]}>{tc('common.yes')}</Text>
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
    pickerFieldName: PickerField
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
    <View style={styles.incidentBlock}>
      <Text style={styles.label}>{t('form234.speciesLabel')}</Text>
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
      {renderTimestampField(t('form234.dateTimeLabel'), dateStr && timeStr ? `${dateStr} ${timeStr}` : '', pickerFieldName)}

      <Text style={[styles.label, { marginTop: 6 }]}>{t('form234.gpsLocationLabel')}</Text>
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
  const openUsedGroups = (): string[] => {
    const hlFma = fmaId === 28599 || fmaId === 1595;
    const used: Record<string, boolean> = {
      dgCloseEffort: true, // always used in Phase 3/4 (Phase 6 makes EFFORT optional)
      dgCloseLanding: true, // LANDING is always used (port landed is mandatory); Rule 1052's
      // no-effort warning is moot on the save path here — the save-gate requires effort fields.
      dgCloseBaitUsed: baitEntries.length > 0,
      dgClosePconsBycatch: bycatchYes === true && bycatchEntries.length > 0,
      dgClosePconsPersonal: personalUse.trim().length > 0,
      dgCloseSar: sarYes === true,
      dgCloseTransfer: subformId === 88 && transferYes === true,
      dgCloseHlin: hlFma && !!(hlinCompany || hlinConfirmNo),
      dgCloseHlout: hlFma && !!(hloutCompany || hloutConfirmNo),
    };
    return Object.keys(used).filter(k => used[k] && !isClosed(k));
  };

  const handleSave = async () => {
    // S124 Phase 1: bait is now OPTIONAL (Rule 1051 — the app must not force a data group; a
    // gear-retrieval day baits nothing). This gate stays but goes quiet on its own now that
    // 'baitEntries' is out of every subform's `required` array (isRequired → false); it still
    // guards correctly if a future subform re-requires bait.
    if (isRequired('baitEntries') && baitEntries.length === 0) {
      Alert.alert(t('form234.missingFieldsTitle'), t('form234.missingBait'), [{ text: tc('nav.ok') }]);
      return;
    }
    // Mandatory-once-used: bait is optional, but once an entry EXISTS the BAIT_USED node's own
    // mandatory elements must be present — BT_TYP_ID + BT_WT always, BT_COND_ID where Rule 3060
    // (MAR) / 984 (QC-GLF) escalates condition to mandatory. The add-sheet enforces this at
    // creation (handleSheetConfirm :937/:941/:955); this backstops hydrated/legacy drafts, with
    // validateElogXml as the send-time backstop. Reuses the add-sheet prompt strings.
    {
      const baitList = getDfoBaitTypeList(subformId);
      for (const e of baitEntries) {
        if (!e.type?.trim()) {
          Alert.alert(t('form234.missingFieldsTitle'), t('form234.pleaseSelectBait'), [{ text: tc('nav.ok') }]);
          return;
        }
        if (!e.lbs?.trim()) {
          Alert.alert(t('form234.missingFieldsTitle'), t('form234.pleaseEnterWeight'), [{ text: tc('nav.ok') }]);
          return;
        }
        const codeId = baitList.find(b => b.label === e.type)?.codeId ?? 0;
        if (baitConditionState(subformId, codeId) === 'mandatory' && e.condition == null) {
          Alert.alert(t('form234.missingFieldsTitle'), t('form234.pleaseSelectBaitCondition'), [{ text: tc('nav.ok') }]);
          return;
        }
      }
    }
    if (bycatchYes === null) {
      Alert.alert(t('form234.missingFieldsTitle'), t('form234.missingBycatchAnswer'), [{ text: tc('nav.ok') }]);
      return;
    }
    if (bycatchYes === true && bycatchEntries.length === 0) {
      Alert.alert(t('form234.missingFieldsTitle'), t('form234.missingBycatchEntries'), [{ text: tc('nav.ok') }]);
      return;
    }
    if (subformId === 88 && transferYes === null) {
      Alert.alert(t('form234.missingFieldsTitle'), t('form234.missingTransferAnswer'), [{ text: tc('nav.ok') }]);
      return;
    }
    // TRANSFER companion fields (QC-88): when a transfer is being recorded, the transfer
    // time (TRNSF_DT), weight, and a destination (vessel VRN or pound number) are all
    // mandatory for the TRANSFER/TRANSFER_DTL node (Rules 248/251/252). Block early with a
    // friendly per-field prompt — mirrors the SAR detail gate below — so a blank transfer
    // time can't reach the generator and launder to midnight (Session 76).
    if (subformId === 88 && transferYes === true &&
        (!transferTime.trim() || !transferWt.trim() || (!transferToVrn.trim() && !transferToPndNum.trim()))) {
      Alert.alert(t('form234.missingFieldsTitle'), t('form234.missingTransferFields'), [{ text: tc('nav.ok') }]);
      return;
    }
    // SAR_IND / MM_INTER_IND are mandatory Y/N on EFFORT for ALL four subforms (XSD
    // effort_type, minOccurs=1) — no subform condition. validateElogXml is the send-time
    // backstop; this catches it early with a clear message instead of a cryptic one.
    // (LOST_GEAR_IND dropped from this gate — Blocked in 234.12, no longer answered.)
    if (mmYes === null || sarYes === null) {
      Alert.alert(t('form234.missingFieldsTitle'), t('form234.missingIndicatorsAnswer'), [{ text: tc('nav.ok') }]);
      return;
    }
    // SAR detail (S66b): when SAR_IND='Y' the sar_type children SAR_DT/LAT/LONG/SPECIE_ID/
    // NB_SPCMN/SPCMN_COND_ID are all mandatory (XSD sar_type, minOccurs=1). Block early with a
    // clear message; validateElogXml is the send-time backstop once the node is emitted.
    if (sarYes === true && (!sarSpecies || !sarNbSpcmn.trim() || !sarCondId ||
        !sarLat.trim() || !sarLng.trim() || !sarDate || !sarTime)) {
      Alert.alert(t('form234.missingFieldsTitle'), t('form234.missingSarFields'), [{ text: tc('nav.ok') }]);
      return;
    }
    // S121 multi-SAR: every additional encounter must satisfy the same mandatory set
    if (sarYes === true && extraSars.some(s => !s.species || !s.nbSpcmn?.trim() || !s.condId ||
        !s.lat?.trim() || !s.lng?.trim() || !s.date || !s.time)) {
      Alert.alert(t('form234.missingFieldsTitle'), t('form234.missingSarFields'), [{ text: tc('nav.ok') }]);
      return;
    }

    const fieldCheckMap: Record<string, string> = {
      startDt:     dateFished,
      fmaId:       fmaId ? String(fmaId) : '',
      lgridCodeId: DFO_FMA_LGRID_REQUIRED.has(fmaId ?? 0) ? (lgridDisplay || '') : 'ok',
      statSectId:  DFO_FMA_STAT_SECT_REQUIRED.has(fmaId ?? 0) ? (statSectDisplay || '') : 'ok',
      gridId:      (fmaId != null && fmaId in DFO_FMA_GRID_MAP) ? (gridDisplay || '') : 'ok',
      catchWeight,
      trapHauls,
      lgbkUid,
      firstEntryDt,
      crewNb:      crewMembers.length > 0 ? 'ok' : '',
      portId:      portLanded,
      trapSize,
      gearSubtypeId,
      // S110 Phase 2: NL-only NB_SPCMN_KEPT (Rule 976) — listed in FULL_DFO_REQUIRED_FIELDS[91] only.
      nbSpcmnKept,
      operName:    'ok',
      // S110 G1: EFFORT_DETAIL LAT/LONG Mandatory for QC(88)/GLF(89) (Subforms rows 82/83).
      // Listed in FULL_DFO_REQUIRED_FIELDS for 88/89 only, so MAR/NL gates are unchanged.
      gpsCoords:   gpsLat.trim() && gpsLng.trim() ? 'ok' : '',
      sailTime:      timeSailed,
      haulStartTime: timeStartedHauling,
      haulEndTime:   timeStoppedHauling,
      landingTime:   timeOfLanding,
    };
    const fieldLabels: Record<string, string> = {
      startDt:     'Date Fished',
      fmaId:       'Fishing Area (LFA)',
      lgridCodeId: 'Lobster Settlement Grid',
      statSectId:  'Statistical Section',
      gridId:      'Grid',
      catchWeight: 'Lobster Catch Weight',
      trapHauls:   'Trap Hauls',
      lgbkUid:     'Log Book UID',
      firstEntryDt:'First Entry Date',
      crewNb:      'Crew Registry',
      portId:      'Port Landed',
      trapSize:    'Trap Size',
      gearSubtypeId: 'Gear Subtype',
      nbSpcmnKept: 'Number of specimens kept',
      operName:    'Operator Name (Captain Profile)',
      gpsCoords:   'GPS Coordinates (Latitude/Longitude)',
      sailTime:      'Time Sailed',
      haulStartTime: 'Time Started Hauling',
      haulEndTime:   'Time Stopped Hauling',
      landingTime:   'Time of Landing',
    };
    const required = getRequiredFields(subformId);
    const missing: string[] = [];
    for (const field of required) {
      const val = fieldCheckMap[field] ?? '';
      if (!val || val.trim() === '') missing.push(fieldLabels[field] ?? field);
    }

    // S121: every additional catch-effort block must satisfy the same per-block required
    // fields as block 1 (same FMA gates), plus soak where the validator mandates SOAKED_DUR
    // (88/89/91) so the user gets a friendly prompt instead of a raw validator error.
    extraEfforts.forEach((e, i) => {
      const blockMissing: string[] = [];
      if (!e.catchWeight?.trim()) blockMissing.push(fieldLabels.catchWeight);
      if (!e.trapHauls?.trim()) blockMissing.push(fieldLabels.trapHauls);
      if (subformId !== 90 && !e.soakDuration?.trim()) blockMissing.push(t('form234.soakDurationLabel'));
      if ((subformId === 88 || subformId === 89) && !(e.gpsLat?.trim() && e.gpsLng?.trim())) blockMissing.push(fieldLabels.gpsCoords);
      if (subformId === 90 && DFO_FMA_LGRID_REQUIRED.has(fmaId ?? 0) && !e.lgridDisplay) blockMissing.push(fieldLabels.lgridCodeId);
      if (subformId === 88 && fmaId != null && fmaId in DFO_FMA_GRID_MAP && !e.gridDisplay) blockMissing.push(fieldLabels.gridId);
      if (subformId === 91) {
        if (DFO_FMA_STAT_SECT_REQUIRED.has(fmaId ?? 0) && !e.statSectDisplay) blockMissing.push(fieldLabels.statSectId);
        if (!e.trapSize) blockMissing.push(fieldLabels.trapSize);
        if (!e.nbSpcmnKept?.trim()) blockMissing.push(fieldLabels.nbSpcmnKept);
      }
      blockMissing.forEach(lbl => missing.push(`${t('form234.catchEffortBlock', { n: i + 2 })} — ${lbl}`));
    });

    if (missing.length > 0) {
      Alert.alert(
        t('form234.missingFieldsTitle'),
        `${t('form234.missingFieldsBody')}${missing.join('\n• ')}`,
        [{ text: tc('nav.ok') }]
      );
      return;
    }

    // Rule 980: WARNING (non-blocking) when the landing date/time is more than 24 hours in the
    // future — a likely input error. Compute here and surface it chained BEFORE the close-all
    // confirm so the two alerts don't stack. Uses the landing field's own date (S90 multi-day).
    let landingWarn = false;
    const landDateStr = landingDate || dateFished;
    if (landDateStr && timeOfLanding) {
      const [ly, lm, ld] = landDateStr.split('-').map(Number);
      const [lh, lmin] = timeOfLanding.split(':').map(Number);
      const landMs = new Date(ly, (lm ?? 1) - 1, ld ?? 1, lh ?? 0, lmin ?? 0).getTime();
      if (!isNaN(landMs) && landMs > Date.now() + 24 * 3600 * 1000) landingWarn = true;
    }

    // S124 Phase 4: "Close & Save All" — this complete-save path closes every USED group still
    // open, with ONE shared timestamp. The draft paths (Back / saveDraft / autosave) are
    // untouched and still close nothing — only closeSection and this path ever stamp a close.
    const openUsed = openUsedGroups();

    // Persist as a complete log, merging the close-all stamps into the data map.
    const persist = (extraCloses: Record<string, string>) => {
      if (Object.keys(extraCloses).length) setCloses(prev => ({ ...prev, ...extraCloses }));
      const log: DfoLog = {
        id: tripId,
        lgbkUid,
        firstEntryDt,
        mode: 'full',
        status: 'complete',
        dateFished,
        createdAt: Date.now(),
        data: { ...buildLogData(), ...extraCloses },
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
    const confirmThenSave = () => {
      if (openUsed.length > 0) {
        const stamp = new Date().toISOString();
        const extra = Object.fromEntries(openUsed.map(k => [k, stamp]));
        Alert.alert(
          t('form234.closeAllConfirmTitle'),
          t('form234.closeAllConfirmBody', { count: openUsed.length }),
          [
            { text: t('form234.closeConfirmNotYet'), style: 'cancel' },
            { text: t('form234.closeAllConfirmYes'), style: 'destructive', onPress: () => persist(extra) },
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

    if (landingWarn) {
      Alert.alert(t('form234.landing24hWarningTitle'), t('form234.landing24hWarningBody'), [{ text: tc('nav.ok'), onPress: confirmThenSave }]);
    } else {
      confirmThenSave();
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
              style={[styles.captureBtn, sailActive && styles.captureBtnActive]}
              onPress={handleSailPress}
            >
              {sailActive
                ? <Square size={18} color="#FFFFFF" />
                : <Play size={18} color={timeSailed ? '#15803D' : '#1E3A8A'} />}
              <Text style={[
                styles.captureBtnText,
                sailActive && styles.captureBtnTextActive,
                !sailActive && !!timeSailed && styles.captureBtnTextDone,
              ]}>
                {sailActive
                  ? `${t('form234.stopSail')}  ${sailElapsed}`
                  : timeSailed ? t('form234.sailed', { time: timeSailed }) : t('form234.startSail')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.captureBtn, haulActive && styles.captureBtnActive, isClosed('dgCloseEffort') && styles.captureBtnDisabled]}
              onPress={handleHaulPress}
              disabled={isClosed('dgCloseEffort')}
            >
              {haulActive
                ? <Square size={18} color="#FFFFFF" />
                : <Play size={18} color={timeStartedHauling ? '#15803D' : '#1E3A8A'} />}
              <Text style={[
                styles.captureBtnText,
                haulActive && styles.captureBtnTextActive,
                !haulActive && !!timeStartedHauling && styles.captureBtnTextDone,
              ]}>
                {haulActive
                  ? `${t('form234.stopHaul')}  ${haulElapsed}`
                  : timeStartedHauling
                    ? t('form234.hauledRange', { start: timeStartedHauling, end: timeStoppedHauling || '?' })
                    : t('form234.startHaul')}
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
          {/* DATE FISHED — date picker, auto-fills today on new log */}
          <View style={styles.fieldRow}>
            <Text style={styles.label}>{t('form234.dateFishedLabel')}</Text>
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
          <View style={styles.fieldRow}>
            <Text style={styles.label}>{t('form234.departurePortLabel')}</Text>
            <DfoPortSelector
              value={departurePort}
              codeId={departurePortCodeId}
              subformId={subformId}
              placeholder={t('form234.selectDeparturePort')}
              disabled={readOnly}
              onChange={(sel) => { setDeparturePort(sel.name); setDeparturePortCodeId(sel.codeId); }}
            />
          </View>
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
          {isVisible('landingTime') && renderTimestampField(t('form234.timeOfLandingLabel'), formatDateTimeDisplay(landingDate, timeOfLanding), 'landing', false, isRequired('landingTime'))}
          </View>
          {renderCloseControl('dgCloseLanding', 'form234.landingSection', true, closeLanding)}
        </View>

        {/* S124 Phase 5: the Timestamps card is DISSOLVED — time sailed → Trip Info (above);
            haul start/stop + soak → Catch & Effort (below); landing → the Landing card (above). */}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#DCFCE7' }]}><Scale size={16} color="#15803D" /></View>
            <Text style={styles.sectionTitle}>{t('form234.catchEffortSection')}</Text>
            {renderNoteButton('catch')}
          </View>
          <View {...closedBodyProps('dgCloseEffort')}>
          {renderNoteInput('catch', remarks.catch ?? '', (v) => { setNote('catch', v); setNote('haul', v); })}
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

                    {/* LGRID Selector — shown for any FMA that has a grid list */}
                    {fmaId !== null && (DFO_LGRID_BY_FMA[fmaId] ?? []).length > 0 && (
                      <View style={styles.fieldRow}>
                        <Text style={styles.label}>{t('form234.lgridLabel')}</Text>
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
                        <Text style={styles.label}>{t('form234.statSectLabel')}<Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text></Text>
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
                        <Text style={styles.label}>{t('form234.gridLabel')}<Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text></Text>
                        <TouchableOpacity
                          style={styles.timeButton}
                          onPress={() => { if (readOnly) return; setGridSearch(''); setGridPickerTarget(-1); setGridPickerOpen(true); setFmaPickerOpen(false); }}
                        >
                          <Text style={[styles.timeButtonText, !gridDisplay && styles.timeButtonPlaceholder]}>
                            {gridDisplay || t('form234.selectQcGrid')}
                          </Text>
                          <ChevronDown size={16} color="#64748B" />
                        </TouchableOpacity>
                        {/* Phase 2.7: list+search live in a Modal overlay (NOT in the form
                            ScrollView) so the FlatList is no longer a nested VirtualizedList. */}
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
                                    // S121: the Modal serves block 1 (target -1) AND the extra blocks
                                    const active = gridPickerTarget === -1
                                      ? gridId === g.codeId
                                      : (extraEfforts[gridPickerTarget]?.gridId ?? '') === String(g.codeId);
                                    return (
                                    <TouchableOpacity
                                      style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                                      onPress={() => {
                                        if (gridPickerTarget === -1) {
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
                      </View>
                    )}
          {renderField(t('form234.catchWeightLabel'), catchWeight, setCatchWeight, '0', false, false, 'numeric', isRequired('catchWeight'))}
          {renderField(t('form234.trapHaulsLabel'), trapHauls, setTrapHauls, '0', false, false, 'numeric', isRequired('trapHauls'))}
          {/* S124: soak (block-1 EFFORT_DETAIL) stays here with block 1's fields. The two haul
              times are EFFORT-level (one pair per node) and render AFTER the extra blocks, below. */}
          {isVisible('soakDuration') && renderField(t('form234.soakDurationLabel'), soakDuration, setSoakDuration, t('form234.soakDurationPlaceholder'), false, false, 'decimal-pad', isRequired('soakDuration'))}
          {/* NB_SPCMN_KEPT: NL(91) only — mandatory on the lobster catch (Rule 976), blocked
              for QC/GLF/MAR (Subforms row 93). isVisible-gated so 88/89/90 screens are
              pixel-identical to pre-S110 (S110 Phase 2). */}
          {isVisible('nbSpcmnKept') &&
            renderField(t('form234.nbSpcmnKeptLabel'), nbSpcmnKept, setNbSpcmnKept, '0', false, false, 'numeric', true)}
          {/* NB_VNTCH / NB_VNTCH_YOU: QC(88) only, mandatory in the Rule 623/625 FMA lists, blocked elsewhere */}
          {subformId === 88 && fmaId != null && DFO_FMA_NB_VNTCH.has(fmaId) &&
            renderField(t('form234.nbVntchLabel'), vNotchCount, setVNotchCount, '0', false, false, 'numeric', true)}
          {subformId === 88 && fmaId != null && DFO_FMA_NB_VNTCH_YOU.has(fmaId) &&
            renderField(t('form234.nbVntchYouLabel'), nbVntchYou, setNbVntchYou, '0', false, false, 'numeric', true)}
          {/* NB_SPCMN_BRD: MAR(90) FMA 38b only — mandatory there (Rule 654), blocked elsewhere (Rule 655) */}
          {isVisible('nbSpcmnBrd') && fmaId === DFO_FMA_38B &&
            renderField(t('form234.nbSpcmnBrdLabel'), nbSpcmnBrd, setNbSpcmnBrd, '0', false, false, 'numeric', true)}
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
          {/* GEAR_SBTYP_ID: NL(91) only — mandatory (Subforms_requirements_234.xlsx row 75),
              blocked for 88/89/90. Values from DFO_GEAR_SUBTYPE_LIST (39684 Wooden /
              39685 Wire mesh / 39686 Both); display via i18n gearSubtypeOption_<codeId>
              (FR per MV_GEAR_SUBTYPE_rel7 = the FS234 Rule-611 block), .label fallback. */}
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
          {/* S121 multi-grid: additional catch-effort blocks (EFFORT_DETAIL 2..n), each with
              its own grid, weight, hauls, and region fields. Block 1 = the fields above. */}
          {extraEfforts.map((e, i) => renderExtraEffortBlock(e, i))}
          {!readOnly && !isClosed('dgCloseEffort') && (
            <TouchableOpacity style={[styles.addBtn, { marginTop: 4 }]} onPress={addExtraEffort}>
              <Plus size={16} color="#1E3A8A" />
              <Text style={styles.addBtnText}>{t('form234.addCatchEffort')}</Text>
            </TouchableOpacity>
          )}
          {/* S124: the two haul times are EFFORT-level (START_DT / END_DT — one pair for the whole
              node), so they render AFTER every EFFORT_DETAIL block, not inside block 1's fields. */}
          <View style={{ height: 14 }} />
          {isVisible('haulStartTime') && renderTimestampField(t('form234.timeStartedHaulingLabel'), formatDateTimeDisplay(haulStartDate, timeStartedHauling), 'startHaul', false, isRequired('haulStartTime'))}
          {isVisible('haulEndTime') && renderTimestampField(t('form234.timeStoppedHaulingLabel'), formatDateTimeDisplay(haulEndDate, timeStoppedHauling), 'stopHaul', false, isRequired('haulEndTime'))}
          </View>
          {/* EFFORT close — one closure regardless of grid-block count (EFFORT_DETAIL is a
              child of EFFORT). Always "used" in Phase 3; Phase 6 makes EFFORT optional. */}
          {renderCloseControl('dgCloseEffort', 'form234.catchEffortSection', true)}
        </View>

        {isVisible('baitEntries') && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#FEE2E2' }]}><Fish size={16} color="#B91C1C" /></View>
            <Text style={styles.sectionTitle}>{t('form234.baitReportingSection')}{isRequired('baitEntries') && <Text style={{ color: REQUIRED_ASTERISK_COLOR, fontSize: 13 }}> *</Text>}</Text>
            {renderNoteButton('bait')}
          </View>
          <View {...closedBodyProps('dgCloseBaitUsed')}>
          {renderNoteInput('bait', remarks.bait ?? '', (v) => setNote('bait', v))}
          {baitEntries.length === 0 && <Text style={styles.emptyHint}>{t('form234.noBaitYet')}</Text>}
          {baitEntries.map((entry, i) => (
            <View key={i} style={styles.entryRow}>
              <View style={styles.entryInfo}>
                <Text style={styles.entryType}>{baitTypeDisplay(entry.type)}</Text>
                <Text style={styles.entryLbs}>{t('form234.lbsSuffix', { lbs: entry.lbs })}</Text>
              </View>
              {!readOnly && !isClosed('dgCloseBaitUsed') && (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteBait(i)}>
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {!readOnly && !isClosed('dgCloseBaitUsed') && (
            <TouchableOpacity style={styles.addBtn} onPress={() => openSheet('bait')}>
              <Plus size={16} color="#1E3A8A" />
              <Text style={styles.addBtnText}>{t('form234.addBait')}</Text>
            </TouchableOpacity>
          )}
          </View>
          {renderCloseControl('dgCloseBaitUsed', 'form234.baitReportingSection', baitEntries.length > 0)}
        </View>
        )}

        {/* GPS section: isVisible-gated (S110 Phase 3) — 'gpsCoords' is in the 88/89/90
            visible configs, ABSENT from 91 (rows 82/83: LAT/LONG Blocked for NL; the sheet
            legend says Blocked = "the application must prevent the entry"). Stored
            gpsLat/gpsLng on existing NL drafts is untouched — state still hydrates and
            buildLogData still writes it; the generator never emits it for 91 (Phase 1). */}
        {isVisible('gpsCoords') && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#E0E7FF' }]}><MapPin size={16} color="#4338CA" /></View>
            <Text style={styles.sectionTitle}>{t('form234.gpsCoordinatesSection')}</Text>
          </View>
          {/* S124: GPS coords are block-1 EFFORT_DETAIL LAT/LONG — part of EFFORT. This is a
              separate card, so freeze its body + drop the capture button when EFFORT is closed
              (lock-bypass audit fix). No own close control — it closes with Catch & Effort. */}
          <View {...closedBodyProps('dgCloseEffort')}>
          {!readOnly && !isClosed('dgCloseEffort') && (
            <TouchableOpacity
              style={styles.captureGpsBtn}
              onPress={async () => {
                setGpsCapturing(true);
                await captureGps(setGpsLat, setGpsLng, { alertOnFail: true });
                setGpsSrc('gps'); // §11.3: GPS-read coordinates → MODE="G"
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
          {renderField(t('form234.latitudeLabel'), gpsLat, (v: string) => { setGpsLat(v); setGpsSrc('manual'); }, '0.0000', false, false, 'numeric')}
          {renderField(t('form234.longitudeLabel'), gpsLng, (v: string) => { setGpsLng(v); setGpsSrc('manual'); }, '0.0000', false, false, 'numeric')}
          </View>
        </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#FEF3C7' }]}><Anchor size={16} color="#B45309" /></View>
            <Text style={styles.sectionTitle}>{t('form234.interactionsSection')}</Text>
            {renderNoteButton('pcons')}
          </View>
          {renderNoteInput('pcons', remarks.pcons ?? '', (v) => setNote('pcons', v))}

          {/* Bycatch */}
          <View style={[styles.incidentSection, { marginBottom: 12 }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#EDE9FE' }]}>
                <AlertTriangle size={16} color="#7C3AED" />
              </View>
              <Text style={[styles.sectionTitle, { fontSize: 13 }]}>{t('form234.bycatchSubsection')}</Text>
            </View>
            <View {...closedBodyProps('dgClosePconsBycatch')}>
            {renderYesNoToggle(t('form234.bycatchQuestion'), bycatchYes, (val) => {
              setBycatchYes(val);
              if (!val) setBycatchEntries([]);
            })}
            {bycatchYes === true && (
              <View style={styles.incidentBlock}>
                {bycatchEntries.length === 0 && <Text style={styles.emptyHint}>{t('form234.noBycatchYet')}</Text>}
                {bycatchEntries.map((entry, i) => (
                  <View key={i} style={styles.entryRow}>
                    <View style={styles.entryInfo}>
                      <Text style={styles.entryType}>{bycatchSpeciesDisplay(entry.species)}</Text>
                      {entry.usage && (
                        <Text style={[styles.entryLbs, { color: '#64748B' }]}>{t(`form234.usageOption_${entry.usage}`)}</Text>
                      )}
                      <Text style={styles.entryLbs}>{t('form234.lbsSuffix', { lbs: entry.lbs })}</Text>
                    </View>
                    {!readOnly && !isClosed('dgClosePconsBycatch') && (
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteBycatch(i)}>
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {!readOnly && !isClosed('dgClosePconsBycatch') && (
                  <TouchableOpacity style={[styles.addBtn, { marginTop: 4 }]} onPress={() => openSheet('bycatch')}>
                    <Plus size={16} color="#1E3A8A" />
                    <Text style={styles.addBtnText}>{t('form234.addBycatch')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            </View>
            {renderCloseControl('dgClosePconsBycatch', 'form234.bycatchSubsection', bycatchYes === true && bycatchEntries.length > 0)}
          </View>

          <View style={styles.incidentSection}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#EDE9FE' }]}>
                <AlertTriangle size={16} color="#7C3AED" />
              </View>
              <Text style={[styles.sectionTitle, { fontSize: 13 }]}>{t('form234.mmSubsection')}</Text>
            </View>
            {renderYesNoToggle(t('form234.mmInterIndLabel'), mmYes, handleMmYes)}
            {mmYes === true && renderIncidentFields(
              mmSpecies, setMmSpecies,
              mmSpeciesOther, setMmSpeciesOther,
              mmDropdownOpen, setMmDropdownOpen,
              MARINE_MAMMAL_OPTIONS,
              mmWhat, setMmWhat,
              mmLat, setMmLat,
              mmLng, setMmLng,
              mmDate, mmTime, 'mmTime'
            )}
          </View>

          <View style={styles.incidentSection}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#EDE9FE' }]}>
                <AlertTriangle size={16} color="#7C3AED" />
              </View>
              <Text style={[styles.sectionTitle, { fontSize: 13 }]}>{t('form234.sarSubsection')}</Text>
              {renderNoteButton('sar')}
            </View>
            <View {...closedBodyProps('dgCloseSar')}>
            {renderNoteInput('sar', remarks.sar ?? '', (v) => setNote('sar', v))}
            {renderYesNoToggle(t('form234.sarIndLabel'), sarYes, handleSarYes)}
            {sarYes === true && renderIncidentFields(
              sarSpecies, setSarSpecies,
              sarSpeciesOther, setSarSpeciesOther,
              sarDropdownOpen, setSarDropdownOpen,
              MV_SAR_LIST,
              sarWhat, setSarWhat,
              sarLat, (v: string) => { setSarLat(v); setSarGpsSrc('manual'); },
              sarLng, (v: string) => { setSarLng(v); setSarGpsSrc('manual'); },
              sarDate, sarTime, 'sarTime'
            )}
            {sarYes === true && (
              <>
                {renderField(t('form234.sarNbSpcmnLabel'), sarNbSpcmn, setSarNbSpcmn, '0', false, false, 'numeric', true)}
                <View style={styles.fieldRow}>
                  <Text style={styles.label}>{t('form234.sarCondLabel')}<Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text></Text>
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
                {/* S121 multi-SAR: additional encounters (SAR node 2..n), each its own
                    species/date/coords/count/condition. Block 1 = the fields above. */}
                {extraSars.map((s, i) => renderExtraSarBlock(s, i))}
                {!readOnly && !isClosed('dgCloseSar') && (
                  <TouchableOpacity style={[styles.addBtn, { marginTop: 10 }]} onPress={() => { void addExtraSar(); }}>
                    <Plus size={16} color="#1E3A8A" />
                    <Text style={styles.addBtnText}>{t('form234.addSarEncounter')}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            </View>
            {renderCloseControl('dgCloseSar', 'form234.sarSubsection', sarYes === true)}
          </View>

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
                {renderField(t('form234.carrierVrnLabel'), carrierVrn, setCarrierVrn, '0', false, false, 'numeric', true)}
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
              if (!val) { setTransfers(''); setTransferTime(''); setTransferWt(''); setTransferToVrn(''); setTransferToPndNum(''); }
            })}
            {transferYes === true && (
              <View style={styles.incidentBlock}>
                {renderField(t('form234.transferTimeLabel'), transferTime, setTransferTime, 'HH:MM', false, false, 'numbers-and-punctuation', true)}
                {renderField(t('form234.transferWtLabel'), transferWt, setTransferWt, '0', false, false, 'numeric', true)}
                {renderField(t('form234.transferToVrnLabel'), transferToVrn, (v: string) => { setTransferToVrn(v); if (v) setTransferToPndNum(''); }, '0', false, false, 'numeric')}
                {renderField(t('form234.transferToPndNumLabel'), transferToPndNum, (v: string) => { setTransferToPndNum(v); if (v) setTransferToVrn(''); }, '', false, false, 'default')}
                <Text style={styles.emptyHint}>{t('form234.transferToHint')}</Text>
              </View>
            )}
            </View>
            {renderCloseControl('dgCloseTransfer', 'form234.transfersSubsection', transferYes === true)}
          </View>}

          {/* PCONS occurrence #2 — Personal Use, its own sub-card so it closes independently
              of the Bycatch occurrence (S124 ruling). */}
          <View style={styles.incidentSection}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#EDE9FE' }]}>
                <AlertTriangle size={16} color="#7C3AED" />
              </View>
              <Text style={[styles.sectionTitle, { fontSize: 13 }]}>{t('form234.personalUseSection')}</Text>
            </View>
            <View {...closedBodyProps('dgClosePconsPersonal')}>
            {renderField(t('form234.personalUseLabel'), personalUse, setPersonalUse, '0', false, false, 'numeric')}
            </View>
            {renderCloseControl('dgClosePconsPersonal', 'form234.personalUseSection', personalUse.trim().length > 0)}
          </View>
        </View>

        {(fmaId === 28599 || fmaId === 1595) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#DBEAFE' }]}><Anchor size={16} color="#1E3A8A" /></View>
            <Text style={styles.sectionTitle}>{t('form234.hlinSection')}</Text>
            {renderNoteButton('hlin')}
          </View>
          <View {...closedBodyProps('dgCloseHlin')}>
          {renderNoteInput('hlin', remarks.hlin ?? '', (v) => setNote('hlin', v))}
          {renderField(t('form234.companyLabel'), hlinCompany, setHlinCompany, t('form234.companyPlaceholder'), false, false, 'default', isRequired('hlinCompany'))}
          {renderField(t('form234.confirmNoLabel'), hlinConfirmNo, setHlinConfirmNo, t('form234.confirmNoPlaceholder'), false, false, 'default', isRequired('hlinConfirmNo'))}
          {renderField(t('form234.etaLabel'), hlinEta, setHlinEta, t('form234.etaPlaceholder'))}
          {renderField(t('form234.totalWeightLabel'), hlinTotalWeight, setHlinTotalWeight, '0', false, false, 'numeric')}
          </View>
          {renderCloseControl('dgCloseHlin', 'form234.hlinSection', !!(hlinCompany || hlinConfirmNo))}
        </View>
        )}

        {(fmaId === 28599 || fmaId === 1595) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#DBEAFE' }]}><Anchor size={16} color="#1E3A8A" /></View>
            <Text style={styles.sectionTitle}>{t('form234.hloutSection')}</Text>
            {renderNoteButton('hlout')}
          </View>
          <View {...closedBodyProps('dgCloseHlout')}>
          {renderNoteInput('hlout', remarks.hlout ?? '', (v) => setNote('hlout', v))}
          {renderField(t('form234.companyLabel'), hloutCompany, setHloutCompany, t('form234.companyPlaceholder'), false, false, 'default', isRequired('hloutCompany'))}
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
                {sheetMode === 'bait' ? t('form234.addBait') : t('form234.addBycatch')}
              </Text>

              <Text style={styles.sheetLabel}>
                {sheetMode === 'bait' ? t('form234.baitTypeLabel') : t('form234.speciesLabel')}
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

              {sheetSelectedType === 'Other' && (
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  value={sheetCustomType}
                  onChangeText={setSheetCustomType}
                  placeholder={sheetMode === 'bait' ? t('form234.enterBaitType') : t('form234.enterSpecies')}
                  placeholderTextColor="#94A3B8"
                  autoFocus
                />
              )}

              {/* BT_COND_ID — only when the rule makes condition mandatory for this type/region
                  (Rule 3060 MAR / Rule 984 QC-GLF; blocked types and NL-91 render nothing).
                  Options from MV_BAIT_CONDITION (ingested, carries FR). */}
              {sheetMode === 'bait' && sheetSelectedCodeId != null &&
                baitConditionState(subformId, sheetSelectedCodeId) === 'mandatory' && (
                <>
                  <Text style={[styles.sheetLabel, { marginTop: 14 }]}>
                    {t('form234.baitConditionLabel')}<Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>
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

              <Text style={[styles.sheetLabel, { marginTop: 14 }]}>{t('form234.weightLbsLabel')}</Text>
              <TextInput
                style={styles.input}
                value={sheetLbs}
                onChangeText={setSheetLbs}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
              />

              {sheetMode === 'bycatch' && subformId === 90 && (
                <>
                  <Text style={[styles.sheetLabel, { marginTop: 14 }]}>
                    {t('form234.usageLabel')}<Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>
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
                <Text style={styles.sheetConfirmText}>{t('form234.addEntry')}</Text>
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
  // S121 multi-grid: additional catch-effort block chrome
  effortBlock: {
    backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0',
  },
  effortBlockHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 4,
  },
  effortBlockTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  effortBlockSummary: { fontSize: 12, color: '#64748B', marginBottom: 4 },
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
