import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MV_PORT, PORTS_BY_PROVINCE, type DfoPort } from '../data/reftables';
import { MV_PROVINCE } from '../data/reftables';

// DFO-only port typeahead. Stores an integer PORT_ID (codeId) — the XSD wants a code, not a
// name. Kept separate from the legacy free-text PortSelector so the user-facing logbook form
// is untouched. Each subform defaults to its region's provinces; "search all ports" is always
// available because fishers can land outside their home region (plan §4).
export interface DfoPortValue {
  name: string;
  codeId: number | null;
}

interface Props {
  value: string;                 // selected port name (display)
  codeId: number | null;         // selected PORT_ID
  onChange: (sel: DfoPortValue) => void;
  subformId: number;
  placeholder?: string;
  disabled?: boolean;
}

// Region default province filters (prov CODE_IDs). NS 180, NB 176, PEI 188, QC 190, NL 178.
const DEFAULT_PROV: Record<number, number[]> = {
  88: [190],            // QC
  89: [176, 188, 180],  // GLF — Gulf shore (NB/PEI/NS); search-all covers the rest
  90: [180, 176, 188],  // MAR — NS/NB/PEI
  91: [178],            // NL
};

const PROVINCE_NAME_EN = new Map<number, string>(MV_PROVINCE.map(p => [p.codeId, p.descEn]));
const MAX_RESULTS = 60;

// FR port name by PORT_ID — display-only lookup for the trigger text, which renders the
// STORED name (nameEn; the stored value never changes — the XSD PORT_ID rides codeId).
const FR_NAME_BY_ID = new Map<number, string>(MV_PORT.map(p => [p.codeId, p.nameFr]));

function provinceLabel(p: DfoPort): string {
  return p.provCodeId != null ? (PROVINCE_NAME_EN.get(p.provCodeId) ?? '') : '';
}

export default function DfoPortSelector({ value, codeId, onChange, subformId, placeholder = 'Select port…', disabled }: Props) {
  const { t, i18n } = useTranslation('dfo');
  const isFr = i18n.language.startsWith('fr');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchAll, setSearchAll] = useState(false);

  // Region default list (concatenated province buckets), memoized per subform.
  const regionPorts = useMemo<DfoPort[]>(() => {
    const provs = DEFAULT_PROV[subformId] ?? [];
    return provs.flatMap(pc => PORTS_BY_PROVINCE[pc] ?? []);
  }, [subformId]);

  const results = useMemo<DfoPort[]>(() => {
    const q = query.trim().toUpperCase();
    const pool = searchAll ? MV_PORT : regionPorts;
    if (!q) return pool.slice(0, MAX_RESULTS);
    return pool.filter(p => p.nameEn.toUpperCase().includes(q) || p.nameFr.toUpperCase().includes(q)).slice(0, MAX_RESULTS);
  }, [query, searchAll, regionPorts]);

  const select = (p: DfoPort) => {
    onChange({ name: p.nameEn, codeId: p.codeId });
    setQuery('');
    setOpen(false);
  };

  const clear = () => onChange({ name: '', codeId: null });

  // Display-only FR names (nameEn fallback); select()/clear() keep storing nameEn + codeId.
  const rowName = (p: DfoPort) => (isFr && p.nameFr) || p.nameEn;
  const triggerName = value
    ? (isFr && codeId != null && FR_NAME_BY_ID.get(codeId)) || value
    : placeholder;

  return (
    <View>
      <TouchableOpacity
        style={styles.trigger}
        disabled={disabled}
        onPress={() => setOpen(prev => !prev)}
      >
        <Text style={[styles.triggerText, value ? styles.triggerTextSelected : null]} numberOfLines={1}>
          {triggerName}
        </Text>
        <Text style={styles.arrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && !disabled && (
        <View style={styles.dropdown}>
          <TextInput
            style={styles.search}
            placeholder={t('portSelector.searchPlaceholder')}
            placeholderTextColor="#999"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          <View style={styles.toolbar}>
            <TouchableOpacity onPress={() => setSearchAll(prev => !prev)}>
              <Text style={styles.toolbarText}>{`${searchAll ? '☑' : '☐'} ${t('portSelector.allPorts')}`}</Text>
            </TouchableOpacity>
            {value ? (
              <TouchableOpacity onPress={clear}><Text style={styles.clearText}>{t('portSelector.clear')}</Text></TouchableOpacity>
            ) : null}
          </View>
          <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {results.length === 0 ? (
              <Text style={styles.empty}>{t('portSelector.noMatch', { allPorts: t('portSelector.allPorts') })}</Text>
            ) : results.map(p => (
              <TouchableOpacity
                key={p.codeId}
                style={[styles.row, p.codeId === codeId ? styles.rowSelected : null]}
                onPress={() => select(p)}
              >
                <Text style={styles.rowName}>{rowName(p)}</Text>
                {provinceLabel(p) ? <Text style={styles.rowProv}>{provinceLabel(p)}</Text> : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#DDE3F0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 14, backgroundColor: '#fff',
  },
  triggerText: { fontSize: 15, color: '#999', flex: 1 },
  triggerTextSelected: { color: '#1B3A6B' },
  arrow: { fontSize: 12, color: '#666', marginLeft: 8 },
  dropdown: { borderWidth: 1, borderColor: '#DDE3F0', borderRadius: 10, backgroundColor: '#fff', marginTop: 4, overflow: 'hidden' },
  search: {
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1B3A6B',
  },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  toolbarText: { fontSize: 13, color: '#2E6BE6', fontWeight: '600' },
  clearText: { fontSize: 13, color: '#E05252', fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  rowSelected: { backgroundColor: '#EAF1FF' },
  rowName: { fontSize: 15, color: '#1B3A6B', flex: 1 },
  rowProv: { fontSize: 12, color: '#888', marginLeft: 10 },
  empty: { padding: 14, fontSize: 14, color: '#999' },
});
