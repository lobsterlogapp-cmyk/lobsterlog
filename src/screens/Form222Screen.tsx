import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { openAndroidDateTime, openAndroidDate } from '../utils/androidDateTimePicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronDown, Calendar, Clock, LocateFixed, Lock, Save } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import {
  Form222Entry,
  generateForm222Uid,
  saveForm222Entry,
  loadForm222EntryByUid,
  loadForm222Entries,
  MARINE_MAMMAL_SPECIES,
  MARINE_MAMMAL_SPECIES_LABELS,
  INTERACTION_TYPES,
  INTERACTION_TYPE_LABELS,
  CONFIDENCE_LEVEL_LABELS,
  SPECIMEN_CONDITION_LABELS,
  LENGTH_CATEGORY_LABELS,
} from '../utils/dfoForm222Generator';
import {
  MV_NOAA_MM_SPECIES,
  MV_INCIDENT_TYPE,
  MV_CONFIDENCE_LEVEL,
  MV_MM_SPECIMENS_CONDITION,
  MV_MM_LENGTH_CATEGORY,
} from '../data/reftables';
import { loadLastLog, loadAllLogs, logsOwingForm222 } from '../utils/dfoLogStorage';
// S125 7b: send moved off the form onto the list card — the screen no longer imports the
// generate/validate/envelope/submit/backup surface (now in sendFormEntry.ts, called from the list).
import { loadCaptainProfile, CaptainProfile, EMPTY_PROFILE } from '../utils/captainStorage';
import { clampCoord4 } from '../utils/dfoConstants';
import { isFieldRequired, missingInContainer, MissingField } from '../utils/dfoRequirements';
import { REQUIRED_ASTERISK_COLOR } from '../styles/GlobalStyles';

// FR display text for the stored EN reftable labels, one map per table (same descEn can
// recur across tables with different FR). Display-only: the stored Form222Entry label
// values and the generator's label→codeId resolution stay on descEn.
const toFrByEn = (rows: readonly { descEn: string; descFr: string }[]) =>
  new Map(rows.map(r => [r.descEn, r.descFr]));
const SPECIES_FR = toFrByEn(MV_NOAA_MM_SPECIES);
const INTERACTION_TYPE_FR = toFrByEn(MV_INCIDENT_TYPE);
const CONFIDENCE_FR = toFrByEn(MV_CONFIDENCE_LEVEL);
const SPECIMEN_COND_FR = toFrByEn(MV_MM_SPECIMENS_CONDITION);
const LENGTH_CAT_FR = toFrByEn(MV_MM_LENGTH_CATEGORY);

interface Props {
  onClose: () => void;
  // S125 7a: lets the parent Modal's onRequestClose (Android hardware back) invoke this
  // screen's park-then-close handler, so EVERY exit goes through one path that parks the draft.
  registerClose?: (fn: () => void) => void;
  // S125 7c: which parked draft to open. Provided → hydrate that entry; absent → fresh EMPTY form.
  // Replaces 7a's auto-restore-newest-draft (the trap: no way to start a new form / delete one).
  entryUid?: string;
  // S137 Phase 6 (R-J): the owing log's lgbkUid, supplied by the red logs-list button when
  // exactly one log owes a declaration. Preferred over loadLastLog()'s most-recent-completed
  // guess for the logbook-reference prefill; the field stays visible and editable. Absent on
  // every other open path (parked draft, closed-card Review, the button while blue).
  prefillUid?: string;
}

interface FormState {
  interactInd: 'Y' | 'N';
  reportDate: string;
  interactionDate: string;
  interactionTime: string;
  lat: string;
  lon: string;
  speciesLabel: string;
  nbAnimals: string;
  interactionTypeLabel: string;
  injuryInd: 'Y' | 'N';
  deathInd: 'Y' | 'N';
  entangleInd: 'Y' | 'N';
  releaseInd: 'Y' | 'N';
  gearDamageInd: 'Y' | 'N';
  observerNm: string;
  contactInfo: string;
  remarks: string;
  // T6 free-text fields (all string_150, optional) — Session 111
  siteDsc: string;      // → SITE_DSC
  gearDmgRem: string;   // → GEAR_DMG_REM
  docRem: string;       // → DOC_REM
  eventDsc: string;     // → EVENT_DSC
  incdntRem: string;    // → INCDNT_REM (rides the first incident node)
  confidenceLabel: string;   // → ID_CNFDNCE_ID (optional)
  specimenCondLabel: string; // → SPCMN_COND_ID (optional)
  lengthCatLabel: string;    // → BDY_LEN_ID (optional)
  lgbkNumRef: string;
}

const todayISO = (): string => new Date().toISOString().slice(0, 10);

const EMPTY_FORM: FormState = {
  interactInd: 'N',
  reportDate: todayISO(),
  interactionDate: '',
  interactionTime: '',
  lat: '',
  lon: '',
  speciesLabel: '',
  nbAnimals: '',
  interactionTypeLabel: '',
  injuryInd: 'N',
  deathInd: 'N',
  entangleInd: 'N',
  releaseInd: 'N',
  gearDamageInd: 'N',
  observerNm: '',
  contactInfo: '',
  remarks: '',
  siteDsc: '',
  gearDmgRem: '',
  docRem: '',
  eventDsc: '',
  incdntRem: '',
  confidenceLabel: '',
  specimenCondLabel: '',
  lengthCatLabel: '',
  lgbkNumRef: '',
};

// Mirror of FullDfoForm.formatDate / formatTime — picker Date → the strings the generator accepts.
const formatPickerDate = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatPickerTime = (d: Date): string => {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

// Seed the picker from the currently-entered YYYY-MM-DD (+ optional HH:MM); mirror of FullDfoForm.parseDateTime.
const parsePickerDateTime = (dateStr: string, timeStr: string): Date => {
  const d = new Date();
  if (dateStr) {
    const [y, mo, da] = dateStr.split('-').map(Number);
    if (!isNaN(y) && !isNaN(mo) && !isNaN(da)) d.setFullYear(y, mo - 1, da);
  }
  if (timeStr) {
    const [h, mi] = timeStr.split(':').map(Number);
    if (!isNaN(h) && !isNaN(mi)) d.setHours(h, mi, 0, 0);
  }
  return d;
};

export default function Form222Screen({ onClose, registerClose, entryUid, prefillUid }: Props) {
  const { t, i18n } = useTranslation('dfo');
  const { t: tc } = useTranslation('common');
  const isFr = i18n.language.startsWith('fr');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [profile, setProfile] = useState<CaptainProfile>(EMPTY_PROFILE);
  // S140 P2: every star asks the shared table. The 222's requirements don't vary by
  // region; the Rule-593 set keys on the interaction answer, passed as values.
  const req = (f: string) =>
    isFieldRequired(f, { subformId: profile.subformId ?? 90 }, { interactInd: form.interactInd }, 'form222');
  const [speciesOpen, setSpeciesOpen] = useState(false);
  const [interactionTypeOpen, setInteractionTypeOpen] = useState(false);
  const [confidenceOpen, setConfidenceOpen] = useState(false);
  const [specimenCondOpen, setSpecimenCondOpen] = useState(false);
  const [lengthCatOpen, setLengthCatOpen] = useState(false);
  // S137 Phase 7: the logbook-reference picker. owingRefs = the logs that currently owe a
  // marine-mammal declaration (Phase 6's logsOwingForm222, the ONE definition of "owes"),
  // oldest first by founder ruling. Non-empty ⇒ the LOGBOOK NUMBER REFERRED field renders as
  // a tappable picker; empty ⇒ the plain text input, exactly as before (founder ruling: no
  // sheet when there is nothing to list). manualRef flips the field back to typing for this
  // mount after the picker's "Enter manually" row is tapped.
  const [owingRefs, setOwingRefs] = useState<{ lgbkUid: string; dateFished: string }[]>([]);
  const [refPickerOpen, setRefPickerOpen] = useState(false);
  const [manualRef, setManualRef] = useState(false);
  const [latError, setLatError] = useState('');
  const [lonError, setLonError] = useState('');
  const [gpsCapturing, setGpsCapturing] = useState(false);
  // S125 7b: ISO close timestamp once Close & Save is confirmed. Non-null ⇒ the form is locked
  // (view-only) and already persisted as a closed-unsent record; the park guard then skips it.
  // S125 7b/7d: lock derived STRICTLY from the loaded entry's stored closeDt (ruling 2 — storage
  // is the single source of truth; NEVER a flag set by the close action). Set ONLY from
  // draft.closeDt in the mount effect, so a force-quit + reopen re-derives it. Non-null ⇒ read-only.
  const [lockedCloseDt, setLockedCloseDt] = useState<string | null>(null);

  // S125 7a draft lifecycle refs (see Form233Screen for the full rationale):
  //  prefillRef  — the lgbkNumRef value auto-prefilled on mount; the empty-check counts the
  //                reference field as content only when it DIFFERS from this (a user fix).
  //  draftUidRef — uid this screen instance owns (hydrated draft's uid, else minted on first park).
  const prefillRef = useRef<string>('');
  const draftUidRef = useRef<string | null>(null);

  useEffect(() => {
    loadCaptainProfile().then(setProfile);
    (async () => {
      // S125 7c: hydrate the SPECIFIC entry the list asked for (entryUid), else start fresh.
      // No more auto-restore-newest — that was the trap (couldn't start a new form or delete one).
      // Labels round-trip straight back into the pickers (the store holds labels).
      const [last, draft, allLogs, entries] = await Promise.all([
        loadLastLog(),
        entryUid ? loadForm222EntryByUid(entryUid) : Promise.resolve(null),
        loadAllLogs(),
        loadForm222Entries(),
      ]);
      // S137 Phase 7: the picker's list — only the logs that owe a declaration, oldest first
      // (founder ruling; loadAllLogs returns newest-first, so sort explicitly).
      setOwingRefs(
        logsOwingForm222(allLogs, entries)
          .sort((a, b) => a.createdAt - b.createdAt)
          .map(l => ({ lgbkUid: l.lgbkUid, dateFished: l.dateFished })),
      );
      // S137 Phase 6 (R-J): the owing log's UID, when the red button supplied one, beats the
      // most-recent-completed guess. prefillRef tracks whichever value was used, so the
      // isEmpty changed-from-prefill rule is unaffected.
      const prefill = prefillUid ?? last?.lgbkUid ?? '';
      prefillRef.current = prefill;
      if (draft) {
        draftUidRef.current = draft.uid;
        // 7d ruling 2: derive the lock from stored closeDt. A closed entry opened via Review
        // renders read-only; survives force-quit because it is re-read from storage every mount.
        if (draft.closeDt) setLockedCloseDt(draft.closeDt);
        setForm({
          interactInd: draft.interactInd,
          reportDate: draft.reportDate,
          interactionDate: draft.interactionDate,
          interactionTime: draft.interactionTime,
          lat: draft.lat,
          lon: draft.lon,
          speciesLabel: draft.speciesLabel,
          nbAnimals: draft.nbAnimals,
          interactionTypeLabel: draft.interactionTypeLabel,
          injuryInd: draft.injuryInd,
          deathInd: draft.deathInd,
          entangleInd: draft.entangleInd,
          releaseInd: draft.releaseInd,
          gearDamageInd: draft.gearDamageInd,
          observerNm: draft.observerNm,
          contactInfo: draft.contactInfo,
          remarks: draft.remarks,
          siteDsc: draft.siteDsc ?? '',
          gearDmgRem: draft.gearDmgRem ?? '',
          docRem: draft.docRem ?? '',
          eventDsc: draft.eventDsc ?? '',
          incdntRem: draft.incdntRem ?? '',
          confidenceLabel: draft.confidenceLabel ?? '',
          specimenCondLabel: draft.specimenCondLabel ?? '',
          lengthCatLabel: draft.lengthCatLabel ?? '',
          lgbkNumRef: draft.lgbkNumRef ?? '',
        });
      } else if (prefill) {
        // LGBK_NUM_REF prefill (never overwrites typed text) when there is no draft to restore.
        setForm(prev => prev.lgbkNumRef ? prev : { ...prev, lgbkNumRef: prefill });
      }
    })();
  }, []);

  const set = <K extends keyof FormState>(key: K) => (value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const toggleYN = (key: keyof FormState) => () => {
    setForm(prev => ({ ...prev, [key]: prev[key] === 'Y' ? 'N' : 'Y' }));
  };

  // S125 7a: build a Form222Entry from current state at the given lifecycle stage. Shared by the
  // park path (status:'draft', sentToDfo:false) and the send path (status:'complete') so a parked
  // draft and a sent record differ only in status/sent flags. uid reuses the owned draft uid, so
  // the generated XML stays byte-identical.
  const buildEntry = (status: 'draft' | 'complete', sentToDfo: boolean, closeDt?: string): Form222Entry => ({
    uid: draftUidRef.current ?? generateForm222Uid(),
    savedAt: Date.now(),
    interactInd: form.interactInd,
    reportDate: form.reportDate,
    interactionDate: form.interactionDate,
    interactionTime: form.interactionTime,
    lat: form.lat,
    lon: form.lon,
    speciesLabel: form.speciesLabel,
    nbAnimals: form.nbAnimals,
    interactionTypeLabel: form.interactionTypeLabel,
    injuryInd: form.injuryInd,
    deathInd: form.deathInd,
    entangleInd: form.entangleInd,
    releaseInd: form.releaseInd,
    gearDamageInd: form.gearDamageInd,
    observerNm: form.observerNm,
    contactInfo: form.contactInfo,
    remarks: form.remarks,
    siteDsc: form.siteDsc,
    gearDmgRem: form.gearDmgRem,
    docRem: form.docRem,
    eventDsc: form.eventDsc,
    incdntRem: form.incdntRem,
    confidenceLabel: form.confidenceLabel,
    specimenCondLabel: form.specimenCondLabel,
    lengthCatLabel: form.lengthCatLabel,
    lgbkNumRef: form.lgbkNumRef,
    ...(closeDt ? { closeDt } : {}),
    status,
    sentToDfo,
  });

  // S125 7a: "empty" = nothing the USER caused. EXCLUDED: reportDate (auto-defaulted to today).
  // The master toggle counts only as 'Y'; the reference field counts only when CHANGED from the
  // mount prefill (ruling 2).
  const isEmpty = (): boolean => {
    const flags =
      form.interactInd === 'Y' ||
      form.injuryInd === 'Y' || form.deathInd === 'Y' || form.entangleInd === 'Y' ||
      form.releaseInd === 'Y' || form.gearDamageInd === 'Y';
    const typed = [
      form.interactionDate, form.interactionTime, form.lat, form.lon, form.speciesLabel,
      form.nbAnimals, form.interactionTypeLabel, form.observerNm, form.contactInfo, form.remarks,
      form.siteDsc, form.gearDmgRem, form.docRem, form.eventDsc, form.incdntRem,
      form.confidenceLabel, form.specimenCondLabel, form.lengthCatLabel,
    ].some(v => v.trim() !== '');
    const refChanged = form.lgbkNumRef !== prefillRef.current;
    return !(flags || typed || refChanged);
  };

  // S125 7a/7b: the ONE exit path. Parks a non-empty draft — UNLESS the form was just closed
  // (already persisted as 'complete'; parking would overwrite it back to a draft).
  const handleClose = async () => {
    if (!lockedCloseDt && !isEmpty()) {
      if (!draftUidRef.current) draftUidRef.current = generateForm222Uid();
      await saveForm222Entry(buildEntry('draft', false));
    }
    onClose();
  };
  // Register the latest handleClose with the parent (via a ref so we register once), so the
  // Modal's onRequestClose — Android hardware back — runs the same park-then-close path.
  const handleCloseRef = useRef(handleClose);
  handleCloseRef.current = handleClose;
  useEffect(() => { registerClose?.(() => { void handleCloseRef.current(); }); }, []);

  const insets = useSafeAreaInsets(); // S95: edge-to-edge safe-area top for the modal header

  // Date/time pickers (mirror FullDfoForm's platform-split). Report = date-only; interaction = datetime.
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerField, setPickerField] = useState<'report' | 'interaction' | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [tempDate, setTempDate] = useState(new Date());

  const openPicker = (field: 'report' | 'interaction') => {
    const current = field === 'interaction'
      ? parsePickerDateTime(form.interactionDate, form.interactionTime)
      : parsePickerDateTime(form.reportDate, '');
    if (Platform.OS === 'android') {
      // Imperative flow — avoids the mode="datetime" unmount-dismiss crash (S95).
      // interaction = date+time (two-step); report = date-only (single dialog).
      if (field === 'interaction') {
        openAndroidDateTime(current, (d) => applyPickerValueForField(field, d));
      } else {
        openAndroidDate(current, (d) => applyPickerValueForField(field, d));
      }
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
  const applyPickerValueForField = (field: 'report' | 'interaction' | null, d: Date) => {
    if (field === 'report') {
      set('reportDate')(formatPickerDate(d));
    } else if (field === 'interaction') {
      // One picker, two stored strings — mirror of FullDfoForm's mmTime case.
      set('interactionDate')(formatPickerDate(d));
      set('interactionTime')(formatPickerTime(d));
    }
  };

  // iOS Modal "Done" applies the staged value against the current pickerField state.
  const applyPickerValue = (d: Date) => applyPickerValueForField(pickerField, d);

  const handleLatChange = (v: string) => {
    set('lat')(v);
    const n = parseFloat(v);
    // XSD 39588.222 latitude type: 38-72 deg
    if (v && (isNaN(n) || n < 38 || n > 72)) {
      setLatError(t('form222.latError'));
    } else {
      setLatError('');
    }
  };

  const handleLonChange = (v: string) => {
    set('lon')(v);
    const n = parseFloat(v);
    // XSD 39588.222 longitude type: -148 to -40 deg
    if (v && (isNaN(n) || n < -148 || n > -40)) {
      setLonError(t('form222.lonError'));
    } else {
      setLonError('');
    }
  };

  // "Use my location": fill lat/lon from a live GPS fix. Values are clamped to the XSD's
  // ≤4-decimal limit (shared clampCoord4) and written through the SAME manual change
  // handlers, so range validation runs and the user can still hand-edit afterwards.
  // On denial / no fix / timeout: loud Alert, fields left untouched — never 0/blank.
  const captureMyLocation = async () => {
    if (gpsCapturing) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      setGpsCapturing(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('form222.gpsDeniedTitle'), t('form222.gpsDeniedBody'));
        return; // fields untouched, manual entry remains the path
      }
      // expo-location has no first-class timeout — race the fix against a rejecting timer.
      const loc = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('gps-timeout')), 15000);
        }),
      ]);
      const lat = loc?.coords?.latitude;
      const lon = loc?.coords?.longitude;
      if (
        typeof lat !== 'number' || !isFinite(lat) ||
        typeof lon !== 'number' || !isFinite(lon)
      ) {
        Alert.alert(t('form222.gpsNoFixTitle'), t('form222.gpsNoFixBody'));
        return; // never write 0/blank coordinates on a bad fix
      }
      handleLatChange(clampCoord4(String(lat)));
      handleLonChange(clampCoord4(String(lon)));
    } catch (_e) {
      Alert.alert(t('form222.gpsNoFixTitle'), t('form222.gpsNoFixBody'));
    } finally {
      if (timer) clearTimeout(timer);
      setGpsCapturing(false);
    }
  };

  // S125 7b: local "YYYY-MM-DD HH:MM" for the Closed banner (mirrors FullDfoForm.formatClose).
  const formatClose = (iso: string): string => {
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return '';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())} ${p(dt.getHours())}:${p(dt.getMinutes())}`;
  };

  // S125 7b/7d: Close & Save — never-suppressible confirm (DFO 234.7 finality) → stamp the real
  // close time, persist as a closed-unsent record, then LEAVE the form and return to the DFO ELOGs
  // list (7d parity with the 234's Close & Save All). The save is AWAITED before onClose so the
  // list's refresh reads the closed record; if the save FAILS we stay on the form and say so
  // (ruling 1 — never navigate off unsaved data). No send here (send is from the list card).
  // S141 P3b: the close gate. The refusal bullet — blank fields read as their bare label
  // (one container, no prefix, ruling 8); invalid values carry their field's error wording.
  const closeBulletText = (m: MissingField): string => {
    if (m.reason === 'invalid') {
      const errKey =
        m.fieldKey === 'lat' ? 'form222.latError' :
        m.fieldKey === 'lon' ? 'form222.lonError' :
        m.fieldKey === 'nbAnimals' ? 'form222.nbAnimalsRangeError' :
        m.fieldKey === 'interactionDate' ? 'form222.dateOrderError' :
        m.fieldKey === 'reportDate' ? 'form222.reportDateFutureError' : null;
      if (errKey) return t(errKey);
    }
    return t(m.labelKey);
  };

  const handleCloseAndSave = () => {
    if (lockedCloseDt) return;
    // S141 P3b: refuse to seal a form the send validator would refuse to send — the gate
    // asks the shared table (dfoRequirements) BEFORE the confirm dialog; nothing is
    // stamped on a refusal. The Rule-593 set keys on the interaction answer via the
    // form values themselves.
    const missing = missingInContainer('form222', { subformId: profile.subformId ?? 90 }, { ...form });
    if (missing.length) {
      // S141 P4 amendment (W-2): the body admits a wrong-not-blank value — a future report
      // date / out-of-order interaction date / out-of-range coordinate is "incorrect", not
      // "blank"; the all-blank sentence stays byte-identical.
      const mixed = missing.some(m => m.reason === 'invalid' || m.reason === 'pair-both');
      Alert.alert(
        t('form234.closeBlockedTitle'),
        `${t(mixed ? 'form234.closeBlockedBodyMixed' : 'form234.closeBlockedBody')}\n• ${missing.map(closeBulletText).join('\n• ')}`,
        [{ text: tc('nav.ok') }],
      );
      return;
    }
    Alert.alert(
      t('form222.closeConfirmTitle'),
      t('form234.closeConfirmBody'),
      [
        { text: t('form234.closeConfirmNotYet'), style: 'cancel' },
        {
          text: t('form234.closeConfirmYes'),
          style: 'destructive',
          onPress: async () => {
            const nowIso = new Date().toISOString();
            if (!draftUidRef.current) draftUidRef.current = generateForm222Uid();
            try {
              await saveForm222Entry(buildEntry('complete', false, nowIso));
            } catch {
              Alert.alert(tc('settings.errorTitle'), t('form234.saveError'));
              return;
            }
            onClose();
          },
        },
      ],
    );
  };

  // S137 Phase 7: "2026-08-23" → "Aug 23, 2026" / « 23 août 2026 » for the picker rows — the
  // date is what a fisherman remembers (R-2). Built from parts, never new Date(string), so the
  // day can't shift across the UTC boundary. Falls back to the raw string if malformed.
  const formatRefDate = (iso: string): string => {
    const [y, mo, da] = iso.split('-').map(Number);
    if (isNaN(y) || isNaN(mo) || isNaN(da)) return iso;
    return new Date(y, mo - 1, da).toLocaleDateString(isFr ? 'fr-CA' : 'en-CA', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const renderDropdown = (
    label: string,
    value: string,
    options: string[],
    isOpen: boolean,
    setOpen: (v: boolean) => void,
    onSelect: (v: string) => void,
    placeholder: string,
    isLast = false,
    required = false,
    frMap?: Map<string, string>,
  ) => {
    // Display-only FR lookup; onSelect still stores the EN label the emit path resolves.
    const show = (v: string) => (isFr && frMap?.get(v)) || v;
    return (
    <View style={[styles.inputGroup, isLast && styles.lastInputGroup]}>
      <Text style={styles.label}>{label}{required && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => {
          setSpeciesOpen(false);
          setInteractionTypeOpen(false);
          setConfidenceOpen(false);
          setSpecimenCondOpen(false);
          setLengthCatOpen(false);
          setRefPickerOpen(false);
          setOpen(!isOpen);
        }}
        activeOpacity={0.8}
      >
        <Text style={value ? styles.dropdownValueText : styles.dropdownPlaceholderText}>
          {value ? show(value) : placeholder}
        </Text>
        <ChevronDown size={18} color="#94A3B8" />
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.dropdownList}>
          {options.map((opt, i) => {
            const selected = value === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.dropdownItem,
                  selected && styles.dropdownItemSelected,
                  i === options.length - 1 && styles.dropdownItemLast,
                ]}
                onPress={() => { onSelect(opt); setOpen(false); }}
              >
                <Text style={[styles.dropdownItemText, selected && styles.dropdownItemTextSelected]}>
                  {show(opt)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
    );
  };

  const renderYNToggle = (label: string, value: 'Y' | 'N', onToggle: () => void) => (
    <View style={styles.ynRow}>
      <Text style={styles.ynLabel}>{label}</Text>
      <View style={styles.ynToggleGroup}>
        <TouchableOpacity
          style={[styles.ynButton, value === 'Y' && styles.ynButtonActive]}
          onPress={() => { if (value !== 'Y') onToggle(); }}
          activeOpacity={0.8}
        >
          <Text style={[styles.ynButtonText, value === 'Y' && styles.ynButtonTextActive]}>
            {t('form222.interactIndYes')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ynButton, value === 'N' && styles.ynButtonActive]}
          onPress={() => { if (value !== 'N') onToggle(); }}
          activeOpacity={0.8}
        >
          <Text style={[styles.ynButtonText, value === 'N' && styles.ynButtonTextActive]}>
            {t('form222.interactIndNo')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => { void handleClose(); }} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('form222.headerTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* S125 7b: freeze the whole body once closed (view-only; the ScrollView still scrolls). */}
        <View pointerEvents={lockedCloseDt ? 'none' : 'auto'} style={lockedCloseDt ? styles.closedBody : undefined}>
        {/* Master INTERACT_IND toggle */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>{t('form222.interactCard')}</Text>
          <View style={styles.lastInputGroup}>
            <Text style={styles.label}>{t('form222.interactIndLabel')}</Text>
            <View style={styles.ynToggleGroupFull}>
              <TouchableOpacity
                style={[styles.ynButtonFull, form.interactInd === 'Y' && styles.ynButtonActive]}
                onPress={() => set('interactInd')('Y')}
                activeOpacity={0.8}
              >
                <Text style={[styles.ynButtonText, form.interactInd === 'Y' && styles.ynButtonTextActive]}>
                  {t('form222.interactIndYes')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ynButtonFull, form.interactInd === 'N' && styles.ynButtonActive]}
                onPress={() => set('interactInd')('N')}
                activeOpacity={0.8}
              >
                <Text style={[styles.ynButtonText, form.interactInd === 'N' && styles.ynButtonTextActive]}>
                  {t('form222.interactIndNo')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {form.interactInd === 'N' ? (
          <View style={styles.noInteractCard}>
            <Text style={styles.noInteractText}>{t('form222.noInteractMessage')}</Text>
          </View>
        ) : (
          <>
            {/* Report details */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>{t('form222.reportDetailsCard')}</Text>
              <View style={styles.lastInputGroup}>
                <Text style={styles.label}>{t('form222.reportDateLabel')}{req('reportDate') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => openPicker('report')}
                  activeOpacity={0.8}
                >
                  <Text style={form.reportDate ? styles.dropdownValueText : styles.dropdownPlaceholderText}>
                    {form.reportDate || t('form222.datePlaceholder')}
                  </Text>
                  <Calendar size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
              <View style={styles.lastInputGroup}>
                <Text style={styles.label}>{t('form222.lgbkNumRefLabel')}{req('lgbkNumRef') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                {/* S137 Phase 7: picker while logs owe a declaration (owing set only, oldest
                    first, date + UID on every row, "Enter manually" last); the plain input when
                    nothing owes or after Enter manually. Picking fills the field, never locks it
                    (R-5); the R-J prefill above is untouched — the picker sits on top of it. */}
                {owingRefs.length > 0 && !manualRef ? (
                  <>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => {
                        setSpeciesOpen(false);
                        setInteractionTypeOpen(false);
                        setConfidenceOpen(false);
                        setSpecimenCondOpen(false);
                        setLengthCatOpen(false);
                        setRefPickerOpen(!refPickerOpen);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={form.lgbkNumRef ? styles.dropdownValueText : styles.dropdownPlaceholderText}>
                        {form.lgbkNumRef || t('form222.lgbkNumRefPlaceholder')}
                      </Text>
                      <ChevronDown size={18} color="#94A3B8" />
                    </TouchableOpacity>
                    {refPickerOpen && (
                      <View style={styles.dropdownList}>
                        {owingRefs.map(r => {
                          const selected = form.lgbkNumRef === r.lgbkUid;
                          return (
                            <TouchableOpacity
                              key={r.lgbkUid}
                              style={[styles.dropdownItem, selected && styles.dropdownItemSelected]}
                              onPress={() => { set('lgbkNumRef')(r.lgbkUid); setRefPickerOpen(false); }}
                            >
                              <Text style={[styles.dropdownItemText, selected && styles.dropdownItemTextSelected]}>
                                {`${formatRefDate(r.dateFished)} · ${r.lgbkUid}`}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                        <TouchableOpacity
                          style={[styles.dropdownItem, styles.dropdownItemLast]}
                          onPress={() => { setRefPickerOpen(false); setManualRef(true); }}
                        >
                          <Text style={styles.dropdownItemManualText}>{t('form222.enterManually')}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                ) : (
                  <TextInput
                    style={styles.input}
                    value={form.lgbkNumRef}
                    onChangeText={set('lgbkNumRef')}
                    placeholder={t('form222.lgbkNumRefPlaceholder')}
                    placeholderTextColor="#CBD5E1"
                    maxLength={15}
                    autoCapitalize="characters"
                    autoFocus={manualRef}
                  />
                )}
              </View>
            </View>

            {/* Interaction details */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>{t('form222.interactionDetailsCard')}</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('form222.interactionDateLabel')}{req('interactionDate') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => openPicker('interaction')}
                  activeOpacity={0.8}
                >
                  <Text style={form.interactionDate ? styles.dropdownValueText : styles.dropdownPlaceholderText}>
                    {form.interactionDate || t('form222.datePlaceholder')}
                  </Text>
                  <Calendar size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.lastInputGroup}>
                <Text style={styles.label}>{t('form222.interactionTimeLabel')}{req('interactionTime') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => openPicker('interaction')}
                  activeOpacity={0.8}
                >
                  <Text style={form.interactionTime ? styles.dropdownValueText : styles.dropdownPlaceholderText}>
                    {form.interactionTime || t('form222.timePlaceholder')}
                  </Text>
                  <Clock size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Location */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>{t('form222.locationCard')}</Text>

              <TouchableOpacity
                style={styles.captureGpsBtn}
                onPress={captureMyLocation}
                disabled={gpsCapturing}
                activeOpacity={0.8}
              >
                <LocateFixed size={15} color="#4338CA" />
                <Text style={styles.captureGpsBtnText}>
                  {gpsCapturing ? t('form222.capturingGps') : t('form222.useMyLocation')}
                </Text>
              </TouchableOpacity>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('form222.latLabel')}{req('lat') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                <TextInput
                  style={[styles.input, latError ? styles.inputError : null]}
                  value={form.lat}
                  onChangeText={handleLatChange}
                  placeholder={t('form222.latPlaceholder')}
                  placeholderTextColor="#CBD5E1"
                  keyboardType="numeric"
                />
                {!!latError && <Text style={styles.errorText}>{latError}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('form222.lonLabel')}{req('lon') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                <TextInput
                  style={[styles.input, lonError ? styles.inputError : null]}
                  value={form.lon}
                  onChangeText={handleLonChange}
                  placeholder={t('form222.lonPlaceholder')}
                  placeholderTextColor="#CBD5E1"
                  keyboardType="numeric"
                />
                {!!lonError && <Text style={styles.errorText}>{lonError}</Text>}
              </View>

              {/* SITE_DSC (string_150, optional) — free-text description of the interaction site */}
              <View style={styles.lastInputGroup}>
                <Text style={styles.label}>{t('form222.siteDscLabel')}{req('siteDsc') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                <TextInput
                  style={[styles.input, styles.remarksInput]}
                  value={form.siteDsc}
                  onChangeText={set('siteDsc')}
                  placeholder={t('form222.siteDscPlaceholder')}
                  placeholderTextColor="#CBD5E1"
                  maxLength={150}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Species & numbers */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>{t('form222.speciesCard')}</Text>

              {renderDropdown(
                t('form222.speciesLabel'),
                form.speciesLabel,
                MARINE_MAMMAL_SPECIES_LABELS,
                speciesOpen,
                setSpeciesOpen,
                set('speciesLabel'),
                t('form222.speciesPlaceholder'),
                false,
                req('speciesLabel'),
                SPECIES_FR,
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('form222.nbAnimalsLabel')}{req('nbAnimals') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                <TextInput
                  style={styles.input}
                  value={form.nbAnimals}
                  onChangeText={set('nbAnimals')}
                  placeholder={t('form222.nbAnimalsPlaceholder')}
                  placeholderTextColor="#CBD5E1"
                  keyboardType="number-pad"
                />
              </View>

              {renderDropdown(
                t('form222.interactionTypeLabel'),
                form.interactionTypeLabel,
                INTERACTION_TYPE_LABELS,
                interactionTypeOpen,
                setInteractionTypeOpen,
                set('interactionTypeLabel'),
                t('form222.interactionTypePlaceholder'),
                false,
                req('interactionTypeLabel'),
                INTERACTION_TYPE_FR,
              )}

              {/* Specimen detail trio → ID_CNFDNCE_ID / SPCMN_COND_ID / BDY_LEN_ID — XSD minOccurs=0
                  but Rule 593 makes them mandatory when the interaction answer is Yes; marked
                  via the table since S140 P2 (design ruling 3). */}
              {renderDropdown(
                t('form222.confidenceLabel'),
                form.confidenceLabel,
                CONFIDENCE_LEVEL_LABELS,
                confidenceOpen,
                setConfidenceOpen,
                set('confidenceLabel'),
                t('form222.confidencePlaceholder'),
                false,
                req('confidenceLabel'),
                CONFIDENCE_FR,
              )}

              {renderDropdown(
                t('form222.specimenCondLabel'),
                form.specimenCondLabel,
                SPECIMEN_CONDITION_LABELS,
                specimenCondOpen,
                setSpecimenCondOpen,
                set('specimenCondLabel'),
                t('form222.specimenCondPlaceholder'),
                false,
                req('specimenCondLabel'),
                SPECIMEN_COND_FR,
              )}

              {renderDropdown(
                t('form222.lengthCatLabel'),
                form.lengthCatLabel,
                LENGTH_CATEGORY_LABELS,
                lengthCatOpen,
                setLengthCatOpen,
                set('lengthCatLabel'),
                t('form222.lengthCatPlaceholder'),
                true,
                req('lengthCatLabel'),
                LENGTH_CAT_FR,
              )}
            </View>

            {/* Outcome indicators */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>{t('form222.indicatorsCard')}</Text>
              {renderYNToggle(t('form222.injuryIndLabel'),     form.injuryInd,     toggleYN('injuryInd'))}
              {renderYNToggle(t('form222.deathIndLabel'),      form.deathInd,      toggleYN('deathInd'))}
              {renderYNToggle(t('form222.entangleIndLabel'),   form.entangleInd,   toggleYN('entangleInd'))}
              {form.entangleInd === 'Y' &&
                renderYNToggle(t('form222.releaseIndLabel'),   form.releaseInd,    toggleYN('releaseInd'))}
              {renderYNToggle(t('form222.gearDamageIndLabel'), form.gearDamageInd, toggleYN('gearDamageInd'))}

              {/* GEAR_DMG_REM (string_150, optional) — remark about gear damage */}
              <View style={[styles.inputGroup, { marginTop: 12 }]}>
                <Text style={styles.label}>{t('form222.gearDmgRemLabel')}</Text>
                <TextInput
                  style={[styles.input, styles.remarksInput]}
                  value={form.gearDmgRem}
                  onChangeText={set('gearDmgRem')}
                  placeholder={t('form222.gearDmgRemPlaceholder')}
                  placeholderTextColor="#CBD5E1"
                  maxLength={150}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              {/* INCDNT_REM (string_150, optional) — remark about the incident type */}
              <View style={styles.lastInputGroup}>
                <Text style={styles.label}>{t('form222.incdntRemLabel')}</Text>
                <TextInput
                  style={[styles.input, styles.remarksInput]}
                  value={form.incdntRem}
                  onChangeText={set('incdntRem')}
                  placeholder={t('form222.incdntRemPlaceholder')}
                  placeholderTextColor="#CBD5E1"
                  maxLength={150}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Observer */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>{t('form222.observerCard')}</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('form222.observerNmLabel')}{req('observerNm') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                <TextInput
                  style={styles.input}
                  value={form.observerNm}
                  onChangeText={set('observerNm')}
                  placeholder={t('form222.observerNmPlaceholder')}
                  placeholderTextColor="#CBD5E1"
                />
              </View>

              <View style={styles.lastInputGroup}>
                <Text style={styles.label}>{t('form222.contactInfoLabel')}{req('contactInfo') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                <TextInput
                  style={styles.input}
                  value={form.contactInfo}
                  onChangeText={set('contactInfo')}
                  placeholder={t('form222.contactInfoPlaceholder')}
                  placeholderTextColor="#CBD5E1"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* S142 (defect 50): EVENT_DSC has its OWN card, directly above Remarks. It is
                Rule-593 MANDATORY when the interaction answer is Yes (starred, and close-gated
                since S141), so it cannot sit under a header that says "(Optional)". Nothing
                else on the form moves; the field, its star and its i18n keys are unchanged. */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>{t('form222.eventDscCard')}</Text>
              {/* EVENT_DSC (string_150) — narrative description of the event */}
              <View style={styles.lastInputGroup}>
                <Text style={styles.label}>{t('form222.eventDscLabel')}{req('eventDsc') && <Text style={{ color: REQUIRED_ASTERISK_COLOR }}> *</Text>}</Text>
                <TextInput
                  style={[styles.input, styles.remarksInput]}
                  value={form.eventDsc}
                  onChangeText={set('eventDsc')}
                  placeholder={t('form222.eventDscPlaceholder')}
                  placeholderTextColor="#CBD5E1"
                  maxLength={150}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Remarks — S142 (defect 50): both remaining boxes are now LABELLED. They are two
                DIFFERENT DFO elements, not a duplicate: DOC_REM (a note about what documentation
                exists) and MM_INTER.REM (DFO's own name for it is "Comments" — the same name the
                233 already uses for the same element). Everything left in this card really is
                optional, so the "(Optional)" header is now true. */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>{t('form222.remarksCard')}</Text>

              {/* DOC_REM (string_150, optional) — remark about available documentation */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('form222.docRemLabel')}</Text>
                <TextInput
                  style={[styles.input, styles.remarksInput]}
                  value={form.docRem}
                  onChangeText={set('docRem')}
                  placeholder={t('form222.docRemPlaceholder')}
                  placeholderTextColor="#CBD5E1"
                  maxLength={150}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              {/* MM_INTER.REM (string_2000, optional) — the general comments box. It had NO
                  label at all before S142, so it read as a second unexplained box under the
                  REMARK label above it. */}
              <View style={styles.lastInputGroup}>
                <Text style={styles.label}>{t('form222.remarksLabel')}</Text>
                <TextInput
                  style={[styles.input, styles.remarksInput]}
                  value={form.remarks}
                  onChangeText={set('remarks')}
                  placeholder={t('form222.remarksPlaceholder')}
                  placeholderTextColor="#CBD5E1"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </>
        )}

        </View>
        {/* S125 7b: Close & Save (view-only banner once closed). Send is on the list card. */}
        {lockedCloseDt ? (
          <View style={styles.closedBanner}>
            <Lock size={14} color="#64748B" />
            <Text style={styles.closedBannerText}>{t('form234.closedAtLabel', { time: formatClose(lockedCloseDt) })}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.submitButton} onPress={handleCloseAndSave} activeOpacity={0.8}>
            <Save size={18} color="#FFFFFF" />
            <Text style={styles.submitText}>{t('form222.closeButton')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

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
                mode={pickerField === 'interaction' ? 'datetime' : 'date'}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 14 : 14,
  },
  backButton: {
    width: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSpacer: {
    width: 36,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  noInteractCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  noInteractText: {
    fontSize: 15,
    color: '#166534',
    textAlign: 'center',
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  inputGroup: {
    marginBottom: 15,
  },
  lastInputGroup: {
    marginBottom: 0,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  captureGpsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 8, marginBottom: 12,
    backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE',
  },
  captureGpsBtnText: { fontSize: 13, fontWeight: '700', color: '#4338CA' },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  remarksInput: {
    height: 100,
    fontWeight: '400',
  },
  dropdownButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  dropdownPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  dropdownList: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#334155',
  },
  dropdownItemTextSelected: {
    color: '#1E3A8A',
    fontWeight: 'bold',
  },
  dropdownItemManualText: {
    fontSize: 15,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  // Y/N toggles for master interact indicator
  ynToggleGroupFull: {
    flexDirection: 'row',
    gap: 8,
  },
  ynButtonFull: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  // Y/N toggles for outcome indicators
  ynRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  ynLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  ynToggleGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  ynButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  ynButtonActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  ynButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  ynButtonTextActive: {
    color: '#FFFFFF',
  },
  // S125 7d: Close & Save foot button — copied verbatim from FullDfoForm's submitButton/submitText
  // (the 234's Close & Save All) so the three forms match, not merely resemble. The old near-miss
  // submitButton (#1E40AF / radius 12) and the amber closeSectionBtn are deleted (rulings 3/6).
  submitButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#1E3A8A', paddingVertical: 14, borderRadius: 10,
  },
  submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  // S125 7b: Closed banner + frozen body — copied verbatim from FullDfoForm's closure styles.
  closedBody: { opacity: 0.55 },
  closedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    paddingVertical: 9, paddingHorizontal: 10, borderRadius: 8,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1',
  },
  closedBannerText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
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
});
