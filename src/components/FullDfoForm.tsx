import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
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
  AlertTriangle,
} from 'lucide-react-native';
import {
  saveLog,
  saveDraft,
  loadLogById,
  generateNextTripId,
  DfoLog,
} from '../utils/dfoLogStorage';
import CrewSelector from './CrewSelector';
import PortSelector from './PortSelector';
import { CrewMember } from '../utils/crewStorage';
import { Port, loadPorts } from '../utils/portStorage';

export interface FullDfoFormHandle {
  saveDraft: () => Promise<void>;
}

interface FullDfoFormProps {
  editingLogId: string | null;
  onSaved: () => void;
}

type BaitEntry = { type: string; lbs: string; };
type BycatchEntry = { species: string; lbs: string; };

const BAIT_OPTIONS = ['Mackerel', 'Herring', 'Redfish', 'Rockfish', 'Pollock', 'Other'];
const BYCATCH_OPTIONS = ['Rock Crab', 'Jonah Crab', 'Haddock', 'Pollock', 'Halibut', 'Sea Urchin', 'Whelk', 'Other'];
const MARINE_MAMMAL_OPTIONS = ['North Atlantic Right Whale', 'Humpback Whale', 'Fin Whale', 'Minke Whale', 'Harbour Porpoise', 'Grey Seal', 'Harbour Seal', 'Atlantic White-sided Dolphin', 'Other'];
const SAR_OPTIONS = ['North Atlantic Right Whale', 'Leatherback Sea Turtle', 'Loggerhead Sea Turtle', "Kemp's Ridley Sea Turtle", 'Atlantic Sturgeon', 'Striped Bass (inner Bay of Fundy)', 'Other'];

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

const FullDfoForm = forwardRef<FullDfoFormHandle, FullDfoFormProps>(({ editingLogId, onSaved }, ref) => {
  // Core fields — start BLANK for new logs so completion % reflects real progress
  const [dateFished, setDateFished] = useState('');
  const [gridNumber, setGridNumber] = useState('');
  const [catchWeight, setCatchWeight] = useState('');
  const [trapHauls, setTrapHauls] = useState('');
  const [portLanded, setPortLanded] = useState('');
  const [tripId, setTripId] = useState('');
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [departurePort, setDeparturePort] = useState('');
  const [savedPorts, setSavedPorts] = useState<Port[]>([]);

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
  const [vNotchCount, setVNotchCount] = useState('');
  const [personalUse, setPersonalUse] = useState('');
  const [transfers, setTransfers] = useState('');
  const [transferYes, setTransferYes] = useState<boolean | null>(null);

  // Track whether we're editing an already-completed log (don't downgrade on back)
  const [editingCompleted, setEditingCompleted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

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

  // Add entry bottom sheet
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [sheetSelectedType, setSheetSelectedType] = useState('');
  const [sheetCustomType, setSheetCustomType] = useState('');
  const [sheetLbs, setSheetLbs] = useState('');
  const [sheetDropdownOpen, setSheetDropdownOpen] = useState(false);

  useEffect(() => {
    const loadExisting = async () => {
      if (editingLogId) {
        const log = await loadLogById(editingLogId);
        if (log) {
          setTripId(log.id);
          setDateFished(log.dateFished);
          setEditingCompleted(log.status === 'complete');
          const d = log.data;
          setGridNumber(d.gridNumber || '');
          setCatchWeight(d.catchWeight || '');
          setTrapHauls(d.trapHauls || '');
          setPortLanded(d.portLanded || '');
          try {
                      const cm = JSON.parse(d.crewRegistry || '[]');
                      setCrewMembers(Array.isArray(cm) ? cm : []);
                    } catch { setCrewMembers([]); }
                    setDeparturePort(d.departurePort || '');
          setTimeSailed(d.timeSailed || '');
          setTimeStartedHauling(d.timeStartedHauling || '');
          setTimeStoppedHauling(d.timeStoppedHauling || '');
          setTimeOfLanding(d.timeOfLanding || '');
          setSoakDuration(d.soakDuration || '');
          setGpsLat(d.gpsLat || '');
          setGpsLng(d.gpsLng || '');
          setVNotchCount(d.vNotchCount || '');
          setPersonalUse(d.personalUse || '');
          setTransfers(d.transfers || '');
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
        }
      } else {
        // New log — today's date + fresh trip ID
        const today = formatDate(new Date());
        setDateFished(today);
        const newId = await generateNextTripId(today);
        setTripId(newId);
      }
      setIsLoaded(true);
          };
          loadPorts().then(setSavedPorts);
          loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingLogId]);

  useEffect(() => {
    if (!editingLogId && dateFished && isLoaded) {
      generateNextTripId(dateFished).then(setTripId);
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
    gridNumber, catchWeight, trapHauls,
    portLanded, crewRegistry: JSON.stringify(crewMembers), departurePort,
    timeSailed, timeStartedHauling, timeStoppedHauling,
    timeOfLanding, soakDuration,
    baitEntries: JSON.stringify(baitEntries),
    bycatchYes: String(bycatchYes),
    bycatchEntries: JSON.stringify(bycatchEntries),
    gpsLat, gpsLng, vNotchCount,
    transferYes: String(transferYes),
    transfers, personalUse,
    mmYes: String(mmYes),
    mmSpecies, mmSpeciesOther, mmWhat, mmLat, mmLng, mmDate, mmTime,
    sarYes: String(sarYes),
    sarSpecies, sarSpeciesOther, sarWhat, sarLat, sarLng, sarDate, sarTime,
    lostGearYes: String(lostGearYes),
    lostGearType, lostGearLat, lostGearLng, lostGearDate, lostGearTime,
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
        mode: 'full',
        status: 'draft',
        dateFished: dateFished || formatDate(new Date()),
        createdAt: Date.now(),
        data: buildLogData(),
      };
      await saveLog(log);
    },
  }));

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
      const { time } = await startHaul();
      // timeStartedHauling synced via useEffect on haulStartTime
      await captureGps(setGpsLat, setGpsLng);
    } else {
      stopHaul();
      // timeStoppedHauling synced via useEffect on haulEndTime
    }
  };

  const handleMmYes = async (val: boolean) => {
    setMmYes(val);
    if (val) {
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
    setSheetDropdownOpen(false);
    setSheetVisible(true);
  };

  const handleSheetConfirm = () => {
    const finalType = sheetSelectedType === 'Other' ? sheetCustomType.trim() : sheetSelectedType;
    if (!finalType) {
      Alert.alert('Missing', sheetMode === 'bait' ? 'Please select a bait type.' : 'Please select a species.');
      return;
    }
    if (!sheetLbs.trim()) {
      Alert.alert('Missing', 'Please enter the weight in lbs.');
      return;
    }
    if (sheetMode === 'bait') {
      setBaitEntries(prev => [...prev, { type: finalType, lbs: sheetLbs.trim() }]);
    } else {
      setBycatchEntries(prev => [...prev, { species: finalType, lbs: sheetLbs.trim() }]);
    }
    setSheetVisible(false);
  };

  const deleteBait = (index: number) => setBaitEntries(prev => prev.filter((_, i) => i !== index));
  const deleteBycatch = (index: number) => setBycatchEntries(prev => prev.filter((_, i) => i !== index));

  const getSheetOptions = () => {
    switch (sheetMode) {
      case 'bait': return BAIT_OPTIONS;
      case 'bycatch': return BYCATCH_OPTIONS;
      default: return [];
    }
  };

  const renderTimestampField = (
    label: string, value: string, field: PickerField, isProblem: boolean = false
  ) => (
    <View style={styles.fieldRow}>
      <View style={styles.labelRow}>
        {isProblem && <View style={styles.problemDot} />}
        <Text style={styles.label}>{label}</Text>
      </View>
      <TouchableOpacity style={styles.timeButton} onPress={() => openPicker(field)}>
        <Text style={[styles.timeButtonText, !value && styles.timeButtonPlaceholder]}>
          {value || 'Tap to set date & time'}
        </Text>
        <Clock size={16} color="#64748B" />
      </TouchableOpacity>
    </View>
  );

  const renderField = (
    label: string, value: string, setter: (v: string) => void,
    placeholder: string, isProblem: boolean = false,
    readOnly: boolean = false, keyboardType: any = 'default'
  ) => (
    <View style={styles.fieldRow}>
      <View style={styles.labelRow}>
        {isProblem && <View style={styles.problemDot} />}
        <Text style={styles.label}>{label}</Text>
      </View>
      <TextInput
        style={[styles.input, readOnly && styles.inputReadOnly]}
        value={value}
        onChangeText={setter}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        editable={!readOnly}
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
          onPress={() => onToggle(false)}
        >
          <Text style={[styles.yesNoBtnText, value === false && styles.yesNoBtnNoText]}>No</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.yesNoBtn, value === true && styles.yesNoBtnYesActive]}
          onPress={() => onToggle(true)}
        >
          <Text style={[styles.yesNoBtnText, value === true && styles.yesNoBtnYesText]}>Yes</Text>
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
      <Text style={styles.label}>SPECIES</Text>
      <TouchableOpacity
        style={styles.dropdownBtn}
        onPress={() => setDropdownOpen(!dropdownOpen)}
      >
        <Text style={[styles.dropdownBtnText, !species && styles.dropdownPlaceholder]}>
          {species || 'Select species…'}
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
          placeholder="Enter species…"
          placeholderTextColor="#94A3B8"
          autoFocus
        />
      )}

      <View style={{ height: 10 }} />
      {renderField('WHAT HAPPENED', what, setWhat, 'Describe the interaction…')}
      {renderTimestampField('DATE & TIME', dateStr && timeStr ? `${dateStr} ${timeStr}` : '', pickerFieldName)}

      <Text style={[styles.label, { marginTop: 6 }]}>GPS LOCATION</Text>
      <View style={styles.gpsRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={lat}
          onChangeText={setLat}
          placeholder="Lat"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
        />
        <View style={{ width: 8 }} />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={lng}
          onChangeText={setLng}
          placeholder="Lng"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
        />
      </View>
    </View>
  );

  const renderLostGearFields = () => (
    <View style={styles.incidentBlock}>
      {renderField('GEAR TYPE', lostGearType, setLostGearType, 'e.g. Wire trap')}
      {renderTimestampField('DATE & TIME', lostGearDate && lostGearTime ? `${lostGearDate} ${lostGearTime}` : '', 'lostGearTime')}
      <Text style={[styles.label, { marginTop: 6 }]}>GPS LOCATION</Text>
      <View style={styles.gpsRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={lostGearLat}
          onChangeText={setLostGearLat}
          placeholder="Lat"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
        />
        <View style={{ width: 8 }} />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={lostGearLng}
          onChangeText={setLostGearLng}
          placeholder="Lng"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
        />
      </View>
    </View>
  );

  const handleSave = async () => {
    if (baitEntries.length === 0) {
      Alert.alert('Missing Fields', 'Please add at least one bait entry.', [{ text: 'OK' }]);
      return;
    }
    if (bycatchYes === null) {
      Alert.alert('Missing Fields', 'Please answer Yes or No for Bycatch.', [{ text: 'OK' }]);
      return;
    }
    if (bycatchYes === true && bycatchEntries.length === 0) {
      Alert.alert('Missing Fields', 'You selected Yes for bycatch — please add at least one entry.', [{ text: 'OK' }]);
      return;
    }
    if (transferYes === null) {
      Alert.alert('Missing Fields', 'Please answer Yes or No for Transfers.', [{ text: 'OK' }]);
      return;
    }

    const allFields: Record<string, string> = {
      'Date Fished': dateFished,
      'Crew Registry': crewMembers.length > 0 ? 'ok' : '',
      'Departure Port': departurePort,
      'Port Landed': portLanded,
      'Time Sailed': timeSailed,
      'Time Started Hauling': timeStartedHauling,
      'Time Stopped Hauling': timeStoppedHauling,
      'Time of Landing': timeOfLanding,
      'Soak Duration': soakDuration,
      'Grid # / Area Fished': gridNumber,
      'Lobster Catch Weight': catchWeight,
      'Trap Hauls': trapHauls,
      'V-Notch / Size Counts': vNotchCount,
      'Latitude': gpsLat,
      'Longitude': gpsLng,
      'Personal Use Declaration': personalUse,
    };

    const missing: string[] = [];
    for (const [label, value] of Object.entries(allFields)) {
      if (!value || !value.trim()) missing.push(label);
    }

    if (missing.length > 0) {
      Alert.alert(
        'Missing Fields',
        `Please fill out every field before saving.\n\nMissing:\n• ${missing.join('\n• ')}`,
        [{ text: 'OK' }]
      );
      return;
    }

    const log: DfoLog = {
      id: tripId,
      mode: 'full',
      status: 'complete',
      dateFished,
      createdAt: Date.now(),
      data: buildLogData(),
    };

    const ok = await saveLog(log);
    if (ok) {
      onSaved();
    } else {
      Alert.alert('Error', 'Could not save the log. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        <View style={styles.infoBanner}>
          <Info size={16} color="#B45309" />
          <Text style={styles.infoText}>
            Red dots mark fields <Text style={{ fontWeight: '700' }}>not required</Text> in Gulf, Quebec, or Newfoundland ELOGs.
          </Text>
        </View>

        <View style={styles.captureCard}>
          <Text style={styles.captureTitle}>Quick Capture</Text>
          <Text style={styles.captureSubtitle}>Tap to stamp the exact time — or fill manually below</Text>
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
                  ? `Stop Sail  ${sailElapsed}`
                  : timeSailed ? `Sailed ${timeSailed}` : 'Start Sail'}
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
                  ? `Stop Haul  ${haulElapsed}`
                  : timeStartedHauling
                    ? `Hauled ${timeStartedHauling}–${timeStoppedHauling || '?'}`
                    : 'Start Haul'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#DBEAFE' }]}><Calendar size={16} color="#1E3A8A" /></View>
            <Text style={styles.sectionTitle}>Trip Information</Text>
          </View>
          {/* DATE FISHED — date picker, auto-fills today on new log */}
          <View style={styles.fieldRow}>
            <Text style={styles.label}>DATE FISHED</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => {
                const [y, mo, d] = dateFished ? dateFished.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()];
                const initial = new Date(y, mo - 1, d);
                setTempDate(initial);
                setPickerDate(initial);
                setPickerField(null); // null = date-only mode
                setPickerVisible(true);
              }}
            >
              <Text style={[styles.timeButtonText, !dateFished && styles.timeButtonPlaceholder]}>
                {dateFished || 'Tap to select date'}
              </Text>
              <Calendar size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
          {renderField('TRIP ID (AUTO-GENERATED)', tripId, () => {}, '', false, true)}
          <View style={styles.fieldRow}>
                      <Text style={styles.label}>CREW REGISTRY</Text>
                      <CrewSelector selected={crewMembers} onChange={setCrewMembers} />
                    </View>
                    <View style={styles.fieldRow}>
                                <Text style={styles.label}>DEPARTURE PORT</Text>
                                <PortSelector
                                  value={departurePort}
                                  onChange={setDeparturePort}
                                  placeholder="Select departure port..."
                                  savedPorts={savedPorts}
                                  onPortAdded={(port) => setSavedPorts(prev => [...prev, port])}
                                  onPortDeleted={(id, name) => {
                                    setSavedPorts(prev => prev.filter(p => p.id !== id));
                                    if (departurePort === name) setDeparturePort('');
                                  }}
                                />
                              </View>
                              <View style={styles.fieldRow}>
                                <Text style={styles.label}>PORT LANDED</Text>
                                <PortSelector
                                  value={portLanded}
                                  onChange={setPortLanded}
                                  placeholder="Select port landed..."
                                  savedPorts={savedPorts}
                                  onPortAdded={(port) => setSavedPorts(prev => [...prev, port])}
                                  onPortDeleted={(id, name) => {
                                    setSavedPorts(prev => prev.filter(p => p.id !== id));
                                    if (portLanded === name) setPortLanded('');
                                  }}
                                />
                              </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#FEE2E2' }]}><Clock size={16} color="#B91C1C" /></View>
            <Text style={styles.sectionTitle}>Timestamps</Text>
          </View>
          {renderTimestampField('TIME SAILED', timeSailed, 'sailed', true)}
          {renderTimestampField('TIME STARTED HAULING', timeStartedHauling, 'startHaul', true)}
          {renderTimestampField('TIME STOPPED HAULING', timeStoppedHauling, 'stopHaul', true)}
          {renderTimestampField('TIME OF LANDING', timeOfLanding, 'landing', true)}
          {renderField('SOAK DURATION (HRS)', soakDuration, setSoakDuration, 'Hours', true, false, 'numeric')}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#DCFCE7' }]}><Scale size={16} color="#15803D" /></View>
            <Text style={styles.sectionTitle}>Catch & Effort</Text>
          </View>
          {renderField('GRID # / AREA FISHED', gridNumber, setGridNumber, 'e.g. 34-12')}
          {renderField('LOBSTER CATCH WEIGHT (LBS)', catchWeight, setCatchWeight, '0', false, false, 'numeric')}
          {renderField('TRAP HAULS', trapHauls, setTrapHauls, '0', false, false, 'numeric')}
          {renderField('V-NOTCH / SIZE COUNTS', vNotchCount, setVNotchCount, '0', false, false, 'numeric')}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#FEE2E2' }]}><Fish size={16} color="#B91C1C" /></View>
            <Text style={styles.sectionTitle}>Bait Reporting</Text>
            <View style={styles.problemPill}><Text style={styles.problemPillText}>Maritimes only</Text></View>
          </View>
          {baitEntries.length === 0 && <Text style={styles.emptyHint}>No bait added yet.</Text>}
          {baitEntries.map((entry, i) => (
            <View key={i} style={styles.entryRow}>
              <View style={styles.entryInfo}>
                <Text style={styles.entryType}>{entry.type}</Text>
                <Text style={styles.entryLbs}>{entry.lbs} lbs</Text>
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteBait(i)}>
                <Trash2 size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addBtn} onPress={() => openSheet('bait')}>
            <Plus size={16} color="#1E3A8A" />
            <Text style={styles.addBtnText}>Add Bait</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#E0E7FF' }]}><MapPin size={16} color="#4338CA" /></View>
            <Text style={styles.sectionTitle}>GPS Coordinates</Text>
          </View>
          {renderField('LATITUDE', gpsLat, setGpsLat, '0.0000', false, false, 'numeric')}
          {renderField('LONGITUDE', gpsLng, setGpsLng, '0.0000', false, false, 'numeric')}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#FEF3C7' }]}><Anchor size={16} color="#B45309" /></View>
            <Text style={styles.sectionTitle}>Interactions & Other</Text>
          </View>

          {/* Bycatch */}
          <View style={[styles.incidentSection, { marginBottom: 12 }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#EDE9FE' }]}>
                <AlertTriangle size={16} color="#7C3AED" />
              </View>
              <Text style={[styles.sectionTitle, { fontSize: 13 }]}>Bycatch</Text>
            </View>
            {renderYesNoToggle('Was there any bycatch?', bycatchYes, (val) => {
              setBycatchYes(val);
              if (!val) setBycatchEntries([]);
            })}
            {bycatchYes === true && (
              <View style={styles.incidentBlock}>
                {bycatchEntries.length === 0 && <Text style={styles.emptyHint}>No bycatch added yet.</Text>}
                {bycatchEntries.map((entry, i) => (
                  <View key={i} style={styles.entryRow}>
                    <View style={styles.entryInfo}>
                      <Text style={styles.entryType}>{entry.species}</Text>
                      <Text style={styles.entryLbs}>{entry.lbs} lbs</Text>
                    </View>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteBycatch(i)}>
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={[styles.addBtn, { marginTop: 4 }]} onPress={() => openSheet('bycatch')}>
                  <Plus size={16} color="#1E3A8A" />
                  <Text style={styles.addBtnText}>Add Bycatch</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.incidentSection}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#EDE9FE' }]}>
                <AlertTriangle size={16} color="#7C3AED" />
              </View>
              <Text style={[styles.sectionTitle, { fontSize: 13 }]}>Marine Mammal Interaction</Text>
            </View>
            {renderYesNoToggle('Did an interaction occur?', mmYes, handleMmYes)}
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
              <Text style={[styles.sectionTitle, { fontSize: 13 }]}>Species at Risk Interaction</Text>
            </View>
            {renderYesNoToggle('Did an interaction occur?', sarYes, handleSarYes)}
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

          <View style={styles.incidentSection}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#EDE9FE' }]}>
                <AlertTriangle size={16} color="#7C3AED" />
              </View>
              <Text style={[styles.sectionTitle, { fontSize: 13 }]}>Lost / Found Gear</Text>
            </View>
            {renderYesNoToggle('Was gear lost or found?', lostGearYes, handleLostGearYes)}
            {lostGearYes === true && renderLostGearFields()}
          </View>

          {/* Transfers */}
          <View style={styles.incidentSection}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#EDE9FE' }]}>
                <AlertTriangle size={16} color="#7C3AED" />
              </View>
              <Text style={[styles.sectionTitle, { fontSize: 13 }]}>Transfers</Text>
            </View>
            {renderYesNoToggle('Were any transfers made?', transferYes, (val) => {
              setTransferYes(val);
              if (!val) setTransfers('');
            })}
            {transferYes === true && (
              <View style={styles.incidentBlock}>
                {renderField('BOAT / CARRIER / POUND', transfers, setTransfers, 'Describe the transfer…')}
              </View>
            )}
          </View>

          {renderField('PERSONAL USE DECLARATION (LBS)', personalUse, setPersonalUse, '0', false, false, 'numeric')}
        </View>

        <View style={styles.countBox}>
          <Text style={styles.countText}>
            <Text style={{ fontWeight: '700', color: '#B91C1C' }}>22 fields</Text> required per trip
          </Text>
          <Text style={styles.countSubtext}>(Old paper log: 7 fields)</Text>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSave}>
          <Save size={18} color="#FFFFFF" />
          <Text style={styles.submitText}>Save DFO Log</Text>
        </TouchableOpacity>

      </ScrollView>

      {Platform.OS === 'ios' && (
        <Modal visible={pickerVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setPickerVisible(false)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { applyPickerValue(tempDate); setPickerVisible(false); }}>
                  <Text style={styles.modalConfirm}>Done</Text>
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
                {sheetMode === 'bait' ? 'Add Bait' : 'Add Bycatch'}
              </Text>

              <Text style={styles.sheetLabel}>
                {sheetMode === 'bait' ? 'BAIT TYPE' : 'SPECIES'}
              </Text>
              <TouchableOpacity style={styles.dropdownBtn} onPress={() => setSheetDropdownOpen(o => !o)}>
                <Text style={[styles.dropdownBtnText, !sheetSelectedType && styles.dropdownPlaceholder]}>
                  {sheetSelectedType || 'Select…'}
                </Text>
                <ChevronDown size={16} color="#64748B" />
              </TouchableOpacity>

              {sheetDropdownOpen && (
                <View style={styles.dropdownList}>
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
                </View>
              )}

              {sheetSelectedType === 'Other' && (
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  value={sheetCustomType}
                  onChangeText={setSheetCustomType}
                  placeholder={sheetMode === 'bait' ? 'Enter bait type…' : 'Enter species…'}
                  placeholderTextColor="#94A3B8"
                  autoFocus
                />
              )}

              <Text style={[styles.sheetLabel, { marginTop: 14 }]}>WEIGHT (LBS)</Text>
              <TextInput
                style={styles.input}
                value={sheetLbs}
                onChangeText={setSheetLbs}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
              />

              <TouchableOpacity style={styles.sheetConfirmBtn} onPress={handleSheetConfirm}>
                <Text style={styles.sheetConfirmText}>Add Entry</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setSheetVisible(false)}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
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
});

export default FullDfoForm;
