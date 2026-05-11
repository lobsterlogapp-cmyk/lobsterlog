import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Port } from '../utils/portStorage';

interface Props {
  value: string;
  onChange: (portName: string) => void;
  placeholder?: string;
  savedPorts: Port[];
  onPortAdded: (port: Port) => void;
  onPortDeleted: (id: string, name: string) => void;
}

export default function PortSelector({
  value,
  onChange,
  placeholder = 'Select port...',
  savedPorts,
  onPortAdded,
  onPortDeleted,
}: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPortName, setNewPortName] = useState('');

  const handleSelect = (port: Port) => {
    onChange(port.name);
    setDropdownOpen(false);
    setShowAddForm(false);
  };

  const handleAddNew = async () => {
    if (!newPortName.trim()) return;
    const { addPort } = await import('../utils/portStorage');
    const port = await addPort(newPortName.trim());
    onPortAdded(port);
    onChange(port.name);
    setNewPortName('');
    setShowAddForm(false);
    setDropdownOpen(false);
  };

  const handleDeleteSaved = async (id: string, portName: string) => {
    const { deletePort } = await import('../utils/portStorage');
    await deletePort(id);
    onPortDeleted(id, portName);
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => {
          setDropdownOpen(prev => !prev);
          setShowAddForm(false);
        }}
      >
        <Text style={[styles.triggerText, value ? styles.triggerTextSelected : null]}>
          {value || placeholder}
        </Text>
        <Text style={styles.arrow}>{dropdownOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {dropdownOpen && (
        <View style={styles.dropdown}>
          <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
            {savedPorts.map(port => (
              <View key={port.id} style={styles.dropdownRow}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => handleSelect(port)}
                >
                  <Text style={styles.dropdownText}>{port.name}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteSaved(port.id, port.name)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => setShowAddForm(prev => !prev)}
            >
              <Text style={[styles.dropdownText, styles.otherText]}>
                + Add new port
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {showAddForm && (
            <View style={styles.addForm}>
              <TextInput
                style={styles.input}
                placeholder="Port name"
                placeholderTextColor="#999"
                value={newPortName}
                onChangeText={setNewPortName}
              />
              <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
                <Text style={styles.addButtonText}>Add & Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  triggerTextSelected: {
    color: '#1B3A6B',
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