import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CrewMember,
  addCrewMember,
  deleteCrewMember,
  loadCrew,
} from '../utils/crewStorage';

interface Props {
  selected: CrewMember[];
  onChange: (crew: CrewMember[]) => void;
  // S163 Phase 5 defect: on the read-only sent-log view this component rendered
  // fully interactive (dropdown, saved-member Delete, add form). OPTIONAL with
  // default false so the legacy LobsterLogProposalForm call site is untouched.
  // When true: chips render as plain text — no remove ✕, no dropdown trigger,
  // no add row, no inputs.
  readOnly?: boolean;
}

export default function CrewSelector({ selected, onChange, readOnly = false }: Props) {
  const { t } = useTranslation('dfo');
  const [savedCrew, setSavedCrew] = useState<CrewMember[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFisherNumber, setNewFisherNumber] = useState('');

  useEffect(() => {
    loadCrew().then(setSavedCrew);
  }, []);

  const handleSelect = (member: CrewMember) => {
    const alreadyAdded = selected.find(s => s.id === member.id);
    if (!alreadyAdded) {
      onChange([...selected, member]);
    }
    setDropdownOpen(false);
  };

  const handleRemove = (id: string) => {
    onChange(selected.filter(s => s.id !== id));
  };

  const handleAddNew = async () => {
    if (!newName.trim()) return;
    const member = await addCrewMember({
      name: newName.trim(),
      fisherNumber: newFisherNumber.trim() || undefined,
    });
    setSavedCrew(prev => [...prev, member]);
    onChange([...selected, member]);
    setNewName('');
    setNewFisherNumber('');
    setShowAddForm(false);
    setDropdownOpen(false);
  };

  const handleDeleteSaved = async (id: string) => {
    await deleteCrewMember(id);
    setSavedCrew(prev => prev.filter(c => c.id !== id));
    onChange(selected.filter(s => s.id !== id));
  };

  return (
    <View>
      {/* Selected crew chips */}
      {selected.length > 0 && (
        <View style={styles.chipsContainer}>
          {selected.map(member => (
            <View key={member.id} style={styles.chip}>
              <Text style={styles.chipText}>
                {member.name}
                {member.fisherNumber ? ` · ${member.fisherNumber}` : ''}
              </Text>
              {!readOnly && (
                <TouchableOpacity onPress={() => handleRemove(member.id)}>
                  <Text style={styles.chipRemove}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Read-only: the chips above are the whole render — no trigger, no dropdown,
          no add form (S163). */}
      {readOnly ? null : (
      <>
      {/* Dropdown trigger */}
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => {
          setDropdownOpen(prev => !prev);
          setShowAddForm(false);
        }}
      >
        <Text style={styles.triggerText}>{t('crewSelector.addMember')}</Text>
        <Text style={styles.arrow}>{dropdownOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* Dropdown list */}
      {dropdownOpen && (
        <View style={styles.dropdown}>
          <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
            {savedCrew.map(member => (
              <View key={member.id} style={styles.dropdownRow}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => handleSelect(member)}
                >
                  <Text style={styles.dropdownText}>
                    {member.name}
                    {member.fisherNumber ? ` · ${member.fisherNumber}` : ''}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteSaved(member.id)}>
                  <Text style={styles.deleteText}>{t('crewSelector.delete')}</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Other / Add new */}
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => setShowAddForm(prev => !prev)}
            >
              <Text style={[styles.dropdownText, styles.otherText]}>
                {t('crewSelector.addNew')}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Inline add form */}
          {showAddForm && (
            <View style={styles.addForm}>
              <TextInput
                style={styles.input}
                placeholder={t('crewSelector.fullNamePlaceholder')}
                placeholderTextColor="#999"
                value={newName}
                onChangeText={setNewName}
              />
              <TextInput
                style={styles.input}
                placeholder={t('crewSelector.fisherNumberPlaceholder')}
                placeholderTextColor="#999"
                value={newFisherNumber}
                onChangeText={setNewFisherNumber}
              />
              <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
                <Text style={styles.addButtonText}>{t('crewSelector.addAndSave')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  chipText: {
    fontSize: 14,
    color: '#1B3A6B',
  },
  chipRemove: {
    fontSize: 12,
    color: '#888',
    fontWeight: 'bold',
  },
  trigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDE3F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  triggerText: {
    fontSize: 15,
    color: '#999',
  },
  arrow: {
    fontSize: 12,
    color: '#666',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#DDE3F0',
    borderRadius: 10,
    backgroundColor: '#fff',
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItem: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dropdownText: {
    fontSize: 15,
    color: '#1B3A6B',
  },
  otherText: {
    color: '#2E6BE6',
    fontWeight: '600',
  },
  deleteText: {
    color: '#E05252',
    fontSize: 13,
    paddingHorizontal: 12,
  },
  addForm: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDE3F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1B3A6B',
    backgroundColor: '#F8F9FF',
  },
  addButton: {
    backgroundColor: '#2E6BE6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
