import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import FullDfoForm, { FullDfoFormHandle } from '../components/FullDfoForm';

interface DfoDemoScreenProps {
  onClose: () => void;
  editingLogId: string | null;
}

const DfoDemoScreen: React.FC<DfoDemoScreenProps> = ({ onClose, editingLogId }) => {
  const formRef = useRef<FullDfoFormHandle>(null);

  const handleBack = async () => {
    if (formRef.current) {
      await formRef.current.saveDraft();
    }
    onClose();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ChevronLeft size={24} color="#1E3A8A" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editingLogId ? 'Edit ELOG' : 'DFO ELOG'}
        </Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        <FullDfoForm
          ref={formRef}
          editingLogId={editingLogId}
          onSaved={onClose}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: { flexDirection: 'row', alignItems: 'center', width: 70 },
  backText: { color: '#1E3A8A', fontSize: 16, fontWeight: '600', marginLeft: 2 },
  headerTitle: { color: '#1E293B', fontSize: 18, fontWeight: '700' },
  content: { flex: 1, padding: 16 },
});

export default DfoDemoScreen;