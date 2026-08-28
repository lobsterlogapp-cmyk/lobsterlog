// Standalone transmission-register card for a FORM (222 / 233) send — Scope B Phase 2a.
// Unlike SentLogCard, a form record has NO backing DfoLog, so this card renders purely from
// the TransmissionRecord (no tripNum-from-log, no dateFished). Kept as a SEPARATE component
// from the proven SentLogCard so that card is not touched; styles are mirrored (not imported)
// so the two read as siblings in the register list.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckCircle, XCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { TransmissionRecord, transmissionKind, SEND_FAILURE_BADGE_KEY, isSendFailureKind } from '../utils/dfoLogStorage';
import { formatSentDateTime } from '../utils/formatSentDateTime';

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Text style={styles.fieldValue}>{value}</Text>
  </View>
);

// Mirrors SentLogCard's OutcomeBadge: success → green Accepted, failure → red Failed.
const OutcomeBadge: React.FC<{ outcome?: TransmissionRecord['outcome'] }> = ({ outcome }) => {
  const { t } = useTranslation('dfo');
  if (outcome === 'failure') {
    return (
      <View style={styles.failBadge}>
        <XCircle size={13} color="#B91C1C" />
        <Text style={styles.failBadgeText}>{t('logs.regFail')}</Text>
      </View>
    );
  }
  return (
    <View style={styles.successBadge}>
      <CheckCircle size={13} color="#15803D" />
      <Text style={styles.successBadgeText}>{t('logs.regSuccess')}</Text>
    </View>
  );
};

interface FormSentCardProps {
  record: TransmissionRecord;
  onPress: () => void;
}

export const FormSentCard: React.FC<FormSentCardProps> = ({ record, onPress }) => {
  const { t, i18n } = useTranslation('dfo');
  const kind = transmissionKind(record);
  const title =
    kind === 'form222' ? t('logs.regForm222Title')
    : kind === 'form233' ? t('logs.regForm233Title')
    : record.logId; // defensive — a form card should only ever get a form record

  const isFailure = record.outcome === 'failure';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.logId}>{title}</Text>
          <Text style={styles.logDate}>{formatSentDateTime(record.attemptedAt, i18n.language)}</Text>
        </View>
        <OutcomeBadge outcome={record.outcome} />
      </View>

      <View style={styles.fieldGrid}>
        {!!record.vrn && <Field label={t('logs.regVesselLabel')} value={record.vrn} />}
        {/* S148 defect 86, forms half. This row used to render the stored ENGLISH technical string
            inline on the register card, in French as readily as in English. It now shows the badge
            word translated from the record's language-neutral marker (R-F); the full raw string is
            one tap away, intact, in the Transmission Result sheet (R-E). A record written before
            S148 has no marker and falls back to exactly what it showed before — never blank. */}
        {isFailure
          ? <Field
              label={t('logs.regErrorLabel')}
              value={isSendFailureKind(record.failureKind)
                ? t(SEND_FAILURE_BADGE_KEY[record.failureKind])
                : (record.errorMessage || record.wsErrCode || '—')}
            />
          : !!record.confNumber && <Field label={t('logs.regConfLabel')} value={record.confNumber} />}
        <Field label={t('logs.regSentLabel')} value={formatSentDateTime(record.attemptedAt, i18n.language)} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Mirrors SentLogCard.styles so the two cards render as siblings.
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  logId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  logDate: {
    fontSize: 13,
    color: '#64748B',
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  successBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  failBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  failBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },
  fieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  field: {
    width: '50%',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.3,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
});

export default FormSentCard;
