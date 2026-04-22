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
  Scale,
  Anchor,
  ClipboardList,
  Save,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import {
  saveLog,
  loadLogById,
  generateNextTripId,
  DfoLog,
} from '../utils/dfoLogStorage';

type ProposalPage = 'every-trip' | 'when-applicable';

interface LobsterLogProposalFormProps {
  editingLogId: string | null;
  onSaved: () => void;
}

const LobsterLogProposalForm: React.FC<LobsterLogProposalFormProps> = ({
  editingLogId,
  onSaved,
}) => {
  const [page, setPage] = useState<ProposalPage>('every-trip');

  // Page 1: Every Trip
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

  // Page 2: When Applicable — optional fields
  const [gpsLat, setGpsLat] = useState('');
  const [gpsLng, setGpsLng] = useState('');
  const [vNotchCount, setVNotchCount] = useState('');
  const [marineMammal, setMarineMammal] = useState('');
  const [speciesAtRisk, setSpeciesAtRisk] = useState('');
  const [lostGear, setLostGear] = useState('');
  const [transfers, setTransfers] = useState('');
  const [personalUse, setPersonalUse] = useState('');

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Load existing log if editing
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
        const newId = await generateNextTripId(dateFished);
        setTripId(newId);
      }
    };
    loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingLogId]);

  useEffect(() => {
    if (!editingLogId && dateFished) {
      generateNextTripId(dateFished).then(setTripId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFished]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleSave = async () => {
    // Validate: only the Page 1 "Every Trip" core fields are required.
    // Page 2 "When Applicable" fields stay optional — that's the whole pitch.
    const coreFields: Record<string, string> = {
      'Date Fished': dateFished,
      'Departure Port': departurePort,
      'Port Landed': portLanded,
      'Crew Registry': crewRegistry,
      'Grid # / Area Fished': gridNumber,
      'Lobster Catch Weight': catchWeight,
      'Trap Hauls': trapHauls,
      'Bycatch Species': bycatchSpecies,
      'Bycatch Weight': bycatchWeight,
    };

    const missing: string[] = [];
    for (const [label, value] of Object.entries(coreFields)) {
      if (!value || !value.trim()) {
        missing.push(label);
      }
    }

    if (missing.length > 0) {
      Alert.alert(
        'Missing Fields',
        `Please fill out every field on Page 1 before saving.\n\nMissing:\n• ${missing.join('\n• ')}`,
        [{ text: 'OK' }]
      );
      return;
    }

    const log: DfoLog = {
      id: tripId,
      mode: 'proposal',
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
    readOnly: boolean = false,
    keyboardType: any = 'default'
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

  const renderExpandableSection = (
    key: string,
    title: string,
    description: string,
    children: React.ReactNode
  ) => {
    const isExpanded = expandedSection === key;
    return (
      <View style={styles.expandableSection}>
        <TouchableOpacity
          style={styles.expandableHeader}
          onPress={() => toggleSection(key)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.expandableTitle}>{title}</Text>
            <Text style={styles.expandableDesc}>{description}</Text>
          </View>
          {isExpanded ? (
            <ChevronUp size={20} color="#64748B" />
          ) : (
            <ChevronDown size={20} color="#64748B" />
          )}
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
            Page 1: Every Trip
          </Text>
          <View style={[styles.pageTabBadge, page === 'every-trip' && styles.pageTabBadgeActive]}>
            <Text style={[styles.pageTabBadgeText, page === 'every-trip' && styles.pageTabBadgeTextActive]}>
              9
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pageTab, page === 'when-applicable' && styles.pageTabActive]}
          onPress={() => setPage('when-applicable')}
        >
          <Text style={[styles.pageTabText, page === 'when-applicable' && styles.pageTabTextActive]}>
            Page 2: When Applicable
          </Text>
          <View style={[styles.pageTabBadge, page === 'when-applicable' && styles.pageTabBadgeActive]}>
            <Text style={[styles.pageTabBadgeText, page === 'when-applicable' && styles.pageTabBadgeTextActive]}>
              7
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.infoBanner}>
          <CheckCircle size={16} color="#15803D" />
          <Text style={styles.infoText}>
            {page === 'every-trip'
              ? 'Core data every harvester fills out. Fast, simple, respects the harvester\'s time.'
              : 'Rare events only. These fields appear when a situation actually applies — no daily reporting needed.'}
          </Text>
        </View>

        {page === 'every-trip' ? (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: '#DBEAFE' }]}>
                  <Calendar size={16} color="#1E3A8A" />
                </View>
                <Text style={styles.sectionTitle}>Trip Basics</Text>
              </View>
              {renderField('DATE FISHED', dateFished, setDateFished, 'YYYY-MM-DD')}
              {renderField('TRIP ID (AUTO-GENERATED)', tripId, () => {}, '', true)}
              {renderField('DEPARTURE PORT', departurePort, setDeparturePort, 'Port')}
              {renderField('PORT LANDED', portLanded, setPortLanded, 'Port')}
              {renderField('CREW REGISTRY', crewRegistry, setCrewRegistry, 'Names')}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: '#DCFCE7' }]}>
                  <Scale size={16} color="#15803D" />
                </View>
                <Text style={styles.sectionTitle}>Catch & Effort</Text>
              </View>
              {renderField('GRID # / AREA FISHED', gridNumber, setGridNumber, 'e.g. 34-12')}
              {renderField(
                'LOBSTER CATCH WEIGHT (LBS)',
                catchWeight,
                setCatchWeight,
                '0',
                false,
                'numeric'
              )}
              {renderField('TRAP HAULS', trapHauls, setTrapHauls, '0', false, 'numeric')}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Anchor size={16} color="#B45309" />
                </View>
                <Text style={styles.sectionTitle}>Bycatch</Text>
              </View>
              {renderField('BYCATCH SPECIES', bycatchSpecies, setBycatchSpecies, 'Species')}
              {renderField(
                'BYCATCH WEIGHT (LBS)',
                bycatchWeight,
                setBycatchWeight,
                '0',
                false,
                'numeric'
              )}
            </View>

            <View style={styles.countBoxGreen}>
              <Text style={styles.countText}>
                <Text style={{ fontWeight: '700', color: '#15803D' }}>9 fields</Text> per trip
              </Text>
              <Text style={styles.countSubtext}>
                Every-day essentials. Nothing more.
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.page2Intro}>
              <ClipboardList size={20} color="#1E3A8A" />
              <Text style={styles.page2IntroText}>
                Tap any section below to report an incident. Leave collapsed if nothing to report.
              </Text>
            </View>

            {renderExpandableSection(
              'gps',
              'GPS Coordinates',
              'If DFO needs exact location for a specific trip',
              <>
                {renderField('LATITUDE', gpsLat, setGpsLat, '0.0000', false, 'numeric')}
                {renderField('LONGITUDE', gpsLng, setGpsLng, '0.0000', false, 'numeric')}
              </>
            )}

            {renderExpandableSection(
              'vnotch',
              'V-Notch / Size Counts',
              'Report protected lobsters released',
              renderField('V-NOTCH COUNT', vNotchCount, setVNotchCount, '0', false, 'numeric')
            )}

            {renderExpandableSection(
              'mammal',
              'Marine Mammal Interactions',
              'Required only when an interaction occurs',
              renderField('DETAILS', marineMammal, setMarineMammal, 'Describe the interaction')
            )}

            {renderExpandableSection(
              'sar',
              'Species At Risk Interactions',
              'Required only when an interaction occurs',
              renderField('DETAILS', speciesAtRisk, setSpeciesAtRisk, 'Describe the interaction')
            )}

            {renderExpandableSection(
              'lost',
              'Lost / Found Gear',
              'Required only when gear is lost or found',
              renderField('DETAILS', lostGear, setLostGear, 'Describe the gear')
            )}

            {renderExpandableSection(
              'transfer',
              'Transfers (Boat/Carrier/Pound)',
              'Required only when catch is transferred',
              renderField('DETAILS', transfers, setTransfers, 'Describe the transfer')
            )}

            {renderExpandableSection(
              'personal',
              'Personal Use Declaration',
              'Required only when retaining for personal use',
              renderField('POUNDS', personalUse, setPersonalUse, '0', false, 'numeric')
            )}

            <View style={styles.countBoxBlue}>
              <Text style={styles.countText}>
                <Text style={{ fontWeight: '700', color: '#1E3A8A' }}>0 fields</Text> needed today
              </Text>
              <Text style={styles.countSubtext}>
                These only appear when an event actually happens.
              </Text>
            </View>
          </>
        )}

        {/* Save */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSave}>
          <Save size={18} color="#FFFFFF" />
          <Text style={styles.submitText}>Save DFO Log</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageTabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  pageTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pageTabActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  pageTabText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  pageTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pageTabBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pageTabBadgeActive: {
    backgroundColor: '#FBBF24',
  },
  pageTabBadgeText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  pageTabBadgeTextActive: {
    color: '#1E293B',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    color: '#14532D',
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
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
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
  page2Intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  page2IntroText: {
    flex: 1,
    color: '#1E40AF',
    fontSize: 12,
    lineHeight: 16,
  },
  expandableSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  expandableTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  expandableDesc: {
    fontSize: 12,
    color: '#64748B',
  },
  expandableBody: {
    padding: 14,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  countBoxGreen: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 14,
    marginTop: 4,
    marginBottom: 16,
    alignItems: 'center',
  },
  countBoxBlue: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
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

export default LobsterLogProposalForm;