import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { loadCaptainProfile, CaptainProfile } from '../utils/captainStorage';
import { DfoLog } from '../utils/dfoLogStorage';
import { generateElogXml, validateElogXml, generateSoapEnvelope, generateDfoXmlFileName, DFO_SOAP_ACTION_SAVE, buildValidateElogKeyEnvelope, parseValidateElogKeyResponse, DFO_SOAP_ACTION_VALIDATE, DFO_UAT_ENDPOINT } from '../utils/dfoXmlGenerator';

const SEND_TIMEOUT_MS = 30000;

interface Props {
  onClose: () => void;
}

const SUBFORMS = [
  { subformId: 88, regId: 1006, label: 'Subform 88 — Quebec (QC)' },
  { subformId: 89, regId: 1014, label: 'Subform 89 — Gulf (GLF)' },
  { subformId: 90, regId: 1004, label: 'Subform 90 — Maritimes (MAR)' },
  { subformId: 91, regId: 1002, label: 'Subform 91 — Nfld & Lab (NL)' },
] as const;

// codeId values from DFO_SUBFORM_FIELD_CONFIG FMA lists
const FIXTURE_FMA: Record<number, string> = {
  88: '25656', // LFA 19a1
  89: '1526',  // LFA 15
  90: '1589',  // LFA 34
  91: '1652',  // LFA 02
};

// Landing port codeIds (MV_PORT) — LANDING.PORT_ID is XSD-mandatory for ALL subforms.
// Verified against src/data/reftables/mvPort.ts; match the Session 53 genSampleAllSubforms fixtures.
const FIXTURE_LANDING_PORT: Record<number, number> = {
  88: 22648, // Rimouski (QC)
  89: 19322, // Aboiteau (GLF)
  90: 20913, // Abbott's Harbour (MAR)
  91: 21331, // Port aux Basques (NL)
};

function makeFixtureLog(subformId: number, regId: number): DfoLog {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const data: Record<string, string> = {
    fmaId: FIXTURE_FMA[subformId],
    portLandedCodeId: String(FIXTURE_LANDING_PORT[subformId]), // LANDING.PORT_ID (all subforms)
    trapHauls: '50',
    catchWeight: '500',
    timeSailed: '06:00',
    timeStartedHauling: '08:00',
    timeStoppedHauling: '14:00',
    timeOfLanding: '16:00',
    mmYes: 'false',
    sarYes: 'false',
    lostGearYes: 'false',
    soakDuration: '72',  // hours; skipped for MAR (subform 90) by generator
  };
  if (subformId === 88 || subformId === 90) {
    data.crewRegistry = JSON.stringify([{ name: 'TEST CREW' }]);
  }
  if (subformId === 88 || subformId === 91) {
    data.portLanded = 'TEST PORT';
    data.departurePort = 'TEST PORT';
    data.departurePortCodeId = String(FIXTURE_LANDING_PORT[subformId]); // TRIP.PORT_ID (QC/NL); same-port trip for fixture
  }
  if (subformId === 90) {
    data.obsTripNum = 'OBS-TEST-001';
  }
  if (subformId === 91) {
    data.gearSubtypeId = '39684'; // Wooden traps
  }
  return {
    id: `TEST-${subformId}`,
    lgbkUid: 'HARNSS',
    firstEntryDt: now,
    mode: 'full',
    status: 'complete',
    sentToDfo: false,
    dateFished: today,
    createdAt: Date.now(),
    data,
    subformId,
    regId,
  };
}

function withFallbacks(p: CaptainProfile): CaptainProfile {
  return {
    ...p,
    operatorName: p.operatorName || 'TEST OPERATOR',
    vesselNumber: p.vesselNumber || '0000',
    dfoLicenceNo: p.dfoLicenceNo || 'T-000000',
    dfoFin: p.dfoFin || '0000000',
    units: 'kg',
    language: p.language || 'en',
  };
}

export default function DfoTestHarnessScreen({ onClose }: Props) {
  const [results, setResults] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [keyResult, setKeyResult] = useState('');
  const [keyLoading, setKeyLoading] = useState(false);

  // Auth-only round trip against UAT — no XML document involved (guide §3.2)
  const handleValidateKey = useCallback(async () => {
    setKeyLoading(true);
    setKeyResult('');
    try {
      const profile = await loadCaptainProfile();
      const elogKey = process.env.EXPO_PUBLIC_DFO_TEST_ELOG_KEY || profile.elogKey;
      if (!elogKey) {
        setKeyResult('No ELOG key found — set EXPO_PUBLIC_DFO_TEST_ELOG_KEY in .env or save a key in Captain Profile.');
        return;
      }
      const soap = buildValidateElogKeyEnvelope(elogKey);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
      let status = 0;
      let text = '';
      try {
        const response = await fetch(DFO_UAT_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            SOAPAction: `"${DFO_SOAP_ACTION_VALIDATE}"`,
          },
          body: soap,
          signal: controller.signal,
        });
        status = response.status;
        text = await response.text();
      } finally {
        clearTimeout(timer);
      }

      const parsed = parseValidateElogKeyResponse(text);
      if (parsed.valid) {
        setKeyResult(`✓ ELOG KEY VALID (WS1000)\nHTTP ${status} from UAT`);
      } else {
        setKeyResult(
          `✗ KEY VALIDATION FAILED\nHTTP ${status}\n${parsed.errorCode ?? ''}: ${parsed.errorMessage ?? ''}\n\n--- RAW RESPONSE ---\n${text.slice(0, 1500)}`
        );
      }
    } catch (e: any) {
      const msg = e?.name === 'AbortError' ? 'Request timed out (30s)' : e?.message ?? String(e);
      setKeyResult(`Fetch failed: ${msg}`);
    } finally {
      setKeyLoading(false);
    }
  }, []);

  const handleFire = useCallback(async (subformId: number, regId: number) => {
    setLoading(prev => ({ ...prev, [subformId]: true }));
    setResults(prev => ({ ...prev, [subformId]: '' }));

    try {
      const rawProfile = await loadCaptainProfile();
      const profile = withFallbacks(rawProfile);
      const log = makeFixtureLog(subformId, regId);
      console.log(`[HARNESS] fixture built — subformId=${subformId}`);

      const xml = generateElogXml(log, profile);
      console.log('[HARNESS] XML generated');

      const validation = validateElogXml(xml, subformId);

      if (!validation.valid) {
        console.log(`[HARNESS] schema validation FAIL — halting, not POSTing:\n${validation.errors.join('\n')}`);
        setResults(prev => ({
          ...prev,
          [subformId]: `VALIDATION FAILED:\n${validation.errors.join('\n')}`,
        }));
        return;
      }
      console.log('[HARNESS] schema validation PASS');

      const fileName = generateDfoXmlFileName(regId, profile.dfoLicenceNo);
      console.log(`[HARNESS] filename generated — ${fileName}`);

      const soap = generateSoapEnvelope(xml, profile.elogKey, fileName);
      console.log('[HARNESS] SOAP envelope built');

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
      try {
        // Harness Fire now transmits live to DFO's UAT server (same path as Send to DFO).
        console.log(`[HARNESS] POSTing to UAT — ${DFO_UAT_ENDPOINT}`);
        const t0 = Date.now();
        const response = await fetch(DFO_UAT_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            SOAPAction: `"${DFO_SOAP_ACTION_SAVE}"`,
          },
          body: soap,
          signal: controller.signal,
        });
        clearTimeout(timer);
        const text = await response.text();
        console.log(`[HARNESS] HTTP response — status=${response.status}, elapsed=${Date.now() - t0}ms, bodyLen=${text.length}`);
        setResults(prev => ({
          ...prev,
          [subformId]: `HTTP ${response.status}\n\n${text}`,
        }));
      } catch (fetchErr: any) {
        clearTimeout(timer);
        const msg = fetchErr?.name === 'AbortError'
          ? 'Request timed out (30s)'
          : fetchErr?.message ?? 'Network error';
        setResults(prev => ({ ...prev, [subformId]: `Fetch failed: ${msg}` }));
      }
    } catch (e: any) {
      setResults(prev => ({ ...prev, [subformId]: `Error: ${e?.message ?? String(e)}` }));
    } finally {
      setLoading(prev => ({ ...prev, [subformId]: false }));
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>DFO XML Test Harness</Text>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>
          Fixture data — OPER_NAME, VRN, licence, FIN, and elogKey loaded from your Captain Profile.
        </Text>

        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle}>Validate ELOG Key (UAT)</Text>
            <TouchableOpacity
              style={[styles.fireButton, keyLoading && styles.fireButtonDisabled]}
              onPress={handleValidateKey}
              disabled={keyLoading}
              activeOpacity={0.8}
            >
              {keyLoading
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={styles.fireText}>Fire</Text>}
            </TouchableOpacity>
          </View>

          {!!keyResult && (
            <ScrollView style={styles.resultBox} nestedScrollEnabled showsVerticalScrollIndicator>
              <Text style={styles.resultText}>{keyResult}</Text>
            </ScrollView>
          )}
        </View>

        {SUBFORMS.map(({ subformId, regId, label }) => (
          <View key={subformId} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{label}</Text>
              <TouchableOpacity
                style={[styles.fireButton, loading[subformId] && styles.fireButtonDisabled]}
                onPress={() => handleFire(subformId, regId)}
                disabled={!!loading[subformId]}
                activeOpacity={0.8}
              >
                {loading[subformId]
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <Text style={styles.fireText}>Fire</Text>}
              </TouchableOpacity>
            </View>

            {!!results[subformId] && (
              <ScrollView
                style={styles.resultBox}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                <Text style={styles.resultText}>{results[subformId]}</Text>
              </ScrollView>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  headerSpacer: { width: 36 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 36,
    alignItems: 'flex-end',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  hint: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    marginBottom: 14,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1E3A8A',
    marginRight: 12,
  },
  fireButton: {
    backgroundColor: '#EA580C',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  fireText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  resultBox: {
    marginTop: 14,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    maxHeight: 260,
  },
  resultText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 17,
  },
});
