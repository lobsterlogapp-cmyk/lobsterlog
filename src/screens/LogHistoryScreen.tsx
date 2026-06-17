// Log History (archive) screen — Session 60.
// Shows ALL successfully-sent logs (full 3-year archive, nothing deleted), newest first,
// filterable by MONTH and YEAR. This is the clean T6/T9 screenshot surface: sent logs only,
// no drafts. Reuses SentLogCard + SentLogDetailModal so the card/detail layout is shared
// with DfoLogsListScreen (Phase 2).
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { ChevronDown, ChevronLeft, Archive } from 'lucide-react-native';
import { loadAllLogs, loadTransmissionRegister, DfoLog, TransmissionRecord } from '../utils/dfoLogStorage';
import { SentLogCard, SentLogDetailModal, indexSuccessRecords, indexFailureRecords } from '../components/SentLogCard';

interface LogHistoryScreenProps {
  onBack: () => void;
  refreshKey?: number;
}

const yearOf = (log: DfoLog): number | null => {
  const y = parseInt(log.dateFished?.slice(0, 4) ?? '', 10);
  return isNaN(y) ? null : y;
};
const monthOf = (log: DfoLog): number | null => {
  const m = parseInt(log.dateFished?.slice(5, 7) ?? '', 10);
  return isNaN(m) ? null : m - 1; // 0-based
};

interface DropdownProps {
  label: string;
  value: string;
  open: boolean;
  onToggle: () => void;
  options: { key: string; label: string }[];
  onSelect: (key: string) => void;
  selectedKey: string;
}

const Dropdown: React.FC<DropdownProps> = ({ label, value, open, onToggle, options, onSelect, selectedKey }) => (
  <View style={styles.dropdownWrap}>
    <Text style={styles.dropdownLabel}>{label}</Text>
    <TouchableOpacity style={styles.dropdownButton} onPress={onToggle}>
      <Text style={styles.dropdownButtonText}>{value}</Text>
      <ChevronDown size={16} color="#64748B" />
    </TouchableOpacity>
    {open && (
      <View style={styles.dropdownList}>
        <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>
          {options.map(o => (
            <TouchableOpacity
              key={o.key}
              style={[styles.dropdownItem, selectedKey === o.key && styles.dropdownItemActive]}
              onPress={() => onSelect(o.key)}
            >
              <Text style={[styles.dropdownItemText, selectedKey === o.key && styles.dropdownItemTextActive]}>
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    )}
  </View>
);

const LogHistoryScreen: React.FC<LogHistoryScreenProps> = ({ onBack, refreshKey = 0 }) => {
  const { t } = useTranslation('dfo');

  const [sentLogs, setSentLogs] = useState<DfoLog[]>([]);
  const [allLogs, setAllLogs] = useState<DfoLog[]>([]);
  const [successRecords, setSuccessRecords] = useState<Record<string, TransmissionRecord>>({});
  const [failureRecords, setFailureRecords] = useState<TransmissionRecord[]>([]);
  const [monthSel, setMonthSel] = useState<string>('all'); // 'all' or '0'..'11'
  const [yearSel, setYearSel] = useState<string>('all');   // 'all' or 'YYYY'
  const [monthOpen, setMonthOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [detailLog, setDetailLog] = useState<DfoLog | null>(null);
  const [detailRecord, setDetailRecord] = useState<TransmissionRecord | undefined>(undefined);

  const refresh = useCallback(async () => {
    const all = await loadAllLogs(); // already newest-first
    setAllLogs(all);
    setSentLogs(all.filter(l => l.sentToDfo === true && (l.status === 'complete' || !l.status)));
    const register = await loadTransmissionRegister();
    setSuccessRecords(indexSuccessRecords(register));
    setFailureRecords(indexFailureRecords(register));
  }, []);

  useEffect(() => { refresh(); }, [refresh, refreshKey]);

  const monthNames = t('history.months', { returnObjects: true }) as string[];

  // Logs referenced by the register. Failures may be fail-only logs that never set
  // sentToDfo, so resolve them from the full log set, not just sentLogs.
  const logById = new Map(allLogs.map(l => [l.id, l] as const));
  const failLogs = failureRecords
    .map(rec => logById.get(rec.logId))
    .filter((l): l is DfoLog => !!l);

  // YEAR options: only years that actually have sent logs (desc), plus "All".
  const yearsWithLogs = Array.from(
    new Set([...sentLogs, ...failLogs].map(yearOf).filter((y): y is number => y !== null))
  ).sort((a, b) => b - a);
  const yearOptions = [
    { key: 'all', label: t('history.all') },
    ...yearsWithLogs.map(y => ({ key: String(y), label: String(y) })),
  ];
  // MONTH options: all twelve always, plus "All".
  const monthOptions = [
    { key: 'all', label: t('history.all') },
    ...monthNames.map((name, i) => ({ key: String(i), label: name })),
  ];

  const matchesSelection = (l: DfoLog): boolean => {
    if (monthSel !== 'all' && monthOf(l) !== Number(monthSel)) return false;
    if (yearSel !== 'all' && yearOf(l) !== Number(yearSel)) return false;
    return true;
  };

  // Unified archive list, newest-first: one collapsed SUCCESS row per sent log (unchanged
  // source) plus one FAIL row per failed attempt straight off the register (§13.3.3).
  type RegisterRow = { key: string; log: DfoLog; record?: TransmissionRecord };
  const successRows: RegisterRow[] = sentLogs
    .filter(matchesSelection)
    .map(log => ({ key: `s-${log.id}`, log, record: successRecords[log.id] }));
  const failRows: RegisterRow[] = failureRecords
    .map(rec => ({ rec, log: logById.get(rec.logId) }))
    .filter((x): x is { rec: TransmissionRecord; log: DfoLog } => !!x.log && matchesSelection(x.log))
    .map(({ rec, log }) => ({ key: `f-${rec.logId}-${rec.attemptedAt}`, log, record: rec }));
  const rows = [...successRows, ...failRows].sort(
    (a, b) => (b.record?.attemptedAt ?? 0) - (a.record?.attemptedAt ?? 0)
  );

  const monthLabel = monthSel === 'all' ? t('history.all') : monthNames[Number(monthSel)];
  const yearLabel = yearSel === 'all' ? t('history.all') : yearSel;
  const selectionLabel = `${monthLabel} · ${yearLabel}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ChevronLeft size={22} color="#1E3A8A" />
          <Text style={styles.backBtnText}>{t('history.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('history.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.filterRow}>
        <Dropdown
          label={t('history.month')}
          value={monthLabel}
          open={monthOpen}
          onToggle={() => { setMonthOpen(o => !o); setYearOpen(false); }}
          options={monthOptions}
          selectedKey={monthSel}
          onSelect={(k) => { setMonthSel(k); setMonthOpen(false); }}
        />
        <Dropdown
          label={t('history.year')}
          value={yearLabel}
          open={yearOpen}
          onToggle={() => { setYearOpen(o => !o); setMonthOpen(false); }}
          options={yearOptions}
          selectedKey={yearSel}
          onSelect={(k) => { setYearSel(k); setYearOpen(false); }}
        />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.subtitle}>{t('history.subtitle')}</Text>
        {rows.length === 0 ? (
          <View style={styles.emptyState}>
            <Archive size={32} color="#94A3B8" />
            <Text style={styles.emptyText}>{t('history.noLogsForSelection', { selection: selectionLabel })}</Text>
          </View>
        ) : (
          rows.map(({ key, log, record }) => (
            <SentLogCard
              key={key}
              log={log}
              record={record}
              onPress={() => { setDetailLog(log); setDetailRecord(record); }}
            />
          ))
        )}
      </ScrollView>

      <SentLogDetailModal
        visible={detailLog !== null}
        log={detailLog}
        record={detailRecord}
        onClose={() => { setDetailLog(null); setDetailRecord(undefined); }}
      />
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
  },
  backBtnText: {
    color: '#1E3A8A',
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#1E293B',
    fontSize: 18,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
    zIndex: 10,
  },
  dropdownWrap: {
    flex: 1,
  },
  dropdownLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  dropdownList: {
    position: 'absolute',
    top: 62,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    zIndex: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: {
    backgroundColor: '#EFF6FF',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#334155',
  },
  dropdownItemTextActive: {
    color: '#1E3A8A',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default LogHistoryScreen;
