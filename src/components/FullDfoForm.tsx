import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useTimer } from '../context/TimerContext';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
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
  ChevronLeft,
  AlertTriangle,
  LocateFixed,
} from 'lucide-react-native';
import {
  saveLog,
  saveDraft,
  loadLogById,
  generateNewLogMeta,
  loadLastLog,
  getRequiredFields,
  DfoLog,
} from '../utils/dfoLogStorage';
import {
  DFO_FMA_LIST,
  DFO_LGRID_BY_FMA,
  DFO_FMA_LGRID_REQUIRED,
  getDfoFmaList,
  getDfoBaitTypeList,
  getDfoCatchSpeciesList,
  DFO_SUBFORM_FIELD_CONFIG,
  DFO_FMA_38B,
  DFO_FMA_NB_VNTCH,
  DFO_FMA_NB_VNTCH_YOU,
} from '../utils/dfoConstants';
import { loadCaptainProfile } from '../utils/captainStorage';
import { useTranslation } from 'react-i18next';
import CrewSelector from './CrewSelector';
import DfoPortSelector from './DfoPortSelector';
import { CrewMember } from '../utils/crewStorage';
import { MV_CATCH_USAGE, MV_PARTNERSHIP_TYPE } from '../data/reftables';

export interface FullDfoFormHandle {
  saveDraft: () => Promise<void>;
}

interface FullDfoFormProps {
  editingLogId: string | null;
  onSaved: () => void;
  readOnly?: boolean;
  onBack?: () => void;
}

type BaitEntry = { type: string; lbs: string; };
type BycatchEntry = { species: string; lbs: string; usage?: string; };

const MARINE_MAMMAL_OPTIONS = ['North Atlantic Right Whale', 'Humpback Whale', 'Fin Whale', 'Minke Whale', 'Harbour Porpoise', 'Grey Seal', 'Harbour Seal', 'Atlantic White-sided Dolphin', 'Other'];
const SAR_OPTIONS = ['North Atlantic Right Whale', 'Leatherback Sea Turtle', 'Loggerhead Sea Turtle', "Kemp's Ridley Sea Turtle", 'Atlantic Sturgeon', 'Striped Bass (inner Bay of Fundy)', 'Other'];

// PCONS USG_ID choices offered on MAR-90 bycatch entries — a curated subset of
// MV_CATCH_USAGE_rel1 (generated reftable). Labels render via i18n usageOption_<codeId>;
// descEn here is the fallback. Order is the picker display order.
const PCONS_USAGE_CODE_IDS = [37822, 37814, 37818, 37820, 37824];
const BYCATCH_USAGE_OPTIONS = PCONS_USAGE_CODE_IDS
  .map(id => MV_CATCH_USAGE.find(u => u.codeId === id))
  .filter((u): u is NonNullable<typeof u> => u != null)
  .map(u => ({ label: u.descEn, value: String(u.codeId) }));

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

type PickerField = 'sailed' | 'startHaul' | 'stopHaul' | 'landing' | 'mmTime' | 'sarTime' | 'lostGearTime';
type SheetMode = 'bait' | 'bycatch' | null;

const FullDfoForm = forwardRef<FullDfoFormHandle, FullDfoFormProps>(({ editingLogId, onSaved, readOnly = false, onBack }, ref) => {
  const { t } = useTranslation('dfo');
  const { t: tc } = useTranslation('common');

  // Core fields — start BLANK for new logs so completion % reflects real progress
  const [dateFished, setDateFished] = useState('');
  const [fmaId, setFmaId] = useState<number | null>(null);
  const [lgridCodeId, setLgridCodeId] = useState<number | null>(null);
  const [lgridDisplay, setLgridDisplay] = useState('');
  const [fmaPickerOpen, setFmaPickerOpen] = useState(false);
  const [lgridPickerOpen, setLgridPickerOpen] = useState(false);
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

  // MAR-specific fields (Task 2)
  const [nbSpcmnBrd, setNbSpcmnBrd] = useState('');
  const [hlinCompany, setHlinCompany] = useState('');
  const [hlinConfirmNo, setHlinConfirmNo] = useState('');
  const [hlinEta, setHlinEta] = useState('');
  const [hlinTotalWeight, setHlinTotalWeight] = useState('');
  const [hloutCompany, setHloutCompany] = useState('');
  const [hloutConfirmNo, setHloutConfirmNo] = useState('');

  // DG_CLOSE_DT section locks (Task 3) — keyed by section name, value is UTC ISO string
  const [sectionClosedAt, setSectionClosedAt] = useState<Record<string, string>>({});
  const isClosed = (section: string) => !!sectionClosedAt[section];
  const closeSection = (section: string) =>
    setSectionClosedAt(prev => ({ ...prev, [section]: new Date().toISOString() }));
  const unlockSection = (section: string) =>
    setSectionClosedAt(prev => { const next = { ...prev }; delete next[section]; return next; });

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

  // Lost Gear
  const [lostGearYes, setLostGearYes] = useState<boolean | null>(null);
  const [lostGearType, setLostGearType] = useState('');
  const [lostGearLat, setLostGearLat] = useState('');
  const [lostGearLng, setLostGearLng] = useState('');
  const [lostGearDate, setLostGearDate] = useState('');
  const [lostGearTime, setLostGearTime] = useState('');

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
  const [sheetCustomType, setSheetCustomType] = useState('');
  const [sheetLbs, setSheetLbs] = useState('');
  const [sheetDropdownOpen, setSheetDropdownOpen] = useState(false);
  const [sheetUsage, setSheetUsage] = useState('');

  useEffect(() => {
    const loadExisting = async () => {
      if (editingLogId) {
        const log = await loadLogById(editingLogId);
        if (log) {
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
          setSoakDuration(d.soakDuration || '');
          setGpsLat(d.gpsLat || '');
          setGpsLng(d.gpsLng || '');
          setGpsSrc(d.gpsSrc === 'gps' ? 'gps' : 'manual');
          setVNotchCount(d.vNotchCount || '');
          setNbVntchYou(d.nbVntchYou || '');
          setPersonalUse(d.personalUse || '');
          setTransfers(d.transfers || '');
          setTransferTime(d.transferTime || '');
          setTransferWt(d.transferWt || '');
          setTransferToVrn(d.transferToVrn || '');
          setTransferToPndNum(d.transferToPndNum || '');
          setUseCrInd(d.useCrInd === 'Y' ? 'Y' : 'N');
          setCarrierVrn(d.carrierVrn || '');
          setPrtnshpId(d.prtnshpId ? Number(d.prtnshpId) : 39468);
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
          } else if (d.sarYes === 'false') {
            setSarYes(false);
          }

          if (d.lostGearYes === 'true') {
            setLostGearYes(true);
            setLostGearType(d.lostGearType || '');
            setLostGearLat(d.lostGearLat || '');
            setLostGearLng(d.lostGearLng || '');
            setLostGearDate(d.lostGearDate || '');
            setLostGearTime(d.lostGearTime || '');
          } else if (d.lostGearYes === 'false') {
            setLostGearYes(false);
          }
          // MAR-specific fields
          setNbSpcmnBrd(d.nbSpcmnBrd || '');
          setHlinCompany(d.hlinCompany || '');
          setHlinConfirmNo(d.hlinConfirmNo || '');
          setHlinEta(d.hlinEta || '');
          setHlinTotalWeight(d.hlinTotalWeight || '');
          setHloutCompany(d.hloutCompany || '');
          setHloutConfirmNo(d.hloutConfirmNo || '');
          // DG_CLOSE_DT section timestamps
          const closedAt: Record<string, string> = {};
          if (d.dgCloseLanding)  closedAt['landing']  = d.dgCloseLanding;
          if (d.dgCloseEffort)   closedAt['effort']   = d.dgCloseEffort;
          if (d.dgCloseBaitUsed) closedAt['baitUsed'] = d.dgCloseBaitUsed;
          if (d.dgCloseSar)      closedAt['sar']      = d.dgCloseSar;
          if (d.dgCloseHlin)     closedAt['hlin']     = d.dgCloseHlin;
          if (d.dgCloseHlout)    closedAt['hlout']    = d.dgCloseHlout;
          if (d.dgClosePcons)    closedAt['pcons']    = d.dgClosePcons;
          setSectionClosedAt(closedAt);
        }
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

  useEffect(() => {
    if (haulEndTime) setTimeStoppedHauling(haulEndTime);
  }, [haulEndTime]);

  const buildLogData = (): Record<string, string> => ({
    fmaId: String(fmaId ?? ''),
        lgridCodeId: String(lgridCodeId ?? ''),
        lgridDisplay,
        catchWeight, trapHauls,
    portLanded, portLandedCodeId: String(portLandedCodeId ?? ''),
    crewRegistry: JSON.stringify(crewMembers),
    departurePort, departurePortCodeId: String(departurePortCodeId ?? ''),
    timeSailed, timeStartedHauling, timeStoppedHauling,
    timeOfLanding, soakDuration,
    baitEntries: JSON.stringify(baitEntries),
    bycatchYes: String(bycatchYes),
    bycatchEntries: JSON.stringify(bycatchEntries),
    gpsLat, gpsLng, gpsSrc, vNotchCount, nbVntchYou,
    transferYes: String(transferYes),
    transfers, personalUse,
    transferTime, transferWt, transferToVrn, transferToPndNum,
    useCrInd, carrierVrn, prtnshpId: String(prtnshpId),
    mmYes: String(mmYes),
    mmSpecies, mmSpeciesOther, mmWhat, mmLat, mmLng, mmDate, mmTime,
    sarYes: String(sarYes),
    sarSpecies, sarSpeciesOther, sarWhat, sarLat, sarLng, sarDate, sarTime,
    lostGearYes: String(lostGearYes),
    lostGearType, lostGearLat, lostGearLng, lostGearDate, lostGearTime,
    // MAR-specific
    nbSpcmnBrd,
    hlinCompany, hlinConfirmNo, hlinEta, hlinTotalWeight,
    hloutCompany, hloutConfirmNo,
    // DG_CLOSE_DT timestamps
    dgCloseLanding: sectionClosedAt['landing'] || '',
    dgCloseEffort:  sectionClosedAt['effort']  || '',
    dgCloseBaitUsed: sectionClosedAt['baitUsed'] || '',
    dgCloseSar:     sectionClosedAt['sar']     || '',
    dgCloseHlin:    sectionClosedAt['hlin']    || '',
    dgCloseHlout:   sectionClosedAt['hlout']   || '',
    dgClosePcons:   sectionClosedAt['pcons']   || '',
  });

  const hasMeaningfulData = (): boolean => {
    const d = buildLogData();
    for (const [, val] of Object.entries(d)) {
      if (val && val.trim() && val !== 'null' && val !== 'None' && val !== '[]') {
        return true;
      }
    }
    return false;
  };

  useImperativeHandle(ref, () => ({
    saveDraft: async () => {
      if (!isLoaded) return;
      if (editingCompleted) return;
      if (!hasMeaningfulData()) return;

      const log: DfoLog = {
        id: tripId,
        lgbkUid,
        firstEntryDt,
        mode: 'full',
        status: 'draft',
        dateFished: dateFished || formatDate(new Date()),
        createdAt: Date.now(),
        data: buildLogData(),
        subformId,
        regId,
        tripNum,
      };
      await saveLog(log);
    },
  }));

  const handleBack = async () => {
    if (!readOnly && isLoaded && !editingCompleted && hasMeaningfulData()) {
      const log: DfoLog = {
        id: tripId,
        lgbkUid,
        firstEntryDt,
        mode: 'full',
        status: 'draft',
        dateFished: dateFished || formatDate(new Date()),
        createdAt: Date.now(),
        data: buildLogData(),
        subformId,
        regId,
        tripNum,
      };
      await saveLog(log);
    }
    onBack?.();
  };

  const captureGps = async (
    setLat: (v: string) => void,
    setLng: (v: string) => void
  ) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLat(loc.coords.latitude.toFixed(4));
      setLng(loc.coords.longitude.toFixed(4));
    } catch (_) {}
  };

  const handleSailPress = async () => {
    if (!sailActive) {
      await startSail();
      // timeSailed synced via useEffect on sailStartTime
    } else {
      const { time } = stopSail();
      setTimeOfLanding(time); // Stop Sail = landed
    }
  };

  const handleHaulPress = async () => {
      if (!haulActive) {
        await startHaul();
        // timeStartedHauling synced via useEffect on haulStartTime
      } else {
        stopHaul();
        // timeStoppedHauling synced via useEffect on haulEndTime
        await captureGps(setGpsLat, setGpsLng);
        setGpsSrc('gps'); // §11.3: GPS-read coordinates → MODE="G"
      }
    };

  const handleMmYes = async (val: boolean) => {
    setMmYes(val);
    if (val) {
      Alert.alert('', t('form234.mmInterIndPrompt'), [{ text: 'OK' }]);
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
      Alert.alert('', t('form234.sarIndPrompt'), [{ text: 'OK' }]);
      const now = new Date();
      setSarDate(formatDate(now));
      setSarTime(formatTime(now));
      await captureGps(setSarLat, setSarLng);
    } else {
      setSarSpecies(''); setSarSpeciesOther(''); setSarWhat('');
      setSarLat(''); setSarLng(''); setSarDate(''); setSarTime('');
      setSarDropdownOpen(false);
    }
  };

  const handleLostGearYes = async (val: boolean) => {
    setLostGearYes(val);
    if (val) {
      Alert.alert('', t('form234.lostGearIndPrompt'), [{ text: 'OK' }]);
      const now = new Date();
      setLostGearDate(formatDate(now));
      setLostGearTime(formatTime(now));
      await captureGps(setLostGearLat, setLostGearLng);
    } else {
      setLostGearType('');
      setLostGearLat(''); setLostGearLng('');
      setLostGearDate(''); setLostGearTime('');
    }
  };

  const openPicker = (field: PickerField) => {
    let current: Date;
    switch (field) {
      case 'sailed':      current = parseDateTime(dateFished, timeSailed); break;
      case 'startHaul':  current = parseDateTime(dateFished, timeStartedHauling); break;
      case 'stopHaul':   current = parseDateTime(dateFished, timeStoppedHauling); break;
      case 'landing':    current = parseDateTime(dateFished, timeOfLanding); break;
      case 'mmTime':     current = parseDateTime(mmDate, mmTime); break;
      case 'sarTime':    current = parseDateTime(sarDate, sarTime); break;
      case 'lostGearTime': current = parseDateTime(lostGearDate, lostGearTime); break;
    }
    setPickerDate(current);
    setTempDate(current);
    setPickerField(field);
    setPickerVisible(true);
  };

  const handlePickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    if (Platform.OS === 'android') {
      setPickerVisible(false);
      if (event.type === 'dismissed') return;
      applyPickerValue(selected);
    } else {
      setTempDate(selected);
    }
  };

  const applyPickerValue = (d: Date) => {
      if (pickerField === null) {
        // Date Fished date-only picker
        setDateFished(formatDate(d));
        return;
      }
      switch (pickerField) {
        case 'sailed':
          setDateFished(formatDate(d)); setTimeSailed(formatTime(d)); break;
        case 'startHaul':
          setDateFished(formatDate(d)); setTimeStartedHauling(formatTime(d)); break;
        case 'stopHaul':
          setDateFished(formatDate(d)); setTimeStoppedHauling(formatTime(d)); break;
        case 'landing':
          setDateFished(formatDate(d)); setTimeOfLanding(formatTime(d)); break;
        case 'mmTime':
          setMmDate(formatDate(d)); setMmTime(formatTime(d)); break;
        case 'sarTime':
          setSarDate(formatDate(d)); setSarTime(formatTime(d)); break;
        case 'lostGearTime':
          setLostGearDate(formatDate(d)); setLostGearTime(formatTime(d)); break;
      }
    };

  const openSheet = (mode: SheetMode) => {
    setSheetMode(mode);
    setSheetSelectedType('');
    setSheetCustomType('');
    setSheetLbs('');
    setSheetUsage('');
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
      setBaitEntries(prev => [...prev, { type: finalType, lbs: sheetLbs.trim() }]);
    } else {
      setBycatchEntries(prev => [...prev, { species: finalType, lbs: sheetLbs.trim(), usage: sheetUsage || undefined }]);
    }
    setSheetVisible(false);
  };

  const deleteBait = (index: number) => setBaitEntries(prev => prev.filter((_, i) => i !== index));
  const deleteBycatch = (index: number) => setBycatchEntries(prev => prev.filter((_, i) => i !== index));

  const getSheetOptions = () => {
    switch (sheetMode) {
      case 'bait': return getDfoBaitTypeList(subformId).map(b => b.label);
      case 'bycatch': return getDfoCatchSpeciesList(subformId).map(s => s.label);
      default: return [];
    }
  };

  const renderTimestampField = (
    label: string, value: string, field: PickerField, isProblem: boolean = false, isReq: boolean = false
  ) => (
    <View style={styles.fieldRow}>
      <View style={styles.labelRow}>
        {isProblem && <View style={styles.problemDot} />}
        <Text style={styles.label}>{label}{isReq && <Text style={{ color: '#EF4444' }}> *</Text>}</Text>
      </View>
      <TouchableOpacity style={styles.timeButton} onPress={() => { if (!readOnly) openPicker(field); }}>
        <Text style={[styles.timeButtonText, !value && styles.timeButtonPlaceholder]}>
          {value || t('form234.tapToSetDateTime')}
        </Text>
        <Clock size={16} color="#64748B" />
      </TouchableOpacity>
    </View>
  );

  const renderField = (
    label: string, value: string, setter: (v: string) => void,
    placeholder: string, isProblem: boolean = false,
    fieldReadOnly: boolean = false, keyboardType: any = 'default', isReq: boolean = false
  ) => (
    <View style={styles.fieldRow}>
      <View style={styles.labelRow}>
        {isProblem && <View style={styles.problemDot} />}
        <Text style={styles.label}>{label}{isReq && <Text style={{ color: '#EF4444' }}> *</Text>}</Text>
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
    speciesOptions: string[],
    what: string,
    setWhat: (v: string) => void,
    lat: string,
    setLat: (v: string) => void,
    lng: string,
    setLng: (v: string) => void,
    dateStr: string,
    timeStr: string,
    pickerFieldName: PickerField
  ) => (
    <View style={styles.incidentBlock}>
      <Text style={styles.label}>{t('form234.speciesLabel')}</Text>
      <TouchableOpacity
        style={styles.dropdownBtn}
        onPress={() => setDropdownOpen(!dropdownOpen)}
      >
        <Text style={[styles.dropdownBtnText, !species && styles.dropdownPlaceholder]}>
          {species || t('form234.selectSpecies')}
        </Text>
        <ChevronDown size={16} color="#64748B" />
      </TouchableOpacity>

      {dropdownOpen && (
        <View style={styles.dropdownList}>
          {speciesOptions.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.dropdownItem, species === opt && styles.dropdownItemActive]}
              onPress={() => {
                setSpecies(opt);
                if (opt !== 'Other') setSpeciesOther('');
                setDropdownOpen(false);
              }}
            >
              <Text style={[styles.dropdownItemText, species === opt && styles.dropdownItemTextActive]}>
                {opt}
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

  const renderLostGearFields = () => (
    <View style={styles.incidentBlock}>
      {renderField(t('form234.gearTypeLabel'), lostGearType, setLostGearType, t('form234.gearTypePlaceholder'))}
      {renderTimestampField(t('form234.dateTimeLabel'), lostGearDate && lostGearTime ? `${lostGearDate} ${lostGearTime}` : '', 'lostGearTime')}
      <Text style={[styles.label, { marginTop: 6 }]}>{t('form234.gpsLocationLabel')}</Text>
      <View style={styles.gpsRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={lostGearLat}
          onChangeText={setLostGearLat}
          placeholder={t('form234.latPlaceholder')}
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
        />
        <View style={{ width: 8 }} />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={lostGearLng}
          onChangeText={setLostGearLng}
          placeholder={t('form234.lngPlaceholder')}
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
        />
      </View>
    </View>
  );

  const handleSave = async () => {
    if (isRequired('baitEntries') && baitEntries.length === 0) {
      Alert.alert(t('form234.missingFieldsTitle'), t('form234.missingBait'), [{ text: tc('nav.ok') }]);
      return;
    }
    if (bycatchYes === null) {
      Alert.alert(t('form234.missingFieldsTitle'), t('form234.missingBycatchAnswer'), [{ text: tc('nav.ok') }]);
      return;
    }
    if (bycatchYes === true && bycatchEntries.length === 0) {
      Alert.alert(t('form234.missingFieldsTitle'), t('form234.missingBycatchEntries'), [{ text: tc('nav.ok') }]);
      return;
    }
    if (transferYes === null) {
      Alert.alert(t('form234.missingFieldsTitle'), t('form234.missingTransferAnswer'), [{ text: tc('nav.ok') }]);
      return;
    }

    const fieldCheckMap: Record<string, string> = {
      startDt:     dateFished,
      fmaId:       fmaId ? String(fmaId) : '',
      lgridCodeId: DFO_FMA_LGRID_REQUIRED.has(fmaId ?? 0) ? (lgridDisplay || '') : 'ok',
      catchWeight,
      trapHauls,
      lgbkUid,
      firstEntryDt,
      crewNb:      crewMembers.length > 0 ? 'ok' : '',
      portId:      portLanded,
      operName:    'ok',
    };
    const fieldLabels: Record<string, string> = {
      startDt:     'Date Fished',
      fmaId:       'Fishing Area (LFA)',
      lgridCodeId: 'Lobster Settlement Grid',
      catchWeight: 'Lobster Catch Weight',
      trapHauls:   'Trap Hauls',
      lgbkUid:     'Log Book UID',
      firstEntryDt:'First Entry Date',
      crewNb:      'Crew Registry',
      portId:      'Port Landed',
      operName:    'Operator Name (Captain Profile)',
    };
    const required = getRequiredFields(subformId);
    const missing: string[] = [];
    for (const field of required) {
      const val = fieldCheckMap[field] ?? '';
      if (!val || val.trim() === '') missing.push(fieldLabels[field] ?? field);
    }

    if (missing.length > 0) {
      Alert.alert(
        t('form234.missingFieldsTitle'),
        `${t('form234.missingFieldsBody')}${missing.join('\n• ')}`,
        [{ text: tc('nav.ok') }]
      );
      return;
    }

    // Rule 980: WARNING (non-blocking) when the landing date/time is more than
    // 24 hours in the future — alert the user to a likely input error, then proceed
    if (dateFished && timeOfLanding) {
      const [ly, lm, ld] = dateFished.split('-').map(Number);
      const [lh, lmin] = timeOfLanding.split(':').map(Number);
      const landMs = new Date(ly, (lm ?? 1) - 1, ld ?? 1, lh ?? 0, lmin ?? 0).getTime();
      if (!isNaN(landMs) && landMs > Date.now() + 24 * 3600 * 1000) {
        Alert.alert(t('form234.landing24hWarningTitle'), t('form234.landing24hWarningBody'), [{ text: tc('nav.ok') }]);
      }
    }

    const log: DfoLog = {
      id: tripId,
      lgbkUid,
      firstEntryDt,
      mode: 'full',
      status: 'complete',
      dateFished,
      createdAt: Date.now(),
      data: buildLogData(),
      subformId,
      regId,
      tripNum,
    };

    const ok = await saveLog(log);
    if (ok) {
      onSaved();
    } else {
      Alert.alert(tc('settings.errorTitle'), t('form234.saveError'));
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
              style={[styles.captureBtn, haulActive && styles.captureBtnActive]}
              onPress={handleHaulPress}
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
          </View>
          {/* DATE FISHED — date picker, auto-fills today on new log */}
          <View style={styles.fieldRow}>
            <Text style={styles.label}>{t('form234.dateFishedLabel')}</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => {
                if (readOnly) return;
                const [y, mo, d] = dateFished ? dateFished.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()];
                const initial = new Date(y, mo - 1, d);
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
              <Text style={styles.label}>{t('form234.crewRegistryLabel')}{isRequired('crewNb') && <Text style={{ color: '#EF4444' }}> *</Text>}</Text>
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
                              {isVisible('portId') && (
                              <View style={styles.fieldRow}>
                                <Text style={styles.label}>{t('form234.portLandedLabel')}{isRequired('portId') && <Text style={{ color: '#EF4444' }}> *</Text>}</Text>
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
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#FEE2E2' }]}><Clock size={16} color="#B91C1C" /></View>
            <Text style={styles.sectionTitle}>{t('form234.timestampsSection')}</Text>
            <TouchableOpacity
              style={isClosed('landing') ? styles.sectionUnlockBtn : styles.sectionCloseBtn}
              onPress={() => isClosed('landing') ? unlockSection('landing') : closeSection('landing')}
            >
              <Text style={isClosed('landing') ? styles.sectionUnlockBtnText : styles.sectionCloseBtnText}>
                {isClosed('landing') ? t('form234.unlockSection') : t('form234.closeSection')}
              </Text>
            </TouchableOpacity>
          </View>
          {isClosed('landing') && <Text style={styles.closedNoticeText}>DG_CLOSE_DT: {sectionClosedAt['landing']}</Text>}
          <View pointerEvents={isClosed('landing') ? 'none' : 'auto'} style={isClosed('landing') ? styles.lockedContent : undefined}>
            {isVisible('sailTime') && renderTimestampField(t('form234.timeSailedLabel'), timeSailed, 'sailed', false, isRequired('sailTime'))}
            {isVisible('haulStartTime') && renderTimestampField(t('form234.timeStartedHaulingLabel'), timeStartedHauling, 'startHaul', false, isRequired('haulStartTime'))}
            {isVisible('haulEndTime') && renderTimestampField(t('form234.timeStoppedHaulingLabel'), timeStoppedHauling, 'stopHaul', false, isRequired('haulEndTime'))}
            {isVisible('landingTime') && renderTimestampField(t('form234.timeOfLandingLabel'), timeOfLanding, 'landing', false, isRequired('landingTime'))}
            {isVisible('soakDuration') && renderField(t('form234.soakDurationLabel'), soakDuration, setSoakDuration, t('form234.soakDurationPlaceholder'), false, false, 'decimal-pad', isRequired('soakDuration'))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#DCFCE7' }]}><Scale size={16} color="#15803D" /></View>
            <Text style={styles.sectionTitle}>{t('form234.catchEffortSection')}</Text>
            <TouchableOpacity
              style={isClosed('effort') ? styles.sectionUnlockBtn : styles.sectionCloseBtn}
              onPress={() => isClosed('effort') ? unlockSection('effort') : closeSection('effort')}
            >
              <Text style={isClosed('effort') ? styles.sectionUnlockBtnText : styles.sectionCloseBtnText}>
                {isClosed('effort') ? t('form234.unlockSection') : t('form234.closeSection')}
              </Text>
            </TouchableOpacity>
          </View>
          {isClosed('effort') && <Text style={styles.closedNoticeText}>DG_CLOSE_DT: {sectionClosedAt['effort']}</Text>}
          <View pointerEvents={isClosed('effort') ? 'none' : 'auto'} style={isClosed('effort') ? styles.lockedContent : undefined}>
          {/* LFA Selector */}
                    <View style={styles.fieldRow}>
                      <Text style={styles.label}>{t('form234.fishingAreaLabel')}{isRequired('fmaId') && <Text style={{ color: '#EF4444' }}> *</Text>}</Text>
                      <TouchableOpacity
                        style={styles.timeButton}
                        onPress={() => { if (readOnly) return; setFmaPickerOpen(o => !o); setLgridPickerOpen(false); }}
                      >
                        <Text style={[styles.timeButtonText, !fmaId && styles.timeButtonPlaceholder]}>
                          {fmaId ? getDfoFmaList(subformId).find(f => f.codeId === fmaId)?.label ?? t('form234.selectLfa') : t('form234.selectLfa')}
                        </Text>
                        <ChevronDown size={16} color="#64748B" />
                      </TouchableOpacity>
                      {fmaPickerOpen && (
                        <View style={styles.dropdownList}>
                          {getDfoFmaList(subformId).map(f => (
                            <TouchableOpacity
                              key={f.codeId}
                              style={[styles.dropdownItem, fmaId === f.codeId && styles.dropdownItemActive]}
                              onPress={() => {
                                setFmaId(f.codeId);
                                setLgridCodeId(null);
                                setLgridDisplay('');
                                setFmaPickerOpen(false);
                              }}
                            >
                              <Text style={[styles.dropdownItemText, fmaId === f.codeId && styles.dropdownItemTextActive]}>
                                {f.label}
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
          {renderField(t('form234.catchWeightLabel'), catchWeight, setCatchWeight, '0', false, false, 'numeric', isRequired('catchWeight'))}
          {renderField(t('form234.trapHaulsLabel'), trapHauls, setTrapHauls, '0', false, false, 'numeric', isRequired('trapHauls'))}
          {/* NB_VNTCH / NB_VNTCH_YOU: QC(88) only, mandatory in the Rule 623/625 FMA lists, blocked elsewhere */}
          {subformId === 88 && fmaId != null && DFO_FMA_NB_VNTCH.has(fmaId) &&
            renderField(t('form234.nbVntchLabel'), vNotchCount, setVNotchCount, '0', false, false, 'numeric', true)}
          {subformId === 88 && fmaId != null && DFO_FMA_NB_VNTCH_YOU.has(fmaId) &&
            renderField(t('form234.nbVntchYouLabel'), nbVntchYou, setNbVntchYou, '0', false, false, 'numeric', true)}
          {/* NB_SPCMN_BRD: MAR(90) FMA 38b only — mandatory there (Rule 654), blocked elsewhere (Rule 655) */}
          {isVisible('nbSpcmnBrd') && fmaId === DFO_FMA_38B &&
            renderField(t('form234.nbSpcmnBrdLabel'), nbSpcmnBrd, setNbSpcmnBrd, '0', false, false, 'numeric', true)}
          </View>
        </View>

        {isVisible('baitEntries') && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#FEE2E2' }]}><Fish size={16} color="#B91C1C" /></View>
            <Text style={styles.sectionTitle}>{t('form234.baitReportingSection')}{isRequired('baitEntries') && <Text style={{ color: '#EF4444', fontSize: 13 }}> *</Text>}</Text>
            <TouchableOpacity
              style={isClosed('baitUsed') ? styles.sectionUnlockBtn : styles.sectionCloseBtn}
              onPress={() => isClosed('baitUsed') ? unlockSection('baitUsed') : closeSection('baitUsed')}
            >
              <Text style={isClosed('baitUsed') ? styles.sectionUnlockBtnText : styles.sectionCloseBtnText}>
                {isClosed('baitUsed') ? t('form234.unlockSection') : t('form234.closeSection')}
              </Text>
            </TouchableOpacity>
          </View>
          {isClosed('baitUsed') && <Text style={styles.closedNoticeText}>DG_CLOSE_DT: {sectionClosedAt['baitUsed']}</Text>}
          <View pointerEvents={isClosed('baitUsed') ? 'none' : 'auto'} style={isClosed('baitUsed') ? styles.lockedContent : undefined}>
            {baitEntries.length === 0 && <Text style={styles.emptyHint}>{t('form234.noBaitYet')}</Text>}
            {baitEntries.map((entry, i) => (
              <View key={i} style={styles.entryRow}>
                <View style={styles.entryInfo}>
                  <Text style={styles.entryType}>{entry.type}</Text>
                  <Text style={styles.entryLbs}>{t('form234.lbsSuffix', { lbs: entry.lbs })}</Text>
                </View>
                {!readOnly && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteBait(i)}>
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {!readOnly && (
              <TouchableOpacity style={styles.addBtn} onPress={() => openSheet('bait')}>
                <Plus size={16} color="#1E3A8A" />
                <Text style={styles.addBtnText}>{t('form234.addBait')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#E0E7FF' }]}><MapPin size={16} color="#4338CA" /></View>
            <Text style={styles.sectionTitle}>{t('form234.gpsCoordinatesSection')}</Text>
          </View>
          {!readOnly && (
            <TouchableOpacity
              style={styles.captureGpsBtn}
              onPress={async () => {
                setGpsCapturing(true);
                await captureGps(setGpsLat, setGpsLng);
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

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#FEF3C7' }]}><Anchor size={16} color="#B45309" /></View>
            <Text style={styles.sectionTitle}>{t('form234.interactionsSection')}</Text>
            <TouchableOpacity
              style={isClosed('pcons') ? styles.sectionUnlockBtn : styles.sectionCloseBtn}
              onPress={() => isClosed('pcons') ? unlockSection('pcons') : closeSection('pcons')}
            >
              <Text style={isClosed('pcons') ? styles.sectionUnlockBtnText : styles.sectionCloseBtnText}>
                {isClosed('pcons') ? t('form234.unlockSection') : t('form234.closeSection')}
              </Text>
            </TouchableOpacity>
          </View>
          {isClosed('pcons') && <Text style={styles.closedNoticeText}>DG_CLOSE_DT: {sectionClosedAt['pcons']}</Text>}
          <View pointerEvents={isClosed('pcons') ? 'none' : 'auto'} style={isClosed('pcons') ? styles.lockedContent : undefined}>

          {/* Bycatch */}
          <View style={[styles.incidentSection, { marginBottom: 12 }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#EDE9FE' }]}>
                <AlertTriangle size={16} color="#7C3AED" />
              </View>
              <Text style={[styles.sectionTitle, { fontSize: 13 }]}>{t('form234.bycatchSubsection')}</Text>
            </View>
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
                      <Text style={styles.entryType}>{entry.species}</Text>
                      {entry.usage && (
                        <Text style={[styles.entryLbs, { color: '#64748B' }]}>{t(`form234.usageOption_${entry.usage}`)}</Text>
                      )}
                      <Text style={styles.entryLbs}>{t('form234.lbsSuffix', { lbs: entry.lbs })}</Text>
                    </View>
                    {!readOnly && (
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteBycatch(i)}>
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {!readOnly && (
                  <TouchableOpacity style={[styles.addBtn, { marginTop: 4 }]} onPress={() => openSheet('bycatch')}>
                    <Plus size={16} color="#1E3A8A" />
                    <Text style={styles.addBtnText}>{t('form234.addBycatch')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
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
              <TouchableOpacity
                style={isClosed('sar') ? styles.sectionUnlockBtn : styles.sectionCloseBtn}
                onPress={() => isClosed('sar') ? unlockSection('sar') : closeSection('sar')}
              >
                <Text style={isClosed('sar') ? styles.sectionUnlockBtnText : styles.sectionCloseBtnText}>
                  {isClosed('sar') ? t('form234.unlockSection') : t('form234.closeSection')}
                </Text>
              </TouchableOpacity>
            </View>
            {isClosed('sar') && <Text style={styles.closedNoticeText}>DG_CLOSE_DT: {sectionClosedAt['sar']}</Text>}
            <View pointerEvents={isClosed('sar') ? 'none' : 'auto'} style={isClosed('sar') ? styles.lockedContent : undefined}>
              {renderYesNoToggle(t('form234.sarIndLabel'), sarYes, handleSarYes)}
              {sarYes === true && renderIncidentFields(
                sarSpecies, setSarSpecies,
                sarSpeciesOther, setSarSpeciesOther,
                sarDropdownOpen, setSarDropdownOpen,
                SAR_OPTIONS,
                sarWhat, setSarWhat,
                sarLat, setSarLat,
                sarLng, setSarLng,
                sarDate, sarTime, 'sarTime'
              )}
            </View>
          </View>

          <View style={styles.incidentSection}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#EDE9FE' }]}>
                <AlertTriangle size={16} color="#7C3AED" />
              </View>
              <Text style={[styles.sectionTitle, { fontSize: 13 }]}>{t('form234.lostGearSubsection')}</Text>
            </View>
            {renderYesNoToggle(t('form234.lostGearIndLabel'), lostGearYes, handleLostGearYes)}
            {lostGearYes === true && renderLostGearFields()}
          </View>

          {/* Carrier + Partnership + Transfers — QC(88) only; TRANSFER blocked for 89/90/91 */}
          {subformId === 88 && <View style={styles.incidentSection}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#EDE9FE' }]}>
                <AlertTriangle size={16} color="#7C3AED" />
              </View>
              <Text style={[styles.sectionTitle, { fontSize: 13 }]}>{t('form234.transfersSubsection')}</Text>
            </View>
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
          </View>}

          {renderField(t('form234.personalUseLabel'), personalUse, setPersonalUse, '0', false, false, 'numeric')}
          </View>{/* end PCONS lock */}
        </View>

        {(fmaId === 28599 || fmaId === 1595) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#DBEAFE' }]}><Anchor size={16} color="#1E3A8A" /></View>
            <Text style={styles.sectionTitle}>{t('form234.hlinSection')}</Text>
            <TouchableOpacity
              style={isClosed('hlin') ? styles.sectionUnlockBtn : styles.sectionCloseBtn}
              onPress={() => isClosed('hlin') ? unlockSection('hlin') : closeSection('hlin')}
            >
              <Text style={isClosed('hlin') ? styles.sectionUnlockBtnText : styles.sectionCloseBtnText}>
                {isClosed('hlin') ? t('form234.unlockSection') : t('form234.closeSection')}
              </Text>
            </TouchableOpacity>
          </View>
          {isClosed('hlin') && <Text style={styles.closedNoticeText}>DG_CLOSE_DT: {sectionClosedAt['hlin']}</Text>}
          <View pointerEvents={isClosed('hlin') ? 'none' : 'auto'} style={isClosed('hlin') ? styles.lockedContent : undefined}>
            {renderField(t('form234.companyLabel'), hlinCompany, setHlinCompany, t('form234.companyPlaceholder'), false, false, 'default', isRequired('hlinCompany'))}
            {renderField(t('form234.confirmNoLabel'), hlinConfirmNo, setHlinConfirmNo, t('form234.confirmNoPlaceholder'), false, false, 'default', isRequired('hlinConfirmNo'))}
            {renderField(t('form234.etaLabel'), hlinEta, setHlinEta, t('form234.etaPlaceholder'))}
            {renderField(t('form234.totalWeightLabel'), hlinTotalWeight, setHlinTotalWeight, '0', false, false, 'numeric')}
          </View>
        </View>
        )}

        {(fmaId === 28599 || fmaId === 1595) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#DBEAFE' }]}><Anchor size={16} color="#1E3A8A" /></View>
            <Text style={styles.sectionTitle}>{t('form234.hloutSection')}</Text>
            <TouchableOpacity
              style={isClosed('hlout') ? styles.sectionUnlockBtn : styles.sectionCloseBtn}
              onPress={() => isClosed('hlout') ? unlockSection('hlout') : closeSection('hlout')}
            >
              <Text style={isClosed('hlout') ? styles.sectionUnlockBtnText : styles.sectionCloseBtnText}>
                {isClosed('hlout') ? t('form234.unlockSection') : t('form234.closeSection')}
              </Text>
            </TouchableOpacity>
          </View>
          {isClosed('hlout') && <Text style={styles.closedNoticeText}>DG_CLOSE_DT: {sectionClosedAt['hlout']}</Text>}
          <View pointerEvents={isClosed('hlout') ? 'none' : 'auto'} style={isClosed('hlout') ? styles.lockedContent : undefined}>
            {renderField(t('form234.companyLabel'), hloutCompany, setHloutCompany, t('form234.companyPlaceholder'), false, false, 'default', isRequired('hloutCompany'))}
            {renderField(t('form234.confirmNoLabel'), hloutConfirmNo, setHloutConfirmNo, t('form234.confirmNoPlaceholder'), false, false, 'default', isRequired('hloutConfirmNo'))}
          </View>
        </View>
        )}

        {!readOnly && (
          <View style={styles.countBox}>
            <Text style={styles.countText}>
              <Text style={{ fontWeight: '700', color: '#B91C1C' }}>22 fields</Text> {t('form234.requiredPerTrip')}
            </Text>
            <Text style={styles.countSubtext}>{t('form234.oldPaperLog')}</Text>
          </View>
        )}

        {!readOnly && (
          <TouchableOpacity style={styles.submitButton} onPress={handleSave}>
            <Save size={18} color="#FFFFFF" />
            <Text style={styles.submitText}>{t('form234.saveButton')}</Text>
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
      {Platform.OS === 'android' && pickerVisible && (
        <DateTimePicker
          value={pickerDate}
          mode={pickerField === null ? 'date' : 'datetime'}
          display="default"
          onChange={handlePickerChange}
        />
      )}

      <Modal visible={sheetVisible} transparent animationType="slide">
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
                  {sheetSelectedType || t('form234.selectPlaceholder')}
                </Text>
                <ChevronDown size={16} color="#64748B" />
              </TouchableOpacity>

              {sheetDropdownOpen && (
                <View style={[styles.dropdownList, { maxHeight: 220 }]}>
                  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {getSheetOptions().map(opt => (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.dropdownItem, sheetSelectedType === opt && styles.dropdownItemActive]}
                        onPress={() => { setSheetSelectedType(opt); setSheetDropdownOpen(false); }}
                      >
                        <Text style={[styles.dropdownItemText, sheetSelectedType === opt && styles.dropdownItemTextActive]}>
                          {opt}
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
                    {t('form234.usageLabel')}<Text style={{ color: '#EF4444' }}> *</Text>
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
  countBox: {
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 10, padding: 14, marginTop: 4, marginBottom: 16, alignItems: 'center',
  },
  countText: { fontSize: 15, color: '#1E293B' },
  countSubtext: { fontSize: 12, color: '#64748B', marginTop: 2 },
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
  // DG_CLOSE_DT section locking (Task 3)
  sectionCloseBtn: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1',
  },
  sectionCloseBtnText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  sectionUnlockBtn: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A',
  },
  sectionUnlockBtnText: { fontSize: 11, fontWeight: '700', color: '#B45309' },
  closedNoticeText: {
    fontSize: 11, color: '#94A3B8', fontStyle: 'italic',
    marginBottom: 8, marginTop: -4,
  },
  lockedContent: { opacity: 0.45 },
});

export default FullDfoForm;
