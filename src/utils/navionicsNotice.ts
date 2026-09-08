// The one place that tells a user their Navionics charts did not switch on.
//
// WHY THIS EXISTS: runNavionicsPurchase() is fire-and-forget by design — a Garmin failure must
// never block access the user already paid for through RevenueCat. That was right, but every
// caller then DISCARDED the outcome, so a harvester could pay, get nothing, and be told nothing.
// This module is the visible half; it changes no purchase logic.
//
// ⚠ WORDING RULE, non-negotiable: this is NOT a payment failure. The payment succeeded and the
// Pro subscription is active. Only the chart provisioning failed. A fisherman must never read
// this and think he has been charged for nothing.
//
// One definition, both call sites (PaywallModal purchase + usePurchases restore), so the two
// can never drift into saying different things about the same event.
import { Alert } from 'react-native';
import i18next from 'i18next';
import type { NavionicsFailureReason } from './navionicsPurchase';

// This module carries its OWN copy of the support address, on purpose.
//
// The same address is declared on the DFO-side Help & Support screen. Sharing it through a
// common constant would mean editing a DFO-side file for a Garmin reason, and the DFO side is
// off limits to Garmin work — the fence stays clean and shows no Garmin-era changes. Founder
// ruling, S167-G Phase 2: two copies of the address is the ACCEPTED COST.
//
// ⚠ If this address ever changes, it must be changed in BOTH places. The other one is the
// SUPPORT_EMAIL constant at the top of src/screens/HelpSupportScreen.tsx. Do not "fix" this
// duplication by reaching across.
const SUPPORT_EMAIL = 'support@lobsterlog.com';

// What the USER is asked to quote. Deliberately NOT the internal reason string: a harvester
// should be reading a reference number, not our variable names. The reason itself still goes to
// the console, and the full map lives in docs/GATE_S167_GARMIN_FIXES.md so support can decode it.
const REFERENCE_CODE: Record<NavionicsFailureReason, string> = {
  'missing-credential': 'LL-CHART-01',
  'encryption-failed': 'LL-CHART-02',
  'store-rejected': 'LL-CHART-03',
  'network-error': 'LL-CHART-04',
  'tier-unresolved': 'LL-CHART-05',
};

// THREE bodies, because the honest answer differs and a wrong cause is worse than no cause.
//   ourSide     — nothing to do with the user's phone or signal. Saying "check your connection"
//                 here would send a harvester chasing a problem he cannot fix.
//   connection  — the request actually went out and the connection or the Garmin store failed it.
//                 ONLY these two. This is the only case where blaming the connection is true.
//   unresolved  — we could not work out which subscription tier to ask for, so nothing was sent.
//                 It is NOT a connection fault and must never be described as one.
const BODY_KEY: Record<NavionicsFailureReason, string> = {
  'missing-credential': 'charts.notActiveOurSide',
  'encryption-failed': 'charts.notActiveOurSide',
  'store-rejected': 'charts.notActiveConnection',
  'network-error': 'charts.notActiveConnection',
  'tier-unresolved': 'charts.notActiveUnresolved',
};

/**
 * Tell the user, in their own language, that the charts did not switch on.
 *
 * `status` is the Garmin HTTP status when there was one. It is APPENDED to the reference code
 * the user quotes — `LL-CHART-03-403` — so support can tell a refusal (403) from a rate-limit
 * (429) from the code alone, without the device console and without asking the harvester to
 * reproduce anything. Codes with no status stay bare: `LL-CHART-01`.
 *
 * Both maps are Record<NavionicsFailureReason, …>, so adding a reason to the union without
 * giving it a code AND a body fails to compile. A new failure cannot go silent by omission.
 */
export function notifyNavionicsProvisionFailed(
  reason: NavionicsFailureReason,
  status?: number
): void {
  const ref = status ? `${REFERENCE_CODE[reason]}-${status}` : REFERENCE_CODE[reason];

  console.log(
    '[navionics] provisioning failed. reason:', reason,
    status ? `status: ${status}` : '',
    '| user ref:', ref
  );

  Alert.alert(
    i18next.t('charts.notActiveTitle'),
    i18next.t(BODY_KEY[reason], { email: SUPPORT_EMAIL, ref })
  );
}
