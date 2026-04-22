import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Calendar,
  MapPin,
  Anchor,
  Scale,
  Clock,
  Fish,
  Info,
  Save,
} from 'lucide-react-native';
import {
  saveLog,
  loadLogById,
  generateNextTripId,
  DfoLog,
} from '../utils/dfoLogStorage';

interface FullDfoFormProps {
  editingLogId: string | null;
  onSaved: () => void;
}

const FullDfoForm: React.FC<FullDfoFormProps> = ({ editingLogId, onSaved }) => {
  // Default/demo values for a fresh new log
  const [dateFished, setDateFished] = useState('2026-04-21');
  const [gridNumber, setGridNumber] = useState('34-12');
  const [catchWeight, setCatchWeight] = useState('847');
  const [trapHauls, setTrapHauls] = useState('375');
  const [bycatchSpecies, setBycatchSpecies] = useState('Rock Crab');
  const [bycatchWeight, setBycatchWeight] = useState('12');
  const [portLanded, setPortLanded] = useState('Clarks Harbour');

  const [tripId, setTripId] = useState('');
  const [crewRegistry, setCrewRegistry] = useState('J. Nickerson, M. Smith');
  const [departurePort, setDeparturePort] = useState('Clarks Harbour');

  // The 6 problem fields
  const [timeSailed, setTimeSailed] = useState('04:30');
  const [timeStartedHauling, setTimeStartedHauling] = useState('06:15');
  const [timeStoppedHauling, setTimeStoppedHauling] = useState('11:40');
  const [timeOfLanding, setTimeOfLanding] = useState('13:05');
  const [soakDuration, setSoakDuration] = useState('72');
  const [baitType, setBaitType] = useState('Mackerel');
  const [baitPoundage, setBaitPoundage] = useState('425');

  // Varies fields
  const [gpsLat, setGpsLat] = useState('43.4426');
  const [gpsLng, setGpsLng] = useState('-65.6290');
  const [vNotchCount, setVNotchCount] = useState('3');
  const [marineMammal, setMarineMammal] = useState('None');
  const [speciesAtRisk, setSpeciesAtRisk] = useState('None');
  const [lostGear, setLostGear] = useState('None');
  const [transfers, setTransfers] = useState('None');
  const [personalUse, setPersonalUse] = useState('0');

  // Load existing log if we're editing
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
          setBycatchSpecies(d.bycatchSpecies || '');
          setBycatchWeight(d.bycatchWeight || '');
          setPortLanded(d.portLanded || '');
          setCrewRegistry(d.crewRegistry || '');
          setDeparturePort(d.departurePort || '');
          setTimeSailed(d.timeSailed || '');
          setTimeStartedHauling(d.timeStartedHauling || '');
          setTimeStoppedHauling(d.timeStoppedHauling || '');
          setTimeOfLanding(d.timeOfLanding || '');
          setSoakDuration(d.soakDuration || '');
          setBaitType(d.baitType || '');
          setBaitPoundage(d.baitPoundage || '');
          setGpsLat(d.gpsLat || '');
          setGpsLng(d.gpsLng || '');
          setVNotchCount(d.vNotchCount || '');
          setMarineMammal(d.marineMammal || '');
          setSpeciesAtRisk(d.speciesAtRisk || '');
          setLostGear(d.lostGear || '');
          setTransfers(d.transfers || '');
          setPersonalUse(d.personalUse || '');
        }
      } else {
        // New log — auto-generate a Trip ID
        const newId = await generateNextTripId(dateFished);
        setTripId(newId);
      }
    };
    loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingLogId]);

  // Regenerate Trip ID if the user changes the date (only when creating new)
  useEffect(() => {
    if (!editingLogId && dateFished) {
      generateNextTripId(dateFished).then(setTripId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFished]);

  const handleSave = async () => {
    // Validate: every field must be filled
    const allFields: Record<string, string> = {
      'Date Fished': dateFished,
      'Crew Registry': crewRegistry,
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
      'Bait Type': baitType,
      'Bait Poundage': baitPoundage,
      'Latitude': gpsLat,
      'Longitude': gpsLng,
      'Bycatch Species': bycatchSpecies,
      'Bycatch Weight': bycatchWeight,
      'Marine Mammal Interactions': marineMammal,
      'Species At Risk Interactions': speciesAtRisk,
      'Lost / Found Gear': lostGear,
      'Transfers': transfers,
      'Personal Use Declaration': personalUse,
    };

    const missing: string[] = [];
    for (const [label, value] of Object.entries(allFields)) {
      if (!value || !value.trim()) {
        missing.push(label);
      }
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
      dateFished,
      createdAt: Date.now(),
      data: {
        gridNumber,
        catchWeight,
        trapHauls,
        bycatchSpecies,
        bycatchWeight,
        portLanded,
        crewRegistry,
        departurePort,
        timeSailed,
        timeStartedHauling,
        timeStoppedHauling,
        timeOfLanding,
        soakDuration,
        baitType,
        baitPoundage,
        gpsLat,
        gpsLng,
        vNotchCount,
        marineMammal,
        speciesAtRisk,
        lostGear,
        transfers,
        personalUse,
      },
    };

    const ok = await saveLog(log);
    if (ok) {
      onSaved();
    } else {
      Alert.alert('Error', 'Could not save the log. Please try again.');
    }
  };

  const renderField = (
    label: string,
    value: string,
    setter: (v: string) => void,
    placeholder: string,
    isProblem: boolean = false,
    readOnly: boolean = false,
    keyboardType: any = 'default'
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Info size={16} color="#B45309" />
        <Text style={styles.infoText}>
          Red dots mark fields <Text style={{ fontWeight: '700' }}>not required</Text> in Gulf, Quebec, or Newfoundland ELOGs.
        </Text>
      </View>

      {/* SECTION 1: Core Trip Info */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#DBEAFE' }]}>
            <Calendar size={16} color="#1E3A8A" />
          </View>
          <Text style={styles.sectionTitle}>Trip Information</Text>
        </View>
        {renderField('DATE FISHED', dateFished, setDateFished, 'YYYY-MM-DD')}
        {renderField('TRIP ID (AUTO-GENERATED)', tripId, () => {}, '', false, true)}
        {renderField('CREW REGISTRY', crewRegistry, setCrewRegistry, 'Names & certs')}
        {renderField('DEPARTURE PORT', departurePort, setDeparturePort, 'Port of departure')}
        {renderField('PORT LANDED', portLanded, setPortLanded, 'Port where landed')}
      </View>

      {/* SECTION 2: Timestamps (PROBLEM FIELDS) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#FEE2E2' }]}>
            <Clock size={16} color="#B91C1C" />
          </View>
          <Text style={styles.sectionTitle}>Timestamps</Text>
        </View>
        {renderField('TIME SAILED', timeSailed, setTimeSailed, 'HH:MM', true)}
        {renderField('TIME STARTED HAULING', timeStartedHauling, setTimeStartedHauling, 'HH:MM', true)}
        {renderField('TIME STOPPED HAULING', timeStoppedHauling, setTimeStoppedHauling, 'HH:MM', true)}
        {renderField('TIME OF LANDING', timeOfLanding, setTimeOfLanding, 'HH:MM', true)}
        {renderField('SOAK DURATION (HRS)', soakDuration, setSoakDuration, 'Hours', true, false, 'numeric')}
      </View>

      {/* SECTION 3: Catch & Effort */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#DCFCE7' }]}>
            <Scale size={16} color="#15803D" />
          </View>
          <Text style={styles.sectionTitle}>Catch & Effort</Text>
        </View>
        {renderField('GRID # / AREA FISHED', gridNumber, setGridNumber, 'e.g. 34-12')}
        {renderField('LOBSTER CATCH WEIGHT (LBS)', catchWeight, setCatchWeight, '0', false, false, 'numeric')}
        {renderField('TRAP HAULS', trapHauls, setTrapHauls, '0', false, false, 'numeric')}
        {renderField('V-NOTCH / SIZE COUNTS', vNotchCount, setVNotchCount, '0', false, false, 'numeric')}
      </View>

      {/* SECTION 4: Bait (PROBLEM FIELDS) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#FEE2E2' }]}>
            <Fish size={16} color="#B91C1C" />
          </View>
          <Text style={styles.sectionTitle}>Bait Reporting</Text>
        </View>
        {renderField('BAIT TYPE', baitType, setBaitType, 'e.g. Mackerel', true)}
        {renderField('BAIT POUNDAGE (LBS)', baitPoundage, setBaitPoundage, '0', true, false, 'numeric')}
      </View>

      {/* SECTION 5: Location */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#E0E7FF' }]}>
            <MapPin size={16} color="#4338CA" />
          </View>
          <Text style={styles.sectionTitle}>GPS Coordinates</Text>
        </View>
        {renderField('LATITUDE', gpsLat, setGpsLat, '0.0000', false, false, 'numeric')}
        {renderField('LONGITUDE', gpsLng, setGpsLng, '0.0000', false, false, 'numeric')}
      </View>

      {/* SECTION 6: Interactions & Bycatch */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#FEF3C7' }]}>
            <Anchor size={16} color="#B45309" />
          </View>
          <Text style={styles.sectionTitle}>Interactions & Other</Text>
        </View>
        {renderField('BYCATCH SPECIES', bycatchSpecies, setBycatchSpecies, 'Species')}
        {renderField('BYCATCH WEIGHT (LBS)', bycatchWeight, setBycatchWeight, '0', false, false, 'numeric')}
        {renderField('MARINE MAMMAL INTERACTIONS', marineMammal, setMarineMammal, 'None')}
        {renderField('SPECIES AT RISK INTERACTIONS', speciesAtRisk, setSpeciesAtRisk, 'None')}
        {renderField('LOST / FOUND GEAR', lostGear, setLostGear, 'None')}
        {renderField('TRANSFERS (BOAT/CARRIER/POUND)', transfers, setTransfers, 'None')}
        {renderField('PERSONAL USE DECLARATION (LBS)', personalUse, setPersonalUse, '0', false, false, 'numeric')}
      </View>

      {/* Field count summary */}
      <View style={styles.countBox}>
        <Text style={styles.countText}>
          <Text style={{ fontWeight: '700', color: '#B91C1C' }}>22 fields</Text> required per trip
        </Text>
        <Text style={styles.countSubtext}>
          (Old paper log: 7 fields)
        </Text>
      </View>

      {/* Save */}
      <TouchableOpacity style={styles.submitButton} onPress={handleSave}>
        <Save size={18} color="#FFFFFF" />
        <Text style={styles.submitText}>Save DFO Log</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    color: '#78350F',
    fontSize: 12,
    lineHeight: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  fieldRow: {
    marginBottom: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  problemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1E293B',
  },
  inputReadOnly: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
  },
  countBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 14,
    marginTop: 4,
    marginBottom: 16,
    alignItems: 'center',
  },
  countText: {
    fontSize: 15,
    color: '#1E293B',
  },
  countSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    borderRadius: 10,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default FullDfoForm;