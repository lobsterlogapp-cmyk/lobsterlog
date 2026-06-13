import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
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
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Scale,
  Anchor,
  ClipboardList,
  Save,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Play,
  Square,
  Plus,
  Trash2,
  Crosshair,
} from 'lucide-react-native';
import {
  saveLog,
  loadLogById,
  generateNextTripId,
  loadLastLog,
  DfoLog,
} from '../utils/dfoLogStorage';
import { useTimer } from '../context/TimerContext';
import CrewSelector from './CrewSelector';
import PortSelector from './PortSelector';
import { CrewMember } from '../utils/crewStorage';
import { Port, loadPorts } from '../utils/portStorage';

export interface FormHandle {
  saveDraft: () => Promise<void>;
}

type ProposalPage = 'every-trip' | 'when-applicable';
type PickerField = 'startHaul' | 'stopHaul' | 'mmTime' | 'sarTime' | 'lostGearTime' | null;
type SheetMode = 'bycatch' | null;
type BycatchEntry = { species: string; lbs: string; };

const BYCATCH_OPTIONS = ['Rock Crab', 'Jonah Crab', 'Haddock', 'Pollock', 'Halibut', 'Sea Urchin', 'Whelk', 'Other'];
const MARINE_MAMMAL_OPTIONS = ['North Atlantic Right Whale', 'Humpback Whale', 'Fin Whale', 'Minke Whale', 'Harbour Porpoise', 'Grey Seal', 'Harbour Seal', 'Atlantic White-sided Dolphin', 'Other'];
const SAR_OPTIONS = ['North Atlantic Right Whale', 'Leatherback Sea Turtle', 'Loggerhead Sea Turtle', "Kemp's Ridley Sea Turtle", 'Atlantic Sturgeon', 'Striped Bass (inner Bay of Fundy)', 'Other'];

interface LobsterLogProposalFormProps {
  editingLogId: string | null;
  onSaved: () => void;
}

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

const LobsterLogProposalForm = forwardRef<FormHandle, LobsterLogProposalFormProps>(
  ({ editingLogId, onSaved }, ref) => {

  const { t } = useTranslation('common');

  const [page, setPage] = useState<ProposalPage>('every-trip');

  // Page 1: Every Trip
  const [dateFished, setDateFished] = useState('');
  const [gridNumber, setGridNumber] = useState('');
  const [catchWeight, setCatchWeight] = useState('');
  const [trapHauls, setTrapHauls] = useState('');
  const [portLanded, setPortLanded] = useState('');
  const [tripId, setTripId] = useState('');
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [departurePort, setDeparturePort] = useState('');
  const [savedPorts, setSavedPorts] = useState<Port[]>([]);

  const [timeStartedHauling, setTimeStartedHauling] = useState('');
    const [timeStoppedHauling, setTimeStoppedHauling] = useState('');

    const [bycatchYes, setBycatchYes] = useState<boolean | null>(null);
    const [bycatchEntries, setBycatchEntries] = useState<BycatchEntry[]>([]);

  // Page 2: When Applicable — simple fields
  const [gpsLat, setGpsLat] = useState('');
  const [gpsLng, setGpsLng] = useState('');
  const [vNotchCount, setVNotchCount] = useState('');
  const [transfers, setTransfers] = useState('');
  const [personalUse, setPersonalUse] = useState('');

  // Global haul timer
    const {
      haulActive, haulStartTime, haulEndTime, haulElapsed,
      startHaul, stopHaul,
    } = useTimer();

    // Page 2: Marine Mammal incident
  const [mmSpecies, setMmSpecies] = useState('');
  const [mmSpeciesOther, setMmSpeciesOther] = useState('');
  const [mmDropdownOpen, setMmDropdownOpen] = useState(false);
  const [mmWhat, setMmWhat] = useState('');
  const [mmLat, setMmLat] = useState('');
  const [mmLng, setMmLng] = useState('');
  const [mmDate, setMmDate] = useState('');
  const [mmTime, setMmTime] = useState('');

  // Page 2: Species at Risk incident
  const [sarSpecies, setSarSpecies] = useState('');
  const [sarSpeciesOther, setSarSpeciesOther] = useState('');
  const [sarDropdownOpen, setSarDropdownOpen] = useState(false);
  const [sarWhat, setSarWhat] = useState('');
  const [sarLat, setSarLat] = useState('');
  const [sarLng, setSarLng] = useState('');
  const [sarDate, setSarDate] = useState('');
  const [sarTime, setSarTime] = useState('');

  // Page 2: Lost Gear incident
  const [lostGearType, setLostGearType] = useState('');
  const [lostGearWhat, setLostGearWhat] = useState('');
  const [lostGearLat, setLostGearLat] = useState('');
  const [lostGearLng, setLostGearLng] = useState('');
  const [lostGearDate, setLostGearDate] = useState('');
  const [lostGearTime, setLostGearTime] = useState('');

  // Multiple sections can stay open at once
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Draft tracking guards
  const [isLoaded, setIsLoaded] = useState(false);
  const [editingCompleted, setEditingCompleted] = useState(false);

  // DateTime picker
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerField, setPickerField] = useState<PickerField | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [tempDate, setTempDate] = useState(new Date());

  // Bycatch bottom sheet
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [sheetSelectedType, setSheetSelectedType] = useState('');
  const [sheetCustomType, setSheetCustomType] = useState('');
  const [sheetLbs, setSheetLbs] = useState('');
  const [sheetDropdownOpen, setSheetDropdownOpen] = useState(false);

  // --- Build data snapshot for save/draft ---
  const buildLogData = (): Record<string, string> => ({
    gridNumber, catchWeight, trapHauls,
    portLanded, crewRegistry: JSON.stringify(crewMembers), departurePort,
    timeStartedHauling, timeStoppedHauling,
    bycatchYes: String(bycatchYes),
    bycatchEntries: JSON.stringify(bycatchEntries),
    gpsLat, gpsLng, vNotchCount,
    transfers, personalUse,
    mmSpecies, mmSpeciesOther, mmWhat, mmLat, mmLng, mmDate, mmTime,
    sarSpecies, sarSpeciesOther, sarWhat, sarLat, sarLng, sarDate, sarTime,
    lostGearType, lostGearWhat, lostGearLat, lostGearLng, lostGearDate, lostGearTime,
  });

  // Only save a draft if the user has entered at least one meaningful field
  const hasMeaningfulData = (): boolean => {
    const d = buildLogData();
    const fields = ['gridNumber', 'catchWeight', 'trapHauls', 'portLanded',
      'crewRegistry', 'departurePort', 'timeStartedHauling', 'timeStoppedHauling'];
    return fields.some(f => d[f] && d[f].trim() !== '') || bycatchEntries.length > 0;
  };

  // Expose saveDraft to parent (DfoDemoScreen) via ref
  useImperativeHandle(ref, () => ({
    saveDraft: async () => {
      if (!isLoaded) return;
      if (editingCompleted) return;  // don't downgrade a completed log to draft
      if (!hasMeaningfulData()) return;

      const log: DfoLog = {
        id: tripId,
        mode: 'proposal',
        status: 'draft',
        dateFished: dateFished || formatDate(new Date()),
        createdAt: Date.now(),
        data: buildLogData(),
      };
      await saveLog(log);
    },
  }));

  useEffect(() => {
    const loadExisting = async () => {
      if (editingLogId) {
        const log = await loadLogById(editingLogId);
        if (log) {
          setTripId(log.id);
          setDateFished(log.dateFished);
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
          setTimeStartedHauling(d.timeStartedHauling || '');
          setTimeStoppedHauling(d.timeStoppedHauling || '');
          setGpsLat(d.gpsLat || '');
          setGpsLng(d.gpsLng || '');
          setVNotchCount(d.vNotchCount || '');
          setTransfers(d.transfers || '');
          setPersonalUse(d.personalUse || '');
          try {
                      const byc = JSON.parse(d.bycatchEntries || '[]');
                      setBycatchEntries(byc);
                      if (d.bycatchYes === 'true') setBycatchYes(true);
                      else if (d.bycatchYes === 'false') setBycatchYes(false);
                      else if (byc.length > 0) setBycatchYes(true); // back-fill old logs
                    } catch { setBycatchEntries([]); }

          setMmSpecies(d.mmSpecies || '');
          setMmSpeciesOther(d.mmSpeciesOther || '');
          setMmWhat(d.mmWhat || '');
          setMmLat(d.mmLat || '');
          setMmLng(d.mmLng || '');
          setMmDate(d.mmDate || '');
          setMmTime(d.mmTime || '');

          setSarSpecies(d.sarSpecies || '');
          setSarSpeciesOther(d.sarSpeciesOther || '');
          setSarWhat(d.sarWhat || '');
          setSarLat(d.sarLat || '');
          setSarLng(d.sarLng || '');
          setSarDate(d.sarDate || '');
          setSarTime(d.sarTime || '');

          setLostGearType(d.lostGearType || '');
          setLostGearWhat(d.lostGearWhat || '');
          setLostGearLat(d.lostGearLat || '');
          setLostGearLng(d.lostGearLng || '');
          setLostGearDate(d.lostGearDate || '');
          setLostGearTime(d.lostGearTime || '');

          // Mark as editing completed so draft save won't downgrade it
          if (log.status === 'complete') setEditingCompleted(true);
        }
      } else {
        const newId = await generateNextTripId(formatDate(new Date()));
        setTripId(newId);
        setDateFished(formatDate(new Date()));
        // Pre-fill crew and ports from the last completed log
        const last = await loadLastLog();
        if (last) {
          try {
            const cm = JSON.parse(last.data.crewRegistry || '[]');
            if (Array.isArray(cm) && cm.length > 0) setCrewMembers(cm);
          } catch {}
          if (last.data.departurePort) setDeparturePort(last.data.departurePort);
          if (last.data.portLanded) setPortLanded(last.data.portLanded);
        }
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

  useEffect(() => {
      if (haulStartTime) setTimeStartedHauling(haulStartTime);
    }, [haulStartTime]);

    useEffect(() => {
      if (haulEndTime) setTimeStoppedHauling(haulEndTime);
    }, [haulEndTime]);

    // --- GPS ---
  const captureGpsTo = async (setLat: (v: string) => void, setLng: (v: string) => void) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLat(loc.coords.latitude.toFixed(4));
      setLng(loc.coords.longitude.toFixed(4));
    } catch (_) {}
  };

  const captureGps = () => captureGpsTo(setGpsLat, setGpsLng);

  const captureMmNow = async () => {
    const now = new Date();
    setMmDate(formatDate(now)); setMmTime(formatTime(now));
    await captureGpsTo(setMmLat, setMmLng);
  };

  const captureSarNow = async () => {
    const now = new Date();
    setSarDate(formatDate(now)); setSarTime(formatTime(now));
    await captureGpsTo(setSarLat, setSarLng);
  };

  const captureLostGearNow = async () => {
    const now = new Date();
    setLostGearDate(formatDate(now)); setLostGearTime(formatTime(now));
    await captureGpsTo(setLostGearLat, setLostGearLng);
  };

  // --- Haul ---
    const handleHaulPress = async () => {
        if (!haulActive) {
          await startHaul();
          // timeStartedHauling synced via useEffect on haulStartTime
        } else {
          stopHaul();
          // timeStoppedHauling synced via useEffect on haulEndTime
          await captureGps();
        }
      };

 // --- Picker ---
 const applyPickerValue = (d: Date) => {
    if (pickerField === null) {
      setDateFished(formatDate(d));
      return;
    }
    switch (pickerField) {
      case 'startHaul':
        setDateFished(formatDate(d)); setTimeStartedHauling(formatTime(d)); break;
      case 'stopHaul':
        setDateFished(formatDate(d)); setTimeStoppedHauling(formatTime(d)); break;
      case 'mmTime':
        setMmDate(formatDate(d)); setMmTime(formatTime(d)); break;
      case 'sarTime':
        setSarDate(formatDate(d)); setSarTime(formatTime(d)); break;
      case 'lostGearTime':
        setLostGearDate(formatDate(d)); setLostGearTime(formatTime(d)); break;
    }
  };

  const openPicker = (field: PickerField) => {
    let current: Date;
    switch (field) {
      case 'startHaul':    current = parseDateTime(dateFished, timeStartedHauling); break;
      case 'stopHaul':     current = parseDateTime(dateFished, timeStoppedHauling); break;
      case 'mmTime':       current = parseDateTime(mmDate, mmTime); break;
      case 'sarTime':      current = parseDateTime(sarDate, sarTime); break;
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

  // --- Bycatch sheet ---
  const openSheet = () => {
    setSheetMode('bycatch');
    setSheetSelectedType('');
    setSheetCustomType('');
    setSheetLbs('');
    setSheetDropdownOpen(false);
    setSheetVisible(true);
  };

  const handleSheetConfirm = () => {
    const finalType = sheetSelectedType === 'Other' ? sheetCustomType.trim() : sheetSelectedType;
    if (!finalType) { Alert.alert(t('log.missingTitle'), t('log.pleaseSelectSpecies')); return; }
    if (!sheetLbs.trim()) { Alert.alert(t('log.missingTitle'), t('log.pleaseEnterWeight')); return; }
    setBycatchEntries(prev => [...prev, { species: finalType, lbs: sheetLbs.trim() }]);
    setSheetVisible(false);
  };

  const deleteBycatch = (index: number) => setBycatchEntries(prev => prev.filter((_, i) => i !== index));

  // --- Expandable sections (multi-open) ---
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(section) ? next.delete(section) : next.add(section);
      return next;
    });
  };

  // --- Save (complete) ---
  const handleSave = async () => {
    const coreFields: Record<string, string> = {
      'Date Fished': dateFished,
      'Port Landed': portLanded,
      'Crew Registry': crewMembers.length > 0 ? 'ok' : '',
      'Grid # / Area Fished': gridNumber,
      'Lobster Catch Weight': catchWeight,
      'Trap Hauls': trapHauls,
      'Time Started Hauling': timeStartedHauling,
      'Time Stopped Hauling': timeStoppedHauling,
    };

    const missing: string[] = [];
    for (const [label, value] of Object.entries(coreFields)) {
      if (!value || !value.trim()) missing.push(label);
    }

    if (missing.length > 0) {
      Alert.alert(
        t('log.missingFieldsTitle'),
        `${t('log.missingFieldsBody')}${missing.join('\n• ')}`,
        [{ text: t('nav.ok') }]
      );
      return;
    }

    const log: DfoLog = {
      id: tripId,
      mode: 'proposal',
      status: 'complete',
      dateFished,
      createdAt: Date.now(),
      data: buildLogData(),
    };

    const ok = await saveLog(log);
    if (ok) {
      setEditingCompleted(true);
      onSaved();
    } else {
      Alert.alert(t('settings.errorTitle'), t('log.saveError'));
    }
  };

  // --- Render helpers ---
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
            <Text style={[styles.yesNoBtnText, value === false && styles.yesNoBtnNoText]}>{t('common.no')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.yesNoBtn, value === true && styles.yesNoBtnYesActive]}
            onPress={() => onToggle(true)}
          >
            <Text style={[styles.yesNoBtnText, value === true && styles.yesNoBtnYesText]}>{t('common.yes')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );

    const renderField = (
    label: string, value: string, setter: (v: string) => void,
    placeholder: string, readOnly: boolean = false, keyboardType: any = 'default'
  ) => (
    <View style={styles.fieldRow}>
      <Text style={styles.label}>{label}</Text>
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

  const renderTimestampField = (label: string, value: string, field: PickerField) => (
    <View style={styles.fieldRow}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.timeButton} onPress={() => openPicker(field)}>
        <Text style={[styles.timeButtonText, !value && styles.timeButtonPlaceholder]}>
          {value || t('log.tapToSetDateTime')}
        </Text>
        <Clock size={16} color="#64748B" />
      </TouchableOpacity>
    </View>
  );

  const renderSpeciesDropdown = (
    species: string, setSpecies: (v: string) => void,
    speciesOther: string, setSpeciesOther: (v: string) => void,
    dropdownOpen: boolean, setDropdownOpen: (v: boolean) => void,
    options: string[]
  ) => (
    <View style={styles.fieldRow}>
      <Text style={styles.label}>{t('log.speciesLabel')}</Text>
      <TouchableOpacity style={styles.dropdownBtn} onPress={() => setDropdownOpen(!dropdownOpen)}>
        <Text style={[styles.dropdownBtnText, !species && styles.dropdownPlaceholder]}>
          {species || t('log.selectSpecies')}
        </Text>
        <ChevronDown size={16} color="#64748B" />
      </TouchableOpacity>
      {dropdownOpen && (
        <View style={styles.dropdownList}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.dropdownItem, species === opt && styles.dropdownItemActive]}
              onPress={() => { setSpecies(opt); if (opt !== 'Other') setSpeciesOther(''); setDropdownOpen(false); }}
            >
              <Text style={[styles.dropdownItemText, species === opt && styles.dropdownItemTextActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {species === 'Other' && (
        <TextInput
          style={[styles.input, { marginTop: 8 }]}
          value={speciesOther}
          onChangeText={setSpeciesOther}
          placeholder={t('log.enterSpecies')}
          placeholderTextColor="#94A3B8"
          autoFocus
        />
      )}
    </View>
  );

  const renderGpsRow = (lat: string, setLat: (v: string) => void, lng: string, setLng: (v: string) => void) => (
    <View style={styles.fieldRow}>
      <Text style={styles.label}>{t('log.gpsLocationLabel')}</Text>
      <View style={styles.gpsRow}>
        <TextInput style={[styles.input, { flex: 1 }]} value={lat} onChangeText={setLat}
          placeholder={t('log.latPlaceholder')} placeholderTextColor="#94A3B8" keyboardType="numeric" />
        <View style={{ width: 8 }} />
        <TextInput style={[styles.input, { flex: 1 }]} value={lng} onChangeText={setLng}
          placeholder={t('log.lngPlaceholder')} placeholderTextColor="#94A3B8" keyboardType="numeric" />
      </View>
    </View>
  );

  const renderCaptureNowBtn = (onPress: () => void) => (
    <TouchableOpacity style={styles.captureNowBtn} onPress={onPress}>
      <Crosshair size={16} color="#FFFFFF" />
      <Text style={styles.captureNowText}>{t('log.captureNowBtn')}</Text>
    </TouchableOpacity>
  );

  const renderExpandableSection = (
    key: string, title: string, description: string, children: React.ReactNode
  ) => {
    const isExpanded = expandedSections.has(key);
    return (
      <View style={styles.expandableSection}>
        <TouchableOpacity style={styles.expandableHeader} onPress={() => toggleSection(key)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.expandableTitle}>{title}</Text>
            <Text style={styles.expandableDesc}>{description}</Text>
          </View>
          {isExpanded ? <ChevronUp size={20} color="#64748B" /> : <ChevronDown size={20} color="#64748B" />}
        </TouchableOpacity>
        {isExpanded && <View style={styles.expandableBody}>{children}</View>}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Page Tabs */}
      <View style={styles.pageTabsContainer}>
        <TouchableOpacity
          style={[styles.pageTab, page === 'every-trip' && styles.pageTabActive]}
          onPress={() => setPage('every-trip')}
        >
          <Text style={[styles.pageTabText, page === 'every-trip' && styles.pageTabTextActive]}>
            {t('log.page1Tab')}
          </Text>
          <View style={[styles.pageTabBadge, page === 'every-trip' && styles.pageTabBadgeActive]}>
            <Text style={[styles.pageTabBadgeText, page === 'every-trip' && styles.pageTabBadgeTextActive]}>10</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pageTab, page === 'when-applicable' && styles.pageTabActive]}
          onPress={() => setPage('when-applicable')}
        >
          <Text style={[styles.pageTabText, page === 'when-applicable' && styles.pageTabTextActive]}>
            {t('log.page2Tab')}
          </Text>
          <View style={[styles.pageTabBadge, page === 'when-applicable' && styles.pageTabBadgeActive]}>
            <Text style={[styles.pageTabBadgeText, page === 'when-applicable' && styles.pageTabBadgeTextActive]}>7</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.infoBanner}>
          <CheckCircle size={16} color="#15803D" />
          <Text style={styles.infoText}>
            {page === 'every-trip' ? t('log.page1Banner') : t('log.page2Banner')}
          </Text>
        </View>

        {page === 'every-trip' ? (
          <>
            {/* Quick Capture */}
            <View style={styles.captureCard}>
              <Text style={styles.captureTitle}>{t('log.quickCaptureTitle')}</Text>
              <Text style={styles.captureSubtitle}>{t('log.quickCaptureSubtitle')}</Text>
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
                                  ? `${t('log.stopHaul')}  ${haulElapsed}`
                                  : timeStartedHauling
                                    ? t('log.hauledRange', { start: timeStartedHauling, end: timeStoppedHauling || '?' })
                                    : t('log.startHaul')}
                              </Text>
                            </TouchableOpacity>
            </View>

            {/* Trip Basics */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: '#DBEAFE' }]}><Calendar size={16} color="#1E3A8A" /></View>
                <Text style={styles.sectionTitle}>{t('log.tripBasicsSection')}</Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>{t('log.dateFishedLabel')}</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => {
                    const [y, mo, d] = dateFished ? dateFished.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()];
                    const initial = new Date(y, mo - 1, d);
                    setTempDate(initial);
                    setPickerDate(initial);
                    setPickerField(null);
                    setPickerVisible(true);
                  }}
                >
                  <Text style={[styles.timeButtonText, !dateFished && styles.timeButtonPlaceholder]}>
                    {dateFished || t('log.tapToSelectDate')}
                  </Text>
                  <Calendar size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
              {renderField(t('log.tripIdLabel'), tripId, () => {}, '', true)}

                            <View style={styles.fieldRow}>
                              <Text style={styles.label}>{t('log.portLandedLabel')}</Text>
                              <PortSelector
                                value={portLanded}
                                onChange={setPortLanded}
                                placeholder={t('log.selectPortLanded')}
                                savedPorts={savedPorts}
                                onPortAdded={(port) => setSavedPorts(prev => [...prev, port])}
                                onPortDeleted={(id, name) => {
                                  setSavedPorts(prev => prev.filter(p => p.id !== id));
                                  if (portLanded === name) setPortLanded('');
                                }}
                              />
                            </View>
                            <View style={styles.fieldRow}>
                              <Text style={styles.label}>{t('log.crewRegistryLabel')}</Text>
                              <CrewSelector selected={crewMembers} onChange={setCrewMembers} />
                            </View>
            </View>

            {/* Haul Times */}
                        <View style={styles.section}>
                          <View style={styles.sectionHeader}>
                            <View style={[styles.sectionIcon, { backgroundColor: '#DBEAFE' }]}><Clock size={16} color="#1E3A8A" /></View>
                            <Text style={styles.sectionTitle}>{t('log.haulTimesSection')}</Text>
                          </View>
                          {renderTimestampField(t('log.timeStartedHauling'), timeStartedHauling, 'startHaul')}
                          {renderTimestampField(t('log.timeStoppedHauling'), timeStoppedHauling, 'stopHaul')}
                        </View>

                        {/* GPS Coordinates */}
                        <View style={styles.section}>
                          <View style={styles.sectionHeader}>
                            <View style={[styles.sectionIcon, { backgroundColor: '#E0E7FF' }]}><Crosshair size={16} color="#4338CA" /></View>
                            <Text style={styles.sectionTitle}>{t('log.gpsCoordinatesSection')}</Text>
                          </View>
                          {renderField(t('log.latitudeLabel'), gpsLat, setGpsLat, '0.0000', false, 'numeric')}
                          {renderField(t('log.longitudeLabel'), gpsLng, setGpsLng, '0.0000', false, 'numeric')}
                        </View>

                        {/* Catch & Effort */}
                        <View style={styles.section}>
                          <View style={styles.sectionHeader}>
                            <View style={[styles.sectionIcon, { backgroundColor: '#DCFCE7' }]}><Scale size={16} color="#15803D" /></View>
                            <Text style={styles.sectionTitle}>{t('log.catchEffortSection')}</Text>
                          </View>
                          {renderField(t('log.gridAreaLabel'), gridNumber, setGridNumber, t('log.gridAreaPlaceholder'))}
                          {renderField(t('log.catchWeightLabel'), catchWeight, setCatchWeight, '0', false, 'numeric')}
                          {renderField(t('log.trapHaulsLabel'), trapHauls, setTrapHauls, '0', false, 'numeric')}
                        </View>

            <View style={styles.countBoxGreen}>
              <Text style={styles.countText}>
                <Text style={{ fontWeight: '700', color: '#15803D' }}>10 fields</Text> {t('log.perTrip')}
              </Text>
              <Text style={styles.countSubtext}>{t('log.countSubtextPage1')}</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.page2Intro}>
              <ClipboardList size={20} color="#1E3A8A" />
              <Text style={styles.page2IntroText}>
                {t('log.page2Intro')}
              </Text>
            </View>

            {renderExpandableSection('bycatch', t('log.bycatchSection'), t('log.bycatchDesc'),
                          <>
                                          {bycatchEntries.length === 0 && <Text style={styles.emptyHint}>{t('log.noBycatchYet')}</Text>}
                                          {bycatchEntries.map((entry, i) => (
                                            <View key={i} style={styles.entryRow}>
                                              <View style={styles.entryInfo}>
                                                <Text style={styles.entryType}>{entry.species}</Text>
                                                <Text style={styles.entryLbs}>{t('log.lbsSuffix', { lbs: entry.lbs })}</Text>
                                              </View>
                                              <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteBycatch(i)}>
                                                <Trash2 size={16} color="#EF4444" />
                                              </TouchableOpacity>
                                            </View>
                                          ))}
                                          <TouchableOpacity style={styles.addBtn} onPress={openSheet}>
                                            <Plus size={16} color="#1E3A8A" />
                                            <Text style={styles.addBtnText}>{t('log.addBycatch')}</Text>
                                          </TouchableOpacity>
                                        </>
                        )}

            {renderExpandableSection('vnotch', t('log.vnotchSection'), t('log.vnotchDesc'),
              renderField(t('log.vnotchLabel'), vNotchCount, setVNotchCount, '0', false, 'numeric')
            )}

            {renderExpandableSection('mammal', t('log.mmSection'), t('log.incidentDesc'),
              <>
                {renderCaptureNowBtn(captureMmNow)}
                {renderSpeciesDropdown(mmSpecies, setMmSpecies, mmSpeciesOther, setMmSpeciesOther, mmDropdownOpen, setMmDropdownOpen, MARINE_MAMMAL_OPTIONS)}
                {renderField(t('log.whatHappenedLabel'), mmWhat, setMmWhat, t('log.describeInteraction'))}
                {renderTimestampField(t('log.dateTimeLabel'), mmDate && mmTime ? `${mmDate} ${mmTime}` : '', 'mmTime')}
                {renderGpsRow(mmLat, setMmLat, mmLng, setMmLng)}
              </>
            )}

            {renderExpandableSection('sar', t('log.sarSection'), t('log.incidentDesc'),
              <>
                {renderCaptureNowBtn(captureSarNow)}
                {renderSpeciesDropdown(sarSpecies, setSarSpecies, sarSpeciesOther, setSarSpeciesOther, sarDropdownOpen, setSarDropdownOpen, SAR_OPTIONS)}
                {renderField(t('log.whatHappenedLabel'), sarWhat, setSarWhat, t('log.describeInteraction'))}
                {renderTimestampField(t('log.dateTimeLabel'), sarDate && sarTime ? `${sarDate} ${sarTime}` : '', 'sarTime')}
                {renderGpsRow(sarLat, setSarLat, sarLng, setSarLng)}
              </>
            )}

            {renderExpandableSection('lost', t('log.lostGearSection'), t('log.lostGearDesc'),
              <>
                {renderCaptureNowBtn(captureLostGearNow)}
                {renderField(t('log.gearTypeLabel'), lostGearType, setLostGearType, t('log.gearTypePlaceholder'))}
                {renderField(t('log.whatHappenedLabel'), lostGearWhat, setLostGearWhat, t('log.describePlaceholder'))}
                {renderTimestampField(t('log.dateTimeLabel'), lostGearDate && lostGearTime ? `${lostGearDate} ${lostGearTime}` : '', 'lostGearTime')}
                {renderGpsRow(lostGearLat, setLostGearLat, lostGearLng, setLostGearLng)}
              </>
            )}

            {renderExpandableSection('transfer', t('log.transfersSection'), t('log.transfersDesc'),
              renderField(t('log.detailsLabel'), transfers, setTransfers, t('log.describeTransfer'))
            )}
            {renderExpandableSection('personal', t('log.personalUseSection'), t('log.personalUseDesc'),
              renderField(t('log.poundsLabel'), personalUse, setPersonalUse, '0', false, 'numeric')
            )}

            <View style={styles.countBoxBlue}>
              <Text style={styles.countText}>
                <Text style={{ fontWeight: '700', color: '#1E3A8A' }}>0 fields</Text> {t('log.neededToday')}
              </Text>
              <Text style={styles.countSubtext}>{t('log.countSubtextPage2')}</Text>
            </View>
          </>
        )}

        <TouchableOpacity style={styles.submitButton} onPress={handleSave}>
          <Save size={18} color="#FFFFFF" />
          <Text style={styles.submitText}>{t('log.saveButton')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* iOS DateTime Picker Modal */}
      {Platform.OS === 'ios' && (
        <Modal visible={pickerVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setPickerVisible(false)}>
                  <Text style={styles.modalCancel}>{t('nav.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { applyPickerValue(tempDate); setPickerVisible(false); }}>
                  <Text style={styles.modalConfirm}>{t('nav.done')}</Text>
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

      {/* Add Bycatch Bottom Sheet */}
      <Modal visible={sheetVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSheetVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.sheetContent}>
              <Text style={styles.sheetTitle}>{t('log.addBycatch')}</Text>
              <Text style={styles.sheetLabel}>{t('log.speciesLabel')}</Text>
              <TouchableOpacity style={styles.dropdownBtn} onPress={() => setSheetDropdownOpen(o => !o)}>
                <Text style={[styles.dropdownBtnText, !sheetSelectedType && styles.dropdownPlaceholder]}>
                  {sheetSelectedType || t('log.selectPlaceholder')}
                </Text>
                <ChevronDown size={16} color="#64748B" />
              </TouchableOpacity>
              {sheetDropdownOpen && (
                <View style={styles.dropdownList}>
                  {BYCATCH_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.dropdownItem, sheetSelectedType === opt && styles.dropdownItemActive]}
                      onPress={() => { setSheetSelectedType(opt); setSheetDropdownOpen(false); }}
                    >
                      <Text style={[styles.dropdownItemText, sheetSelectedType === opt && styles.dropdownItemTextActive]}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {sheetSelectedType === 'Other' && (
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  value={sheetCustomType} onChangeText={setSheetCustomType}
                  placeholder={t('log.enterSpecies')} placeholderTextColor="#94A3B8" autoFocus
                />
              )}
              <Text style={[styles.sheetLabel, { marginTop: 14 }]}>{t('log.weightLbsLabel')}</Text>
              <TextInput
                style={styles.input} value={sheetLbs} onChangeText={setSheetLbs}
                placeholder="0" placeholderTextColor="#94A3B8" keyboardType="numeric"
              />
              <TouchableOpacity style={styles.sheetConfirmBtn} onPress={handleSheetConfirm}>
                <Text style={styles.sheetConfirmText}>{t('log.addEntry')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setSheetVisible(false)}>
                <Text style={styles.sheetCancelText}>{t('nav.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageTabsContainer: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  pageTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, paddingHorizontal: 8,
    borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  pageTabActive: { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' },
  pageTabText: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  pageTabTextActive: { color: '#FFFFFF', fontWeight: '700' },
  pageTabBadge: { backgroundColor: '#E2E8F0', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  pageTabBadgeActive: { backgroundColor: '#FBBF24' },
  pageTabBadgeText: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  pageTabBadgeTextActive: { color: '#1E293B' },
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#BBF7D0',
    padding: 12, borderRadius: 10, marginBottom: 16,
  },
  infoText: { flex: 1, color: '#14532D', fontSize: 12, lineHeight: 16 },
  captureCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0',
  },
  captureTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  captureSubtitle: { fontSize: 12, color: '#64748B', marginBottom: 12 },
  captureBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 10,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  captureBtnActive: { backgroundColor: '#B91C1C', borderColor: '#B91C1C' },
  captureBtnText: { fontSize: 15, fontWeight: '700', color: '#1E3A8A' },
  captureBtnTextActive: { color: '#FFFFFF' },
  captureBtnTextDone: { color: '#15803D' },
  captureNowBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 8,
    backgroundColor: '#1E3A8A', marginBottom: 12,
  },
  captureNowText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
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
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  fieldRow: { marginBottom: 10 },
  label: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 0.5, marginBottom: 4 },
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
  gpsRow: { flexDirection: 'row' },
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
  page2Intro: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
    padding: 12, borderRadius: 10, marginBottom: 12,
  },
  page2IntroText: { flex: 1, color: '#1E40AF', fontSize: 12, lineHeight: 16 },
  expandableSection: {
    backgroundColor: '#FFFFFF', borderRadius: 10, marginBottom: 8,
    borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden',
  },
  expandableHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  expandableTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  expandableDesc: { fontSize: 12, color: '#64748B' },
  expandableBody: {
    padding: 14, paddingTop: 4,
    borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#F8FAFC',
  },
  countBoxGreen: {
    backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0',
    borderRadius: 10, padding: 14, marginTop: 4, marginBottom: 16, alignItems: 'center',
  },
  countBoxBlue: {
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
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
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  modalCancel: { fontSize: 16, color: '#64748B', fontWeight: '600' },
  modalConfirm: { fontSize: 16, color: '#1E3A8A', fontWeight: '700' },
  sheetContent: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 20, paddingBottom: 40,
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
    backgroundColor: '#1E3A8A', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20,
  },
  sheetConfirmText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  sheetCancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  sheetCancelText: { color: '#64748B', fontWeight: '600', fontSize: 15 },
});

export default LobsterLogProposalForm;
