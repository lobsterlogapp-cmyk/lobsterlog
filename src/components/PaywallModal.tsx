import React, { useState, useEffect } from 'react';
import { View, Text, Modal, ActivityIndicator, TouchableOpacity, Alert, Linking, StyleSheet } from 'react-native';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { Crown } from 'lucide-react-native';
import { ENTITLEMENT_ID } from '../config/constants';

const PaywallModal = ({ visible, onClose, onPurchaseSuccess, onRestore }: any) => {
    const [offerings, setOfferings] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const initializeAndFetch = async () => {
            try {
                // Fetch Offerings
                const fetchedOfferings = await Purchases.getOfferings();

                if (isMounted) {
                    if (fetchedOfferings.current && fetchedOfferings.current.availablePackages.length !== 0) {
                        setOfferings(fetchedOfferings.current);
                    }
                }
            } catch (e: any) {
                console.error("RevenueCat Fetch Error:", e.message);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        if (visible) {
            setLoading(true);
            initializeAndFetch();
        }

        return () => { isMounted = false; };
    }, [visible]);

    const handlePurchase = async (pack: any) => {
        try {
            const { customerInfo } = await Purchases.purchasePackage(pack);
            if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
                onPurchaseSuccess();
            }
        } catch (e: any) {
            if (!e.userCancelled) Alert.alert("Purchase Error", e.message);
        }
    };

    // ✅ FIXED: Helper function to generate Apple-compliant labels
    const getButtonLabel = (pack: PurchasesPackage) => {
        const price = pack.product.priceString;

        // Check RevenueCat's package type to determine duration
        switch (pack.packageType) {
            case 'MONTHLY':
                return `Monthly - ${price} / Month`;
            case 'ANNUAL':
                return `Yearly - ${price} / Year`;
            case 'WEEKLY':
                return `Weekly - ${price} / Week`;
            case 'LIFETIME':
                return `Lifetime - ${price}`;
            default:
                // Fallback if type is unknown
                return `${pack.product.title} - ${price}`;
        }
    };

    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.iconCircle}>
                        <Crown size={42} color="#2563EB" />
                    </View>

                    <Text style={styles.title}>Upgrade to Pro</Text>
                    <Text style={styles.subtitle}>
                        Unlock live marine weather, wind forecasts, tide charts, and advanced bait analytics.
                    </Text>

                    {loading ? (
                        <View style={{ height: 100, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#2563EB" />
                            <Text style={{ marginTop: 10, color: '#64748B' }}>Loading options...</Text>
                        </View>
                    ) : offerings ? (
                        <View style={{ width: '100%' }}>
                            {offerings.availablePackages.map((pack: any) => (
                                <TouchableOpacity
                                    key={pack.identifier}
                                    onPress={() => handlePurchase(pack)}
                                    style={styles.purchaseButton}
                                >
                                    {/* ✅ FIXED: Uses new label logic */}
                                    <Text style={styles.buttonText}>
                                        {getButtonLabel(pack)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        <View style={{ alignItems: 'center', marginVertical: 20 }}>
                            <Text style={styles.errorText}>No subscription options found.</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Text style={{ color: '#2563EB', fontWeight: 'bold' }}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <TouchableOpacity onPress={onRestore} style={styles.secondaryAction}>
                        <Text style={styles.secondaryActionText}>Restore Purchases</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onClose} style={styles.secondaryAction}>
                        <Text style={styles.secondaryActionText}>Not Now</Text>
                    </TouchableOpacity>

                    <View style={styles.legalContainer}>
                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 10 }}>
                            <TouchableOpacity onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
                                <Text style={styles.legalLink}>Terms of Use (EULA)</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => Linking.openURL('https://docs.google.com/document/d/1ITlhjE4vfZ5ImQrbHRTzhjGCzZhbRrQ18oqtKgkKNGM/edit?usp=sharing')}>
                                <Text style={styles.legalLink}>Privacy Policy</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.legalText}>
                            Subscriptions renew automatically. Cancel anytime in App Store settings.
                        </Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContainer: { backgroundColor: 'white', borderRadius: 24, width: '90%', padding: 24, alignItems: 'center' },
    iconCircle: { backgroundColor: '#EFF6FF', padding: 16, borderRadius: 50, marginBottom: 16 },
    title: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
    subtitle: { textAlign: 'center', color: '#64748B', fontSize: 15, lineHeight: 22, marginBottom: 24 },
    purchaseButton: { backgroundColor: '#2563EB', width: '100%', paddingVertical: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center' },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    secondaryAction: { marginTop: 12, padding: 8 },
    secondaryActionText: { color: '#64748B', fontSize: 15, fontWeight: '600' },
    legalContainer: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', width: '100%' },
    legalLink: { color: '#94A3B8', fontSize: 12, textDecorationLine: 'underline' },
    legalText: { color: '#CBD5E1', fontSize: 11, textAlign: 'center', marginTop: 4 },
    errorText: { color: '#EF4444', marginBottom: 10 }
});

export default PaywallModal;