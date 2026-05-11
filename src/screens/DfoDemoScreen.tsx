import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Switch,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import FullDfoForm, { FullDfoFormHandle } from '../components/FullDfoForm';
import LobsterLogProposalForm, { FormHandle as ProposalFormHandle } from '../components/LobsterLogProposalForm';

interface DfoDemoScreenProps {
  onClose: () => void;
  editingLogId: string | null;
}

// Union type covering both form handles (both expose saveDraft)
type AnyFormHandle = FullDfoFormHandle | ProposalFormHandle;

const DfoDemoScreen: React.FC<DfoDemoScreenProps> = ({ onClose, editingLogId }) => {
  const [showProposal, setShowProposal] = useState(false);

  // Points to whichever form is currently mounted
  const formRef = useRef<AnyFormHandle>(null);

  // Tapping Back → save draft then close
  const handleBack = async () => {
    if (formRef.current) {
      await formRef.current.saveDraft();
    }
    onClose();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ChevronLeft size={24} color="#1E3A8A" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editingLogId ? 'Edit ELOG' : 'DFO ELOG Demo'}
        </Text>
        <View style={styles.switchContainer}>
          <Switch
            value={showProposal}
            onValueChange={setShowProposal}
            trackColor={{ false: '#CBD5E1', true: '#1E3A8A' }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#CBD5E1"
          />
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        {showProposal ? (
          <LobsterLogProposalForm
            ref={formRef}
            editingLogId={editingLogId}
            onSaved={onClose}
          />
        ) : (
          <FullDfoForm
            ref={formRef}
            editingLogId={editingLogId}
            onSaved={onClose}
          />
        )}
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
  switchContainer: { width: 70, alignItems: 'flex-end' },
  content: { flex: 1, padding: 16 },
});

export default DfoDemoScreen;
