// Help & Support (S121 Phase 3) — simple in-app support page opened from the DFO ELOGs
// list header. Visible to ALL roles including the DFO demo account (Appendix B TC1 step 5).
// Contact rows open the device mail/phone/browser apps via Linking; the guide row opens the
// bundled §17 Provider's Instructions PDF fully offline (same expo-asset + react-native-pdf
// pattern as the Settings DFO Documents card — S94, Rule 2500). Only TRACKED assets are
// require()d here: the §22 User's Guide PDFs are untracked passengers and would break a
// clean-tree (EAS) build.
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { ChevronLeft, Mail, Phone, Globe, FileText, LifeBuoy } from 'lucide-react-native';
import Pdf from 'react-native-pdf';
import { Asset } from 'expo-asset';

const SUPPORT_EMAIL = 'support@lobsterlog.com';
const SUPPORT_PHONE_DISPLAY = '1 (902) 635-1069';
const SUPPORT_PHONE_TEL = 'tel:19026351069';
const SUPPORT_WEBSITE = 'https://lobsterlog.ca';
const DFO_ELOG_SUPPORT_DISPLAY = '1-877-535-7307';
const DFO_ELOG_SUPPORT_TEL = 'tel:18775357307';

// S164: the one "User guide & instructions" button split in two — the label promised a
// user guide the app did not carry. Two maps, two buttons; the §22 User's Guide PDFs are
// TRACKED so the clean-tree (EAS) hazard the old header named is closed. ⚠ The version
// stays IN the filename on purpose: a guide update changes the filename and this require
// must change with it, so a swap cannot be forgotten silently (procedure:
// docs/S164_BUILD_HELP_SPLIT.md). v1_9 landed 2026-09-06, replacing the wired v1_5.
const USERS_GUIDE_SOURCES = {
  en: require('../../assets/docs/LobsterLog_Users_Guide_v1_9_EN.pdf'),
  fr: require('../../assets/docs/LobsterLog_Guide_Utilisateur_v1_9_FR.pdf'),
} as const;
// Bundled §17 Provider's Instructions. v1_3 landed 2026-09-06, replacing the wired v1_2.
const PROVIDERS_SOURCES = {
  en: require('../../assets/docs/LobsterLog_Providers_Instructions_v1_3_EN.pdf'),
  fr: require('../../assets/docs/LobsterLog_Instructions_Fournisseur_v1_3_FR.pdf'),
} as const;

interface Props {
  onClose: () => void;
}

export default function HelpSupportScreen({ onClose }: Props) {
  const { t } = useTranslation('dfo');
  const insets = useSafeAreaInsets();
  const [docVisible, setDocVisible] = useState(false);
  const [docUri, setDocUri] = useState<string | null>(null);

  // One opener for both documents — same language rule, same viewer, nothing invented.
  const openDoc = async (sources: typeof USERS_GUIDE_SOURCES | typeof PROVIDERS_SOURCES) => {
    const lang: 'en' | 'fr' = i18n.language?.startsWith('fr') ? 'fr' : 'en';
    const asset = Asset.fromModule(sources[lang]);
    if (!asset.localUri) {
      await asset.downloadAsync();
    }
    const uri = asset.localUri ?? asset.uri;
    if (uri) {
      setDocUri(uri);
      setDocVisible(true);
    }
  };

  const row = (
    icon: React.ReactNode, label: string, value: string | null,
    onPress: () => void
  ) => (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <View style={s.rowIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        {value != null && <Text style={s.rowValue}>{value}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onClose}>
          <ChevronLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('help.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={s.card}>
          <Text style={s.cardTitle}>{t('help.contactHeader')}</Text>
          {row(<Mail size={18} color="#1E3A8A" />, t('help.emailLabel'), SUPPORT_EMAIL,
            () => { void Linking.openURL(`mailto:${SUPPORT_EMAIL}`); })}
          {row(<Phone size={18} color="#1E3A8A" />, t('help.phoneLabel'), SUPPORT_PHONE_DISPLAY,
            () => { void Linking.openURL(SUPPORT_PHONE_TEL); })}
          {row(<Globe size={18} color="#1E3A8A" />, t('help.websiteLabel'), SUPPORT_WEBSITE,
            () => { void Linking.openURL(SUPPORT_WEBSITE); })}
          <Text style={s.replyNote}>{t('help.replyNote')}</Text>
        </View>

        <View style={s.card}>
          {/* S164: User's Guide FIRST — the harvester's document on top; this is the
              harvester's app. help.guideLabel is now an ORPHAN (left in place, S54
              precedent, standing orphan-cleanup job). */}
          {row(<FileText size={18} color="#1E3A8A" />, t('help.usersGuideLabel'), null,
            () => { void openDoc(USERS_GUIDE_SOURCES); })}
          {row(<FileText size={18} color="#1E3A8A" />, t('help.providersInstructionsLabel'), null,
            () => { void openDoc(PROVIDERS_SOURCES); })}
        </View>

        {/* DFO's own ELOG support line — kept separate from LobsterLog support */}
        <View style={[s.card, s.dfoCard]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <LifeBuoy size={16} color="#B91C1C" />
            <Text style={s.dfoFooterText}>{t('help.dfoFooter')}</Text>
          </View>
          <TouchableOpacity onPress={() => { void Linking.openURL(DFO_ELOG_SUPPORT_TEL); }}>
            <Text style={s.dfoSupportText}>{t('help.dfoSupport', { phone: DFO_ELOG_SUPPORT_DISPLAY })}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Offline guide viewer — same in-app PDF pattern as the Settings DFO Documents card */}
      <Modal
        visible={docVisible}
        animationType="slide"
        onRequestClose={() => setDocVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#0F172A', paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 10 }}>
            <TouchableOpacity
              onPress={() => setDocVisible(false)}
              style={{ paddingVertical: 8, paddingHorizontal: 18, backgroundColor: '#1E3A8A', borderRadius: 10 }}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 15 }}>{t('help.docClose')}</Text>
            </TouchableOpacity>
          </View>
          {docUri && (
            <Pdf
              source={{ uri: docUri, cache: true }}
              style={{ flex: 1, backgroundColor: '#0F172A' }}
              onError={(err) => { console.log('[Help guide viewer] error:', err); }}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1E3A8A', paddingHorizontal: 12, paddingVertical: 14,
  },
  backBtn: { width: 32, alignItems: 'flex-start' },
  headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
  },
  rowIcon: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  rowValue: { fontSize: 13, color: '#1E3A8A', marginTop: 1 },
  replyNote: { fontSize: 12, color: '#64748B', marginTop: 8 },
  dfoCard: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  dfoFooterText: { flex: 1, fontSize: 12, color: '#7F1D1D', fontWeight: '600' },
  dfoSupportText: { fontSize: 13, color: '#B91C1C', fontWeight: '700' },
});
