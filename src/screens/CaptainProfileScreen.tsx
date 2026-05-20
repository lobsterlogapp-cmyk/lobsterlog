import React, { useEffect, useState } from 'react';
import {
  Alert,
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
import { ChevronLeft, ChevronDown } from 'lucide-react-native';
import {
  CaptainProfile,
  EMPTY_PROFILE,
  loadCaptainProfile,
  saveCaptainProfile,
} from '../utils/captainStorage';

const LFA_OPTIONS = [
  'LFA 1', 'LFA 2', 'LFA 3', 'LFA 4', 'LFA 5', 'LFA 6', 'LFA 7', 'LFA 8',
  'LFA 9', 'LFA 10', 'LFA 11', 'LFA 12', 'LFA 13', 'LFA 14', 'LFA 15',
  'LFA 16', 'LFA 17', 'LFA 18', 'LFA 19', 'LFA 20', 'LFA 21', 'LFA 22',
  'LFA 23', 'LFA 23A', 'LFA 24', 'LFA 25', 'LFA 26A', 'LFA 26B',
  'LFA 27', 'LFA 28', 'LFA 29', 'LFA 30', 'LFA 31', 'LFA 32',
  'LFA 33', 'LFA 34', 'LFA 35', 'LFA 36', 'LFA 37', 'LFA 38', 'LFA 41',
];

interface Props {
  onClose: () => void;
}

export default function CaptainProfileScreen({ onClose }: Props) {
  const [profile, setProfile] = useState<CaptainProfile>(EMPTY_PROFILE);
  const [lfaDropdownOpen, setLfaDropdownOpen] = useState(false);

  useEffect(() => {
    loadCaptainProfile().then(setProfile);
  }, []);

  const handleSave = async () => {
    await saveCaptainProfile(profile);
    Alert.alert('Profile saved');
    onClose();
  };

  const setField = (key: keyof CaptainProfile) => (value: string) =>
    setProfile(prev => ({ ...prev, [key]: value }));

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Captain Profile</Text>
        {/* Spacer keeps the title centred */}
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Vessel &amp; Licence Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>OPERATOR NAME</Text>
            <TextInput
              style={styles.input}
              value={profile.operatorName}
              onChangeText={setField('operatorName')}
              placeholder="Full name of operator"
              placeholderTextColor="#CBD5E1"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>LICENCE HOLDER FIN</Text>
            <TextInput
              style={styles.input}
              value={profile.licenceHolderFin}
              onChangeText={setField('licenceHolderFin')}
              placeholder="Fisher Identification Number"
              placeholderTextColor="#CBD5E1"
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>VESSEL NUMBER (VRN)</Text>
            <TextInput
              style={styles.input}
              value={profile.vesselNumber}
              onChangeText={setField('vesselNumber')}
              placeholder="e.g. 123456"
              placeholderTextColor="#CBD5E1"
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>FISHING LICENCE NUMBER</Text>
            <TextInput
              style={styles.input}
              value={profile.fishingNumber}
              onChangeText={setField('fishingNumber')}
              placeholder="e.g. T-123456"
              placeholderTextColor="#CBD5E1"
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>FISHING AREA (E.G. LFA 34)</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setLfaDropdownOpen(o => !o)}
              activeOpacity={0.8}
            >
              <Text style={profile.fishingArea ? styles.dropdownValueText : styles.dropdownPlaceholderText}>
                {profile.fishingArea || 'Select fishing area…'}
              </Text>
              <ChevronDown size={18} color="#94A3B8" />
            </TouchableOpacity>
            {lfaDropdownOpen && (
              <View style={styles.dropdownList}>
                {LFA_OPTIONS.map((option, index) => {
                  const selected = profile.fishingArea === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.dropdownItem,
                        selected && styles.dropdownItemSelected,
                        index === LFA_OPTIONS.length - 1 && styles.dropdownItemLast,
                      ]}
                      onPress={() => {
                        setField('fishingArea')(option);
                        setLfaDropdownOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, selected && styles.dropdownItemTextSelected]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>TOTAL # OF FISHING GEAR</Text>
            <TextInput
              style={styles.input}
              value={profile.totalGearCount}
              onChangeText={setField('totalGearCount')}
              placeholder="e.g. 375"
              placeholderTextColor="#CBD5E1"
              keyboardType="number-pad"
            />
          </View>

          <View style={[styles.inputGroup, styles.lastInputGroup]}>
            <Text style={styles.label}>GEAR TYPE (E.G. POT/TRAP)</Text>
            <TextInput
              style={styles.input}
              value={profile.gearType}
              onChangeText={setField('gearType')}
              placeholder="e.g. Pot/Trap"
              placeholderTextColor="#CBD5E1"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.saveButtonText}>Save Profile</Text>
        </TouchableOpacity>
      </ScrollView>
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#1E40AF',
  },
  saveButtonText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontSize: 16,
  },
});
