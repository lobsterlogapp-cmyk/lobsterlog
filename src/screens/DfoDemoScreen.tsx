import React, { useState } from 'react';
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
import FullDfoForm from '../components/FullDfoForm';
import LobsterLogProposalForm from '../components/LobsterLogProposalForm';

interface DfoDemoScreenProps {
  onClose: () => void;
  editingLogId: string | null;
}

const DfoDemoScreen: React.FC<DfoDemoScreenProps> = ({ onClose, editingLogId }) => {
  // false = Full DFO Requirements, true = LobsterLog Proposal
  const [showProposal, setShowProposal] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
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
            editingLogId={editingLogId}
            onSaved={onClose}
          />
        ) : (
          <FullDfoForm
            editingLogId={editingLogId}
            onSaved={onClose}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 70,
  },
  backText: {
    color: '#1E3A8A',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 2,
  },
  headerTitle: {
    color: '#1E293B',
    fontSize: 18,
    fontWeight: '700',
  },
  switchContainer: {
    width: 70,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
    padding: 16,
  },
});

export default DfoDemoScreen;