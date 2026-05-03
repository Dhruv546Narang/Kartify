import React, { useMemo } from 'react';
import { Alert, Linking, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PLATFORM_STYLES } from '../components/PlatformBadge';
import { useCart } from '../hooks/useCart';

const PLATFORM_DEEP_LINKS: Record<string, string> = {
  blinkit: 'blinkit://', zepto: 'zepto://', instamart: 'swiggy://',
  bigbasket: 'bigbasket://', jiomart: 'jiomart://',
};
const PLATFORM_WEB_URLS: Record<string, string> = {
  blinkit: 'https://blinkit.com', zepto: 'https://zepto.com',
  instamart: 'https://www.swiggy.com/instamart', bigbasket: 'https://www.bigbasket.com',
  jiomart: 'https://www.jiomart.com',
};

async function openPlatform(platform: string) {
  const key = platform.toLowerCase();
  const deep = PLATFORM_DEEP_LINKS[key];
  const web = PLATFORM_WEB_URLS[key] || 'https://google.com';
  try {
    if (deep && await Linking.canOpenURL(deep)) { await Linking.openURL(deep); return; }
  } catch {}
  await Linking.openURL(web);
}

function formatINR(v: number) { return `₹${Math.round(v).toLocaleString('en-IN')}`; }

export default function CheckoutScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const { getActiveCart } = useCart();
  const activeCart = getActiveCart();

  const groups = useMemo(() => {
    if (!activeCart) return [];
    const map = new Map<string, { platform: string; items: any[]; subtotal: number; deliveryFee: number; surgeCharge: number }>();
    for (const item of activeCart.items) {
      const k = item.platform.toLowerCase();
      const g = map.get(k) || { platform: item.platform, items: [], subtotal: 0, deliveryFee: 0, surgeCharge: 0 };
      g.items.push(item);
      g.subtotal += item.price * item.quantity;
      map.set(k, g);
    }
    return [...map.values()];
  }, [activeCart]);

  const grandTotal = groups.reduce((s, g) => s + g.subtotal + g.deliveryFee + g.surgeCharge, 0);

  if (!activeCart || !activeCart.items.length) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 56 }}>🛒</Text>
          <Text style={styles.emptyTitle}>Nothing to checkout</Text>
          <Text style={styles.emptySub}>Add items from Explore first.</Text>
          <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.goBackBtn, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
            <Text style={styles.goBackText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.backBtn, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
          <Ionicons name="chevron-back" size={22} color="#2C3E2D" />
        </Pressable>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {groups.map((group, gi) => {
          const ps = PLATFORM_STYLES[group.platform.toLowerCase()] || { bg: '#888', text: '#fff' };
          const groupTotal = group.subtotal + group.deliveryFee + group.surgeCharge;
          return (
            <View key={gi} style={styles.groupCard}>
              {/* Platform header */}
              <View style={[styles.groupHeader, { backgroundColor: ps.bg }]}>
                <Text style={[styles.groupHeaderText, { color: ps.text }]}>{group.platform}</Text>
                <Text style={[styles.groupHeaderCount, { color: ps.text }]}>{group.items.length} item{group.items.length > 1 ? 's' : ''}</Text>
              </View>
              {/* Items */}
              <View style={styles.groupBody}>
                {group.items.map((item: any, idx: number) => (
                  <View key={idx} style={styles.checkoutItem}>
                    <Text style={styles.checkoutItemName} numberOfLines={1}>{item.product_name} × {item.quantity}</Text>
                    <Text style={styles.checkoutItemPrice}>{formatINR(item.price * item.quantity)}</Text>
                  </View>
                ))}
                {/* Delivery */}
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Delivery fee</Text>
                  <Text style={[styles.feeValue, { color: group.deliveryFee > 0 ? '#2C3E2D' : '#7A9E7E' }]}>
                    {group.deliveryFee > 0 ? `₹${group.deliveryFee}` : 'Free'}
                  </Text>
                </View>
                {/* Surge */}
                {group.surgeCharge > 0 && (
                  <View style={styles.feeRow}>
                    <Text style={[styles.feeLabel, { color: '#C4855A' }]}>⚡ Surge charge</Text>
                    <Text style={[styles.feeValue, { color: '#C4855A' }]}>₹{group.surgeCharge}</Text>
                  </View>
                )}
                {/* Total */}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{formatINR(groupTotal)}</Text>
                </View>
                {/* Open platform */}
                <Pressable onPress={() => openPlatform(group.platform)}
                  style={({ pressed }) => [styles.openPlatBtn, { backgroundColor: ps.bg, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
                  <Text style={[styles.openPlatText, { color: ps.text }]}>Open {group.platform} →</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {/* Grand total */}
        <View style={styles.grandRow}>
          <Text style={styles.grandLabel}>Grand Total</Text>
          <Text style={styles.grandValue}>{formatINR(grandTotal)}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0F4EF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20, color: '#2C3E2D' },
  groupCard: { marginHorizontal: 16, marginBottom: 14, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' },
  groupHeader: { padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupHeaderText: { fontFamily: 'Nunito_700Bold', fontSize: 15, textTransform: 'capitalize' },
  groupHeaderCount: { fontFamily: 'Nunito_700Bold', fontSize: 13 },
  groupBody: { backgroundColor: 'rgba(255,255,255,0.22)', padding: 14, gap: 10 },
  checkoutItem: { flexDirection: 'row', justifyContent: 'space-between' },
  checkoutItemName: { flex: 1, fontSize: 13, color: '#2C3E2D', fontFamily: 'Nunito_600SemiBold' },
  checkoutItemPrice: { fontSize: 13, fontFamily: 'Nunito_700Bold', color: '#2C3E2D' },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  feeLabel: { fontSize: 13, color: '#7A8C7B', fontFamily: 'Nunito_600SemiBold' },
  feeValue: { fontSize: 13, fontFamily: 'Nunito_700Bold' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)' },
  totalLabel: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: '#2C3E2D' },
  totalValue: { fontSize: 16, fontFamily: 'Nunito_700Bold', color: '#4F7A55' },
  openPlatBtn: { marginTop: 4, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  openPlatText: { fontSize: 14, fontFamily: 'Nunito_700Bold' },
  grandRow: { marginHorizontal: 16, marginTop: 4, marginBottom: 20, padding: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grandLabel: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#2C3E2D' },
  grandValue: { fontFamily: 'Nunito_700Bold', fontSize: 22, color: '#4F7A55' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 18, color: '#2C3E2D', marginTop: 12 },
  emptySub: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: '#7A8C7B', marginTop: 6 },
  goBackBtn: { marginTop: 20, height: 44, borderRadius: 22, backgroundColor: '#7A9E7E', paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  goBackText: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 14 },
});
